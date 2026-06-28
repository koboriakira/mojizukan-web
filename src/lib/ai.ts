import { AppError } from "../middleware/error-handler";

const DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export function extractJson<T>(text: string): T {
  const trimmed = text.trim();

  // 素の JSON
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return JSON.parse(trimmed) as T;
  }

  // コードフェンス内の JSON
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    return JSON.parse(fenceMatch[1].trim()) as T;
  }

  // テキストに埋め込まれた JSON オブジェクト
  const objMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objMatch) {
    return JSON.parse(objMatch[0]) as T;
  }

  throw new AppError(502, "AI レスポンスから JSON を抽出できませんでした");
}

export interface GenerateJsonOptions {
  ai: Ai;
  prompt: string;
  model?: string;
  maxRetries?: number;
}

export async function generateJson<T>(options: GenerateJsonOptions): Promise<T> {
  const { ai, prompt, model = DEFAULT_MODEL, maxRetries = 1 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      { role: "user", content: prompt },
    ];

    if (attempt > 0) {
      messages.push(
        { role: "assistant", content: "申し訳ありません。" },
        { role: "user", content: "JSONのみを出力してください。コードブロックや説明文は不要です。" },
      );
    }

    const result = await ai.run(model as Parameters<Ai["run"]>[0], { messages });
    const response = (result as { response?: string }).response;
    if (!response) continue;

    try {
      return extractJson<T>(response);
    } catch {
      if (attempt === maxRetries) break;
    }
  }

  throw new AppError(502, "AI による JSON 生成に失敗しました");
}

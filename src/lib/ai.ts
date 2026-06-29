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

    const result = await ai.run(model as Parameters<Ai["run"]>[0], { messages, max_tokens: 2048 });
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

export interface GenerateJsonOpenAIOptions {
  apiKey: string;
  prompt: string;
  model?: string;
  maxRetries?: number;
}

export async function generateJsonOpenAI<T>(options: GenerateJsonOpenAIOptions): Promise<T> {
  const { apiKey, prompt, model = "gpt-5.4-mini", maxRetries = 1 } = options;

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

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 2048,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`OpenAI API error (${res.status}):`, errBody);
      if (attempt === maxRetries) break;
      continue;
    }

    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) continue;

    try {
      return extractJson<T>(content);
    } catch {
      if (attempt === maxRetries) break;
    }
  }

  throw new AppError(502, "AI による JSON 生成に失敗しました");
}

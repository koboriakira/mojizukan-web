import { AppError } from "../middleware/error-handler";

export function buildImagePrompt(word: string): string {
  return `子ども向け図鑑のイラスト: 「${word}」

スタイル:
- やさしい水彩画風
- 明るくカラフルな色使い
- シンプルで親しみやすいデザイン
- 白い背景
- 1つの対象物を中央に大きく描く`;
}

export function buildR2Key(userId: string, word: string): string {
  return `hakken/${userId}/${encodeURIComponent(word)}.png`;
}

export interface GenerateImageOptions {
  apiKey: string;
  word: string;
  model?: string;
  size?: string;
  quality?: string;
}

export async function generateImage(options: GenerateImageOptions): Promise<string> {
  const {
    apiKey,
    word,
    model = "gpt-image-1-mini",
    size = "1024x1024",
    quality = "low",
  } = options;

  const prompt = buildImagePrompt(word);

  console.log("Image API request:", JSON.stringify({ model, size, quality }));

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size,
      quality,
      output_format: "png",
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error(`Image API error (${res.status}):`, errBody);
    throw new AppError(502, `画像生成に失敗しました (${res.status})`);
  }

  const raw = await res.text();
  console.log("Image API response keys:", raw.slice(0, 300));

  const data = JSON.parse(raw) as {
    data: Array<Record<string, string>>;
  };

  const item = data.data?.[0];
  if (!item) {
    throw new AppError(502, "画像データが取得できませんでした");
  }

  const b64 = item.b64_json ?? item.b64 ?? Object.values(item).find(v => typeof v === "string" && v.length > 1000);
  if (!b64) {
    console.error("Image item keys:", Object.keys(item));
    throw new AppError(502, "画像データのフィールドが見つかりません");
  }

  return `data:image/png;base64,${b64}`;
}

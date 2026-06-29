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

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/images/generations", {
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
  } catch (fetchErr) {
    console.error("Image API fetch error:", String(fetchErr));
    throw new AppError(502, `画像API接続エラー: ${String(fetchErr)}`);
  }

  console.log("Image API status:", res.status);

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error(`Image API error (${res.status}):`, errBody);
    throw new AppError(502, `画像生成に失敗しました (${res.status})`);
  }

  const data = (await res.json()) as {
    data: Array<{ b64_json?: string }>;
  };

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    console.error("Image response: no b64_json field");
    throw new AppError(502, "画像データが取得できませんでした");
  }

  console.log("Image API success, b64 length:", b64.length);
  return `data:image/png;base64,${b64}`;
}

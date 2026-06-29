import { AppError } from "../middleware/error-handler";
import type { ImageStyle } from "../types";
import { buildImagePrompt } from "./image-styles";

export function buildR2Key(userId: string, word: string): string {
  return `hakken/${userId}/${word}.webp`;
}

export interface GenerateImageOptions {
  apiKey: string;
  word: string;
  userId: string;
  bucket: R2Bucket;
  style?: ImageStyle;
  model?: string;
  size?: string;
  quality?: string;
}

export async function generateImage(options: GenerateImageOptions): Promise<string> {
  const {
    apiKey,
    word,
    userId,
    bucket,
    style = "ehon",
    model = "gpt-image-1-mini",
    size = "1024x1024",
    quality = "low",
  } = options;

  const prompt = buildImagePrompt(style, word);
  console.log("Image API request:", JSON.stringify({ model, size, quality }));

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, prompt, n: 1, size, quality, output_format: "webp" }),
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

  const reader = res.body!.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLength += value.length;
  }

  console.log("Image response body read, total bytes:", totalLength);

  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  const text = new TextDecoder().decode(combined);
  const data = JSON.parse(text) as {
    data: Array<{ b64_json?: string }>;
  };

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    console.error("Image response: no b64_json field");
    throw new AppError(502, "画像データが取得できませんでした");
  }

  console.log("Image API success, b64 length:", b64.length);

  const binaryStr = atob(b64);
  const binary = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    binary[i] = binaryStr.charCodeAt(i);
  }
  const r2Key = buildR2Key(userId, word);

  await bucket.put(r2Key, binary, {
    httpMetadata: { contentType: "image/webp" },
  });

  console.log("R2 upload success:", r2Key);
  return `/api/images/${r2Key}`;
}

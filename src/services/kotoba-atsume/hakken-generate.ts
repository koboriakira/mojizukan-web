import type { HakkenGenerateResponse } from "./types";
import type { ImageStyle } from "../ai-generation/types";
import { AppError } from "../../middleware/error-handler";
import { spendTicket, getTicketBalance, canSpendTicket } from "../account/tickets";
import { generateJsonOpenAI } from "../ai-generation/ai";
import { generateImage } from "../ai-generation/image";
import { getCache, setCache } from "../ai-generation/shared-cache";

export interface HakkenGenerateDeps {
  db: D1Database;
  apiKey: string;
  bucket: R2Bucket;
}

export interface HakkenGenerateResult {
  description: string;
  image_url: string;
  cached: boolean;
  rediscovery: boolean;
}

export async function executeHakkenGenerate(
  deps: HakkenGenerateDeps,
  userId: string,
  word: string,
): Promise<HakkenGenerateResult> {
  const { db, apiKey, bucket } = deps;

  const existing = await db.prepare(
    "SELECT word FROM hakken_entries WHERE user_id = ? AND word = ?"
  ).bind(userId, word).first();
  const isRediscovery = existing !== null;

  const settings = await db.prepare(
    "SELECT image_style FROM user_settings WHERE id = ?"
  ).bind(userId).first<{ image_style: string }>();
  const imageStyle = (settings?.image_style || "ehon") as ImageStyle;

  const cached = await getCache(db, word, imageStyle);

  if (!isRediscovery && !cached) {
    const balance = await getTicketBalance(db, userId);
    if (!canSpendTicket(balance)) {
      throw new AppError(402, "チケットが足りません");
    }
  }

  let generated: HakkenGenerateResponse;
  let imageUrl: string;

  if (cached) {
    generated = { description: cached.description };
    imageUrl = cached.image_url;
  } else {
    const prompt = `「${word}」についての子ども向け図鑑エントリを作ってください。

ルール:
- 3〜4歳の子どもが理解できるやさしい言葉で説明する
- ひらがなを中心に使う
- ですます調・〜よ・〜ね のトーンで書く
- 2文で書く（1文目と2文目を「。」で区切る）

出力はJSON形式のみで返してください。コードブロックや説明文は不要です。
{"description":"説明文（2文）"}`;

    [generated, imageUrl] = await Promise.all([
      generateJsonOpenAI<HakkenGenerateResponse>({
        apiKey,
        prompt,
        model: "gpt-5.4",
      }),
      generateImage({
        apiKey,
        word,
        userId,
        bucket,
        style: imageStyle,
      }),
    ]);

    await setCache(db, word, imageStyle, imageUrl, generated.description);
  }

  await db.prepare(
    "INSERT OR REPLACE INTO hakken_entries (user_id, word, description, image_url) VALUES (?, ?, ?, ?)"
  )
    .bind(userId, word, generated.description, imageUrl)
    .run();

  if (!isRediscovery && !cached) {
    await spendTicket(db, userId, `はっけん生成: ${word}`);
  }

  return {
    description: generated.description,
    image_url: imageUrl,
    cached: !!cached,
    rediscovery: isRediscovery,
  };
}

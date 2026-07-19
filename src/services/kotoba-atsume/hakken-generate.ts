import { STARTER_WORDS, type HakkenGenerateResponse } from "./types";
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
  userId: string | null,
  word: string,
): Promise<HakkenGenerateResult> {
  const { db, apiKey, bucket } = deps;

  if (userId === null) {
    const cached = await getCache(db, word, "ehon");
    if (!cached) {
      throw new AppError(401, "ログインが必要です");
    }
    return {
      description: cached.description,
      image_url: cached.image_url,
      cached: true,
      rediscovery: false,
    };
  }

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

// ゲストの localStorage 収集物をサインイン後にサーバーへ永続化する
// (spec: guest-account-data-lifecycle AC-001, AC-003)。
// おためしことば以外は許可リスト照合で黙って棄却し、キャッシュ済みの内容
// （ゲストが実際に見た説明文・イラスト）だけをそのまま複製する。
// クライアントは word のみ送るため、中身は共有キャッシュ（正典）から組み立てる。
export async function executeMergeGuestEntries(
  db: D1Database,
  userId: string,
  words: string[],
): Promise<string[]> {
  const candidates = [...new Set(words)].filter((word) => STARTER_WORDS.includes(word));

  const merged: string[] = [];
  for (const word of candidates) {
    // ゲストの「みつける」は常に ehon スタイルでキャッシュを引く（hakken-generate.ts 未認証分岐と同じ参照元）
    const cached = await getCache(db, word, "ehon");
    if (!cached) continue; // 許可リストにあってもキャッシュ未投入なら中身を組み立てられないためスキップ

    await db
      .prepare(
        "INSERT OR IGNORE INTO hakken_entries (user_id, word, description, image_url) VALUES (?, ?, ?, ?)"
      )
      .bind(userId, word, cached.description, cached.image_url)
      .run();
    merged.push(word);
  }

  return merged;
}

import { Hono } from "hono";
import type { AppEnv, ClassifyRequest, ClassifyResponse, ClassifyStatus, HakkenGenerateRequest, HakkenGenerateResponse, ImageStyle } from "../types";
import { AppError } from "../middleware/error-handler";
import { requireAuth } from "../middleware/auth";
import { isNgWord } from "../lib/ng-words";
import { PRESET_WORDS } from "../lib/preset-words";
import { HAKKEN_WORDS } from "../lib/hakken-words";
import { addTicket, getTicketBalance, canSpendTicket } from "../lib/tickets";
import { generateJsonOpenAI } from "../lib/ai";
import { generateImage } from "../lib/image";
import { getCache, setCache } from "../lib/shared-cache";

export const hakken = new Hono<AppEnv>();

interface ClassifyInput {
  word: string;
  collected: string[];
  seeded: string[];
  ngList?: string[];
}

interface RandomInput {
  n: number;
  collected: string[];
  seeded: string[];
}

export function classifyWord({ word, collected, seeded, ngList }: ClassifyInput): ClassifyResponse {
  const effectiveNgList = ngList ?? [];

  if (effectiveNgList.some(ng => word.includes(ng)) || (ngList === undefined && isNgWord(word))) {
    return { status: 'ng', message: 'この ことばは つかえないよ' };
  }
  if (PRESET_WORDS.includes(word)) {
    return { status: 'dict', message: 'じしょに あり・むりょう' };
  }
  if (collected.includes(word)) {
    return { status: 'dup', message: 'もう ずかんに あるよ' };
  }
  if (seeded.includes(word)) {
    return { status: 'seeded', message: 'もう しこみずみ' };
  }
  return { status: 'ok', message: 'はっけんOK' };
}

export function getRandomWords({ n, collected, seeded }: RandomInput): string[] {
  const excluded = new Set([...collected, ...seeded]);
  const available = HAKKEN_WORDS.filter(w => !excluded.has(w));
  const shuffled = available.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

hakken.get("/entries", requireAuth, async (c) => {
  const userId = c.var.userId!;
  const results = await c.env.DB.prepare(
    "SELECT word, emoji, description, image_url FROM hakken_entries WHERE user_id = ?"
  ).bind(userId).all();
  return c.json(results.results);
});

hakken.post("/classify", async (c) => {
  const body = await c.req.json<ClassifyRequest>();
  if (!body.word) {
    throw new AppError(400, "word は必須です");
  }
  const result = classifyWord({
    word: body.word,
    collected: body.collected ?? [],
    seeded: body.seeded ?? [],
  });
  return c.json(result);
});

hakken.get("/random", async (c) => {
  const n = parseInt(c.req.query("n") ?? "3", 10);
  const collectedParam = c.req.query("collected") ?? "";
  const seededParam = c.req.query("seeded") ?? "";
  const collected = collectedParam ? collectedParam.split(",") : [];
  const seeded = seededParam ? seededParam.split(",") : [];
  const words = getRandomWords({ n, collected, seeded });
  return c.json({ words });
});

hakken.post("/generate", requireAuth, async (c) => {
  const body = await c.req.json<HakkenGenerateRequest>();
  const userId = c.var.userId!;
  if (!body.word) {
    throw new AppError(400, "word は必須です");
  }

  const settings = await c.env.DB.prepare(
    "SELECT image_style FROM user_settings WHERE id = ?"
  ).bind(userId).first<{ image_style: string }>();
  const imageStyle = (settings?.image_style || "ehon") as ImageStyle;

  const cached = await getCache(c.env.DB, body.word, imageStyle);

  let generated: HakkenGenerateResponse;
  let imageUrl: string;

  if (cached) {
    generated = { emoji: "📖", description: cached.description };
    imageUrl = cached.image_url;
  } else {
    const prompt = `「${body.word}」についての子ども向け図鑑エントリを作ってください。

ルール:
- 3〜4歳の子どもが理解できるやさしい言葉で説明する
- ひらがなを中心に使う
- ですます調・〜よ・〜ね のトーンで書く
- 2文で書く（1文目と2文目を「。」で区切る）

出力はJSON形式のみで返してください。コードブロックや説明文は不要です。
{"emoji":"絵文字1つ","description":"説明文（2文）"}`;

    [generated, imageUrl] = await Promise.all([
      generateJsonOpenAI<HakkenGenerateResponse>({
        apiKey: c.env.OPENAI_API_KEY,
        prompt,
        model: "gpt-5.4",
      }),
      generateImage({
        apiKey: c.env.OPENAI_API_KEY,
        word: body.word,
        userId,
        bucket: c.env.IMAGES,
        style: imageStyle,
      }),
    ]);

    await setCache(c.env.DB, body.word, imageStyle, imageUrl, generated.description);
  }

  const existing = await c.env.DB.prepare(
    "SELECT word FROM hakken_entries WHERE user_id = ? AND word = ?"
  ).bind(userId, body.word).first();
  const isRediscovery = existing !== null;

  if (!isRediscovery) {
    const balance = await getTicketBalance(c.env.DB, userId);
    if (!canSpendTicket(balance)) {
      throw new AppError(402, "チケットが足りません");
    }
  }

  await c.env.DB.prepare(
    "INSERT OR REPLACE INTO hakken_entries (user_id, word, emoji, description, image_url) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(userId, body.word, generated.emoji, generated.description, imageUrl)
    .run();

  if (!isRediscovery) {
    await addTicket(c.env.DB, userId, -1, `はっけん生成: ${body.word}`);
  }

  return c.json({ ...generated, image_url: imageUrl, cached: !!cached, rediscovery: isRediscovery });
});

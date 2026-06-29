import { Hono } from "hono";
import type { AppEnv, ClassifyRequest, ClassifyResponse, ClassifyStatus, HakkenGenerateRequest, HakkenGenerateResponse } from "../types";
import { AppError } from "../middleware/error-handler";
import { requireAuth } from "../middleware/auth";
import { isNgWord } from "../lib/ng-words";
import { PRESET_WORDS } from "../lib/preset-words";
import { HAKKEN_WORDS } from "../lib/hakken-words";
import { addTicket } from "../lib/tickets";
import { generateJson } from "../lib/ai";
import { generateImage } from "../lib/image";

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

  const prompt = `「${body.word}」についての子ども向け図鑑エントリを作ってください。

ルール:
- 3〜4歳の子どもが理解できるやさしい言葉で説明する
- ひらがなを中心に使う
- ですます調・〜よ・〜ね のトーンで書く
- 2文で書く（1文目と2文目を「。」で区切る）

出力はJSON形式のみで返してください。コードブロックや説明文は不要です。
{"emoji":"絵文字1つ","description":"説明文（2文）"}`;

  console.log("[hakken] start text generation");
  const generated = await generateJson<HakkenGenerateResponse>({
    ai: c.env.AI,
    prompt,
  });
  console.log("[hakken] text done, start image generation");
  const imageUrl = await generateImage({
    apiKey: c.env.OPENAI_API_KEY,
    word: body.word,
    userId,
    bucket: c.env.IMAGES,
  });
  console.log("[hakken] image done:", imageUrl);

  await c.env.DB.prepare(
    "INSERT OR REPLACE INTO hakken_entries (user_id, word, emoji, description, image_url) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(userId, body.word, generated.emoji, generated.description, imageUrl)
    .run();

  await addTicket(c.env.DB, userId, -1, `はっけん生成: ${body.word}`);

  return c.json({ ...generated, image_url: imageUrl });
});

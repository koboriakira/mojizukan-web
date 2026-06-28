import { Hono } from "hono";
import type { AppEnv, ClassifyRequest, ClassifyResponse, ClassifyStatus, HakkenGenerateRequest, HakkenGenerateResponse } from "../types";
import { AppError } from "../middleware/error-handler";
import { isNgWord } from "../lib/ng-words";
import { PRESET_WORDS } from "../lib/preset-words";
import { HAKKEN_WORDS } from "../lib/hakken-words";
import { addTicket } from "../lib/tickets";

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

hakken.post("/generate", async (c) => {
  const body = await c.req.json<HakkenGenerateRequest>();
  if (!body.word || !body.userId) {
    throw new AppError(400, "word と userId は必須です");
  }

  const prompt = `「${body.word}」についての子ども向け図鑑エントリを作ってください。

ルール:
- 3〜4歳の子どもが理解できるやさしい言葉で説明する
- ひらがなを中心に使う
- ですます調・〜よ・〜ね のトーンで書く
- 2文で書く（1文目と2文目を「。」で区切る）

出力はJSON形式のみで返し、以下の構造にすること:
{"emoji":"絵文字1つ","description":"説明文（2文）"}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${c.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("OpenAI API error:", response.status, text);
    throw new AppError(502, "図鑑エントリの生成に失敗しました");
  }

  const data = await response.json<{ choices: { message: { content: string } }[] }>();
  const content = data.choices[0]?.message?.content;
  if (!content) {
    throw new AppError(502, "図鑑エントリの生成に失敗しました");
  }

  const generated = JSON.parse(content) as HakkenGenerateResponse;

  await c.env.DB.prepare(
    "INSERT OR REPLACE INTO hakken_entries (user_id, word, emoji, description) VALUES (?, ?, ?, ?)"
  )
    .bind(body.userId, body.word, generated.emoji, generated.description)
    .run();

  await addTicket(c.env.DB, body.userId, -1, `はっけん生成: ${body.word}`);

  return c.json(generated);
});

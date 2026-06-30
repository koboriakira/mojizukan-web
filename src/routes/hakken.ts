import { Hono } from "hono";
import type { AppEnv } from "../types";
import type { ClassifyRequest, ClassifyResponse, HakkenGenerateRequest } from "../services/kotoba-atsume/types";
import { AppError } from "../middleware/error-handler";
import { requireAuth } from "../middleware/auth";
import { isNgWord } from "../services/kotoba-atsume/ng-words";
import { DICTIONARY_WORDS } from "../services/kotoba-atsume/dictionary-words";
import { HAKKEN_WORDS } from "../services/kotoba-atsume/hakken-words";
import { executeHakkenGenerate } from "../services/kotoba-atsume/hakken-generate";

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
  if (DICTIONARY_WORDS.includes(word)) {
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
    "SELECT word, description, image_url FROM hakken_entries WHERE user_id = ?"
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

  const result = await executeHakkenGenerate(
    { db: c.env.DB, apiKey: c.env.OPENAI_API_KEY, bucket: c.env.IMAGES },
    userId,
    body.word,
  );

  return c.json(result);
});

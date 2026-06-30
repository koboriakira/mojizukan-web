import { Hono } from "hono";
import type { AppEnv } from "../types";
import type { ClassifyRequest, ClassifyResponse, HakkenGenerateRequest } from "../services/kotoba-atsume/types";
import { AppError } from "../middleware/error-handler";
import { requireAuth } from "../middleware/auth";
import { isNgWord } from "../services/kotoba-atsume/ng-words";
import { DICTIONARY_WORDS } from "../services/kotoba-atsume/dictionary-words";
import { executeHakkenGenerate } from "../services/kotoba-atsume/hakken-generate";
import { addPreparedWord, listPreparedWords, removePreparedWord } from "../services/kotoba-atsume/prepared-words";
import { getDailyHakkenMax, setDailyHakkenMax, getDailyHakkenUsed } from "../services/kotoba-atsume/daily-limit";

export const hakken = new Hono<AppEnv>();

interface ClassifyInput {
  word: string;
  collected: string[];
  prepared: string[];
  ngList?: string[];
}

interface RandomInput {
  n: number;
  collected: string[];
  prepared: string[];
}

export function classifyWord({ word, collected, prepared, ngList }: ClassifyInput): ClassifyResponse {
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
  if (prepared.includes(word)) {
    return { status: 'prepared', message: 'もう しこみずみ' };
  }
  return { status: 'ok', message: 'はっけんOK' };
}

export type RandomMode = "normal" | "review" | "exhausted";

export function getRandomWords({ n, collected, prepared }: RandomInput): { words: string[]; mode: RandomMode } {
  const collectedSet = new Set(collected);
  const uncollectedPrepared = prepared.filter(w => !collectedSet.has(w));
  const shuffledPrepared = [...uncollectedPrepared].sort(() => Math.random() - 0.5);

  if (shuffledPrepared.length >= n) {
    return { words: shuffledPrepared.slice(0, n), mode: "normal" };
  }

  const result = shuffledPrepared.slice();

  // prepared が足りない場合、収集済みから復習モードで補完
  if (result.length < n && collected.length > 0) {
    const reviewPool = [...collected].sort(() => Math.random() - 0.5);
    const needed = n - result.length;
    result.push(...reviewPool.slice(0, needed));
    return { words: result, mode: shuffledPrepared.length === 0 ? "review" : "normal" };
  }

  if (result.length > 0) {
    return { words: result, mode: "normal" };
  }

  return { words: [], mode: "exhausted" };
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
    prepared: body.prepared ?? [],
  });
  return c.json(result);
});

hakken.get("/random", async (c) => {
  const n = parseInt(c.req.query("n") ?? "3", 10);
  const collectedParam = c.req.query("collected") ?? "";
  const preparedParam = c.req.query("prepared") ?? "";
  const collected = collectedParam ? collectedParam.split(",") : [];
  const prepared = preparedParam ? preparedParam.split(",") : [];
  const result = getRandomWords({ n, collected, prepared });
  return c.json(result);
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

hakken.get("/prepared", requireAuth, async (c) => {
  const userId = c.var.userId!;
  const words = await listPreparedWords(c.env.DB, userId);
  return c.json({ words });
});

hakken.post("/prepared", requireAuth, async (c) => {
  const body = await c.req.json<{ word: string }>();
  if (!body.word) {
    throw new AppError(400, "word は必須です");
  }
  const userId = c.var.userId!;
  const result = classifyWord({ word: body.word, collected: [], prepared: [] });
  if (result.status !== "ok" && result.status !== "dict") {
    throw new AppError(400, `この言葉は仕込めません: ${result.message}`);
  }
  await addPreparedWord(c.env.DB, userId, body.word);
  return c.json({ ok: true });
});

hakken.delete("/prepared/:word", requireAuth, async (c) => {
  const userId = c.var.userId!;
  const word = c.req.param("word");
  await removePreparedWord(c.env.DB, userId, word);
  return c.json({ ok: true });
});

hakken.get("/daily-limit", requireAuth, async (c) => {
  const userId = c.var.userId!;
  const [max, used] = await Promise.all([
    getDailyHakkenMax(c.env.DB, userId),
    getDailyHakkenUsed(c.env.DB, userId),
  ]);
  return c.json({ max, used, remaining: Math.max(0, max - used) });
});

hakken.put("/daily-limit", requireAuth, async (c) => {
  const body = await c.req.json<{ max: number }>();
  if (typeof body.max !== "number" || !Number.isInteger(body.max)) {
    throw new AppError(400, "max は整数で指定してください");
  }
  const userId = c.var.userId!;
  await setDailyHakkenMax(c.env.DB, userId, body.max);
  return c.json({ ok: true, max: body.max });
});

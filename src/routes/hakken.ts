import { Hono } from "hono";
import type { AppEnv } from "../types";
import type { ClassifyRequest, HakkenGenerateRequest } from "../services/kotoba-atsume/types";
import { AppError } from "../middleware/error-handler";
import { requireAuth } from "../middleware/auth";
import { classifyWord, getRandomWords } from "../services/kotoba-atsume/hakken-logic";
import { executeHakkenGenerate } from "../services/kotoba-atsume/hakken-generate";
import { addPreparedWord, listPreparedWords, removePreparedWord } from "../services/kotoba-atsume/prepared-words";

export const hakken = new Hono<AppEnv>();

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
    zukanWords: body.zukanWords ?? [],
    prepared: body.prepared ?? [],
  });
  return c.json(result);
});

hakken.get("/random", async (c) => {
  const n = parseInt(c.req.query("n") ?? "3", 10);
  const zukanParam = c.req.query("zukanWords") ?? "";
  const preparedParam = c.req.query("prepared") ?? "";
  const zukanWords = zukanParam ? zukanParam.split(",") : [];
  const prepared = preparedParam ? preparedParam.split(",") : [];
  const result = getRandomWords({ n, zukanWords, prepared });
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
  const result = classifyWord({ word: body.word, zukanWords: [], prepared: [] });
  if (result.status !== "ok") {
    throw new AppError(400, `この言葉は登録できません: ${result.message}`);
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

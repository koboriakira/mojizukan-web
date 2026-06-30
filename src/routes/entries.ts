import { Hono } from "hono";
import type { AppEnv, CreateEntryRequest } from "../types";
import { AppError } from "../middleware/error-handler";
import { findDictionaryWord } from "../services/kotoba-atsume/word-dictionary";

export const entries = new Hono<AppEnv>();

entries.get("/", async (c) => {
  const category = c.req.query("category");
  let query = "SELECT id, word, category, is_discovered, image_url, created_at FROM entries";
  const params: string[] = [];

  if (category) {
    query += " WHERE category = ?";
    params.push(category);
  }
  query += " ORDER BY created_at DESC";

  const stmt = c.env.DB.prepare(query);
  const results = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();
  return c.json(results.results);
});

entries.get("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await c.env.DB.prepare("SELECT * FROM entries WHERE id = ?")
    .bind(id)
    .first();
  if (!result) {
    throw new AppError(404, "Entry not found");
  }
  return c.json(result);
});

entries.post("/", async (c) => {
  const body = await c.req.json<CreateEntryRequest>();
  if (!body.word) {
    throw new AppError(400, "word is required");
  }

  const existing = await c.env.DB.prepare("SELECT id FROM entries WHERE word = ?")
    .bind(body.word)
    .first();
  if (existing) {
    throw new AppError(409, "This word is already registered");
  }

  const preset = findDictionaryWord(body.word);
  const id = crypto.randomUUID();
  const isDiscovered = preset ? 0 : 1;
  const category = preset?.category ?? body.category ?? null;
  const description = preset?.description ?? null;

  await c.env.DB.prepare(
    "INSERT INTO entries (id, word, category, is_discovered, description, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))",
  )
    .bind(id, body.word, category, isDiscovered, description)
    .run();

  return c.json({ id, word: body.word, is_discovered: isDiscovered, category }, 201);
});

entries.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await c.env.DB.prepare("DELETE FROM entries WHERE id = ?")
    .bind(id)
    .run();
  if (result.meta.changes === 0) {
    throw new AppError(404, "Entry not found");
  }
  return c.json({ deleted: true });
});

import { Hono } from "hono";
import type { Bindings } from "../index";

export const entries = new Hono<{ Bindings: Bindings }>();

entries.get("/", async (c) => {
  const results = await c.env.DB.prepare(
    "SELECT id, word, category, is_discovered, created_at FROM entries ORDER BY created_at DESC"
  ).all();
  return c.json(results.results);
});

entries.get("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await c.env.DB.prepare(
    "SELECT * FROM entries WHERE id = ?"
  )
    .bind(id)
    .first();
  if (!result) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json(result);
});

entries.post("/", async (c) => {
  const body = await c.req.json<{ word: string; category?: string }>();
  if (!body.word) {
    return c.json({ error: "word is required" }, 400);
  }
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO entries (id, word, category, is_discovered, created_at) VALUES (?, ?, ?, 1, datetime('now'))"
  )
    .bind(id, body.word, body.category ?? null)
    .run();
  return c.json({ id, word: body.word }, 201);
});

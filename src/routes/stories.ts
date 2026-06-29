import { Hono } from "hono";
import type { AppEnv, StoryPage, StoryRecord } from "../types";
import { AppError } from "../middleware/error-handler";
import { requireAuth } from "../middleware/auth";

export const stories = new Hono<AppEnv>();
stories.use("/*", requireAuth);

export function validateWords(words: unknown): words is string[] {
  return Array.isArray(words) && words.length >= 2 && words.length <= 5;
}

function parseRecord(row: StoryRecord) {
  return {
    id: row.id,
    words: JSON.parse(row.words) as string[],
    pages: row.pages ? (JSON.parse(row.pages) as StoryPage[]) : null,
    status: row.status,
    created_at: row.created_at,
  };
}

stories.get("/", async (c) => {
  const userId = c.get("userId")!;
  const rows = await c.env.DB.prepare(
    "SELECT id, words, pages, status, created_at FROM stories WHERE user_id = ? ORDER BY created_at DESC"
  )
    .bind(userId)
    .all<StoryRecord>();
  return c.json({ stories: rows.results.map(parseRecord) });
});

stories.get("/:id", async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");
  const row = await c.env.DB.prepare(
    "SELECT id, words, pages, status, created_at FROM stories WHERE id = ? AND user_id = ?"
  )
    .bind(id, userId)
    .first<StoryRecord>();
  if (!row) {
    throw new AppError(404, "Story not found");
  }
  return c.json(parseRecord(row));
});

stories.post("/", async (c) => {
  const userId = c.get("userId")!;
  const body = await c.req.json<{ words: unknown }>();
  if (!validateWords(body.words)) {
    throw new AppError(400, "words は 2〜5 個の配列で指定してください");
  }
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO stories (id, user_id, words, pages, status, created_at) VALUES (?, ?, ?, NULL, 'writing', datetime('now'))"
  )
    .bind(id, userId, JSON.stringify(body.words))
    .run();
  return c.json({ id, words: body.words, status: "writing", created_at: new Date().toISOString() }, 201);
});

stories.patch("/:id", async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");
  const existing = await c.env.DB.prepare(
    "SELECT id FROM stories WHERE id = ? AND user_id = ?"
  )
    .bind(id, userId)
    .first<{ id: string }>();
  if (!existing) {
    throw new AppError(404, "Story not found");
  }
  const body = await c.req.json<{ pages?: StoryPage[]; status?: string }>();
  const sets: string[] = [];
  const params: unknown[] = [];
  if (body.pages !== undefined) {
    sets.push("pages = ?");
    params.push(JSON.stringify(body.pages));
  }
  if (body.status !== undefined) {
    sets.push("status = ?");
    params.push(body.status);
  }
  if (sets.length === 0) {
    throw new AppError(400, "更新するフィールドがありません");
  }
  params.push(id, userId);
  await c.env.DB.prepare(
    `UPDATE stories SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`
  )
    .bind(...params)
    .run();
  const updated = await c.env.DB.prepare(
    "SELECT id, words, pages, status, created_at FROM stories WHERE id = ?"
  )
    .bind(id)
    .first<StoryRecord>();
  return c.json(parseRecord(updated!));
});

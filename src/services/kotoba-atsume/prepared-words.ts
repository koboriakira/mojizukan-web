export interface PreparedWord {
  id: number;
  user_id: string;
  word: string;
  created_at: string;
}

export async function addPreparedWord(db: D1Database, userId: string, word: string): Promise<void> {
  const existing = await db.prepare(
    "SELECT id FROM prepared_words WHERE user_id = ? AND word = ?"
  ).bind(userId, word).first();
  if (existing) {
    throw new Error("この言葉は既に仕込み済みです");
  }
  await db.prepare(
    "INSERT INTO prepared_words (user_id, word) VALUES (?, ?)"
  ).bind(userId, word).run();
}

export async function listPreparedWords(db: D1Database, userId: string): Promise<string[]> {
  const result = await db.prepare(
    "SELECT word FROM prepared_words WHERE user_id = ?"
  ).bind(userId).all<{ word: string }>();
  return result.results.map(r => r.word);
}

export async function removePreparedWord(db: D1Database, userId: string, word: string): Promise<void> {
  await db.prepare(
    "DELETE FROM prepared_words WHERE user_id = ? AND word = ?"
  ).bind(userId, word).run();
}

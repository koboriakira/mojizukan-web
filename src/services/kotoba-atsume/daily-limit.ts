const DEFAULT_DAILY_HAKKEN_MAX = 3;

export async function getDailyHakkenMax(db: D1Database, userId: string): Promise<number> {
  const result = await db.prepare(
    "SELECT daily_hakken_max FROM user_settings WHERE id = ?"
  ).bind(userId).first<{ daily_hakken_max: number | null }>();
  return result?.daily_hakken_max ?? DEFAULT_DAILY_HAKKEN_MAX;
}

export async function setDailyHakkenMax(db: D1Database, userId: string, max: number): Promise<void> {
  if (max < 0 || max > 9) {
    throw new Error("daily_hakken_max は 0〜9 の範囲で設定してください");
  }
  await db.prepare(
    "UPDATE user_settings SET daily_hakken_max = ? WHERE id = ?"
  ).bind(max, userId).run();
}

export async function getDailyHakkenUsed(db: D1Database, userId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const result = await db.prepare(
    "SELECT count FROM daily_hakken_usage WHERE user_id = ? AND date = ?"
  ).bind(userId, today).first<{ count: number }>();
  return result?.count ?? 0;
}

export async function incrementDailyHakkenUsed(db: D1Database, userId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await db.prepare(
    "INSERT INTO daily_hakken_usage (user_id, date, count) VALUES (?, ?, 1) ON CONFLICT(user_id, date) DO UPDATE SET count = count + 1"
  ).bind(userId, today).run();
}

export async function canHakkenToday(db: D1Database, userId: string): Promise<boolean> {
  const [max, used] = await Promise.all([
    getDailyHakkenMax(db, userId),
    getDailyHakkenUsed(db, userId),
  ]);
  return used < max;
}

export const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;

export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSession(
  db: D1Database,
  userId: string
): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE_SEC * 1000
  ).toISOString();
  await db
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, userId, expiresAt)
    .run();
  return token;
}

export async function getSession(
  db: D1Database,
  token: string
): Promise<{ userId: string } | null> {
  const row = await db
    .prepare(
      "SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime('now')"
    )
    .bind(token)
    .first<{ user_id: string }>();
  return row ? { userId: row.user_id } : null;
}

export async function deleteSession(
  db: D1Database,
  token: string
): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
}

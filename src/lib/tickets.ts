export const FREE_DISCOVER_LIMIT = 10;
export const SIGNUP_BONUS_TICKETS = 50;

export async function getTicketBalance(db: D1Database, userId: string): Promise<number> {
  const result = await db
    .prepare("SELECT COALESCE(SUM(amount), 0) as balance FROM tickets WHERE user_id = ?")
    .bind(userId)
    .first<{ balance: number }>();
  return result?.balance ?? 0;
}

export async function getDiscoverCount(db: D1Database, userId: string): Promise<number> {
  const result = await db
    .prepare("SELECT COUNT(*) as count FROM hakken_entries WHERE user_id = ?")
    .bind(userId)
    .first<{ count: number }>();
  return result?.count ?? 0;
}

export async function addTicket(
  db: D1Database,
  userId: string,
  amount: number,
  reason: string,
): Promise<void> {
  const id = crypto.randomUUID();
  await db
    .prepare("INSERT INTO tickets (id, user_id, amount, reason) VALUES (?, ?, ?, ?)")
    .bind(id, userId, amount, reason)
    .run();
}

export function canSpendTicket(balance: number): boolean {
  return balance >= 1;
}

const FREE_DISCOVER_LIMIT = 10;

export async function getTicketBalance(db: D1Database, userId: string): Promise<number> {
  const result = await db
    .prepare("SELECT COALESCE(SUM(amount), 0) as balance FROM tickets WHERE user_id = ?")
    .bind(userId)
    .first<{ balance: number }>();
  return result?.balance ?? 0;
}

export async function canDiscover(db: D1Database, userId: string, isPremium: boolean): Promise<boolean> {
  if (isPremium) return true;
  const used = await getDiscoverCount(db, userId);
  return used < FREE_DISCOVER_LIMIT;
}

export async function getDiscoverCount(db: D1Database, userId: string): Promise<number> {
  const result = await db
    .prepare("SELECT COUNT(*) as count FROM entries WHERE id IN (SELECT id FROM entries) AND is_discovered = 1")
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

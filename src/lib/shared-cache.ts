interface CacheEntry {
  image_url: string;
  description: string;
}

export async function getCache(
  db: D1Database,
  word: string,
  style: string,
): Promise<CacheEntry | null> {
  const result = await db
    .prepare("SELECT image_url, description FROM shared_cache WHERE word = ? AND style = ?")
    .bind(word, style)
    .first<CacheEntry>();
  return result ?? null;
}

export async function setCache(
  db: D1Database,
  word: string,
  style: string,
  imageUrl: string,
  description: string,
): Promise<void> {
  await db
    .prepare(
      "INSERT OR REPLACE INTO shared_cache (word, style, image_url, description) VALUES (?, ?, ?, ?)",
    )
    .bind(word, style, imageUrl, description)
    .run();
}

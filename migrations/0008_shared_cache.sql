CREATE TABLE IF NOT EXISTS shared_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL,
  style TEXT NOT NULL DEFAULT 'ehon',
  image_url TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(word, style)
);

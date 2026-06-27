CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL,
  category TEXT,
  is_discovered INTEGER NOT NULL DEFAULT 1,
  image_url TEXT,
  description TEXT,
  emoji TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

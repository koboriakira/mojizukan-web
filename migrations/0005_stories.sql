CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  words TEXT NOT NULL,
  pages TEXT,
  status TEXT NOT NULL DEFAULT 'writing',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES auth_users(id)
);
CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id);

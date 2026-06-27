-- ユーザー設定
CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY,
  image_style TEXT NOT NULL DEFAULT 'honwaka',
  is_premium INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- チケット（はっけん回数の管理）
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_settings(id)
);

-- チケット残高のビュー用インデックス
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);

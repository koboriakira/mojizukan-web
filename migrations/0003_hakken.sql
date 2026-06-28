-- はっけんエントリ（AI生成された図鑑エントリ）
CREATE TABLE IF NOT EXISTS hakken_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '✨',
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_settings(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hakken_entries_user_word ON hakken_entries(user_id, word);

-- 仕込み済みワード（保護者が仕込んだ「ひみつのことば」）
CREATE TABLE IF NOT EXISTS seeded_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending / discovered / expired
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_settings(id)
);

CREATE INDEX IF NOT EXISTS idx_seeded_words_user ON seeded_words(user_id, status);

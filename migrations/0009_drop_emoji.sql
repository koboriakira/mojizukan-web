-- hakken_entries から emoji カラムを削除
-- SQLite は ALTER TABLE DROP COLUMN を直接サポートしないため、テーブルを再作成する
CREATE TABLE hakken_entries_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, word)
);

INSERT INTO hakken_entries_new (id, user_id, word, description, image_url, created_at)
  SELECT id, user_id, word, description, image_url, created_at FROM hakken_entries;

DROP TABLE hakken_entries;
ALTER TABLE hakken_entries_new RENAME TO hakken_entries;

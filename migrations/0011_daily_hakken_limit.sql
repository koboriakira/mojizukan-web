ALTER TABLE user_settings ADD COLUMN daily_hakken_max INTEGER DEFAULT NULL;

CREATE TABLE IF NOT EXISTS daily_hakken_usage (
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date),
  FOREIGN KEY (user_id) REFERENCES user_settings(id)
);

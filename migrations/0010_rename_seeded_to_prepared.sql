ALTER TABLE seeded_words RENAME TO prepared_words;

DROP INDEX IF EXISTS idx_seeded_words_user;
CREATE INDEX IF NOT EXISTS idx_prepared_words_user ON prepared_words(user_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prepared_words_user_word ON prepared_words(user_id, word);

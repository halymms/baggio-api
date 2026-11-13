-- Idempotente: remove duplicatas e garante índice único em email.
DELETE FROM users a
USING users b
WHERE a.id > b.id AND a.email = b.email;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);

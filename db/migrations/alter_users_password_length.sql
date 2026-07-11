-- Idempotente: bcrypt precisa de VARCHAR(255).
ALTER TABLE users ALTER COLUMN password TYPE VARCHAR(255);

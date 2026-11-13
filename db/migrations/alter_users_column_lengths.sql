-- Idempotente: alinha tamanhos das colunas ao schema atual.
ALTER TABLE users ALTER COLUMN name TYPE VARCHAR(255);
ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(255);
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50);

-- Garante default e normaliza roles legadas. Seguro reexecutar.
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'viewer';
UPDATE users SET role = 'viewer' WHERE role = 'user';

ALTER TABLE users ALTER COLUMN role SET DEFAULT 'viewer';
UPDATE users SET role = 'viewer' WHERE role = 'user';

const { Pool } = require('pg');
require('dotenv').config();

// Produção (Railway): DATABASE_URL = Shared Pooler IPv4 (*.pooler.supabase.com).
// Migrations locais: preferir DATABASE_DIRECT_URL (db.*.supabase.co:5432) no script.
// Desenvolvimento local sem URL: variáveis DB_* individuais.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASS,
      port: process.env.DB_PORT,
    });

module.exports = pool;

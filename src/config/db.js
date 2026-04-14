const { Pool } = require('pg');
require('dotenv').config();

// No Render, DATABASE_URL é injetado automaticamente.
// Em desenvolvimento local, usamos as variáveis individuais do .env.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // necessário para conexões SSL do Render
    })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASS,
      port: process.env.DB_PORT,
    });

module.exports = pool;

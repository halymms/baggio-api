const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// Preferir Direct URL para DDL (Supabase). Em hosts só-IPv4 (Railway),
// use Session/Transaction pooler em DATABASE_URL e rode migrations localmente.
const connectionString = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASS,
      port: process.env.DB_PORT,
    });

// Ordem importa: users deve ser criado antes de tabelas que dependam dele
const migrationFiles = [
  'create_users.sql',
  'alter_users_role_default.sql',
  'add_created_at_to_users.sql',
  'alter_users_password_length.sql',
  'alter_users_column_lengths.sql',
  'add_users_email_unique.sql',
  'create_innovation_fund_data.sql',
  'create_manager_commission_data.sql',
  'add_section_to_manager_commission_data.sql',
  'create_monthly_closing_data.sql',
  'create_realtime_report_item_data.sql',
  // 'add_mes_ano_to_realtime_report_item_data.sql', // já incluso no CREATE TABLE acima
  'create_inadimplencia_data.sql',
  'create_inadimplencia_fechamento.sql',
];

async function runMigrations() {
  const mode = process.env.DATABASE_DIRECT_URL
    ? 'DATABASE_DIRECT_URL'
    : process.env.DATABASE_URL
      ? 'DATABASE_URL'
      : 'DB_* local';

  console.log(`Conectando via ${mode}...\n`);

  const migrationsDir = path.join(__dirname, '../db/migrations');

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);

    if (!fs.existsSync(filePath)) {
      console.warn(`  [SKIP] ${file} — arquivo não encontrado.`);
      continue;
    }

    try {
      console.log(`  [RUN]  ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf8');
      await pool.query(sql);
      console.log(`  [OK]   ${file}`);
    } catch (error) {
      console.error(`  [ERRO] ${file}:`, error.message);
      await pool.end();
      process.exit(1);
    }
  }

  console.log('\nTodas as migrations executadas com sucesso!');
  await pool.end();
}

runMigrations();

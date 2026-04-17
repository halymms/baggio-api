const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

// Ordem importa: users deve ser criado antes de tabelas que dependam dele
const migrationFiles = [
  'create_users.sql',
  'create_innovation_fund_data.sql',
  'create_manager_commission_data.sql',
  'create_monthly_closing_data.sql',
  'create_realtime_report_item_data.sql',
  // 'add_mes_ano_to_realtime_report_item_data.sql', // ignorado: já incluso no CREATE TABLE acima
];

async function runMigrations() {
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
      process.exit(1); // Para na primeira falha
    }
  }

  console.log('\nTodas as migrations executadas com sucesso!');
  pool.end();
}

runMigrations();

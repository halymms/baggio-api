require('dotenv').config();
const { syncInadimplencia } = require('../src/services/syncInadimplencia');

/**
 * Job de sync completo de inadimplência (últimos 24 meses, mês a mês).
 *
 * Local:
 *   npm run db:sync:inadimplencia
 *
 * Railway Cron (opcional, serviço separado, mesmas env vars da API):
 *   Frequência: 0 6 2 * *  (dia 2 de cada mês, 03:00 UTC-3)
 *   Comando: npm run db:sync:inadimplencia
 *   Variáveis: DATABASE_URL, PPFY_USER, PPFY_PASS
 *
 * Snapshots fixos:
 *   npm run db:sync:inadimplencia:dia1
 *   npm run db:sync:inadimplencia:dia16
 */
async function run() {
  console.log('Iniciando sync de inadimplência...\n');
  const startedAt = Date.now();

  try {
    const result = await syncInadimplencia();
    const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);

    console.log('\nSync concluído.');
    console.log(JSON.stringify(result, null, 2));
    console.log(`\nDuração: ${elapsedSec}s`);
    process.exit(0);
  } catch (error) {
    console.error('Falha no sync de inadimplência:', error.message);
    process.exit(1);
  }
}

run();

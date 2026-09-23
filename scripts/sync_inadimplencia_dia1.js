require('dotenv').config();
const { capturePagoDia1 } = require('../src/services/syncInadimplencia');

/**
 * Snapshot fixo do valor pago (dia 1).
 *
 * Uso:
 *   npm run db:sync:inadimplencia:dia1
 *
 * Railway Cron sugerido:
 *   0 6 1 * *  (dia 1, 03:00 UTC-3)
 */
async function main() {
  console.log('Capturando snapshot pago dia 1...\n');
  try {
    const result = await capturePagoDia1();
    console.log(JSON.stringify(result, null, 2));
    console.log(
      result.already_frozen
        ? '\nSnapshot já existia — valor não foi sobrescrito.'
        : '\nSnapshot pago_dia_1 gravado com sucesso.'
    );
    process.exit(0);
  } catch (error) {
    console.error('Falha no snapshot pago dia 1:', error.message);
    process.exit(1);
  }
}

main();

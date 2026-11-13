require('dotenv').config();
const { captureAbertoDia16 } = require('../src/services/syncInadimplencia');

/**
 * Snapshot fixo do valor em aberto (dia 16).
 *
 * Uso:
 *   npm run db:sync:inadimplencia:dia16
 *
 * Railway Cron sugerido:
 *   0 6 16 * *  (dia 16, 03:00 UTC-3)
 */
async function main() {
  console.log('Capturando snapshot aberto dia 16...\n');
  try {
    const result = await captureAbertoDia16();
    console.log(JSON.stringify(result, null, 2));
    console.log(
      result.already_frozen
        ? '\nSnapshot já existia — valor não foi sobrescrito.'
        : '\nSnapshot aberto_dia_16 gravado com sucesso.'
    );
    process.exit(0);
  } catch (error) {
    console.error('Falha no snapshot aberto dia 16:', error.message);
    process.exit(1);
  }
}

main();

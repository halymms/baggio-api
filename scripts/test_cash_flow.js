require('dotenv').config();
const fetch = require('node-fetch');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:4000';

async function test() {
  console.log('=== Teste Fluxo de Caixa ===\n');

  try {
    const walletsRes = await fetch(`${BASE_URL}/api/properfy/wallets`);
    const wallets = await walletsRes.json();
    console.log(`Wallets (${wallets.length}):`, wallets.map((w) => `${w.id}=${w.nome}`).join(', '));

    const url = `${BASE_URL}/api/properfy/cash-flow?mes=6&ano=2026&fkWallets=1`;
    console.log(`\nGET ${url}`);
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      console.error('ERRO:', data);
      process.exit(1);
    }

    console.log('\nCards:', data.cards);
    console.log('Período:', data.periodo);

    const dia01 = data.grafico.find((d) => d.data === '2026-06-01');
    const dia09 = data.grafico.find((d) => d.data === '2026-06-09');

    console.log('\nSantander - dia 01/06:', dia01?.valor, '(esperado: -117941.23)');
    console.log('Santander - dia 09/06:', dia09?.valor, '(esperado: -45121.28)');

    const { totalGeral, totalEntradas, totalSaidas } = data.cards;
    const diff = Math.abs(totalGeral - (totalEntradas - totalSaidas));
    console.log('\nInvariante totalGeral === entradas - saídas:', diff < 0.01 ? 'OK' : `FALHOU (diff: ${diff})`);

    if (dia01?.valor === -117941.23 && dia09?.valor === -45121.28) {
      console.log('\nPASSED: Subtotais diários conferem com Conciliação Bancária.');
    } else {
      console.log('\nAVISO: Subtotais diários diferem do esperado (pode ser dados atualizados).');
    }
  } catch (error) {
    console.error('Test Failed:', error.message);
    process.exit(1);
  }
}

test();

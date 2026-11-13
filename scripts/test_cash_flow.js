const assert = require('assert');
const { aggregateCashFlow, buildDailyBalances } = require('../src/services/cashFlowAggregate');

const range = {
  mes: 6,
  ano: 2026,
  inicio: '2026-06-01',
  fim: '2026-06-10',
  daysInMonth: 10,
};

function testCarryForward() {
  const dias = buildDailyBalances(
    {
      balance: 0,
      data: [
        { date: '2026-06-01T03:00:00.000000Z', balance: 100, total: 100 },
        { date: '2026-06-03T03:00:00.000000Z', balance: 250, total: 150 },
      ],
    },
    { ...range, daysInMonth: 3 }
  );

  assert.deepStrictEqual(
    dias.map((d) => d.saldo),
    [100, 100, 250]
  );
}

function testOpeningBalanceWhenMonthHasNoMovement() {
  const dias = buildDailyBalances(
    { balance: 9369, data: [] },
    { ...range, daysInMonth: 3 }
  );

  assert.deepStrictEqual(
    dias.map((d) => d.saldo),
    [9369, 9369, 9369]
  );
}

function testItauClosingBalanceAndSum() {
  const itau = {
    wallet: { id: 2, nome: 'Itaú' },
    collect: {
      balance: 24527.53,
      data: [
        { date: '2026-06-09T03:00:00.000000Z', balance: 18742.22, total: 16860.99 },
        { date: '2026-06-10T03:00:00.000000Z', balance: 25616.01, total: 6873.79 },
      ],
    },
  };
  const santander = {
    wallet: { id: 1, nome: 'Santander' },
    collect: {
      balance: 1000,
      data: [{ date: '2026-06-10T03:00:00.000000Z', balance: 1500, total: 500 }],
    },
  };

  const payload = aggregateCashFlow([santander, itau], range);
  const itauSerie = payload.bancos.find((b) => b.fkWallet === 2);
  const dia10 = itauSerie.dias.find((d) => d.data === '2026-06-10');
  const dia09 = itauSerie.dias.find((d) => d.data === '2026-06-09');
  const grafico10 = payload.grafico.find((d) => d.data === '2026-06-10');

  assert.strictEqual(dia09.saldo, 18742.22);
  assert.strictEqual(dia10.saldo, 25616.01);
  assert.strictEqual(grafico10.valor, 27116.01);
  assert.strictEqual(payload.cards.saldo, 27116.01);
  assert.ok(!('totalEntradas' in payload.cards));
}

testCarryForward();
testOpeningBalanceWhenMonthHasNoMovement();
testItauClosingBalanceAndSum();
console.log('PASSED: saldo diário usa o fechamento e soma os bancos selecionados.');

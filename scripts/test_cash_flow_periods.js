const assert = require('assert');
const { groupPeriodos, listMonths, probeDay } = require('../src/services/cashFlowPeriods');

function testListMonthsStopsAtCurrent() {
  const months = listMonths(2026, 9, 2026, 10);
  assert.deepStrictEqual(months, [
    { ano: 2026, mes: 9 },
    { ano: 2026, mes: 10 },
  ]);
}

function testProbeDayUsesTodayBeforeThe15th() {
  const day = probeDay(2026, 10, new Date(2026, 9, 8));
  assert.strictEqual(day, '2026-10-08');
}

function testGroupDropsMonthsWithoutData() {
  const periodos = groupPeriodos([
    { ano: 2023, mes: 1, hasData: false },
    { ano: 2023, mes: 2, hasData: false },
    { ano: 2023, mes: 3, hasData: true },
    { ano: 2023, mes: 12, hasData: true },
    { ano: 2026, mes: 10, hasData: true },
    { ano: 2026, mes: 11, hasData: false },
  ]);

  assert.deepStrictEqual(periodos, [
    { ano: 2023, meses: [3, 12] },
    { ano: 2026, meses: [10] },
  ]);
}

testListMonthsStopsAtCurrent();
testProbeDayUsesTodayBeforeThe15th();
testGroupDropsMonthsWithoutData();
console.log('PASSED: períodos ficam só nos meses com saldo.');

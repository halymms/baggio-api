const round2 = (n) => Math.round(n * 100) / 100;

const toDateKey = (isoDate) => (isoDate || '').slice(0, 10);

function readBalance(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildDailyBalances(collect, range) {
  const byDate = new Map();

  for (const day of collect?.data || []) {
    const dateKey = toDateKey(day.date);
    const balance = readBalance(day.balance);
    if (!dateKey || balance === null) continue;
    byDate.set(dateKey, balance);
  }

  let carried = readBalance(collect?.balance);
  const [anoStr, mesStr] = range.inicio.split('-');
  const dias = [];

  for (let dia = 1; dia <= range.daysInMonth; dia++) {
    const data = `${anoStr}-${mesStr}-${String(dia).padStart(2, '0')}`;
    if (byDate.has(data)) carried = byDate.get(data);
    dias.push({
      dia,
      data,
      saldo: round2(carried ?? 0),
    });
  }

  return dias;
}

function aggregateCashFlow(walletResults, range) {
  const bancos = walletResults.map(({ wallet, collect }) => {
    const dias = buildDailyBalances(collect, range);
    const saldo = dias.length ? dias[dias.length - 1].saldo : 0;
    return {
      fkWallet: wallet.id,
      nome: wallet.nome,
      saldo,
      dias,
    };
  });

  const grafico = [];
  for (let i = 0; i < range.daysInMonth; i++) {
    const sample = bancos[0]?.dias[i];
    const valor = bancos.reduce((sum, banco) => sum + (banco.dias[i]?.saldo || 0), 0);
    grafico.push({
      dia: i + 1,
      data: sample?.data || '',
      valor: round2(valor),
    });
  }

  return {
    periodo: {
      mes: range.mes,
      ano: range.ano,
      inicio: range.inicio,
      fim: range.fim,
    },
    cards: {
      saldo: grafico.length ? grafico[grafico.length - 1].valor : 0,
    },
    grafico,
    bancos,
  };
}

module.exports = { aggregateCashFlow, buildDailyBalances };

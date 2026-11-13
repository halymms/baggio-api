const fetch = require('node-fetch');
const { WALLETS } = require('../config/wallets');
const { getProperfyToken } = require('../controllers/properfyController');

const PROPERFY_BASE = 'https://adm.baggioimoveis.com.br/api';
const CACHE_MS = 60 * 60 * 1000;
const FIRST_YEAR = 2022;
const PROBE_CONCURRENCY = 4;

const probeOrder = [
  ...WALLETS.filter((wallet) => wallet.id === 2),
  ...WALLETS.filter((wallet) => wallet.id !== 2),
];

let cache = null;
let pending = null;

const pad = (value) => String(value).padStart(2, '0');

function listMonths(fromAno, fromMes, toAno, toMes) {
  const months = [];
  let ano = fromAno;
  let mes = fromMes;

  while (ano < toAno || (ano === toAno && mes <= toMes)) {
    months.push({ ano, mes });
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }

  return months;
}

function probeDay(ano, mes, now = new Date()) {
  const lastDay = new Date(ano, mes, 0).getDate();
  let day = Math.min(15, lastDay);
  const isCurrentMonth = now.getFullYear() === ano && now.getMonth() + 1 === mes;
  if (isCurrentMonth) day = Math.min(day, now.getDate());
  return `${ano}-${pad(mes)}-${pad(day)}`;
}

function groupPeriodos(flags) {
  const byYear = new Map();

  for (const { ano, mes, hasData } of flags) {
    if (!hasData) continue;
    if (!byYear.has(ano)) byYear.set(ano, []);
    byYear.get(ano).push(mes);
  }

  return [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ano, meses]) => ({
      ano,
      meses: [...meses].sort((a, b) => a - b),
    }));
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await fn(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return out;
}

async function walletHasDay(token, walletId, day) {
  const end = `${day}T23:59:59.999-03:00`;
  const url = `${PROPERFY_BASE}/billing/transaction/collect?fkWallet=${walletId}&start=${encodeURIComponent(day)}&end=${encodeURIComponent(end)}`;
  const response = await fetch(url, {
    method: 'GET',
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) return false;
  const data = await response.json();
  return Array.isArray(data.data) && data.data.length > 0;
}

async function monthHasData(token, ano, mes, now) {
  const day = probeDay(ano, mes, now);

  for (const wallet of probeOrder) {
    try {
      if (await walletHasDay(token, wallet.id, day)) return true;
    } catch {
      // Tenta o próximo banco. Um mês só fica de fora se nenhum responder com saldo.
    }
  }

  return false;
}

async function buildPeriodos(now = new Date()) {
  const token = await getProperfyToken();
  if (!token) {
    throw new Error('Login inválido na Properfy');
  }

  const candidates = listMonths(FIRST_YEAR, 1, now.getFullYear(), now.getMonth() + 1);
  const flags = await mapPool(candidates, PROBE_CONCURRENCY, async ({ ano, mes }) => ({
    ano,
    mes,
    hasData: await monthHasData(token, ano, mes, now),
  }));

  return { periodos: groupPeriodos(flags) };
}

async function loadCashFlowPeriodos() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  if (!pending) {
    pending = buildPeriodos()
      .then((value) => {
        cache = { at: Date.now(), value };
        return value;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

module.exports = {
  loadCashFlowPeriodos,
  listMonths,
  probeDay,
  groupPeriodos,
};

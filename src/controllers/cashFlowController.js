const fetch = require('node-fetch');
const { WALLETS } = require('../config/wallets');
const { getProperfyToken } = require('./properfyController');
const { aggregateCashFlow } = require('../services/cashFlowAggregate');
const { loadCashFlowPeriodos } = require('../services/cashFlowPeriods');

const PROPERFY_BASE = 'https://adm.baggioimoveis.com.br/api';

const getMonthRange = (mes, ano) => {
  const m = Number(mes);
  const a = Number(ano);
  const start = `${a}-${String(m).padStart(2, '0')}-01`;
  const daysInMonth = new Date(a, m, 0).getDate();

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === a && now.getMonth() + 1 === m;
  const lastDay = isCurrentMonth ? now.getDate() : daysInMonth;
  const fim = `${a}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const end = `${fim}T23:59:59.999-03:00`;

  return { start, end, inicio: start, fim, daysInMonth: lastDay, mes: m, ano: a };
};

const fetchCollect = async (token, fkWallet, start, end) => {
  const url = `${PROPERFY_BASE}/billing/transaction/collect?fkWallet=${fkWallet}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Properfy retornou status ${response.status}`);
  }
  return response.json();
};

const getWallets = (req, res) => {
  res.json(WALLETS);
};

const getCashFlowPeriodos = async (req, res) => {
  try {
    const payload = await loadCashFlowPeriodos();
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCashFlow = async (req, res) => {
  try {
    const { mes, ano, fkWallets } = req.query;

    if (!mes || !ano) {
      return res.status(400).json({ error: 'Parâmetros mes e ano são obrigatórios' });
    }

    const range = getMonthRange(mes, ano);

    let wallets = WALLETS;
    if (fkWallets) {
      const ids = fkWallets.split(',').map((id) => Number(id.trim()));
      wallets = WALLETS.filter((w) => ids.includes(w.id));
      if (wallets.length === 0) {
        return res.status(400).json({ error: 'Nenhum fkWallet válido informado' });
      }
    }

    const token = await getProperfyToken();
    if (!token) {
      return res.status(502).json({ error: 'Login inválido na Properfy' });
    }

    const avisos = [];
    const results = await Promise.all(
      wallets.map(async (wallet) => {
        try {
          const collect = await fetchCollect(token, wallet.id, range.start, range.end);
          return { wallet, collect };
        } catch {
          avisos.push(`${wallet.nome}: não foi possível carregar o saldo.`);
          return { wallet, collect: { balance: null, data: [] } };
        }
      })
    );

    const payload = aggregateCashFlow(results, range);
    payload.avisos = avisos;

    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getCashFlow, getCashFlowPeriodos, getWallets };

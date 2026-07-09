const fetch = require('node-fetch');
const { WALLETS } = require('../config/wallets');
const { getProperfyToken } = require('./properfyController');

const PROPERFY_BASE = 'https://adm.baggioimoveis.com.br/api';

const round2 = (n) => Math.round(n * 100) / 100;

const toDateKey = (isoDate) => (isoDate || '').slice(0, 10);

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

const aggregateCashFlow = (walletResults, range) => {
  const dailyTotals = {};
  let totalEntradas = 0;
  let totalSaidas = 0;
  let totalGeral = 0;

  const bancos = walletResults.map(({ wallet, data }) => {
    let bancoTotal = 0;

    for (const day of data || []) {
      const dateKey = toDateKey(day.date);
      const dayTotal = Number(day.total) || 0;

      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + dayTotal;
      bancoTotal += dayTotal;
      totalGeral += dayTotal;

      for (const item of day.items || []) {
        const amount = Number(item.amount) || 0;
        if (amount > 0) totalEntradas += amount;
        else if (amount < 0) totalSaidas += Math.abs(amount);
      }
    }

    return {
      fkWallet: wallet.id,
      nome: wallet.nome,
      totalGeral: round2(bancoTotal),
    };
  });

  const grafico = [];
  const [anoStr, mesStr] = range.inicio.split('-');
  for (let dia = 1; dia <= range.daysInMonth; dia++) {
    const data = `${anoStr}-${mesStr}-${String(dia).padStart(2, '0')}`;
    grafico.push({
      dia,
      data,
      valor: round2(dailyTotals[data] || 0),
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
      totalGeral: round2(totalGeral),
      totalEntradas: round2(totalEntradas),
      totalSaidas: round2(totalSaidas),
    },
    grafico,
    bancos,
  };
};

const getWallets = (req, res) => {
  res.json(WALLETS);
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
      return res.status(401).json({ error: 'Login inválido na Properfy' });
    }

    const avisos = [];
    const results = await Promise.all(
      wallets.map(async (wallet) => {
        try {
          const data = await fetchCollect(token, wallet.id, range.start, range.end);
          return { wallet, data: data.data || [] };
        } catch (err) {
          avisos.push({ fkWallet: wallet.id, nome: wallet.nome, erro: err.message });
          return { wallet, data: [] };
        }
      })
    );

    const payload = aggregateCashFlow(results, range);
    if (avisos.length > 0) payload.avisos = avisos;

    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getCashFlow, getWallets };

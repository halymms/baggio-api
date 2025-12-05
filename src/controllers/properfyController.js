const getProperfyOpenFinancialStatementAllPages = async (req, res) => {
  try {
    const body = { ...req.body, page: 1 };
    const token = await getProperfyToken();
    if (!token) {
      return res.status(401).json({ error: 'Login inválido na Properfy' });
    }

    // Busca a primeira página para descobrir o total de páginas
    const firstResponse = await fetch('https://adm.baggioimoveis.com.br/api/property/financial-statement/open-fs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const firstResult = await firstResponse.json();
    const lastPage = firstResult.last_page || 1;

    // Monta todas as requisições em paralelo
    const requests = [];
    for (let page = 1; page <= lastPage; page++) {
      const pageBody = { ...req.body, page };
      requests.push(
        fetch('https://adm.baggioimoveis.com.br/api/property/financial-statement/open-fs', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(pageBody)
        }).then(res => res.json())
      );
    }

    const results = await Promise.all(requests);
    const allData = results.flatMap(r => r.data || []);
    res.json({ data: allData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const getProperfyOpenFinancialStatement = async (req, res) => {
  try {
    const body = req.body;
    const token = await getProperfyToken();
    if (!token) {
      return res.status(401).json({ error: 'Login inválido na Properfy' });
    }
    const response = await fetch('https://adm.baggioimoveis.com.br/api/property/financial-statement/open-fs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const getProperfyCollectTransaction = async (req, res) => {
  try {
    const { fkWallet, start, end } = req.query;
    const token = await getProperfyToken();
    if (!token) {
      return res.status(401).json({ error: 'Login inválido na Properfy' });
    }
    const url = `https://adm.baggioimoveis.com.br/api/billing/transaction/collect?fkWallet=${fkWallet}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const getProperfyToken = async () => {
  const response = await fetch('https://adm.baggioimoveis.com.br/api/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vrcEmail: PROPERFY_EMAIL,
      vrcPass: PROPERFY_PASS
    }),
  });
  const data = await response.json();
  return data.token;
};

const getProperfyRealTimeReport = async (req, res) => {
  try {
  const { section = null, companies, dteRange } = req.body;
    const token = await getProperfyToken();
    if (!token) {
      return res.status(401).json({ error: 'Login inválido na Properfy' });
    }
    const requestBody = { section, companies, dteRange };
    const response = await fetch('https://adm.baggioimoveis.com.br/api/billing/reports/real-time', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error('Erro ao fazer parse do JSON da Properfy:', e);
      return res.status(500).json({ error: 'Erro ao processar resposta da Properfy', raw: rawText });
    }
    // Se a resposta já for um array, use diretamente; se for objeto, use data.data
    let items = Array.isArray(data) ? data : (data.data || []);
    // Encontrar o índice do primeiro item cujo index começa com '1.2'
    const splitIdx = items.findIndex(item => item.index && item.index.startsWith('1.2'));
    let receitas = [], despesas = [];
    if (splitIdx === -1) {
      receitas = items;
      despesas = [];
    } else {
      receitas = items.slice(0, splitIdx);
      despesas = items.slice(splitIdx);
    }
  res.status(200).json({ receitas, despesas, original: items });
  } catch (error) {
    console.error('Erro na função getProperfyRealTimeReport:', error);
    res.status(500).json({
      error: error.message,
      stack: error.stack,
      details: error
    });
  }
};
const fetch = require('node-fetch');

const PROPERFY_EMAIL = process.env.PPFY_USER;
const PROPERFY_PASS = process.env.PPFY_PASS;

const properfyLogin = async (req, res) => {
  try {
    const response = await fetch('https://adm.baggioimoveis.com.br/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vrcEmail: PROPERFY_EMAIL,
        vrcPass: PROPERFY_PASS
      }),
    });
    const data = await response.json();
    if (!data.token) {
      return res.status(401).json({ error: 'Login inválido na Properfy' });
    }
    res.json({ token: data.token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { properfyLogin, getProperfyRealTimeReport, getProperfyCollectTransaction, getProperfyOpenFinancialStatement, getProperfyOpenFinancialStatementAllPages };

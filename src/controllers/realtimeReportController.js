const ItemData = require('../models/realtimeReportItemData');
const MonthlyClosingData = require('../models/monthlyClosingData');

// Buscar dados de um item para um mês/ano
exports.getItemData = async (req, res) => {
  try {
    const { mes, ano } = req.query;
    if (!mes || !ano) {
      return res.status(400).json({ error: 'mes e ano são obrigatórios' });
    }
    const data = await ItemData.findByItemId(req.params.item_id, parseInt(mes), parseInt(ano));
    res.json(data || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cadastrar/editar dados de um item para um mês/ano
exports.upsertItemData = async (req, res) => {
  try {
    const { mes, ano, planejado, observacao } = req.body;
    if (!mes || !ano) {
      return res.status(400).json({ error: 'mes e ano são obrigatórios' });
    }
    await ItemData.upsert(
      req.params.item_id,
      parseInt(mes),
      parseInt(ano),
      planejado,
      observacao
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Buscar dados de fechamento para um mês/ano
exports.getClosingData = async (req, res) => {
  try {
    const { mes, ano } = req.query;
    if (!mes || !ano) {
      return res.status(400).json({ error: 'mes e ano são obrigatórios' });
    }
    const data = await MonthlyClosingData.findByMonth(parseInt(mes), parseInt(ano));
    res.json(data || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cadastrar/editar dados de fechamento para um mês/ano
exports.upsertClosingData = async (req, res) => {
  try {
    const { mes, ano, sinais_negocio, comissoes_receber, comissoes_receber_prox_mes, observacao } = req.body;
    if (!mes || !ano) {
      return res.status(400).json({ error: 'mes e ano são obrigatórios' });
    }
    await MonthlyClosingData.upsert(
      parseInt(mes),
      parseInt(ano),
      { sinais_negocio, comissoes_receber, comissoes_receber_prox_mes, observacao }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

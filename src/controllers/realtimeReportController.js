const ItemData = require('../models/realtimeReportItemData');

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

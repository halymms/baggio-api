const ItemData = require('../models/realtimeReportItemData');
const MonthlyClosingData = require('../models/monthlyClosingData');
const ManagerCommissionData = require('../models/managerCommissionData');
const InnovationFundData = require('../models/innovationFundData');

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

function parseMesAno(mes, ano) {
  if (mes == null || mes === '' || ano == null || ano === '') {
    return null;
  }
  const mesNum = parseInt(mes, 10);
  const anoNum = parseInt(ano, 10);
  if (Number.isNaN(mesNum) || Number.isNaN(anoNum)) {
    return null;
  }
  return { mesNum, anoNum };
}

// Buscar comissão de gestor para um mês/ano/seção (1 locação, 2 vendas)
exports.getManagerCommission = async (req, res) => {
  try {
    const { mes, ano, section } = req.query;
    const parsed = parseMesAno(mes, ano);
    if (!parsed) {
      return res.status(400).json({ error: 'mes e ano são obrigatórios' });
    }
    const sectionNum = section != null ? parseInt(section) : 2;
    const data = await ManagerCommissionData.findByMonth(parsed.mesNum, parsed.anoNum, sectionNum);
    res.json(data || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cadastrar/editar comissão de gestor para um mês/ano/seção
exports.upsertManagerCommission = async (req, res) => {
  try {
    const { mes, ano, comissao_gestor, observacao, section } = req.body;
    const parsed = parseMesAno(mes, ano);
    if (!parsed) {
      return res.status(400).json({ error: 'mes e ano são obrigatórios' });
    }
    const sectionNum = section != null ? parseInt(section) : 2;
    await ManagerCommissionData.upsert(
      parsed.mesNum,
      parsed.anoNum,
      { comissao_gestor, observacao, section: sectionNum }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Buscar fundo de inovação para um mês/ano
exports.getInnovationFund = async (req, res) => {
  try {
    const { mes, ano } = req.query;
    if (!mes || !ano) {
      return res.status(400).json({ error: 'mes e ano são obrigatórios' });
    }
    const data = await InnovationFundData.findByMonth(parseInt(mes), parseInt(ano));
    res.json(data || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cadastrar/editar fundo de inovação para um mês/ano
exports.upsertInnovationFund = async (req, res) => {
  try {
    const { mes, ano, fundo_inovacao, observacao } = req.body;
    if (!mes || !ano) {
      return res.status(400).json({ error: 'mes e ano são obrigatórios' });
    }
    await InnovationFundData.upsert(
      parseInt(mes),
      parseInt(ano),
      { fundo_inovacao, observacao }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

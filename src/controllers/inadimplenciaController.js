const InadimplenciaData = require('../models/inadimplenciaData');
const InadimplenciaFechamento = require('../models/inadimplenciaFechamento');
const {
  syncInadimplencia,
  syncReferenciaAtual,
  capturePagoDia1,
  captureAbertoDia16,
  getWindowStart,
  enrichFechamentoRow,
  calcAcumulado12Meses,
  pickPagosFields,
  pickAbertosFields,
  fetchPaidItemsForReferencia,
  PAID_FS_STATUS,
  DELINQUENCY_FS_STATUS,
} = require('../services/syncInadimplencia');
const { formatReferenciaLabel } = require('../utils/parseDteReference');

function parseMesAno(mes, ano) {
  const parsedMes = Number(mes);
  const parsedAno = Number(ano);
  if (!Number.isInteger(parsedMes) || parsedMes < 1 || parsedMes > 12) return null;
  if (!Number.isInteger(parsedAno) || parsedAno < 1900) return null;
  return { mes: parsedMes, ano: parsedAno };
}

function currentMesAno() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);

  return {
    mes: Number(parts.find((part) => part.type === 'month').value),
    ano: Number(parts.find((part) => part.type === 'year').value),
  };
}

exports.getReferencias = async (_req, res) => {
  try {
    const windowStart = getWindowStart();
    const fechamentos = await InadimplenciaFechamento.findAll(
      windowStart.mes,
      windowStart.ano
    );

    if (fechamentos.length) {
      return res.json(
        fechamentos.map((row) => ({
          mes: row.mes_referencia,
          ano: row.ano_referencia,
          label: row.dte_reference || formatReferenciaLabel(row.mes_referencia, row.ano_referencia),
          synced_at: row.synced_at,
        }))
      );
    }

    const rows = await InadimplenciaData.findReferencias(windowStart.mes, windowStart.ano);
    res.json(
      rows.map((row) => ({
        mes: row.mes,
        ano: row.ano,
        label: row.label || formatReferenciaLabel(row.mes, row.ano),
        total: row.total,
        synced_at: row.synced_at,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getFechamentos = async (_req, res) => {
  try {
    const windowStart = getWindowStart();
    const rows = await InadimplenciaFechamento.findAll(windowStart.mes, windowStart.ano);
    const data = rows.map(enrichFechamentoRow);
    const acumulado_12_meses = calcAcumulado12Meses(rows);

    res.json({
      data,
      acumulado_12_meses,
      window: {
        from: windowStart,
        to: currentMesAno(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/** Totais e (opcionalmente) itens de PAID + PARTIALLY_PAID. */
exports.getPagos = async (req, res) => {
  try {
    const windowStart = getWindowStart();
    const includeItems =
      req.query.include_items === '1' ||
      req.query.include_items === 'true' ||
      req.query.detalhe === '1' ||
      req.query.detalhe === 'true';

    if (req.query.mes || req.query.ano) {
      const parsed = parseMesAno(req.query.mes, req.query.ano);
      if (!parsed) {
        return res.status(400).json({ error: 'mes (1-12) e ano são obrigatórios' });
      }

      const fechamento = await InadimplenciaFechamento.findByReferencia(parsed.mes, parsed.ano);
      const pagos = pickPagosFields(fechamento) || {
        mes_referencia: parsed.mes,
        ano_referencia: parsed.ano,
        dte_reference: formatReferenciaLabel(parsed.mes, parsed.ano),
        valor_pago_dia_1: null,
        valor_pago_atual: null,
        pago_dia_1_captured_at: null,
        synced_at: null,
        chrFsStatus: PAID_FS_STATUS,
      };

      let items = null;
      if (includeItems) {
        items = await fetchPaidItemsForReferencia(parsed.mes, parsed.ano);
      }

      return res.json({
        mes: parsed.mes,
        ano: parsed.ano,
        label: formatReferenciaLabel(parsed.mes, parsed.ano),
        filtro: { chrFsStatus: PAID_FS_STATUS },
        ...pagos,
        total: items ? items.total : pagos.valor_pago_atual,
        count: items ? items.count : null,
        data: items ? items.data : undefined,
      });
    }

    const rows = await InadimplenciaFechamento.findAll(windowStart.mes, windowStart.ano);
    res.json({
      filtro: { chrFsStatus: PAID_FS_STATUS },
      data: rows.map(pickPagosFields).filter(Boolean),
      window: {
        from: windowStart,
        to: currentMesAno(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/** Totais e detalhe em aberto (status de delinquency). */
exports.getAbertos = async (req, res) => {
  try {
    const windowStart = getWindowStart();
    const includeItems =
      req.query.include_items === '1' ||
      req.query.include_items === 'true' ||
      req.query.detalhe === '1' ||
      req.query.detalhe === 'true' ||
      Boolean(req.query.mes && req.query.ano);

    if (req.query.mes || req.query.ano) {
      const parsed = parseMesAno(req.query.mes, req.query.ano);
      if (!parsed) {
        return res.status(400).json({ error: 'mes (1-12) e ano são obrigatórios' });
      }

      const [fechamento, detail] = await Promise.all([
        InadimplenciaFechamento.findByReferencia(parsed.mes, parsed.ano),
        includeItems
          ? InadimplenciaData.findByReferencia(parsed.mes, parsed.ano)
          : Promise.resolve([]),
      ]);

      const abertos = pickAbertosFields(fechamento) || {
        mes_referencia: parsed.mes,
        ano_referencia: parsed.ano,
        dte_reference: formatReferenciaLabel(parsed.mes, parsed.ano),
        valor_aberto_dia_16: null,
        valor_aberto_atual: null,
        valor_aberto_atualizado: null,
        aberto_dia_16_captured_at: null,
        aberto_atualizado_at: null,
        synced_at: null,
        inadimplencia_fechamento_pct: null,
        inadimplencia_atual_pct: null,
        inadimplencia_acumulada_atualizada_pct: null,
        chrFsStatus: DELINQUENCY_FS_STATUS,
      };

      const syncedAt = detail.reduce((latest, row) => {
        if (!row.synced_at) return latest;
        if (!latest || new Date(row.synced_at) > new Date(latest)) return row.synced_at;
        return latest;
      }, abertos.synced_at);

      return res.json({
        mes: parsed.mes,
        ano: parsed.ano,
        label: formatReferenciaLabel(parsed.mes, parsed.ano),
        filtro: { chrFsStatus: DELINQUENCY_FS_STATUS },
        ...abertos,
        synced_at: syncedAt,
        count: includeItems ? detail.length : null,
        data: includeItems ? detail : undefined,
      });
    }

    const rows = await InadimplenciaFechamento.findAll(windowStart.mes, windowStart.ano);
    res.json({
      filtro: { chrFsStatus: DELINQUENCY_FS_STATUS },
      data: rows.map(pickAbertosFields).filter(Boolean),
      window: {
        from: windowStart,
        to: currentMesAno(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getInadimplencia = async (req, res) => {
  try {
    const fallback = currentMesAno();
    const parsed = req.query.mes && req.query.ano
      ? parseMesAno(req.query.mes, req.query.ano)
      : fallback;

    if (!parsed) {
      return res.status(400).json({ error: 'mes (1-12) e ano são obrigatórios' });
    }

    const [data, fechamento] = await Promise.all([
      InadimplenciaData.findByReferencia(parsed.mes, parsed.ano),
      InadimplenciaFechamento.findByReferencia(parsed.mes, parsed.ano),
    ]);

    const syncedAt = data.reduce((latest, row) => {
      if (!row.synced_at) return latest;
      if (!latest || new Date(row.synced_at) > new Date(latest)) return row.synced_at;
      return latest;
    }, fechamento?.synced_at || null);

    res.json({
      mes: parsed.mes,
      ano: parsed.ano,
      label: formatReferenciaLabel(parsed.mes, parsed.ano),
      synced_at: syncedAt,
      fechamento: enrichFechamentoRow(fechamento),
      data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.patchAbertoAtualizado = async (req, res) => {
  try {
    const parsed = parseMesAno(req.body?.mes, req.body?.ano);
    if (!parsed) {
      return res.status(400).json({ error: 'mes (1-12) e ano são obrigatórios' });
    }

    const valor = Number(req.body?.valor_aberto_atualizado);
    if (!Number.isFinite(valor) || valor < 0) {
      return res.status(400).json({ error: 'valor_aberto_atualizado deve ser um número >= 0' });
    }

    const row = await InadimplenciaFechamento.updateAbertoAtualizado(
      parsed.mes,
      parsed.ano,
      Math.round(valor * 100) / 100
    );

    res.json({
      mes: parsed.mes,
      ano: parsed.ano,
      label: formatReferenciaLabel(parsed.mes, parsed.ano),
      fechamento: enrichFechamentoRow(row),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.syncInadimplenciaHandler = async (_req, res) => {
  try {
    const result = await syncInadimplencia();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.syncReferenciaHandler = async (req, res) => {
  try {
    const parsed = parseMesAno(req.body?.mes ?? req.query?.mes, req.body?.ano ?? req.query?.ano);
    if (!parsed) {
      return res.status(400).json({ error: 'mes (1-12) e ano são obrigatórios' });
    }

    const result = await syncReferenciaAtual(parsed.mes, parsed.ano);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.capturePagoDia1Handler = async (_req, res) => {
  try {
    const result = await capturePagoDia1();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.captureAbertoDia16Handler = async (_req, res) => {
  try {
    const result = await captureAbertoDia16();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

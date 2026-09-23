const db = require('../config/db');
const { formatReferenciaLabel } = require('../utils/parseDteReference');

exports.findAll = async (startMes, startAno) => {
  const result = await db.query(
    `SELECT *
     FROM inadimplencia_fechamento
     WHERE (ano_referencia * 12 + mes_referencia) >= ($2 * 12 + $1)
     ORDER BY ano_referencia DESC, mes_referencia DESC`,
    [startMes, startAno]
  );
  return result.rows;
};

exports.findByReferencia = async (mes, ano) => {
  const result = await db.query(
    `SELECT *
     FROM inadimplencia_fechamento
     WHERE mes_referencia = $1 AND ano_referencia = $2`,
    [mes, ano]
  );
  return result.rows[0] || null;
};

exports.upsertCurrentTotals = async ({
  mes,
  ano,
  label,
  valorPagoAtual,
  valorAbertoAtual,
}) => {
  const result = await db.query(
    `INSERT INTO inadimplencia_fechamento (
        mes_referencia, ano_referencia, dte_reference,
        valor_pago_atual, valor_aberto_atual, synced_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (mes_referencia, ano_referencia) DO UPDATE SET
        dte_reference = EXCLUDED.dte_reference,
        valor_pago_atual = EXCLUDED.valor_pago_atual,
        valor_aberto_atual = EXCLUDED.valor_aberto_atual,
        synced_at = NOW(),
        updated_at = NOW()
     RETURNING *`,
    [mes, ano, label, valorPagoAtual, valorAbertoAtual]
  );
  return result.rows[0];
};

exports.freezePagoDia1 = async ({ mes, ano, label, valor }) => {
  const result = await db.query(
    `INSERT INTO inadimplencia_fechamento (
        mes_referencia, ano_referencia, dte_reference,
        valor_pago_dia_1, pago_dia_1_captured_at, synced_at, updated_at
     )
     VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
     ON CONFLICT (mes_referencia, ano_referencia) DO UPDATE SET
        dte_reference = EXCLUDED.dte_reference,
        valor_pago_dia_1 = COALESCE(inadimplencia_fechamento.valor_pago_dia_1, EXCLUDED.valor_pago_dia_1),
        pago_dia_1_captured_at = COALESCE(
          inadimplencia_fechamento.pago_dia_1_captured_at,
          EXCLUDED.pago_dia_1_captured_at
        ),
        updated_at = NOW()
     RETURNING *`,
    [mes, ano, label, valor]
  );
  return result.rows[0];
};

exports.freezeAbertoDia16 = async ({ mes, ano, label, valor }) => {
  const result = await db.query(
    `INSERT INTO inadimplencia_fechamento (
        mes_referencia, ano_referencia, dte_reference,
        valor_aberto_dia_16, aberto_dia_16_captured_at, synced_at, updated_at
     )
     VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
     ON CONFLICT (mes_referencia, ano_referencia) DO UPDATE SET
        dte_reference = EXCLUDED.dte_reference,
        valor_aberto_dia_16 = COALESCE(inadimplencia_fechamento.valor_aberto_dia_16, EXCLUDED.valor_aberto_dia_16),
        aberto_dia_16_captured_at = COALESCE(
          inadimplencia_fechamento.aberto_dia_16_captured_at,
          EXCLUDED.aberto_dia_16_captured_at
        ),
        updated_at = NOW()
     RETURNING *`,
    [mes, ano, label, valor]
  );
  return result.rows[0];
};

exports.updateAbertoAtualizado = async (mes, ano, valor) => {
  const label = formatReferenciaLabel(mes, ano);
  const result = await db.query(
    `INSERT INTO inadimplencia_fechamento (
        mes_referencia, ano_referencia, dte_reference,
        valor_aberto_atualizado, aberto_atualizado_at, synced_at, updated_at
     )
     VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
     ON CONFLICT (mes_referencia, ano_referencia) DO UPDATE SET
        dte_reference = COALESCE(NULLIF(inadimplencia_fechamento.dte_reference, ''), EXCLUDED.dte_reference),
        valor_aberto_atualizado = EXCLUDED.valor_aberto_atualizado,
        aberto_atualizado_at = NOW(),
        updated_at = NOW()
     RETURNING *`,
    [mes, ano, label, valor]
  );
  return result.rows[0];
};

exports.deleteOutsideWindow = async (startMes, startAno) => {
  const result = await db.query(
    `DELETE FROM inadimplencia_fechamento
     WHERE (ano_referencia * 12 + mes_referencia) < ($2 * 12 + $1)`,
    [startMes, startAno]
  );
  return result.rowCount || 0;
};

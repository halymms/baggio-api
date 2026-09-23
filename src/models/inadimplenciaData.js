const db = require('../config/db');

const UPSERT_COLUMNS = [
  'fs_id',
  'mes_referencia',
  'ano_referencia',
  'dte_reference',
  'dte_due',
  'chr_status',
  'status_fs',
  'dcm_amount',
  'fk_contract',
  'status',
  'status_fin',
  'chr_identifier',
  'renter_name',
  'renter_email',
  'renter_phone',
  'chr_bank',
  'bank_slip',
  'raw_payload',
];

exports.findByReferencia = async (mes, ano) => {
  const result = await db.query(
    `SELECT *
     FROM inadimplencia_data
     WHERE mes_referencia = $1 AND ano_referencia = $2
     ORDER BY dte_due ASC NULLS LAST, renter_name ASC`,
    [mes, ano]
  );
  return result.rows;
};

exports.findReferencias = async (startMes, startAno) => {
  const result = await db.query(
    `SELECT
        mes_referencia AS mes,
        ano_referencia AS ano,
        MIN(dte_reference) AS label,
        COUNT(*)::int AS total,
        MAX(synced_at) AS synced_at
     FROM inadimplencia_data
     WHERE (ano_referencia * 12 + mes_referencia) >= ($2 * 12 + $1)
     GROUP BY mes_referencia, ano_referencia
     ORDER BY ano_referencia DESC, mes_referencia DESC`,
    [startMes, startAno]
  );
  return result.rows;
};

exports.deleteOutsideWindow = async (startMes, startAno) => {
  const result = await db.query(
    `DELETE FROM inadimplencia_data
     WHERE (ano_referencia * 12 + mes_referencia) < ($2 * 12 + $1)`,
    [startMes, startAno]
  );
  return result.rowCount || 0;
};

exports.deleteByReferencia = async (mes, ano) => {
  const result = await db.query(
    `DELETE FROM inadimplencia_data
     WHERE mes_referencia = $1 AND ano_referencia = $2`,
    [mes, ano]
  );
  return result.rowCount || 0;
};

exports.deleteByReferencias = async (referencias) => {
  if (!referencias.length) return 0;

  const values = [];
  const params = [];
  let paramIndex = 1;

  for (const ref of referencias) {
    values.push(`(mes_referencia = $${paramIndex++} AND ano_referencia = $${paramIndex++})`);
    params.push(ref.mes, ref.ano);
  }

  const result = await db.query(
    `DELETE FROM inadimplencia_data WHERE ${values.join(' OR ')}`,
    params
  );
  return result.rowCount || 0;
};

exports.upsertBatch = async (rows) => {
  if (!rows.length) return 0;

  const chunkSize = 50;
  let upserted = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const values = [];
    const params = [];
    let paramIndex = 1;

    for (const row of chunk) {
      const placeholders = UPSERT_COLUMNS.map(() => `$${paramIndex++}`);
      values.push(`(${placeholders.join(', ')}, NOW(), NOW())`);
      params.push(
        row.fs_id,
        row.mes_referencia,
        row.ano_referencia,
        row.dte_reference,
        row.dte_due,
        row.chr_status,
        row.status_fs,
        row.dcm_amount,
        row.fk_contract,
        row.status,
        row.status_fin,
        row.chr_identifier,
        row.renter_name,
        row.renter_email,
        row.renter_phone,
        row.chr_bank,
        row.bank_slip,
        row.raw_payload
      );
    }

    await db.query(
      `INSERT INTO inadimplencia_data (
          fs_id, mes_referencia, ano_referencia, dte_reference, dte_due,
          chr_status, status_fs, dcm_amount, fk_contract, status, status_fin,
          chr_identifier, renter_name, renter_email, renter_phone, chr_bank,
          bank_slip, raw_payload, synced_at, updated_at
       )
       VALUES ${values.join(', ')}
       ON CONFLICT (fs_id) DO UPDATE SET
          mes_referencia = EXCLUDED.mes_referencia,
          ano_referencia = EXCLUDED.ano_referencia,
          dte_reference = EXCLUDED.dte_reference,
          dte_due = EXCLUDED.dte_due,
          chr_status = EXCLUDED.chr_status,
          status_fs = EXCLUDED.status_fs,
          dcm_amount = EXCLUDED.dcm_amount,
          fk_contract = EXCLUDED.fk_contract,
          status = EXCLUDED.status,
          status_fin = EXCLUDED.status_fin,
          chr_identifier = EXCLUDED.chr_identifier,
          renter_name = EXCLUDED.renter_name,
          renter_email = EXCLUDED.renter_email,
          renter_phone = EXCLUDED.renter_phone,
          chr_bank = EXCLUDED.chr_bank,
          bank_slip = EXCLUDED.bank_slip,
          raw_payload = EXCLUDED.raw_payload,
          synced_at = NOW(),
          updated_at = NOW()`,
      params
    );

    upserted += chunk.length;
  }

  return upserted;
};

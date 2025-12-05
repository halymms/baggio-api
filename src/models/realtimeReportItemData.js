const db = require('../config/db');

exports.findByItemId = async (item_id, mes, ano) => {
  const result = await db.query(
    'SELECT * FROM realtime_report_item_data WHERE properfy_item_id = $1 AND mes = $2 AND ano = $3',
    [item_id, mes, ano]
  );
  return result.rows[0] || null;
};

exports.upsert = async (item_id, mes, ano, planejado, observacao) => {
  await db.query(
    `INSERT INTO realtime_report_item_data (properfy_item_id, mes, ano, planejado, observacao, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (properfy_item_id, mes, ano) DO UPDATE SET planejado = $4, observacao = $5, updated_at = NOW()`,
    [item_id, mes, ano, planejado, observacao]
  );
};

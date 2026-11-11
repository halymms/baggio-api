const db = require('../config/db');

const DEFAULT_SECTION = 2;

exports.findByMonth = async (mes, ano, section = DEFAULT_SECTION) => {
    const result = await db.query(
        'SELECT * FROM innovation_fund_data WHERE mes = $1 AND ano = $2 AND section = $3',
        [mes, ano, section]
    );
    return result.rows[0] || null;
};

exports.upsert = async (mes, ano, data) => {
    const { fundo_inovacao, observacao, section = DEFAULT_SECTION } = data;

    await db.query(
        `INSERT INTO innovation_fund_data (mes, ano, section, fundo_inovacao, observacao, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (mes, ano, section)
     DO UPDATE SET
        fundo_inovacao = EXCLUDED.fundo_inovacao,
        observacao = EXCLUDED.observacao,
        updated_at = NOW()`,
        [mes, ano, section, fundo_inovacao, observacao]
    );
};

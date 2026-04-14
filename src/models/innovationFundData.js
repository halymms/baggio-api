const db = require('../config/db');

exports.findByMonth = async (mes, ano) => {
    const result = await db.query(
        'SELECT * FROM innovation_fund_data WHERE mes = $1 AND ano = $2',
        [mes, ano]
    );
    return result.rows[0] || null;
};

exports.upsert = async (mes, ano, data) => {
    const { fundo_inovacao, observacao } = data;

    await db.query(
        `INSERT INTO innovation_fund_data (mes, ano, fundo_inovacao, observacao, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (mes, ano) 
     DO UPDATE SET 
        fundo_inovacao = EXCLUDED.fundo_inovacao,
        observacao = EXCLUDED.observacao,
        updated_at = NOW()`,
        [mes, ano, fundo_inovacao, observacao]
    );
};

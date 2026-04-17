const db = require('../config/db');

exports.findByMonth = async (mes, ano) => {
    const result = await db.query(
        'SELECT * FROM manager_commission_data WHERE mes = $1 AND ano = $2',
        [mes, ano]
    );
    return result.rows[0] || null;
};

exports.upsert = async (mes, ano, data) => {
    const { comissao_gestor, observacao } = data;

    await db.query(
        `INSERT INTO manager_commission_data (mes, ano, comissao_gestor, observacao, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (mes, ano) 
     DO UPDATE SET 
        comissao_gestor = EXCLUDED.comissao_gestor,
        observacao = EXCLUDED.observacao,
        updated_at = NOW()`,
        [mes, ano, comissao_gestor, observacao]
    );
};

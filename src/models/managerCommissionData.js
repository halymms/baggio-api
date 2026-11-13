const db = require('../config/db');

const DEFAULT_SECTION = 2;

exports.findByMonth = async (mes, ano, section = DEFAULT_SECTION) => {
    const result = await db.query(
        'SELECT * FROM manager_commission_data WHERE mes = $1 AND ano = $2 AND section = $3',
        [mes, ano, section]
    );
    return result.rows[0] || null;
};

exports.upsert = async (mes, ano, data) => {
    const { comissao_gestor, observacao, section = DEFAULT_SECTION } = data;

    await db.query(
        `INSERT INTO manager_commission_data (mes, ano, section, comissao_gestor, observacao, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (mes, ano, section) 
     DO UPDATE SET 
        comissao_gestor = EXCLUDED.comissao_gestor,
        observacao = EXCLUDED.observacao,
        updated_at = NOW()`,
        [mes, ano, section, comissao_gestor, observacao]
    );
};

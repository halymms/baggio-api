const db = require('../config/db');

exports.findByMonth = async (mes, ano) => {
    const result = await db.query(
        'SELECT * FROM monthly_closing_data WHERE mes = $1 AND ano = $2',
        [mes, ano]
    );
    return result.rows[0] || null;
};

exports.upsert = async (mes, ano, data) => {
    const { sinais_negocio, comissoes_receber, comissoes_receber_prox_mes, observacao } = data;

    await db.query(
        `INSERT INTO monthly_closing_data (mes, ano, sinais_negocio, comissoes_receber, comissoes_receber_prox_mes, observacao, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (mes, ano) 
     DO UPDATE SET 
        sinais_negocio = EXCLUDED.sinais_negocio, 
        comissoes_receber = EXCLUDED.comissoes_receber, 
        comissoes_receber_prox_mes = EXCLUDED.comissoes_receber_prox_mes,
        observacao = EXCLUDED.observacao,
        updated_at = NOW()`,
        [mes, ano, sinais_negocio, comissoes_receber, comissoes_receber_prox_mes, observacao]
    );
};

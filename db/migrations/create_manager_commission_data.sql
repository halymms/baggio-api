CREATE TABLE IF NOT EXISTS manager_commission_data (
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    comissao_gestor NUMERIC,
    observacao TEXT,
    updated_at TIMESTAMP,
    PRIMARY KEY (mes, ano)
);

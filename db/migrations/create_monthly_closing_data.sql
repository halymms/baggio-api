CREATE TABLE IF NOT EXISTS monthly_closing_data (
    id SERIAL PRIMARY KEY,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    sinais_negocio DECIMAL(15, 2) DEFAULT 0,
    comissoes_receber DECIMAL(15, 2) DEFAULT 0,
    comissoes_receber_prox_mes DECIMAL(15, 2) DEFAULT 0,
    observacao TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(mes, ano)
);

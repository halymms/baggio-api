CREATE TABLE IF NOT EXISTS innovation_fund_data (
    id SERIAL PRIMARY KEY,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    fundo_inovacao DECIMAL(15, 2) DEFAULT 0,
    observacao TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(mes, ano)
);

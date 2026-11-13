CREATE TABLE IF NOT EXISTS inadimplencia_fechamento (
    id SERIAL PRIMARY KEY,
    mes_referencia INTEGER NOT NULL,
    ano_referencia INTEGER NOT NULL,
    dte_reference TEXT NOT NULL,
    valor_pago_dia_1 DECIMAL(15, 2),
    valor_aberto_dia_16 DECIMAL(15, 2),
    valor_aberto_atualizado DECIMAL(15, 2),
    valor_pago_atual DECIMAL(15, 2),
    valor_aberto_atual DECIMAL(15, 2),
    pago_dia_1_captured_at TIMESTAMP,
    aberto_dia_16_captured_at TIMESTAMP,
    aberto_atualizado_at TIMESTAMP,
    synced_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (mes_referencia, ano_referencia)
);

CREATE INDEX IF NOT EXISTS idx_inadimplencia_fechamento_ref
    ON inadimplencia_fechamento (ano_referencia DESC, mes_referencia DESC);

CREATE TABLE IF NOT EXISTS inadimplencia_data (
    id SERIAL PRIMARY KEY,
    fs_id INTEGER NOT NULL UNIQUE,
    mes_referencia INTEGER NOT NULL,
    ano_referencia INTEGER NOT NULL,
    dte_reference TEXT NOT NULL,
    dte_due DATE,
    chr_status VARCHAR(100),
    status_fs TEXT,
    dcm_amount DECIMAL(15, 2),
    fk_contract INTEGER,
    status TEXT,
    status_fin TEXT,
    chr_identifier VARCHAR(50),
    renter_name VARCHAR(255),
    renter_email VARCHAR(255),
    renter_phone VARCHAR(50),
    chr_bank TEXT,
    bank_slip TEXT,
    raw_payload JSONB,
    synced_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inadimplencia_ref
    ON inadimplencia_data (ano_referencia DESC, mes_referencia DESC);

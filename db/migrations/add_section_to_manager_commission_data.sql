ALTER TABLE manager_commission_data
    ADD COLUMN IF NOT EXISTS section INTEGER NOT NULL DEFAULT 2;

ALTER TABLE manager_commission_data
    DROP CONSTRAINT IF EXISTS manager_commission_data_pkey;

ALTER TABLE manager_commission_data
    ADD PRIMARY KEY (mes, ano, section);

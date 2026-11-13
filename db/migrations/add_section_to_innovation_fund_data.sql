ALTER TABLE innovation_fund_data
    ADD COLUMN IF NOT EXISTS section INTEGER NOT NULL DEFAULT 2;

ALTER TABLE innovation_fund_data
    DROP CONSTRAINT IF EXISTS innovation_fund_data_mes_ano_key;

ALTER TABLE innovation_fund_data
    DROP CONSTRAINT IF EXISTS innovation_fund_data_mes_ano_section_key;

ALTER TABLE innovation_fund_data
    ADD CONSTRAINT innovation_fund_data_mes_ano_section_key UNIQUE (mes, ano, section);

-- Adiciona as colunas mes e ano
ALTER TABLE realtime_report_item_data ADD COLUMN mes INTEGER;
ALTER TABLE realtime_report_item_data ADD COLUMN ano INTEGER;

-- Remove a constraint UNIQUE antiga, se existir
ALTER TABLE realtime_report_item_data DROP CONSTRAINT IF EXISTS realtime_report_item_data_properfy_item_id_key;

-- Cria nova constraint UNIQUE para properfy_item_id, mes, ano
ALTER TABLE realtime_report_item_data ADD CONSTRAINT unique_item_mes_ano UNIQUE (properfy_item_id, mes, ano);
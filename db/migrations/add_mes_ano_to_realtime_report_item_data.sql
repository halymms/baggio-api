-- Adiciona mes/ano se a tabela foi criada sem essas colunas (legado).
-- Em installs novas, create_realtime_report_item_data.sql já inclui mes/ano.
ALTER TABLE realtime_report_item_data ADD COLUMN IF NOT EXISTS mes INTEGER;
ALTER TABLE realtime_report_item_data ADD COLUMN IF NOT EXISTS ano INTEGER;

ALTER TABLE realtime_report_item_data DROP CONSTRAINT IF EXISTS realtime_report_item_data_properfy_item_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_item_mes_ano'
  ) THEN
    ALTER TABLE realtime_report_item_data
      ADD CONSTRAINT unique_item_mes_ano UNIQUE (properfy_item_id, mes, ano);
  END IF;
END $$;

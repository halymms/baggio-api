CREATE TABLE IF NOT EXISTS realtime_report_item_data (
  id SERIAL PRIMARY KEY,
  properfy_item_id VARCHAR(255) NOT NULL,
  mes INTEGER,
  ano INTEGER,
  planejado DECIMAL(15, 2) DEFAULT 0,
  observacao TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_item_mes_ano UNIQUE (properfy_item_id, mes, ano)
);

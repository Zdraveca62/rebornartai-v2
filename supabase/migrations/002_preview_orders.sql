CREATE TABLE preview_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending | paid | processing | delivered | failed
  photos JSONB DEFAULT '[]'::jsonb,
    -- до 3 URL-а: ["https://...", "https://...", "https://..."]
  photo_count INTEGER GENERATED ALWAYS AS (
    jsonb_array_length(photos)
  ) STORED,
  result_sent_at TIMESTAMPTZ,
  result_email TEXT,                     -- на кой имейл е изпратено
  gross_amount NUMERIC(10,2) DEFAULT 2.80,
  vat_rate NUMERIC(5,4) DEFAULT 0.2300, -- 23% Ирландия
  vat_amount NUMERIC(10,2) GENERATED ALWAYS AS (
    ROUND(gross_amount * vat_rate / (1 + vat_rate), 2)
  ) STORED,
  net_amount NUMERIC(10,2) GENERATED ALWAYS AS (
    ROUND(gross_amount / (1 + vat_rate), 2)
  ) STORED,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraint: максимум 3 снимки
ALTER TABLE preview_orders
  ADD CONSTRAINT max_3_photos
  CHECK (jsonb_array_length(photos) <= 3);

-- RLS
ALTER TABLE preview_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Потребителят вижда своите preview поръчки"
  ON preview_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Потребителят създава своя preview поръчка"
  ON preview_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Админът вижда всички preview поръчки"
  ON preview_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND access_level = 4
    )
  );
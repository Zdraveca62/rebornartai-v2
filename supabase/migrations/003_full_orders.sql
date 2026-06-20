CREATE TABLE full_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
    -- pending | paid | processing | delivered | failed
  payment_method TEXT,
    -- stripe | paypal | revolut | apple_pay | google_pay
  payment_date DATE,                     -- датата на трансфера
  gross_amount NUMERIC(10,2) NOT NULL,
  vat_rate NUMERIC(5,4) DEFAULT 0.2300,
  vat_amount NUMERIC(10,2) GENERATED ALWAYS AS (
    ROUND(gross_amount * vat_rate / (1 + vat_rate), 2)
  ) STORED,
  net_amount NUMERIC(10,2) GENERATED ALWAYS AS (
    ROUND(gross_amount / (1 + vat_rate), 2)
  ) STORED,
  -- Данни на клиента към момента на поръчката (snapshot)
  client_full_name TEXT NOT NULL,
  client_address TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE full_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Потребителят вижда своите пълни поръчки"
  ON full_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Потребителят създава своя пълна поръчка"
  ON full_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Админът вижда всички пълни поръчки"
  ON full_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND access_level = 4
    )
  );
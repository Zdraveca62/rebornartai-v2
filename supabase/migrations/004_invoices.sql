CREATE SEQUENCE invoice_seq START 1;

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES full_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- RAI-2025-001
  invoice_number TEXT UNIQUE NOT NULL,

  -- IPG-RAI-2025-001.pdf
  filename TEXT UNIQUE NOT NULL,

  -- Supabase Storage path
  pdf_url TEXT,
  pdf_path TEXT,                         -- за архива на Admin

  -- Статус
  sent_at TIMESTAMPTZ,                   -- кога е изпратена по email
  confirmed_at TIMESTAMPTZ,             -- кога клиентът е въвел номера
  is_confirmed BOOLEAN DEFAULT FALSE,

  -- Snapshot на сумите
  gross_amount NUMERIC(10,2) NOT NULL,
  vat_amount NUMERIC(10,2) NOT NULL,
  net_amount NUMERIC(10,2) NOT NULL,
  vat_rate NUMERIC(5,4) DEFAULT 0.2300,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-генериране на invoice_number и filename
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  seq_num INTEGER;
  inv_number TEXT;
  client_initials TEXT;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');

  -- Reset sequence всяка година
  SELECT COALESCE(MAX(
    CAST(
      SPLIT_PART(invoice_number, '-', 3) AS INTEGER
    )
  ), 0) + 1
  INTO seq_num
  FROM invoices
  WHERE invoice_number LIKE 'RAI-' || year_str || '-%';

  inv_number := 'RAI-' || year_str || '-' || LPAD(seq_num::TEXT, 3, '0');

  -- Вземи инициалите на клиента
  SELECT initials INTO client_initials
  FROM profiles WHERE id = NEW.user_id;

  NEW.invoice_number := inv_number;
  NEW.filename := client_initials || '-' || inv_number || '.pdf';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Потребителят вижда само своите фактури"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Потребителят потвърждава своя фактура"
  ON invoices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Админът вижда всички фактури"
  ON invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND access_level = 4
    )
  );
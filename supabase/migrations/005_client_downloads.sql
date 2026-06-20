CREATE TABLE client_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES full_orders(id) ON DELETE CASCADE,

  gcs_path TEXT NOT NULL,
  file_url TEXT NOT NULL,

  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,               -- ← вече НЕ е generated

  request_count INTEGER DEFAULT 1,
  last_requested_at TIMESTAMPTZ DEFAULT NOW(),
  is_expired BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT max_3_requests CHECK (request_count <= 3)
);

-- Trigger: auto-попълва expires_at = uploaded_at + 24h
CREATE OR REPLACE FUNCTION set_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at := NEW.uploaded_at + INTERVAL '24 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_expires_at
  BEFORE INSERT ON client_downloads
  FOR EACH ROW EXECUTE FUNCTION set_expires_at();

-- Cron функция: маркира изтеклите линкове
CREATE OR REPLACE FUNCTION expire_old_downloads()
RETURNS void AS $$
BEGIN
  UPDATE client_downloads
  SET is_expired = TRUE
  WHERE expires_at < NOW()
    AND is_expired = FALSE;
END;
$$ LANGUAGE plpgsql;

-- RLS
ALTER TABLE client_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Потребителят вижда своите downloads"
  ON client_downloads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Админът вижда всички downloads"
  ON client_downloads FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND access_level = 4
    )
  );
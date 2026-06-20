CREATE TABLE site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  country TEXT,
  city TEXT,
  is_new_visitor BOOLEAN DEFAULT FALSE,
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT                        -- за дедупликация
);

-- Index за бързи заявки по дата
CREATE INDEX idx_site_visits_date
  ON site_visits (visited_at DESC);

CREATE INDEX idx_site_visits_ip
  ON site_visits (ip_address);

-- RLS — само Admin чете
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Само Admin вижда статистиките"
  ON site_visits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND access_level = 4
    )
  );

-- Service role може да вмъква (от API route)
CREATE POLICY "Service role вмъква посещения"
  ON site_visits FOR INSERT
  WITH CHECK (TRUE);
-- ============================================================
-- RebornArtAI — локална PostgreSQL схема
-- Миграция от Supabase (auth.users + RLS) → собствена auth (bcrypt + JWT)
-- Генерирано: 2026-06-20
-- ============================================================
--
-- Промени спрямо оригиналните Supabase migrations:
--   1. auth.users премахнат изцяло. profiles вече е самостоятелна
--      таблица и съдържа и login данните (email, password_hash,
--      email_confirmed) — обединена users+profiles таблица.
--   2. Всички ROW LEVEL SECURITY policies премахнати.
--      Авторизационната логика (кой вижда какво) се пренася
--      в Node.js/Express middleware на ниво API route.
--   3. Всички REFERENCES profiles(id) са запазени непроменени,
--      защото profiles.id вече Е основният user id (няма повече
--      отделен auth.users.id, към който да сочи).
--   4. Всички тригери, generated columns и constraints са запазени
--      1:1 от оригиналните файлове.
--
-- Ред на изпълнение: важен е заради FK зависимостите.
--   profiles → preview_orders → full_orders → invoices →
--   client_downloads → site_visits → admin views
-- ============================================================

-- Разширение за gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 1. PROFILES (заменя auth.users + profiles от Supabase)
-- ============================================================

CREATE TABLE profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Auth данни (по-рано в auth.users)
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,              -- bcrypt hash
  email_confirmed BOOLEAN NOT NULL DEFAULT FALSE,

  -- Профилни данни (оригинално в profiles)
  full_name       TEXT,                       -- "Ivan Petrov Georgiev"
  initials        TEXT,                       -- "IPG" — auto-generated
  phone           TEXT,
  address         TEXT,

  -- Нива на достъп:
  --   1 = обикновен регистриран потребител (по подразбиране)
  --   2 = потвърден/платил preview поръчка
  --   3 = платил пълна поръчка
  --   4 = admin (пълен достъп до всички данни)
  access_level    INTEGER NOT NULL DEFAULT 1,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate initials от full_name
CREATE OR REPLACE FUNCTION generate_initials(full_name TEXT)
RETURNS TEXT AS $$
DECLARE
  words TEXT[];
  initials TEXT := '';
  word TEXT;
BEGIN
  words := string_to_array(trim(full_name), ' ');
  FOREACH word IN ARRAY words LOOP
    initials := initials || upper(left(word, 1));
  END LOOP;
  RETURN initials;
END;
$$ LANGUAGE plpgsql;

-- Trigger: попълва initials автоматично при insert/update
CREATE OR REPLACE FUNCTION set_initials()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.full_name IS NOT NULL THEN
    NEW.initials := generate_initials(NEW.full_name);
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_initials
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_initials();

-- Индекс за бързо търсене по email при login
CREATE INDEX idx_profiles_email ON profiles (email);


-- ============================================================
-- 2. PREVIEW_ORDERS
-- ============================================================

CREATE TABLE preview_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_session_id   TEXT UNIQUE,
  status              TEXT NOT NULL DEFAULT 'pending',
    -- pending | paid | processing | delivered | failed
  photos              JSONB DEFAULT '[]'::jsonb,
    -- до 3 URL-а: ["https://...", "https://...", "https://..."]
  photo_count         INTEGER GENERATED ALWAYS AS (
    jsonb_array_length(photos)
  ) STORED,
  result_sent_at      TIMESTAMPTZ,
  result_email        TEXT,                     -- на кой имейл е изпратено
  gross_amount        NUMERIC(10,2) DEFAULT 2.80,
  vat_rate            NUMERIC(5,4) DEFAULT 0.2300, -- 23% Ирландия
  vat_amount          NUMERIC(10,2) GENERATED ALWAYS AS (
    ROUND(gross_amount * vat_rate / (1 + vat_rate), 2)
  ) STORED,
  net_amount          NUMERIC(10,2) GENERATED ALWAYS AS (
    ROUND(gross_amount / (1 + vat_rate), 2)
  ) STORED,
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Constraint: максимум 3 снимки
ALTER TABLE preview_orders
  ADD CONSTRAINT max_3_photos
  CHECK (jsonb_array_length(photos) <= 3);

CREATE INDEX idx_preview_orders_user_id ON preview_orders (user_id);
CREATE INDEX idx_preview_orders_status ON preview_orders (status);


-- ============================================================
-- 3. FULL_ORDERS
-- ============================================================

CREATE TABLE full_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_session_id   TEXT UNIQUE,
  status              TEXT NOT NULL DEFAULT 'pending',
    -- pending | paid | processing | delivered | failed
  payment_method      TEXT,
    -- stripe | paypal | revolut | apple_pay | google_pay
  payment_date        DATE,                     -- датата на трансфера
  gross_amount        NUMERIC(10,2) NOT NULL,
  vat_rate            NUMERIC(5,4) DEFAULT 0.2300,
  vat_amount          NUMERIC(10,2) GENERATED ALWAYS AS (
    ROUND(gross_amount * vat_rate / (1 + vat_rate), 2)
  ) STORED,
  net_amount          NUMERIC(10,2) GENERATED ALWAYS AS (
    ROUND(gross_amount / (1 + vat_rate), 2)
  ) STORED,
  -- Данни на клиента към момента на поръчката (snapshot)
  client_full_name    TEXT NOT NULL,
  client_address      TEXT NOT NULL,
  client_phone        TEXT NOT NULL,
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_full_orders_user_id ON full_orders (user_id);
CREATE INDEX idx_full_orders_status ON full_orders (status);


-- ============================================================
-- 4. INVOICES
-- ============================================================

CREATE SEQUENCE invoice_seq START 1;

CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES full_orders(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- RAI-2025-001
  invoice_number  TEXT UNIQUE NOT NULL,

  -- IPG-RAI-2025-001.pdf
  filename        TEXT UNIQUE NOT NULL,

  -- Локален storage path (заменя Supabase Storage)
  pdf_url         TEXT,
  pdf_path        TEXT,                         -- за архива на Admin

  -- Статус
  sent_at         TIMESTAMPTZ,                   -- кога е изпратена по email
  confirmed_at    TIMESTAMPTZ,                   -- кога клиентът е въвел номера
  is_confirmed    BOOLEAN DEFAULT FALSE,

  -- Snapshot на сумите
  gross_amount    NUMERIC(10,2) NOT NULL,
  vat_amount      NUMERIC(10,2) NOT NULL,
  net_amount      NUMERIC(10,2) NOT NULL,
  vat_rate        NUMERIC(5,4) DEFAULT 0.2300,

  created_at      TIMESTAMPTZ DEFAULT NOW()
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

CREATE INDEX idx_invoices_user_id ON invoices (user_id);
CREATE INDEX idx_invoices_order_id ON invoices (order_id);


-- ============================================================
-- 5. CLIENT_DOWNLOADS
-- ============================================================

CREATE TABLE client_downloads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id            UUID NOT NULL REFERENCES full_orders(id) ON DELETE CASCADE,

  gcs_path            TEXT NOT NULL,             -- TODO: преименувай, ако сменяш storage backend
  file_url            TEXT NOT NULL,

  uploaded_at         TIMESTAMPTZ DEFAULT NOW(),
  expires_at          TIMESTAMPTZ,                -- попълва се от тригер по-долу

  request_count       INTEGER DEFAULT 1,
  last_requested_at   TIMESTAMPTZ DEFAULT NOW(),
  is_expired          BOOLEAN DEFAULT FALSE,

  created_at          TIMESTAMPTZ DEFAULT NOW(),

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

-- Функция за cron job: маркира изтеклите линкове
-- (извиквай периодично, напр. чрез pg_cron или системен cron + psql -c "SELECT expire_old_downloads();")
CREATE OR REPLACE FUNCTION expire_old_downloads()
RETURNS void AS $$
BEGIN
  UPDATE client_downloads
  SET is_expired = TRUE
  WHERE expires_at < NOW()
    AND is_expired = FALSE;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX idx_client_downloads_user_id ON client_downloads (user_id);
CREATE INDEX idx_client_downloads_order_id ON client_downloads (order_id);


-- ============================================================
-- 6. SITE_VISITS
-- ============================================================

CREATE TABLE site_visits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address      TEXT NOT NULL,
  country         TEXT,
  city            TEXT,
  is_new_visitor  BOOLEAN DEFAULT FALSE,
  visited_at      TIMESTAMPTZ DEFAULT NOW(),
  session_id      TEXT                        -- за дедупликация
);

-- Index за бързи заявки по дата
CREATE INDEX idx_site_visits_date
  ON site_visits (visited_at DESC);

CREATE INDEX idx_site_visits_ip
  ON site_visits (ip_address);

-- Достъпът (само admin чете, всеки може да пише) се контролира
-- вече в Node.js API route middleware, не чрез RLS.


-- ============================================================
-- 7. ADMIN VIEWS
-- ============================================================

CREATE OR REPLACE VIEW admin_financial_summary AS
SELECT
  -- Preview поръчки (Ниво 2)
  COUNT(po.id) FILTER (WHERE po.status = 'paid')
    AS preview_orders_count,
  COALESCE(SUM(po.gross_amount) FILTER (WHERE po.status = 'paid'), 0)
    AS preview_gross,
  COALESCE(SUM(po.vat_amount) FILTER (WHERE po.status = 'paid'), 0)
    AS preview_vat,
  COALESCE(SUM(po.net_amount) FILTER (WHERE po.status = 'paid'), 0)
    AS preview_net,

  -- Пълни поръчки (Ниво 3)
  COUNT(fo.id) FILTER (WHERE fo.status = 'paid')
    AS full_orders_count,
  COALESCE(SUM(fo.gross_amount) FILTER (WHERE fo.status = 'paid'), 0)
    AS full_gross,
  COALESCE(SUM(fo.vat_amount) FILTER (WHERE fo.status = 'paid'), 0)
    AS full_vat,
  COALESCE(SUM(fo.net_amount) FILTER (WHERE fo.status = 'paid'), 0)
    AS full_net,

  -- ОБЩО
  COALESCE(SUM(po.gross_amount) FILTER (WHERE po.status = 'paid'), 0) +
  COALESCE(SUM(fo.gross_amount) FILTER (WHERE fo.status = 'paid'), 0)
    AS total_gross,

  COALESCE(SUM(po.vat_amount) FILTER (WHERE po.status = 'paid'), 0) +
  COALESCE(SUM(fo.vat_amount) FILTER (WHERE fo.status = 'paid'), 0)
    AS total_vat_to_reserve,   -- ← тази сума трябва в банката

  COALESCE(SUM(po.net_amount) FILTER (WHERE po.status = 'paid'), 0) +
  COALESCE(SUM(fo.net_amount) FILTER (WHERE fo.status = 'paid'), 0)
    AS total_net

FROM preview_orders po
FULL OUTER JOIN full_orders fo ON TRUE;

-- Статистики за деня
CREATE OR REPLACE VIEW admin_daily_stats AS
SELECT
  COUNT(*) AS visits_today,
  COUNT(*) FILTER (WHERE is_new_visitor = TRUE) AS new_visitors_today,
  COUNT(DISTINCT country) AS countries_today,
  COUNT(DISTINCT city) AS cities_today
FROM site_visits
WHERE visited_at >= CURRENT_DATE;

-- Preview поръчки днес / общо
CREATE OR REPLACE VIEW admin_preview_stats AS
SELECT
  COUNT(*) FILTER (
    WHERE paid_at >= CURRENT_DATE AND status = 'paid'
  ) AS preview_paid_today,
  COUNT(*) FILTER (
    WHERE status = 'paid'
  ) AS preview_paid_total
FROM preview_orders;


-- ============================================================
-- КРАЙ НА СХЕМАТА
-- ============================================================
-- Следващи стъпки:
--   1. psql -U rebornartai_user -d rebornartai -f schema.sql
--   2. Експорт на реални данни от Supabase (pg_dump --data-only
--      по таблица, или CSV през Supabase Studio)
--   3. Импорт в новите таблици (внимавай за реда заради FK-та:
--      profiles → preview_orders/full_orders → invoices →
--      client_downloads → site_visits)
--   4. Имплементация на bcrypt + JWT auth в Node.js (login/register
--      routes, middleware за access_level проверка)
--   5. Пресъздаване на cron за /api/update-youtube-cache (08:00,
--      14:00, 20:00) и евентуален cron за expire_old_downloads()
-- ============================================================

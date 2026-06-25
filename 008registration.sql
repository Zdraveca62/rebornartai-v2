-- ============================================================
-- 8. REGISTRATIONS
-- ============================================================
-- Тази таблица не съществуваше в оригиналните 7 Supabase migration
-- файла (supabase/migrations/001-007) — е била създадена ръчно в
-- Supabase Studio. Реконструирана от употребата ѝ в:
--   - app/api/auth/route.js   (link_email, login, signup actions)
--   - app/api/check-ip/route.js (GET visit tracking, check_email,
--     failed_attempt, reset_attempts actions)
--
-- Предназначение: IP-базирано проследяване на посещения и
-- anti-bruteforce защита при login опити. Независима от profiles —
-- не сочи FK към никого, работи единствено по ip_address.
-- ============================================================

CREATE TABLE registrations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address          TEXT NOT NULL UNIQUE,
  email               TEXT,
  visit_count         INTEGER DEFAULT 1,
  previous_visit_at   TIMESTAMPTZ,
  last_visit_at       TIMESTAMPTZ DEFAULT NOW(),
  failed_attempts     INTEGER DEFAULT 0,
  is_public_ip        BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_registrations_ip ON registrations (ip_address);
CREATE INDEX idx_registrations_email ON registrations (email);
-- ============================================================
-- REBORN ART AI — Миграция 011: Блог чат система
-- Дата: 2026-06-21
-- ============================================================
-- Чат функционалност на Блог страницата:
--   - Ниво 0 посетители НЕ виждат чат опцията (redirect към login)
--   - Ниво 1/2/3 клиенти имат един общ непрекъснат чат поток
--     (не разделен по поръчка)
--   - Admin статус: РЪЧЕН тогъл Онлайн/Офлайн в админ панела
--     (не автоматичен last_seen_at timer)
--   - Ако admin е офлайн при получаване на съобщение, клиентът
--     получава отговора по-късно по email (emailed флаг следи
--     дали вече е изпратен)
-- ============================================================

BEGIN;

-- Ръчен admin online/offline тогъл (само за access_level=3 профил)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_online BOOLEAN DEFAULT false;

COMMENT ON COLUMN profiles.admin_online IS
  'Ръчен тогъл Онлайн/Офлайн, управляван от admin панела. Определя дали чат съобщенията се третират като "на живо" (polling) или "офлайн" (email notification при отговор).';

-- Чат съобщения — един общ thread per клиент, не разделен по поръчка
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('client', 'admin')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  emailed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE chat_messages IS
  'Един общ непрекъснат чат поток per клиент (user_id), независимо от поръчките им. sender разграничава кой е писал съобщението.';
COMMENT ON COLUMN chat_messages.emailed IS
  'Дали admin отговор вече е изпратен по email на клиента (само когато admin_online = false при отговора)';

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id
  ON chat_messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread
  ON chat_messages(user_id) WHERE is_read = false;

COMMIT;

-- ============================================================
-- ПРОВЕРКА СЛЕД МИГРАЦИЯТА
-- ============================================================
-- \d chat_messages
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'profiles' AND column_name = 'admin_online';
-- ============================================================

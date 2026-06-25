-- ============================================================
-- REBORN ART AI — Миграция 009: Архитектурни решения от сесия
-- Дата: 2026-06-21
-- ============================================================
-- Тази миграция обединява всички решения, взети в сесията:
--   1. access_level 0-3 номерация (вместо 1-4)
--   2. Връзка preview_orders <-> full_orders
--   3. Преименуване на client_downloads.gcs_path -> storage_path
--   4. Visitor UUID tracking за Ниво 0 (site_visits разширение)
--   5. Download прозорец полета (download_expires_at, archived)
--   6. Admin device token за Ниво 3 автоматично разпознаване
-- ============================================================
-- ВАЖНО: Изпълнява се в ЕДНА транзакция. Ако нещо гръмне,
-- всичко се връща назад автоматично (ROLLBACK), базата остава
-- в предишното си валидно състояние.
-- ============================================================

BEGIN;

-- ============================================================
-- СЕКЦИЯ 1: profiles.access_level — нова номерация 0-3
-- ============================================================
-- 0 = анонимен, 1 = preview клиент, 2 = extended (full order)
-- клиент, 3 = admin

-- Потвърдено на 2026-06-21: таблицата profiles е напълно
-- празна (SELECT access_level, COUNT(*) FROM profiles ... ->
-- 0 rows). Реалната схема на сървъра показва access_level
-- integer NOT NULL DEFAULT 1, без съществуващ CHECK constraint
-- — затова не е нужна никаква защитна UPDATE миграция на данни,
-- просто сменяме DEFAULT и добавяме новия constraint директно.

ALTER TABLE profiles ALTER COLUMN access_level SET DEFAULT 0;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_access_level_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_access_level_check
  CHECK (access_level BETWEEN 0 AND 3);

COMMENT ON COLUMN profiles.access_level IS
  '0=анонимен, 1=preview клиент (10s видео), 2=extended клиент (full order), 3=admin';


-- ============================================================
-- СЕКЦИЯ 2: Връзка preview_orders <-> full_orders
-- ============================================================
-- full_orders винаги произлиза от съществуващ preview_order —
-- клиентът първо поръчва 10-сек превю, после опционално
-- ъпгрейдва към пълен клип/физически продукт.

-- ВАЖНО: preview_orders.id е UUID (gen_random_uuid()), не
-- INTEGER. Коригирано спрямо реалната схема на сървъра
-- (потвърдено чрез \d preview_orders на 2026-06-21).
ALTER TABLE full_orders
  ADD COLUMN IF NOT EXISTS preview_order_id UUID REFERENCES preview_orders(id);

COMMENT ON COLUMN full_orders.preview_order_id IS
  'Препратка към оригиналната preview поръчка, от която произлиза тази full order. Винаги трябва да е попълнено за нови поръчки.';

-- Забележка: оставяме колоната nullable засега (не NOT NULL),
-- за съвместимост с евентуални стари тестови записи без тази
-- връзка. Прилагането на NOT NULL constraint може да стане в
-- отделна миграция, след проверка на съществуващите данни:
--   SELECT id FROM full_orders WHERE preview_order_id IS NULL;
-- Ако резултатът е празен (или само тестови редове), тогава:
--   ALTER TABLE full_orders ALTER COLUMN preview_order_id SET NOT NULL;


-- ============================================================
-- СЕКЦИЯ 3: client_downloads.gcs_path -> storage_path
-- ============================================================
-- Преименуване, защото вече не съхраняваме в Google Cloud
-- Storage, а локално на NAS дисковете (mount-нати на
-- GMKtec M8 сървъра под /mnt/nas-storage/).

ALTER TABLE client_downloads RENAME COLUMN gcs_path TO storage_path;

COMMENT ON COLUMN client_downloads.storage_path IS
  'Локален път до файла на сървъра, напр. /mnt/nas-storage/software/{user_id}/{order_id}/file.mp4 (активен) или /mnt/nas-storage/archive/{user_id}/{order_id}/file.mp4 (архивиран след изтичане на download прозореца)';


-- ============================================================
-- СЕКЦИЯ 4: Download прозорец полета (preview_orders / full_orders)
-- ============================================================
-- download_expires_at: 30 дни (Ниво 1) / 90 дни (Ниво 2) от
--   датата на готовия клип
-- archived: дали файлът вече е преместен от работния диск
--   (/mnt/nas-storage/software) към архивния
--   (/mnt/nas-storage/archive) след изтичане на прозореца
-- download_count: статистика, НЕ ограничава достъпа — клиентът
--   може да сваля неограничено пъти докато прозорецът е отворен

ALTER TABLE preview_orders
  ADD COLUMN IF NOT EXISTS download_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

ALTER TABLE full_orders
  ADD COLUMN IF NOT EXISTS download_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0;

COMMENT ON COLUMN preview_orders.download_expires_at IS
  'Краен срок за сваляне: дата на готовия клип + 30 дни (Ниво 1)';
COMMENT ON COLUMN full_orders.download_expires_at IS
  'Краен срок за сваляне: дата на готовия клип + 90 дни (Ниво 2)';

-- Индекси за бързо намиране на изтекли поръчки (cron job-ът
-- ще филтрира по точно тези условия всяка нощ)
CREATE INDEX IF NOT EXISTS idx_preview_orders_expiry
  ON preview_orders(download_expires_at) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_full_orders_expiry
  ON full_orders(download_expires_at) WHERE archived = false;


-- ============================================================
-- СЕКЦИЯ 5: site_visits — Visitor UUID tracking (Ниво 0)
-- ============================================================
-- Дедупликация на 24ч по IP + visitor_uuid (cookie, 2 години
-- живот, генериран random UUID — НЕ browser fingerprint hash).
-- total_time_seconds НИКОГА не се нулира, натрупва се за
-- целия живот на посетителя.

ALTER TABLE site_visits
  ADD COLUMN IF NOT EXISTS visitor_uuid UUID,
  ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS first_visit_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS total_time_seconds INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_site_visits_uuid ON site_visits(visitor_uuid);

COMMENT ON COLUMN site_visits.visitor_uuid IS
  'Random UUID от rai_visitor_id cookie (2 години живот). НЕ е browser fingerprint hash — чист random идентификатор за GDPR съвместимост.';
COMMENT ON COLUMN site_visits.total_time_seconds IS
  'Натрупващо време на престой, никога не се нулира, дори след месеци/години';


-- ============================================================
-- СЕКЦИЯ 6: Admin device token (Ниво 3 автоматично разпознаване)
-- ============================================================
-- Когато admin (access_level=3) login-не от desktop-а веднъж,
-- сървърът генерира random secret и го пази тук + httpOnly
-- cookie rai_admin_token на клиента. При следващи посещения
-- от същия браузър, login формата се прескача напълно и се
-- показва "Здравей, Администраторе" бутон директно.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_device_token TEXT,
  ADD COLUMN IF NOT EXISTS admin_device_set_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.admin_device_token IS
  'Hash на random secret (httpOnly cookie rai_admin_token при админ login). Различен secret от visitor_uuid — компрометирането на единия не засяга другия.';


-- ============================================================
-- СЕКЦИЯ 7: client_downloads — поправки спрямо реалната схема
-- ============================================================
-- Открити при проверка на 2026-06-21 две несъответствия с
-- решенията от сесията:
--
-- 7a) "max_3_requests" CHECK (request_count <= 3) противоречи
--     на решението за НЕОГРАНИЧЕНИ сваляния в рамките на
--     download прозореца (30/90 дни). request_count остава
--     само за вътрешна статистика, без да ограничава достъпа.
--
-- 7b) order_id реферира само full_orders(id), но Ниво 1
--     (preview_orders) поръчки също имат сваляем файл (10-сек
--     клипа). Заменяме единствения order_id с два отделни
--     nullable foreign keys — точно единият от двата трябва
--     да е попълнен за всеки запис.

-- 7a: премахваме лимита от 3 сваляния
ALTER TABLE client_downloads DROP CONSTRAINT IF EXISTS max_3_requests;

COMMENT ON COLUMN client_downloads.request_count IS
  'Брой сваляния — само за вътрешна статистика, НЕ ограничава достъпа. Неограничени сваляния в рамките на download прозореца (виж preview_orders/full_orders.download_expires_at).';

-- 7b: нови nullable FK колони към двете възможни поръчки
ALTER TABLE client_downloads
  ADD COLUMN IF NOT EXISTS preview_order_id UUID REFERENCES preview_orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS full_order_id UUID REFERENCES full_orders(id) ON DELETE CASCADE;

-- Прехвърляме съществуващите order_id стойности (ако има
-- такива) към full_order_id, тъй като старият FK сочеше само
-- към full_orders.
UPDATE client_downloads SET full_order_id = order_id WHERE order_id IS NOT NULL;

-- Гарантираме, че точно ЕДНА от двете нови колони е попълнена
-- (никога и двете едновременно, никога нито една)
ALTER TABLE client_downloads DROP CONSTRAINT IF EXISTS one_order_type_only;
ALTER TABLE client_downloads ADD CONSTRAINT one_order_type_only
  CHECK (
    (preview_order_id IS NOT NULL AND full_order_id IS NULL)
    OR
    (preview_order_id IS NULL AND full_order_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_client_downloads_preview_order
  ON client_downloads(preview_order_id) WHERE preview_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_downloads_full_order
  ON client_downloads(full_order_id) WHERE full_order_id IS NOT NULL;

-- Старата order_id колона и foreign key остават засега
-- незасегнати (само копирано от тях), за безопасност при
-- евентуален rollback на приложния код. Премахването им може
-- да стане в отделна следваща миграция, след като app кодът
-- е напълно прехвърлен към новите колони:
--   ALTER TABLE client_downloads DROP CONSTRAINT client_downloads_order_id_fkey;
--   ALTER TABLE client_downloads DROP COLUMN order_id;


COMMIT;

-- ============================================================
-- ПРОВЕРКИ СЛЕД МИГРАЦИЯТА (изпълни ръчно за потвърждение)
-- ============================================================
-- SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'profiles' AND column_name = 'access_level';
--
-- SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'profiles'::regclass AND contype = 'c';
--
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'client_downloads' AND column_name IN ('gcs_path', 'storage_path');
--   -- очакваме само 'storage_path' да съществува
--
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name IN ('preview_orders', 'full_orders')
--   AND column_name IN ('download_expires_at', 'archived', 'download_count', 'preview_order_id')
--   ORDER BY table_name, column_name;
-- ============================================================

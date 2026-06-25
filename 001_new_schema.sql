-- ============================================================
-- REBORN ART AI — Migration 001
-- Дата: 2026-06
-- Описание:
--   1. ALTER youtube_cache → добавяме duration_seconds (от YouTube API)
--   2. CREATE orders (preview + full в една таблица)
--   3. CREATE archive
--   4. CREATE chat_messages
--
-- ЗАБЕЛЕЖКА: music2 и videos НЕ получават duration_seconds колона.
-- Дължината се чете винаги от youtube_cache по youtube_id (JOIN).
-- Така е винаги актуална и не се дублира.
-- ============================================================

-- ─── 1. ALTER youtube_cache ───────────────────────────────────────────────────

ALTER TABLE youtube_cache
  ADD COLUMN IF NOT EXISTS duration_seconds integer;

COMMENT ON COLUMN youtube_cache.duration_seconds IS
  'Дължина в секунди — попълва се автоматично от YouTube API (contentDetails.duration)';

-- ─── 2. CREATE orders ─────────────────────────────────────────────────────────
-- Една таблица за preview и full поръчки.
-- order_type = 'preview' → first order (10 сек, €2.80)
-- order_type = 'full'    → пълно видео, цената се изчислява от duration_seconds
-- parent_order_id → full order линква към своя preview order

CREATE TABLE IF NOT EXISTS orders (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),

  -- Клиент
  user_id             uuid        NOT NULL,

  -- Тип поръчка
  order_type          text        NOT NULL CHECK (order_type IN ('preview', 'full')),

  -- За full orders — линк към preview поръчката
  parent_order_id     uuid        NULL REFERENCES orders(id) ON DELETE SET NULL,

  -- Избраното YouTube видео/песен (нашия шаблон)
  youtube_id          text        NOT NULL,
  item_type           text        NOT NULL CHECK (item_type IN ('song', 'video')),

  -- Категория (за full orders от страницата Клиенти)
  category            text        NULL
    CHECK (category IN (
      'birthday', 'celebration', 'holiday',
      'anniversary', 'wedding', 'baptism', 'memorial'
    )),

  -- Снимки и текст от клиента (попълва се СЛЕД плащане)
  photos              jsonb       NULL DEFAULT '[]'::jsonb,
  custom_text         text        NULL,
  notes               text        NULL,  -- допълнителни забележки (само за full)

  -- Дължина и цена
  -- За preview: duration_seconds = 10, gross_amount = 2.80
  -- За full: duration_seconds от music2/videos, gross_amount се изчислява
  duration_seconds    integer     NOT NULL,
  vat_rate            numeric(5,4) NOT NULL DEFAULT 0.2300,
  gross_amount        numeric(10,2) NOT NULL,
  -- vat и net са generated — не се въвеждат ръчно
  vat_amount          numeric(10,2) GENERATED ALWAYS AS (
                        ROUND((gross_amount * vat_rate) / (1 + vat_rate), 2)
                      ) STORED,
  net_amount          numeric(10,2) GENERATED ALWAYS AS (
                        ROUND(gross_amount / (1 + vat_rate), 2)
                      ) STORED,

  -- Stripe
  stripe_session_id   text        NULL UNIQUE,
  stripe_payment_intent text      NULL,

  -- Статус
  -- pending      → създадена, чака плащане
  -- paid         → платена, чака изпълнение
  -- in_progress  → ние работим по нея
  -- completed    → изпратен Drive link
  -- archived     → изтекъл срок, преместена в архив
  -- failed       → неуспешно плащане
  status              text        NOT NULL DEFAULT 'pending'
                        CHECK (status IN (
                          'pending', 'paid', 'in_progress',
                          'completed', 'archived', 'failed'
                        )),

  -- Изпълнение — попълва се ръчно от admin след готовност
  drive_link          text        NULL,  -- Google Drive link за сваляне
  drive_expires_at    timestamp with time zone NULL,
  -- preview: paid_at + 1 месец
  -- full:    paid_at + 3 месеца
  -- сетва се автоматично от trigger при UPDATE status = 'completed'

  paid_at             timestamp with time zone NULL,
  completed_at        timestamp with time zone NULL,
  created_at          timestamp with time zone NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_max_3_photos CHECK (jsonb_array_length(photos) <= 3),
  CONSTRAINT orders_full_needs_parent CHECK (
    order_type = 'preview' OR parent_order_id IS NOT NULL
  )
);

-- Индекси
CREATE INDEX IF NOT EXISTS idx_orders_user_id     ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_parent       ON orders(parent_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_youtube_id   ON orders(youtube_id);

COMMENT ON TABLE orders IS 'Всички поръчки — preview (10 сек) и full (до 4 мин)';
COMMENT ON COLUMN orders.drive_link IS 'Google Drive link — въвежда се ръчно от admin след изпълнение';
COMMENT ON COLUMN orders.drive_expires_at IS 'Preview: +1 месец от paid_at. Full: +3 месеца. Сетва се от trigger.';
COMMENT ON COLUMN orders.parent_order_id IS 'Full orders задължително линкват към своята preview поръчка';

-- ─── Trigger: auto-set drive_expires_at при вписване на drive_link ────────────

CREATE OR REPLACE FUNCTION set_drive_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Само ако drive_link е нов/променен и completed_at се сетва сега
  IF NEW.drive_link IS NOT NULL AND OLD.drive_link IS NULL THEN
    NEW.completed_at := NOW();
    IF NEW.order_type = 'preview' THEN
      NEW.drive_expires_at := NOW() + INTERVAL '1 month';
    ELSIF NEW.order_type = 'full' THEN
      NEW.drive_expires_at := NOW() + INTERVAL '3 months';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_drive_expires_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_drive_expires_at();

-- ─── 3. CREATE archive ────────────────────────────────────────────────────────
-- Запис се създава когато drive_expires_at изтече и cron архивира поръчката.
-- file_path → нашия локален архив (един екземпляр per поръчка)

CREATE TABLE IF NOT EXISTS archive (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  order_id            uuid        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id             uuid        NOT NULL,
  file_path           text        NOT NULL,  -- path в нашия архив сървър
  archived_at         timestamp with time zone NOT NULL DEFAULT now(),

  -- Еднократно преиздаване при основателна причина
  reissue_requested   boolean     NOT NULL DEFAULT false,
  reissue_reason      text        NULL,      -- писмено обяснение от клиента
  reissue_requested_at timestamp with time zone NULL,
  reissue_drive_link  text        NULL,      -- нов еднократен Drive link
  reissue_sent_at     timestamp with time zone NULL,

  CONSTRAINT archive_pkey PRIMARY KEY (id),
  CONSTRAINT archive_order_id_key UNIQUE (order_id)  -- един архив per поръчка
);

CREATE INDEX IF NOT EXISTS idx_archive_user_id  ON archive(user_id);
CREATE INDEX IF NOT EXISTS idx_archive_order_id ON archive(order_id);

COMMENT ON TABLE archive IS 'Архив след изтичане на Drive link. Един запис per поръчка.';
COMMENT ON COLUMN archive.reissue_drive_link IS 'Еднократен нов Drive link при одобрена заявка от admin';

-- ─── 4. CREATE chat_messages ──────────────────────────────────────────────────
-- Чат винаги е свързан с конкретна поръчка (order_id).
-- Клиентът избира поръчката от падащо меню → вижда дата + номер.
-- sender: 'client' | 'admin'

CREATE TABLE IF NOT EXISTS chat_messages (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  order_id    uuid        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL,  -- винаги клиентът (за лесно филтриране)
  sender      text        NOT NULL CHECK (sender IN ('client', 'admin')),
  message     text        NOT NULL,
  read_at     timestamp with time zone NULL,  -- NULL = непрочетено
  created_at  timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT chat_messages_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_chat_order_id  ON chat_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_chat_user_id   ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_unread    ON chat_messages(order_id) WHERE read_at IS NULL;

COMMENT ON TABLE chat_messages IS 'Чат съобщения — винаги свързани с конкретна поръчка';
COMMENT ON COLUMN chat_messages.read_at IS 'NULL = непрочетено от получателя';

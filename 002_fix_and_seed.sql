-- ============================================================
-- REBORN ART AI — Migration 002
-- Дата: 2026-06
-- Описание:
--   1. Drop стари таблици (вече не са нужни)
--   2. Drop + recreate chat_messages с новата структура
--   3. CREATE youtube_cache (с duration_seconds)
--   4. CREATE music2, videos, jukebox_stats
-- ============================================================

-- ─── 1. Почистване на стари таблици ──────────────────────────────────────────

DROP TABLE IF EXISTS client_downloads  CASCADE;
DROP TABLE IF EXISTS invoices          CASCADE;
DROP TABLE IF EXISTS full_orders       CASCADE;
DROP TABLE IF EXISTS preview_orders    CASCADE;

-- ─── 2. chat_messages — drop и recreate с новата структура ───────────────────

DROP TABLE IF EXISTS chat_messages CASCADE;

CREATE TABLE chat_messages (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  order_id    uuid        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  sender      text        NOT NULL CHECK (sender IN ('client', 'admin')),
  message     text        NOT NULL,
  read_at     timestamp with time zone NULL,  -- NULL = непрочетено
  created_at  timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT chat_messages_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_chat_order_id ON chat_messages(order_id);
CREATE INDEX idx_chat_user_id  ON chat_messages(user_id);
CREATE INDEX idx_chat_unread   ON chat_messages(order_id) WHERE read_at IS NULL;

COMMENT ON TABLE chat_messages IS 'Чат съобщения — винаги свързани с конкретна поръчка';
COMMENT ON COLUMN chat_messages.read_at IS 'NULL = непрочетено от получателя';

-- ─── 3. CREATE youtube_cache ──────────────────────────────────────────────────
-- Попълва се автоматично от /api/update-youtube-cache (cron нощем)

CREATE TABLE youtube_cache (
  id               serial      NOT NULL,
  youtube_id       text        NOT NULL UNIQUE,
  title            text        NOT NULL DEFAULT '',
  thumbnail_url    text        NULL,
  views            integer     NOT NULL DEFAULT 0,
  item_type        text        NOT NULL DEFAULT 'song'
                     CHECK (item_type IN ('song', 'video')),
  duration_seconds integer     NULL,  -- парснато от ISO 8601 (PT3M45S → 225)
  last_updated     timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT youtube_cache_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_youtube_cache_youtube_id  ON youtube_cache(youtube_id);
CREATE INDEX idx_youtube_cache_item_type   ON youtube_cache(item_type);

COMMENT ON TABLE youtube_cache IS 'Кеш от YouTube API — обновява се нощем от cron';
COMMENT ON COLUMN youtube_cache.duration_seconds IS 'Дължина в секунди — парснато от contentDetails.duration (ISO 8601)';

-- ─── 4. CREATE music2 ─────────────────────────────────────────────────────────

CREATE TABLE music2 (
  id            serial      NOT NULL,
  youtube_id    text        NOT NULL UNIQUE REFERENCES youtube_cache(youtube_id) ON DELETE CASCADE,
  title         text        NOT NULL,
  language      text        NOT NULL DEFAULT 'bg' CHECK (language IN ('bg', 'en')),
  lyrics        text        NULL,       -- текст на песента (въвежда се от admin)
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT music2_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_music2_youtube_id ON music2(youtube_id);
CREATE INDEX idx_music2_language   ON music2(language);
CREATE INDEX idx_music2_active     ON music2(is_active);

COMMENT ON TABLE music2 IS 'Песни — youtube_id линква към youtube_cache за views/duration/thumbnail';

-- ─── 5. CREATE videos ─────────────────────────────────────────────────────────

CREATE TABLE videos (
  id            serial      NOT NULL,
  youtube_id    text        NOT NULL UNIQUE REFERENCES youtube_cache(youtube_id) ON DELETE CASCADE,
  title         text        NOT NULL,
  description   text        NULL,
  category      text        NOT NULL DEFAULT 'impressions'
                  CHECK (category IN ('impressions', 'music_videos', 'children', 'clients')),
  -- Подкатегория — само за category = 'clients'
  subcategory   text        NULL
                  CHECK (subcategory IN (
                    'birthday', 'celebration', 'holiday',
                    'anniversary', 'wedding', 'baptism', 'memorial'
                  )),
  cover_url     text        NULL,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT videos_pkey PRIMARY KEY (id),
  CONSTRAINT videos_subcategory_only_for_clients CHECK (
    category = 'clients' OR subcategory IS NULL
  )
);

CREATE INDEX idx_videos_youtube_id  ON videos(youtube_id);
CREATE INDEX idx_videos_category    ON videos(category);
CREATE INDEX idx_videos_subcategory ON videos(subcategory);
CREATE INDEX idx_videos_active      ON videos(is_active);

COMMENT ON TABLE videos IS 'Видеа — youtube_id линква към youtube_cache за views/duration/thumbnail';
COMMENT ON COLUMN videos.subcategory IS 'Само за category=clients: birthday, wedding, итн.';

-- ─── 6. CREATE jukebox_stats ──────────────────────────────────────────────────
-- Брои колко пъти е пускан даден елемент в джубокса/карусела в сайта.
-- site_views в youtube_cache е за гледания активирани от нашия сайт към YouTube.
-- listen_count тук е за пускане директно в джубокса.

CREATE TABLE jukebox_stats (
  id            serial      NOT NULL,
  youtube_id    text        NOT NULL UNIQUE REFERENCES youtube_cache(youtube_id) ON DELETE CASCADE,
  item_type     text        NOT NULL CHECK (item_type IN ('song', 'video')),
  listen_count  integer     NOT NULL DEFAULT 0,
  last_listened timestamp with time zone NULL,
  created_at    timestamp with time zone NOT NULL DEFAULT now(),
  updated_at    timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT jukebox_stats_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_jukebox_youtube_id ON jukebox_stats(youtube_id);

COMMENT ON TABLE jukebox_stats IS 'Статистика за пускания в джубокса — по youtube_id';

-- ─── Trigger: auto-update updated_at в jukebox_stats ─────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_jukebox_updated_at
  BEFORE UPDATE ON jukebox_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ─── 7. INSERT данните от Supabase ───────────────────────────────────────────
-- youtube_cache първо (music2/videos/jukebox_stats зависят от него)

INSERT INTO youtube_cache (youtube_id, title, thumbnail_url, views, item_type, last_updated) VALUES
  ('N7YmcBelCUs', 'Времето и твоят рожден ден',                    'https://img.youtube.com/vi/N7YmcBelCUs/mqdefault.jpg', 214, 'song',  '2026-05-04 03:34:58'),
  ('uxSIvsoWIH8', 'Езикът на Цветята',                              'https://img.youtube.com/vi/uxSIvsoWIH8/mqdefault.jpg', 143, 'song',  '2026-05-04 03:34:58'),
  ('5xa0csmG-NE', 'Живот един път ни се дава',                      'https://img.youtube.com/vi/5xa0csmG-NE/mqdefault.jpg', 115, 'song',  '2026-05-04 03:34:58'),
  ('ibzGIAL084I', 'НОВАТА ГЕНЕРАЦИЯ',                               'https://img.youtube.com/vi/ibzGIAL084I/mqdefault.jpg', 105, 'song',  '2026-05-04 03:34:58'),
  ('my_r4FgmNIc', 'Пролетни настроения',                            'https://img.youtube.com/vi/my_r4FgmNIc/mqdefault.jpg', 135, 'song',  '2026-05-04 03:34:58'),
  ('BZu9v0ZHUzU', 'The Language Of Flowers',                        'https://img.youtube.com/vi/BZu9v0ZHUzU/mqdefault.jpg',  75, 'song',  '2026-05-04 03:34:58'),
  ('ztnOtQ8X1S8', 'Life Ones Given',                                'https://img.youtube.com/vi/ztnOtQ8X1S8/mqdefault.jpg', 112, 'song',  '2026-05-04 03:34:58'),
  ('x1Znaka4T50', 'THE TIME AND YOUR BIRTHDAY',                     'https://img.youtube.com/vi/x1Znaka4T50/mqdefault.jpg',  77, 'song',  '2026-05-04 03:34:58'),
  ('fcvKIaAT15A', 'NEW GENERATION',                                 'https://img.youtube.com/vi/fcvKIaAT15A/mqdefault.jpg', 106, 'song',  '2026-05-04 03:34:58'),
  ('OMrnqnyh6tA', 'Spring Vibes',                                   'https://img.youtube.com/vi/OMrnqnyh6tA/mqdefault.jpg',  63, 'song',  '2026-05-04 03:34:58'),
  ('53Oy36j2kUM', ' J.S. Bach - Air of eternity',                   'https://img.youtube.com/vi/53Oy36j2kUM/mqdefault.jpg', 312, 'video', '2026-05-04 03:34:59'),
  ('OlrvakMCxaY', 'Delibes - The Flower Duet - From Opera "Lakme"', 'https://img.youtube.com/vi/OlrvakMCxaY/mqdefault.jpg', 407, 'video', '2026-05-04 03:34:59')
ON CONFLICT (youtube_id) DO NOTHING;

-- music2 данни (bulgarian + english версии)
INSERT INTO music2 (youtube_id, title, language) VALUES
  ('uxSIvsoWIH8', 'Езикът на Цветята',          'bg'),
  ('5xa0csmG-NE', 'Живот един път ни се дава',  'bg'),
  ('ibzGIAL084I', 'НОВАТА ГЕНЕРАЦИЯ',            'bg'),
  ('N7YmcBelCUs', 'Времето и твоят рожден ден', 'bg'),
  ('my_r4FgmNIc', 'Пролетни настроения',         'bg'),
  ('BZu9v0ZHUzU', 'The Language Of Flowers',     'en'),
  ('ztnOtQ8X1S8', 'Life Ones Given',             'en'),
  ('x1Znaka4T50', 'THE TIME AND YOUR BIRTHDAY',  'en'),
  ('fcvKIaAT15A', 'NEW GENERATION',              'en'),
  ('OMrnqnyh6tA', 'Spring Vibes',                'en')
ON CONFLICT (youtube_id) DO NOTHING;

-- videos данни
INSERT INTO videos (youtube_id, title, description, category, cover_url) VALUES
  ('53Oy36j2kUM', 'J.S. Bach - Air of eternity',
   'Johann Sebastian Bach''s story of his "Air" on G string',
   'impressions', 'https://img.youtube.com/vi/53Oy36j2kUM/maxresdefault.jpg'),
  ('OlrvakMCxaY', 'Delibes - The Flower Duet - From Opera "Lakme"',
   'Impression on Delibes - The Flower Duet - From Opera "Lakme"',
   'impressions', 'https://img.youtube.com/vi/OlrvakMCxaY/maxresdefault.jpg')
ON CONFLICT (youtube_id) DO NOTHING;

-- jukebox_stats данни
INSERT INTO jukebox_stats (youtube_id, item_type, listen_count, last_listened, created_at, updated_at) VALUES
  ('uxSIvsoWIH8', 'song',  53, '2026-06-21 03:40:48', '2026-04-17 09:04:24', '2026-04-19 01:06:15'),
  ('5xa0csmG-NE', 'song',  32, '2026-06-20 03:00:18', '2026-04-17 09:04:33', '2026-04-19 00:34:05'),
  ('ibzGIAL084I', 'song',  23, '2026-06-20 03:00:14', '2026-04-17 09:05:31', '2026-04-18 23:57:01'),
  ('N7YmcBelCUs', 'song',  27, '2026-06-21 03:40:46', '2026-04-17 09:05:40', '2026-04-18 23:57:05'),
  ('OMrnqnyh6tA', 'song',  25, '2026-06-21 03:40:51', '2026-04-17 09:05:59', '2026-04-18 23:56:52'),
  ('x1Znaka4T50', 'song',  21, '2026-06-20 03:00:17', '2026-04-17 09:06:07', '2026-04-19 00:33:07'),
  ('fcvKIaAT15A', 'song',  24, '2026-06-21 03:40:50', '2026-04-17 09:11:41', '2026-04-19 00:34:06'),
  ('BZu9v0ZHUzU', 'song',  26, '2026-05-22 12:58:39', '2026-04-17 09:13:35', '2026-04-19 00:34:07'),
  ('my_r4FgmNIc', 'song',  23, '2026-06-20 03:00:15', '2026-04-18 06:19:15', '2026-04-18 23:57:08'),
  ('ztnOtQ8X1S8', 'song',  23, '2026-06-21 03:40:47', '2026-04-18 23:57:03', '2026-04-18 23:57:03'),
  ('OlrvakMCxaY', 'video',  3, '2026-04-21 02:10:13', '2026-04-20 14:33:05', '2026-04-20 14:33:05'),
  ('53Oy36j2kUM', 'video',  3, '2026-04-20 15:44:32', '2026-04-20 14:33:27', '2026-04-20 14:33:27')
ON CONFLICT (youtube_id) DO NOTHING;

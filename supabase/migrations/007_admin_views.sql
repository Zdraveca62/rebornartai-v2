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
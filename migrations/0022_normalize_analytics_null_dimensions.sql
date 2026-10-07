-- Normalize NULL dimension values to '' in the D1 analytics tables.
--
-- Why: SQLite treats NULLs as DISTINCT in UNIQUE indexes, so a row whose
-- dimension is NULL never triggers ON CONFLICT during re-aggregation. That let
-- every re-run insert duplicate rows instead of updating in place (audit CX8).
-- The aggregation writer now binds '' (empty string) for these columns; this
-- migration converts existing NULLs to '' so old rows share the same key space
-- and the UNIQUE(...) constraints dedupe correctly going forward.
--
-- Because two previously-distinct rows (differing only by NULL vs NULL) would
-- collide once normalized, we first collapse each normalized group to a single
-- surviving row (lowest rowid) before setting the NULLs to ''. The D1 tables are
-- effectively empty until the aggregation cron is fixed, so this is a safe repair.

-- analytics_geo: UNIQUE(link_id, country, city, date)
DELETE FROM analytics_geo
WHERE rowid NOT IN (
  SELECT MIN(rowid) FROM analytics_geo
  GROUP BY link_id, COALESCE(country, ''), COALESCE(city, ''), date
);
UPDATE analytics_geo SET country = '' WHERE country IS NULL;
UPDATE analytics_geo SET city = '' WHERE city IS NULL;

-- analytics_referrers: UNIQUE(link_id, referrer_domain, date)
DELETE FROM analytics_referrers
WHERE rowid NOT IN (
  SELECT MIN(rowid) FROM analytics_referrers
  GROUP BY link_id, COALESCE(referrer_domain, ''), date
);
UPDATE analytics_referrers SET referrer_domain = '' WHERE referrer_domain IS NULL;

-- analytics_devices: UNIQUE(link_id, device_type, browser, os, date)
DELETE FROM analytics_devices
WHERE rowid NOT IN (
  SELECT MIN(rowid) FROM analytics_devices
  GROUP BY link_id, COALESCE(device_type, ''), COALESCE(browser, ''), COALESCE(os, ''), date
);
UPDATE analytics_devices SET device_type = '' WHERE device_type IS NULL;
UPDATE analytics_devices SET browser = '' WHERE browser IS NULL;
UPDATE analytics_devices SET os = '' WHERE os IS NULL;

-- analytics_utm: UNIQUE(link_id, utm_source, utm_medium, utm_campaign, date)
DELETE FROM analytics_utm
WHERE rowid NOT IN (
  SELECT MIN(rowid) FROM analytics_utm
  GROUP BY link_id, COALESCE(utm_source, ''), COALESCE(utm_medium, ''), COALESCE(utm_campaign, ''), date
);
UPDATE analytics_utm SET utm_source = '' WHERE utm_source IS NULL;
UPDATE analytics_utm SET utm_medium = '' WHERE utm_medium IS NULL;
UPDATE analytics_utm SET utm_campaign = '' WHERE utm_campaign IS NULL;

-- analytics_custom_params: UNIQUE(link_id, param_name, param_value, date)
-- (param_name is NOT NULL; only param_value is nullable)
DELETE FROM analytics_custom_params
WHERE rowid NOT IN (
  SELECT MIN(rowid) FROM analytics_custom_params
  GROUP BY link_id, param_name, COALESCE(param_value, ''), date
);
UPDATE analytics_custom_params SET param_value = '' WHERE param_value IS NULL;

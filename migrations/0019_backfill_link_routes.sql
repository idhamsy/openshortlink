-- Backfill the route on links that were created without one (e.g. via the API,
-- where `route` is optional). Such links currently rely on the redirect engine's
-- legacy fallback and on the dashboard's display fallback to the domain route.
-- Setting an explicit route normalizes them so every link carries a concrete
-- route in its metadata, matching links created through the dashboard UI.
--
-- Uses SQLite JSON1 (json_set / json_extract), available in Cloudflare D1.
-- A link's route is set to its domain's routing_path (the domain's primary route).

UPDATE links
SET metadata = json_set(COALESCE(metadata, '{}'), '$.route',
  (SELECT d.routing_path FROM domains d WHERE d.id = links.domain_id))
WHERE
  -- only links whose metadata has no route yet
  (metadata IS NULL OR json_extract(metadata, '$.route') IS NULL)
  -- and whose domain has a routing_path to copy
  AND EXISTS (
    SELECT 1 FROM domains d
    WHERE d.id = links.domain_id AND d.routing_path IS NOT NULL AND d.routing_path != ''
  );

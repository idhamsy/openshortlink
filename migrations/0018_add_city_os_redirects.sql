-- Add city and OS-specific redirect tables

-- City-specific redirects table
CREATE TABLE IF NOT EXISTS link_city_redirects (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL,
  city_name TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE,
  UNIQUE(link_id, city_name)
);

CREATE INDEX IF NOT EXISTS idx_link_city_link ON link_city_redirects(link_id);
-- Index on city_name might be useful if we do exact lookups, but for "contains" queries we might not use it efficiently.
-- However, we likely won't query *by city* across all links often, usually just fetching by link_id.
-- So idx_link_city_link is the most important one.

-- OS-specific redirects table
CREATE TABLE IF NOT EXISTS link_os_redirects (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL,
  os TEXT NOT NULL CHECK(os IN ('android', 'ios')),
  destination_url TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE,
  UNIQUE(link_id, os)
);

CREATE INDEX IF NOT EXISTS idx_link_os_link ON link_os_redirects(link_id);

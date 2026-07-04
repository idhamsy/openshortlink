-- Migration 0021: per-link Open Graph / Twitter Card metadata (one row per link).
-- Used to render a rich preview page when a social crawler scrapes the short URL.

CREATE TABLE IF NOT EXISTS link_og_meta (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL,
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  og_type TEXT NOT NULL DEFAULT 'website',
  twitter_card TEXT NOT NULL DEFAULT 'summary_large_image',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE,
  UNIQUE(link_id)
);

CREATE INDEX IF NOT EXISTS idx_link_og_link ON link_og_meta(link_id);

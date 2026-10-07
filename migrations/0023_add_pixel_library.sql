-- Migration 0023: per-domain pixel library + link attachments.
-- Retargeting pixels are saved once per domain (pixel_library) and attached to
-- links (link_pixels). A link may only use pixels from its own domain (enforced
-- in the service layer). Replaces the unreleased per-link 0023_add_link_pixels.

CREATE TABLE IF NOT EXISTS pixel_library (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL,
  name TEXT NOT NULL,
  pixel_type TEXT NOT NULL CHECK(pixel_type IN ('facebook', 'google_ads', 'ga4', 'linkedin', 'tiktok', 'twitter')),
  pixel_id TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK(is_default IN (0, 1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(domain_id, pixel_type, pixel_id),
  UNIQUE(domain_id, name)
);

CREATE INDEX IF NOT EXISTS idx_pixel_library_domain ON pixel_library(domain_id);

CREATE TABLE IF NOT EXISTS link_pixels (
  link_id TEXT NOT NULL,
  library_pixel_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (link_id, library_pixel_id),
  FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE,
  FOREIGN KEY (library_pixel_id) REFERENCES pixel_library(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_link_pixels_library ON link_pixels(library_pixel_id);

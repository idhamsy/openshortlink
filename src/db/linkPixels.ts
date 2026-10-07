/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Link ↔ library-pixel attachments. Domain matching is enforced by the service layer.

import type { Env } from '../types';
import type { PixelType } from '../utils/pixelIds';

export interface LinkPixelView {
  id: string;
  name: string;
  pixel_type: PixelType;
  pixel_id: string;
}

export async function getLinkPixels(env: Env, linkId: string): Promise<LinkPixelView[]> {
  const result = await env.DB.prepare(
    `SELECT p.id, p.name, p.pixel_type, p.pixel_id
     FROM link_pixels lp JOIN pixel_library p ON p.id = lp.library_pixel_id
     WHERE lp.link_id = ? ORDER BY p.name`
  )
    .bind(linkId)
    .all<LinkPixelView>();
  return result.results || [];
}

/** Builds (does not execute) the statements that replace a link's attachments. [] clears. Duplicates dropped. */
export function buildSetLinkPixelsStatements(env: Env, linkId: string, libraryPixelIds: string[]): D1PreparedStatement[] {
  const now = Date.now();
  const statements: D1PreparedStatement[] = [
    env.DB.prepare('DELETE FROM link_pixels WHERE link_id = ?').bind(linkId),
  ];
  for (const id of new Set(libraryPixelIds)) {
    statements.push(
      env.DB.prepare('INSERT INTO link_pixels (link_id, library_pixel_id, created_at) VALUES (?, ?, ?)').bind(linkId, id, now)
    );
  }
  return statements;
}

/** Replace a link's attachments atomically (one D1 batch). [] clears. Duplicates dropped. */
export async function setLinkPixels(env: Env, linkId: string, libraryPixelIds: string[]): Promise<void> {
  await env.DB.batch(buildSetLinkPixelsStatements(env, linkId, libraryPixelIds));
}

/** KV cache keys (domain + slug) of every link using a library pixel. */
export async function getLinkCacheKeysForPixel(
  env: Env,
  libraryPixelId: string
): Promise<Array<{ domain_name: string; slug: string }>> {
  const result = await env.DB.prepare(
    `SELECT d.domain_name, l.slug
     FROM link_pixels lp
     JOIN links l ON l.id = lp.link_id
     JOIN domains d ON d.id = l.domain_id
     WHERE lp.library_pixel_id = ?`
  )
    .bind(libraryPixelId)
    .all<{ domain_name: string; slug: string }>();
  return result.results || [];
}

/**
 * Attach a library pixel to every non-deleted link of its domain that lacks it and has
 * fewer than maxPerLink pixels. Returns how many were attached and how many were full.
 */
export async function attachPixelToAllLinks(
  env: Env,
  pixel: { id: string; domain_id: string },
  maxPerLink: number
): Promise<{ attached: number; skippedFull: number }> {
  const missingWhere = `l.domain_id = ? AND l.status != 'deleted'
     AND NOT EXISTS (SELECT 1 FROM link_pixels x WHERE x.link_id = l.id AND x.library_pixel_id = ?)`;
  const missing = await env.DB.prepare(`SELECT COUNT(*) AS n FROM links l WHERE ${missingWhere}`)
    .bind(pixel.domain_id, pixel.id)
    .first<number>('n');
  const inserted = await env.DB.prepare(
    `INSERT INTO link_pixels (link_id, library_pixel_id, created_at)
     SELECT l.id, ?, ? FROM links l
     WHERE ${missingWhere}
       AND (SELECT COUNT(*) FROM link_pixels y WHERE y.link_id = l.id) < ?`
  )
    .bind(pixel.id, Date.now(), pixel.domain_id, pixel.id, maxPerLink)
    .run();
  const attached = Number(inserted.meta?.changes ?? 0);
  return { attached, skippedFull: (missing || 0) - attached };
}

export async function detachPixelFromAllLinks(env: Env, libraryPixelId: string): Promise<number> {
  const r = await env.DB.prepare('DELETE FROM link_pixels WHERE library_pixel_id = ?').bind(libraryPixelId).run();
  return Number(r.meta?.changes ?? 0);
}

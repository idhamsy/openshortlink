/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Open Graph / Twitter Card metadata DB access (one row per link)

import type { Env } from '../types';
import { generateId } from '../utils/id';

export interface LinkOgMeta {
  id: string;
  link_id: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  og_type: string;
  twitter_card: string;
  created_at: number;
  updated_at: number;
}

export interface OgMetaInput {
  og_title?: string;
  og_description?: string;
  og_image?: string;
  og_type?: string;
  twitter_card?: string;
}

export async function getOgMeta(env: Env, linkId: string): Promise<LinkOgMeta | null> {
  const result = await env.DB.prepare('SELECT * FROM link_og_meta WHERE link_id = ?')
    .bind(linkId)
    .first<LinkOgMeta>();
  return result || null;
}

export async function upsertOgMeta(env: Env, linkId: string, meta: OgMetaInput): Promise<void> {
  const id = generateId('og');
  const now = Date.now();
  const ogType = meta.og_type || 'website';
  const twitterCard = meta.twitter_card || 'summary_large_image';
  await env.DB.prepare(
    `INSERT INTO link_og_meta
       (id, link_id, og_title, og_description, og_image, og_type, twitter_card, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(link_id) DO UPDATE SET
       og_title = ?, og_description = ?, og_image = ?, og_type = ?, twitter_card = ?, updated_at = ?`
  )
    .bind(
      id, linkId,
      meta.og_title ?? null, meta.og_description ?? null, meta.og_image ?? null, ogType, twitterCard,
      now, now,
      meta.og_title ?? null, meta.og_description ?? null, meta.og_image ?? null, ogType, twitterCard, now
    )
    .run();
}

export async function clearOgMeta(env: Env, linkId: string): Promise<void> {
  await env.DB.prepare('DELETE FROM link_og_meta WHERE link_id = ?').bind(linkId).run();
}

/** Batch fetch for the link list endpoint. Map of link_id -> meta. */
export async function getLinksOgMetaBatch(
  env: Env,
  linkIds: string[]
): Promise<Map<string, LinkOgMeta>> {
  const map = new Map<string, LinkOgMeta>();
  if (linkIds.length === 0) return map;
  const placeholders = linkIds.map(() => '?').join(',');
  const result = await env.DB.prepare(
    `SELECT * FROM link_og_meta WHERE link_id IN (${placeholders})`
  )
    .bind(...linkIds)
    .all<LinkOgMeta>();
  for (const row of result.results || []) {
    map.set(row.link_id, row);
  }
  return map;
}

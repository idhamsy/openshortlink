/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Per-domain pixel library DB access

import type { Env } from '../types';
import type { PixelType } from '../utils/pixelIds';
import { generateId } from '../utils/id';

export interface LibraryPixel {
  id: string;
  domain_id: string;
  name: string;
  pixel_type: PixelType;
  pixel_id: string;
  is_default: number;
  created_at: number;
  updated_at: number;
  created_by: string | null;
}

export interface LibraryPixelWithCount extends LibraryPixel {
  link_count: number;
}

export async function listLibraryPixels(env: Env, domainId: string): Promise<LibraryPixelWithCount[]> {
  const result = await env.DB.prepare(
    `SELECT p.*, (SELECT COUNT(*) FROM link_pixels lp WHERE lp.library_pixel_id = p.id) AS link_count
     FROM pixel_library p WHERE p.domain_id = ? ORDER BY p.name`
  )
    .bind(domainId)
    .all<LibraryPixelWithCount>();
  return result.results || [];
}

export async function countLibraryPixels(env: Env, domainId: string): Promise<number> {
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM pixel_library WHERE domain_id = ?')
    .bind(domainId)
    .first<number>('n');
  return n || 0;
}

export async function countDefaultPixels(env: Env, domainId: string, excludeId?: string): Promise<number> {
  const n = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM pixel_library WHERE domain_id = ? AND is_default = 1 AND id != ?'
  )
    .bind(domainId, excludeId ?? '')
    .first<number>('n');
  return n || 0;
}

export async function getLibraryPixel(env: Env, id: string): Promise<LibraryPixel | null> {
  return (await env.DB.prepare('SELECT * FROM pixel_library WHERE id = ?').bind(id).first<LibraryPixel>()) || null;
}

export async function getLibraryPixelsByIds(env: Env, ids: string[]): Promise<LibraryPixel[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const result = await env.DB.prepare(`SELECT * FROM pixel_library WHERE id IN (${placeholders})`)
    .bind(...ids)
    .all<LibraryPixel>();
  return result.results || [];
}

export async function getDefaultPixelIds(env: Env, domainId: string): Promise<string[]> {
  const result = await env.DB.prepare(
    'SELECT id FROM pixel_library WHERE domain_id = ? AND is_default = 1 ORDER BY name'
  )
    .bind(domainId)
    .all<{ id: string }>();
  return (result.results || []).map((r) => r.id);
}

export async function createLibraryPixel(
  env: Env,
  input: { domain_id: string; name: string; pixel_type: PixelType; pixel_id: string; is_default: boolean; created_by?: string | null }
): Promise<LibraryPixel> {
  const now = Date.now();
  const row: LibraryPixel = {
    id: generateId('pxl'),
    domain_id: input.domain_id,
    name: input.name,
    pixel_type: input.pixel_type,
    pixel_id: input.pixel_id,
    is_default: input.is_default ? 1 : 0,
    created_at: now,
    updated_at: now,
    created_by: input.created_by ?? null,
  };
  await env.DB.prepare(
    `INSERT INTO pixel_library (id, domain_id, name, pixel_type, pixel_id, is_default, created_at, updated_at, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(row.id, row.domain_id, row.name, row.pixel_type, row.pixel_id, row.is_default, now, now, row.created_by)
    .run();
  return row;
}

export async function updateLibraryPixel(
  env: Env,
  id: string,
  patch: { name?: string; pixel_type?: PixelType; pixel_id?: string; is_default?: boolean }
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];
  if (patch.name !== undefined) { fields.push('name = ?'); values.push(patch.name); }
  if (patch.pixel_type !== undefined) { fields.push('pixel_type = ?'); values.push(patch.pixel_type); }
  if (patch.pixel_id !== undefined) { fields.push('pixel_id = ?'); values.push(patch.pixel_id); }
  if (patch.is_default !== undefined) { fields.push('is_default = ?'); values.push(patch.is_default ? 1 : 0); }
  fields.push('updated_at = ?');
  values.push(Date.now(), id);
  await env.DB.prepare(`UPDATE pixel_library SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
}

export async function deleteLibraryPixel(env: Env, id: string): Promise<void> {
  // link_pixels rows go via ON DELETE CASCADE.
  await env.DB.prepare('DELETE FROM pixel_library WHERE id = ?').bind(id).run();
}

/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Database operations for tags

import type { Tag, Env } from '../types';
import { generateId } from '../utils/id';

export async function listTags(
  env: Env,
  options: {
    domainId?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<Tag[]> {
  let query = 'SELECT * FROM tags';
  const params: unknown[] = [];

  if (options.domainId) {
    query += ' WHERE domain_id = ?';
    params.push(options.domainId);
  }

  query += ' ORDER BY name ASC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  const result = await env.DB.prepare(query).bind(...params).all<Tag>();
  return result.results || [];
}

export async function countTags(env: Env, domainId?: string): Promise<number> {
  let query = 'SELECT COUNT(*) as count FROM tags';
  const params: unknown[] = [];

  if (domainId) {
    query += ' WHERE domain_id = ?';
    params.push(domainId);
  }

  const result = await env.DB.prepare(query).bind(...params).first<{ count: number }>();
  return result?.count || 0;
}

export async function getTagById(env: Env, tagId: string): Promise<Tag | null> {
  const result = await env.DB.prepare('SELECT * FROM tags WHERE id = ?').bind(tagId).first<Tag>();
  return result || null;
}

export async function createTag(
  env: Env,
  tag: Omit<Tag, 'id' | 'created_at'>
): Promise<Tag> {
  const id = generateId('tag');
  const now = Date.now();

  // Try using RETURNING clause
  try {
    const result = await env.DB.prepare(
      `INSERT INTO tags (id, name, domain_id, color, created_at) VALUES (?, ?, ?, ?, ?) RETURNING *`
    )
      .bind(id, tag.name, tag.domain_id || null, tag.color || null, now)
      .first<Tag>();

    if (result) {
      return result;
    }
  } catch {
    // RETURNING not supported, fall back to SELECT
  }

  // Fallback: Use SELECT
  await env.DB.prepare(
    `INSERT INTO tags (id, name, domain_id, color, created_at) VALUES (?, ?, ?, ?, ?)`
  )
    .bind(id, tag.name, tag.domain_id || null, tag.color || null, now)
    .run();

  return getTagById(env, id) as Promise<Tag>;
}

export async function updateTag(
  env: Env,
  tagId: string,
  updates: Partial<Omit<Tag, 'id' | 'created_at'>>
): Promise<Tag | null> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.color !== undefined) {
    fields.push('color = ?');
    values.push(updates.color);
  }

  if (fields.length === 0) {
    return getTagById(env, tagId);
  }

  values.push(tagId);

  // Try using RETURNING clause
  try {
    const result = await env.DB.prepare(
      `UPDATE tags SET ${fields.join(', ')} WHERE id = ? RETURNING *`
    ).bind(...values).first<Tag>();

    if (result) {
      return result;
    }
  } catch {
    // RETURNING not supported, fall back to SELECT
  }

  // Fallback: Use SELECT
  await env.DB.prepare(`UPDATE tags SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();

  return getTagById(env, tagId);
}

export async function deleteTag(env: Env, tagId: string): Promise<boolean> {
  const result = await env.DB.prepare('DELETE FROM tags WHERE id = ?').bind(tagId).run();
  return result.success;
}

// Link-Tag relationships
export async function getLinkTags(env: Env, linkId: string): Promise<Tag[]> {
  const result = await env.DB.prepare(
    `SELECT t.* FROM tags t
     INNER JOIN link_tags lt ON t.id = lt.tag_id
     WHERE lt.link_id = ?
     ORDER BY t.name ASC`
  )
    .bind(linkId)
    .all<Tag>();

  return result.results || [];
}

/**
 * Batch fetch tags for multiple links (optimized to avoid N+1 queries)
 * Returns a Map where key is link_id and value is array of tags
 */
export async function getLinksTagsBatch(
  env: Env,
  linkIds: string[]
): Promise<Map<string, Tag[]>> {
  if (linkIds.length === 0) {
    return new Map();
  }

  // Chunk linkIds to avoid "too many SQL variables" error
  // SQLite limit varies, but 100 is a safe conservative batch size
  const BATCH_SIZE = 100;
  const chunks = [];
  for (let i = 0; i < linkIds.length; i += BATCH_SIZE) {
    chunks.push(linkIds.slice(i, i + BATCH_SIZE));
  }

  // Execute queries in parallel
  const results = await Promise.all(
    chunks.map(async (chunkIds) => {
      const placeholders = chunkIds.map(() => '?').join(',');
      const result = await env.DB.prepare(
        `SELECT 
          lt.link_id,
          t.id, t.name, t.domain_id, t.color, t.created_at
        FROM link_tags lt
        INNER JOIN tags t ON lt.tag_id = t.id
        WHERE lt.link_id IN (${placeholders})
        ORDER BY lt.link_id, t.name ASC`
      ).bind(...chunkIds).all<{
        link_id: string;
        id: string;
        name: string;
        domain_id: string | null;
        color: string | null;
        created_at: number;
      }>();
      return result.results || [];
    })
  );

  // Group tags by link_id
  const tagsMap = new Map<string, Tag[]>();

  // Flatten results
  const allRows = results.flat();

  for (const row of allRows) {
    if (!row || !row.link_id || !row.id) {
      continue; // Skip invalid rows
    }
    if (!tagsMap.has(row.link_id)) {
      tagsMap.set(row.link_id, []);
    }
    tagsMap.get(row.link_id)!.push({
      id: row.id,
      name: row.name || '',
      domain_id: row.domain_id ?? undefined,
      color: row.color ?? undefined,
      created_at: row.created_at,
    });
  }

  return tagsMap;
}

export async function setLinkTags(env: Env, linkId: string, tagIds: string[]): Promise<void> {
  // Delete existing tags
  await env.DB.prepare('DELETE FROM link_tags WHERE link_id = ?').bind(linkId).run();

  // Insert new tags
  if (tagIds.length > 0) {
    const stmt = env.DB.prepare('INSERT INTO link_tags (link_id, tag_id) VALUES (?, ?)');
    for (const tagId of tagIds) {
      await stmt.bind(linkId, tagId).run();
    }
  }
}


/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Database operations for links

import type { Link, Env } from '../types';
import { generateId } from '../utils/id';

export async function getLinkBySlug(
  env: Env,
  domainId: string,
  slug: string
): Promise<Link | null> {
  const result = await env.DB.prepare(
    `SELECT * FROM links WHERE domain_id = ? AND slug = ? AND status != 'deleted'`
  )
    .bind(domainId, slug)
    .first<Link>();

  return result || null;
}

export async function getLinkById(env: Env, linkId: string): Promise<Link | null> {
  const result = await env.DB.prepare(`SELECT * FROM links WHERE id = ? AND status != 'deleted'`).bind(linkId).first<Link>();
  return result || null;
}

// Get link by ID including deleted links (for admin/restore operations)
export async function getLinkByIdIncludingDeleted(env: Env, linkId: string): Promise<Link | null> {
  const result = await env.DB.prepare(`SELECT * FROM links WHERE id = ?`).bind(linkId).first<Link>();
  return result || null;
}

export async function createLink(env: Env, link: Omit<Link, 'id' | 'created_at' | 'updated_at'>): Promise<Link> {
  const id = generateId('link');
  const now = Date.now();

  // Try using RETURNING clause (SQLite 3.35.0+ / D1 supports it)
  try {
    const result = await env.DB.prepare(
      `INSERT INTO links (
        id, domain_id, slug, destination_url, title, description, redirect_code,
        status, expires_at, password_hash, metadata, category_id, click_count, unique_visitors,
        created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *`
    )
      .bind(
        id,
        link.domain_id,
        link.slug,
        link.destination_url,
        link.title || null,
        link.description || null,
        link.redirect_code,
        link.status,
        link.expires_at || null,
        link.password_hash || null,
        link.metadata || null,
        link.category_id || null, // Use category_id column
        link.click_count || 0,
        link.unique_visitors || 0,
        now,
        now,
        link.created_by || null
      )
      .first<Link>();

    if (result) {
      return result;
    }
  } catch {
    // RETURNING not supported, fall back to SELECT
  }

  // Fallback: Use SELECT (only if RETURNING not available)
  await env.DB.prepare(
    `INSERT INTO links (
      id, domain_id, slug, destination_url, title, description, redirect_code,
      status, expires_at, password_hash, metadata, category_id, click_count, unique_visitors,
      created_at, updated_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      link.domain_id,
      link.slug,
      link.destination_url,
      link.title || null,
      link.description || null,
      link.redirect_code,
      link.status,
      link.expires_at || null,
      link.password_hash || null,
      link.metadata || null,
      link.category_id || null, // Use category_id column
      link.click_count || 0,
      link.unique_visitors || 0,
      now,
      now,
      link.created_by || null
    )
    .run();

  return getLinkById(env, id) as Promise<Link>;
}

export async function updateLink(
  env: Env,
  linkId: string,
  updates: Partial<Omit<Link, 'id' | 'created_at' | 'domain_id' | 'slug'>>
): Promise<Link | null> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.destination_url !== undefined) {
    fields.push('destination_url = ?');
    values.push(updates.destination_url);
  }
  if (updates.title !== undefined) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.redirect_code !== undefined) {
    fields.push('redirect_code = ?');
    values.push(updates.redirect_code);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.expires_at !== undefined) {
    fields.push('expires_at = ?');
    values.push(updates.expires_at);
  }
  if (updates.metadata !== undefined) {
    fields.push('metadata = ?');
    values.push(updates.metadata);
  }
  if (updates.category_id !== undefined) {
    // Update category_id column
    fields.push('category_id = ?');
    values.push(updates.category_id);
  }

  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(linkId);

  await env.DB.prepare(`UPDATE links SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();

  return getLinkById(env, linkId);
}

export async function deleteLink(env: Env, linkId: string, hardDelete = false): Promise<boolean> {
  if (hardDelete) {
    const result = await env.DB.prepare(`DELETE FROM links WHERE id = ?`).bind(linkId).run();
    return result.success;
  } else {
    const result = await env.DB.prepare(`UPDATE links SET status = 'deleted' WHERE id = ?`)
      .bind(linkId)
      .run();
    return result.success;
  }
}

export async function listLinks(
  env: Env,
  options: {
    domainId?: string;
    domainIds?: string[]; // NEW: Support multiple domains for database-level filtering
    status?: string;
    limit?: number;
    offset?: number;
    search?: string;
    categoryId?: string;
  } = {}
): Promise<Link[]> {
  // Early return if domainIds is explicitly an empty array (user has no domain access)
  if (options.domainIds && options.domainIds.length === 0) {
    return [];
  }

  let query = `
    SELECT l.*, d.domain_name
    FROM links l 
    JOIN domains d ON l.domain_id = d.id 
    WHERE l.status != ? AND d.status = 'active'
  `;
  const params: unknown[] = ['deleted'];

  // Support multiple domains (for database-level filtering) or single domain
  if (options.domainIds && options.domainIds.length > 0) {
    // Use IN clause for multiple domains
    const placeholders = options.domainIds.map(() => '?').join(',');
    query += ` AND domain_id IN (${placeholders})`;
    params.push(...options.domainIds);
  } else if (options.domainId) {
    // Single domain (backward compatible)
    query += ' AND domain_id = ?';
    params.push(options.domainId);
  }
  if (options.status) {
    query += ' AND l.status = ?';
    params.push(options.status);
  }
  if (options.search) {
    query += ' AND (title LIKE ? OR slug LIKE ? OR destination_url LIKE ?)';
    const searchTerm = `%${options.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  if (options.categoryId) {
    query += ' AND l.category_id = ?';
    params.push(options.categoryId);
  }

  query += ' ORDER BY created_at DESC';
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  const result = await env.DB.prepare(query).bind(...params).all<Link>();
  return result.results || [];
}

export async function countLinks(
  env: Env,
  options: {
    domainId?: string;
    domainIds?: string[]; // NEW: Support multiple domains
    status?: string;
    search?: string;
    tagId?: string;
    categoryId?: string;
  } = {}
): Promise<number> {
  // Early return if domainIds is explicitly an empty array (user has no domain access)
  if (options.domainIds && options.domainIds.length === 0) {
    return 0;
  }

  let query = `
    SELECT COUNT(*) as count 
    FROM links l
    JOIN domains d ON l.domain_id = d.id
    WHERE l.status != ? AND d.status = 'active'
  `;
  const params: unknown[] = ['deleted'];

  // Support multiple domains or single domain
  if (options.domainIds && options.domainIds.length > 0) {
    const placeholders = options.domainIds.map(() => '?').join(',');
    query += ` AND l.domain_id IN (${placeholders})`;
    params.push(...options.domainIds);
  } else if (options.domainId) {
    query += ' AND l.domain_id = ?';
    params.push(options.domainId);
  }
  if (options.status) {
    query += ' AND l.status = ?';
    params.push(options.status);
  }
  if (options.search) {
    query += ' AND (l.title LIKE ? OR l.slug LIKE ? OR l.destination_url LIKE ?)';
    const searchTerm = `%${options.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  if (options.categoryId) {
    query += ' AND l.category_id = ?';
    params.push(options.categoryId);
  }

  const result = await env.DB.prepare(query).bind(...params).first<{ count: number }>();
  return result?.count || 0;
}

export async function incrementClickCount(env: Env, linkId: string): Promise<void> {
  await env.DB.prepare(`UPDATE links SET click_count = click_count + 1 WHERE id = ?`)
    .bind(linkId)
    .run();
}

/**
 * Update unique visitors count for a link
 * This should be called during aggregation when unique visitors are calculated
 */
export async function updateUniqueVisitors(env: Env, linkId: string, uniqueVisitors: number): Promise<void> {
  await env.DB.prepare(`UPDATE links SET unique_visitors = ? WHERE id = ?`)
    .bind(uniqueVisitors, linkId)
    .run();
}

/**
 * Get link IDs filtered by domains, tags, and categories
 * Used for analytics filtering
 */
export async function getFilteredLinkIds(
  env: Env,
  options: {
    domainIds?: string[];
    tagIds?: string[];
    categoryIds?: string[];
    linkIds?: string[];
    status?: string;
  }
): Promise<string[]> {
  // Start with base query
  let query = `
    SELECT DISTINCT l.id
    FROM links l
    WHERE l.status != 'deleted'
  `;
  const params: unknown[] = [];

  // Filter by status
  if (options.status) {
    query += ' AND l.status = ?';
    params.push(options.status);
  }

  // Filter by specific link IDs
  if (options.linkIds && options.linkIds.length > 0) {
    const placeholders = options.linkIds.map(() => '?').join(',');
    query += ` AND l.id IN (${placeholders})`;
    params.push(...options.linkIds);
  }

  // Filter by domains
  if (options.domainIds && options.domainIds.length > 0) {
    const placeholders = options.domainIds.map(() => '?').join(',');
    query += ` AND l.domain_id IN (${placeholders})`;
    params.push(...options.domainIds);
  }

  // Filter by tags (links must have ALL specified tags)
  if (options.tagIds && options.tagIds.length > 0) {
    query += ` AND EXISTS (
      SELECT 1 FROM link_tags lt
      WHERE lt.link_id = l.id AND lt.tag_id IN (${options.tagIds.map(() => '?').join(',')})
      GROUP BY lt.link_id
      HAVING COUNT(DISTINCT lt.tag_id) = ?
    )`;
    params.push(...options.tagIds, options.tagIds.length);
  }

  // OPTIMIZATION: Filter by categories using indexed category_id column (O(log N))
  // Old implementation used json_extract() which was O(N)
  if (options.categoryIds && options.categoryIds.length > 0) {
    const placeholders = options.categoryIds.map(() => '?').join(',');
    query += ` AND l.category_id IN (${placeholders})`;
    params.push(...options.categoryIds);
  }

  const result = await env.DB.prepare(query).bind(...params).all<{ id: string }>();
  return (result.results || []).map(row => row.id);
}

export async function checkSlugExists(env: Env, domainId: string, slug: string): Promise<boolean> {
  const result = await env.DB.prepare(
    `SELECT 1 FROM links WHERE domain_id = ? AND slug = ? AND status != 'deleted' LIMIT 1`
  )
    .bind(domainId, slug)
    .first();

  return !!result;
}

/**
 * List links with tag filtering using JOIN (optimized for database-level filtering)
 * Returns both links and total count
 */
export async function listLinksWithTagFilter(
  env: Env,
  options: {
    domainId?: string;
    domainIds?: string[];
    status?: string;
    limit?: number;
    offset?: number;
    search?: string;
    tagId?: string;
    categoryId?: string;
  } = {}
): Promise<{ links: Link[]; totalCount: number }> {
  // Early return if domainIds is explicitly an empty array (user has no domain access)
  if (options.domainIds && options.domainIds.length === 0) {
    return { links: [], totalCount: 0 };
  }

  // Build query with JOINs for database-level filtering
  let query = `
    SELECT DISTINCT l.*, d.domain_name
    FROM links l
    JOIN domains d ON l.domain_id = d.id
  `;
  const params: unknown[] = [];

  // Add tag JOIN if filtering by tag
  if (options.tagId) {
    query += `
      INNER JOIN link_tags lt ON l.id = lt.link_id
      INNER JOIN tags t ON lt.tag_id = t.id
    `;
  }

  // Base WHERE conditions - filter deleted links and inactive domains
  query += ` WHERE l.status != 'deleted' AND d.status = 'active'`;

  // Domain filtering
  if (options.domainIds && options.domainIds.length > 0) {
    const placeholders = options.domainIds.map(() => '?').join(',');
    query += ` AND l.domain_id IN (${placeholders})`;
    params.push(...options.domainIds);
  } else if (options.domainId) {
    query += ` AND l.domain_id = ?`;
    params.push(options.domainId);
  }

  // Status filtering
  if (options.status) {
    query += ` AND l.status = ?`;
    params.push(options.status);
  }

  // Search filtering
  if (options.search) {
    query += ` AND (l.title LIKE ? OR l.slug LIKE ? OR l.destination_url LIKE ?)`;
    const searchTerm = `%${options.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  // Tag filtering (only active tags - tags don't have status, so we just check existence)
  if (options.tagId) {
    query += ` AND t.id = ?`;
    params.push(options.tagId);
  }

  // Category filtering
  if (options.categoryId) {
    query += ` AND l.category_id = ?`;
    params.push(options.categoryId);
  }

  // Get total count (before pagination)
  const countQuery = query.replace('SELECT DISTINCT l.*', 'SELECT COUNT(DISTINCT l.id) as count');
  const countResult = await env.DB.prepare(countQuery).bind(...params).first<{ count: number }>();
  const totalCount = countResult?.count || 0;

  // Add ordering and pagination
  query += ` ORDER BY l.created_at DESC`;
  if (options.limit) {
    query += ` LIMIT ?`;
    params.push(options.limit);
    if (options.offset) {
      query += ` OFFSET ?`;
      params.push(options.offset);
    }
  }

  const result = await env.DB.prepare(query).bind(...params).all<Link>();
  const links = result.results || [];

  return { links, totalCount };
}

// Status Check Operations

// Get links that need status checking (prioritized by next_check_at)
export async function getLinksForStatusCheck(
  env: Env,
  batchSize: number = 100
): Promise<Link[]> {
  const now = Date.now();

  const result = await env.DB.prepare(
    `SELECT * FROM links 
     WHERE status = 'active' 
       AND (next_status_check_at IS NULL OR next_status_check_at <= ?)
     ORDER BY 
       CASE 
         WHEN next_status_check_at IS NULL THEN 0  -- Never checked (highest priority)
         ELSE 1
       END,
       next_status_check_at ASC
     LIMIT ?`
  )
    .bind(now, batchSize)
    .all<Link>();

  return result.results || [];
}

// Get top 100 links by click count for daily checking
export async function getTopLinksForDailyCheck(
  env: Env,
  limit: number = 100
): Promise<Link[]> {
  const result = await env.DB.prepare(
    `SELECT * FROM links 
     WHERE status = 'active'
     ORDER BY click_count DESC, unique_visitors DESC
     LIMIT ?`
  )
    .bind(limit)
    .all<Link>();

  return result.results || [];
}

// Update link after status check
export async function updateLinkStatusCheck(
  env: Env,
  linkId: string,
  statusCode: number | null,
  responseTimeMs: number | null,
  frequencyMs: number
): Promise<void> {
  const now = Date.now();
  const nextCheckAt = now + frequencyMs;

  await env.DB.prepare(
    `UPDATE links 
     SET last_status_check_at = ?,
         last_status_code = ?,
         next_status_check_at = ?,
         updated_at = ?
     WHERE id = ?`
  )
    .bind(now, statusCode, nextCheckAt, now, linkId)
    .run();
}

// Record status check history
export async function recordStatusCheck(
  env: Env,
  check: {
    link_id: string;
    destination_url: string;
    status_code: number | null;
    response_time_ms: number | null;
    error_message: string | null;
  }
): Promise<void> {
  const id = generateId('status_check');
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO link_status_checks 
     (id, link_id, destination_url, status_code, checked_at, response_time_ms, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      check.link_id,
      check.destination_url,
      check.status_code,
      now,
      check.response_time_ms,
      check.error_message
    )
    .run();
}

// Get links by status code with pagination
export async function getLinksByStatusCode(
  env: Env,
  statusCode: number,
  options: {
    domainId?: string;
    destinationUrl?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ links: Link[]; total: number }> {
  let query = `
    SELECT l.*, l.last_status_code, l.last_status_check_at
    FROM links l
    WHERE l.status != 'deleted' AND l.last_status_code = ?
  `;
  const params: unknown[] = [statusCode];

  if (options.domainId) {
    query += ' AND l.domain_id = ?';
    params.push(options.domainId);
  }

  if (options.destinationUrl) {
    query += ' AND l.destination_url LIKE ?';
    params.push(`%${options.destinationUrl}%`);
  }

  // Get total count
  let countQuery = query.replace('SELECT l.*, l.last_status_code, l.last_status_check_at', 'SELECT COUNT(*) as count');
  const countResult = await env.DB.prepare(countQuery).bind(...params).first<{ count: number }>();
  const total = countResult?.count || 0;

  // Add pagination
  query += ' ORDER BY l.last_status_check_at DESC';
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  const result = await env.DB.prepare(query).bind(...params).all<Link>();
  const links = result.results || [];

  return { links, total };
}

// Get links by destination URL
export async function getLinksByDestinationUrl(
  env: Env,
  destinationUrl: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<Link[]> {
  let query = `
    SELECT l.*, l.last_status_code, l.last_status_check_at, d.domain_name
    FROM links l
    JOIN domains d ON l.domain_id = d.id
    WHERE l.status != 'deleted' AND l.destination_url = ?
    ORDER BY l.created_at DESC
  `;
  const params: unknown[] = [destinationUrl];

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  const result = await env.DB.prepare(query).bind(...params).all<Link>();
  return result.results || [];
}

// Get links grouped by destination URL with aggregated stats
export async function getLinksGroupedByDestination(
  env: Env,
  options: {
    domainId?: string;
    statusCode?: number;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{
  destinations: Array<{
    destination_url: string;
    slug_count: number;
    status_code: number | null;
    last_status_check_at: number | null;
    link_ids: string[];
  }>; total: number
}> {
  // Build WHERE clause
  let whereClause = 'WHERE l.status != \'deleted\'';
  const params: unknown[] = [];

  if (options.domainId) {
    whereClause += ' AND l.domain_id = ?';
    params.push(options.domainId);
  }

  if (options.statusCode !== undefined) {
    whereClause += ' AND l.last_status_code = ?';
    params.push(options.statusCode);
  }

  if (options.search) {
    whereClause += ' AND l.destination_url LIKE ?';
    params.push(`%${options.search}%`);
  }

  // Get total count of unique destinations (separate query for reliability)
  const countQuery = `
    SELECT COUNT(DISTINCT l.destination_url) as count
    FROM links l
    ${whereClause}
  `;
  const countResult = await env.DB.prepare(countQuery).bind(...params).first<{ count: number }>();
  const total = countResult?.count || 0;

  // Main query with grouping
  let query = `
    SELECT 
      l.destination_url,
      COUNT(*) as slug_count,
      MAX(l.last_status_code) as status_code,
      MAX(l.last_status_check_at) as last_status_check_at,
      GROUP_CONCAT(l.id) as link_ids
    FROM links l
    ${whereClause}
    GROUP BY l.destination_url
    ORDER BY MAX(l.last_status_check_at) DESC
  `;

  // Add pagination
  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  try {
    const result = await env.DB.prepare(query).bind(...params).all<{
      destination_url: string;
      slug_count: number;
      status_code: number | null;
      last_status_check_at: number | null;
      link_ids: string | null;
    }>();

    const destinations = (result.results || []).map(row => ({
      destination_url: row.destination_url || '',
      slug_count: row.slug_count || 0,
      status_code: row.status_code ?? null,
      last_status_check_at: row.last_status_check_at ?? null,
      link_ids: row.link_ids ? row.link_ids.split(',') : [],
    }));

    return { destinations, total: total || 0 };
  } catch (error: any) {
    console.error('Error in getLinksGroupedByDestination:', error);
    // Return empty result instead of throwing to prevent breaking the UI
    return { destinations: [], total: 0 };
  }
}

// Get status summary (count by status code)
export async function getStatusSummary(env: Env, domainId?: string): Promise<Record<string, number>> {
  let query = `
    SELECT last_status_code, COUNT(*) as count
    FROM links
    WHERE status != 'deleted' AND last_status_code IS NOT NULL
  `;
  const params: unknown[] = [];

  if (domainId) {
    query += ' AND domain_id = ?';
    params.push(domainId);
  }

  query += ' GROUP BY last_status_code';

  const result = await env.DB.prepare(query).bind(...params).all<{ last_status_code: number; count: number }>();

  const summary: Record<string, number> = {};
  result.results?.forEach(row => {
    summary[row.last_status_code.toString()] = row.count;
  });

  return summary;
}


/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Database operations for analytics aggregations

import type { Env, AnalyticsDaily, AnalyticsGeo, AnalyticsReferrer, AnalyticsDevice, AnalyticsUtm, AnalyticsCustomParam } from '../types';
import { generateId } from '../utils/id';

/**
 * Get daily analytics for a link
 */
export async function getDailyAnalytics(
  env: Env,
  linkId: string,
  startDate?: string,
  endDate?: string
): Promise<AnalyticsDaily[]> {
  let query = 'SELECT * FROM analytics_daily WHERE link_id = ?';
  const params: unknown[] = [linkId];

  if (startDate) {
    query += ' AND date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY date DESC';

  const result = await env.DB.prepare(query).bind(...params).all<AnalyticsDaily>();
  return result.results || [];
}

/**
 * Get daily analytics aggregated by date, filtered by domain/tags/categories
 * Much more efficient - only queries links with analytics data, filtered by domain access
 */
export async function getDailyAnalyticsByDomains(
  env: Env,
  filters: {
    domainIds?: string[];
    tagIds?: string[];
    categoryIds?: string[];
    linkIds?: string[];
  },
  startDate?: string,
  endDate?: string
): Promise<AnalyticsDaily[]> {
  // Build query with JOIN to filter by domain access and aggregate by date
  let query = `
    SELECT 
      ad.date,
      SUM(ad.clicks) as clicks,
      MAX(ad.unique_visitors) as unique_visitors
    FROM analytics_daily ad
    INNER JOIN links l ON ad.link_id = l.id
    WHERE l.status != 'deleted'
  `;
  const params: unknown[] = [];

  // Filter by domain IDs if provided
  if (filters.domainIds && filters.domainIds.length > 0) {
    const placeholders = filters.domainIds.map(() => '?').join(',');
    query += ` AND l.domain_id IN (${placeholders})`;
    params.push(...filters.domainIds);
  }

  // Filter by tags (prefer over linkIds to avoid SQLite variable limit)
  if (filters.tagIds && filters.tagIds.length > 0) {
    query += ` AND EXISTS (
      SELECT 1 FROM link_tags lt
      WHERE lt.link_id = l.id AND lt.tag_id IN (${filters.tagIds.map(() => '?').join(',')})
      GROUP BY lt.link_id
      HAVING COUNT(DISTINCT lt.tag_id) = ?
    )`;
    params.push(...filters.tagIds, filters.tagIds.length);
  }

  // Filter by categories (prefer over linkIds to avoid SQLite variable limit)
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    const placeholders = filters.categoryIds.map(() => '?').join(',');
    query += ` AND l.category_id IN (${placeholders})`;
    params.push(...filters.categoryIds);
  }

  // Filter by specific link IDs (only if no domainIds/tagIds/categoryIds to avoid SQLite limit)
  // If we have domainIds/tagIds/categoryIds, they already filter the links, so linkIds is redundant
  if (filters.linkIds && filters.linkIds.length > 0 && 
      (!filters.domainIds || filters.domainIds.length === 0) &&
      (!filters.tagIds || filters.tagIds.length === 0) &&
      (!filters.categoryIds || filters.categoryIds.length === 0)) {
    // Batch if too many linkIds to avoid SQLite 999 variable limit
    const BATCH_SIZE = 500;
    if (filters.linkIds.length <= BATCH_SIZE) {
      const placeholders = filters.linkIds.map(() => '?').join(',');
      query += ` AND l.id IN (${placeholders})`;
      params.push(...filters.linkIds);
    } else {
      // For large arrays, we need to batch - but this function doesn't support batching
      // So we'll use the first batch and log a warning
      // DEBUG: console.warn('[ANALYTICS] Large linkIds array, truncating to first 500 to avoid SQLite limit');
      const placeholders = filters.linkIds.slice(0, BATCH_SIZE).map(() => '?').join(',');
      query += ` AND l.id IN (${placeholders})`;
      params.push(...filters.linkIds.slice(0, BATCH_SIZE));
    }
  }

  if (startDate) {
    query += ' AND ad.date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND ad.date <= ?';
    params.push(endDate);
  }

  query += ' GROUP BY ad.date ORDER BY ad.date DESC';

  const result = await env.DB.prepare(query).bind(...params).all<{
    date: string;
    clicks: number;
    unique_visitors: number;
  }>();

  // Map to AnalyticsDaily format
  return (result.results || []).map(row => ({
    id: '', // Not needed for aggregated results
    link_id: '', // Not needed for aggregated results
    date: row.date,
    clicks: row.clicks,
    unique_visitors: row.unique_visitors,
    created_at: 0, // Not needed for aggregated results
  }));
}

/**
 * Get daily analytics for multiple links
 * Batches queries to avoid SQLite variable limit (999)
 * @deprecated Use getDailyAnalyticsByDomains instead for better performance
 */
/**
 * Get daily analytics for a list of link IDs
 * @deprecated Prefer getDailyAnalyticsByDomains for better performance with large datasets
 * This function uses batching but still requires multiple queries for large link lists
 */
export async function getDailyAnalyticsForLinks(
  env: Env,
  linkIds: string[],
  startDate?: string,
  endDate?: string
): Promise<AnalyticsDaily[]> {
  if (linkIds.length === 0) {
    return [];
  }

  // SQLite has a limit of ~999 variables, so batch queries if needed
  const BATCH_SIZE = 500; // Safe batch size (leave room for date params)
  const results: AnalyticsDaily[] = [];

  for (let i = 0; i < linkIds.length; i += BATCH_SIZE) {
    const batch = linkIds.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => '?').join(',');
    let query = `SELECT * FROM analytics_daily WHERE link_id IN (${placeholders})`;
    const params: unknown[] = [...batch];

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY date DESC';

    const result = await env.DB.prepare(query).bind(...params).all<AnalyticsDaily>();
    if (result.results) {
      results.push(...result.results);
    }
  }

  return results;
}

/**
 * Upsert daily analytics aggregation
 */
export async function upsertDailyAnalytics(
  env: Env,
  linkId: string,
  date: string,
  clicks: number,
  uniqueVisitors: number
): Promise<void> {
  const id = generateId('analytics_daily');
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO analytics_daily (id, link_id, date, clicks, unique_visitors, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(link_id, date) DO UPDATE SET
       clicks = excluded.clicks,
       unique_visitors = excluded.unique_visitors`
  )
    .bind(id, linkId, date, clicks, uniqueVisitors, now)
    .run();
}

/**
 * Get geographic analytics for a link
 */
export async function getGeoAnalytics(
  env: Env,
  options: {
    linkIds?: string[];
    domainIds?: string[];
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<AnalyticsGeo[]> {
  // If neither linkIds nor domainIds provided, return empty
  if ((!options.linkIds || options.linkIds.length === 0) && (!options.domainIds || options.domainIds.length === 0)) {
    return [];
  }

  let query = '';
  const params: unknown[] = [];

  // OPTIMIZATION: Use JOIN if filtering by domain (O(log N))
  if (options.domainIds && options.domainIds.length > 0) {
    query = `
      SELECT ag.* 
      FROM analytics_geo ag
      JOIN links l ON ag.link_id = l.id
      WHERE l.status != 'deleted'
    `;

    const placeholders = options.domainIds.map(() => '?').join(',');
    query += ` AND l.domain_id IN (${placeholders})`;
    params.push(...options.domainIds);
  } else if (options.linkIds && options.linkIds.length > 0) {
    // Fallback to IN clause for specific link IDs
    // Note: This still has the batching limit issue if linkIds is huge, 
    // but callers should prefer domainIds for large sets.
    const placeholders = options.linkIds.map(() => '?').join(',');
    query = `SELECT * FROM analytics_geo WHERE link_id IN (${placeholders})`;
    params.push(...options.linkIds);
  }

  if (options.startDate) {
    query += ' AND date >= ?';
    params.push(options.startDate);
  }

  if (options.endDate) {
    query += ' AND date <= ?';
    params.push(options.endDate);
  }

  query += ' ORDER BY clicks DESC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  const result = await env.DB.prepare(query).bind(...params).all<AnalyticsGeo>();
  return result.results || [];
}

/**
 * Upsert geographic analytics aggregation
 */
export async function upsertGeoAnalytics(
  env: Env,
  linkId: string,
  country: string | null,
  city: string | null,
  date: string,
  clicks: number
): Promise<void> {
  const id = generateId('analytics_geo');
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO analytics_geo (id, link_id, country, city, date, clicks, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(link_id, country, city, date) DO UPDATE SET
       clicks = excluded.clicks`
  )
    .bind(id, linkId, country || null, city || null, date, clicks, now)
    .run();
}

/**
 * Get referrer analytics for a link
 */
export async function getReferrerAnalytics(
  env: Env,
  options: {
    linkIds?: string[];
    domainIds?: string[];
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<AnalyticsReferrer[]> {
  // If neither linkIds nor domainIds provided, return empty
  if ((!options.linkIds || options.linkIds.length === 0) && (!options.domainIds || options.domainIds.length === 0)) {
    return [];
  }

  let query = '';
  const params: unknown[] = [];

  // OPTIMIZATION: Use JOIN if filtering by domain
  if (options.domainIds && options.domainIds.length > 0) {
    query = `
      SELECT ar.* 
      FROM analytics_referrers ar
      JOIN links l ON ar.link_id = l.id
      WHERE l.status != 'deleted'
    `;

    const placeholders = options.domainIds.map(() => '?').join(',');
    query += ` AND l.domain_id IN (${placeholders})`;
    params.push(...options.domainIds);
  } else if (options.linkIds && options.linkIds.length > 0) {
    const placeholders = options.linkIds.map(() => '?').join(',');
    query = `SELECT * FROM analytics_referrers WHERE link_id IN (${placeholders})`;
    params.push(...options.linkIds);
  }

  if (options.startDate) {
    query += ' AND date >= ?';
    params.push(options.startDate);
  }

  if (options.endDate) {
    query += ' AND date <= ?';
    params.push(options.endDate);
  }

  query += ' ORDER BY clicks DESC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  const result = await env.DB.prepare(query).bind(...params).all<AnalyticsReferrer>();
  return result.results || [];
}

/**
 * Upsert referrer analytics aggregation
 */
export async function upsertReferrerAnalytics(
  env: Env,
  linkId: string,
  referrerDomain: string | null,
  date: string,
  clicks: number
): Promise<void> {
  const id = generateId('analytics_referrer');
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO analytics_referrers (id, link_id, referrer_domain, date, clicks, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(link_id, referrer_domain, date) DO UPDATE SET
       clicks = excluded.clicks`
  )
    .bind(id, linkId, referrerDomain || null, date, clicks, now)
    .run();
}

/**
 * Get aggregated analytics summary filtered by domain/tags/categories
 * Much more efficient - queries only links with analytics data, filtered by domain access
 */
export async function getAggregatedSummaryByDomains(
  env: Env,
  filters: {
    domainIds?: string[];
    tagIds?: string[];
    categoryIds?: string[];
    linkIds?: string[];
  },
  startDate?: string,
  endDate?: string
): Promise<{
  total_clicks: number;
  total_unique_visitors: number;
}> {
  // Build query with JOIN to filter by domain access
  let query = `
    SELECT 
      SUM(ad.clicks) as total_clicks,
      SUM(ad.unique_visitors) as total_unique_visitors
    FROM analytics_daily ad
    INNER JOIN links l ON ad.link_id = l.id
    WHERE l.status != 'deleted'
  `;
  const params: unknown[] = [];

  // Filter by domain IDs if provided
  if (filters.domainIds && filters.domainIds.length > 0) {
    const placeholders = filters.domainIds.map(() => '?').join(',');
    query += ` AND l.domain_id IN (${placeholders})`;
    params.push(...filters.domainIds);
  }

  // Filter by tags (prefer over linkIds to avoid SQLite variable limit)
  if (filters.tagIds && filters.tagIds.length > 0) {
    query += ` AND EXISTS (
      SELECT 1 FROM link_tags lt
      WHERE lt.link_id = l.id AND lt.tag_id IN (${filters.tagIds.map(() => '?').join(',')})
      GROUP BY lt.link_id
      HAVING COUNT(DISTINCT lt.tag_id) = ?
    )`;
    params.push(...filters.tagIds, filters.tagIds.length);
  }

  // Filter by categories (prefer over linkIds to avoid SQLite variable limit)
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    const placeholders = filters.categoryIds.map(() => '?').join(',');
    query += ` AND l.category_id IN (${placeholders})`;
    params.push(...filters.categoryIds);
  }

  // Filter by specific link IDs (only if no domainIds/tagIds/categoryIds to avoid SQLite limit)
  // If we have domainIds/tagIds/categoryIds, they already filter the links, so linkIds is redundant
  if (filters.linkIds && filters.linkIds.length > 0 && 
      (!filters.domainIds || filters.domainIds.length === 0) &&
      (!filters.tagIds || filters.tagIds.length === 0) &&
      (!filters.categoryIds || filters.categoryIds.length === 0)) {
    // Batch if too many linkIds to avoid SQLite 999 variable limit
    const BATCH_SIZE = 500;
    if (filters.linkIds.length <= BATCH_SIZE) {
      const placeholders = filters.linkIds.map(() => '?').join(',');
      query += ` AND l.id IN (${placeholders})`;
      params.push(...filters.linkIds);
    } else {
      // For large arrays, we need to batch - but this function doesn't support batching
      // So we'll use the first batch and log a warning
      // DEBUG: console.warn('[ANALYTICS] Large linkIds array, truncating to first 500 to avoid SQLite limit');
      const placeholders = filters.linkIds.slice(0, BATCH_SIZE).map(() => '?').join(',');
      query += ` AND l.id IN (${placeholders})`;
      params.push(...filters.linkIds.slice(0, BATCH_SIZE));
    }
  }

  if (startDate) {
    query += ' AND ad.date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND ad.date <= ?';
    params.push(endDate);
  }

  const result = await env.DB.prepare(query).bind(...params).first<{
    total_clicks: number;
    total_unique_visitors: number;
  }>();

  return {
    total_clicks: result?.total_clicks || 0,
    total_unique_visitors: result?.total_unique_visitors || 0,
  };
}

/**
 * Get aggregated analytics summary for multiple links
 * Batches queries to avoid SQLite variable limit (999)
 * @deprecated Use getAggregatedSummaryByDomains instead for better performance
 */
export async function getAggregatedSummary(
  env: Env,
  linkIds: string[],
  startDate?: string,
  endDate?: string
): Promise<{
  total_clicks: number;
  total_unique_visitors: number;
}> {
  if (linkIds.length === 0) {
    return { total_clicks: 0, total_unique_visitors: 0 };
  }

  // SQLite has a limit of ~999 variables, so batch queries if needed
  const BATCH_SIZE = 500; // Safe batch size (leave room for date params)
  let totalClicks = 0;
  let totalUniqueVisitors = 0;

  for (let i = 0; i < linkIds.length; i += BATCH_SIZE) {
    const batch = linkIds.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => '?').join(',');
    let query = `
      SELECT 
        SUM(clicks) as total_clicks,
        SUM(unique_visitors) as total_unique_visitors
      FROM analytics_daily
      WHERE link_id IN (${placeholders})
    `;
    const params: unknown[] = [...batch];

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    const result = await env.DB.prepare(query).bind(...params).first<{
      total_clicks: number;
      total_unique_visitors: number;
    }>();

    totalClicks += result?.total_clicks || 0;
    totalUniqueVisitors += result?.total_unique_visitors || 0;
  }

  return {
    total_clicks: totalClicks,
    total_unique_visitors: totalUniqueVisitors,
  };
}

/**
 * Get top links by clicks from analytics data, filtered by domain/tags/categories
 * Only returns links that actually have analytics data
 */
export async function getTopLinksByClicks(
  env: Env,
  filters: {
    domainIds?: string[];
    tagIds?: string[];
    categoryIds?: string[];
    linkIds?: string[];
  },
  startDate?: string,
  endDate?: string,
  limit: number = 10
): Promise<Array<{ link_id: string; clicks: number }>> {
  // Build query with JOIN to filter by domain access
  let query = `
    SELECT 
      ad.link_id,
      SUM(ad.clicks) as clicks
    FROM analytics_daily ad
    INNER JOIN links l ON ad.link_id = l.id
    WHERE l.status != 'deleted'
  `;
  const params: unknown[] = [];

  // Filter by domain IDs if provided
  if (filters.domainIds && filters.domainIds.length > 0) {
    const placeholders = filters.domainIds.map(() => '?').join(',');
    query += ` AND l.domain_id IN (${placeholders})`;
    params.push(...filters.domainIds);
  }

  // Filter by tags (prefer over linkIds to avoid SQLite variable limit)
  if (filters.tagIds && filters.tagIds.length > 0) {
    query += ` AND EXISTS (
      SELECT 1 FROM link_tags lt
      WHERE lt.link_id = l.id AND lt.tag_id IN (${filters.tagIds.map(() => '?').join(',')})
      GROUP BY lt.link_id
      HAVING COUNT(DISTINCT lt.tag_id) = ?
    )`;
    params.push(...filters.tagIds, filters.tagIds.length);
  }

  // Filter by categories (prefer over linkIds to avoid SQLite variable limit)
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    const placeholders = filters.categoryIds.map(() => '?').join(',');
    query += ` AND l.category_id IN (${placeholders})`;
    params.push(...filters.categoryIds);
  }

  // Filter by specific link IDs (only if no domainIds/tagIds/categoryIds to avoid SQLite limit)
  // If we have domainIds/tagIds/categoryIds, they already filter the links, so linkIds is redundant
  if (filters.linkIds && filters.linkIds.length > 0 && 
      (!filters.domainIds || filters.domainIds.length === 0) &&
      (!filters.tagIds || filters.tagIds.length === 0) &&
      (!filters.categoryIds || filters.categoryIds.length === 0)) {
    // Batch if too many linkIds to avoid SQLite 999 variable limit
    const BATCH_SIZE = 500;
    if (filters.linkIds.length <= BATCH_SIZE) {
      const placeholders = filters.linkIds.map(() => '?').join(',');
      query += ` AND l.id IN (${placeholders})`;
      params.push(...filters.linkIds);
    } else {
      // For large arrays, we need to batch - but this function doesn't support batching
      // So we'll use the first batch and log a warning
      // DEBUG: console.warn('[ANALYTICS] Large linkIds array, truncating to first 500 to avoid SQLite limit');
      const placeholders = filters.linkIds.slice(0, BATCH_SIZE).map(() => '?').join(',');
      query += ` AND l.id IN (${placeholders})`;
      params.push(...filters.linkIds.slice(0, BATCH_SIZE));
    }
  }

  if (startDate) {
    query += ' AND ad.date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND ad.date <= ?';
    params.push(endDate);
  }

  query += ' GROUP BY ad.link_id ORDER BY clicks DESC LIMIT ?';
  params.push(limit);

  const result = await env.DB.prepare(query).bind(...params).all<{
    link_id: string;
    clicks: number;
  }>();

  return result.results || [];
}

/**
 * Get device analytics for filtered links
 */
export async function getDeviceAnalytics(
  env: Env,
  options: {
    linkIds?: string[];
    domainIds?: string[];
    startDate?: string;
    endDate?: string;
    groupBy?: 'device_type' | 'browser' | 'os' | 'date';
    limit?: number;
  }
): Promise<AnalyticsDevice[]> {
  // If neither linkIds nor domainIds provided, return empty
  if ((!options.linkIds || options.linkIds.length === 0) && (!options.domainIds || options.domainIds.length === 0)) {
    return [];
  }

  let query = '';
  let params: unknown[] = [];
  let whereClause = '';

  // OPTIMIZATION: Use JOIN if filtering by domain
  if (options.domainIds && options.domainIds.length > 0) {
    const placeholders = options.domainIds.map(() => '?').join(',');
    whereClause = `
      JOIN links l ON analytics_devices.link_id = l.id
      WHERE l.status != 'deleted' AND l.domain_id IN (${placeholders})
    `;
    params.push(...options.domainIds);
  } else if (options.linkIds && options.linkIds.length > 0) {
    // Note: If linkIds is very large (>500), this might hit limits. 
    // But since we are refactoring, we assume callers will use domainIds for large sets.
    // For backward compatibility with small sets, we use IN.
    const placeholders = options.linkIds.map(() => '?').join(',');
    whereClause = `WHERE link_id IN (${placeholders})`;
    params.push(...options.linkIds);
  }

  if (options.startDate) {
    whereClause += ' AND date >= ?';
    params.push(options.startDate);
  }

  if (options.endDate) {
    whereClause += ' AND date <= ?';
    params.push(options.endDate);
  }

  // Build Query
  if (options.groupBy) {
    let selectCols = '';
    let groupByCol = '';

    if (options.groupBy === 'device_type') {
      selectCols = 'device_type, SUM(clicks) as clicks, MAX(unique_visitors) as unique_visitors, date';
      groupByCol = 'device_type';
    } else if (options.groupBy === 'browser') {
      selectCols = 'browser, SUM(clicks) as clicks, MAX(unique_visitors) as unique_visitors, date';
      groupByCol = 'browser';
    } else if (options.groupBy === 'os') {
      selectCols = 'os, SUM(clicks) as clicks, MAX(unique_visitors) as unique_visitors, date';
      groupByCol = 'os';
    } else if (options.groupBy === 'date') {
      selectCols = 'date, SUM(clicks) as clicks, MAX(unique_visitors) as unique_visitors';
      groupByCol = 'date';
    }

    query = `SELECT ${selectCols} FROM analytics_devices ${whereClause} GROUP BY ${groupByCol}`;
  } else {
    // No grouping, select all (or specific columns if needed)
    // If using JOIN, we need to be careful about column ambiguity if we selected *, 
    // but here we are selecting from analytics_devices
    query = `SELECT analytics_devices.* FROM analytics_devices ${whereClause}`;
  }

  query += ' ORDER BY clicks DESC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  const result = await env.DB.prepare(query).bind(...params).all<AnalyticsDevice>();
  return result.results || [];
}

/**
 * Get UTM analytics for filtered links
 */
export async function getUtmAnalytics(
  env: Env,
  options: {
    linkIds?: string[];
    domainIds?: string[];
    startDate?: string;
    endDate?: string;
    groupBy?: 'source' | 'medium' | 'campaign' | 'date';
    limit?: number;
  }
): Promise<AnalyticsUtm[]> {
  // If neither linkIds nor domainIds provided, return empty
  if ((!options.linkIds || options.linkIds.length === 0) && (!options.domainIds || options.domainIds.length === 0)) {
    return [];
  }

  let query = '';
  let params: unknown[] = [];
  let whereClause = '';

  // OPTIMIZATION: Use JOIN if filtering by domain
  if (options.domainIds && options.domainIds.length > 0) {
    const placeholders = options.domainIds.map(() => '?').join(',');
    whereClause = `
      JOIN links l ON analytics_utm.link_id = l.id
      WHERE l.status != 'deleted' AND l.domain_id IN (${placeholders})
    `;
    params.push(...options.domainIds);
  } else if (options.linkIds && options.linkIds.length > 0) {
    const placeholders = options.linkIds.map(() => '?').join(',');
    whereClause = `WHERE link_id IN (${placeholders})`;
    params.push(...options.linkIds);
  }

  if (options.startDate) {
    whereClause += ' AND date >= ?';
    params.push(options.startDate);
  }

  if (options.endDate) {
    whereClause += ' AND date <= ?';
    params.push(options.endDate);
  }

  // Build Query
  if (options.groupBy) {
    let selectCols = '';
    let groupByCol = '';

    if (options.groupBy === 'source') {
      selectCols = 'utm_source, SUM(clicks) as clicks, MAX(unique_visitors) as unique_visitors, date';
      groupByCol = 'utm_source';
    } else if (options.groupBy === 'medium') {
      selectCols = 'utm_medium, SUM(clicks) as clicks, MAX(unique_visitors) as unique_visitors, date';
      groupByCol = 'utm_medium';
    } else if (options.groupBy === 'campaign') {
      selectCols = 'utm_campaign, SUM(clicks) as clicks, MAX(unique_visitors) as unique_visitors, date';
      groupByCol = 'utm_campaign';
    } else if (options.groupBy === 'date') {
      selectCols = 'date, SUM(clicks) as clicks, MAX(unique_visitors) as unique_visitors';
      groupByCol = 'date';
    }

    query = `SELECT ${selectCols} FROM analytics_utm ${whereClause} GROUP BY ${groupByCol}`;
  } else {
    query = `SELECT analytics_utm.* FROM analytics_utm ${whereClause}`;
  }

  query += ' ORDER BY clicks DESC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  const result = await env.DB.prepare(query).bind(...params).all<AnalyticsUtm>();
  return result.results || [];
}

/**
 * Get custom parameter analytics for filtered links
 */
export async function getCustomParamAnalytics(
  env: Env,
  options: {
    linkIds?: string[];
    domainIds?: string[];
    startDate?: string;
    endDate?: string;
    paramName?: 'custom_param1' | 'custom_param2' | 'custom_param3';
    limit?: number;
  }
): Promise<AnalyticsCustomParam[]> {
  // If neither linkIds nor domainIds provided, return empty
  if ((!options.linkIds || options.linkIds.length === 0) && (!options.domainIds || options.domainIds.length === 0)) {
    return [];
  }

  let query = '';
  const params: unknown[] = [];
  let whereClause = '';

  // OPTIMIZATION: Use JOIN if filtering by domain
  if (options.domainIds && options.domainIds.length > 0) {
    const placeholders = options.domainIds.map(() => '?').join(',');
    whereClause = `
      JOIN links l ON analytics_custom_params.link_id = l.id
      WHERE l.status != 'deleted' AND l.domain_id IN (${placeholders})
    `;
    params.push(...options.domainIds);
  } else if (options.linkIds && options.linkIds.length > 0) {
    const placeholders = options.linkIds.map(() => '?').join(',');
    whereClause = `WHERE link_id IN (${placeholders})`;
    params.push(...options.linkIds);
  }

  if (options.paramName) {
    whereClause += ' AND param_name = ?';
    params.push(options.paramName);
  }

  if (options.startDate) {
    whereClause += ' AND date >= ?';
    params.push(options.startDate);
  }

  if (options.endDate) {
    whereClause += ' AND date <= ?';
    params.push(options.endDate);
  }

  query = `SELECT analytics_custom_params.* FROM analytics_custom_params ${whereClause} ORDER BY clicks DESC`;

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  const result = await env.DB.prepare(query).bind(...params).all<AnalyticsCustomParam>();
  return result.results || [];
}

/**
 * Upsert device analytics aggregation
 */
export async function upsertDeviceAnalytics(
  env: Env,
  linkId: string,
  deviceType: string | null,
  browser: string | null,
  os: string | null,
  date: string,
  clicks: number,
  uniqueVisitors: number
): Promise<void> {
  const id = generateId('analytics_device');
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO analytics_devices (id, link_id, device_type, browser, os, date, clicks, unique_visitors, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(link_id, device_type, browser, os, date) DO UPDATE SET
       clicks = excluded.clicks,
       unique_visitors = excluded.unique_visitors`
  )
    .bind(id, linkId, deviceType || null, browser || null, os || null, date, clicks, uniqueVisitors, now)
    .run();
}

/**
 * Upsert UTM analytics aggregation
 */
export async function upsertUtmAnalytics(
  env: Env,
  linkId: string,
  utmSource: string | null,
  utmMedium: string | null,
  utmCampaign: string | null,
  date: string,
  clicks: number,
  uniqueVisitors: number
): Promise<void> {
  const id = generateId('analytics_utm');
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO analytics_utm (id, link_id, utm_source, utm_medium, utm_campaign, date, clicks, unique_visitors, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(link_id, utm_source, utm_medium, utm_campaign, date) DO UPDATE SET
       clicks = excluded.clicks,
       unique_visitors = excluded.unique_visitors`
  )
    .bind(id, linkId, utmSource || null, utmMedium || null, utmCampaign || null, date, clicks, uniqueVisitors, now)
    .run();
}

/**
 * Upsert custom parameter analytics aggregation
 */
export async function upsertCustomParamAnalytics(
  env: Env,
  linkId: string,
  paramName: string,
  paramValue: string | null,
  date: string,
  clicks: number,
  uniqueVisitors: number
): Promise<void> {
  const id = generateId('analytics_custom_param');
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO analytics_custom_params (id, link_id, param_name, param_value, date, clicks, unique_visitors, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(link_id, param_name, param_value, date) DO UPDATE SET
       clicks = excluded.clicks,
       unique_visitors = excluded.unique_visitors`
  )
    .bind(id, linkId, paramName, paramValue || null, date, clicks, uniqueVisitors, now)
    .run();
}

// Real-time aggregation functions (increment instead of replace)

/**
 * Increment daily analytics in real-time (for dual-write)
 * Note: Unique visitors tracking is approximate - exact tracking would require
 * a separate IP tracking table. This increments unique_visitors conservatively.
 */
export async function incrementDailyAnalytics(
  env: Env,
  linkId: string,
  date: string,
  ipAddress: string
): Promise<void> {
  const id = generateId('analytics_daily');
  const now = Date.now();

  // Use atomic increment for clicks
  // For unique visitors: increment by 1 on insert, keep existing value on update
  // (exact unique visitor tracking would require checking if IP was seen before)
  await env.DB.prepare(
    `INSERT INTO analytics_daily (id, link_id, date, clicks, unique_visitors, created_at)
     VALUES (?, ?, ?, 1, 1, ?)
     ON CONFLICT(link_id, date) DO UPDATE SET
       clicks = clicks + 1`
  )
    .bind(id, linkId, date, now)
    .run();
}

/**
 * Increment geographic analytics in real-time
 */
export async function incrementGeoAnalytics(
  env: Env,
  linkId: string,
  country: string | null,
  city: string | null,
  date: string
): Promise<void> {
  const id = generateId('analytics_geo');
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO analytics_geo (id, link_id, country, city, date, clicks, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?)
     ON CONFLICT(link_id, country, city, date) DO UPDATE SET
       clicks = clicks + 1`
  )
    .bind(id, linkId, country || null, city || null, date, now)
    .run();
}

/**
 * Increment referrer analytics in real-time
 */
export async function incrementReferrerAnalytics(
  env: Env,
  linkId: string,
  referrerDomain: string | null,
  date: string
): Promise<void> {
  const id = generateId('analytics_referrer');
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO analytics_referrers (id, link_id, referrer_domain, date, clicks, created_at)
     VALUES (?, ?, ?, ?, 1, ?)
     ON CONFLICT(link_id, referrer_domain, date) DO UPDATE SET
       clicks = clicks + 1`
  )
    .bind(id, linkId, referrerDomain || null, date, now)
    .run();
}

/**
 * Increment device analytics in real-time
 * Note: Unique visitors tracking is approximate
 */
export async function incrementDeviceAnalytics(
  env: Env,
  linkId: string,
  deviceType: string | null,
  browser: string | null,
  os: string | null,
  date: string,
  ipAddress: string
): Promise<void> {
  const id = generateId('analytics_device');
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO analytics_devices (id, link_id, device_type, browser, os, date, clicks, unique_visitors, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)
     ON CONFLICT(link_id, device_type, browser, os, date) DO UPDATE SET
       clicks = clicks + 1`
  )
    .bind(id, linkId, deviceType || null, browser || null, os || null, date, now)
    .run();
}

/**
 * Increment UTM analytics in real-time
 * Note: Unique visitors tracking is approximate
 */
export async function incrementUtmAnalytics(
  env: Env,
  linkId: string,
  utmSource: string | null,
  utmMedium: string | null,
  utmCampaign: string | null,
  date: string,
  ipAddress: string
): Promise<void> {
  const id = generateId('analytics_utm');
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO analytics_utm (id, link_id, utm_source, utm_medium, utm_campaign, date, clicks, unique_visitors, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)
     ON CONFLICT(link_id, utm_source, utm_medium, utm_campaign, date) DO UPDATE SET
       clicks = clicks + 1`
  )
    .bind(id, linkId, utmSource || null, utmMedium || null, utmCampaign || null, date, now)
    .run();
}

/**
 * Increment custom parameter analytics in real-time
 * Note: Unique visitors tracking is approximate
 */
export async function incrementCustomParamAnalytics(
  env: Env,
  linkId: string,
  paramName: string,
  paramValue: string | null,
  date: string,
  ipAddress: string
): Promise<void> {
  const id = generateId('analytics_custom_param');
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO analytics_custom_params (id, link_id, param_name, param_value, date, clicks, unique_visitors, created_at)
     VALUES (?, ?, ?, ?, ?, 1, 1, ?)
     ON CONFLICT(link_id, param_name, param_value, date) DO UPDATE SET
       clicks = clicks + 1`
  )
    .bind(id, linkId, paramName, paramValue || null, date, now)
    .run();
}

/**
 * Get custom parameter analytics filtered by domain/tags/categories using JOIN
 * Much more efficient - avoids SQLite variable limit by filtering at database level
 */
export async function getCustomParamAnalyticsByFilters(
  env: Env,
  filters: {
    domainIds?: string[];
    tagIds?: string[];
    categoryIds?: string[];
    linkIds?: string[];
  },
  startDate?: string,
  endDate?: string,
  paramName?: 'custom_param1' | 'custom_param2' | 'custom_param3',
  limit?: number
): Promise<AnalyticsCustomParam[]> {
  let query = `
    SELECT 
      acp.id,
      acp.link_id,
      acp.param_name,
      acp.param_value,
      acp.date,
      SUM(acp.clicks) as clicks,
      MAX(acp.unique_visitors) as unique_visitors,
      acp.created_at
    FROM analytics_custom_params acp
    INNER JOIN links l ON acp.link_id = l.id
    WHERE l.status != 'deleted'
  `;
  const params: unknown[] = [];

  // Filter by domain IDs
  if (filters.domainIds && filters.domainIds.length > 0) {
    const placeholders = filters.domainIds.map(() => '?').join(',');
    query += ` AND l.domain_id IN (${placeholders})`;
    params.push(...filters.domainIds);
  }

  // Filter by tags (prefer over linkIds to avoid SQLite variable limit)
  if (filters.tagIds && filters.tagIds.length > 0) {
    query += ` AND EXISTS (
      SELECT 1 FROM link_tags lt
      WHERE lt.link_id = l.id AND lt.tag_id IN (${filters.tagIds.map(() => '?').join(',')})
      GROUP BY lt.link_id
      HAVING COUNT(DISTINCT lt.tag_id) = ?
    )`;
    params.push(...filters.tagIds, filters.tagIds.length);
  }

  // Filter by categories (prefer over linkIds to avoid SQLite variable limit)
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    const placeholders = filters.categoryIds.map(() => '?').join(',');
    query += ` AND l.category_id IN (${placeholders})`;
    params.push(...filters.categoryIds);
  }

  // Filter by specific link IDs (only if no domainIds/tagIds/categoryIds to avoid SQLite limit)
  if (filters.linkIds && filters.linkIds.length > 0 && 
      (!filters.domainIds || filters.domainIds.length === 0) &&
      (!filters.tagIds || filters.tagIds.length === 0) &&
      (!filters.categoryIds || filters.categoryIds.length === 0)) {
    const BATCH_SIZE = 500;
    if (filters.linkIds.length <= BATCH_SIZE) {
      const placeholders = filters.linkIds.map(() => '?').join(',');
      query += ` AND l.id IN (${placeholders})`;
      params.push(...filters.linkIds);
    } else {
      // DEBUG: console.warn('[ANALYTICS] Large linkIds array, truncating to first 500 to avoid SQLite limit');
      const placeholders = filters.linkIds.slice(0, BATCH_SIZE).map(() => '?').join(',');
      query += ` AND l.id IN (${placeholders})`;
      params.push(...filters.linkIds.slice(0, BATCH_SIZE));
    }
  }

  // Filter by param name
  if (paramName) {
    query += ' AND acp.param_name = ?';
    params.push(paramName);
  }

  // Date filters
  if (startDate) {
    query += ' AND acp.date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND acp.date <= ?';
    params.push(endDate);
  }

  // Group by param_value to aggregate across links
  query += ' GROUP BY acp.param_value, acp.param_name, acp.date';
  query += ' ORDER BY SUM(acp.clicks) DESC';

  if (limit) {
    query += ' LIMIT ?';
    params.push(limit);
  }

  const result = await env.DB.prepare(query).bind(...params).all<{
    id: string;
    link_id: string;
    param_name: string;
    param_value: string | null;
    date: string;
    clicks: number;
    unique_visitors: number;
    created_at: number;
  }>();

  // Map to AnalyticsCustomParam format
  return (result.results || []).map(row => ({
    id: row.id,
    link_id: row.link_id,
    param_name: row.param_name as 'custom_param1' | 'custom_param2' | 'custom_param3',
    param_value: row.param_value,
    date: row.date,
    clicks: row.clicks,
    unique_visitors: row.unique_visitors,
    created_at: row.created_at,
  }));
}

/**
 * Get device analytics filtered by domain/tags/categories using JOIN
 * Much more efficient - avoids SQLite variable limit by filtering at database level
 */
export async function getDeviceAnalyticsByFilters(
  env: Env,
  filters: {
    domainIds?: string[];
    tagIds?: string[];
    categoryIds?: string[];
    linkIds?: string[];
  },
  startDate?: string,
  endDate?: string,
  groupBy?: 'device_type' | 'browser' | 'os' | 'date',
  limit?: number
): Promise<AnalyticsDevice[]> {
  let query = '';
  const params: unknown[] = [];

  // Build SELECT based on groupBy
  if (groupBy === 'device_type') {
    query = `
      SELECT 
        ad.device_type,
        NULL as browser,
        NULL as os,
        ad.date,
        SUM(ad.clicks) as clicks,
        MAX(ad.unique_visitors) as unique_visitors
      FROM analytics_devices ad
      INNER JOIN links l ON ad.link_id = l.id
      WHERE l.status != 'deleted'
    `;
  } else if (groupBy === 'browser') {
    query = `
      SELECT 
        NULL as device_type,
        ad.browser,
        NULL as os,
        ad.date,
        SUM(ad.clicks) as clicks,
        MAX(ad.unique_visitors) as unique_visitors
      FROM analytics_devices ad
      INNER JOIN links l ON ad.link_id = l.id
      WHERE l.status != 'deleted'
    `;
  } else if (groupBy === 'os') {
    query = `
      SELECT 
        NULL as device_type,
        NULL as browser,
        ad.os,
        ad.date,
        SUM(ad.clicks) as clicks,
        MAX(ad.unique_visitors) as unique_visitors
      FROM analytics_devices ad
      INNER JOIN links l ON ad.link_id = l.id
      WHERE l.status != 'deleted'
    `;
  } else if (groupBy === 'date') {
    query = `
      SELECT 
        NULL as device_type,
        NULL as browser,
        NULL as os,
        ad.date,
        SUM(ad.clicks) as clicks,
        MAX(ad.unique_visitors) as unique_visitors
      FROM analytics_devices ad
      INNER JOIN links l ON ad.link_id = l.id
      WHERE l.status != 'deleted'
    `;
  } else {
    // No grouping - return all columns
    query = `
      SELECT 
        ad.device_type,
        ad.browser,
        ad.os,
        ad.date,
        SUM(ad.clicks) as clicks,
        MAX(ad.unique_visitors) as unique_visitors
      FROM analytics_devices ad
      INNER JOIN links l ON ad.link_id = l.id
      WHERE l.status != 'deleted'
    `;
  }

  // Filter by domain IDs
  if (filters.domainIds && filters.domainIds.length > 0) {
    const placeholders = filters.domainIds.map(() => '?').join(',');
    query += ` AND l.domain_id IN (${placeholders})`;
    params.push(...filters.domainIds);
  }

  // Filter by tags (prefer over linkIds to avoid SQLite variable limit)
  if (filters.tagIds && filters.tagIds.length > 0) {
    query += ` AND EXISTS (
      SELECT 1 FROM link_tags lt
      WHERE lt.link_id = l.id AND lt.tag_id IN (${filters.tagIds.map(() => '?').join(',')})
      GROUP BY lt.link_id
      HAVING COUNT(DISTINCT lt.tag_id) = ?
    )`;
    params.push(...filters.tagIds, filters.tagIds.length);
  }

  // Filter by categories (prefer over linkIds to avoid SQLite variable limit)
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    const placeholders = filters.categoryIds.map(() => '?').join(',');
    query += ` AND l.category_id IN (${placeholders})`;
    params.push(...filters.categoryIds);
  }

  // Filter by specific link IDs (only if no domainIds/tagIds/categoryIds to avoid SQLite limit)
  if (filters.linkIds && filters.linkIds.length > 0 && 
      (!filters.domainIds || filters.domainIds.length === 0) &&
      (!filters.tagIds || filters.tagIds.length === 0) &&
      (!filters.categoryIds || filters.categoryIds.length === 0)) {
    const BATCH_SIZE = 500;
    if (filters.linkIds.length <= BATCH_SIZE) {
      const placeholders = filters.linkIds.map(() => '?').join(',');
      query += ` AND l.id IN (${placeholders})`;
      params.push(...filters.linkIds);
    } else {
      // DEBUG: console.warn('[ANALYTICS] Large linkIds array, truncating to first 500 to avoid SQLite limit');
      const placeholders = filters.linkIds.slice(0, BATCH_SIZE).map(() => '?').join(',');
      query += ` AND l.id IN (${placeholders})`;
      params.push(...filters.linkIds.slice(0, BATCH_SIZE));
    }
  }

  // Date filters
  if (startDate) {
    query += ' AND ad.date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND ad.date <= ?';
    params.push(endDate);
  }

  // Group by clause
  if (groupBy === 'device_type') {
    query += ' GROUP BY ad.device_type, ad.date';
  } else if (groupBy === 'browser') {
    query += ' GROUP BY ad.browser, ad.date';
  } else if (groupBy === 'os') {
    query += ' GROUP BY ad.os, ad.date';
  } else if (groupBy === 'date') {
    query += ' GROUP BY ad.date';
  } else {
    query += ' GROUP BY ad.device_type, ad.browser, ad.os, ad.date';
  }

  query += ' ORDER BY SUM(ad.clicks) DESC';

  if (limit) {
    query += ' LIMIT ?';
    params.push(limit);
  }

  const result = await env.DB.prepare(query).bind(...params).all<{
    device_type: string | null;
    browser: string | null;
    os: string | null;
    date: string;
    clicks: number;
    unique_visitors: number;
  }>();

  // Map to AnalyticsDevice format
  return (result.results || []).map((row, idx) => ({
    id: `device_${idx}`, // Generate ID for aggregated results
    link_id: '', // Not needed for aggregated results
    device_type: row.device_type,
    browser: row.browser,
    os: row.os,
    date: row.date,
    clicks: row.clicks,
    unique_visitors: row.unique_visitors,
    created_at: 0,
  }));
}

/**
 * Get UTM analytics filtered by domain/tags/categories using JOIN
 * Much more efficient - avoids SQLite variable limit by filtering at database level
 */
export async function getUtmAnalyticsByFilters(
  env: Env,
  filters: {
    domainIds?: string[];
    tagIds?: string[];
    categoryIds?: string[];
    linkIds?: string[];
  },
  startDate?: string,
  endDate?: string,
  groupBy?: 'source' | 'medium' | 'campaign' | 'date',
  limit?: number
): Promise<AnalyticsUtm[]> {
  let query = '';
  const params: unknown[] = [];

  // Build SELECT based on groupBy
  if (groupBy === 'source') {
    query = `
      SELECT 
        au.utm_source,
        NULL as utm_medium,
        NULL as utm_campaign,
        au.date,
        SUM(au.clicks) as clicks,
        MAX(au.unique_visitors) as unique_visitors
      FROM analytics_utm au
      INNER JOIN links l ON au.link_id = l.id
      WHERE l.status != 'deleted'
    `;
  } else if (groupBy === 'medium') {
    query = `
      SELECT 
        NULL as utm_source,
        au.utm_medium,
        NULL as utm_campaign,
        au.date,
        SUM(au.clicks) as clicks,
        MAX(au.unique_visitors) as unique_visitors
      FROM analytics_utm au
      INNER JOIN links l ON au.link_id = l.id
      WHERE l.status != 'deleted'
    `;
  } else if (groupBy === 'campaign') {
    query = `
      SELECT 
        MAX(au.utm_source) as utm_source,
        MAX(au.utm_medium) as utm_medium,
        au.utm_campaign,
        au.date,
        SUM(au.clicks) as clicks,
        MAX(au.unique_visitors) as unique_visitors
      FROM analytics_utm au
      INNER JOIN links l ON au.link_id = l.id
      WHERE l.status != 'deleted'
    `;
  } else if (groupBy === 'date') {
    query = `
      SELECT 
        NULL as utm_source,
        NULL as utm_medium,
        NULL as utm_campaign,
        au.date,
        SUM(au.clicks) as clicks,
        MAX(au.unique_visitors) as unique_visitors
      FROM analytics_utm au
      INNER JOIN links l ON au.link_id = l.id
      WHERE l.status != 'deleted'
    `;
  } else {
    // No grouping - return all columns
    query = `
      SELECT 
        au.utm_source,
        au.utm_medium,
        au.utm_campaign,
        au.date,
        SUM(au.clicks) as clicks,
        MAX(au.unique_visitors) as unique_visitors
      FROM analytics_utm au
      INNER JOIN links l ON au.link_id = l.id
      WHERE l.status != 'deleted'
    `;
  }

  // Filter by domain IDs
  if (filters.domainIds && filters.domainIds.length > 0) {
    const placeholders = filters.domainIds.map(() => '?').join(',');
    query += ` AND l.domain_id IN (${placeholders})`;
    params.push(...filters.domainIds);
  }

  // Filter by tags (prefer over linkIds to avoid SQLite variable limit)
  if (filters.tagIds && filters.tagIds.length > 0) {
    query += ` AND EXISTS (
      SELECT 1 FROM link_tags lt
      WHERE lt.link_id = l.id AND lt.tag_id IN (${filters.tagIds.map(() => '?').join(',')})
      GROUP BY lt.link_id
      HAVING COUNT(DISTINCT lt.tag_id) = ?
    )`;
    params.push(...filters.tagIds, filters.tagIds.length);
  }

  // Filter by categories (prefer over linkIds to avoid SQLite variable limit)
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    const placeholders = filters.categoryIds.map(() => '?').join(',');
    query += ` AND l.category_id IN (${placeholders})`;
    params.push(...filters.categoryIds);
  }

  // Filter by specific link IDs (only if no domainIds/tagIds/categoryIds to avoid SQLite limit)
  if (filters.linkIds && filters.linkIds.length > 0 && 
      (!filters.domainIds || filters.domainIds.length === 0) &&
      (!filters.tagIds || filters.tagIds.length === 0) &&
      (!filters.categoryIds || filters.categoryIds.length === 0)) {
    const BATCH_SIZE = 500;
    if (filters.linkIds.length <= BATCH_SIZE) {
      const placeholders = filters.linkIds.map(() => '?').join(',');
      query += ` AND l.id IN (${placeholders})`;
      params.push(...filters.linkIds);
    } else {
      // DEBUG: console.warn('[ANALYTICS] Large linkIds array, truncating to first 500 to avoid SQLite limit');
      const placeholders = filters.linkIds.slice(0, BATCH_SIZE).map(() => '?').join(',');
      query += ` AND l.id IN (${placeholders})`;
      params.push(...filters.linkIds.slice(0, BATCH_SIZE));
    }
  }

  // Date filters
  if (startDate) {
    query += ' AND au.date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND au.date <= ?';
    params.push(endDate);
  }

  // Group by clause
  if (groupBy === 'source') {
    query += ' GROUP BY au.utm_source, au.date';
  } else if (groupBy === 'medium') {
    query += ' GROUP BY au.utm_medium, au.date';
  } else if (groupBy === 'campaign') {
    query += ' GROUP BY au.utm_campaign, au.date';
  } else if (groupBy === 'date') {
    query += ' GROUP BY au.date';
  } else {
    query += ' GROUP BY au.utm_source, au.utm_medium, au.utm_campaign, au.date';
  }

  query += ' ORDER BY SUM(au.clicks) DESC';

  if (limit) {
    query += ' LIMIT ?';
    params.push(limit);
  }

  const result = await env.DB.prepare(query).bind(...params).all<{
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    date: string;
    clicks: number;
    unique_visitors: number;
  }>();

  // Map to AnalyticsUtm format
  return (result.results || []).map((row, idx) => ({
    id: `utm_${idx}`, // Generate ID for aggregated results
    link_id: '', // Not needed for aggregated results
    utm_source: row.utm_source,
    utm_medium: row.utm_medium,
    utm_campaign: row.utm_campaign,
    date: row.date,
    clicks: row.clicks,
    unique_visitors: row.unique_visitors,
    created_at: 0,
  }));
}

/**
 * Get geographic analytics filtered by domain/tags/categories using JOIN
 * Much more efficient - avoids N+1 queries by filtering at database level
 */
export async function getGeoAnalyticsByFilters(
  env: Env,
  filters: {
    domainIds?: string[];
    tagIds?: string[];
    categoryIds?: string[];
    linkIds?: string[];
  },
  startDate?: string,
  endDate?: string,
  groupBy?: 'country' | 'city',
  limit?: number
): Promise<AnalyticsGeo[]> {
  let query = `
    SELECT 
      ag.country,
      ag.city,
      ag.date,
      SUM(ag.clicks) as clicks
    FROM analytics_geo ag
    INNER JOIN links l ON ag.link_id = l.id
    WHERE l.status != 'deleted'
  `;
  const params: unknown[] = [];

  // Filter by domain IDs
  if (filters.domainIds && filters.domainIds.length > 0) {
    const placeholders = filters.domainIds.map(() => '?').join(',');
    query += ` AND l.domain_id IN (${placeholders})`;
    params.push(...filters.domainIds);
  }

  // Filter by tags (prefer over linkIds to avoid SQLite variable limit)
  if (filters.tagIds && filters.tagIds.length > 0) {
    query += ` AND EXISTS (
      SELECT 1 FROM link_tags lt
      WHERE lt.link_id = l.id AND lt.tag_id IN (${filters.tagIds.map(() => '?').join(',')})
      GROUP BY lt.link_id
      HAVING COUNT(DISTINCT lt.tag_id) = ?
    )`;
    params.push(...filters.tagIds, filters.tagIds.length);
  }

  // Filter by categories (prefer over linkIds to avoid SQLite variable limit)
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    const placeholders = filters.categoryIds.map(() => '?').join(',');
    query += ` AND l.category_id IN (${placeholders})`;
    params.push(...filters.categoryIds);
  }

  // Filter by specific link IDs (only if no domainIds/tagIds/categoryIds to avoid SQLite limit)
  if (filters.linkIds && filters.linkIds.length > 0 && 
      (!filters.domainIds || filters.domainIds.length === 0) &&
      (!filters.tagIds || filters.tagIds.length === 0) &&
      (!filters.categoryIds || filters.categoryIds.length === 0)) {
    const BATCH_SIZE = 500;
    if (filters.linkIds.length <= BATCH_SIZE) {
      const placeholders = filters.linkIds.map(() => '?').join(',');
      query += ` AND l.id IN (${placeholders})`;
      params.push(...filters.linkIds);
    } else {
      // DEBUG: console.warn('[ANALYTICS] Large linkIds array, truncating to first 500 to avoid SQLite limit');
      const placeholders = filters.linkIds.slice(0, BATCH_SIZE).map(() => '?').join(',');
      query += ` AND l.id IN (${placeholders})`;
      params.push(...filters.linkIds.slice(0, BATCH_SIZE));
    }
  }

  // Date filters
  if (startDate) {
    query += ' AND ag.date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND ag.date <= ?';
    params.push(endDate);
  }

  // Group by clause
  if (groupBy === 'city') {
    query += ' GROUP BY ag.country, ag.city, ag.date';
  } else {
    query += ' GROUP BY ag.country, ag.date';
  }

  query += ' ORDER BY SUM(ag.clicks) DESC';

  if (limit) {
    query += ' LIMIT ?';
    params.push(limit);
  }

  const result = await env.DB.prepare(query).bind(...params).all<{
    country: string | null;
    city: string | null;
    date: string;
    clicks: number;
  }>();

  // Map to AnalyticsGeo format
  return (result.results || []).map((row, idx) => ({
    id: `geo_${idx}`, // Generate ID for aggregated results
    link_id: '', // Not needed for aggregated results
    country: row.country || undefined,
    city: row.city || undefined,
    date: row.date,
    clicks: row.clicks,
  }));
}

/**
 * Get referrer analytics filtered by domain/tags/categories using JOIN
 * Much more efficient - avoids N+1 queries by filtering at database level
 */
export async function getReferrerAnalyticsByFilters(
  env: Env,
  filters: {
    domainIds?: string[];
    tagIds?: string[];
    categoryIds?: string[];
    linkIds?: string[];
  },
  startDate?: string,
  endDate?: string,
  limit?: number
): Promise<AnalyticsReferrer[]> {
  let query = `
    SELECT 
      ar.referrer_domain,
      ar.date,
      SUM(ar.clicks) as clicks
    FROM analytics_referrers ar
    INNER JOIN links l ON ar.link_id = l.id
    WHERE l.status != 'deleted'
  `;
  const params: unknown[] = [];

  // Filter by domain IDs
  if (filters.domainIds && filters.domainIds.length > 0) {
    const placeholders = filters.domainIds.map(() => '?').join(',');
    query += ` AND l.domain_id IN (${placeholders})`;
    params.push(...filters.domainIds);
  }

  // Filter by tags (prefer over linkIds to avoid SQLite variable limit)
  if (filters.tagIds && filters.tagIds.length > 0) {
    query += ` AND EXISTS (
      SELECT 1 FROM link_tags lt
      WHERE lt.link_id = l.id AND lt.tag_id IN (${filters.tagIds.map(() => '?').join(',')})
      GROUP BY lt.link_id
      HAVING COUNT(DISTINCT lt.tag_id) = ?
    )`;
    params.push(...filters.tagIds, filters.tagIds.length);
  }

  // Filter by categories (prefer over linkIds to avoid SQLite variable limit)
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    const placeholders = filters.categoryIds.map(() => '?').join(',');
    query += ` AND l.category_id IN (${placeholders})`;
    params.push(...filters.categoryIds);
  }

  // Filter by specific link IDs (only if no domainIds/tagIds/categoryIds to avoid SQLite limit)
  if (filters.linkIds && filters.linkIds.length > 0 && 
      (!filters.domainIds || filters.domainIds.length === 0) &&
      (!filters.tagIds || filters.tagIds.length === 0) &&
      (!filters.categoryIds || filters.categoryIds.length === 0)) {
    const BATCH_SIZE = 500;
    if (filters.linkIds.length <= BATCH_SIZE) {
      const placeholders = filters.linkIds.map(() => '?').join(',');
      query += ` AND l.id IN (${placeholders})`;
      params.push(...filters.linkIds);
    } else {
      // DEBUG: console.warn('[ANALYTICS] Large linkIds array, truncating to first 500 to avoid SQLite limit');
      const placeholders = filters.linkIds.slice(0, BATCH_SIZE).map(() => '?').join(',');
      query += ` AND l.id IN (${placeholders})`;
      params.push(...filters.linkIds.slice(0, BATCH_SIZE));
    }
  }

  // Date filters
  if (startDate) {
    query += ' AND ar.date >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND ar.date <= ?';
    params.push(endDate);
  }

  // Group by referrer domain
  query += ' GROUP BY ar.referrer_domain, ar.date';
  query += ' ORDER BY SUM(ar.clicks) DESC';

  if (limit) {
    query += ' LIMIT ?';
    params.push(limit);
  }

  const result = await env.DB.prepare(query).bind(...params).all<{
    referrer_domain: string | null;
    date: string;
    clicks: number;
  }>();

  // Map to AnalyticsReferrer format
  return (result.results || []).map((row, idx) => ({
    id: `referrer_${idx}`, // Generate ID for aggregated results
    link_id: '', // Not needed for aggregated results
    referrer_domain: row.referrer_domain || undefined,
    date: row.date,
    clicks: row.clicks,
  }));
}


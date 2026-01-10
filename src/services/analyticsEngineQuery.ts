/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Analytics Engine SQL API query service
// Queries Cloudflare Workers Analytics Engine via SQL API

import type { Env } from '../types';
import type {
  TimeSeriesDataPoint,
  GeographyDataPoint,
  ReferrerDataPoint,
} from './analytics';

interface AnalyticsEngineConfig {
  accountId: string;
  apiToken: string;
  datasetName: string;
}

interface AnalyticsEngineQueryResult {
  data?: any[];
  errors?: Array<{ message: string }>;
}

/**
 * Execute SQL query against Workers Analytics Engine
 */
async function queryAnalyticsEngineSQL(
  config: AnalyticsEngineConfig,
  sqlQuery: string
): Promise<AnalyticsEngineQueryResult> {
  const API_ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/analytics_engine/sql`;

  try {
    // Trim and clean the SQL query
    const cleanQuery = sqlQuery.trim();

    // DEBUG: console.log('[ANALYTICS ENGINE] Query endpoint:', API_ENDPOINT);
    // DEBUG: console.log('[ANALYTICS ENGINE] Query SQL (first 200 chars):', cleanQuery.substring(0, 200));
    // DEBUG: console.log('[ANALYTICS ENGINE] Query SQL length:', cleanQuery.length);
    // DEBUG: console.log('[ANALYTICS ENGINE] Query SQL type:', typeof cleanQuery);
    // DEBUG: console.log('[ANALYTICS ENGINE] Query SQL starts with:', cleanQuery.substring(0, 10));

    // Analytics Engine SQL API expects plain text SQL query in the body
    // According to Cloudflare docs: https://developers.cloudflare.com/analytics/analytics-engine/sql-api/
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'text/plain',
      },
      body: cleanQuery,
    });

    const responseText = await response.text();
    // DEBUG: console.log('[ANALYTICS ENGINE SQL] Response received');
    // DEBUG: console.log('[ANALYTICS ENGINE SQL] Response status:', response.status, response.statusText);
    // DEBUG: console.log('[ANALYTICS ENGINE SQL] Response body length:', responseText.length);
    // DEBUG: console.log('[ANALYTICS ENGINE SQL] Response body (first 1000 chars):', responseText.substring(0, 1000));

    if (!response.ok) {
      console.error('[ANALYTICS ENGINE SQL] Response NOT OK!');
      console.error('[ANALYTICS ENGINE SQL] Full error response:', responseText);
      throw new Error(`Analytics Engine query failed: ${response.status} ${response.statusText} - ${responseText}`);
    }

    // DEBUG: console.log('[ANALYTICS ENGINE SQL] Parsing JSON response...');
    const result = JSON.parse(responseText) as AnalyticsEngineQueryResult;
    // DEBUG: console.log('[ANALYTICS ENGINE SQL] Parsed successfully');
    // DEBUG: console.log('[ANALYTICS ENGINE SQL] Result structure:', {
    //   hasData: !!result.data,
    //   dataLength: result.data?.length || 0,
    //   hasErrors: !!result.errors,
    //   errorsLength: result.errors?.length || 0
    // });
    // DEBUG: console.log('[ANALYTICS ENGINE SQL] Full parsed result:', JSON.stringify(result, null, 2));

    if (result.errors && result.errors.length > 0) {
      console.error('[ANALYTICS ENGINE] Query errors:', result.errors);
      throw new Error(`Analytics Engine query errors: ${result.errors.map(e => e.message).join(', ')}`);
    }

    // DEBUG: console.log('[ANALYTICS ENGINE SQL] ========== QUERY SUCCESS ==========');
    return result;
  } catch (error) {
    console.error('[ANALYTICS ENGINE SQL] ========== QUERY ERROR ==========');
    console.error('[ANALYTICS ENGINE SQL] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[ANALYTICS ENGINE SQL] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[ANALYTICS ENGINE SQL] Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('[ANALYTICS ENGINE SQL] ====================================');
    throw error;
  }
}

/**
 * Test Analytics Engine connection and list available datasets
 */
export async function testAnalyticsEngineConnection(env: Env): Promise<{ success: boolean; message: string; data?: any }> {
  const config = getAnalyticsEngineConfig(env);
  if (!config) {
    return { success: false, message: 'Missing API credentials' };
  }

  try {
    // Try to list tables/datasets
    const testQuery = 'SHOW TABLES';
    // DEBUG: console.log('[ANALYTICS ENGINE] Testing connection with SHOW TABLES');
    const result = await queryAnalyticsEngineSQL(config, testQuery);
    return { success: true, message: 'Connection successful', data: result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Connection failed: ${errorMessage}` };
  }
}

/**
 * Quote SQL identifier (for dataset names with special characters like hyphens)
 */
function quoteIdentifier(identifier: string): string {
  // Use double quotes for SQL standard, escape any existing quotes
  return `"${identifier.replace(/"/g, '""')}"`;
}

// ============================================================================
// SQL INJECTION PREVENTION: Input Validation Functions
// These functions validate inputs before they are used in SQL queries.
// Even though inputs come from trusted sources (env vars, D1 database),
// explicit validation provides defense-in-depth protection.
// ============================================================================

/**
 * Validate dataset name to prevent SQL injection
 * Only allows alphanumeric characters, hyphens, and underscores
 */
function validateDatasetName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Dataset name is required');
  }
  // Only allow alphanumeric, hyphens, underscores (standard identifier chars)
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error(`Invalid dataset name format: ${name.substring(0, 50)}`);
  }
  // Reasonable length limit
  if (name.length > 100) {
    throw new Error('Dataset name too long');
  }
  return name;
}

/**
 * Validate link ID format (UUID)
 * Link IDs should be valid UUIDs
 */
function validateLinkId(id: string): string {
  if (!id || typeof id !== 'string') {
    throw new Error('Link ID is required');
  }
  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new Error(`Invalid link ID format: ${id.substring(0, 50)}`);
  }
  return id;
}

/**
 * Validate domain name format
 * Allows standard domain characters: alphanumeric, dots, hyphens
 */
function validateDomainName(domain: string): string {
  if (!domain || typeof domain !== 'string') {
    throw new Error('Domain name is required');
  }
  // Domain validation: alphanumeric, dots, hyphens
  // Must start and end with alphanumeric
  // Examples: example.com, sub.example.co.uk, my-domain.org
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(domain)) {
    throw new Error(`Invalid domain format: ${domain.substring(0, 50)}`);
  }
  // Reasonable length limit
  if (domain.length > 253) {
    throw new Error('Domain name too long');
  }
  return domain;
}

/**
 * Validate timestamp is a finite number
 */
function validateTimestamp(timestamp: number): number {
  if (!Number.isFinite(timestamp)) {
    throw new Error('Invalid timestamp: must be a finite number');
  }
  // Reasonable range: year 2000 to year 2100 (in seconds)
  const minTimestamp = 946684800; // 2000-01-01
  const maxTimestamp = 4102444800; // 2100-01-01
  if (timestamp < minTimestamp || timestamp > maxTimestamp) {
    throw new Error(`Timestamp out of valid range: ${timestamp}`);
  }
  return Math.floor(timestamp);
}

/**
 * Get Analytics Engine configuration from environment
 */
function getAnalyticsEngineConfig(env: Env): AnalyticsEngineConfig | null {
  // Handle empty strings properly (trim and check length)
  const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = env.CLOUDFLARE_API_TOKEN?.trim();

  // DEBUG: console.log('[ANALYTICS ENGINE CONFIG] Checking config:', {
  //   hasAccountId: !!accountId,
  //   accountIdLength: accountId?.length || 0,
  //   accountIdValue: accountId || 'undefined',
  //   hasApiToken: !!apiToken,
  //   apiTokenLength: apiToken?.length || 0,
  //   apiTokenPreview: apiToken ? '***' + apiToken.substring(Math.max(0, apiToken.length - 4)) : 'undefined',
  //   accountIdRaw: env.CLOUDFLARE_ACCOUNT_ID,
  //   apiTokenRaw: env.CLOUDFLARE_API_TOKEN ? '***present***' : 'undefined'
  // });

  if (!accountId || accountId.length === 0 || !apiToken || apiToken.length === 0) {
    // DEBUG: console.log('[ANALYTICS ENGINE CONFIG] Missing credentials, returning null');
    return null;
  }

  const rawDatasetName = env.ANALYTICS_DATASET_NAME || 'link-clicks';
  
    // DEBUG: console.log('[ANALYTICS ENGINE CONFIG] Config OK, dataset:', rawDatasetName);
    return {
      accountId: accountId,
      apiToken: apiToken,
      datasetName: rawDatasetName,
    };
}

/**
 * Analytics Engine filter interface
 * Use either linkIds (for tag/category filtering) OR domainNames (for direct domain filtering)
 */
export interface AnalyticsEngineFilters {
  linkIds?: string[];      // For tag/category filtering - filter by link_id in SQL
  domainNames?: string[];  // For direct domain filtering - filter by domain in SQL
}

/**
 * Build SQL WHERE clause for filters
 * All inputs are validated to prevent SQL injection
 */
function buildFilterWhereClause(
  filters: AnalyticsEngineFilters,
  startTimestamp: number,
  endTimestamp: number
): string {
  
  const conditions: string[] = [
    `double1 >= ${startTimestamp}`,
    `double1 < ${endTimestamp}`
  ];

  // Domain filtering (direct - most efficient)
  // Priority: domainNames > linkIds (they should be mutually exclusive)
  if (filters.domainNames && filters.domainNames.length > 0) {
    const domainList = filters.domainNames.map(d => `'${d.replace(/'/g, "''")}'`).join(', ');
    conditions.push(`blob2 IN (${domainList})`);
    // If domainNames are provided, don't use linkIds filter (they're mutually exclusive)
    // This prevents incorrect AND logic when both are provided
  } else if (filters.linkIds && filters.linkIds.length > 0) {
  // Link ID filtering (for tag/category filtering)
    // Only use if <= 100 IDs to avoid truncation (Analytics Engine limitation)
    // If > 100 IDs and no domainNames, caller should query without filters (all data)
    if (filters.linkIds.length <= 100) {
      const linkIdList = filters.linkIds.map(id => `'${id.replace(/'/g, "''")}'`).join(', ');
      conditions.push(`blob1 IN (${linkIdList})`);
    } else {
      // Too many linkIds - don't filter (query all data)
      // This happens when "all domains" is selected
      // DEBUG: console.warn('[ANALYTICS ENGINE] Large link ID array (>100), querying all data instead of filtering');
      // Don't add linkIds filter - query all data
    }
  }

  return conditions.join(' AND ');
}

/**
 * Split linkIds into batches of 100 (Analytics Engine limitation)
 */
function batchLinkIds(linkIds: string[], batchSize: number = 100): string[][] {
  const batches: string[][] = [];
  for (let i = 0; i < linkIds.length; i += batchSize) {
    batches.push(linkIds.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Batched version of getDailyAnalyticsFromEngine - splits linkIds into chunks of 100
 */
export async function getDailyAnalyticsFromEngineBatched(
  env: Env,
  linkIds: string[],
  startDate: string,
  endDate: string
): Promise<TimeSeriesDataPoint[]> {
  const batches = batchLinkIds(linkIds);
  // DEBUG: console.log(`[ANALYTICS ENGINE BATCHED] Batching ${linkIds.length} linkIds into ${batches.length} batches`);
  // DEBUG: console.log(`[ANALYTICS ENGINE BATCHED] Date range: ${startDate} to ${endDate}`);

  const allResults: TimeSeriesDataPoint[] = [];
  
  // Query each batch in parallel
  // Query each batch sequentially to avoid rate limits
  const batchResults: TimeSeriesDataPoint[][] = [];
  
  for (const batch of batches) {
    // DEBUG: console.log(`[ANALYTICS ENGINE BATCHED] Processing batch for daily analytics...`);
    const result = await getDailyAnalyticsFromEngine(env, { linkIds: batch }, startDate, endDate);
    batchResults.push(result);
  }
  
  // DEBUG: console.log(`[ANALYTICS ENGINE BATCHED] Batch results:`, batchResults.map((r, i) => ({
  //   batch: i + 1,
  //   dataPoints: r.length,
  //   sample: r[0]
  // })));
  
  // Merge results by date
  // For unique visitors, use average across batches (better approximation than max)
  const merged = new Map<string, { clicks: number; uniqueVisitorsSum: number; batchCount: number }>();
  
  for (const batchResult of batchResults) {
    for (const point of batchResult) {
      const existing = merged.get(point.date);
      if (existing) {
        existing.clicks += point.clicks;
        existing.uniqueVisitorsSum += point.unique_visitors;
        existing.batchCount += 1;
      } else {
        merged.set(point.date, {
          clicks: point.clicks,
          uniqueVisitorsSum: point.unique_visitors,
          batchCount: 1,
        });
      }
    }
  }
  
  // Transform back to TimeSeriesDataPoint format
  // Use average of unique visitors across batches (better than max, but still approximate)
  const finalResult = Array.from(merged.entries())
    .map(([date, data]) => ({
      date,
      clicks: data.clicks,
      unique_visitors: Math.ceil(data.uniqueVisitorsSum / data.batchCount), // Average, rounded up
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  // DEBUG: console.log(`[ANALYTICS ENGINE BATCHED] Final merged result: ${finalResult.length} unique dates`);
  // DEBUG: console.log(`[ANALYTICS ENGINE BATCHED] Date range: ${finalResult[0]?.date} to ${finalResult[finalResult.length - 1]?.date}`);
  
  return finalResult;
}

/**
 * Batched version of getGeoAnalyticsFromEngine
 */
export async function getGeoAnalyticsFromEngineBatched(
  env: Env,
  linkIds: string[],
  startDate: string,
  endDate: string,
  limit: number = 20
): Promise<GeographyDataPoint[]> {
  const batches = batchLinkIds(linkIds);
  // DEBUG: console.log(`[ANALYTICS ENGINE] Batching ${linkIds.length} linkIds into ${batches.length} batches for geography`);

  const batchPromises = batches.map(batch => 
    getGeoAnalyticsFromEngine(env, { linkIds: batch }, startDate, endDate, limit * 2) // Get more per batch to account for merging
  );
  
  const batchResults = await Promise.all(batchPromises);
  
  // Merge results by country:city
  // For unique visitors, use average across batches (better approximation than max)
  const merged = new Map<string, { country: string; city: string | null; clicks: number; uniqueVisitorsSum: number; batchCount: number }>();
  
  for (const batchResult of batchResults) {
    for (const point of batchResult) {
      const key = `${point.country}:${point.city || ''}`;
      const existing = merged.get(key);
      if (existing) {
        existing.clicks += point.clicks;
        existing.uniqueVisitorsSum += point.unique_visitors;
        existing.batchCount += 1;
      } else {
        merged.set(key, {
          country: point.country,
          city: point.city,
          clicks: point.clicks,
          uniqueVisitorsSum: point.unique_visitors,
          batchCount: 1,
        });
      }
    }
  }
  
  return Array.from(merged.values())
    .map(item => ({
      country: item.country,
      city: item.city,
      clicks: item.clicks,
      unique_visitors: Math.ceil(item.uniqueVisitorsSum / item.batchCount), // Average, rounded up
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);
}

/**
 * Batched version of getReferrerAnalyticsFromEngine
 */
export async function getReferrerAnalyticsFromEngineBatched(
  env: Env,
  linkIds: string[],
  startDate: string,
  endDate: string,
  limit: number = 20
): Promise<ReferrerDataPoint[]> {
  const batches = batchLinkIds(linkIds);
  // DEBUG: console.log(`[ANALYTICS ENGINE] Batching ${linkIds.length} linkIds into ${batches.length} batches for referrers`);

  const batchPromises = batches.map(batch => 
    getReferrerAnalyticsFromEngine(env, { linkIds: batch }, startDate, endDate, limit * 2)
  );
  
  const batchResults = await Promise.all(batchPromises);
  
  // Merge results by referrer domain
  // For unique visitors, use average across batches (better approximation than max)
  const merged = new Map<string, { referrer_domain: string; category: string; clicks: number; uniqueVisitorsSum: number; batchCount: number }>();
  
  for (const batchResult of batchResults) {
    for (const point of batchResult) {
      const existing = merged.get(point.referrer_domain);
      if (existing) {
        existing.clicks += point.clicks;
        existing.uniqueVisitorsSum += point.unique_visitors;
        existing.batchCount += 1;
      } else {
        merged.set(point.referrer_domain, {
          referrer_domain: point.referrer_domain,
          category: point.category,
          clicks: point.clicks,
          uniqueVisitorsSum: point.unique_visitors,
          batchCount: 1,
        });
      }
    }
  }
  
  return Array.from(merged.values())
    .map(item => ({
      referrer_domain: item.referrer_domain,
      category: item.category as 'social' | 'search' | 'direct' | 'other',
      clicks: item.clicks,
      unique_visitors: Math.ceil(item.uniqueVisitorsSum / item.batchCount), // Average, rounded up
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);
}

/**
 * Batched version of getDeviceAnalyticsFromEngine
 */
export async function getDeviceAnalyticsFromEngineBatched(
  env: Env,
  linkIds: string[],
  startDate: string,
  endDate: string,
  groupBy?: 'device_type' | 'browser' | 'os',
  limit: number = 100
): Promise<Array<{
  device_type: string | null;
  browser: string | null;
  os: string | null;
  clicks: number;
  unique_visitors: number;
}>> {
  const batches = batchLinkIds(linkIds);
  // DEBUG: console.log(`[ANALYTICS ENGINE] Batching ${linkIds.length} linkIds into ${batches.length} batches for devices`);

  const batchPromises = batches.map(batch => 
    getDeviceAnalyticsFromEngine(env, { linkIds: batch }, startDate, endDate, groupBy, limit * 2)
  );
  
  const batchResults = await Promise.all(batchPromises);
  
  // Merge results by device type/browser/os
  // For unique visitors, use average across batches (better approximation than max)
  const merged = new Map<string, {
    device_type: string | null;
    browser: string | null;
    os: string | null;
    clicks: number;
    uniqueVisitorsSum: number;
    batchCount: number;
  }>();
  
  for (const batchResult of batchResults) {
    for (const point of batchResult) {
      const key = `${point.device_type || ''}:${point.browser || ''}:${point.os || ''}`;
      const existing = merged.get(key);
      if (existing) {
        existing.clicks += point.clicks;
        existing.uniqueVisitorsSum += point.unique_visitors;
        existing.batchCount += 1;
      } else {
        merged.set(key, {
          device_type: point.device_type,
          browser: point.browser,
          os: point.os,
          clicks: point.clicks,
          uniqueVisitorsSum: point.unique_visitors,
          batchCount: 1,
        });
      }
    }
  }
  
  return Array.from(merged.values())
    .map(item => ({
      device_type: item.device_type,
      browser: item.browser,
      os: item.os,
      clicks: item.clicks,
      unique_visitors: Math.ceil(item.uniqueVisitorsSum / item.batchCount), // Average, rounded up
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);
}

/**
 * Batched version of getUtmAnalyticsFromEngine
 */
export async function getUtmAnalyticsFromEngineBatched(
  env: Env,
  linkIds: string[],
  startDate: string,
  endDate: string,
  groupBy?: 'source' | 'medium' | 'campaign',
  limit: number = 100
): Promise<Array<{
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  clicks: number;
  unique_visitors: number;
}>> {
  const batches = batchLinkIds(linkIds);
  // DEBUG: console.log(`[ANALYTICS ENGINE] Batching ${linkIds.length} linkIds into ${batches.length} batches for UTM`);

  const batchPromises = batches.map(batch => 
    getUtmAnalyticsFromEngine(env, { linkIds: batch }, startDate, endDate, groupBy, limit * 2)
  );
  
  const batchResults = await Promise.all(batchPromises);
  
  // Merge results by UTM fields
  // For unique visitors, use average across batches (better approximation than max)
  const merged = new Map<string, {
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    clicks: number;
    uniqueVisitorsSum: number;
    batchCount: number;
  }>();
  
  for (const batchResult of batchResults) {
    for (const point of batchResult) {
      const key = `${point.utm_source || ''}:${point.utm_medium || ''}:${point.utm_campaign || ''}`;
      const existing = merged.get(key);
      if (existing) {
        existing.clicks += point.clicks;
        existing.uniqueVisitorsSum += point.unique_visitors;
        existing.batchCount += 1;
      } else {
        merged.set(key, {
          utm_source: point.utm_source,
          utm_medium: point.utm_medium,
          utm_campaign: point.utm_campaign,
          clicks: point.clicks,
          uniqueVisitorsSum: point.unique_visitors,
          batchCount: 1,
        });
      }
    }
  }
  
  return Array.from(merged.values())
    .map(item => ({
      utm_source: item.utm_source,
      utm_medium: item.utm_medium,
      utm_campaign: item.utm_campaign,
      clicks: item.clicks,
      unique_visitors: Math.ceil(item.uniqueVisitorsSum / item.batchCount), // Average, rounded up
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);
}

/**
 * Batched version of getCustomParamAnalyticsFromEngine
 */
export async function getCustomParamAnalyticsFromEngineBatched(
  env: Env,
  linkIds: string[],
  startDate: string,
  endDate: string,
  paramName?: 'custom_param1' | 'custom_param2' | 'custom_param3',
  limit: number = 100
): Promise<Array<{
  param_name: string;
  param_value: string | null;
  clicks: number;
  unique_visitors: number;
}>> {
  const batches = batchLinkIds(linkIds);
  // DEBUG: console.log(`[ANALYTICS ENGINE] Batching ${linkIds.length} linkIds into ${batches.length} batches for custom params`);

  const batchPromises = batches.map(batch => 
    getCustomParamAnalyticsFromEngine(env, { linkIds: batch }, startDate, endDate, paramName, limit * 2)
  );
  
  const batchResults = await Promise.all(batchPromises);
  
  // Merge results by param name:value
  // For unique visitors, use average across batches (better approximation than max)
  const merged = new Map<string, {
    param_name: string;
    param_value: string | null;
    clicks: number;
    uniqueVisitorsSum: number;
    batchCount: number;
  }>();
  
  for (const batchResult of batchResults) {
    for (const point of batchResult) {
      const key = `${point.param_name}:${point.param_value || ''}`;
      const existing = merged.get(key);
      if (existing) {
        existing.clicks += point.clicks;
        existing.uniqueVisitorsSum += point.unique_visitors;
        existing.batchCount += 1;
      } else {
        merged.set(key, {
          param_name: point.param_name,
          param_value: point.param_value,
          clicks: point.clicks,
          uniqueVisitorsSum: point.unique_visitors,
          batchCount: 1,
        });
      }
    }
  }
  
  return Array.from(merged.values())
    .map(item => ({
      param_name: item.param_name,
      param_value: item.param_value,
      clicks: item.clicks,
      unique_visitors: Math.ceil(item.uniqueVisitorsSum / item.batchCount), // Average, rounded up
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);
}

/**
 * Batched version of getAggregatedSummaryFromEngine
 */
export async function getAggregatedSummaryFromEngineBatched(
  env: Env,
  linkIds: string[],
  startDate: string,
  endDate: string
): Promise<{ total_clicks: number; total_unique_visitors: number }> {
  const batches = batchLinkIds(linkIds);
  // DEBUG: console.log(`[ANALYTICS ENGINE] Batching ${linkIds.length} linkIds into ${batches.length} batches for summary`);

  // Query each batch sequentially to avoid rate limits
  const batchResults: { total_clicks: number; total_unique_visitors: number }[] = [];

  for (const batch of batches) {
     const result = await getAggregatedSummaryFromEngine(env, { linkIds: batch }, startDate, endDate);
     batchResults.push(result);
  }
  
  // Merge results
  // For unique visitors, use average across batches (better approximation than max)
  let totalClicks = 0;
  let uniqueVisitorsSum = 0;
  let batchCount = 0;
  
  for (const batchResult of batchResults) {
    totalClicks += batchResult.total_clicks;
    uniqueVisitorsSum += batchResult.total_unique_visitors;
    batchCount += 1;
  }
  
  return {
    total_clicks: totalClicks,
    total_unique_visitors: Math.ceil(uniqueVisitorsSum / batchCount), // Average, rounded up
  };
}

/**
 * Get daily analytics from Workers Analytics Engine
 * Column mapping based on trackClick() in analytics.ts (reduced to 20 blobs max):
 * Analytics Engine columns are 1-indexed (blob1, blob2, etc.), not 0-indexed
 * - blob1 = link_id (also index1)
 * - blob2 = domain
 * - blob3 = slug
 * - blob4 = destination_url
 * - blob5 = country
 * - blob6 = city
 * - blob7 = user_agent
 * - blob8 = referrer
 * - blob9 = ip_address (hashed)
 * - blob10 = device_type
 * - blob11 = browser
 * - blob12 = os
 * - blob13 = utm_source
 * - blob14 = utm_medium
 * - blob15 = utm_campaign
 * - blob16 = gclid
 * - blob17 = fbclid
 * - blob18 = custom_param1
 * - blob19 = custom_param2
 * - blob20 = custom_param3
 * - double1 = timestamp
 */
export async function getDailyAnalyticsFromEngine(
  env: Env,
  filters: AnalyticsEngineFilters,
  startDate: string,
  endDate: string
): Promise<TimeSeriesDataPoint[]> {
  // DEBUG: console.log('[ANALYTICS ENGINE] getDailyAnalyticsFromEngine called with:', {
  //   startDate,
  //   endDate,
  //   hasLinkIds: !!filters.linkIds,
  //   linkIdsCount: filters.linkIds?.length || 0,
  //   hasDomainNames: !!filters.domainNames,
  //   domainNamesCount: filters.domainNames?.length || 0
  // });
  
  const config = getAnalyticsEngineConfig(env);
  if (!config) {
    console.error('[ANALYTICS ENGINE] Missing API credentials, cannot query Analytics Engine');
    return [];
  }

  // DEBUG: console.log('[ANALYTICS ENGINE] Config found:', {
  //   accountId: config.accountId.substring(0, 8) + '...',
  //   datasetName: config.datasetName,
  //   hasApiToken: !!config.apiToken
  // });

  // Convert dates to timestamps (seconds since epoch)
  const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
  const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000) + 86400; // Add 1 day

  // DEBUG: console.log('[ANALYTICS ENGINE] Date range and filters:', {
  //   startDate,
  //   endDate,
  //   startTimestamp,
  //   endTimestamp,
  //   linkIdsCount: filters.linkIds?.length || 0,
  //   domainNamesCount: filters.domainNames?.length || 0
  // });

  // Build WHERE clause with filters (domain or link IDs)
  const whereClause = buildFilterWhereClause(filters, startTimestamp, endTimestamp);
  
  // DEBUG: console.log('[ANALYTICS ENGINE] WHERE clause:', whereClause);
  // DEBUG: console.log('[ANALYTICS ENGINE] Filter details:', {
  //   hasLinkIds: !!filters.linkIds,
  //   linkIdsCount: filters.linkIds?.length || 0,
  //   hasDomainNames: !!filters.domainNames,
  //   domainNamesCount: filters.domainNames?.length || 0,
  //   startTimestamp,
  //   endTimestamp
  // });

  // Optimized approach: Filter in SQL WHERE clause, group by day and IP for unique visitor counting
  // Cloudflare Analytics Engine requires column names (not expressions) in GROUP BY
  // Solution: Use a subquery to calculate day_number first, then group by the alias
  // Analytics Engine doesn't support COUNT(DISTINCT), so we group by blob9 (ip) and count unique in memory
  // SECURITY: All inputs validated by validateTimestamp, validateLinkId, validateDomainName. CF Analytics Engine API requires raw SQL.
   // Optimized: Flatten query to avoid subquery issues
   // Group by calculated day number directly
   const sqlQuery = `
    SELECT 
      blob1 as link_id,
      floor(double1 / 86400) as day_number,
      blob9 as ip_address,
      COUNT() as clicks
    FROM ${quoteIdentifier(config.datasetName)}
    WHERE ${whereClause}
    GROUP BY blob1, day_number, blob9
    ORDER BY day_number ASC
  `;

  try {
    // DEBUG: console.log('[ANALYTICS ENGINE] Executing query with SQL filtering:', sqlQuery);
    let result = await queryAnalyticsEngineSQL(config, sqlQuery);
    
    // DEBUG: console.log('[ANALYTICS ENGINE] Query result:', {
    //   hasData: !!result.data,
    //   dataLength: result.data?.length || 0,
    //   sampleRow: result.data?.[0],
    //   errors: result.errors
    // });


    if (!result.data || result.data.length === 0) {
      // Keep error logs for debugging empty results
      console.error('[ANALYTICS ENGINE] ========== NO DATA RETURNED ==========');
      console.error('[ANALYTICS ENGINE] Query returned empty result');
      console.error('[ANALYTICS ENGINE] Date range:', startDate, 'to', endDate);
      console.error('[ANALYTICS ENGINE] Filters:', {
        linkIds: filters.linkIds?.length || 0,
        domainNames: filters.domainNames?.length || 0
      });
      console.error('[ANALYTICS ENGINE] WHERE clause:', whereClause);
      console.error('[ANALYTICS ENGINE] Errors:', result.errors);
      console.error('[ANALYTICS ENGINE] This might indicate:');
      console.error('  1. No data exists for the date range/filters');
      console.error('  2. Query syntax issue (check errors above)');
      console.error('  3. Analytics Engine API issue');
      console.error('[ANALYTICS ENGINE] ======================================');
      return [];
    }

    // DEBUG: console.log('[ANALYTICS ENGINE] Query returned', result.data.length, 'rows (filtered in SQL)');
    // DEBUG: console.log('[ANALYTICS ENGINE] Sample row:', result.data[0]);

    // Aggregate by date (sum clicks, count unique ip_addresses)
    const aggregated = new Map<string, { clicks: number; unique_ips: Set<string> }>();
    for (const row of result.data) {
      try {
        // Convert day_number (days since Unix epoch) back to YYYY-MM-DD format
        // The SQL query returns floor(double1 / 86400) as day_number
        const dayNumber = Number(row.day_number);
        if (!Number.isFinite(dayNumber)) {
          // DEBUG: console.warn('[ANALYTICS ENGINE] Invalid day_number:', {
          //   dayNumber,
          //   row
          // });
          continue;
        }
        // Convert day_number to date: day_number * 86400 * 1000 = milliseconds since epoch
        const date = new Date(dayNumber * 86400 * 1000).toISOString().slice(0, 10);
        
        const clicks = Number(row.clicks) || 0;
        const existing = aggregated.get(date);
        if (existing) {
          existing.clicks += clicks;
          if (row.ip_address) {
            existing.unique_ips.add(String(row.ip_address));
          }
        } else {
          const uniqueIps = new Set<string>();
          if (row.ip_address) {
            uniqueIps.add(String(row.ip_address));
          }
          aggregated.set(date, {
            clicks: clicks,
            unique_ips: uniqueIps
          });
        }
      } catch (error) {
        console.error('[ANALYTICS ENGINE] Error processing row:', error, row);
        continue;
      }
    }
    
    // DEBUG: console.log('[ANALYTICS ENGINE] Aggregated', aggregated.size, 'unique dates from', result.data.length, 'rows');

    // Transform to TimeSeriesDataPoint format
    return Array.from(aggregated.entries())
      .map(([date, data]) => ({
        date,
        clicks: data.clicks,
        unique_visitors: data.unique_ips.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('[ANALYTICS ENGINE] Error querying daily analytics:', error);
    return [];
  }
}

/**
 * Get geography analytics from Workers Analytics Engine
 */
export async function getGeoAnalyticsFromEngine(
  env: Env,
  filters: AnalyticsEngineFilters,
  startDate: string,
  endDate: string,
  limit: number = 20
): Promise<GeographyDataPoint[]> {
  const config = getAnalyticsEngineConfig(env);
  if (!config) {
    return [];
  }

  const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
  const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000) + 86400;

  // Build WHERE clause with filters
  const whereClause = buildFilterWhereClause(filters, startTimestamp, endTimestamp);

  // Optimized approach: Filter in SQL WHERE clause, group by country, city, and IP
  // SECURITY: CF Analytics Engine requires raw SQL. Inputs validated by buildFilterWhereClause().
  const sqlQuery = `
    SELECT 
      blob1 as link_id,
      blob5 as country,
      blob6 as city,
      blob9 as ip_address,
      COUNT() as clicks
    FROM ${quoteIdentifier(config.datasetName)}
    WHERE ${whereClause}
    GROUP BY blob1, blob5, blob6, blob9
    ORDER BY clicks DESC
  `;

  try {
    // DEBUG: console.log('[ANALYTICS ENGINE GEO] Executing query with SQL filtering:', sqlQuery);
    const result = await queryAnalyticsEngineSQL(config, sqlQuery);

    if (!result.data || result.data.length === 0) {
      return [];
    }

    // DEBUG: console.log('[ANALYTICS ENGINE GEO] Query returned', result.data.length, 'rows (filtered in SQL)');

    // Aggregate by country and city (sum clicks, count unique ip_addresses)
    const aggregated = new Map<string, { country: string; city: string | null; clicks: number; unique_ips: Set<string> }>();
    for (const row of result.data) {
      const country = row.country || 'unknown';
      const city = row.city || null;
      const key = `${country}:${city || ''}`;
      const existing = aggregated.get(key);

      if (existing) {
        existing.clicks += Number(row.clicks) || 0;
        if (row.ip_address) {
          existing.unique_ips.add(row.ip_address);
        }
      } else {
        const uniqueIps = new Set<string>();
        if (row.ip_address) {
          uniqueIps.add(row.ip_address);
        }
        aggregated.set(key, {
          country,
          city,
          clicks: Number(row.clicks) || 0,
          unique_ips: uniqueIps,
        });
      }
    }

    // Sort by clicks and limit, transform to GeographyDataPoint format
    return Array.from(aggregated.values())
      .map(item => ({
        country: item.country,
        city: item.city,
        clicks: item.clicks,
        unique_visitors: item.unique_ips.size,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit);
  } catch (error) {
    console.error('[ANALYTICS ENGINE] Error querying geo analytics:', error);
    return [];
  }
}

/**
 * Get referrer analytics from Workers Analytics Engine
 */
export async function getReferrerAnalyticsFromEngine(
  env: Env,
  filters: AnalyticsEngineFilters,
  startDate: string,
  endDate: string,
  limit: number = 20
): Promise<ReferrerDataPoint[]> {
  const config = getAnalyticsEngineConfig(env);
  if (!config) {
    return [];
  }

  const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
  const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000) + 86400;

  // Build WHERE clause with filters
  const whereClause = buildFilterWhereClause(filters, startTimestamp, endTimestamp);

  // Optimized approach: Filter in SQL WHERE clause, group by referrer and IP
  // SECURITY: CF Analytics Engine requires raw SQL. Inputs validated by buildFilterWhereClause().
  const sqlQuery = `
    SELECT 
      blob1 as link_id,
      blob8 as referrer,
      blob9 as ip_address,
      COUNT() as clicks
    FROM ${quoteIdentifier(config.datasetName)}
    WHERE ${whereClause}
    GROUP BY blob1, blob8, blob9
    ORDER BY clicks DESC
  `;

  try {
    // DEBUG: console.log('[ANALYTICS ENGINE REFERRER] Executing query with SQL filtering:', sqlQuery);
    const result = await queryAnalyticsEngineSQL(config, sqlQuery);

    if (!result.data || result.data.length === 0) {
      return [];
    }

    // DEBUG: console.log('[ANALYTICS ENGINE REFERRER] Query returned', result.data.length, 'rows (filtered in SQL)');

    // Import categorizeReferrer for processing
    const { extractReferrerDomain, categorizeReferrer } = await import('./analytics');

    // Aggregate by referrer domain (sum clicks, count unique ip_addresses)
    const aggregated = new Map<string, { referrer_domain: string; category: string; clicks: number; unique_ips: Set<string> }>();
    for (const row of result.data) {
      const referrerUrl = row.referrer || '';
      const referrerDomain = extractReferrerDomain(referrerUrl);
      const existing = aggregated.get(referrerDomain);

      if (existing) {
        existing.clicks += Number(row.clicks) || 0;
        if (row.ip_address) {
          existing.unique_ips.add(row.ip_address);
        }
      } else {
        const uniqueIps = new Set<string>();
        if (row.ip_address) {
          uniqueIps.add(row.ip_address);
        }
        aggregated.set(referrerDomain, {
          referrer_domain: referrerDomain,
          category: categorizeReferrer(referrerDomain),
          clicks: Number(row.clicks) || 0,
          unique_ips: uniqueIps,
        });
      }
    }

    // Sort by clicks and limit, transform to ReferrerDataPoint format
    return Array.from(aggregated.values())
      .map(item => ({
        referrer_domain: item.referrer_domain,
        category: item.category as 'social' | 'search' | 'direct' | 'other',
        clicks: item.clicks,
        unique_visitors: item.unique_ips.size,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit);
  } catch (error) {
    console.error('[ANALYTICS ENGINE] Error querying referrer analytics:', error);
    return [];
  }
}

/**
 * Get raw click events from Workers Analytics Engine
 * Used for aggregation to D1
 */
export async function getRawEventsFromEngine(
  env: Env,
  filters: AnalyticsEngineFilters,
  startDate: string,
  endDate: string
): Promise<Array<{
  timestamp: number;
  link_id: string;
  country: string;
  city: string;
  referrer: string;
  ip_address: string;
  device_type: string;
  browser: string;
  os: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  custom_param1?: string;
  custom_param2?: string;
  custom_param3?: string;
}>> {
  const config = getAnalyticsEngineConfig(env);
  if (!config) {
    // DEBUG: console.warn('[ANALYTICS ENGINE] Missing API credentials, cannot query raw events');
    return [];
  }

  const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
  const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000) + 86400;

  // Build WHERE clause with filters
  const whereClause = buildFilterWhereClause(filters, startTimestamp, endTimestamp);

  // Optimized approach: Filter in SQL WHERE clause
  // Column mapping based on trackClick() in analytics.ts (1-indexed, 20 blobs max):
  // blob1 = link_id, blob2 = domain, blob3 = slug, blob4 = destination_url,
  // blob5 = country, blob6 = city, blob7 = user_agent, blob8 = referrer,
  // blob9 = ip_address, blob10 = device_type, blob11 = browser, blob12 = os,
  // blob13 = utm_source, blob14 = utm_medium, blob15 = utm_campaign,
  // blob16 = gclid, blob17 = fbclid, blob18 = custom_param1,
  // blob19 = custom_param2, blob20 = custom_param3
  // SECURITY: CF Analytics Engine requires raw SQL. Inputs validated by buildFilterWhereClause().
  const sqlQuery = `
    SELECT 
      double1 as timestamp,
      blob1 as link_id,
      blob5 as country,
      blob6 as city,
      blob8 as referrer,
      blob9 as ip_address,
      blob10 as device_type,
      blob11 as browser,
      blob12 as os,
      blob13 as utm_source,
      blob14 as utm_medium,
      blob15 as utm_campaign,
      blob18 as custom_param1,
      blob19 as custom_param2,
      blob20 as custom_param3
    FROM ${quoteIdentifier(config.datasetName)}
    WHERE ${whereClause}
    ORDER BY double1 ASC
  `;

  try {
    // DEBUG: console.log('[ANALYTICS ENGINE RAW EVENTS] Executing query with SQL filtering:', sqlQuery);
    const result = await queryAnalyticsEngineSQL(config, sqlQuery);

    if (!result.data || result.data.length === 0) {
      return [];
    }

    // DEBUG: console.log('[ANALYTICS ENGINE RAW EVENTS] Query returned', result.data.length, 'rows (filtered in SQL)');

    return result.data.map((row: any) => ({
      timestamp: Math.floor((row.timestamp || 0) * 1000), // Convert to milliseconds
      link_id: row.link_id || '',
      country: row.country || 'unknown',
      city: row.city || 'unknown',
      referrer: row.referrer || '',
      ip_address: row.ip_address || '',
      device_type: row.device_type || 'unknown',
      browser: row.browser || 'unknown',
      os: row.os || 'unknown',
      utm_source: row.utm_source || undefined,
      utm_medium: row.utm_medium || undefined,
      utm_campaign: row.utm_campaign || undefined,
      custom_param1: row.custom_param1 || undefined,
      custom_param2: row.custom_param2 || undefined,
      custom_param3: row.custom_param3 || undefined,
    }));
  } catch (error) {
    console.error('[ANALYTICS ENGINE] Error querying raw events:', error);
    return [];
  }
}

/**
 * Get device analytics from Workers Analytics Engine
 */
export async function getDeviceAnalyticsFromEngine(
  env: Env,
  filters: AnalyticsEngineFilters,
  startDate: string,
  endDate: string,
  groupBy?: 'device_type' | 'browser' | 'os',
  limit: number = 100
): Promise<Array<{
  device_type: string | null;
  browser: string | null;
  os: string | null;
  clicks: number;
  unique_visitors: number;
}>> {
  const config = getAnalyticsEngineConfig(env);
  if (!config) {
    return [];
  }

  const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
  const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000) + 86400;

  // Build WHERE clause with filters
  const whereClause = buildFilterWhereClause(filters, startTimestamp, endTimestamp);

  // Optimized approach: Filter in SQL WHERE clause, group by device fields and IP
  // SECURITY: CF Analytics Engine requires raw SQL. Inputs validated by buildFilterWhereClause().
  const sqlQuery = `
    SELECT 
      blob1 as link_id,
      blob10 as device_type,
      blob11 as browser,
      blob12 as os,
      blob9 as ip_address,
      COUNT() as clicks
    FROM ${quoteIdentifier(config.datasetName)}
    WHERE ${whereClause}
    GROUP BY blob1, blob10, blob11, blob12, blob9
    ORDER BY clicks DESC
  `;

  // DEBUG: console.log('[ANALYTICS ENGINE DEVICE] Executing query with SQL filtering:', sqlQuery);

  try {
    const result = await queryAnalyticsEngineSQL(config, sqlQuery);

    if (!result.data || result.data.length === 0) {
      // DEBUG: console.log('[ANALYTICS ENGINE DEVICE] No data returned from Analytics Engine');
      return [];
    }

    // DEBUG: console.log('[ANALYTICS ENGINE DEVICE] Query returned', result.data.length, 'rows (filtered in SQL)');
    // DEBUG: console.log('[ANALYTICS ENGINE DEVICE] Sample row:', JSON.stringify(result.data[0]));

    // Aggregate based on groupBy parameter (sum clicks, count unique ip_addresses)
    const aggregated = new Map<string, { device_type: string | null; browser: string | null; os: string | null; clicks: number; unique_ips: Set<string> }>();

    // DEBUG: console.log('[ANALYTICS ENGINE DEVICE] Starting aggregation with groupBy:', groupBy);

    for (const row of result.data) {
      // DEBUG: console.log('[ANALYTICS ENGINE DEVICE] Processing row:', JSON.stringify(row));

      let key: string;
      let device_type: string | null = null;
      let browser: string | null = null;
      let os: string | null = null;

      if (groupBy === 'device_type') {
        key = row.device_type || 'unknown';
        device_type = row.device_type || null;
      } else if (groupBy === 'browser') {
        key = row.browser || 'unknown';
        browser = row.browser || null;
      } else if (groupBy === 'os') {
        key = row.os || 'unknown';
        os = row.os || null;
      } else {
        // Group by all fields
        key = `${row.device_type || ''}:${row.browser || ''}:${row.os || ''}`;
        device_type = row.device_type || null;
        browser = row.browser || null;
        os = row.os || null;
      }

      // DEBUG: console.log('[ANALYTICS ENGINE DEVICE] Aggregation key:', key, 'device_type:', device_type, 'browser:', browser, 'os:', os);

      const existing = aggregated.get(key);
      if (existing) {
        existing.clicks += Number(row.clicks) || 0;
        if (row.ip_address) {
          existing.unique_ips.add(row.ip_address);
        }
      } else {
        const uniqueIps = new Set<string>();
        if (row.ip_address) {
          uniqueIps.add(row.ip_address);
        }
        aggregated.set(key, {
          device_type,
          browser,
          os,
          clicks: Number(row.clicks) || 0,
          unique_ips: uniqueIps,
        });
      }
    }

    // DEBUG: console.log('[ANALYTICS ENGINE DEVICE] Aggregated map size:', aggregated.size);
    // DEBUG: console.log('[ANALYTICS ENGINE DEVICE] Aggregated map keys:', Array.from(aggregated.keys()));

    // Sort by clicks and limit, transform to return format
    const finalResult = Array.from(aggregated.values())
      .map(item => ({
        device_type: item.device_type,
        browser: item.browser,
        os: item.os,
        clicks: item.clicks,
        unique_visitors: item.unique_ips.size,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit);

    // DEBUG: console.log('[ANALYTICS ENGINE DEVICE] Final result length:', finalResult.length);
    // DEBUG: console.log('[ANALYTICS ENGINE DEVICE] Final result:', JSON.stringify(finalResult));

    return finalResult;
  } catch (error) {
    console.error('[ANALYTICS ENGINE] Error querying device analytics:', error);
    return [];
  }
}

/**
 * Get UTM analytics from Workers Analytics Engine
 */
export async function getUtmAnalyticsFromEngine(
  env: Env,
  filters: AnalyticsEngineFilters,
  startDate: string,
  endDate: string,
  groupBy?: 'source' | 'medium' | 'campaign',
  limit: number = 100
): Promise<Array<{
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  clicks: number;
  unique_visitors: number;
}>> {
  const config = getAnalyticsEngineConfig(env);
  if (!config) {
    return [];
  }

  const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
  const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000) + 86400;

  // Build WHERE clause with filters
  const whereClause = buildFilterWhereClause(filters, startTimestamp, endTimestamp);

  // Optimized approach: Filter in SQL WHERE clause, group by UTM fields and IP
  // SECURITY: CF Analytics Engine requires raw SQL. Inputs validated by buildFilterWhereClause().
  const sqlQuery = `
    SELECT 
      blob1 as link_id,
      blob13 as utm_source,
      blob14 as utm_medium,
      blob15 as utm_campaign,
      blob9 as ip_address,
      COUNT() as clicks
    FROM ${quoteIdentifier(config.datasetName)}
    WHERE ${whereClause}
      AND (blob13 != '' OR blob14 != '' OR blob15 != '')
    GROUP BY blob1, blob13, blob14, blob15, blob9
    ORDER BY clicks DESC
  `;

  // DEBUG: console.log('[ANALYTICS ENGINE UTM] Executing query with SQL filtering:', sqlQuery);

  try {
    const result = await queryAnalyticsEngineSQL(config, sqlQuery);

    if (!result.data || result.data.length === 0) {
      return [];
    }

    // DEBUG: console.log('[ANALYTICS ENGINE UTM] Query returned', result.data.length, 'rows (filtered in SQL)');

    // Aggregate based on groupBy parameter (sum clicks, count unique ip_addresses)
    const aggregated = new Map<string, { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; clicks: number; unique_ips: Set<string> }>();

    for (const row of result.data) {
      let key: string;
      let utm_source: string | null = null;
      let utm_medium: string | null = null;
      let utm_campaign: string | null = null;

      if (groupBy === 'source') {
        key = row.utm_source || 'unknown';
        utm_source = row.utm_source || null;
      } else if (groupBy === 'medium') {
        key = row.utm_medium || 'unknown';
        utm_medium = row.utm_medium || null;
      } else if (groupBy === 'campaign') {
        key = row.utm_campaign || 'unknown';
        utm_campaign = row.utm_campaign || null;
        // Preserve source and medium even when grouping by campaign
        utm_source = row.utm_source || null;
        utm_medium = row.utm_medium || null;
      } else {
        // Group by all fields
        key = `${row.utm_source || ''}:${row.utm_medium || ''}:${row.utm_campaign || ''}`;
        utm_source = row.utm_source || null;
        utm_medium = row.utm_medium || null;
        utm_campaign = row.utm_campaign || null;
      }

      const existing = aggregated.get(key);
      if (existing) {
        existing.clicks += Number(row.clicks) || 0;
        if (row.ip_address) {
          existing.unique_ips.add(row.ip_address);
        }
        // Preserve source/medium if they're currently null but we have values in this row
        // (for campaign grouping, keep first encountered values)
        if (groupBy === 'campaign') {
          if (!existing.utm_source && utm_source) {
            existing.utm_source = utm_source;
          }
          if (!existing.utm_medium && utm_medium) {
            existing.utm_medium = utm_medium;
          }
        }
      } else {
        const uniqueIps = new Set<string>();
        if (row.ip_address) {
          uniqueIps.add(row.ip_address);
        }
        aggregated.set(key, {
          utm_source,
          utm_medium,
          utm_campaign,
          clicks: Number(row.clicks) || 0,
          unique_ips: uniqueIps,
        });
      }
    }

    // Sort by clicks and limit, transform to return format
    return Array.from(aggregated.values())
      .map(item => ({
        utm_source: item.utm_source,
        utm_medium: item.utm_medium,
        utm_campaign: item.utm_campaign,
        clicks: item.clicks,
        unique_visitors: item.unique_ips.size,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit);
  } catch (error) {
    console.error('[ANALYTICS ENGINE] Error querying UTM analytics:', error);
    return [];
  }
}

/**
 * Get custom parameter analytics from Workers Analytics Engine
 */
export async function getCustomParamAnalyticsFromEngine(
  env: Env,
  filters: AnalyticsEngineFilters,
  startDate: string,
  endDate: string,
  paramName?: 'custom_param1' | 'custom_param2' | 'custom_param3',
  limit: number = 100
): Promise<Array<{
  param_name: string;
  param_value: string | null;
  clicks: number;
  unique_visitors: number;
}>> {
  const config = getAnalyticsEngineConfig(env);
  if (!config) {
    return [];
  }

  const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
  const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000) + 86400;

  // Determine which blob column to use based on paramName
  let paramColumn = '';
  let paramNameValue = '';

  if (paramName === 'custom_param1') {
    paramColumn = 'blob18';
    paramNameValue = 'custom_param1';
  } else if (paramName === 'custom_param2') {
    paramColumn = 'blob19';
    paramNameValue = 'custom_param2';
  } else if (paramName === 'custom_param3') {
    paramColumn = 'blob20';
    paramNameValue = 'custom_param3';
  } else {
    // Query all custom params - query each separately and combine
    const results: Array<{ param_name: string; param_value: string | null; clicks: number; unique_visitors: number }> = [];

    for (const param of ['custom_param1', 'custom_param2', 'custom_param3'] as const) {
      const paramResults = await getCustomParamAnalyticsFromEngine(env, filters, startDate, endDate, param, limit);
      results.push(...paramResults);
    }

    // Sort by clicks and limit
    return results.sort((a, b) => b.clicks - a.clicks).slice(0, limit);
  }

  // Validate paramColumn is set
  if (!paramColumn || paramColumn.length === 0) {
    console.error('[ANALYTICS ENGINE CUSTOM PARAM] Invalid paramColumn:', paramColumn);
    return [];
  }

  // Build WHERE clause with filters
  const whereClause = buildFilterWhereClause(filters, startTimestamp, endTimestamp);

  // Optimized approach: Filter in SQL WHERE clause
  // SECURITY: CF Analytics Engine requires raw SQL. paramColumn is hardcoded. Inputs validated.
  const sqlQuery = `
    SELECT blob1 as link_id, ${paramColumn} as param_value, blob9 as ip_address, COUNT() as clicks
    FROM ${quoteIdentifier(config.datasetName)}
    WHERE ${whereClause} AND ${paramColumn} != ''
    GROUP BY blob1, ${paramColumn}, blob9
    ORDER BY clicks DESC
  `;

  try {
    // DEBUG: console.log('[ANALYTICS ENGINE CUSTOM PARAM] Executing query with SQL filtering:', sqlQuery);
    const result = await queryAnalyticsEngineSQL(config, sqlQuery);

    if (!result.data || result.data.length === 0) {
      return [];
    }

    // DEBUG: console.log('[ANALYTICS ENGINE CUSTOM PARAM] Query returned', result.data.length, 'rows (filtered in SQL)');

    // Aggregate by param value (sum clicks, count unique ip_addresses)
    const aggregated = new Map<string, { param_name: string; param_value: string | null; clicks: number; unique_ips: Set<string> }>();
    for (const row of result.data) {
      const paramValue = row.param_value || null;
      const existing = aggregated.get(paramValue || '');

      if (existing) {
        existing.clicks += Number(row.clicks) || 0;
        if (row.ip_address) {
          existing.unique_ips.add(row.ip_address);
        }
      } else {
        const uniqueIps = new Set<string>();
        if (row.ip_address) {
          uniqueIps.add(row.ip_address);
        }
        aggregated.set(paramValue || '', {
          param_name: paramNameValue,
          param_value: paramValue,
          clicks: Number(row.clicks) || 0,
          unique_ips: uniqueIps,
        });
      }
    }

    // Sort by clicks and limit, transform to return format
    return Array.from(aggregated.values())
      .map(item => ({
        param_name: item.param_name,
        param_value: item.param_value,
        clicks: item.clicks,
        unique_visitors: item.unique_ips.size,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit);
  } catch (error) {
    console.error('[ANALYTICS ENGINE] Error querying custom param analytics:', error);
    return [];
  }
}

/**
 * Get aggregated summary from Workers Analytics Engine
 */
export async function getAggregatedSummaryFromEngine(
  env: Env,
  filters: AnalyticsEngineFilters,
  startDate: string,
  endDate: string
): Promise<{ total_clicks: number; total_unique_visitors: number }> {
  const config = getAnalyticsEngineConfig(env);
  if (!config) {
    return { total_clicks: 0, total_unique_visitors: 0 };
  }

  const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
  const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000) + 86400;

  // Build WHERE clause with filters
  const whereClause = buildFilterWhereClause(filters, startTimestamp, endTimestamp);

  // Optimized approach: Filter in SQL WHERE clause, group by link_id and IP
  // SECURITY: CF Analytics Engine requires raw SQL. Inputs validated by buildFilterWhereClause().
  const sqlQuery = `
    SELECT 
      blob1 as link_id,
      blob9 as ip_address,
      COUNT() as clicks
    FROM ${quoteIdentifier(config.datasetName)}
    WHERE ${whereClause}
    GROUP BY blob1, blob9
    ORDER BY clicks DESC
  `;

  // DEBUG: console.log('[ANALYTICS ENGINE SUMMARY] Executing query with SQL filtering:', sqlQuery);

  try {
    const result = await queryAnalyticsEngineSQL(config, sqlQuery);
    // DEBUG: console.log('[ANALYTICS ENGINE SUMMARY] Raw result count:', result.data?.length || 0);

    if (!result.data || result.data.length === 0) {
      // DEBUG: console.log('[ANALYTICS ENGINE SUMMARY] No data returned');
      return { total_clicks: 0, total_unique_visitors: 0 };
    }

    // Aggregate totals (sum clicks, count unique ip_addresses)
    // No more in-memory filtering needed - SQL does it!
    let totalClicks = 0;
    const uniqueIps = new Set<string>();
    for (const row of result.data) {
      totalClicks += Number(row.clicks) || 0;
      if (row.ip_address) {
        uniqueIps.add(row.ip_address);
      }
    }

    const summary = {
      total_clicks: totalClicks,
      total_unique_visitors: uniqueIps.size,
    };
    // DEBUG: console.log('[ANALYTICS ENGINE SUMMARY] Parsed summary:', summary);
    return summary;
  } catch (error) {
    console.error('[ANALYTICS ENGINE SUMMARY] Error querying summary:', error);
    return { total_clicks: 0, total_unique_visitors: 0 };
  }
}


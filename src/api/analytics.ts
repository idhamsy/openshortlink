/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Analytics API endpoints

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type { Env, User, AnalyticsDevice, AnalyticsUtm } from '../types';
import { getLinkById, listLinks, countLinks } from '../db/links';
import { getDomainByName } from '../db/domains';
import { authMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { canAccessDomain } from '../utils/permissions';
import {
  getDailyAnalytics,
  getDailyAnalyticsForLinks,
  getDailyAnalyticsByDomains,
  getGeoAnalytics,
  getReferrerAnalytics,
  getAggregatedSummary,
  getAggregatedSummaryByDomains,
  getTopLinksByClicks,
  getDeviceAnalytics,
  getUtmAnalytics,
  getCustomParamAnalytics,
  getCustomParamAnalyticsByFilters,
  getDeviceAnalyticsByFilters,
  getUtmAnalyticsByFilters,
  getGeoAnalyticsByFilters,
  getReferrerAnalyticsByFilters,
} from '../db/analytics';
import { getFilteredLinkIds } from '../db/links';
import {
  extractReferrerDomain,
  categorizeReferrer,
  formatDateForGrouping,
  calculateGrowth,
  type TimeSeriesDataPoint,
  type GeographyDataPoint,
  type ReferrerDataPoint,
} from '../services/analytics';
import {
  determineDataSources,
  mergeTimeSeries,
  mergeGeographyData,
  mergeReferrerData,
  mergeDeviceData,
  mergeUtmData,
  mergeCustomParamData,
} from '../services/analyticsQueryRouter';
import {
  getDailyAnalyticsFromEngine,
  getGeoAnalyticsFromEngine,
  getReferrerAnalyticsFromEngine,
  getDeviceAnalyticsFromEngine,
  getUtmAnalyticsFromEngine,
  getCustomParamAnalyticsFromEngine,
  getAggregatedSummaryFromEngine,
  getDailyAnalyticsFromEngineBatched,
  getGeoAnalyticsFromEngineBatched,
  getReferrerAnalyticsFromEngineBatched,
  getDeviceAnalyticsFromEngineBatched,
  getUtmAnalyticsFromEngineBatched,
  getCustomParamAnalyticsFromEngineBatched,
  getAggregatedSummaryFromEngineBatched,
  type AnalyticsEngineFilters,
} from '../services/analyticsEngineQuery';
import { getAnalyticsAggregationEnabledOrDefault } from '../db/settings';

/**
 * Get cache key for analytics data
 */
function getAnalyticsCacheKey(type: string, identifier: string, params: Record<string, string | undefined>): string {
  const paramStr = Object.entries(params)
    .filter(([_, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|');
  return `analytics:${type}:${identifier}:${paramStr}`;
}

/**
 * Get cache TTL based on data source
 * Analytics Engine queries: shorter TTL (5 minutes) - data changes frequently
 * D1 queries: longer TTL (1 hour) - aggregated data changes less frequently
 * Mixed queries: use shorter TTL for safety
 */
function getCacheTTL(dataSource: 'analytics_engine' | 'd1' | 'mixed' | undefined): number {
  if (dataSource === 'analytics_engine' || dataSource === 'mixed') {
    return 300; // 5 minutes
  }
  return 3600; // 1 hour
}

/**
 * Get cached analytics data
 */
async function getCachedAnalytics<T>(env: Env, key: string): Promise<T | null> {
  try {
    const cached = await env.CACHE.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (error) {
    console.error('[CACHE ERROR] Failed to get cached analytics:', error);
  }
  return null;
}

/**
 * Set cached analytics data
 */
async function setCachedAnalytics<T>(env: Env, key: string, data: T, ttl: number = 300): Promise<void> {
  try {
    await env.CACHE.put(key, JSON.stringify(data), { expirationTtl: ttl });
  } catch (error) {
    console.error('[CACHE ERROR] Failed to cache analytics:', error);
  }
}

const analyticsRouter = new Hono<{ Bindings: Env }>();

/**
 * Check if Analytics Engine API credentials are properly configured
 * Returns null if valid, or an error message string if invalid
 */
function checkAnalyticsEngineCredentials(env: Env): string | null {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = env.CLOUDFLARE_API_TOKEN?.trim();

  // DEBUG: Debug logging
  // console.log('[CREDENTIAL CHECK] Checking credentials:', {
  //   hasAccountId: !!accountId,
  //   accountIdLength: accountId?.length || 0,
  //   accountIdPreview: accountId ? accountId.substring(0, 8) + '...' : 'missing',
  //   hasApiToken: !!apiToken,
  //   apiTokenLength: apiToken?.length || 0,
  //   apiTokenPreview: apiToken ? apiToken.substring(0, 8) + '...' : 'missing',
  //   accountIdValue: accountId || 'undefined',
  //   apiTokenValue: apiToken ? '***' + apiToken.substring(apiToken.length - 4) : 'undefined'
  // });

  if (!accountId || accountId.length === 0) {
    // DEBUG: console.log('[CREDENTIAL CHECK] FAILED: Account ID missing or empty');
    return 'Analytics Engine API credentials are required to query recent data (< 89 days). Please configure CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.';
  }

  if (!apiToken || apiToken.length === 0) {
    // DEBUG: console.log('[CREDENTIAL CHECK] FAILED: API Token missing or empty');
    return 'Analytics Engine API credentials are required to query recent data (< 89 days). Please configure CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.';
  }

  // DEBUG: console.log('[CREDENTIAL CHECK] SUCCESS: Both credentials present');
  return null; // Credentials are valid
}

// Base analytics query schema with comprehensive filtering
const analyticsQuerySchema = z.object({
  link_id: z.string().optional(),
  link_ids: z.string().optional().transform((val) => val ? val.split(',').filter(Boolean) : undefined),
  domain_id: z.string().optional(),
  domain_ids: z.string().optional().transform((val) => val ? val.split(',').filter(Boolean) : undefined),
  domain_names: z.string().optional().transform((val) => val ? val.split(',').filter(Boolean) : undefined), // For direct domain filtering
  tag_ids: z.string().optional().transform((val) => val ? val.split(',').filter(Boolean) : undefined),
  category_ids: z.string().optional().transform((val) => val ? val.split(',').filter(Boolean) : undefined),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  group_by: z.string().optional(), // Flexible group_by for different breakdown types
  limit: z.string().optional().transform((val) => (val ? parseInt(val) : undefined)),
  offset: z.string().optional().transform((val) => (val ? parseInt(val) : undefined)),
  data_source: z.enum(['auto', 'analytics_engine', 'd1']).optional().default('auto'), // Data source preference
});

// Get link analytics
analyticsRouter.get('/links/:id', authMiddleware, requirePermission('view_analytics'), async (c) => {
  try {
    const id = c.req.param('id');
    const link = await getLinkById(c.env, id);

    if (!link) {
      throw new HTTPException(404, { message: 'Link not found' });
    }

    // Check domain access
    const user = (c as any).get('user') as User;
    const hasAccess = await canAccessDomain(c.env, user, link.domain_id);
    if (!hasAccess) {
      throw new HTTPException(403, { message: 'Access denied. You do not have access to this domain.' });
    }

    const queryParams = analyticsQuerySchema.parse({
      start_date: c.req.query('start_date'),
      end_date: c.req.query('end_date'),
      group_by: c.req.query('group_by') || 'day',
      data_source: c.req.query('data_source') || 'auto',
    });

    // Default date range: last 30 days
    const endDate = queryParams.end_date || new Date().toISOString().slice(0, 10);
    const startDate = queryParams.start_date || (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString().slice(0, 10);
    })();

    // Check aggregation settings
    const aggregationSettings = await getAnalyticsAggregationEnabledOrDefault(c.env);

    // Determine data sources
    const dataSourceDecision = await determineDataSources(
      c.env,
      startDate,
      endDate,
      queryParams.data_source
    );

    // If aggregation disabled and requesting old data, return error
    if (!dataSourceDecision.aggregationEnabled && dataSourceDecision.splitRange.old !== null) {
      throw new HTTPException(400, {
        message: 'Data older than 89 days is not available. Analytics aggregation is disabled.',
      });
    }

    // If forcing D1 but aggregation disabled, return error
    if (!dataSourceDecision.aggregationEnabled && queryParams.data_source === 'd1') {
      throw new HTTPException(400, {
        message: 'Cannot use D1 data source. Analytics aggregation is disabled.',
      });
    }

    // Check cache (include data_source in cache key)
    const cacheKey = getAnalyticsCacheKey('link', id, {
      start_date: startDate,
      end_date: endDate,
      data_source: queryParams.data_source,
    });
    const cached = await getCachedAnalytics<any>(c.env, cacheKey);
    if (cached) {
      return c.json(cached);
    }

    // Query appropriate data sources
    let timeSeries: TimeSeriesDataPoint[] = [];
    let geography: GeographyDataPoint[] = [];
    let referrers: ReferrerDataPoint[] = [];

    // Device breakdowns (from Analytics Engine - different structure than D1)
    let deviceTypes: Array<{
      device_type: string | null;
      browser: string | null;
      os: string | null;
      clicks: number;
      unique_visitors: number;
    }> = [];
    let browsers: Array<{
      device_type: string | null;
      browser: string | null;
      os: string | null;
      clicks: number;
      unique_visitors: number;
    }> = [];
    let os: Array<{
      device_type: string | null;
      browser: string | null;
      os: string | null;
      clicks: number;
      unique_visitors: number;
    }> = [];

    // UTM breakdowns (from Analytics Engine - different structure than D1)
    let utmSources: Array<{
      utm_source: string | null;
      utm_medium: string | null;
      utm_campaign: string | null;
      clicks: number;
      unique_visitors: number;
    }> = [];
    let utmMediums: Array<{
      utm_source: string | null;
      utm_medium: string | null;
      utm_campaign: string | null;
      clicks: number;
      unique_visitors: number;
    }> = [];
    let utmCampaigns: Array<{
      utm_source: string | null;
      utm_medium: string | null;
      utm_campaign: string | null;
      clicks: number;
      unique_visitors: number;
    }> = [];

    let summaryClicks = 0;
    let summaryUniqueVisitors = 0;
    const warnings: string[] = [];
    let analyticsEngineFailed = false;

    // Query recent data from Analytics Engine
    if (dataSourceDecision.useAnalyticsEngine && dataSourceDecision.splitRange.recent) {
      // Check if API tokens are available (required for Analytics Engine queries)
      const credentialError = checkAnalyticsEngineCredentials(c.env);
      if (credentialError) {
        warnings.push(credentialError);
      } else {
        try {
          const recentTimeSeries = await getDailyAnalyticsFromEngine(
            c.env,
            { linkIds: [link.id] },
            dataSourceDecision.splitRange.recent.start,
            dataSourceDecision.splitRange.recent.end
          );
          timeSeries.push(...recentTimeSeries);

          const recentGeo = await getGeoAnalyticsFromEngine(
            c.env,
            { linkIds: [link.id] },
            dataSourceDecision.splitRange.recent.start,
            dataSourceDecision.splitRange.recent.end,
            20
          );
          geography.push(...recentGeo);

          const recentReferrers = await getReferrerAnalyticsFromEngine(
            c.env,
            { linkIds: [link.id] },
            dataSourceDecision.splitRange.recent.start,
            dataSourceDecision.splitRange.recent.end,
            20
          );
          referrers.push(...recentReferrers);

          // Fetch Device Breakdowns
          const recentDeviceTypes = await getDeviceAnalyticsFromEngine(
            c.env,
            { linkIds: [link.id] },
            dataSourceDecision.splitRange.recent.start,
            dataSourceDecision.splitRange.recent.end,
            'device_type',
            20
          );
          // DEBUG: console.log('[LINK ANALYTICS] recentDeviceTypes:', JSON.stringify(recentDeviceTypes));
          deviceTypes.push(...recentDeviceTypes);

          const recentBrowsers = await getDeviceAnalyticsFromEngine(
            c.env,
            { linkIds: [link.id] },
            dataSourceDecision.splitRange.recent.start,
            dataSourceDecision.splitRange.recent.end,
            'browser',
            20
          );
          // DEBUG: console.log('[LINK ANALYTICS] recentBrowsers:', JSON.stringify(recentBrowsers));
          browsers.push(...recentBrowsers);

          const recentOs = await getDeviceAnalyticsFromEngine(
            c.env,
            { linkIds: [link.id] },
            dataSourceDecision.splitRange.recent.start,
            dataSourceDecision.splitRange.recent.end,
            'os',
            20
          );
          // DEBUG: console.log('[LINK ANALYTICS] recentOs:', JSON.stringify(recentOs));
          os.push(...recentOs);


          // Fetch UTM Breakdowns
          const recentUtmSources = await getUtmAnalyticsFromEngine(
            c.env,
            { linkIds: [link.id] },
            dataSourceDecision.splitRange.recent.start,
            dataSourceDecision.splitRange.recent.end,
            'source',
            20
          );
          utmSources.push(...recentUtmSources);

          const recentUtmMediums = await getUtmAnalyticsFromEngine(
            c.env,
            { linkIds: [link.id] },
            dataSourceDecision.splitRange.recent.start,
            dataSourceDecision.splitRange.recent.end,
            'medium',
            20
          );
          utmMediums.push(...recentUtmMediums);

          const recentUtmCampaigns = await getUtmAnalyticsFromEngine(
            c.env,
            { linkIds: [link.id] },
            dataSourceDecision.splitRange.recent.start,
            dataSourceDecision.splitRange.recent.end,
            'campaign',
            20
          );
          utmCampaigns.push(...recentUtmCampaigns);

          const recentSummary = await getAggregatedSummaryFromEngine(
            c.env,
            { linkIds: [link.id] },
            dataSourceDecision.splitRange.recent.start,
            dataSourceDecision.splitRange.recent.end
          );
          summaryClicks += recentSummary.total_clicks;
          summaryUniqueVisitors = Math.max(summaryUniqueVisitors, recentSummary.total_unique_visitors);
        } catch (error) {
          console.error('[ANALYTICS] Error querying Analytics Engine:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to query Analytics Engine';
          warnings.push(`Failed to query Analytics Engine: ${errorMessage}. Please check API credentials and try again.`);
          analyticsEngineFailed = true;
        }
      }
    } else if (dataSourceDecision.splitRange.recent !== null && !dataSourceDecision.useAnalyticsEngine) {
      // Recent data requested but cannot query Analytics Engine (no API tokens)
      const credentialError = checkAnalyticsEngineCredentials(c.env);
      if (credentialError) {
        warnings.push(credentialError);
      } else {
        warnings.push('Cannot query recent data (< 89 days). Analytics Engine API credentials are required.');
      }
    }

    // Query old data from D1
    if (dataSourceDecision.useD1 && dataSourceDecision.splitRange.old) {
      try {
        const oldDaily = await getDailyAnalytics(
          c.env,
          link.id,
          dataSourceDecision.splitRange.old.start,
          dataSourceDecision.splitRange.old.end
        );
        const oldTimeSeries: TimeSeriesDataPoint[] = oldDaily.map(day => ({
          date: day.date,
          clicks: day.clicks,
          unique_visitors: day.unique_visitors,
        }));
        timeSeries = mergeTimeSeries(timeSeries, oldTimeSeries);

        const oldGeo = await getGeoAnalytics(
          c.env,
          {
            linkIds: [link.id],
            startDate: dataSourceDecision.splitRange.old.start,
            endDate: dataSourceDecision.splitRange.old.end,
            limit: 20
          }
        );
        const oldGeoPoints: GeographyDataPoint[] = oldGeo.map(geo => ({
          country: geo.country || 'unknown',
          city: geo.city || null,
          clicks: geo.clicks,
          unique_visitors: 0,
        }));
        geography = mergeGeographyData(geography, oldGeoPoints);

        const oldReferrers = await getReferrerAnalytics(
          c.env,
          {
            linkIds: [link.id],
            startDate: dataSourceDecision.splitRange.old.start,
            endDate: dataSourceDecision.splitRange.old.end,
            limit: 20
          }
        );
        const oldReferrerPoints: ReferrerDataPoint[] = oldReferrers.map(ref => ({
          referrer_domain: ref.referrer_domain || 'direct',
          clicks: ref.clicks,
          unique_visitors: 0,
          category: categorizeReferrer(ref.referrer_domain || 'direct'),
        }));
        referrers = mergeReferrerData(referrers, oldReferrerPoints);

        // Merge Device Data
        const oldDeviceTypes = await getDeviceAnalytics(c.env, { linkIds: [link.id], startDate: dataSourceDecision.splitRange.old.start, endDate: dataSourceDecision.splitRange.old.end, groupBy: 'device_type', limit: 20 });
        deviceTypes = mergeDeviceData(deviceTypes, oldDeviceTypes);

        const oldBrowsers = await getDeviceAnalytics(c.env, { linkIds: [link.id], startDate: dataSourceDecision.splitRange.old.start, endDate: dataSourceDecision.splitRange.old.end, groupBy: 'browser', limit: 20 });
        browsers = mergeDeviceData(browsers, oldBrowsers);

        const oldOs = await getDeviceAnalytics(c.env, { linkIds: [link.id], startDate: dataSourceDecision.splitRange.old.start, endDate: dataSourceDecision.splitRange.old.end, groupBy: 'os', limit: 20 });
        os = mergeDeviceData(os, oldOs);

        // Merge UTM Data
        const oldUtmSources = await getUtmAnalytics(c.env, { linkIds: [link.id], startDate: dataSourceDecision.splitRange.old.start, endDate: dataSourceDecision.splitRange.old.end, groupBy: 'source', limit: 20 });
        utmSources = mergeUtmData(utmSources, oldUtmSources);

        const oldUtmMediums = await getUtmAnalytics(c.env, { linkIds: [link.id], startDate: dataSourceDecision.splitRange.old.start, endDate: dataSourceDecision.splitRange.old.end, groupBy: 'medium', limit: 20 });
        utmMediums = mergeUtmData(utmMediums, oldUtmMediums);

        const oldUtmCampaigns = await getUtmAnalytics(c.env, { linkIds: [link.id], startDate: dataSourceDecision.splitRange.old.start, endDate: dataSourceDecision.splitRange.old.end, groupBy: 'campaign', limit: 20 });
        utmCampaigns = mergeUtmData(utmCampaigns, oldUtmCampaigns);

        summaryClicks += oldDaily.reduce((sum, day) => sum + day.clicks, 0);
        summaryUniqueVisitors = Math.max(
          summaryUniqueVisitors,
          ...oldDaily.map(day => day.unique_visitors)
        );
      } catch (error) {
        console.error('[ANALYTICS] Error querying D1:', error);
      }
    }

    // If no data sources were used, fallback to D1 (for backward compatibility)
    if (timeSeries.length === 0) {
      const dailyAnalytics = await getDailyAnalytics(c.env, link.id, startDate, endDate);
      timeSeries = dailyAnalytics.map(day => ({
        date: day.date,
        clicks: day.clicks,
        unique_visitors: day.unique_visitors,
      }));
      summaryClicks = dailyAnalytics.reduce((sum, day) => sum + day.clicks, 0);
      summaryUniqueVisitors = Math.max(
        summaryUniqueVisitors,
        ...dailyAnalytics.map(day => day.unique_visitors)
      );

      // Fallback fetches for breakdowns - ONLY if we don't already have data from Analytics Engine
      if (deviceTypes.length === 0) {
        deviceTypes = await getDeviceAnalytics(c.env, { linkIds: [link.id], startDate, endDate, groupBy: 'device_type', limit: 20 });
      }
      if (browsers.length === 0) {
        browsers = await getDeviceAnalytics(c.env, { linkIds: [link.id], startDate, endDate, groupBy: 'browser', limit: 20 });
      }
      if (os.length === 0) {
        os = await getDeviceAnalytics(c.env, { linkIds: [link.id], startDate, endDate, groupBy: 'os', limit: 20 });
      }

      if (utmSources.length === 0) {
        utmSources = await getUtmAnalytics(c.env, { linkIds: [link.id], startDate, endDate, groupBy: 'source', limit: 20 });
      }
      if (utmMediums.length === 0) {
        utmMediums = await getUtmAnalytics(c.env, { linkIds: [link.id], startDate, endDate, groupBy: 'medium', limit: 20 });
      }
      if (utmCampaigns.length === 0) {
        utmCampaigns = await getUtmAnalytics(c.env, { linkIds: [link.id], startDate, endDate, groupBy: 'campaign', limit: 20 });
      }
    }

    // Calculate summary
    const totalClicks = summaryClicks || link.click_count || 0;
    const totalUniqueVisitors = Math.max(summaryUniqueVisitors, link.unique_visitors || 0);
    const avgClicksPerDay = timeSeries.length > 0 ? totalClicks / timeSeries.length : 0;

    // Sort time series by date
    timeSeries.sort((a, b) => a.date.localeCompare(b.date));

    const response = {
      success: true,
      data: {
        link_id: link.id,
        summary: {
          total_clicks: totalClicks,
          unique_visitors: totalUniqueVisitors,
          avg_clicks_per_day: Math.round(avgClicksPerDay * 100) / 100,
          last_clicked: timeSeries.length > 0 ? timeSeries[timeSeries.length - 1].date : null,
        },
        time_series: timeSeries,
        geography: geography,
        referrers: referrers,
        devices: {
          types: deviceTypes,
          browsers: browsers,
          os: os
        },
        utm: {
          sources: utmSources,
          mediums: utmMediums,
          campaigns: utmCampaigns
        }
      },
      meta: {
        data_source: dataSourceDecision.useAnalyticsEngine && dataSourceDecision.useD1
          ? (analyticsEngineFailed ? 'd1_partial' : 'mixed')
          : dataSourceDecision.useAnalyticsEngine
            ? (analyticsEngineFailed ? 'none' : 'analytics_engine')
            : 'd1',
        aggregation_enabled: dataSourceDecision.aggregationEnabled,
        group_by: queryParams.group_by || 'day',
        date_ranges: {
          analytics_engine: dataSourceDecision.splitRange.recent || undefined,
          d1: dataSourceDecision.splitRange.old || undefined,
        },
        warnings: warnings.length > 0 ? warnings : undefined,
        incomplete: analyticsEngineFailed,
        missing_date_range: analyticsEngineFailed ? dataSourceDecision.splitRange.recent : undefined,
      },
    };

    // DEBUG: Log final data structure before sending
    // console.log('[LINK ANALYTICS RESPONSE] devices:', JSON.stringify(response.data.devices));
    // console.log('[LINK ANALYTICS RESPONSE] deviceTypes count:', deviceTypes.length);
    // console.log('[LINK ANALYTICS RESPONSE] browsers count:', browsers.length);
    // console.log('[LINK ANALYTICS RESPONSE] os count:', os.length);

    // Cache response with appropriate TTL based on data source
    try {
      const dataSource = response.meta?.data_source as 'analytics_engine' | 'd1' | 'mixed' | undefined;
      const ttl = getCacheTTL(dataSource);
      await setCachedAnalytics(c.env, cacheKey, response, ttl);
    } catch (error) {
      console.error('[ANALYTICS] Error caching response:', error);
      // Continue even if caching fails
    }

    return c.json(response);
  } catch (error) {
    console.error('[ANALYTICS ERROR] Link analytics endpoint error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, {
      message: error instanceof Error ? error.message : 'An internal error occurred',
    });
  }
});

// Get dashboard analytics
analyticsRouter.get('/dashboard', authMiddleware, requirePermission('view_analytics'), async (c) => {
  try {
    const queryParams = analyticsQuerySchema.parse({
      link_id: c.req.query('link_id'),
      domain_id: c.req.query('domain_id'),
      domain_names: c.req.query('domain_names'),
      tag_ids: c.req.query('tag_ids'),
      category_ids: c.req.query('category_ids'),
      start_date: c.req.query('start_date'),
      end_date: c.req.query('end_date'),
      group_by: c.req.query('group_by') || 'day',
      limit: c.req.query('limit'),
      data_source: c.req.query('data_source') || 'auto',
    });

    const user = (c as any).get('user') as User;

    // Get accessible domain IDs
    const hasGlobalAccess = user.global_access || user.role === 'admin' || user.role === 'owner';
    let accessibleDomainIds: string[] = [];

    if (!hasGlobalAccess) {
      accessibleDomainIds = (user as any).accessible_domain_ids || [];
      if (accessibleDomainIds.length === 0) {
        // No accessible domains
        return c.json({
          success: true,
          data: {
            summary: { total_clicks: 0, total_links: 0, active_links: 0, total_unique_visitors: 0, growth: { clicks: 0, trend: 'stable' } },
            time_series: [],
            top_links: [],
            geography: [],
            referrers: [],
            devices: [],
          },
        });
      }
    }

    // Check domain access if domain_id is provided
    if (queryParams.domain_id) {
      const hasAccess = await canAccessDomain(c.env, user, queryParams.domain_id);
      if (!hasAccess) {
        throw new HTTPException(403, { message: 'Access denied. You do not have access to this domain.' });
      }
    }

    // Get links count (for summary stats) - but don't fetch all link data
    const totalLinks = await countLinks(c.env, {
      domainIds: accessibleDomainIds.length > 0 ? accessibleDomainIds : undefined,
      domainId: queryParams.domain_id,
      status: 'active',
    });

    const activeLinks = totalLinks; // All counted links are active (filtered by status)

    // Default date range: last 30 days
    const endDate = queryParams.end_date || new Date().toISOString().slice(0, 10);
    const startDate = queryParams.start_date || (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString().slice(0, 10);
    })();

    // Determine data sources
    const dataSourceDecision = await determineDataSources(
      c.env,
      startDate,
      endDate,
      queryParams.data_source
    );

    // If aggregation disabled and requesting old data, return error
    if (!dataSourceDecision.aggregationEnabled && dataSourceDecision.splitRange.old !== null) {
      throw new HTTPException(400, {
        message: 'Data older than 89 days is not available. Analytics aggregation is disabled.',
      });
    }

    // Check cache (include filters in cache key)
    const cacheKey = getAnalyticsCacheKey('dashboard', user.id, {
      domain_id: queryParams.domain_id,
      domain_names: queryParams.domain_names?.join(','),
      tag_ids: queryParams.tag_ids?.join(','),
      category_ids: queryParams.category_ids?.join(','),
      start_date: startDate,
      end_date: endDate,
      data_source: queryParams.data_source,
    });
    const cached = await getCachedAnalytics<any>(c.env, cacheKey);
    if (cached) {
      return c.json(cached);
    }

    // Convert domain_names to domain_ids if provided
    // NOTE: We convert for D1 queries, but Analytics Engine queries should use domain_names directly
    let domainIdsFromNames: string[] | undefined;
    if (queryParams.domain_names && queryParams.domain_names.length > 0) {
      const domainIdPromises = queryParams.domain_names.map(name => 
        getDomainByName(c.env, name).then(domain => domain?.id)
      );
      const domainIds = (await Promise.all(domainIdPromises)).filter((id): id is string => !!id);
      if (domainIds.length > 0) {
        domainIdsFromNames = domainIds;
        // DEBUG: console.log('[ANALYTICS DASHBOARD] Converted domain_names to domain_ids:', {
        //   domain_names: queryParams.domain_names,
        //   domain_ids: domainIds
        // });
      } else {
        // DEBUG: console.warn('[ANALYTICS DASHBOARD] Could not convert domain_names to domain_ids:', queryParams.domain_names);
      }
    }

    // Build filters using getAnalyticsFilters for consistency with breakdown endpoints
    // This properly handles global access users (domainIds: undefined = all domains)
    // Priority: domain_ids from domain_names > domain_ids from query > domain_id from query
    const d1Filters = await getAnalyticsFilters(c.env, user, {
      domain_id: queryParams.domain_id,
      domain_ids: domainIdsFromNames || queryParams.domain_ids,
      tag_ids: queryParams.tag_ids,
      category_ids: queryParams.category_ids,
    });

    // Build Analytics Engine filters based on query parameters
    // Priority: domain_names (direct) > tag_ids/category_ids (requires link ID lookup)
    let analyticsEngineFilters: { linkIds?: string[]; domainNames?: string[] } = {};
    let linkIds: string[] = [];

    // Get linkIds for Analytics Engine queries - this handles undefined domainIds correctly
    linkIds = await getFilteredLinkIds(c.env, {
      domainIds: d1Filters.domainIds,
      tagIds: d1Filters.tagIds,
      categoryIds: d1Filters.categoryIds,
      status: 'active',
    });
    
    // DEBUG: console.log('[ANALYTICS DASHBOARD] Filter results:', {
    //   d1Filters: {
    //     domainIds: d1Filters.domainIds?.length || 0,
    //     tagIds: d1Filters.tagIds?.length || 0,
    //     categoryIds: d1Filters.categoryIds?.length || 0,
    //   },
    //   linkIdsCount: linkIds.length,
    //   domainNames: queryParams.domain_names?.length || 0,
    // });

    // Build Analytics Engine filters using helper function
    const engineFilterResult = buildAnalyticsEngineFilters(
      linkIds,
      d1Filters,
      queryParams.domain_names
    );
    analyticsEngineFilters = engineFilterResult.filters;
    const needsBatching = engineFilterResult.needsBatching;
    const fullLinkIds = engineFilterResult.fullLinkIds;
    
    // DEBUG: console.log('[ANALYTICS DASHBOARD] Analytics Engine filters:', {
    //   hasLinkIds: !!analyticsEngineFilters.linkIds,
    //   linkIdsCount: analyticsEngineFilters.linkIds?.length || 0,
    //   hasDomainNames: !!analyticsEngineFilters.domainNames,
    //   domainNamesCount: analyticsEngineFilters.domainNames?.length || 0,
    //   needsBatching,
    //   fullLinkIdsCount: fullLinkIds.length,
    // });

    // Query appropriate data sources
    let timeSeries: TimeSeriesDataPoint[] = [];
    let summary = { total_clicks: 0, total_unique_visitors: 0 };
    const warnings: string[] = [];
    
    // Initialize analytics arrays (will be populated from Analytics Engine or remain empty)
    let geography: GeographyDataPoint[] = [];
    let referrers: ReferrerDataPoint[] = [];
    let devices: Array<{
      device_type: string | null;
      browser: string | null;
      os: string | null;
      clicks: number;
      unique_visitors: number;
    }> = [];
    let utmCampaigns: Array<{
      utm_source: string | null;
      utm_medium: string | null;
      utm_campaign: string | null;
      clicks: number;
      unique_visitors: number;
    }> = [];
    let customParams: Array<{
      param_name: string;
      param_value: string | null;
      clicks: number;
      unique_visitors: number;
    }> = [];

    // DEBUG: Debug logging
    // console.log('[ANALYTICS DASHBOARD] Data source decision:', {
    //   useAnalyticsEngine: dataSourceDecision.useAnalyticsEngine,
    //   useD1: dataSourceDecision.useD1,
    //   hasRecentRange: !!dataSourceDecision.splitRange.recent,
    //   hasOldRange: !!dataSourceDecision.splitRange.old,
    //   recentRange: dataSourceDecision.splitRange.recent,
    //   oldRange: dataSourceDecision.splitRange.old,
    //   linkIdsCount: linkIds.length,
    //   aggregationEnabled: dataSourceDecision.aggregationEnabled,
    //   startDate: queryParams.start_date,
    //   endDate: queryParams.end_date
    // });

    // Query recent data from Analytics Engine
    // Query if we have filters OR if we have linkIds (even if filters are empty for "ALL" with >100 links)
    // This matches the logic in breakdown endpoints but also handles batching case
    if (dataSourceDecision.useAnalyticsEngine && dataSourceDecision.splitRange.recent && 
        (analyticsEngineFilters.linkIds?.length || analyticsEngineFilters.domainNames?.length || 
         (needsBatching && fullLinkIds.length > 0) ||
         linkIds.length > 0 ||
         (!d1Filters.domainIds && !d1Filters.tagIds && !d1Filters.categoryIds))) {
      // DEBUG: console.log('[ANALYTICS DASHBOARD] Attempting to query Analytics Engine...');
      // Check if API tokens are available (required for Analytics Engine queries)
      const credentialError = checkAnalyticsEngineCredentials(c.env);
      // DEBUG: console.log('[ANALYTICS DASHBOARD] Credential check result:', credentialError || 'OK');
      if (credentialError) {
        warnings.push(credentialError);
      } else {
        // DEBUG: console.log('[ANALYTICS DASHBOARD] Credentials OK, executing Analytics Engine queries...');
        try {
          // DEBUG: console.log('[ANALYTICS DASHBOARD] Querying with filters:', {
          //   domainNames: analyticsEngineFilters.domainNames?.length || 0,
          //   linkIds: analyticsEngineFilters.linkIds?.length || 0,
          //   startDate: dataSourceDecision.splitRange.recent.start,
          //   endDate: dataSourceDecision.splitRange.recent.end
          // });

          // Query all analytics data in parallel
          // Use batched versions if needed (linkIds > 100 with tag/category filters)
          const [recentSummary, recentTimeSeries, recentGeo, recentReferrers, recentDevices, recentUtm, recentCustomParams] = await Promise.all([
            needsBatching && fullLinkIds.length > 0
              ? getAggregatedSummaryFromEngineBatched(
                  c.env,
                  fullLinkIds,
                  dataSourceDecision.splitRange.recent.start,
                  dataSourceDecision.splitRange.recent.end
                )
              : getAggregatedSummaryFromEngine(
                  c.env,
                  analyticsEngineFilters,
                  dataSourceDecision.splitRange.recent.start,
                  dataSourceDecision.splitRange.recent.end
                ),
            needsBatching && fullLinkIds.length > 0
              ? getDailyAnalyticsFromEngineBatched(
                  c.env,
                  fullLinkIds,
                  dataSourceDecision.splitRange.recent.start,
                  dataSourceDecision.splitRange.recent.end
                )
              : getDailyAnalyticsFromEngine(
                  c.env,
                  analyticsEngineFilters,
                  dataSourceDecision.splitRange.recent.start,
                  dataSourceDecision.splitRange.recent.end
                ),
            needsBatching && fullLinkIds.length > 0
              ? getGeoAnalyticsFromEngineBatched(
                  c.env,
                  fullLinkIds,
                  dataSourceDecision.splitRange.recent.start,
                  dataSourceDecision.splitRange.recent.end,
                  20
                )
              : getGeoAnalyticsFromEngine(
                  c.env,
                  analyticsEngineFilters,
                  dataSourceDecision.splitRange.recent.start,
                  dataSourceDecision.splitRange.recent.end,
                  20
                ),
            needsBatching && fullLinkIds.length > 0
              ? getReferrerAnalyticsFromEngineBatched(
                  c.env,
                  fullLinkIds,
                  dataSourceDecision.splitRange.recent.start,
                  dataSourceDecision.splitRange.recent.end,
                  20
                )
              : getReferrerAnalyticsFromEngine(
                  c.env,
                  analyticsEngineFilters,
                  dataSourceDecision.splitRange.recent.start,
                  dataSourceDecision.splitRange.recent.end,
                  20
                ),
            needsBatching && fullLinkIds.length > 0
              ? getDeviceAnalyticsFromEngineBatched(
                  c.env,
                  fullLinkIds,
                  dataSourceDecision.splitRange.recent.start,
                  dataSourceDecision.splitRange.recent.end,
                  undefined,
                  100
                )
              : getDeviceAnalyticsFromEngine(
                  c.env,
                  analyticsEngineFilters,
                  dataSourceDecision.splitRange.recent.start,
                  dataSourceDecision.splitRange.recent.end,
                  undefined,
                  100
                ),
            needsBatching && fullLinkIds.length > 0
              ? getUtmAnalyticsFromEngineBatched(
                  c.env,
                  fullLinkIds,
                  dataSourceDecision.splitRange.recent.start,
                  dataSourceDecision.splitRange.recent.end,
                  undefined,
                  100
                )
              : getUtmAnalyticsFromEngine(
                  c.env,
                  analyticsEngineFilters,
                  dataSourceDecision.splitRange.recent.start,
                  dataSourceDecision.splitRange.recent.end,
                  undefined,
                  100
                ),
            needsBatching && fullLinkIds.length > 0
              ? getCustomParamAnalyticsFromEngineBatched(
                  c.env,
                  fullLinkIds,
                  dataSourceDecision.splitRange.recent.start,
                  dataSourceDecision.splitRange.recent.end,
                  undefined,
                  100
                )
              : getCustomParamAnalyticsFromEngine(
                  c.env,
                  analyticsEngineFilters,
                  dataSourceDecision.splitRange.recent.start,
                  dataSourceDecision.splitRange.recent.end,
                  undefined,
                  100
                ),
          ]);

          // DEBUG: console.log('[ANALYTICS DASHBOARD] Analytics Engine results:', {
          //   summary: recentSummary,
          //   timeSeriesCount: recentTimeSeries.length,
          //   timeSeriesSample: recentTimeSeries.slice(0, 3),
          //   geoCount: recentGeo.length,
          //   referrersCount: recentReferrers.length,
          //   devicesCount: recentDevices.length,
          //   utmCount: recentUtm.length,
          //   customParamsCount: recentCustomParams.length
          // });
          
          if (recentTimeSeries.length === 0) {
            // DEBUG: console.warn('[ANALYTICS DASHBOARD] No time series data returned from Analytics Engine. Check:');
            // DEBUG: console.warn('  - Date range:', dataSourceDecision.splitRange.recent);
            // DEBUG: console.warn('  - Filters:', {
            //   linkIds: analyticsEngineFilters.linkIds?.length || 0,
            //   domainNames: analyticsEngineFilters.domainNames?.length || 0,
            //   needsBatching,
            //   fullLinkIdsCount: fullLinkIds.length
            // });
            // DEBUG: console.warn('  - API credentials:', {
            //   hasAccountId: !!c.env.CLOUDFLARE_ACCOUNT_ID,
            //   hasApiToken: !!c.env.CLOUDFLARE_API_TOKEN
            // });
          }

          summary.total_clicks += recentSummary.total_clicks;
          summary.total_unique_visitors = Math.max(summary.total_unique_visitors, recentSummary.total_unique_visitors);
          
          // If summary has data but time series is empty, there's a query issue - log it but don't create fallback
          if (recentSummary.total_clicks > 0 && recentTimeSeries.length === 0) {
            console.error('[ANALYTICS DASHBOARD] CRITICAL: Summary has data (' + recentSummary.total_clicks + ' clicks) but time series is EMPTY!');
            console.error('[ANALYTICS DASHBOARD] This indicates the time series query is failing or returning no data.');
            console.error('[ANALYTICS DASHBOARD] Check server logs for [ANALYTICS ENGINE] messages to see query details.');
            console.error('[ANALYTICS DASHBOARD] Date range:', dataSourceDecision.splitRange.recent);
            console.error('[ANALYTICS DASHBOARD] Filters:', {
              linkIds: analyticsEngineFilters.linkIds?.length || 0,
              domainNames: analyticsEngineFilters.domainNames?.length || 0,
              needsBatching,
              fullLinkIdsCount: fullLinkIds.length
            });
          }
          
          timeSeries.push(...recentTimeSeries);

          // Store analytics data for response
          geography = recentGeo;
          referrers = recentReferrers;
          devices = recentDevices;
          utmCampaigns = recentUtm;
          customParams = recentCustomParams;

        } catch (error) {
          console.error('[ANALYTICS DASHBOARD] Error querying Analytics Engine:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to query Analytics Engine';
          warnings.push(`Failed to query Analytics Engine: ${errorMessage}. Please check API credentials and try again.`);
          // Arrays already initialized as empty above
        }
      }
    } else if (dataSourceDecision.splitRange.recent !== null && !dataSourceDecision.useAnalyticsEngine) {
      // Recent data requested but cannot query Analytics Engine (no API tokens)
      const credentialError = checkAnalyticsEngineCredentials(c.env);
      if (credentialError) {
        warnings.push(credentialError);
      } else {
        warnings.push('Cannot query recent data (< 89 days). Analytics Engine API credentials are required.');
      }
      // Arrays already initialized as empty above
    }
    // If no Analytics Engine query, arrays remain empty (already initialized above)

    // Query old data from D1
    if (dataSourceDecision.useD1 && dataSourceDecision.splitRange.old) {
      const oldSummary = await getAggregatedSummaryByDomains(
        c.env,
        d1Filters,
        dataSourceDecision.splitRange.old.start,
        dataSourceDecision.splitRange.old.end
      );
      summary.total_clicks += oldSummary.total_clicks;
      summary.total_unique_visitors = Math.max(
        summary.total_unique_visitors,
        oldSummary.total_unique_visitors
      );

      const oldDailyAnalytics = await getDailyAnalyticsByDomains(
        c.env,
        d1Filters,
        dataSourceDecision.splitRange.old.start,
        dataSourceDecision.splitRange.old.end
      );
      const oldTimeSeries: TimeSeriesDataPoint[] = oldDailyAnalytics.map(day => ({
        date: day.date,
        clicks: day.clicks,
        unique_visitors: day.unique_visitors,
      }));
      timeSeries = mergeTimeSeries(timeSeries, oldTimeSeries);
    }

    // Fallback to D1 ONLY if date range includes old data
    // Do NOT query D1 for recent-only ranges - Analytics Engine is the source of truth for recent data
    if (timeSeries.length === 0 && dataSourceDecision.useD1 && dataSourceDecision.splitRange.old) {
      // Only query old data range from D1
      const d1Summary = await getAggregatedSummaryByDomains(
        c.env,
        d1Filters,
        dataSourceDecision.splitRange.old.start,
        dataSourceDecision.splitRange.old.end
      );
      summary = d1Summary;

      const dailyAnalytics = await getDailyAnalyticsByDomains(
        c.env,
        d1Filters,
        dataSourceDecision.splitRange.old.start,
        dataSourceDecision.splitRange.old.end
      );
      timeSeries = dailyAnalytics.map(day => ({
        date: day.date,
        clicks: day.clicks,
        unique_visitors: day.unique_visitors,
      }));
    } else if (timeSeries.length === 0 && !dataSourceDecision.useD1) {
      // All data is recent but Analytics Engine returned empty - this is valid (no clicks occurred)
      // Don't query D1 for recent data
      // DEBUG: console.log('[ANALYTICS] No recent data from Analytics Engine - this is expected if no clicks occurred');
    }

    // Sort time series by date
    timeSeries.sort((a, b) => a.date.localeCompare(b.date));
    
    // DEBUG: console.log('[ANALYTICS DASHBOARD] Final time series before response:', {
    //   count: timeSeries.length,
    //   sample: timeSeries.slice(0, 5),
    //   summary: {
    //     total_clicks: summary.total_clicks,
    //     total_unique_visitors: summary.total_unique_visitors
    //   },
    //   warnings: warnings.length
    // });

    // Get top links by clicks
    // Only query D1 if we have old data range - for recent data, we'd need Analytics Engine query
    let topLinksData: Array<{ link_id: string; clicks: number }> = [];
    if (dataSourceDecision.useD1 && dataSourceDecision.splitRange.old) {
      topLinksData = await getTopLinksByClicks(
        c.env,
        d1Filters,
        dataSourceDecision.splitRange.old.start,
        dataSourceDecision.splitRange.old.end,
        queryParams.limit || 10
      );
    }
    // TODO: Implement Analytics Engine top links query for recent data
    // For now, if no old data, top links will be empty (or we could aggregate from timeSeries)

    // Fetch link details only for top links
    const topLinkIds = topLinksData.map((t: { link_id: string; clicks: number }) => t.link_id);
    const topLinksDetails = topLinkIds.length > 0
      ? await Promise.all(topLinkIds.map((id: string) => getLinkById(c.env, id)))
      : [];

    const topLinks = topLinksData
      .map(({ link_id, clicks }: { link_id: string; clicks: number }) => {
        const link = topLinksDetails.find((l: any) => l?.id === link_id);
        return link ? { link_id, slug: link.slug, title: link.title, clicks } : null;
      })
      .filter((l: any): l is NonNullable<typeof l> => l !== null);

    // Geography and referrers are now populated from Analytics Engine queries above
    // If not populated (no Analytics Engine query), they remain empty arrays

    // Calculate growth metrics
    let previousSummary = { total_clicks: 0, total_unique_visitors: 0 };
    try {
      const previousEndDate = new Date(startDate);
      previousEndDate.setDate(previousEndDate.getDate() - 1);
      const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
      const previousStartDate = new Date(previousEndDate);
      previousStartDate.setDate(previousStartDate.getDate() - daysDiff);

      // Determine data source for previous period
      const previousDataSourceDecision = await determineDataSources(
        c.env,
        previousStartDate.toISOString().slice(0, 10),
        previousEndDate.toISOString().slice(0, 10),
        queryParams.data_source
      );

      // Query previous period from appropriate source
      if (previousDataSourceDecision.useAnalyticsEngine && previousDataSourceDecision.splitRange.recent) {
        // Query Analytics Engine for recent previous period
        // Use batched version if needed
        const previousSummaryRecent = needsBatching && fullLinkIds.length > 0
          ? await getAggregatedSummaryFromEngineBatched(
              c.env,
              fullLinkIds,
              previousDataSourceDecision.splitRange.recent.start,
              previousDataSourceDecision.splitRange.recent.end
            )
          : await getAggregatedSummaryFromEngine(
              c.env,
              analyticsEngineFilters,
              previousDataSourceDecision.splitRange.recent.start,
              previousDataSourceDecision.splitRange.recent.end
            );
        previousSummary.total_clicks += previousSummaryRecent.total_clicks;
        previousSummary.total_unique_visitors = Math.max(
          previousSummary.total_unique_visitors,
          previousSummaryRecent.total_unique_visitors
        );
      }

      if (previousDataSourceDecision.useD1 && previousDataSourceDecision.splitRange.old) {
        // Query D1 for old previous period
        const previousSummaryOld = await getAggregatedSummaryByDomains(
          c.env,
          d1Filters,
          previousDataSourceDecision.splitRange.old.start,
          previousDataSourceDecision.splitRange.old.end
        );
        previousSummary.total_clicks += previousSummaryOld.total_clicks;
        previousSummary.total_unique_visitors = Math.max(
          previousSummary.total_unique_visitors,
          previousSummaryOld.total_unique_visitors
        );
      }
    } catch (error) {
      console.error('[ANALYTICS] Error calculating growth metrics:', error);
      // Continue with zero growth if calculation fails
    }

    const clicksGrowth = calculateGrowth(summary.total_clicks, previousSummary.total_clicks);

    const response = {
      success: true,
      data: {
        summary: {
          total_clicks: summary.total_clicks || 0,
          total_links: totalLinks,
          active_links: activeLinks,
          total_unique_visitors: summary.total_unique_visitors || 0,
          growth: {
            clicks: clicksGrowth.percentage,
            trend: clicksGrowth.trend,
          },
        },
        time_series: timeSeries,
        top_links: topLinks,
        geography: geography || [],
        referrers: referrers || [],
        devices: devices || [],
        utm_campaigns: utmCampaigns || [],
        custom_params: customParams || [],
      },
      meta: {
        data_source: dataSourceDecision.useAnalyticsEngine && dataSourceDecision.useD1
          ? 'mixed'
          : dataSourceDecision.useAnalyticsEngine
            ? 'analytics_engine'
            : 'd1',
        aggregation_enabled: dataSourceDecision.aggregationEnabled,
        date_ranges: {
          analytics_engine: dataSourceDecision.splitRange.recent || undefined,
          d1: dataSourceDecision.splitRange.old || undefined,
        },
        filters: {
          domain_names: queryParams.domain_names,
          tag_ids: queryParams.tag_ids,
          category_ids: queryParams.category_ids,
        },
        warnings: warnings.length > 0 ? warnings : undefined,
        debug: {
          linkIdsCount: linkIds.length,
          timeSeriesCount: timeSeries.length,
          hasRecentRange: !!dataSourceDecision.splitRange.recent,
          hasOldRange: !!dataSourceDecision.splitRange.old,
        },
      },
    };
    
    // DEBUG: console.log('[ANALYTICS DASHBOARD] Final response:', {
    //   timeSeriesCount: response.data.time_series.length,
    //   summary: response.data.summary,
    //   warnings: response.meta.warnings,
    //   debug: response.meta.debug
    // });

    // Cache response with appropriate TTL based on data source
    try {
      const dataSource = response.meta?.data_source as 'analytics_engine' | 'd1' | 'mixed' | undefined;
      const ttl = getCacheTTL(dataSource);
      await setCachedAnalytics(c.env, cacheKey, response, ttl);
    } catch (error) {
      console.error('[ANALYTICS] Error caching response:', error);
      // Continue even if caching fails
    }

    return c.json(response);
  } catch (error) {
    console.error('[ANALYTICS ERROR] Dashboard endpoint error:', error);
    throw new HTTPException(500, {
      message: error instanceof Error ? error.message : 'An internal error occurred',
    });
  }
});

// Get time series for a link
analyticsRouter.get('/links/:id/time-series', authMiddleware, requirePermission('view_analytics'), async (c) => {
  const id = c.req.param('id');
  const link = await getLinkById(c.env, id);

  if (!link) {
    throw new HTTPException(404, { message: 'Link not found' });
  }

  const user = (c as any).get('user') as User;
  const hasAccess = await canAccessDomain(c.env, user, link.domain_id);
  if (!hasAccess) {
    throw new HTTPException(403, { message: 'Access denied' });
  }

  const queryParams = z.object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    group_by: z.enum(['hour', 'day', 'week', 'month']).default('day'),
    data_source: z.enum(['auto', 'analytics_engine', 'd1']).optional().default('auto'),
  }).parse({
    start_date: c.req.query('start_date'),
    end_date: c.req.query('end_date'),
    group_by: c.req.query('group_by') || 'day',
    data_source: c.req.query('data_source') || 'auto',
  });

  const endDate = queryParams.end_date || new Date().toISOString().slice(0, 10);
  const startDate = queryParams.start_date || (() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  })();

  // Determine data sources
  const dataSourceDecision = await determineDataSources(
    c.env,
    startDate,
    endDate,
    queryParams.data_source
  );

  // If aggregation disabled and requesting old data, return error
  if (!dataSourceDecision.aggregationEnabled && dataSourceDecision.splitRange.old !== null) {
    throw new HTTPException(400, {
      message: 'Data older than 89 days is not available. Analytics aggregation is disabled.',
    });
  }

  let timeSeries: TimeSeriesDataPoint[] = [];
  const warnings: string[] = [];

  // Query recent data from Analytics Engine
  if (dataSourceDecision.useAnalyticsEngine && dataSourceDecision.splitRange.recent) {
    const credentialError = checkAnalyticsEngineCredentials(c.env);
    if (credentialError) {
      warnings.push(credentialError);
    } else {
      try {
        const recentTimeSeries = await getDailyAnalyticsFromEngine(
          c.env,
          { linkIds: [link.id] },
          dataSourceDecision.splitRange.recent.start,
          dataSourceDecision.splitRange.recent.end
        );
        timeSeries.push(...recentTimeSeries);
      } catch (error) {
        console.error('[ANALYTICS] Error querying Analytics Engine for time series:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to query Analytics Engine';
        warnings.push(`Failed to query Analytics Engine: ${errorMessage}. Please check API credentials and try again.`);
      }
    }
  } else if (dataSourceDecision.splitRange.recent !== null && !dataSourceDecision.useAnalyticsEngine) {
    const credentialError = checkAnalyticsEngineCredentials(c.env);
    if (credentialError) {
      warnings.push(credentialError);
    } else {
      warnings.push('Recent data (< 89 days) not available - API credentials required');
    }
  }

  // Query old data from D1
  if (dataSourceDecision.useD1 && dataSourceDecision.splitRange.old) {
    try {
      const oldDaily = await getDailyAnalytics(
        c.env,
        link.id,
        dataSourceDecision.splitRange.old.start,
        dataSourceDecision.splitRange.old.end
      );
      const oldTimeSeries: TimeSeriesDataPoint[] = oldDaily.map(day => ({
        date: day.date,
        clicks: day.clicks,
        unique_visitors: day.unique_visitors,
      }));
      timeSeries = mergeTimeSeries(timeSeries, oldTimeSeries);
    } catch (error) {
      console.error('[ANALYTICS] Error querying D1 for time series:', error);
      warnings.push('Failed to query historical data from D1');
    }
  }

  // Sort by date
  timeSeries.sort((a, b) => a.date.localeCompare(b.date));

  return c.json({
    success: true,
    data: timeSeries,
    meta: {
      data_source: dataSourceDecision.useAnalyticsEngine && dataSourceDecision.useD1
        ? 'mixed'
        : dataSourceDecision.useAnalyticsEngine
          ? 'analytics_engine'
          : 'd1',
      aggregation_enabled: dataSourceDecision.aggregationEnabled,
      date_ranges: {
        analytics_engine: dataSourceDecision.splitRange.recent || undefined,
        d1: dataSourceDecision.splitRange.old || undefined,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    },
  });
});

// Get geography for a link
analyticsRouter.get('/links/:id/geography', authMiddleware, requirePermission('view_analytics'), async (c) => {
  const id = c.req.param('id');
  const link = await getLinkById(c.env, id);

  if (!link) {
    throw new HTTPException(404, { message: 'Link not found' });
  }

  const user = (c as any).get('user') as User;
  const hasAccess = await canAccessDomain(c.env, user, link.domain_id);
  if (!hasAccess) {
    throw new HTTPException(403, { message: 'Access denied' });
  }

  const queryParams = z.object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    limit: z.string().optional().transform((val) => (val ? parseInt(val) : 20)),
    data_source: z.enum(['auto', 'analytics_engine', 'd1']).optional().default('auto'),
  }).parse({
    start_date: c.req.query('start_date'),
    end_date: c.req.query('end_date'),
    limit: c.req.query('limit'),
    data_source: c.req.query('data_source') || 'auto',
  });

  const endDate = queryParams.end_date || new Date().toISOString().slice(0, 10);
  const startDate = queryParams.start_date || (() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  })();

  // Determine data sources
  const dataSourceDecision = await determineDataSources(
    c.env,
    startDate,
    endDate,
    queryParams.data_source
  );

  // If aggregation disabled and requesting old data, return error
  if (!dataSourceDecision.aggregationEnabled && dataSourceDecision.splitRange.old !== null) {
    throw new HTTPException(400, {
      message: 'Data older than 89 days is not available. Analytics aggregation is disabled.',
    });
  }

  let geography: GeographyDataPoint[] = [];
  const warnings: string[] = [];

  // Query recent data from Analytics Engine
  if (dataSourceDecision.useAnalyticsEngine && dataSourceDecision.splitRange.recent) {
    const credentialError = checkAnalyticsEngineCredentials(c.env);
    if (credentialError) {
      warnings.push(credentialError);
    } else {
      try {
        const recentGeo = await getGeoAnalyticsFromEngine(
          c.env,
          { linkIds: [link.id] },
          dataSourceDecision.splitRange.recent.start,
          dataSourceDecision.splitRange.recent.end,
          queryParams.limit
        );
        geography.push(...recentGeo);
      } catch (error) {
        console.error('[ANALYTICS] Error querying Analytics Engine for geography:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to query Analytics Engine';
        warnings.push(`Failed to query Analytics Engine: ${errorMessage}. Please check API credentials and try again.`);
      }
    }
  } else if (dataSourceDecision.splitRange.recent !== null && !dataSourceDecision.useAnalyticsEngine) {
    const credentialError = checkAnalyticsEngineCredentials(c.env);
    if (credentialError) {
      warnings.push(credentialError);
    } else {
      warnings.push('Recent data (< 89 days) not available - API credentials required');
    }
  }

  // Query old data from D1
  if (dataSourceDecision.useD1 && dataSourceDecision.splitRange.old) {
    try {
      const oldGeo = await getGeoAnalytics(
        c.env,
        {
          linkIds: [link.id],
          startDate: dataSourceDecision.splitRange.old.start,
          endDate: dataSourceDecision.splitRange.old.end,
          limit: queryParams.limit,
        }
      );
      const oldGeoPoints: GeographyDataPoint[] = oldGeo.map(geo => ({
        country: geo.country || 'unknown',
        city: geo.city || null,
        clicks: geo.clicks,
        unique_visitors: 0,
        category: null,
      }));
      geography = mergeGeographyData(geography, oldGeoPoints);
    } catch (error) {
      console.error('[ANALYTICS] Error querying D1 for geography:', error);
      warnings.push('Failed to query historical data from D1');
    }
  }

  return c.json({
    success: true,
    data: geography.slice(0, queryParams.limit),
    meta: {
      data_source: dataSourceDecision.useAnalyticsEngine && dataSourceDecision.useD1
        ? 'mixed'
        : dataSourceDecision.useAnalyticsEngine
          ? 'analytics_engine'
          : 'd1',
      aggregation_enabled: dataSourceDecision.aggregationEnabled,
      date_ranges: {
        analytics_engine: dataSourceDecision.splitRange.recent || undefined,
        d1: dataSourceDecision.splitRange.old || undefined,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    },
  });
});

// Get referrers for a link
analyticsRouter.get('/links/:id/referrers', authMiddleware, requirePermission('view_analytics'), async (c) => {
  const id = c.req.param('id');
  const link = await getLinkById(c.env, id);

  if (!link) {
    throw new HTTPException(404, { message: 'Link not found' });
  }

  const user = (c as any).get('user') as User;
  const hasAccess = await canAccessDomain(c.env, user, link.domain_id);
  if (!hasAccess) {
    throw new HTTPException(403, { message: 'Access denied' });
  }

  const queryParams = z.object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    limit: z.string().optional().transform((val) => (val ? parseInt(val) : 20)),
    data_source: z.enum(['auto', 'analytics_engine', 'd1']).optional().default('auto'),
  }).parse({
    start_date: c.req.query('start_date'),
    end_date: c.req.query('end_date'),
    limit: c.req.query('limit'),
    data_source: c.req.query('data_source') || 'auto',
  });

  const endDate = queryParams.end_date || new Date().toISOString().slice(0, 10);
  const startDate = queryParams.start_date || (() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  })();

  // Determine data sources
  const dataSourceDecision = await determineDataSources(
    c.env,
    startDate,
    endDate,
    queryParams.data_source
  );

  // If aggregation disabled and requesting old data, return error
  if (!dataSourceDecision.aggregationEnabled && dataSourceDecision.splitRange.old !== null) {
    throw new HTTPException(400, {
      message: 'Data older than 89 days is not available. Analytics aggregation is disabled.',
    });
  }

  let referrers: ReferrerDataPoint[] = [];
  const warnings: string[] = [];

  // Query recent data from Analytics Engine
  if (dataSourceDecision.useAnalyticsEngine && dataSourceDecision.splitRange.recent) {
    const credentialError = checkAnalyticsEngineCredentials(c.env);
    if (credentialError) {
      warnings.push(credentialError);
    } else {
      try {
        const recentReferrers = await getReferrerAnalyticsFromEngine(
          c.env,
          { linkIds: [link.id] },
          dataSourceDecision.splitRange.recent.start,
          dataSourceDecision.splitRange.recent.end,
          queryParams.limit
        );
        referrers.push(...recentReferrers);
      } catch (error) {
        console.error('[ANALYTICS] Error querying Analytics Engine for referrers:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to query Analytics Engine';
        warnings.push(`Failed to query Analytics Engine: ${errorMessage}. Please check API credentials and try again.`);
      }
    }
  } else if (dataSourceDecision.splitRange.recent !== null && !dataSourceDecision.useAnalyticsEngine) {
    const credentialError = checkAnalyticsEngineCredentials(c.env);
    if (credentialError) {
      warnings.push(credentialError);
    } else {
      warnings.push('Recent data (< 89 days) not available - API credentials required');
    }
  }

  // Query old data from D1
  if (dataSourceDecision.useD1 && dataSourceDecision.splitRange.old) {
    try {
      const oldReferrers = await getReferrerAnalytics(
        c.env,
        {
          linkIds: [link.id],
          startDate: dataSourceDecision.splitRange.old.start,
          endDate: dataSourceDecision.splitRange.old.end,
          limit: queryParams.limit,
        }
      );
      const oldReferrerPoints: ReferrerDataPoint[] = oldReferrers.map(ref => ({
        referrer_domain: ref.referrer_domain || 'direct',
        clicks: ref.clicks,
        unique_visitors: 0,
        category: categorizeReferrer(ref.referrer_domain || 'direct'),
      }));
      referrers = mergeReferrerData(referrers, oldReferrerPoints);
    } catch (error) {
      console.error('[ANALYTICS] Error querying D1 for referrers:', error);
      warnings.push('Failed to query historical data from D1');
    }
  }

  return c.json({
    success: true,
    data: referrers.slice(0, queryParams.limit),
    meta: {
      data_source: dataSourceDecision.useAnalyticsEngine && dataSourceDecision.useD1
        ? 'mixed'
        : dataSourceDecision.useAnalyticsEngine
          ? 'analytics_engine'
          : 'd1',
      aggregation_enabled: dataSourceDecision.aggregationEnabled,
      date_ranges: {
        analytics_engine: dataSourceDecision.splitRange.recent || undefined,
        d1: dataSourceDecision.splitRange.old || undefined,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    },
  });
});

// Export analytics
analyticsRouter.get('/export', authMiddleware, requirePermission('view_analytics'), async (c) => {
  const format = c.req.query('format') || 'json';
  const linkId = c.req.query('link_id');

  if (!linkId) {
    throw new HTTPException(400, { message: 'link_id required' });
  }

  const link = await getLinkById(c.env, linkId);
  if (!link) {
    throw new HTTPException(404, { message: 'Link not found' });
  }

  const user = (c as any).get('user') as User;
  const hasAccess = await canAccessDomain(c.env, user, link.domain_id);
  if (!hasAccess) {
    throw new HTTPException(403, { message: 'Access denied' });
  }

  const queryParams = z.object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    data_source: z.enum(['auto', 'analytics_engine', 'd1']).optional().default('auto'),
  }).parse({
    start_date: c.req.query('start_date'),
    end_date: c.req.query('end_date'),
    data_source: c.req.query('data_source') || 'auto',
  });

  const endDate = queryParams.end_date || new Date().toISOString().slice(0, 10);
  const startDate = queryParams.start_date || (() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  })();

  // Determine data sources
  const dataSourceDecision = await determineDataSources(
    c.env,
    startDate,
    endDate,
    queryParams.data_source
  );

  // If aggregation disabled and requesting old data, return error
  if (!dataSourceDecision.aggregationEnabled && dataSourceDecision.splitRange.old !== null) {
    throw new HTTPException(400, {
      message: 'Data older than 89 days is not available. Analytics aggregation is disabled.',
    });
  }

  let timeSeries: TimeSeriesDataPoint[] = [];
  let geography: GeographyDataPoint[] = [];
  let referrers: ReferrerDataPoint[] = [];
  const warnings: string[] = [];

  // Query recent data from Analytics Engine
  if (dataSourceDecision.useAnalyticsEngine && dataSourceDecision.splitRange.recent) {
    const credentialError = checkAnalyticsEngineCredentials(c.env);
    if (credentialError) {
      warnings.push(credentialError);
    } else {
      try {
        const [recentTimeSeries, recentGeo, recentReferrers] = await Promise.all([
          getDailyAnalyticsFromEngine(c.env, { linkIds: [linkId] }, dataSourceDecision.splitRange.recent.start, dataSourceDecision.splitRange.recent.end),
          getGeoAnalyticsFromEngine(c.env, { linkIds: [linkId] }, dataSourceDecision.splitRange.recent.start, dataSourceDecision.splitRange.recent.end, 1000),
          getReferrerAnalyticsFromEngine(c.env, { linkIds: [linkId] }, dataSourceDecision.splitRange.recent.start, dataSourceDecision.splitRange.recent.end, 1000),
        ]);
        timeSeries.push(...recentTimeSeries);
        geography.push(...recentGeo);
        referrers.push(...recentReferrers);
      } catch (error) {
        console.error('[ANALYTICS] Error querying Analytics Engine for export:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to query Analytics Engine';
        warnings.push(`Failed to query Analytics Engine: ${errorMessage}. Please check API credentials and try again.`);
      }
    }
  } else if (dataSourceDecision.splitRange.recent !== null && !dataSourceDecision.useAnalyticsEngine) {
    const credentialError = checkAnalyticsEngineCredentials(c.env);
    if (credentialError) {
      warnings.push(credentialError);
    } else {
      warnings.push('Recent data (< 89 days) not available - API credentials required');
    }
  }

  // Query old data from D1
  if (dataSourceDecision.useD1 && dataSourceDecision.splitRange.old) {
    try {
      const [oldDaily, oldGeo, oldReferrers] = await Promise.all([
        getDailyAnalytics(c.env, linkId, dataSourceDecision.splitRange.old.start, dataSourceDecision.splitRange.old.end),
        getGeoAnalytics(c.env, { linkIds: [linkId], startDate: dataSourceDecision.splitRange.old.start, endDate: dataSourceDecision.splitRange.old.end }),
        getReferrerAnalytics(c.env, { linkIds: [linkId], startDate: dataSourceDecision.splitRange.old.start, endDate: dataSourceDecision.splitRange.old.end }),
      ]);

      const oldTimeSeries: TimeSeriesDataPoint[] = oldDaily.map(day => ({
        date: day.date,
        clicks: day.clicks,
        unique_visitors: day.unique_visitors,
      }));
      timeSeries = mergeTimeSeries(timeSeries, oldTimeSeries);

      const oldGeoPoints: GeographyDataPoint[] = oldGeo.map(geo => ({
        country: geo.country || 'unknown',
        city: geo.city || null,
        clicks: geo.clicks,
        unique_visitors: 0,
        category: null,
      }));
      geography = mergeGeographyData(geography, oldGeoPoints);

      const oldReferrerPoints: ReferrerDataPoint[] = oldReferrers.map(ref => ({
        referrer_domain: ref.referrer_domain || 'direct',
        clicks: ref.clicks,
        unique_visitors: 0,
        category: categorizeReferrer(ref.referrer_domain || 'direct'),
      }));
      referrers = mergeReferrerData(referrers, oldReferrerPoints);
    } catch (error) {
      console.error('[ANALYTICS] Error querying D1 for export:', error);
      warnings.push('Failed to query historical data from D1');
    }
  }

  // Sort time series by date
  timeSeries.sort((a, b) => a.date.localeCompare(b.date));

  const data = {
    link_id: linkId,
    period: { start_date: startDate, end_date: endDate },
    summary: {
      total_clicks: timeSeries.reduce((sum, d) => sum + d.clicks, 0),
      unique_visitors: Math.max(...timeSeries.map(d => d.unique_visitors), link.unique_visitors || 0),
    },
    time_series: timeSeries,
    geography: geography,
    referrers: referrers,
    meta: {
      data_source: dataSourceDecision.useAnalyticsEngine && dataSourceDecision.useD1
        ? 'mixed'
        : dataSourceDecision.useAnalyticsEngine
          ? 'analytics_engine'
          : 'd1',
      aggregation_enabled: dataSourceDecision.aggregationEnabled,
      date_ranges: {
        analytics_engine: dataSourceDecision.splitRange.recent || undefined,
        d1: dataSourceDecision.splitRange.old || undefined,
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    },
  };

  if (format === 'csv') {
    // Generate CSV
    const csvRows = [
      'Date,Clicks,Unique Visitors',
      ...timeSeries.map(d => `${d.date},${d.clicks},${d.unique_visitors}`),
    ];

    return c.text(csvRows.join('\n'), 200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="analytics-${linkId}-${startDate}-${endDate}.csv"`,
    });
  }

  return c.json({ success: true, data });
});

// Manual aggregation endpoint (admin only)
analyticsRouter.post('/aggregate', authMiddleware, requirePermission('manage_domains'), async (c) => {
  // Check if aggregation is enabled
  const aggregationSettings = await getAnalyticsAggregationEnabledOrDefault(c.env);
  if (!aggregationSettings.enabled) {
    throw new HTTPException(400, {
      message: 'Analytics aggregation is disabled. Enable it in settings first.',
    });
  }

  const body = await c.req.json().catch(() => ({}));
  const date = (body as { date?: string }).date;

  if (date) {
    // Aggregate specific date
    const { aggregateAnalyticsForDate } = await import('../services/analyticsAggregation');
    const result = await aggregateAnalyticsForDate(c.env, date);
    return c.json({
      success: true,
      message: result.skipped
        ? 'Date skipped (not old enough to aggregate - only aggregate data >= 90 days old)'
        : 'Aggregation completed',
      result,
    });
  } else {
    // Aggregate yesterday
    const { aggregateYesterday } = await import('../services/analyticsAggregation');
    const result = await aggregateYesterday(c.env);
    return c.json({
      success: true,
      message: result.skipped
        ? 'Yesterday skipped (not old enough to aggregate - data is aggregated in real-time)'
        : 'Yesterday aggregation completed',
      result,
    });
  }
});

/**
 * Helper function to get filtered link IDs based on user access and query params
 * @deprecated Use getAnalyticsFilters instead for better performance
 */
async function getAccessibleLinkIds(
  env: Env,
  user: User,
  queryParams: {
    link_id?: string;
    link_ids?: string[];
    domain_id?: string;
    domain_ids?: string[];
    tag_ids?: string[];
    category_ids?: string[];
  }
): Promise<string[]> {
  // Get accessible domain IDs
  const hasGlobalAccess = user.global_access || user.role === 'admin' || user.role === 'owner';
  let accessibleDomainIds: string[] = [];

  if (!hasGlobalAccess) {
    accessibleDomainIds = (user as any).accessible_domain_ids || [];
  }

  // Build domain filter
  let domainIds: string[] | undefined;
  if (queryParams.domain_id) {
    domainIds = [queryParams.domain_id];
  } else if (queryParams.domain_ids && queryParams.domain_ids.length > 0) {
    domainIds = queryParams.domain_ids;
  } else if (accessibleDomainIds.length > 0) {
    domainIds = accessibleDomainIds;
  }

  // Verify domain access
  if (domainIds && domainIds.length > 0) {
    for (const domainId of domainIds) {
      const hasAccess = await canAccessDomain(env, user, domainId);
      if (!hasAccess) {
        throw new HTTPException(403, { message: `Access denied. You do not have access to domain ${domainId}.` });
      }
    }
  }

  // Get filtered link IDs
  const linkIds = await getFilteredLinkIds(env, {
    linkIds: queryParams.link_id ? [queryParams.link_id] : queryParams.link_ids,
    domainIds,
    tagIds: queryParams.tag_ids,
    categoryIds: queryParams.category_ids,
    status: 'active',
  });

  return linkIds;
}

/**
 * Helper function to build Analytics Engine filters from linkIds and filters
 * Returns filters and full linkIds array for batching when needed
 */
function buildAnalyticsEngineFilters(
  linkIds: string[],
  filters: {
    domainIds?: string[];
    tagIds?: string[];
    categoryIds?: string[];
  },
  domainNames?: string[]
): {
  filters: { linkIds?: string[]; domainNames?: string[] };
  needsBatching: boolean;
  fullLinkIds: string[];
} {
  const analyticsEngineFilters: { linkIds?: string[]; domainNames?: string[] } = {};

  // Priority 1: Direct domain name filtering (most efficient)
  if (domainNames && domainNames.length > 0 && !filters.tagIds && !filters.categoryIds) {
    analyticsEngineFilters.domainNames = domainNames;
    return {
      filters: analyticsEngineFilters,
      needsBatching: false,
      fullLinkIds: [],
    };
  }

  // Priority 2: Tag/category filters require linkIds (Analytics Engine doesn't store tags/categories)
  if (filters.tagIds || filters.categoryIds) {
    if (linkIds.length === 0) {
      // No links match the filters - return empty filters to return 0 results
      return {
        filters: analyticsEngineFilters,
        needsBatching: false,
        fullLinkIds: [],
      };
    } else if (linkIds.length > 0 && linkIds.length <= 100) {
      analyticsEngineFilters.linkIds = linkIds;
      return {
        filters: analyticsEngineFilters,
        needsBatching: false,
        fullLinkIds: [],
      };
    } else if (linkIds.length > 100) {
      // Too many links - need batching
      // Don't set linkIds in filters (will use batching), return full array for batching
      return {
        filters: analyticsEngineFilters,
        needsBatching: true,
        fullLinkIds: linkIds,
      };
    }
    return {
      filters: analyticsEngineFilters,
      needsBatching: false,
      fullLinkIds: [],
    };
  }

  // Priority 3: DomainIds provided but too many links - use batching
  if (filters.domainIds && filters.domainIds.length > 0 && linkIds.length > 100) {
    // DomainIds are provided but too many links - need batching
    return {
      filters: analyticsEngineFilters,
      needsBatching: true,
      fullLinkIds: linkIds,
    };
  }

  // Priority 4: "All domains" selected (domainIds is undefined) and too many links
  if (!filters.domainIds && linkIds.length > 100) {
    // "All domains" - don't filter Analytics Engine (query all data)
    // Analytics Engine limitation: can only filter by up to 100 linkIds
    // DEBUG: console.log('[ANALYTICS ENGINE] "All domains" selected with', linkIds.length, 'links - querying all data');
    // Leave empty to query all data
    return {
      filters: analyticsEngineFilters,
      needsBatching: false,
      fullLinkIds: [],
    };
  }

  // Priority 5: Small number of links - safe to use linkIds filter
  if (linkIds.length > 0 && linkIds.length <= 100) {
    analyticsEngineFilters.linkIds = linkIds;
    return {
      filters: analyticsEngineFilters,
      needsBatching: false,
      fullLinkIds: [],
    };
  }

  // Default: No filters (query all data)
  return {
    filters: analyticsEngineFilters,
    needsBatching: false,
    fullLinkIds: [],
  };
}

/**
 * Helper function to build analytics filters from query params and user access
 * Returns filters object for use with JOIN-based analytics functions
 */
async function getAnalyticsFilters(
  env: Env,
  user: User,
  queryParams: {
    link_id?: string;
    link_ids?: string[];
    domain_id?: string;
    domain_ids?: string[];
    tag_ids?: string[];
    category_ids?: string[];
  }
): Promise<{
  domainIds?: string[];
  tagIds?: string[];
  categoryIds?: string[];
  linkIds?: string[];
}> {
  // Get accessible domain IDs
  const hasGlobalAccess = user.global_access || user.role === 'admin' || user.role === 'owner';
  let accessibleDomainIds: string[] = [];

  if (!hasGlobalAccess) {
    accessibleDomainIds = (user as any).accessible_domain_ids || [];
  }

  // Build domain filter
  let domainIds: string[] | undefined;
  if (queryParams.domain_id) {
    domainIds = [queryParams.domain_id];
  } else if (queryParams.domain_ids && queryParams.domain_ids.length > 0) {
    domainIds = queryParams.domain_ids;
  } else if (accessibleDomainIds.length > 0) {
    domainIds = accessibleDomainIds;
  }

  // Verify domain access
  if (domainIds && domainIds.length > 0) {
    for (const domainId of domainIds) {
      const hasAccess = await canAccessDomain(env, user, domainId);
      if (!hasAccess) {
        throw new HTTPException(403, { message: `Access denied. You do not have access to domain ${domainId}.` });
      }
    }
  }

  // Build link IDs filter (if specific links requested)
  let linkIds: string[] | undefined;
  if (queryParams.link_id) {
    linkIds = [queryParams.link_id];
  } else if (queryParams.link_ids && queryParams.link_ids.length > 0) {
    linkIds = queryParams.link_ids;
  }

  return {
    domainIds,
    tagIds: queryParams.tag_ids,
    categoryIds: queryParams.category_ids,
    linkIds,
  };
}

// Geography breakdown endpoint
analyticsRouter.get('/breakdown/geography', authMiddleware, requirePermission('view_analytics'), async (c) => {
  try {
    const queryParams = analyticsQuerySchema.parse({
      link_id: c.req.query('link_id'),
      link_ids: c.req.query('link_ids'),
      domain_id: c.req.query('domain_id'),
      domain_ids: c.req.query('domain_ids'),
      tag_ids: c.req.query('tag_ids'),
      category_ids: c.req.query('category_ids'),
      start_date: c.req.query('start_date'),
      end_date: c.req.query('end_date'),
      group_by: c.req.query('group_by'),
      limit: c.req.query('limit'),
      data_source: c.req.query('data_source') || 'auto',
    });

    const user = (c as any).get('user') as User;
    const filters = await getAnalyticsFilters(c.env, user, queryParams);

    const endDate = queryParams.end_date || new Date().toISOString().slice(0, 10);
    const startDate = queryParams.start_date || (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString().slice(0, 10);
    })();

    // Determine data sources
    const dataSourceDecision = await determineDataSources(
      c.env,
      startDate,
      endDate,
      queryParams.data_source
    );

    // If aggregation disabled and requesting old data, return error
    if (!dataSourceDecision.aggregationEnabled && dataSourceDecision.splitRange.old !== null) {
      throw new HTTPException(400, {
        message: 'Data older than 89 days is not available. Analytics aggregation is disabled.',
      });
    }

    // Get linkIds for Analytics Engine queries - this handles undefined domainIds correctly
    const linkIds = await getFilteredLinkIds(c.env, {
      domainIds: filters.domainIds,
      tagIds: filters.tagIds,
      categoryIds: filters.categoryIds,
      status: 'active',
    });
    
    // DO NOT add linkIds to filters - linkIds is only for Analytics Engine queries
    // D1 queries use tagIds/categoryIds via JOINs directly, not linkIds
    
    // Build Analytics Engine filters using helper function
    const engineFilterResult = buildAnalyticsEngineFilters(
      linkIds,
      filters
    );
    const analyticsEngineFilters = engineFilterResult.filters;
    const needsBatching = engineFilterResult.needsBatching;
    const fullLinkIds = engineFilterResult.fullLinkIds;
    
    let geography: GeographyDataPoint[] = [];
    const warnings: string[] = [];

    // Query recent data from Analytics Engine
    // Query if we have filters OR if "all domains" (no filters = query all data)
    if (dataSourceDecision.useAnalyticsEngine && dataSourceDecision.splitRange.recent && 
        (analyticsEngineFilters.linkIds?.length || analyticsEngineFilters.domainNames?.length || (!filters.domainIds && !filters.tagIds && !filters.categoryIds))) {
      const credentialError = checkAnalyticsEngineCredentials(c.env);
      if (credentialError) {
        warnings.push(credentialError);
      } else {
        try {
          const recentGeo = needsBatching && fullLinkIds.length > 0
            ? await getGeoAnalyticsFromEngineBatched(
                c.env,
                fullLinkIds,
                dataSourceDecision.splitRange.recent.start,
                dataSourceDecision.splitRange.recent.end,
                queryParams.limit || 100
              )
            : await getGeoAnalyticsFromEngine(
                c.env,
                analyticsEngineFilters,
                dataSourceDecision.splitRange.recent.start,
                dataSourceDecision.splitRange.recent.end,
                queryParams.limit || 100
              );
          geography.push(...recentGeo);
        } catch (error) {
          console.error('[ANALYTICS] Error querying Analytics Engine for geography:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to query Analytics Engine';
          warnings.push(`Failed to query Analytics Engine: ${errorMessage}. Please check API credentials and try again.`);
        }
      }
    } else if (dataSourceDecision.splitRange.recent !== null && !dataSourceDecision.useAnalyticsEngine) {
      const credentialError = checkAnalyticsEngineCredentials(c.env);
      if (credentialError) {
        warnings.push(credentialError);
      } else {
        warnings.push('Recent data (< 89 days) not available - API credentials required');
      }
    }

    // Query old data from D1
    if (dataSourceDecision.useD1 && dataSourceDecision.splitRange.old) {
      try {
        const groupBy = queryParams.group_by === 'city' ? 'city' : 'country';
        // Remove linkIds from filters before D1 queries - D1 uses JOINs with tagIds/categoryIds
        const d1Filters = { ...filters };
        if (d1Filters.linkIds) {
          delete d1Filters.linkIds;
        }
        const oldGeo = await getGeoAnalyticsByFilters(
          c.env,
          d1Filters,
          dataSourceDecision.splitRange.old.start,
          dataSourceDecision.splitRange.old.end,
          groupBy,
          queryParams.limit || 100
        );
        const oldGeoPoints: GeographyDataPoint[] = oldGeo.map(geo => ({
          country: geo.country || 'unknown',
          city: geo.city || null,
          clicks: geo.clicks,
          unique_visitors: 0,
          category: null,
        }));
        geography = mergeGeographyData(geography, oldGeoPoints);
      } catch (error) {
        console.error('[ANALYTICS] Error querying D1 for geography:', error);
        warnings.push('Failed to query historical data from D1');
      }
    }

    // Aggregate by country or city based on group_by
    const aggregated = new Map<string, { country: string; city: string | null; clicks: number }>();
    for (const geo of geography) {
      const groupByCity = queryParams.group_by === 'city';
      const key = groupByCity && geo.city
        ? `${geo.country || 'unknown'}:${geo.city}`
        : (geo.country || 'unknown');
      const existing = aggregated.get(key) || { country: geo.country || 'unknown', city: geo.city || null, clicks: 0 };
      existing.clicks += geo.clicks;
      aggregated.set(key, existing);
    }

    const data = Array.from(aggregated.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, queryParams.limit || 100);

    return c.json({
      success: true,
      data: {
        period: { start_date: startDate, end_date: endDate },
        geography: data,
        total_clicks: data.reduce((sum, item) => sum + item.clicks, 0),
      },
      meta: {
        data_source: dataSourceDecision.useAnalyticsEngine && dataSourceDecision.useD1
          ? 'mixed'
          : dataSourceDecision.useAnalyticsEngine
            ? 'analytics_engine'
            : 'd1',
        aggregation_enabled: dataSourceDecision.aggregationEnabled,
        date_ranges: {
          analytics_engine: dataSourceDecision.splitRange.recent || undefined,
          d1: dataSourceDecision.splitRange.old || undefined,
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    });
  } catch (error) {
    console.error('[ANALYTICS ERROR] Geography breakdown:', error);
    if (error instanceof HTTPException) throw error;
    throw new HTTPException(500, { message: error instanceof Error ? error.message : 'An internal error occurred' });
  }
});

// Devices breakdown endpoint
analyticsRouter.get('/breakdown/devices', authMiddleware, requirePermission('view_analytics'), async (c) => {
  try {
    const queryParams = analyticsQuerySchema.parse({
      link_id: c.req.query('link_id'),
      link_ids: c.req.query('link_ids'),
      domain_id: c.req.query('domain_id'),
      domain_ids: c.req.query('domain_ids'),
      tag_ids: c.req.query('tag_ids'),
      category_ids: c.req.query('category_ids'),
      start_date: c.req.query('start_date'),
      end_date: c.req.query('end_date'),
      group_by: c.req.query('group_by'),
      limit: c.req.query('limit'),
      data_source: c.req.query('data_source') || 'auto',
    });

    const user = (c as any).get('user') as User;
    const filters = await getAnalyticsFilters(c.env, user, queryParams);

    const endDate = queryParams.end_date || new Date().toISOString().slice(0, 10);
    const startDate = queryParams.start_date || (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString().slice(0, 10);
    })();

    // Determine data sources
    const dataSourceDecision = await determineDataSources(
      c.env,
      startDate,
      endDate,
      queryParams.data_source
    );

    // If aggregation disabled and requesting old data, return error
    if (!dataSourceDecision.aggregationEnabled && dataSourceDecision.splitRange.old !== null) {
      throw new HTTPException(400, {
        message: 'Data older than 89 days is not available. Analytics aggregation is disabled.',
      });
    }

    // Get linkIds for Analytics Engine queries - this handles undefined domainIds correctly
    const linkIds = await getFilteredLinkIds(c.env, {
      domainIds: filters.domainIds,
      tagIds: filters.tagIds,
      categoryIds: filters.categoryIds,
      status: 'active',
    });
    
    // Remove linkIds from filters before D1 queries - D1 uses JOINs with tagIds/categoryIds
    const d1Filters = { ...filters };
    if (d1Filters.linkIds) {
      delete d1Filters.linkIds;
    }
    
    // Build Analytics Engine filters using helper function
    const engineFilterResult = buildAnalyticsEngineFilters(
      linkIds,
      filters
    );
    const analyticsEngineFilters = engineFilterResult.filters;
    const needsBatching = engineFilterResult.needsBatching;
    const fullLinkIds = engineFilterResult.fullLinkIds;
    
    let deviceData: Array<{
      device_type: string | null;
      browser: string | null;
      os: string | null;
      clicks: number;
      unique_visitors: number;
    }> = [];
    const warnings: string[] = [];

    const groupByValue = queryParams.group_by;
    const groupBy = groupByValue === 'device_type' ? 'device_type' :
      groupByValue === 'browser' ? 'browser' :
        groupByValue === 'os' ? 'os' :
          groupByValue === 'date' ? 'date' : undefined;

    // Query recent data from Analytics Engine
    if (dataSourceDecision.useAnalyticsEngine && dataSourceDecision.splitRange.recent && 
        (analyticsEngineFilters.linkIds?.length || analyticsEngineFilters.domainNames?.length || (!filters.domainIds && !filters.tagIds && !filters.categoryIds))) {
      const credentialError = checkAnalyticsEngineCredentials(c.env);
      if (credentialError) {
        warnings.push(credentialError);
      } else {
        try {
          const recentDevices = needsBatching && fullLinkIds.length > 0
            ? await getDeviceAnalyticsFromEngineBatched(
                c.env,
                fullLinkIds,
                dataSourceDecision.splitRange.recent.start,
                dataSourceDecision.splitRange.recent.end,
                groupBy as 'device_type' | 'browser' | 'os' | undefined,
                queryParams.limit || 100
              )
            : await getDeviceAnalyticsFromEngine(
                c.env,
                analyticsEngineFilters,
                dataSourceDecision.splitRange.recent.start,
                dataSourceDecision.splitRange.recent.end,
                groupBy as 'device_type' | 'browser' | 'os' | undefined,
                queryParams.limit || 100
              );
          deviceData.push(...recentDevices);
        } catch (error) {
          console.error('[ANALYTICS] Error querying Analytics Engine for devices:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to query Analytics Engine';
          warnings.push(`Failed to query Analytics Engine: ${errorMessage}. Please check API credentials and try again.`);
        }
      }
    } else if (dataSourceDecision.splitRange.recent !== null && !dataSourceDecision.useAnalyticsEngine) {
      const credentialError = checkAnalyticsEngineCredentials(c.env);
      if (credentialError) {
        warnings.push(credentialError);
      } else {
        warnings.push('Recent data (< 89 days) not available - API credentials required');
      }
    }

    // Query old data from D1
    if (dataSourceDecision.useD1 && dataSourceDecision.splitRange.old) {
      try {
        const oldDevices = await getDeviceAnalyticsByFilters(
          c.env,
          d1Filters,
          dataSourceDecision.splitRange.old.start,
          dataSourceDecision.splitRange.old.end,
          groupBy,
          queryParams.limit || 100
        );
        const oldDevicePoints = oldDevices.map(d => ({
          device_type: d.device_type,
          browser: d.browser,
          os: d.os,
          clicks: d.clicks,
          unique_visitors: d.unique_visitors,
        }));
        deviceData = mergeDeviceData(deviceData, oldDevicePoints);
      } catch (error) {
        console.error('[ANALYTICS] Error querying D1 for devices:', error);
        warnings.push('Failed to query historical data from D1');
      }
    }

    return c.json({
      success: true,
      data: {
        period: { start_date: startDate, end_date: endDate },
        devices: deviceData.slice(0, queryParams.limit || 100),
        total_clicks: deviceData.reduce((sum, d) => sum + d.clicks, 0),
      },
      meta: {
        data_source: dataSourceDecision.useAnalyticsEngine && dataSourceDecision.useD1
          ? 'mixed'
          : dataSourceDecision.useAnalyticsEngine
            ? 'analytics_engine'
            : 'd1',
        aggregation_enabled: dataSourceDecision.aggregationEnabled,
        date_ranges: {
          analytics_engine: dataSourceDecision.splitRange.recent || undefined,
          d1: dataSourceDecision.splitRange.old || undefined,
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    });
  } catch (error) {
    console.error('[ANALYTICS ERROR] Devices breakdown:', error);
    if (error instanceof HTTPException) throw error;
    throw new HTTPException(500, { message: error instanceof Error ? error.message : 'An internal error occurred' });
  }
});

// Referrers breakdown endpoint
analyticsRouter.get('/breakdown/referrers', authMiddleware, requirePermission('view_analytics'), async (c) => {
  try {
    const queryParams = analyticsQuerySchema.parse({
      link_id: c.req.query('link_id'),
      link_ids: c.req.query('link_ids'),
      domain_id: c.req.query('domain_id'),
      domain_ids: c.req.query('domain_ids'),
      tag_ids: c.req.query('tag_ids'),
      category_ids: c.req.query('category_ids'),
      start_date: c.req.query('start_date'),
      end_date: c.req.query('end_date'),
      limit: c.req.query('limit'),
      data_source: c.req.query('data_source') || 'auto',
    });

    const user = (c as any).get('user') as User;
    const filters = await getAnalyticsFilters(c.env, user, queryParams);

    const endDate = queryParams.end_date || new Date().toISOString().slice(0, 10);
    const startDate = queryParams.start_date || (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString().slice(0, 10);
    })();

    // Determine data sources
    const dataSourceDecision = await determineDataSources(
      c.env,
      startDate,
      endDate,
      queryParams.data_source
    );

    // If aggregation disabled and requesting old data, return error
    if (!dataSourceDecision.aggregationEnabled && dataSourceDecision.splitRange.old !== null) {
      throw new HTTPException(400, {
        message: 'Data older than 89 days is not available. Analytics aggregation is disabled.',
      });
    }

    const linkIds = await getFilteredLinkIds(c.env, filters);
    // Remove linkIds from filters before D1 queries - D1 uses JOINs with tagIds/categoryIds
    const d1Filters = { ...filters };
    if (d1Filters.linkIds) {
      delete d1Filters.linkIds;
    }
    
    // Build Analytics Engine filters using helper function
    const engineFilterResult = buildAnalyticsEngineFilters(
      linkIds,
      filters
    );
    const analyticsEngineFilters = engineFilterResult.filters;
    const needsBatching = engineFilterResult.needsBatching;
    const fullLinkIds = engineFilterResult.fullLinkIds;
    
    let referrers: ReferrerDataPoint[] = [];
    const warnings: string[] = [];

    // Query recent data from Analytics Engine
    if (dataSourceDecision.useAnalyticsEngine && dataSourceDecision.splitRange.recent && 
        (analyticsEngineFilters.linkIds?.length || analyticsEngineFilters.domainNames?.length || (!filters.domainIds && !filters.tagIds && !filters.categoryIds))) {
      const credentialError = checkAnalyticsEngineCredentials(c.env);
      if (credentialError) {
        warnings.push(credentialError);
      } else {
        try {
          const recentReferrers = needsBatching && fullLinkIds.length > 0
            ? await getReferrerAnalyticsFromEngineBatched(
                c.env,
                fullLinkIds,
                dataSourceDecision.splitRange.recent.start,
                dataSourceDecision.splitRange.recent.end,
                queryParams.limit || 100
              )
            : await getReferrerAnalyticsFromEngine(
                c.env,
                analyticsEngineFilters,
                dataSourceDecision.splitRange.recent.start,
                dataSourceDecision.splitRange.recent.end,
                queryParams.limit || 100
              );
          referrers.push(...recentReferrers);
        } catch (error) {
          console.error('[ANALYTICS] Error querying Analytics Engine for referrers:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to query Analytics Engine';
          warnings.push(`Failed to query Analytics Engine: ${errorMessage}. Please check API credentials and try again.`);
        }
      }
    } else if (dataSourceDecision.splitRange.recent !== null && !dataSourceDecision.useAnalyticsEngine) {
      const credentialError = checkAnalyticsEngineCredentials(c.env);
      if (credentialError) {
        warnings.push(credentialError);
      } else {
        warnings.push('Recent data (< 89 days) not available - API credentials required');
      }
    }

    // Query old data from D1
    if (dataSourceDecision.useD1 && dataSourceDecision.splitRange.old) {
      try {
        const oldReferrers = await getReferrerAnalyticsByFilters(
          c.env,
          d1Filters,
          dataSourceDecision.splitRange.old.start,
          dataSourceDecision.splitRange.old.end,
          queryParams.limit || 100
        );
        const oldReferrerPoints: ReferrerDataPoint[] = oldReferrers.map(ref => ({
          referrer_domain: ref.referrer_domain || 'direct',
          clicks: ref.clicks,
          unique_visitors: 0,
          category: categorizeReferrer(ref.referrer_domain || 'direct'),
        }));
        referrers = mergeReferrerData(referrers, oldReferrerPoints);
      } catch (error) {
        console.error('[ANALYTICS] Error querying D1 for referrers:', error);
        warnings.push('Failed to query historical data from D1');
      }
    }

    // Aggregate by referrer domain
    const aggregated = new Map<string, { referrer_domain: string; clicks: number; category: string }>();
    for (const ref of referrers) {
      const domain = ref.referrer_domain || 'direct';
      const existing = aggregated.get(domain) || { referrer_domain: domain, clicks: 0, category: ref.category || categorizeReferrer(domain) };
      existing.clicks += ref.clicks;
      aggregated.set(domain, existing);
    }

    const data = Array.from(aggregated.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, queryParams.limit || 100);

    return c.json({
      success: true,
      data: {
        period: { start_date: startDate, end_date: endDate },
        referrers: data,
        total_clicks: data.reduce((sum, item) => sum + item.clicks, 0),
      },
      meta: {
        data_source: dataSourceDecision.useAnalyticsEngine && dataSourceDecision.useD1
          ? 'mixed'
          : dataSourceDecision.useAnalyticsEngine
            ? 'analytics_engine'
            : 'd1',
        aggregation_enabled: dataSourceDecision.aggregationEnabled,
        date_ranges: {
          analytics_engine: dataSourceDecision.splitRange.recent || undefined,
          d1: dataSourceDecision.splitRange.old || undefined,
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    });
  } catch (error) {
    console.error('[ANALYTICS ERROR] Referrers breakdown:', error);
    if (error instanceof HTTPException) throw error;
    throw new HTTPException(500, { message: error instanceof Error ? error.message : 'An internal error occurred' });
  }
});

// UTM Campaigns breakdown endpoint
analyticsRouter.get('/breakdown/utm', authMiddleware, requirePermission('view_analytics'), async (c) => {
  try {
    const queryParams = analyticsQuerySchema.parse({
      link_id: c.req.query('link_id'),
      link_ids: c.req.query('link_ids'),
      domain_id: c.req.query('domain_id'),
      domain_ids: c.req.query('domain_ids'),
      tag_ids: c.req.query('tag_ids'),
      category_ids: c.req.query('category_ids'),
      start_date: c.req.query('start_date'),
      end_date: c.req.query('end_date'),
      group_by: c.req.query('group_by'),
      limit: c.req.query('limit'),
      data_source: c.req.query('data_source') || 'auto',
    });

    const user = (c as any).get('user') as User;
    const filters = await getAnalyticsFilters(c.env, user, queryParams);

    const endDate = queryParams.end_date || new Date().toISOString().slice(0, 10);
    const startDate = queryParams.start_date || (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString().slice(0, 10);
    })();

    // Determine data sources
    const dataSourceDecision = await determineDataSources(
      c.env,
      startDate,
      endDate,
      queryParams.data_source
    );

    // If aggregation disabled and requesting old data, return error
    if (!dataSourceDecision.aggregationEnabled && dataSourceDecision.splitRange.old !== null) {
      throw new HTTPException(400, {
        message: 'Data older than 89 days is not available. Analytics aggregation is disabled.',
      });
    }

    const linkIds = await getFilteredLinkIds(c.env, filters);
    // Remove linkIds from filters before D1 queries - D1 uses JOINs with tagIds/categoryIds
    const d1Filters = { ...filters };
    if (d1Filters.linkIds) {
      delete d1Filters.linkIds;
    }
    
    // Build Analytics Engine filters using helper function
    const engineFilterResult = buildAnalyticsEngineFilters(
      linkIds,
      filters
    );
    const analyticsEngineFilters = engineFilterResult.filters;
    const needsBatching = engineFilterResult.needsBatching;
    const fullLinkIds = engineFilterResult.fullLinkIds;
    
    let utmData: Array<{
      utm_source: string | null;
      utm_medium: string | null;
      utm_campaign: string | null;
      clicks: number;
      unique_visitors: number;
    }> = [];
    const warnings: string[] = [];

    const groupByValue = queryParams.group_by;
    const groupBy = groupByValue === 'source' ? 'source' :
      groupByValue === 'medium' ? 'medium' :
        groupByValue === 'campaign' ? 'campaign' :
          groupByValue === 'date' ? 'date' : undefined;

    // Query recent data from Analytics Engine
    if (dataSourceDecision.useAnalyticsEngine && dataSourceDecision.splitRange.recent && 
        (analyticsEngineFilters.linkIds?.length || analyticsEngineFilters.domainNames?.length || (!filters.domainIds && !filters.tagIds && !filters.categoryIds))) {
      const credentialError = checkAnalyticsEngineCredentials(c.env);
      if (credentialError) {
        warnings.push(credentialError);
      } else {
        try {
          const recentUtm = needsBatching && fullLinkIds.length > 0
            ? await getUtmAnalyticsFromEngineBatched(
                c.env,
                fullLinkIds,
                dataSourceDecision.splitRange.recent.start,
                dataSourceDecision.splitRange.recent.end,
                groupBy as 'source' | 'medium' | 'campaign' | undefined,
                queryParams.limit || 100
              )
            : await getUtmAnalyticsFromEngine(
                c.env,
                analyticsEngineFilters,
                dataSourceDecision.splitRange.recent.start,
                dataSourceDecision.splitRange.recent.end,
                groupBy as 'source' | 'medium' | 'campaign' | undefined,
                queryParams.limit || 100
              );
          utmData.push(...recentUtm);
        } catch (error) {
          console.error('[ANALYTICS] Error querying Analytics Engine for UTM:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to query Analytics Engine';
          warnings.push(`Failed to query Analytics Engine: ${errorMessage}. Please check API credentials and try again.`);
        }
      }
    } else if (dataSourceDecision.splitRange.recent !== null && !dataSourceDecision.useAnalyticsEngine) {
      const credentialError = checkAnalyticsEngineCredentials(c.env);
      if (credentialError) {
        warnings.push(credentialError);
      } else {
        warnings.push('Recent data (< 89 days) not available - API credentials required');
      }
    }

    // Query old data from D1
    if (dataSourceDecision.useD1 && dataSourceDecision.splitRange.old) {
      try {
        const oldUtm = await getUtmAnalyticsByFilters(
          c.env,
          d1Filters,
          dataSourceDecision.splitRange.old.start,
          dataSourceDecision.splitRange.old.end,
          groupBy,
          queryParams.limit || 100
        );
        const oldUtmPoints = oldUtm.map(u => ({
          utm_source: u.utm_source,
          utm_medium: u.utm_medium,
          utm_campaign: u.utm_campaign,
          clicks: u.clicks,
          unique_visitors: u.unique_visitors,
        }));
        utmData = mergeUtmData(utmData, oldUtmPoints);
      } catch (error) {
        console.error('[ANALYTICS] Error querying D1 for UTM:', error);
        warnings.push('Failed to query historical data from D1');
      }
    }

    return c.json({
      success: true,
      data: {
        period: { start_date: startDate, end_date: endDate },
        utm: utmData.slice(0, queryParams.limit || 100),
        total_clicks: utmData.reduce((sum, u) => sum + u.clicks, 0),
      },
      meta: {
        data_source: dataSourceDecision.useAnalyticsEngine && dataSourceDecision.useD1
          ? 'mixed'
          : dataSourceDecision.useAnalyticsEngine
            ? 'analytics_engine'
            : 'd1',
        aggregation_enabled: dataSourceDecision.aggregationEnabled,
        date_ranges: {
          analytics_engine: dataSourceDecision.splitRange.recent || undefined,
          d1: dataSourceDecision.splitRange.old || undefined,
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    });
  } catch (error) {
    console.error('[ANALYTICS ERROR] UTM breakdown:', error);
    if (error instanceof HTTPException) throw error;
    throw new HTTPException(500, { message: error instanceof Error ? error.message : 'An internal error occurred' });
  }
});

// Custom Parameters breakdown endpoint
analyticsRouter.get('/breakdown/custom-params', authMiddleware, requirePermission('view_analytics'), async (c) => {
  try {
    const queryParams = analyticsQuerySchema.parse({
      link_id: c.req.query('link_id'),
      link_ids: c.req.query('link_ids'),
      domain_id: c.req.query('domain_id'),
      domain_ids: c.req.query('domain_ids'),
      tag_ids: c.req.query('tag_ids'),
      category_ids: c.req.query('category_ids'),
      start_date: c.req.query('start_date'),
      end_date: c.req.query('end_date'),
      limit: c.req.query('limit'),
      data_source: c.req.query('data_source') || 'auto',
    });

    const user = (c as any).get('user') as User;
    const filters = await getAnalyticsFilters(c.env, user, queryParams);

    const endDate = queryParams.end_date || new Date().toISOString().slice(0, 10);
    const startDate = queryParams.start_date || (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString().slice(0, 10);
    })();

    // Determine data sources
    const dataSourceDecision = await determineDataSources(
      c.env,
      startDate,
      endDate,
      queryParams.data_source
    );

    // If aggregation disabled and requesting old data, return error
    if (!dataSourceDecision.aggregationEnabled && dataSourceDecision.splitRange.old !== null) {
      throw new HTTPException(400, {
        message: 'Data older than 89 days is not available. Analytics aggregation is disabled.',
      });
    }

    const linkIds = await getFilteredLinkIds(c.env, filters);
    // Remove linkIds from filters before D1 queries - D1 uses JOINs with tagIds/categoryIds
    const d1Filters = { ...filters };
    if (d1Filters.linkIds) {
      delete d1Filters.linkIds;
    }
    
    // Build Analytics Engine filters using helper function
    const engineFilterResult = buildAnalyticsEngineFilters(
      linkIds,
      filters
    );
    const analyticsEngineFilters = engineFilterResult.filters;
    const needsBatching = engineFilterResult.needsBatching;
    const fullLinkIds = engineFilterResult.fullLinkIds;
    
    const warnings: string[] = [];

    // Query recent data from Analytics Engine
    let param1Recent: Array<{ param_name: string; param_value: string | null; clicks: number; unique_visitors: number }> = [];
    let param2Recent: Array<{ param_name: string; param_value: string | null; clicks: number; unique_visitors: number }> = [];
    let param3Recent: Array<{ param_name: string; param_value: string | null; clicks: number; unique_visitors: number }> = [];

    if (dataSourceDecision.useAnalyticsEngine && dataSourceDecision.splitRange.recent && 
        (analyticsEngineFilters.linkIds?.length || analyticsEngineFilters.domainNames?.length || (!filters.domainIds && !filters.tagIds && !filters.categoryIds))) {
      const credentialError = checkAnalyticsEngineCredentials(c.env);
      if (credentialError) {
        warnings.push(credentialError);
      } else {
        try {
          [param1Recent, param2Recent, param3Recent] = await Promise.all([
            needsBatching && fullLinkIds.length > 0
              ? getCustomParamAnalyticsFromEngineBatched(c.env, fullLinkIds, dataSourceDecision.splitRange.recent.start, dataSourceDecision.splitRange.recent.end, 'custom_param1', queryParams.limit || 100)
              : getCustomParamAnalyticsFromEngine(c.env, analyticsEngineFilters, dataSourceDecision.splitRange.recent.start, dataSourceDecision.splitRange.recent.end, 'custom_param1', queryParams.limit || 100),
            needsBatching && fullLinkIds.length > 0
              ? getCustomParamAnalyticsFromEngineBatched(c.env, fullLinkIds, dataSourceDecision.splitRange.recent.start, dataSourceDecision.splitRange.recent.end, 'custom_param2', queryParams.limit || 100)
              : getCustomParamAnalyticsFromEngine(c.env, analyticsEngineFilters, dataSourceDecision.splitRange.recent.start, dataSourceDecision.splitRange.recent.end, 'custom_param2', queryParams.limit || 100),
            needsBatching && fullLinkIds.length > 0
              ? getCustomParamAnalyticsFromEngineBatched(c.env, fullLinkIds, dataSourceDecision.splitRange.recent.start, dataSourceDecision.splitRange.recent.end, 'custom_param3', queryParams.limit || 100)
              : getCustomParamAnalyticsFromEngine(c.env, analyticsEngineFilters, dataSourceDecision.splitRange.recent.start, dataSourceDecision.splitRange.recent.end, 'custom_param3', queryParams.limit || 100),
          ]);
        } catch (error) {
          console.error('[ANALYTICS] Error querying Analytics Engine for custom params:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to query Analytics Engine';
          warnings.push(`Failed to query Analytics Engine: ${errorMessage}. Please check API credentials and try again.`);
        }
      }
    } else if (dataSourceDecision.splitRange.recent !== null && !dataSourceDecision.useAnalyticsEngine) {
      const credentialError = checkAnalyticsEngineCredentials(c.env);
      if (credentialError) {
        warnings.push(credentialError);
      } else {
        warnings.push('Recent data (< 89 days) not available - API credentials required');
      }
    }

    // Query old data from D1
    let param1Old: Array<{ param_name: string; param_value: string | null; clicks: number; unique_visitors: number }> = [];
    let param2Old: Array<{ param_name: string; param_value: string | null; clicks: number; unique_visitors: number }> = [];
    let param3Old: Array<{ param_name: string; param_value: string | null; clicks: number; unique_visitors: number }> = [];

    if (dataSourceDecision.useD1 && dataSourceDecision.splitRange.old) {
      try {
        const [p1, p2, p3] = await Promise.all([
          getCustomParamAnalyticsByFilters(c.env, d1Filters, dataSourceDecision.splitRange.old.start, dataSourceDecision.splitRange.old.end, 'custom_param1', queryParams.limit || 100),
          getCustomParamAnalyticsByFilters(c.env, d1Filters, dataSourceDecision.splitRange.old.start, dataSourceDecision.splitRange.old.end, 'custom_param2', queryParams.limit || 100),
          getCustomParamAnalyticsByFilters(c.env, d1Filters, dataSourceDecision.splitRange.old.start, dataSourceDecision.splitRange.old.end, 'custom_param3', queryParams.limit || 100),
        ]);
        param1Old = p1.map(p => ({ param_name: p.param_name, param_value: p.param_value, clicks: p.clicks, unique_visitors: p.unique_visitors }));
        param2Old = p2.map(p => ({ param_name: p.param_name, param_value: p.param_value, clicks: p.clicks, unique_visitors: p.unique_visitors }));
        param3Old = p3.map(p => ({ param_name: p.param_name, param_value: p.param_value, clicks: p.clicks, unique_visitors: p.unique_visitors }));
      } catch (error) {
        console.error('[ANALYTICS] Error querying D1 for custom params:', error);
        warnings.push('Failed to query historical data from D1');
      }
    }

    // Merge results
    const param1 = mergeCustomParamData(param1Recent, param1Old);
    const param2 = mergeCustomParamData(param2Recent, param2Old);
    const param3 = mergeCustomParamData(param3Recent, param3Old);

    return c.json({
      success: true,
      data: {
        period: { start_date: startDate, end_date: endDate },
        custom_params: {
          custom_param1: param1.slice(0, queryParams.limit || 100),
          custom_param2: param2.slice(0, queryParams.limit || 100),
          custom_param3: param3.slice(0, queryParams.limit || 100),
        },
        total_clicks: [...param1, ...param2, ...param3].reduce((sum, p) => sum + p.clicks, 0),
      },
      meta: {
        data_source: dataSourceDecision.useAnalyticsEngine && dataSourceDecision.useD1
          ? 'mixed'
          : dataSourceDecision.useAnalyticsEngine
            ? 'analytics_engine'
            : 'd1',
        aggregation_enabled: dataSourceDecision.aggregationEnabled,
        date_ranges: {
          analytics_engine: dataSourceDecision.splitRange.recent || undefined,
          d1: dataSourceDecision.splitRange.old || undefined,
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    });
  } catch (error) {
    console.error('[ANALYTICS ERROR] Custom params breakdown:', error);
    if (error instanceof HTTPException) throw error;
    throw new HTTPException(500, { message: error instanceof Error ? error.message : 'An internal error occurred' });
  }
});

// Operating Systems breakdown endpoint
analyticsRouter.get('/breakdown/os', authMiddleware, requirePermission('view_analytics'), async (c) => {
  try {
    const queryParams = analyticsQuerySchema.parse({
      link_id: c.req.query('link_id'),
      link_ids: c.req.query('link_ids'),
      domain_id: c.req.query('domain_id'),
      domain_ids: c.req.query('domain_ids'),
      tag_ids: c.req.query('tag_ids'),
      category_ids: c.req.query('category_ids'),
      start_date: c.req.query('start_date'),
      end_date: c.req.query('end_date'),
      limit: c.req.query('limit'),
      data_source: c.req.query('data_source') || 'auto',
    });

    const user = (c as any).get('user') as User;
    const filters = await getAnalyticsFilters(c.env, user, queryParams);

    const endDate = queryParams.end_date || new Date().toISOString().slice(0, 10);
    const startDate = queryParams.start_date || (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString().slice(0, 10);
    })();

    // Determine data sources
    const dataSourceDecision = await determineDataSources(
      c.env,
      startDate,
      endDate,
      queryParams.data_source
    );

    // If aggregation disabled and requesting old data, return error
    if (!dataSourceDecision.aggregationEnabled && dataSourceDecision.splitRange.old !== null) {
      throw new HTTPException(400, {
        message: 'Data older than 89 days is not available. Analytics aggregation is disabled.',
      });
    }

    const linkIds = await getFilteredLinkIds(c.env, filters);
    // Remove linkIds from filters before D1 queries - D1 uses JOINs with tagIds/categoryIds
    const d1Filters = { ...filters };
    if (d1Filters.linkIds) {
      delete d1Filters.linkIds;
    }
    
    // Build Analytics Engine filters using helper function
    const engineFilterResult = buildAnalyticsEngineFilters(
      linkIds,
      filters
    );
    const analyticsEngineFilters = engineFilterResult.filters;
    const needsBatching = engineFilterResult.needsBatching;
    const fullLinkIds = engineFilterResult.fullLinkIds;
    
    let deviceData: Array<{
      device_type: string | null;
      browser: string | null;
      os: string | null;
      clicks: number;
      unique_visitors: number;
    }> = [];
    const warnings: string[] = [];

    // Query recent data from Analytics Engine
    if (dataSourceDecision.useAnalyticsEngine && dataSourceDecision.splitRange.recent && 
        (analyticsEngineFilters.linkIds?.length || analyticsEngineFilters.domainNames?.length || (!filters.domainIds && !filters.tagIds && !filters.categoryIds))) {
      const credentialError = checkAnalyticsEngineCredentials(c.env);
      if (credentialError) {
        warnings.push(credentialError);
      } else {
        try {
          const recentDevices = needsBatching && fullLinkIds.length > 0
            ? await getDeviceAnalyticsFromEngineBatched(
                c.env,
                fullLinkIds,
                dataSourceDecision.splitRange.recent.start,
                dataSourceDecision.splitRange.recent.end,
                'os',
                queryParams.limit || 100
              )
            : await getDeviceAnalyticsFromEngine(
                c.env,
                analyticsEngineFilters,
                dataSourceDecision.splitRange.recent.start,
                dataSourceDecision.splitRange.recent.end,
                'os',
                queryParams.limit || 100
              );
          deviceData.push(...recentDevices);
        } catch (error) {
          console.error('[ANALYTICS] Error querying Analytics Engine for OS:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to query Analytics Engine';
          warnings.push(`Failed to query Analytics Engine: ${errorMessage}. Please check API credentials and try again.`);
        }
      }
    } else if (dataSourceDecision.splitRange.recent !== null && !dataSourceDecision.useAnalyticsEngine) {
      const credentialError = checkAnalyticsEngineCredentials(c.env);
      if (credentialError) {
        warnings.push(credentialError);
      } else {
        warnings.push('Recent data (< 89 days) not available - API credentials required');
      }
    }

    // Query old data from D1
    if (dataSourceDecision.useD1 && dataSourceDecision.splitRange.old) {
      try {
        const oldDevices = await getDeviceAnalyticsByFilters(
          c.env,
          d1Filters,
          dataSourceDecision.splitRange.old.start,
          dataSourceDecision.splitRange.old.end,
          'os',
          queryParams.limit || 100
        );
        const oldDevicePoints = oldDevices.map(d => ({
          device_type: d.device_type,
          browser: d.browser,
          os: d.os,
          clicks: d.clicks,
          unique_visitors: d.unique_visitors,
        }));
        deviceData = mergeDeviceData(deviceData, oldDevicePoints);
      } catch (error) {
        console.error('[ANALYTICS] Error querying D1 for OS:', error);
        warnings.push('Failed to query historical data from D1');
      }
    }

    // Aggregate by OS
    const aggregated = new Map<string, { os: string; clicks: number; unique_visitors: number }>();
    for (const device of deviceData) {
      const os = device.os || 'unknown';
      const existing = aggregated.get(os) || { os, clicks: 0, unique_visitors: 0 };
      existing.clicks += device.clicks;
      existing.unique_visitors = Math.max(existing.unique_visitors, device.unique_visitors);
      aggregated.set(os, existing);
    }

    const data = Array.from(aggregated.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, queryParams.limit || 100);

    return c.json({
      success: true,
      data: {
        period: { start_date: startDate, end_date: endDate },
        os: data,
        total_clicks: data.reduce((sum, item) => sum + item.clicks, 0),
      },
      meta: {
        data_source: dataSourceDecision.useAnalyticsEngine && dataSourceDecision.useD1
          ? 'mixed'
          : dataSourceDecision.useAnalyticsEngine
            ? 'analytics_engine'
            : 'd1',
        aggregation_enabled: dataSourceDecision.aggregationEnabled,
        date_ranges: {
          analytics_engine: dataSourceDecision.splitRange.recent || undefined,
          d1: dataSourceDecision.splitRange.old || undefined,
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    });
  } catch (error) {
    console.error('[ANALYTICS ERROR] OS breakdown:', error);
    if (error instanceof HTTPException) throw error;
    throw new HTTPException(500, { message: error instanceof Error ? error.message : 'An internal error occurred' });
  }
});

// Domains breakdown endpoint
analyticsRouter.get('/breakdown/domains', authMiddleware, requirePermission('view_analytics'), async (c) => {
  try {
    const queryParams = analyticsQuerySchema.parse({
      link_id: c.req.query('link_id'),
      link_ids: c.req.query('link_ids'),
      domain_id: c.req.query('domain_id'),
      domain_ids: c.req.query('domain_ids'),
      domain_names: c.req.query('domain_names'),
      tag_ids: c.req.query('tag_ids'),
      category_ids: c.req.query('category_ids'),
      start_date: c.req.query('start_date'),
      end_date: c.req.query('end_date'),
      limit: c.req.query('limit'),
      data_source: c.req.query('data_source') || 'auto',
    });

    const user = (c as any).get('user') as User;
    const filters = await getAnalyticsFilters(c.env, user, queryParams);

    const endDate = queryParams.end_date || new Date().toISOString().slice(0, 10);
    const startDate = queryParams.start_date || (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString().slice(0, 10);
    })();

    // Determine data sources
    const dataSourceDecision = await determineDataSources(
      c.env,
      startDate,
      endDate,
      queryParams.data_source || 'auto'
    );

    // If aggregation disabled and requesting old data, return error
    if (!dataSourceDecision.aggregationEnabled && dataSourceDecision.splitRange.old !== null) {
      throw new HTTPException(400, {
        message: 'Data older than 89 days is not available. Analytics aggregation is disabled.',
      });
    }

    // Remove linkIds from filters before D1 queries - D1 uses JOINs with tagIds/categoryIds
    const d1Filters = { ...filters };
    if (d1Filters.linkIds) {
      delete d1Filters.linkIds;
    }

    let summary = { total_clicks: 0, total_unique_visitors: 0 };
    let topLinks: Array<{ link_id: string; clicks: number }> = [];

    // Get linkIds for Analytics Engine queries
    const linkIds = await getFilteredLinkIds(c.env, {
      domainIds: filters.domainIds,
      tagIds: filters.tagIds,
      categoryIds: filters.categoryIds,
      status: 'active',
    });

    // Build Analytics Engine filters using helper function
    const engineFilterResult = buildAnalyticsEngineFilters(
      linkIds,
      filters,
      queryParams.domain_names
    );
    const analyticsEngineFilters = engineFilterResult.filters;
    const needsBatching = engineFilterResult.needsBatching;
    const fullLinkIds = engineFilterResult.fullLinkIds;

    // Query recent data from Analytics Engine
    if (dataSourceDecision.useAnalyticsEngine && dataSourceDecision.splitRange.recent && 
        (analyticsEngineFilters.linkIds?.length || analyticsEngineFilters.domainNames?.length)) {
      const credentialError = checkAnalyticsEngineCredentials(c.env);
      if (!credentialError) {
        try {
          const recentSummary = needsBatching && fullLinkIds.length > 0
            ? await getAggregatedSummaryFromEngineBatched(
                c.env,
                fullLinkIds,
                dataSourceDecision.splitRange.recent.start,
                dataSourceDecision.splitRange.recent.end
              )
            : await getAggregatedSummaryFromEngine(
                c.env,
                analyticsEngineFilters,
                dataSourceDecision.splitRange.recent.start,
                dataSourceDecision.splitRange.recent.end
              );
          summary.total_clicks += recentSummary.total_clicks;
          summary.total_unique_visitors = Math.max(
            summary.total_unique_visitors,
            recentSummary.total_unique_visitors
          );
        } catch (error) {
          console.error('[ANALYTICS] Error querying Analytics Engine for domain breakdown:', error);
        }
      }
    }

    // Query old data from D1
    if (dataSourceDecision.useD1 && dataSourceDecision.splitRange.old) {
      const oldSummary = await getAggregatedSummaryByDomains(
        c.env,
        d1Filters,
        dataSourceDecision.splitRange.old.start,
        dataSourceDecision.splitRange.old.end
      );
      summary.total_clicks += oldSummary.total_clicks;
      summary.total_unique_visitors = Math.max(
        summary.total_unique_visitors,
        oldSummary.total_unique_visitors
      );

      const oldTopLinks = await getTopLinksByClicks(
        c.env,
        d1Filters,
        dataSourceDecision.splitRange.old.start,
        dataSourceDecision.splitRange.old.end,
        queryParams.limit || 10
      );
      topLinks.push(...oldTopLinks);
    }

    return c.json({
      success: true,
      data: {
        period: { start_date: startDate, end_date: endDate },
        summary,
        top_links: topLinks,
      },
      meta: {
        data_source: dataSourceDecision.useAnalyticsEngine && dataSourceDecision.useD1
          ? 'mixed'
          : dataSourceDecision.useAnalyticsEngine
            ? 'analytics_engine'
            : 'd1',
        aggregation_enabled: dataSourceDecision.aggregationEnabled,
        date_ranges: {
          analytics_engine: dataSourceDecision.splitRange.recent || undefined,
          d1: dataSourceDecision.splitRange.old || undefined,
        },
      },
    });
  } catch (error) {
    console.error('[ANALYTICS ERROR] Domains breakdown:', error);
    if (error instanceof HTTPException) throw error;
    throw new HTTPException(500, { message: error instanceof Error ? error.message : 'An internal error occurred' });
  }
});

// Browsers breakdown endpoint
analyticsRouter.get('/breakdown/browsers', authMiddleware, requirePermission('view_analytics'), async (c) => {
  try {
    const queryParams = analyticsQuerySchema.parse({
      link_id: c.req.query('link_id'),
      link_ids: c.req.query('link_ids'),
      domain_id: c.req.query('domain_id'),
      domain_ids: c.req.query('domain_ids'),
      tag_ids: c.req.query('tag_ids'),
      category_ids: c.req.query('category_ids'),
      start_date: c.req.query('start_date'),
      end_date: c.req.query('end_date'),
      limit: c.req.query('limit'),
      data_source: c.req.query('data_source') || 'auto',
    });

    const user = (c as any).get('user') as User;
    const filters = await getAnalyticsFilters(c.env, user, queryParams);

    const endDate = queryParams.end_date || new Date().toISOString().slice(0, 10);
    const startDate = queryParams.start_date || (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString().slice(0, 10);
    })();

    // Determine data sources
    const dataSourceDecision = await determineDataSources(
      c.env,
      startDate,
      endDate,
      queryParams.data_source
    );

    // If aggregation disabled and requesting old data, return error
    if (!dataSourceDecision.aggregationEnabled && dataSourceDecision.splitRange.old !== null) {
      throw new HTTPException(400, {
        message: 'Data older than 89 days is not available. Analytics aggregation is disabled.',
      });
    }

    const linkIds = await getFilteredLinkIds(c.env, filters);
    // Remove linkIds from filters before D1 queries - D1 uses JOINs with tagIds/categoryIds
    const d1Filters = { ...filters };
    if (d1Filters.linkIds) {
      delete d1Filters.linkIds;
    }
    
    // Build Analytics Engine filters using helper function
    const engineFilterResult = buildAnalyticsEngineFilters(
      linkIds,
      filters
    );
    const analyticsEngineFilters = engineFilterResult.filters;
    const needsBatching = engineFilterResult.needsBatching;
    const fullLinkIds = engineFilterResult.fullLinkIds;
    
    let deviceData: Array<{
      device_type: string | null;
      browser: string | null;
      os: string | null;
      clicks: number;
      unique_visitors: number;
    }> = [];
    const warnings: string[] = [];

    // Query recent data from Analytics Engine
    if (dataSourceDecision.useAnalyticsEngine && dataSourceDecision.splitRange.recent && 
        (analyticsEngineFilters.linkIds?.length || analyticsEngineFilters.domainNames?.length || (!filters.domainIds && !filters.tagIds && !filters.categoryIds))) {
      const credentialError = checkAnalyticsEngineCredentials(c.env);
      if (credentialError) {
        warnings.push(credentialError);
      } else {
        try {
          const recentDevices = needsBatching && fullLinkIds.length > 0
            ? await getDeviceAnalyticsFromEngineBatched(
                c.env,
                fullLinkIds,
                dataSourceDecision.splitRange.recent.start,
                dataSourceDecision.splitRange.recent.end,
                'browser',
                queryParams.limit || 100
              )
            : await getDeviceAnalyticsFromEngine(
                c.env,
                analyticsEngineFilters,
                dataSourceDecision.splitRange.recent.start,
                dataSourceDecision.splitRange.recent.end,
                'browser',
                queryParams.limit || 100
              );
          deviceData.push(...recentDevices);
        } catch (error) {
          console.error('[ANALYTICS] Error querying Analytics Engine for browsers:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to query Analytics Engine';
          warnings.push(`Failed to query Analytics Engine: ${errorMessage}. Please check API credentials and try again.`);
        }
      }
    } else if (dataSourceDecision.splitRange.recent !== null && !dataSourceDecision.useAnalyticsEngine) {
      const credentialError = checkAnalyticsEngineCredentials(c.env);
      if (credentialError) {
        warnings.push(credentialError);
      } else {
        warnings.push('Recent data (< 89 days) not available - API credentials required');
      }
    }

    // Query old data from D1
    if (dataSourceDecision.useD1 && dataSourceDecision.splitRange.old) {
      try {
        const oldDevices = await getDeviceAnalyticsByFilters(
          c.env,
          d1Filters,
          dataSourceDecision.splitRange.old.start,
          dataSourceDecision.splitRange.old.end,
          'browser',
          queryParams.limit || 100
        );
        const oldDevicePoints = oldDevices.map(d => ({
          device_type: d.device_type,
          browser: d.browser,
          os: d.os,
          clicks: d.clicks,
          unique_visitors: d.unique_visitors,
        }));
        deviceData = mergeDeviceData(deviceData, oldDevicePoints);
      } catch (error) {
        console.error('[ANALYTICS] Error querying D1 for browsers:', error);
        warnings.push('Failed to query historical data from D1');
      }
    }

    // Aggregate by browser
    const aggregated = new Map<string, { browser: string; clicks: number; unique_visitors: number }>();
    for (const device of deviceData) {
      const browser = device.browser || 'unknown';
      const existing = aggregated.get(browser) || { browser, clicks: 0, unique_visitors: 0 };
      existing.clicks += device.clicks;
      existing.unique_visitors = Math.max(existing.unique_visitors, device.unique_visitors);
      aggregated.set(browser, existing);
    }

    const data = Array.from(aggregated.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, queryParams.limit || 100);

    return c.json({
      success: true,
      data: {
        period: { start_date: startDate, end_date: endDate },
        browsers: data,
        total_clicks: data.reduce((sum, item) => sum + item.clicks, 0),
      },
      meta: {
        data_source: dataSourceDecision.useAnalyticsEngine && dataSourceDecision.useD1
          ? 'mixed'
          : dataSourceDecision.useAnalyticsEngine
            ? 'analytics_engine'
            : 'd1',
        aggregation_enabled: dataSourceDecision.aggregationEnabled,
        date_ranges: {
          analytics_engine: dataSourceDecision.splitRange.recent || undefined,
          d1: dataSourceDecision.splitRange.old || undefined,
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    });
  } catch (error) {
    console.error('[ANALYTICS ERROR] Browsers breakdown:', error);
    if (error instanceof HTTPException) throw error;
    throw new HTTPException(500, { message: error instanceof Error ? error.message : 'An internal error occurred' });
  }
});

// Export analytics as CSV
analyticsRouter.get('/export', authMiddleware, requirePermission('view_analytics'), async (c) => {
  try {
    const queryParams = analyticsQuerySchema.parse({
      link_id: c.req.query('link_id'),
      link_ids: c.req.query('link_ids'),
      domain_id: c.req.query('domain_id'),
      domain_ids: c.req.query('domain_ids'),
      tag_ids: c.req.query('tag_ids'),
      category_ids: c.req.query('category_ids'),
      start_date: c.req.query('start_date'),
      end_date: c.req.query('end_date'),
    });

    const user = (c as any).get('user') as User;

    // Check domain access
    const hasGlobalAccess = user.global_access || user.role === 'admin' || user.role === 'owner';
    let accessibleDomainIds: string[] = [];

    if (!hasGlobalAccess) {
      accessibleDomainIds = (user as any).accessible_domain_ids || [];
      if (accessibleDomainIds.length === 0) {
        throw new HTTPException(403, { message: 'No accessible domains' });
      }
    }

    // Default date range: last 30 days
    const endDate = queryParams.end_date || new Date().toISOString().slice(0, 10);
    const startDate = queryParams.start_date || (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString().slice(0, 10);
    })();

    // Get link IDs to query
    let linkIds: string[] = [];
    if (queryParams.link_id) {
      linkIds = [queryParams.link_id];
      const link = await getLinkById(c.env, queryParams.link_id);
      if (!link) {
        throw new HTTPException(404, { message: 'Link not found' });
      }
      const hasAccess = await canAccessDomain(c.env, user, link.domain_id);
      if (!hasAccess) {
        throw new HTTPException(403, { message: 'Access denied' });
      }
    } else if (queryParams.link_ids) {
      linkIds = queryParams.link_ids;
    } else {
      // Get all links for domain(s)
      const domainFilter = queryParams.domain_id
        ? [queryParams.domain_id]
        : queryParams.domain_ids || (accessibleDomainIds.length > 0 ? accessibleDomainIds : undefined);

      if (queryParams.domain_id) {
        const hasAccess = await canAccessDomain(c.env, user, queryParams.domain_id);
        if (!hasAccess) {
          throw new HTTPException(403, { message: 'Access denied' });
        }
      }

      linkIds = await getFilteredLinkIds(c.env, {
        domainIds: domainFilter,
        tagIds: queryParams.tag_ids,
        categoryIds: queryParams.category_ids,
      });
    }

    // Fetch analytics data
    const linkDetailsMap = new Map();
    const analyticsData: Array<{
      date: string;
      link_id: string;
      slug: string;
      destination_url: string;
      clicks: number;
      unique_visitors: number;
    }> = [];

    // Fetch link details
    for (const linkId of linkIds) {
      const link = await getLinkById(c.env, linkId);
      if (link) {
        linkDetailsMap.set(linkId, link);
      }
    }

    // Get daily analytics for all links
    const dailyData = await getDailyAnalyticsForLinks(c.env, linkIds, startDate, endDate);

    for (const row of dailyData) {
      const link = linkDetailsMap.get(row.link_id);
      if (link) {
        analyticsData.push({
          date: row.date,
          link_id: row.link_id,
          slug: link.slug,
          destination_url: link.destination_url,
          clicks: row.clicks,
          unique_visitors: row.unique_visitors,
        });
      }
    }

    // Sort by date descending
    analyticsData.sort((a, b) => b.date.localeCompare(a.date));

    // Generate CSV
    const headers = ['Date', 'Slug', 'Destination URL', 'Clicks', 'Unique Visitors'];
    const csvRows = [headers.join(',')];

    for (const row of analyticsData) {
      const csvRow = [
        row.date,
        `"${row.slug.replace(/"/g, '""')}"`,
        `"${row.destination_url.replace(/"/g, '""')}"`,
        row.clicks,
        row.unique_visitors,
      ];
      csvRows.push(csvRow.join(','));
    }

    const csv = csvRows.join('\n');

    // Set CSV headers
    c.header('Content-Type', 'text/csv');
    c.header('Content-Disposition', `attachment; filename="analytics-export-${startDate}-to-${endDate}.csv"`);

    return c.body(csv);
  } catch (error) {
    console.error('[ANALYTICS ERROR] CSV export:', error);
    if (error instanceof HTTPException) throw error;
    throw new HTTPException(500, { message: error instanceof Error ? error.message : 'An internal error occurred' });
  }
});

export { analyticsRouter };

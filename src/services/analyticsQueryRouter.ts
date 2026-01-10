/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Analytics query router service
// Routes queries to appropriate data source (Analytics Engine or D1) based on date range and settings

import type { Env } from '../types';
import type {
  TimeSeriesDataPoint,
  GeographyDataPoint,
  ReferrerDataPoint,
} from './analytics';
import { getAnalyticsAggregationEnabledOrDefault, getAnalyticsThresholdsOrDefault } from '../db/settings';

interface DateRange {
  start: string;
  end: string;
}

export interface SplitDateRange {
  recent: DateRange | null;
  old: DateRange | null;
}

export interface DataSourceDecision {
  useAnalyticsEngine: boolean;
  useD1: boolean;
  splitRange: SplitDateRange;
  aggregationEnabled: boolean;
}



/**
 * Split date range at the threshold boundary
 */
export function splitDateRange(
  startDate: string,
  endDate: string,
  thresholdDays: number
): SplitDateRange {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);
  thresholdDate.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // All data is old (>= threshold days)
  if (end < thresholdDate) {
    return {
      recent: null,
      old: { start: startDate, end: endDate },
    };
  }

  // All data is recent (< threshold days)
  if (start >= thresholdDate) {
    return {
      recent: { start: startDate, end: endDate },
      old: null,
    };
  }

  // Split at threshold
  // IMPORTANT: The naming is intentionally "backwards" for compatibility with rest of codebase:
  // - 'recent' = data source from startDate to threshold (queried from Analytics Engine)
  // - 'old' = data source from threshold to endDate (queried from D1 if aggregation enabled)
  // This is because Analytics Engine holds recent real-time data, D1 holds aggregated historical data.
  const thresholdDateStr = thresholdDate.toISOString().slice(0, 10);
  return {
    recent: {
      start: startDate,
      end: thresholdDateStr,
    },
    old: {
      start: thresholdDateStr,
      end: endDate,
    },
  };
}

/**
 * Determine which data source(s) to use based on date range, user preference, and settings
 */
export async function determineDataSources(
  env: Env,
  startDate: string,
  endDate: string,
  userPreference?: 'auto' | 'analytics_engine' | 'd1'
): Promise<DataSourceDecision> {
  // Get settings
  const aggregationSettings = await getAnalyticsAggregationEnabledOrDefault(env);
  const thresholds = await getAnalyticsThresholdsOrDefault(env);
  
  const aggregationEnabled = aggregationSettings.enabled;
  const thresholdDays = thresholds.threshold_days;

  // Split date range
  const splitRange = splitDateRange(startDate, endDate, thresholdDays);

  // If aggregation is disabled, only use Analytics Engine (and reject old data)
  if (!aggregationEnabled) {
    if (splitRange.old !== null) {
      // Request includes old data but aggregation is disabled
      // Return error indication (will be handled by caller)
      return {
        useAnalyticsEngine: splitRange.recent !== null,
        useD1: false,
        splitRange,
        aggregationEnabled: false,
      };
    }
    
    // User preference override (if forcing D1, reject since aggregation disabled)
    if (userPreference === 'd1') {
      return {
        useAnalyticsEngine: false,
        useD1: false, // Cannot use D1 if aggregation disabled
        splitRange,
        aggregationEnabled: false,
      };
    }

    // Only Analytics Engine available
    return {
      useAnalyticsEngine: splitRange.recent !== null,
      useD1: false,
      splitRange,
      aggregationEnabled: false,
    };
  }

  // Check if API tokens are available for Analytics Engine queries
  // Handle empty strings properly (trim and check length)
  const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = env.CLOUDFLARE_API_TOKEN?.trim();
  const hasApiTokens = !!(accountId && accountId.length > 0 && apiToken && apiToken.length > 0);
  
  // DEBUG: console.log('[ANALYTICS QUERY ROUTER] API token check:', {
  //   hasAccountId: !!accountId && accountId.length > 0,
  //   hasApiToken: !!apiToken && apiToken.length > 0,
  //   hasApiTokens,
  //   accountIdPreview: accountId ? accountId.substring(0, 8) + '...' : 'missing'
  // });

  // Aggregation is enabled - handle user preference
  if (userPreference === 'analytics_engine') {
    if (splitRange.recent !== null && !hasApiTokens) {
      // User wants Analytics Engine but no API tokens - cannot query recent data
      return {
        useAnalyticsEngine: false,
        useD1: false, // Cannot fallback to D1 if user explicitly wants Analytics Engine
        splitRange,
        aggregationEnabled: true,
      };
    }
    return {
      useAnalyticsEngine: splitRange.recent !== null && hasApiTokens,
      useD1: false,
      splitRange,
      aggregationEnabled: true,
    };
  }

  if (userPreference === 'd1') {
    return {
      useAnalyticsEngine: false,
      useD1: true, // Force D1 (may return partial/empty if not aggregated yet)
      splitRange,
      aggregationEnabled: true,
    };
  }

  // Auto mode: use appropriate source based on date range
  // For recent data: require API tokens for Analytics Engine, otherwise cannot query
  // For old data: use D1
  const decision = {
    useAnalyticsEngine: splitRange.recent !== null && hasApiTokens,
    useD1: splitRange.old !== null,
    splitRange,
    aggregationEnabled: true,
  };
  
  // DEBUG: console.log('[ANALYTICS QUERY ROUTER] Data source decision (auto mode):', {
  //   ...decision,
  //   reason: !hasApiTokens ? 'Missing API tokens' : (splitRange.recent === null ? 'No recent data range' : 'OK')
  // });
  
  return decision;
}

/**
 * Merge time series data from multiple sources
 */
export function mergeTimeSeries(
  recent: TimeSeriesDataPoint[],
  old: TimeSeriesDataPoint[]
): TimeSeriesDataPoint[] {
  const merged = new Map<string, { clicks: number; unique_visitors: number }>();

  // Add recent data
  for (const point of recent) {
    merged.set(point.date, {
      clicks: point.clicks,
      unique_visitors: point.unique_visitors,
    });
  }

  // Add old data (sum if date exists in both)
  for (const point of old) {
    const existing = merged.get(point.date) || { clicks: 0, unique_visitors: 0 };
    merged.set(point.date, {
      clicks: existing.clicks + point.clicks,
      unique_visitors: Math.max(existing.unique_visitors, point.unique_visitors),
    });
  }

  return Array.from(merged.entries())
    .map(([date, data]) => ({
      date,
      clicks: data.clicks,
      unique_visitors: data.unique_visitors,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Merge geography data from multiple sources
 */
export function mergeGeographyData(
  recent: GeographyDataPoint[],
  old: GeographyDataPoint[]
): GeographyDataPoint[] {
  const merged = new Map<string, { country: string; city: string | null; clicks: number; unique_visitors: number }>();

  // Add recent data
  for (const point of recent) {
    const key = `${point.country}:${point.city || ''}`;
    merged.set(key, {
      country: point.country,
      city: point.city,
      clicks: point.clicks,
      unique_visitors: point.unique_visitors,
    });
  }

  // Add old data (sum if exists)
  for (const point of old) {
    const key = `${point.country}:${point.city || ''}`;
    const existing = merged.get(key) || {
      country: point.country,
      city: point.city,
      clicks: 0,
      unique_visitors: 0,
    };
    merged.set(key, {
      country: existing.country,
      city: existing.city,
      clicks: existing.clicks + point.clicks,
      unique_visitors: Math.max(existing.unique_visitors, point.unique_visitors),
    });
  }

  return Array.from(merged.values())
    .sort((a, b) => b.clicks - a.clicks);
}

/**
 * Merge device data from multiple sources
 */
export function mergeDeviceData(
  recent: Array<{
    device_type: string | null;
    browser: string | null;
    os: string | null;
    clicks: number;
    unique_visitors: number;
  }>,
  old: Array<{
    device_type: string | null;
    browser: string | null;
    os: string | null;
    clicks: number;
    unique_visitors: number;
  }>
): Array<{
  device_type: string | null;
  browser: string | null;
  os: string | null;
  clicks: number;
  unique_visitors: number;
}> {
  const merged = new Map<string, {
    device_type: string | null;
    browser: string | null;
    os: string | null;
    clicks: number;
    unique_visitors: number;
  }>();

  // Add recent data
  for (const point of recent) {
    const key = `${point.device_type || ''}:${point.browser || ''}:${point.os || ''}`;
    merged.set(key, {
      device_type: point.device_type,
      browser: point.browser,
      os: point.os,
      clicks: point.clicks,
      unique_visitors: point.unique_visitors,
    });
  }

  // Add old data (sum if exists)
  for (const point of old) {
    const key = `${point.device_type || ''}:${point.browser || ''}:${point.os || ''}`;
    const existing = merged.get(key) || {
      device_type: point.device_type,
      browser: point.browser,
      os: point.os,
      clicks: 0,
      unique_visitors: 0,
    };
    merged.set(key, {
      device_type: existing.device_type,
      browser: existing.browser,
      os: existing.os,
      clicks: existing.clicks + point.clicks,
      unique_visitors: Math.max(existing.unique_visitors, point.unique_visitors),
    });
  }

  return Array.from(merged.values())
    .sort((a, b) => b.clicks - a.clicks);
}

/**
 * Merge UTM data from multiple sources
 */
export function mergeUtmData(
  recent: Array<{
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    clicks: number;
    unique_visitors: number;
  }>,
  old: Array<{
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    clicks: number;
    unique_visitors: number;
  }>
): Array<{
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  clicks: number;
  unique_visitors: number;
}> {
  const merged = new Map<string, {
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    clicks: number;
    unique_visitors: number;
  }>();

  // Add recent data
  for (const point of recent) {
    const key = `${point.utm_source || ''}:${point.utm_medium || ''}:${point.utm_campaign || ''}`;
    merged.set(key, {
      utm_source: point.utm_source,
      utm_medium: point.utm_medium,
      utm_campaign: point.utm_campaign,
      clicks: point.clicks,
      unique_visitors: point.unique_visitors,
    });
  }

  // Add old data (sum if exists)
  for (const point of old) {
    const key = `${point.utm_source || ''}:${point.utm_medium || ''}:${point.utm_campaign || ''}`;
    const existing = merged.get(key) || {
      utm_source: point.utm_source,
      utm_medium: point.utm_medium,
      utm_campaign: point.utm_campaign,
      clicks: 0,
      unique_visitors: 0,
    };
    merged.set(key, {
      utm_source: existing.utm_source,
      utm_medium: existing.utm_medium,
      utm_campaign: existing.utm_campaign,
      clicks: existing.clicks + point.clicks,
      unique_visitors: Math.max(existing.unique_visitors, point.unique_visitors),
    });
  }

  return Array.from(merged.values())
    .sort((a, b) => b.clicks - a.clicks);
}

/**
 * Merge custom parameter data from multiple sources
 */
export function mergeCustomParamData(
  recent: Array<{
    param_name: string;
    param_value: string | null;
    clicks: number;
    unique_visitors: number;
  }>,
  old: Array<{
    param_name: string;
    param_value: string | null;
    clicks: number;
    unique_visitors: number;
  }>
): Array<{
  param_name: string;
  param_value: string | null;
  clicks: number;
  unique_visitors: number;
}> {
  const merged = new Map<string, {
    param_name: string;
    param_value: string | null;
    clicks: number;
    unique_visitors: number;
  }>();

  // Add recent data
  for (const point of recent) {
    const key = `${point.param_name}:${point.param_value || ''}`;
    merged.set(key, {
      param_name: point.param_name,
      param_value: point.param_value,
      clicks: point.clicks,
      unique_visitors: point.unique_visitors,
    });
  }

  // Add old data (sum if exists)
  for (const point of old) {
    const key = `${point.param_name}:${point.param_value || ''}`;
    const existing = merged.get(key) || {
      param_name: point.param_name,
      param_value: point.param_value,
      clicks: 0,
      unique_visitors: 0,
    };
    merged.set(key, {
      param_name: existing.param_name,
      param_value: existing.param_value,
      clicks: existing.clicks + point.clicks,
      unique_visitors: Math.max(existing.unique_visitors, point.unique_visitors),
    });
  }

  return Array.from(merged.values())
    .sort((a, b) => b.clicks - a.clicks);
}

/**
 * Merge referrer data from multiple sources
 */
export function mergeReferrerData(
  recent: ReferrerDataPoint[],
  old: ReferrerDataPoint[]
): ReferrerDataPoint[] {
  const merged = new Map<string, ReferrerDataPoint>();

  // Add recent data
  for (const point of recent) {
    merged.set(point.referrer_domain, { ...point });
  }

  // Add old data (sum if exists)
  for (const point of old) {
    const existing = merged.get(point.referrer_domain);
    if (existing) {
      existing.clicks += point.clicks;
      existing.unique_visitors = Math.max(existing.unique_visitors, point.unique_visitors);
    } else {
      merged.set(point.referrer_domain, { ...point });
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => b.clicks - a.clicks);
}

/**
 * Check if a date should be aggregated (only aggregate data >= threshold days old)
 */
export async function shouldAggregateDate(
  env: Env,
  date: string
): Promise<boolean> {
  const thresholds = await getAnalyticsThresholdsOrDefault(env);
  const thresholdDays = thresholds.threshold_days;
  
  const dateObj = new Date(date);
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);
  thresholdDate.setHours(0, 0, 0, 0);
  
  return dateObj < thresholdDate;
}


/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Analytics aggregation service
// Aggregates Analytics Engine data into D1 for long-term storage and querying
// Note: With real-time aggregation enabled, this is mainly used for:
// - Backfilling old data from Analytics Engine (if API tokens available)
// - Verifying/re-aggregating data
// - Processing data that's >= threshold days old

import type { Env } from '../types';
import {
  upsertDailyAnalytics,
  upsertGeoAnalytics,
  upsertReferrerAnalytics,
  upsertDeviceAnalytics,
  upsertUtmAnalytics,
  upsertCustomParamAnalytics,
} from '../db/analytics';
import { updateUniqueVisitors } from '../db/links';
import { extractReferrerDomain } from './analytics';
import { formatDateForGrouping } from './analytics';
import { shouldAggregateDate } from './analyticsQueryRouter';
import { generateId } from '../utils/id';
import { getRawEventsFromEngine } from './analyticsEngineQuery';

/**
 * Aggregate analytics data for a specific date
 * Only aggregates if date is >= threshold days old (default: 90 days)
 * 
 * This function queries Analytics Engine via SQL API and aggregates into D1.
 * With real-time aggregation enabled, this is mainly for backfilling/verification.
 */
export async function aggregateAnalyticsForDate(
  env: Env,
  date: string, // YYYY-MM-DD format
  linkIds?: string[] // Optional: aggregate specific links only
): Promise<{
  processed: number;
  errors: number;
  skipped: boolean;
}> {
  // Check if date should be aggregated (must be >= threshold days old)
  const shouldAggregate = await shouldAggregateDate(env, date);
  if (!shouldAggregate) {
    // DEBUG: console.log(`[AGGREGATION] Skipping date ${date} (less than threshold days old - only aggregate data >= 90 days)`);
    return { processed: 0, errors: 0, skipped: true };
  }

  let processed = 0;
  let errors = 0;

  try {
    // DEBUG: console.log(`[AGGREGATION] Processing analytics for date: ${date} (>= 90 days old)`);

    // Check if API credentials are available (required for querying Analytics Engine)
    if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
      // DEBUG: console.warn(`[AGGREGATION] Missing API credentials, cannot query Analytics Engine for date ${date}`);
      return { processed: 0, errors: 0, skipped: false };
    }

    // Get link IDs to aggregate (if not provided, aggregate all links)
    const filters = linkIds && linkIds.length > 0 ? { linkIds } : {};

    // Query raw events from Analytics Engine SQL API for this date
    const rawEvents = await getRawEventsFromEngine(env, filters, date, date);

    if (rawEvents.length === 0) {
      // DEBUG: console.log(`[AGGREGATION] No events found for date ${date}`);
      return { processed: 0, errors: 0, skipped: false };
    }

    // Process raw events and aggregate into D1
    await processClickEvents(env, rawEvents);
    processed = rawEvents.length;

    // DEBUG: console.log(`[AGGREGATION] Successfully aggregated ${processed} events for date ${date}`);

    return { processed, errors, skipped: false };
  } catch (error) {
    console.error('[AGGREGATION ERROR]', error);
    errors++;
    return { processed, errors, skipped: false };
  }
}

/**
 * Process raw click events and aggregate them
 * This can be called with data from Analytics Engine queries
 */
export async function processClickEvents(
  env: Env,
  events: Array<{
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
  }>
): Promise<void> {
  // Group events by date, link, geography, referrer, devices, UTM, custom params
  const dailyMap = new Map<string, { clicks: number; uniqueIPs: Set<string> }>();
  const geoMap = new Map<string, number>();
  const referrerMap = new Map<string, number>();
  const deviceMap = new Map<string, { clicks: number; uniqueIPs: Set<string> }>();
  const utmMap = new Map<string, { clicks: number; uniqueIPs: Set<string> }>();
  const customParamMap = new Map<string, { clicks: number; uniqueIPs: Set<string> }>();

  for (const event of events) {
    const date = formatDateForGrouping(event.timestamp, 'day');

    // Daily aggregation
    const dailyKey = `${event.link_id}:${date}`;
    if (!dailyMap.has(dailyKey)) {
      dailyMap.set(dailyKey, { clicks: 0, uniqueIPs: new Set() });
    }
    const daily = dailyMap.get(dailyKey)!;
    daily.clicks++;
    daily.uniqueIPs.add(event.ip_address);

    // Geographic aggregation
    const geoKey = `${event.link_id}:${date}:${event.country}:${event.city}`;
    geoMap.set(geoKey, (geoMap.get(geoKey) || 0) + 1);

    // Referrer aggregation
    const referrerDomain = extractReferrerDomain(event.referrer);
    const referrerKey = `${event.link_id}:${date}:${referrerDomain}`;
    referrerMap.set(referrerKey, (referrerMap.get(referrerKey) || 0) + 1);

    // Device aggregation
    const deviceKey = `${event.link_id}:${date}:${event.device_type || 'unknown'}:${event.browser || 'unknown'}:${event.os || 'unknown'}`;
    if (!deviceMap.has(deviceKey)) {
      deviceMap.set(deviceKey, { clicks: 0, uniqueIPs: new Set() });
    }
    const device = deviceMap.get(deviceKey)!;
    device.clicks++;
    device.uniqueIPs.add(event.ip_address);

    // UTM aggregation
    if (event.utm_source || event.utm_medium || event.utm_campaign) {
      const utmKey = `${event.link_id}:${date}:${event.utm_source || ''}:${event.utm_medium || ''}:${event.utm_campaign || ''}`;
      if (!utmMap.has(utmKey)) {
        utmMap.set(utmKey, { clicks: 0, uniqueIPs: new Set() });
      }
      const utm = utmMap.get(utmKey)!;
      utm.clicks++;
      utm.uniqueIPs.add(event.ip_address);
    }

    // Custom params aggregation
    if (event.custom_param1) {
      const paramKey = `${event.link_id}:${date}:custom_param1:${event.custom_param1}`;
      if (!customParamMap.has(paramKey)) {
        customParamMap.set(paramKey, { clicks: 0, uniqueIPs: new Set() });
      }
      const param = customParamMap.get(paramKey)!;
      param.clicks++;
      param.uniqueIPs.add(event.ip_address);
    }
    if (event.custom_param2) {
      const paramKey = `${event.link_id}:${date}:custom_param2:${event.custom_param2}`;
      if (!customParamMap.has(paramKey)) {
        customParamMap.set(paramKey, { clicks: 0, uniqueIPs: new Set() });
      }
      const param = customParamMap.get(paramKey)!;
      param.clicks++;
      param.uniqueIPs.add(event.ip_address);
    }
    if (event.custom_param3) {
      const paramKey = `${event.link_id}:${date}:custom_param3:${event.custom_param3}`;
      if (!customParamMap.has(paramKey)) {
        customParamMap.set(paramKey, { clicks: 0, uniqueIPs: new Set() });
      }
      const param = customParamMap.get(paramKey)!;
      param.clicks++;
      param.uniqueIPs.add(event.ip_address);
    }
  }

  // OPTIMIZATION: Use batched writes instead of sequential awaits
  const BATCH_SIZE = 500; // D1 limit is 1000, use 500 for safety
  const allStatements: any[] = [];

  // Prepare daily analytics statements
  for (const [key, data] of dailyMap.entries()) {
    const [linkId, date] = key.split(':');
    const id = generateId('analytics_daily');
    const now = Date.now();
    allStatements.push(
      env.DB.prepare(
        `INSERT INTO analytics_daily (id, link_id, date, clicks, unique_visitors, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(link_id, date) DO UPDATE SET
           clicks = excluded.clicks,
           unique_visitors = excluded.unique_visitors`
      ).bind(id, linkId, date, data.clicks, data.uniqueIPs.size, now)
    );
  }

  // Prepare geographic analytics statements
  for (const [key, clicks] of geoMap.entries()) {
    const [linkId, date, country, city] = key.split(':');
    const id = generateId('analytics_geo');
    const now = Date.now();
    allStatements.push(
      env.DB.prepare(
        `INSERT INTO analytics_geo (id, link_id, country, city, date, clicks, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(link_id, country, city, date) DO UPDATE SET
           clicks = excluded.clicks`
      ).bind(id, linkId, country || null, city || null, date, clicks, now)
    );
  }

  // Prepare referrer analytics statements
  for (const [key, clicks] of referrerMap.entries()) {
    const [linkId, date, referrerDomain] = key.split(':');
    const id = generateId('analytics_referrer');
    const now = Date.now();
    allStatements.push(
      env.DB.prepare(
        `INSERT INTO analytics_referrers (id, link_id, referrer_domain, date, clicks, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(link_id, referrer_domain, date) DO UPDATE SET
           clicks = excluded.clicks`
      ).bind(id, linkId, referrerDomain || null, date, clicks, now)
    );
  }

  // Prepare device analytics statements
  for (const [key, data] of deviceMap.entries()) {
    const [linkId, date, deviceType, browser, os] = key.split(':');
    const id = generateId('analytics_device');
    const now = Date.now();
    allStatements.push(
      env.DB.prepare(
        `INSERT INTO analytics_devices (id, link_id, device_type, browser, os, date, clicks, unique_visitors, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(link_id, device_type, browser, os, date) DO UPDATE SET
           clicks = excluded.clicks,
           unique_visitors = excluded.unique_visitors`
      ).bind(id, linkId, deviceType || null, browser || null, os || null, date, data.clicks, data.uniqueIPs.size, now)
    );
  }

  // Prepare UTM analytics statements
  for (const [key, data] of utmMap.entries()) {
    const [linkId, date, utmSource, utmMedium, utmCampaign] = key.split(':');
    const id = generateId('analytics_utm');
    const now = Date.now();
    allStatements.push(
      env.DB.prepare(
        `INSERT INTO analytics_utm (id, link_id, utm_source, utm_medium, utm_campaign, date, clicks, unique_visitors, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(link_id, utm_source, utm_medium, utm_campaign, date) DO UPDATE SET
           clicks = excluded.clicks,
           unique_visitors = excluded.unique_visitors`
      ).bind(id, linkId, utmSource || null, utmMedium || null, utmCampaign || null, date, data.clicks, data.uniqueIPs.size, now)
    );
  }

  // Prepare custom param analytics statements
  for (const [key, data] of customParamMap.entries()) {
    const [linkId, date, paramName, paramValue] = key.split(':');
    const id = generateId('analytics_custom_param');
    const now = Date.now();
    allStatements.push(
      env.DB.prepare(
        `INSERT INTO analytics_custom_params (id, link_id, param_name, param_value, date, clicks, unique_visitors, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(link_id, param_name, param_value, date) DO UPDATE SET
           clicks = excluded.clicks,
           unique_visitors = excluded.unique_visitors`
      ).bind(id, linkId, paramName, paramValue || null, date, data.clicks, data.uniqueIPs.size, now)
    );
  }

  // Execute all analytics statements in batches
  if (allStatements.length > 0) {
    for (let i = 0; i < allStatements.length; i += BATCH_SIZE) {
      const batch = allStatements.slice(i, i + BATCH_SIZE);
      try {
        await env.DB.batch(batch);
      } catch (error) {
        console.error(`[AGGREGATION] Batch execution failed for batch starting at index ${i}:`, error);
        throw error; // Re-throw to allow retry at higher level
      }
    }
  }

  // Update unique visitors count in links table (separate batch)
  const linkUniqueVisitors = new Map<string, Set<string>>();
  for (const [key, data] of dailyMap.entries()) {
    const [linkId] = key.split(':');
    if (!linkUniqueVisitors.has(linkId)) {
      linkUniqueVisitors.set(linkId, new Set());
    }
    const linkIPs = linkUniqueVisitors.get(linkId)!;
    data.uniqueIPs.forEach(ip => linkIPs.add(ip));
  }

  // Batch update unique visitors
  const updateStatements: any[] = [];
  for (const [linkId, uniqueIPs] of linkUniqueVisitors.entries()) {
    updateStatements.push(
      env.DB.prepare(`UPDATE links SET unique_visitors = ? WHERE id = ?`)
        .bind(uniqueIPs.size, linkId)
    );
  }

  if (updateStatements.length > 0) {
    for (let i = 0; i < updateStatements.length; i += BATCH_SIZE) {
      const batch = updateStatements.slice(i, i + BATCH_SIZE);
      try {
        await env.DB.batch(batch);
      } catch (error) {
        console.error(`[AGGREGATION] Failed to update unique visitors for batch starting at index ${i}:`, error);
        // Continue despite error - unique visitors can be recalculated later
      }
    }
  }
}

/**
 * Aggregate data from threshold days ago
 * This should be called daily via cron trigger
 * Aggregates data that is exactly at the threshold age (e.g., 83 days old)
 * This ensures the daily cron actually processes data instead of always skipping
 */
export async function aggregateYesterday(env: Env): Promise<{
  processed: number;
  errors: number;
  skipped: boolean;
}> {
  // Get the threshold setting to determine which date to aggregate
  const { getAnalyticsThresholdsOrDefault } = await import('../db/settings');
  const thresholds = await getAnalyticsThresholdsOrDefault(env);
  const thresholdDays = thresholds.threshold_days;

  // Calculate the date that is exactly threshold days old
  // This is the date that should be aggregated today
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - thresholdDays);
  const dateStr = targetDate.toISOString().slice(0, 10);

  const result = await aggregateAnalyticsForDate(env, dateStr);

  if (result.skipped) {
    // DEBUG: console.log(`[AGGREGATION] Date ${dateStr} (${thresholdDays} days ago) skipped - threshold configuration issue`);
  } else if (result.processed > 0) {
    // DEBUG: console.log(`[AGGREGATION] Date ${dateStr} (${thresholdDays} days ago) processed: ${result.processed} events, ${result.errors} errors`);
  } else {
    // DEBUG: console.log(`[AGGREGATION] Date ${dateStr} (${thresholdDays} days ago) - no events found or missing API credentials`);
  }

  return result;
}

/**
 * Batch aggregate all dates >= threshold days old that haven't been aggregated yet
 * Useful for backfilling historical data
 */
export async function batchAggregateOldData(
  env: Env,
  daysBack: number = 180 // Aggregate last 180 days of old data
): Promise<{ processed: number; errors: number; skipped: number }> {
  const { getAnalyticsThresholdsOrDefault } = await import('../db/settings');
  const thresholds = await getAnalyticsThresholdsOrDefault(env);
  const thresholdDays = thresholds.threshold_days;

  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  let totalProcessed = 0;
  let totalErrors = 0;
  let totalSkipped = 0;

  // Process each date
  for (let d = new Date(startDate); d < thresholdDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    const result = await aggregateAnalyticsForDate(env, dateStr);
    totalProcessed += result.processed;
    totalErrors += result.errors;
    if (result.skipped) {
      totalSkipped++;
    }
  }

  // DEBUG: console.log(`[AGGREGATION] Batch aggregation complete: ${totalProcessed} processed, ${totalErrors} errors, ${totalSkipped} skipped`);

  return { processed: totalProcessed, errors: totalErrors, skipped: totalSkipped };
}


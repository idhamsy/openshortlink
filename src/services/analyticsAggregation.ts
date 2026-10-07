/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Analytics aggregation service
// Aggregates Analytics Engine data into D1 for long-term storage and querying.
// This is the SOLE writer of the D1 analytics tables. Click events are written to
// Analytics Engine in real time; the daily cron runs this service to roll AE data
// that is >= threshold days old (before AE's ~90-day retention expires) into D1.
// There is no "real-time" D1 aggregation — the cron is the only path that fills D1.

import type { Env } from '../types';
import { getLastAggregatedDate } from '../db/analytics';
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
 * It is the only path that populates the D1 analytics tables.
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
    // Analytics Engine adaptive sampling weight. Each row represents this many
    // real events; missing/invalid values fall back to 1 (unsampled).
    sample_interval?: number;
  }>
): Promise<void> {
  // Composite-key delimiter: an ASCII control char (Unit Separator) that cannot
  // occur in link IDs, dates, geo, referrer, device, UTM or custom-param values.
  // Using a printable delimiter (':', ' ', ...) corrupts values that contain it
  // (e.g. a utm_campaign "promo:2024" or a city "New York").
  const KEY_SEP = '\x1f';

  // Group events by date, link, geography, referrer, devices, UTM, custom params
  const dailyMap = new Map<string, { clicks: number; uniqueIPs: Set<string> }>();
  const geoMap = new Map<string, number>();
  const referrerMap = new Map<string, number>();
  const deviceMap = new Map<string, { clicks: number; uniqueIPs: Set<string> }>();
  const utmMap = new Map<string, { clicks: number; uniqueIPs: Set<string> }>();
  const customParamMap = new Map<string, { clicks: number; uniqueIPs: Set<string> }>();

  for (const event of events) {
    const date = formatDateForGrouping(event.timestamp, 'day');

    // Sample-adjusted click weight (Analytics Engine adaptive sampling).
    const weight = event.sample_interval && event.sample_interval > 0
      ? event.sample_interval
      : 1;

    // Daily aggregation
    const dailyKey = `${event.link_id}${KEY_SEP}${date}`;
    if (!dailyMap.has(dailyKey)) {
      dailyMap.set(dailyKey, { clicks: 0, uniqueIPs: new Set() });
    }
    const daily = dailyMap.get(dailyKey)!;
    daily.clicks += weight;
    daily.uniqueIPs.add(event.ip_address);

    // Geographic aggregation
    const geoKey = `${event.link_id}${KEY_SEP}${date}${KEY_SEP}${event.country}${KEY_SEP}${event.city}`;
    geoMap.set(geoKey, (geoMap.get(geoKey) || 0) + weight);

    // Referrer aggregation
    const referrerDomain = extractReferrerDomain(event.referrer);
    const referrerKey = `${event.link_id}${KEY_SEP}${date}${KEY_SEP}${referrerDomain}`;
    referrerMap.set(referrerKey, (referrerMap.get(referrerKey) || 0) + weight);

    // Device aggregation
    const deviceKey = `${event.link_id}${KEY_SEP}${date}${KEY_SEP}${event.device_type || 'unknown'}${KEY_SEP}${event.browser || 'unknown'}${KEY_SEP}${event.os || 'unknown'}`;
    if (!deviceMap.has(deviceKey)) {
      deviceMap.set(deviceKey, { clicks: 0, uniqueIPs: new Set() });
    }
    const device = deviceMap.get(deviceKey)!;
    device.clicks += weight;
    device.uniqueIPs.add(event.ip_address);

    // UTM aggregation
    if (event.utm_source || event.utm_medium || event.utm_campaign) {
      const utmKey = `${event.link_id}${KEY_SEP}${date}${KEY_SEP}${event.utm_source || ''}${KEY_SEP}${event.utm_medium || ''}${KEY_SEP}${event.utm_campaign || ''}`;
      if (!utmMap.has(utmKey)) {
        utmMap.set(utmKey, { clicks: 0, uniqueIPs: new Set() });
      }
      const utm = utmMap.get(utmKey)!;
      utm.clicks += weight;
      utm.uniqueIPs.add(event.ip_address);
    }

    // Custom params aggregation
    if (event.custom_param1) {
      const paramKey = `${event.link_id}${KEY_SEP}${date}${KEY_SEP}custom_param1${KEY_SEP}${event.custom_param1}`;
      if (!customParamMap.has(paramKey)) {
        customParamMap.set(paramKey, { clicks: 0, uniqueIPs: new Set() });
      }
      const param = customParamMap.get(paramKey)!;
      param.clicks += weight;
      param.uniqueIPs.add(event.ip_address);
    }
    if (event.custom_param2) {
      const paramKey = `${event.link_id}${KEY_SEP}${date}${KEY_SEP}custom_param2${KEY_SEP}${event.custom_param2}`;
      if (!customParamMap.has(paramKey)) {
        customParamMap.set(paramKey, { clicks: 0, uniqueIPs: new Set() });
      }
      const param = customParamMap.get(paramKey)!;
      param.clicks += weight;
      param.uniqueIPs.add(event.ip_address);
    }
    if (event.custom_param3) {
      const paramKey = `${event.link_id}${KEY_SEP}${date}${KEY_SEP}custom_param3${KEY_SEP}${event.custom_param3}`;
      if (!customParamMap.has(paramKey)) {
        customParamMap.set(paramKey, { clicks: 0, uniqueIPs: new Set() });
      }
      const param = customParamMap.get(paramKey)!;
      param.clicks += weight;
      param.uniqueIPs.add(event.ip_address);
    }
  }

  // OPTIMIZATION: Use batched writes instead of sequential awaits
  const BATCH_SIZE = 500; // D1 limit is 1000, use 500 for safety
  const allStatements: any[] = [];

  // Prepare daily analytics statements
  for (const [key, data] of dailyMap.entries()) {
    const [linkId, date] = key.split(KEY_SEP);
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
  // NOTE: bind '' (not null) for nullable dimension columns so the UNIQUE
  // constraints dedupe on re-aggregation (SQLite treats NULLs as distinct, so
  // ON CONFLICT never fires for null dimensions -> duplicate rows).
  for (const [key, clicks] of geoMap.entries()) {
    const [linkId, date, country, city] = key.split(KEY_SEP);
    const id = generateId('analytics_geo');
    const now = Date.now();
    allStatements.push(
      env.DB.prepare(
        `INSERT INTO analytics_geo (id, link_id, country, city, date, clicks)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(link_id, country, city, date) DO UPDATE SET
           clicks = excluded.clicks`
      ).bind(id, linkId, country || '', city || '', date, clicks)
    );
  }

  // Prepare referrer analytics statements
  for (const [key, clicks] of referrerMap.entries()) {
    const [linkId, date, referrerDomain] = key.split(KEY_SEP);
    const id = generateId('analytics_referrer');
    const now = Date.now();
    allStatements.push(
      env.DB.prepare(
        `INSERT INTO analytics_referrers (id, link_id, referrer_domain, date, clicks)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(link_id, referrer_domain, date) DO UPDATE SET
           clicks = excluded.clicks`
      ).bind(id, linkId, referrerDomain || '', date, clicks)
    );
  }

  // Prepare device analytics statements
  for (const [key, data] of deviceMap.entries()) {
    const [linkId, date, deviceType, browser, os] = key.split(KEY_SEP);
    const id = generateId('analytics_device');
    const now = Date.now();
    allStatements.push(
      env.DB.prepare(
        `INSERT INTO analytics_devices (id, link_id, device_type, browser, os, date, clicks, unique_visitors, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(link_id, device_type, browser, os, date) DO UPDATE SET
           clicks = excluded.clicks,
           unique_visitors = excluded.unique_visitors`
      ).bind(id, linkId, deviceType || '', browser || '', os || '', date, data.clicks, data.uniqueIPs.size, now)
    );
  }

  // Prepare UTM analytics statements
  for (const [key, data] of utmMap.entries()) {
    const [linkId, date, utmSource, utmMedium, utmCampaign] = key.split(KEY_SEP);
    const id = generateId('analytics_utm');
    const now = Date.now();
    allStatements.push(
      env.DB.prepare(
        `INSERT INTO analytics_utm (id, link_id, utm_source, utm_medium, utm_campaign, date, clicks, unique_visitors, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(link_id, utm_source, utm_medium, utm_campaign, date) DO UPDATE SET
           clicks = excluded.clicks,
           unique_visitors = excluded.unique_visitors`
      ).bind(id, linkId, utmSource || '', utmMedium || '', utmCampaign || '', date, data.clicks, data.uniqueIPs.size, now)
    );
  }

  // Prepare custom param analytics statements
  for (const [key, data] of customParamMap.entries()) {
    const [linkId, date, paramName, paramValue] = key.split(KEY_SEP);
    const id = generateId('analytics_custom_param');
    const now = Date.now();
    allStatements.push(
      env.DB.prepare(
        `INSERT INTO analytics_custom_params (id, link_id, param_name, param_value, date, clicks, unique_visitors, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(link_id, param_name, param_value, date) DO UPDATE SET
           clicks = excluded.clicks,
           unique_visitors = excluded.unique_visitors`
      ).bind(id, linkId, paramName, paramValue || '', date, data.clicks, data.uniqueIPs.size, now)
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
    const [linkId] = key.split(KEY_SEP);
    if (!linkUniqueVisitors.has(linkId)) {
      linkUniqueVisitors.set(linkId, new Set());
    }
    const linkIPs = linkUniqueVisitors.get(linkId)!;
    data.uniqueIPs.forEach(ip => linkIPs.add(ip));
  }

  // Batch update unique visitors.
  // links.unique_visitors is a LIFETIME metric; this aggregation only sees one
  // date's events, so we take MAX(existing, thisDay) instead of overwriting -
  // otherwise a single day's count would clobber the accumulated lifetime value.
  const updateStatements: any[] = [];
  for (const [linkId, uniqueIPs] of linkUniqueVisitors.entries()) {
    updateStatements.push(
      env.DB.prepare(`UPDATE links SET unique_visitors = MAX(COALESCE(unique_visitors, 0), ?) WHERE id = ?`)
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
 * Maximum number of dates aggregated in a single cron run (catch-up cap).
 * Bounds the work per invocation so a long backlog cannot exceed the Worker
 * CPU/wall-clock limit; remaining dates are picked up on subsequent runs.
 */
export const MAX_AGGREGATION_DAYS_PER_RUN = 30;

/**
 * Pure: the newest date eligible for aggregation right now — exactly
 * `thresholdDays` old (UTC). This is the date the daily cron targets.
 */
export function getAggregationTargetDate(thresholdDays: number, now: Date = new Date()): string {
  const target = new Date(now);
  target.setUTCHours(0, 0, 0, 0);
  target.setUTCDate(target.getUTCDate() - thresholdDays);
  return target.toISOString().slice(0, 10);
}

/**
 * Pure: given the last date already aggregated into D1, compute the ordered
 * list of dates the cron should aggregate now (catch-up). Runs from the day
 * after `lastAggregatedDate` up to and including the target date, capped at
 * `maxDays`. If nothing has been aggregated yet, only the target date is
 * returned (avoids a blind full-retention backfill). Returns [] when already
 * caught up.
 */
export function getDatesToAggregate(
  lastAggregatedDate: string | null,
  thresholdDays: number,
  maxDays: number = MAX_AGGREGATION_DAYS_PER_RUN,
  now: Date = new Date()
): string[] {
  const targetMs = new Date(getAggregationTargetDate(thresholdDays, now) + 'T00:00:00Z').getTime();

  let startMs: number;
  if (lastAggregatedDate) {
    const last = new Date(lastAggregatedDate + 'T00:00:00Z');
    last.setUTCDate(last.getUTCDate() + 1); // day after last aggregated
    startMs = last.getTime();
  } else {
    startMs = targetMs; // first ever run: just do the target date
  }

  if (startMs > targetMs) {
    return []; // already caught up
  }

  const dates: string[] = [];
  const cursor = new Date(startMs);
  while (cursor.getTime() <= targetMs && dates.length < maxDays) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Aggregate data up to threshold days ago, with catch-up for missed cron runs.
 * This should be called daily via cron trigger.
 *
 * It determines the last date already aggregated into D1 and aggregates every
 * missing date forward up to the target (exactly `thresholdDays` old), bounded
 * to MAX_AGGREGATION_DAYS_PER_RUN per invocation. This recovers from a missed
 * midnight instead of permanently losing that date.
 */
export async function aggregateYesterday(env: Env): Promise<{
  processed: number;
  errors: number;
  skipped: boolean;
}> {
  // Get the threshold setting to determine which dates to aggregate
  const { getAnalyticsThresholdsOrDefault } = await import('../db/settings');
  const thresholds = await getAnalyticsThresholdsOrDefault(env);
  const thresholdDays = thresholds.threshold_days;

  const lastAggregated = await getLastAggregatedDate(env);
  const dates = getDatesToAggregate(lastAggregated, thresholdDays);

  if (dates.length === 0) {
    // Already caught up — nothing eligible to aggregate today.
    return { processed: 0, errors: 0, skipped: true };
  }

  let processed = 0;
  let errors = 0;
  let allSkipped = true;

  for (const dateStr of dates) {
    const result = await aggregateAnalyticsForDate(env, dateStr);
    processed += result.processed;
    errors += result.errors;
    if (!result.skipped) {
      allSkipped = false;
    }
    // DEBUG: console.log(`[AGGREGATION] Date ${dateStr} (target window) processed: ${result.processed}, errors: ${result.errors}, skipped: ${result.skipped}`);
  }

  return { processed, errors, skipped: allSkipped };
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


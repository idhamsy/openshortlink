/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Database operations for system settings

import type { Env, StatusCheckSettings, StatusCheckFrequency } from '../types';

// Helper function to migrate old frequency format to new format
function migrateFrequency(oldFrequency: string | StatusCheckFrequency): StatusCheckFrequency {
  // If already in new format, return as is
  if (typeof oldFrequency === 'object' && 'value' in oldFrequency && 'unit' in oldFrequency) {
    return oldFrequency;
  }
  
  // Migrate old string format
  if (oldFrequency === '2_weeks') {
    return { value: 2, unit: 'weeks' };
  } else if (oldFrequency === '1_month') {
    return { value: 30, unit: 'days' };
  }
  
  // Default fallback
  return { value: 14, unit: 'days' };
}

// Get status check frequency setting
export async function getStatusCheckFrequency(env: Env): Promise<StatusCheckSettings | null> {
  const result = await env.DB.prepare(
    `SELECT value, updated_at, updated_by FROM settings WHERE key = ? AND domain_id IS NULL`
  )
    .bind('status_check_frequency')
    .first<{ value: string; updated_at: number; updated_by?: string }>();

  if (!result) return null;

  try {
    const parsed = JSON.parse(result.value) as any;
    
    // Migrate old format if needed
    const frequency = migrateFrequency(parsed.frequency);
    
    // Ensure batch_size exists (migration support)
    const batch_size = parsed.batch_size ?? 100;
    
    return {
      frequency,
      enabled: parsed.enabled ?? true,
      check_top_100_daily: parsed.check_top_100_daily ?? false,
      batch_size,
      last_updated_at: result.updated_at,
      last_updated_by: result.updated_by || undefined,
    };
  } catch {
    return null;
  }
}

// Set status check frequency setting
export async function setStatusCheckFrequency(
  env: Env,
  frequency: StatusCheckFrequency,
  enabled: boolean,
  checkTop100Daily: boolean,
  batchSize: number,
  userId: string
): Promise<void> {
  const now = Date.now();
  const value = JSON.stringify({ 
    frequency, 
    enabled, 
    check_top_100_daily: checkTop100Daily,
    batch_size: batchSize
  });

  await env.DB.prepare(
    `INSERT INTO settings (key, value, domain_id, updated_at, updated_by)
     VALUES (?, ?, NULL, ?, ?)
     ON CONFLICT(key) WHERE domain_id IS NULL
     DO UPDATE SET value = ?, updated_at = ?, updated_by = ?`
  )
    .bind('status_check_frequency', value, now, userId, value, now, userId)
    .run();
}

// Get default frequency (if not set, default to 2 weeks)
export async function getStatusCheckFrequencyOrDefault(env: Env): Promise<StatusCheckSettings> {
  const setting = await getStatusCheckFrequency(env);
  if (setting) return setting;

  return {
    frequency: { value: 14, unit: 'days' },
    enabled: true,
    check_top_100_daily: false,
    batch_size: 100,
    last_updated_at: Date.now(),
  };
}

// Analytics Aggregation Settings

export interface AnalyticsAggregationSettings {
  enabled: boolean;
  last_updated_at: number;
  last_updated_by?: string;
}

export interface AnalyticsThresholds {
  threshold_days: number; // Use Analytics Engine for data < this many days old, D1 for data >= this many days old
  last_updated_at: number;
  last_updated_by?: string;
}

// Get analytics aggregation enabled setting
export async function getAnalyticsAggregationEnabled(env: Env): Promise<AnalyticsAggregationSettings | null> {
  const result = await env.DB.prepare(
    `SELECT value, updated_at, updated_by FROM settings WHERE key = ? AND domain_id IS NULL`
  )
    .bind('analytics_aggregation_enabled')
    .first<{ value: string; updated_at: number; updated_by?: string }>();

  if (!result) return null;

  try {
    const parsed = JSON.parse(result.value) as { enabled: boolean };
    return {
      enabled: parsed.enabled ?? false,
      last_updated_at: result.updated_at,
      last_updated_by: result.updated_by || undefined,
    };
  } catch {
    return null;
  }
}

// Get analytics aggregation enabled setting with default
export async function getAnalyticsAggregationEnabledOrDefault(env: Env): Promise<AnalyticsAggregationSettings> {
  // Check environment variable first
  if (env.ANALYTICS_AGGREGATION_ENABLED !== undefined) {
    return {
      enabled: env.ANALYTICS_AGGREGATION_ENABLED === 'true',
      last_updated_at: Date.now(),
    };
  }

  // Check database setting
  const setting = await getAnalyticsAggregationEnabled(env);
  if (setting) return setting;

  // Default: disabled
  return {
    enabled: false,
    last_updated_at: Date.now(),
  };
}

// Set analytics aggregation enabled setting
export async function setAnalyticsAggregationEnabled(
  env: Env,
  enabled: boolean,
  userId: string
): Promise<void> {
  const now = Date.now();
  const value = JSON.stringify({ enabled });

  await env.DB.prepare(
    `INSERT INTO settings (key, value, domain_id, updated_at, updated_by)
     VALUES (?, ?, NULL, ?, ?)
     ON CONFLICT(key) WHERE domain_id IS NULL
     DO UPDATE SET value = ?, updated_at = ?, updated_by = ?`
  )
    .bind('analytics_aggregation_enabled', value, now, userId, value, now, userId)
    .run();
}

// Get analytics thresholds
export async function getAnalyticsThresholds(env: Env): Promise<AnalyticsThresholds | null> {
  const result = await env.DB.prepare(
    `SELECT value, updated_at, updated_by FROM settings WHERE key = ? AND domain_id IS NULL`
  )
    .bind('analytics_thresholds')
    .first<{ value: string; updated_at: number; updated_by?: string }>();

  if (!result) return null;

  try {
    const parsed = JSON.parse(result.value) as {
      threshold_days?: number;
      // Support migration from old format
      engine_threshold_days?: number;
      aggregation_threshold_days?: number;
    };
    // Migrate from old format if needed
    // Default: 83 days (7-day buffer before Analytics Engine 90-day retention expires)
    const thresholdDays = parsed.threshold_days ?? 
      parsed.aggregation_threshold_days ?? 
      parsed.engine_threshold_days ?? 
      83;
    return {
      threshold_days: thresholdDays,
      last_updated_at: result.updated_at,
      last_updated_by: result.updated_by || undefined,
    };
  } catch {
    return null;
  }
}

// Get analytics thresholds with defaults
export async function getAnalyticsThresholdsOrDefault(env: Env): Promise<AnalyticsThresholds> {
  // Check environment variables first (support both old and new format)
  // Default: 83 days (7-day buffer before Analytics Engine 90-day retention expires)
  const thresholdFromEnv = env.ANALYTICS_AGGREGATION_THRESHOLD_DAYS
    ? parseInt(env.ANALYTICS_AGGREGATION_THRESHOLD_DAYS, 10)
    : (env.ANALYTICS_ENGINE_THRESHOLD_DAYS
        ? parseInt(env.ANALYTICS_ENGINE_THRESHOLD_DAYS, 10)
        : 83);

  // Check database setting
  const setting = await getAnalyticsThresholds(env);
  if (setting) {
    return setting;
  }

  // Return defaults
  return {
    threshold_days: thresholdFromEnv,
    last_updated_at: Date.now(),
  };
}

// Set analytics thresholds
export async function setAnalyticsThresholds(
  env: Env,
  thresholdDays: number,
  userId: string
): Promise<void> {
  const now = Date.now();
  const value = JSON.stringify({
    threshold_days: thresholdDays,
  });

  await env.DB.prepare(
    `INSERT INTO settings (key, value, domain_id, updated_at, updated_by)
     VALUES (?, ?, NULL, ?, ?)
     ON CONFLICT(key) DO UPDATE SET 
       value = excluded.value,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by
     WHERE domain_id IS NULL`
  )
    .bind('analytics_thresholds', value, now, userId)
    .run();
}


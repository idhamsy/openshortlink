/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Analytics service for tracking clicks

import type { ClickEvent, Env } from '../types';
import { isBot } from '../utils/bots';

export async function trackClick(env: Env, event: ClickEvent): Promise<void> {
  // Verify Analytics Engine binding exists
  if (!env.ANALYTICS) {
    const error = new Error('Analytics Engine binding (ANALYTICS) is not configured');
    console.error('[ANALYTICS ERROR]', error.message);
    throw error;
  }

  // Check for bots
  if (isBot(event.user_agent)) {
    // DEBUG: console.log('[ANALYTICS] Bot detected, skipping analytics write', {
    //   user_agent: event.user_agent,
    //   link_id: event.link_id
    // });
    return; // Skip tracking for bots
  }

  // Strip sensitive query parameters
  const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'access_token'];

  const sanitizeUrl = (urlStr?: string): string => {
    if (!urlStr) return '';
    try {
      const url = new URL(urlStr);
      let changed = false;
      for (const key of sensitiveKeys) {
        // Check exact match or case-insensitive match if needed? 
        // Usually params are case sensitive, but let's stick to exact match for now based on list
        // Iterate over all params to check for partial matches or case insensitivity if requested?
        // User request said: "Define a list of sensitive keys... Iterate through search parameters... delete any that match"
        // We'll do exact match against the list for safety and simplicity first.
        if (url.searchParams.has(key)) {
          url.searchParams.delete(key);
          changed = true;
        }
      }
      return changed ? url.toString() : urlStr;
    } catch {
      return urlStr;
    }
  };

  event.destination_url = sanitizeUrl(event.destination_url);
  event.referrer = sanitizeUrl(event.referrer);

  try {
    // Write to Analytics Engine (non-blocking)
    // Blob order (20 max): link_id, domain, slug, destination_url, country, city, user_agent, referrer, 
    // ip_address, device_type, browser, os, utm_source, utm_medium, utm_campaign, gclid, fbclid,
    // custom_param1, custom_param2, custom_param3
    await env.ANALYTICS.writeDataPoint({
      blobs: [
        event.link_id,
        event.domain,
        event.slug,
        event.destination_url,
        event.country,
        event.city,
        event.user_agent,
        event.referrer,
        event.ip_address,
        event.device_type,
        event.browser,
        event.os,
        event.utm_source || '',
        event.utm_medium || '',
        event.utm_campaign || '',
        event.gclid || '',
        event.fbclid || '',
        event.custom_param1 || '',
        event.custom_param2 || '',
        event.custom_param3 || '',
      ],
      // Analytics Engine expects timestamps in seconds (Unix epoch), not milliseconds
      doubles: [Math.floor(event.timestamp / 1000)],
      indexes: [event.link_id],
    });

    // DEBUG: Always log success to verify writes are happening
    // console.log('[ANALYTICS WRITE]', {
    //   link_id: event.link_id,
    //   timestamp: Math.floor(event.timestamp / 1000),
    //   timestamp_ms: event.timestamp,
    //   timestamp_iso: new Date(event.timestamp).toISOString(),
    //   domain: event.domain,
    //   slug: event.slug,
    // });
  } catch (error) {
    // Enhanced error logging with context
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      link_id: event.link_id,
      domain: event.domain,
      slug: event.slug,
      timestamp: event.timestamp,
      error_type: error instanceof Error ? error.constructor.name : typeof error,
    };

    console.error('[ANALYTICS ERROR] Failed to write analytics data point:', errorDetails);
    console.error('[ANALYTICS ERROR] Full error:', error);

    // Do not re-throw, just log. We don't want analytics failures to crash the request
    // or cause unhandled promise rejections in waitUntil
  }
}

export function parseUserAgent(userAgent: string): {
  device_type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
} {
  const ua = userAgent.toLowerCase();

  // Detect device type
  let device_type: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (ua.includes('mobile') || ua.includes('android')) {
    device_type = 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    device_type = 'tablet';
  }

  // Detect browser
  let browser = 'unknown';
  if (ua.includes('chrome')) browser = 'chrome';
  else if (ua.includes('firefox')) browser = 'firefox';
  else if (ua.includes('safari')) browser = 'safari';
  else if (ua.includes('edge')) browser = 'edge';
  else if (ua.includes('opera')) browser = 'opera';

  // Detect OS
  let os = 'unknown';
  if (ua.includes('windows')) os = 'windows';
  else if (ua.includes('mac')) os = 'macos';
  else if (ua.includes('linux')) os = 'linux';
  else if (ua.includes('android')) os = 'android';
  else if (ua.includes('ios')) os = 'ios';

  return { device_type, browser, os };
}

export function extractUtmParams(url: URL): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  gclid?: string;
  fbclid?: string;
  msclkid?: string;
  ttclid?: string;
  li_fat_id?: string;
  twclid?: string;
  custom_param1?: string;
  custom_param2?: string;
  custom_param3?: string;
} {
  return {
    utm_source: url.searchParams.get('utm_source') || undefined,
    utm_medium: url.searchParams.get('utm_medium') || undefined,
    utm_campaign: url.searchParams.get('utm_campaign') || undefined,
    gclid: url.searchParams.get('gclid') || undefined,
    fbclid: url.searchParams.get('fbclid') || undefined,
    msclkid: url.searchParams.get('msclkid') || undefined,
    ttclid: url.searchParams.get('ttclid') || undefined,
    li_fat_id: url.searchParams.get('li_fat_id') || undefined,
    twclid: url.searchParams.get('twclid') || undefined,
    custom_param1: url.searchParams.get('custom_param1') || undefined,
    custom_param2: url.searchParams.get('custom_param2') || undefined,
    custom_param3: url.searchParams.get('custom_param3') || undefined,
  };
}

export function hashIpAddress(ip: string): string {
  // Simple hash for privacy (in production, use proper hashing)
  // This is a placeholder - implement proper hashing
  // Use base64 encoding available in Workers runtime
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  // Simple hash - in production use crypto.subtle
  const bytes = Array.from(data);
  return bytes
    .map((b: number) => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 16);
}

/**
 * Extract domain from referrer URL
 * Returns 'direct' for empty referrers, 'unknown' for invalid URLs
 */
export function extractReferrerDomain(referrer: string): string {
  if (!referrer || referrer.trim() === '') {
    return 'direct';
  }

  try {
    const url = new URL(referrer);
    const hostname = url.hostname.toLowerCase();

    // Remove www. prefix
    return hostname.replace(/^www\./, '');
  } catch (error) {
    // Invalid URL
    return 'unknown';
  }
}

/**
 * Categorize referrer domain
 */
export function categorizeReferrer(referrerDomain: string): 'social' | 'search' | 'direct' | 'other' {
  if (referrerDomain === 'direct') {
    return 'direct';
  }

  const socialDomains = [
    'facebook.com', 'fb.com', 'instagram.com', 'twitter.com', 'x.com',
    'linkedin.com', 'pinterest.com', 'reddit.com', 'tiktok.com',
    'youtube.com', 'snapchat.com', 'whatsapp.com'
  ];

  const searchDomains = [
    'google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com',
    'baidu.com', 'yandex.com', 'ask.com'
  ];

  if (socialDomains.some(domain => referrerDomain.includes(domain))) {
    return 'social';
  }

  if (searchDomains.some(domain => referrerDomain.includes(domain))) {
    return 'search';
  }

  return 'other';
}

/**
 * Analytics Engine Query Helpers
 * 
 * Note: Cloudflare Analytics Engine is write-only. For querying, we use:
 * 1. Aggregated data in D1 (via analyticsAggregation service)
 * 2. Cloudflare GraphQL Analytics API (for real-time queries - requires API token)
 * 
 * These functions provide the data structure and helpers for working with analytics data.
 */

export interface TimeSeriesDataPoint {
  date: string;
  clicks: number;
  unique_visitors: number;
}

export interface GeographyDataPoint {
  country: string;
  city: string | null;
  clicks: number;
  unique_visitors: number;
}

export interface ReferrerDataPoint {
  referrer_domain: string;
  clicks: number;
  unique_visitors: number;
  category: 'social' | 'search' | 'direct' | 'other';
}

export interface DeviceDataPoint {
  device_type: string;
  clicks: number;
  unique_visitors: number;
}

export interface BrowserDataPoint {
  browser: string;
  clicks: number;
  unique_visitors: number;
}

export interface OSDataPoint {
  os: string;
  clicks: number;
  unique_visitors: number;
}

export interface UtmCampaignDataPoint {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  clicks: number;
  unique_visitors: number;
}

/**
 * Format date for grouping
 */
export function formatDateForGrouping(timestamp: number, groupBy: 'hour' | 'day' | 'week' | 'month'): string {
  const date = new Date(timestamp);

  if (groupBy === 'hour') {
    return date.toISOString().slice(0, 13) + ':00:00Z';
  }

  if (groupBy === 'day') {
    return date.toISOString().slice(0, 10);
  }

  if (groupBy === 'week') {
    // Get Monday of the week
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    return monday.toISOString().slice(0, 10);
  }

  if (groupBy === 'month') {
    return date.toISOString().slice(0, 7);
  }

  return date.toISOString().slice(0, 10);
}

/**
 * Calculate growth percentage
 */
export function calculateGrowth(current: number, previous: number): {
  percentage: number;
  trend: 'up' | 'down' | 'stable';
} {
  if (previous === 0) {
    return { percentage: current > 0 ? 100 : 0, trend: current > 0 ? 'up' : 'stable' };
  }

  const percentage = ((current - previous) / previous) * 100;
  const trend = percentage > 0.1 ? 'up' : percentage < -0.1 ? 'down' : 'stable';

  return { percentage: Math.round(percentage * 100) / 100, trend };
}


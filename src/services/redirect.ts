/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Link redirection service

import type { Env, Link, CachedLink, Domain } from '../types';
import { getCachedLink, setCachedLink } from './cache';
import { getLinkBySlug, incrementClickCount } from '../db/links';
import { getGeoRedirects, getDeviceRedirects } from '../db/linkRedirects';
import { trackClick, parseUserAgent, extractUtmParams, hashIpAddress, formatDateForGrouping, extractReferrerDomain } from './analytics';

/**
 * Merges query parameters from the request URL into the destination URL.
 * Request parameters override destination parameters if there are duplicates.
 * 
 * @param destinationUrl - The destination URL to merge parameters into
 * @param requestUrl - The request URL containing parameters to merge
 * @returns The destination URL with merged query parameters
 */
function mergeQueryParams(destinationUrl: string, requestUrl: URL): string {
  try {
    // Parse the destination URL
    const destUrl = new URL(destinationUrl);
    const requestParams = requestUrl.searchParams;

    // If there are no request parameters, return the destination URL as-is
    if (requestParams.toString().length === 0) {
      return destinationUrl;
    }

    // Merge parameters: request parameters override destination parameters
    requestParams.forEach((value, key) => {
      destUrl.searchParams.set(key, value);
    });

    return destUrl.toString();
  } catch (error) {
    // If destination URL is invalid or can't be parsed, fall back to original
    // This handles edge cases like relative URLs or malformed URLs
    console.error('Failed to merge query parameters:', error);
    return destinationUrl;
  }
}

export async function handleRedirect(
  env: Env,
  request: Request,
  domain: Domain, // Accept domain object instead of just domain name
  slug: string,
  executionCtx?: ExecutionContext,
  matchedRoute?: string // New optional parameter for strict routing
): Promise<Response> {
  // DEBUG: Log IMMEDIATELY at the very start - this should always appear
  // console.log('[REDIRECT] ====== handleRedirect START ======');
  // console.log('[REDIRECT] handleRedirect called:', { domain: domain.domain_name, slug, hasExecutionCtx: !!executionCtx, matchedRoute });
  // console.log('[REDIRECT] Request URL:', request.url);

  // Check cache first
  let cached = await getCachedLink(env, domain.domain_name, slug);
  // DEBUG: console.log('[REDIRECT] Cache lookup result:', cached ? 'found' : 'not found');

  // Check for stale cache (missing required fields)
  // Instead of forcing full refresh, we'll patch the cache with missing fields
  let needsCacheRefresh = false;
  if (cached && (!('route' in cached) || !('link_id' in cached) || !('domain_routing_path' in cached))) {
    // DEBUG: console.log('[REDIRECT] ⚠️ Stale cache detected. Missing fields:', {
    //   route: !('route' in cached),
    //   link_id: !('link_id' in cached),
    //   domain_routing_path: !('domain_routing_path' in cached)
    // });
    needsCacheRefresh = true;
  }

  if (!cached || needsCacheRefresh) {
    // Domain is already passed as parameter, no need to fetch again
    if (domain.status !== 'active') {
      return new Response('Domain not found or inactive', { status: 404 });
    }

    // Get link from database (only if full cache miss OR need to refresh stale fields)
    const link = await getLinkBySlug(env, domain.id, slug);
    if (!link) {
      return new Response('Link not found', { status: 404 });
    }

    // Validate that link has an ID (critical for tracking)
    if (!link.id) {
      console.error('[REDIRECT] ❌ CRITICAL: Link fetched from DB but missing id field!', { domain: domain.domain_name, slug, link });
      return new Response('Internal server error: Link data invalid', { status: 500 });
    }

    // Check if link is expired
    // Fix: expires_at is in seconds, Date.now() is in milliseconds
    if (link.status === 'expired' || (link.expires_at && link.expires_at < Math.floor(Date.now() / 1000))) {
      return new Response('Link has expired', { status: 410 });
    }

    if (link.status !== 'active') {
      return new Response('Link is not available', { status: 403 });
    }

    // For stale cache refresh, only fetch redirects if not already in cache
    let geoRedirects: any[] = [];
    let deviceRedirects: any[] = [];
    
    if (needsCacheRefresh && cached) {
      // Patch mode: keep existing redirect data if present
      if (cached.geo_redirects) {
        // Convert object back to array for consistency
        geoRedirects = Object.entries(cached.geo_redirects).map(([country_code, destination_url]) => ({
          country_code,
          destination_url
        }));
      }
      if (cached.device_redirects) {
        deviceRedirects = [
          cached.device_redirects.desktop && { device_type: 'desktop', destination_url: cached.device_redirects.desktop },
          cached.device_redirects.mobile && { device_type: 'mobile', destination_url: cached.device_redirects.mobile },
          cached.device_redirects.tablet && { device_type: 'tablet', destination_url: cached.device_redirects.tablet },
        ].filter(Boolean) as any[];
      }
      // DEBUG: console.log('[REDIRECT] Patching stale cache - reusing existing redirect data');
    } else {
      // Full refresh: fetch from DB
      [geoRedirects, deviceRedirects] = await Promise.all([
        getGeoRedirects(env, link.id),
        getDeviceRedirects(env, link.id)
      ]);
    }

    // Build complete cache object (with all required fields)
    // Ensure link_id is always set (validated above, but double-check for safety)
    const linkId = link.id;
    if (!linkId) {
      console.error('[REDIRECT] ❌ CRITICAL: link.id is missing after validation!', { domain: domain.domain_name, slug });
      return new Response('Internal server error: Link data invalid', { status: 500 });
    }

    cached = {
      destination_url: link.destination_url,
      redirect_code: link.redirect_code,
      status: link.status,
      expires_at: link.expires_at,
      password_hash: link.password_hash,
      link_id: linkId, // Always include link_id (validated above)
      geo_redirects:
        geoRedirects.length > 0
          ? Object.fromEntries(geoRedirects.map((r: any) => [r.country_code, r.destination_url]))
          : undefined,
      device_redirects:
        deviceRedirects.length > 0
          ? {
            desktop: deviceRedirects.find((r: any) => r.device_type === 'desktop')?.destination_url,
            mobile: deviceRedirects.find((r: any) => r.device_type === 'mobile')?.destination_url,
            tablet: deviceRedirects.find((r: any) => r.device_type === 'tablet')?.destination_url,
          }
          : undefined,
      route: link.metadata ? (() => {
        try { return JSON.parse(link.metadata).route; } catch { return undefined; }
      })() : undefined,
      domain_routing_path: domain.routing_path,
    };
    await setCachedLink(env, domain.domain_name, slug, cached);
    // DEBUG: console.log('[REDIRECT] Cache updated with all required fields, link_id:', linkId);
  }

  // Check if link is expired (from cache)
  // Fix: expires_at is in seconds (Unix timestamp), Date.now() is in milliseconds
  // We need to compare seconds with seconds
  if (cached.expires_at && cached.expires_at < Math.floor(Date.now() / 1000)) {
    return new Response('Link has expired', { status: 410 });
  }

  // Strict Routing Check (performed AFTER cache retrieval to ensure it applies to cached links too)
  if (matchedRoute) {
    const linkRoute = cached.route;

    if (linkRoute) {
      // If link has a specific route assigned, it MUST match the request route
      if (linkRoute !== matchedRoute) {
        // DEBUG: console.log(`[REDIRECT] ❌ Strict routing mismatch (Cache/DB). Link route: ${linkRoute}, Request route: ${matchedRoute}`);
        return new Response('Not found (Strict Routing Mismatch)', { status: 404 });
      }
    } else {
      // Legacy link (no route assigned): allow if matched route is the domain's default routing_path
      // We need to check if matchedRoute is the default one.
      // For cached links, we might not have the domain object readily available to check routing_path
      // However, we can assume that if we are here, the domain was resolved in src/index.ts
      // But we don't have the domain object passed here, only domainName.

      // Let's fetch domain from cache/DB to get routing_path
      // Optimization: Check if we have it in cache first
      let domainRoutingPath = cached.domain_routing_path;

      if (!domainRoutingPath) {
        // Use domain from parameter instead of fetching again
        domainRoutingPath = domain.routing_path;
      }

      if (domainRoutingPath) {
        if (matchedRoute !== domainRoutingPath) {
          // DEBUG: console.log(`[REDIRECT] ❌ Strict routing mismatch (Legacy - Cache/DB). Domain default: ${domainRoutingPath}, Request route: ${matchedRoute}`);
          return new Response('Not found (Strict Routing Mismatch - Legacy)', { status: 404 });
        }
      }
    }
  }

  // Resolve destination URL based on geo/device
  const resolvedUrl = resolveDestinationUrl(cached, request);
  // DEBUG: console.log('[REDIRECT] Resolved destination URL:', resolvedUrl);

  // Extract query parameters from request and merge with destination URL
  const requestUrl = new URL(request.url);
  const finalDestinationUrl = mergeQueryParams(resolvedUrl, requestUrl);
  // DEBUG: console.log('[REDIRECT] Final destination URL:', finalDestinationUrl);

  // Track click (async, non-blocking) - use waitUntil to ensure it completes
  // Get link_id from cache (should always be present now after cache refresh)
  const linkId = cached.link_id;
  
  // Fail fast if link_id is missing - tracking is critical and cannot proceed without it
  if (!linkId) {
    console.error('[REDIRECT] ❌ CRITICAL: link_id missing from cache! This should never happen after cache refresh.', { 
      domain: domain.domain_name, 
      slug,
      cached: cached ? Object.keys(cached) : 'null',
      hasLinkId: cached ? 'link_id' in cached : false
    });
    // Return error response instead of silently continuing without tracking
    // This ensures we don't lose analytics data
    return new Response('Internal server error: Link tracking unavailable', { status: 500 });
  }

  // DEBUG: console.log('[REDIRECT] About to start tracking, linkId:', linkId, 'hasExecutionCtx:', !!executionCtx);

  // linkId is guaranteed to exist at this point
  // DEBUG: console.log('[REDIRECT] Starting click tracking with link_id:', linkId, 'executionCtx:', !!executionCtx);
  // Start tracking immediately (don't wait, but ensure it runs)
  const trackingPromise = trackClickAsync(env, request, domain.domain_name, slug, resolvedUrl, linkId);

  if (executionCtx) {
    // DEBUG: console.log('[REDIRECT] Using waitUntil for tracking - this will run after response');
    executionCtx.waitUntil(trackingPromise);
  } else {
    // DEBUG: console.warn('[REDIRECT] ⚠️ No execution context! Tracking may not complete');
    // Fallback: still track but log warning if no execution context
    trackingPromise.catch((error) => {
      console.error('[REDIRECT] Failed to track click (no execution context):', error);
    });
  }

  // DEBUG: Also log immediately to verify tracking started
  // console.log('[REDIRECT] Tracking promise created, redirecting now...');

  // DEBUG: console.log('[REDIRECT] Returning redirect response to:', finalDestinationUrl);

  // Create redirect response with cache control headers
  // We need to create a new Response because Response.redirect() returns an immutable response
  const redirectCode = cached.redirect_code as 301 | 302 | 307 | 308;

  // Determine cache headers based on redirect type
  // 301/308 are permanent → cache long (1 year)
  // 302/307 are temporary → cache short (1 hour)
  const isPermanent = redirectCode === 301 || redirectCode === 308;
  const cacheMaxAge = isPermanent ? 31536000 : 3600; // 1 year for permanent, 1 hour for temporary
  const cacheControl = isPermanent
    ? `public, max-age=${cacheMaxAge}, immutable`
    : `public, max-age=${cacheMaxAge}`;

  // Build headers
  const headers: HeadersInit = {
    'Location': finalDestinationUrl,
    'Cache-Control': cacheControl,
  };

  // Add Vary header if geo/device redirects exist (different users get different destinations)
  if (cached.geo_redirects || cached.device_redirects) {
    headers['Vary'] = 'Accept-Language, CF-IPCountry, User-Agent';
  }

  return new Response(null, {
    status: redirectCode,
    headers,
  });
}

/**
 * Resolves the destination URL based on geo and device redirects.
 * Priority: Geo redirect > Device redirect > Default URL
 */
function resolveDestinationUrl(cached: CachedLink, request: Request): string {
  // Extract country from Cloudflare headers
  const country = (request.headers.get('cf-ipcountry') || '').toUpperCase();

  // Extract device type from user-agent
  const userAgent = request.headers.get('user-agent') || '';
  const { device_type } = parseUserAgent(userAgent);

  // Priority 1: Geo redirect
  if (cached.geo_redirects && country && cached.geo_redirects[country]) {
    return cached.geo_redirects[country];
  }

  // Priority 2: Device redirect
  if (cached.device_redirects && cached.device_redirects[device_type]) {
    return cached.device_redirects[device_type];
  }

  // Priority 3: Default URL
  return cached.destination_url;
}

async function trackClickAsync(
  env: Env,
  request: Request,
  domain: string,
  slug: string,
  destinationUrl: string,
  linkId: string
): Promise<void> {
  try {
    // DEBUG: console.log('[ANALYTICS TRACK] Starting click tracking:', { domain, slug, linkId });

    // Extract metadata from request
    const url = new URL(request.url);
    const userAgent = request.headers.get('user-agent') || '';
    const referrer = request.headers.get('referer') || request.headers.get('referrer') || '';
    const cfCountry = request.headers.get('cf-ipcountry') || 'unknown';
    const cfCity = request.headers.get('cf-ipcity') || 'unknown';
    const ipAddress = request.headers.get('cf-connecting-ip') || 'unknown';

    const { device_type, browser, os } = parseUserAgent(userAgent);
    const {
      utm_source, utm_medium, utm_campaign,
      gclid, fbclid, msclkid, ttclid, li_fat_id, twclid,
      custom_param1, custom_param2, custom_param3
    } = extractUtmParams(url);

    const timestamp = Date.now();
    const hashedIp = hashIpAddress(ipAddress);
    const date = formatDateForGrouping(timestamp, 'day');
    const referrerDomain = extractReferrerDomain(referrer);

    // Track click to Analytics Engine only
    // Aggregation to D1 happens in background scheduled job for data ≥ 90 days old
    await trackClick(env, {
      timestamp,
      link_id: linkId,
      domain,
      slug,
      destination_url: destinationUrl,
      country: cfCountry,
      city: cfCity,
      user_agent: userAgent,
      referrer,
      ip_address: hashedIp,
      device_type,
      browser,
      os,
      utm_source,
      utm_medium,
      utm_campaign,
      gclid,
      fbclid,
      msclkid,
      ttclid,
      li_fat_id,
      twclid,
      custom_param1,
      custom_param2,
      custom_param3,
    });

    // Increment click count (async)
    await incrementClickCount(env, linkId);
  } catch (error) {
    // Enhanced error logging with full context
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      domain,
      slug,
      destination_url: destinationUrl,
      error_type: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
    };

    console.error('[ANALYTICS ERROR] Failed to track click:', errorDetails);
    console.error('[ANALYTICS ERROR] Full error:', error);

    // Re-throw to ensure waitUntil sees the error
    throw error;
  }
}

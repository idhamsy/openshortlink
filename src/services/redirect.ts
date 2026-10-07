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
import { buildCachedLink } from './linkService';
import { trackClick, parseUserAgent, extractUtmParams, hashIpAddress, formatDateForGrouping, extractReferrerDomain } from './analytics';
import { isBot } from '../utils/bots';
import { renderOgPreviewPage } from '../views/ogPreview';
import { renderPixelInterstitial, pixelInterstitialCsp, isHttpUrl, generateNonce } from '../views/pixelInterstitial';

/**
 * Merges query parameters from the request URL into the destination URL.
 * Owner-configured destination parameters win: a request param is only copied
 * over when the destination URL does NOT already define that key. This stops a
 * visitor from overriding owner-set params (e.g. utm_source) via the query string.
 *
 * @param destinationUrl - The destination URL to merge parameters into
 * @param requestUrl - The request URL containing parameters to merge
 * @returns The destination URL with merged query parameters
 */
export function mergeQueryParams(destinationUrl: string, requestUrl: URL): string {
  try {
    // Parse the destination URL
    const destUrl = new URL(destinationUrl);
    const requestParams = requestUrl.searchParams;

    // If there are no request parameters, return the destination URL as-is
    if (requestParams.toString().length === 0) {
      return destinationUrl;
    }

    // Merge parameters: only copy a request param when the destination does not
    // already define that key, so owner-configured params are never overridden.
    requestParams.forEach((value, key) => {
      if (!destUrl.searchParams.has(key)) {
        destUrl.searchParams.set(key, value);
      }
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

    // Always rebuild from the DB via the shared builder. We deliberately do NOT reuse
    // data from a stale cache entry (it may predate newer per-link features), and we do
    // NOT hand-build the object here: a second copy of the builder already drifted once
    // (og_meta was missing from it, so previews vanished after a cache eviction).
    cached = await buildCachedLink(env, link, domain);
    await setCachedLink(env, domain.domain_name, slug, cached);
  }

  // Check if link is expired (from cache)
  // Fix: expires_at is in seconds (Unix timestamp), Date.now() is in milliseconds
  // We need to compare seconds with seconds
  if (cached.expires_at && cached.expires_at < Math.floor(Date.now() / 1000)) {
    return new Response('Link has expired', { status: 410 });
  }

  // Check link status (from cache) — a disabled/archived link may still be cached
  // (the cache entry is rewritten, not deleted, on a status-changing PUT). Mirror the
  // cache-MISS path so non-active links stop redirecting instead of serving forever.
  if (cached.status !== 'active') {
    return new Response('Link is not available', { status: 403 });
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

  // Social crawler + OG meta configured -> serve a rich preview page instead of a bare
  // redirect. Done BEFORE click tracking + destination resolution so that crawler
  // preview fetches (often several per social share) are NOT counted as clicks.
  // Humans, and crawlers on links without og_meta, fall through to the normal redirect.
  const ogUserAgent = request.headers.get('user-agent') || '';
  if (cached.og_meta && isBot(ogUserAgent)) {
    // og:url is the SHORT link itself (query stripped) so the preview is attributed
    // to the short URL, not the destination — and the page does NOT auto-redirect,
    // so scrapers read our tags instead of following through to the destination.
    const shortUrl = new URL(request.url);
    shortUrl.search = '';
    return new Response(renderOgPreviewPage(cached.og_meta, shortUrl.toString()), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // The 200-preview-vs-301-redirect choice depends on the User-Agent (bot check),
        // so shared caches MUST key on it — otherwise a cached preview could be served
        // to a human, or a cached redirect to a crawler (cache poisoning).
        'Cache-Control': 'public, max-age=300',
        'Vary': 'User-Agent',
      },
    });
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

  // Pixels configured + a real human -> serve an interstitial that fires the pixels, then
  // JS-redirects. Bots skip it (no point firing pixels for a crawler). Only for http(s)
  // destinations: z.string().url() accepts javascript:/data:, which a 301 Location never
  // executes but location.replace() would — on this (possibly dashboard-shared) origin.
  if (cached.pixels && cached.pixels.length > 0 && !isBot(ogUserAgent) && isHttpUrl(finalDestinationUrl)) {
    const nonce = generateNonce();
    return new Response(renderPixelInterstitial(cached.pixels, finalDestinationUrl, nonce), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Per-visitor page; never cache it anywhere.
        'Cache-Control': 'private, no-store, max-age=0',
        // Own CSP: the default one (script-src 'self', connect-src 'self') would block the
        // pixel loaders and beacons. securityHeaders keeps a CSP the response already set.
        'Content-Security-Policy': pixelInterstitialCsp(nonce),
        'Vary': 'User-Agent',
      },
    });
  }

  // Create redirect response with cache control headers
  // We need to create a new Response because Response.redirect() returns an immutable response
  const redirectCode = cached.redirect_code as 301 | 302 | 307 | 308;

  // Determine cache headers based on redirect type
  // 301/308 are permanent → cache long (1 year)
  // 302/307 are temporary → cache short (1 hour)
  const isPermanent = redirectCode === 301 || redirectCode === 308;
  // Links that carry ANY per-visitor redirect rule (geo/city/os/device) must not be
  // frozen in the browser for a year: a rule/destination edit would never reach a
  // returning visitor, and the same cached Location could be replayed regardless of
  // the visitor's new geo/device. Cap those to a short max-age and drop `immutable`
  // so edits propagate. Rule-free links keep the long permanent-redirect cache.
  const hasRules = !!(cached.geo_redirects || cached.city_redirects || cached.os_redirects || cached.device_redirects);
  const cacheMaxAge = isPermanent
    ? (hasRules ? 300 : 31536000) // 5 min for rule-bearing permanent redirects, else 1 year
    : 3600; // 1 hour for temporary
  // Geo (country) and city redirects are resolved from request.cf, which cannot
  // participate in a Vary header — so a shared cache could replay one visitor's
  // geo-specific destination to visitors elsewhere. Mark those responses `private`
  // (browser-only). Device/OS redirects vary on User-Agent (which IS Vary-able),
  // so they can safely remain `public`.
  const geoVariant = !!(cached.geo_redirects || cached.city_redirects);
  const cacheScope = geoVariant ? 'private' : 'public';
  const cacheControl = (isPermanent && !hasRules)
    ? `${cacheScope}, max-age=${cacheMaxAge}, immutable`
    : `${cacheScope}, max-age=${cacheMaxAge}`;

  // Build headers
  const headers: HeadersInit = {
    'Location': finalDestinationUrl,
    'Cache-Control': cacheControl,
  };

  // Add Vary header if geo/device redirects exist (different users get different destinations)
  const varyHeader = buildVaryHeader(cached);
  if (varyHeader) {
    headers['Vary'] = varyHeader;
  }

  return new Response(null, {
    status: redirectCode,
    headers,
  });
}

/**
 * Extracts geo (country/city) for the visitor from the request.
 *
 * `request.cf` is populated by Cloudflare by default; the `cf-*` headers require
 * the "visitor location headers" Managed Transform, so we fall back to them.
 * Returns raw values (no case normalization) so analytics keeps original casing;
 * callers that match against rules normalize as needed.
 */
export function extractGeoFromRequest(request: Request): { country: string; city: string } {
  const cf = (request as { cf?: { city?: string; country?: string } }).cf;
  const country = cf?.country || request.headers.get('cf-ipcountry') || '';
  const city = cf?.city || request.headers.get('cf-ipcity') || '';
  return { country, city };
}

/**
 * Builds the Vary header value for a cached link, or undefined when no
 * location/device-dependent redirects exist. City redirects additionally
 * vary on CF-IPCity so cities don't share each other's cached destination.
 */
export function buildVaryHeader(cached: CachedLink): string | undefined {
  // og_meta / pixels included: crawlers and humans get different responses (200 preview vs
  // 301, or 301 vs 200 interstitial), so the redirect must vary on User-Agent to keep shared
  // caches from crossing them.
  if (!(cached.geo_redirects || cached.device_redirects || cached.city_redirects || cached.os_redirects || cached.og_meta || cached.pixels)) {
    return undefined;
  }
  const varyValues = ['Accept-Language', 'CF-IPCountry', 'User-Agent'];
  if (cached.city_redirects) {
    varyValues.push('CF-IPCity');
  }
  return varyValues.join(', ');
}

/**
 * Resolves the destination URL based on geo and device redirects.
 * Priority: City > Country > OS > Device > Default URL
 */
export function resolveDestinationUrl(cached: CachedLink, request: Request): string {
  // For RULE MATCHING trust ONLY Cloudflare-populated request.cf values — never the
  // client-supplied cf-ipcountry/cf-ipcity headers (which a visitor can forge to pick
  // which destination they are served). The header fallback in extractGeoFromRequest
  // stays for analytics logging only.
  const cf = (request as { cf?: { city?: string; country?: string } }).cf;
  const country = (cf?.country || '').toUpperCase();
  const city = (cf?.city || '').toLowerCase();

  // Extract device type and OS from user-agent
  const userAgent = request.headers.get('user-agent') || '';
  const { device_type, os } = parseUserAgent(userAgent);

  // Priority 1: City redirect (exact match, case-insensitive)
  if (cached.city_redirects && city) {
    for (const rule of cached.city_redirects) {
      if (city === rule.city_name.toLowerCase()) {
        return rule.destination_url;
      }
    }
  }

  // Priority 2: Geo (Country) redirect
  if (cached.geo_redirects && country && cached.geo_redirects[country]) {
    return cached.geo_redirects[country];
  }

  // Priority 3: OS redirect
  // Map detected OS to 'android' or 'ios' keys
  if (cached.os_redirects) {
    if (os === 'android' && cached.os_redirects.android) {
      return cached.os_redirects.android;
    }
    if (os === 'ios' && cached.os_redirects.ios) {
      return cached.os_redirects.ios;
    }
  }

  // Priority 4: Device redirect
  if (cached.device_redirects && cached.device_redirects[device_type]) {
    return cached.device_redirects[device_type];
  }

  // Priority 5: Default URL
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

    // Bots/crawlers must not count as clicks. trackClick already drops bots from
    // Analytics Engine, but incrementClickCount would still bump links.click_count —
    // gate the whole tracking path so the dashboard count matches analytics.
    if (isBot(userAgent)) {
      return;
    }

    const referrer = request.headers.get('referer') || request.headers.get('referrer') || '';
    const geo = extractGeoFromRequest(request);
    const cfCountry = geo.country || 'unknown';
    const cfCity = geo.city || 'unknown';
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
    // Aggregation to D1 happens in background scheduled job for data ≥ 90 days old.
    // trackClick and incrementClickCount are independent — run them concurrently.
    await Promise.all([
      trackClick(env, {
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
      }),
      // Increment click count (async)
      incrementClickCount(env, linkId),
    ]);
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

/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Domain validation service

import type { Env } from '../types';

export interface ValidationResult {
  valid: boolean;
  route: string;
  reason?: string;
  error?: string;
}

export interface DomainValidationResult {
  overall: 'valid' | 'invalid' | 'unknown';
  routes: ValidationResult[];
}

/**
 * Validates a single domain route by making HTTP request to verify it's configured in Cloudflare Workers
 * This actually tests if the route is accessible and handled by our Worker script
 */
export async function validateDomainRoute(
  env: Env,
  domain: string,
  route: string,
  currentRequestHostname?: string
): Promise<ValidationResult> {
  try {
    // Normalize domain name (remove trailing slash)
    const normalizedDomain = domain.replace(/\/+$/, '');

    // Check if we're validating the current domain (self-request)
    const isCurrentDomain = currentRequestHostname &&
      normalizedDomain.toLowerCase() === currentRequestHostname.toLowerCase();

    if (isCurrentDomain) {
      // For self-requests, we can't reliably test via HTTP (causes deadlocks)
      // But we know if it's in our DB and routes match, it should work
      // Since we're already running in this Worker, we can assume it's configured
      const { getDomainByRoutingPath } = await import('../db/domains');
      let routePath = route.replace(/\/?\*$/, '').replace(/\/$/, '');
      if (!routePath.startsWith('/')) {
        routePath = '/' + routePath;
      }
      const testPath = routePath + '/test';
      const matchedDomain = await getDomainByRoutingPath(env, normalizedDomain, testPath);

      if (matchedDomain) {
        return {
          valid: true,
          route,
          reason: 'Route is configured (self-domain validation)',
        };
      } else {
        return {
          valid: false,
          route,
          reason: 'Route pattern not found in database',
        };
      }
    }

    // For other domains, make HTTP request to verify
    let routePath = route.replace(/\/?\*$/, '').replace(/\/$/, '');
    if (!routePath.startsWith('/')) {
      routePath = '/' + routePath;
    }
    const testUrl = `https://${normalizedDomain}${routePath}/__validate__`;

    // Make HTTP request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'OpenShortLink-Validator/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        const data = JSON.parse(text) as any;

        if (data && data.script === 'openshortlink' && data.valid === true) {
          return {
            valid: true,
            route,
            reason: 'Route is configured and working',
          };
        } else {
          return {
            valid: false,
            route,
            reason: 'Route not handled by openshortlink script',
          };
        }
      } else {
        return {
          valid: false,
          route,
          reason: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        return {
          valid: false,
          route,
          error: 'Request timeout',
        };
      }

      throw fetchError;
    }
  } catch (error: any) {
    return {
      valid: false,
      route,
      error: error.message || 'Validation error',
    };
  }
}

/**
 * Validates all routes for a domain
 */
export async function validateDomain(
  env: Env,
  domain: string,
  routes: string[],
  currentRequestHostname?: string
): Promise<DomainValidationResult> {
  // Validate each route sequentially to avoid deadlock from concurrent self-requests
  const routeResults: ValidationResult[] = [];
  for (const route of routes) {
    const result = await validateDomainRoute(env, domain, route, currentRequestHostname);
    routeResults.push(result);
  }

  // Determine overall status
  const allValid = routeResults.every(r => r.valid);
  const anyValid = routeResults.some(r => r.valid);

  let overall: 'valid' | 'invalid' | 'unknown';

  if (allValid) {
    overall = 'valid';
  } else if (anyValid) {
    // Some routes valid, some not - still consider it partially valid
    overall = 'valid';
  } else {
    // Check if all errors are network errors (unknown status)
    const allNetworkErrors = routeResults.every(r => r.error !== undefined);
    overall = allNetworkErrors ? 'unknown' : 'invalid';
  }

  return {
    overall,
    routes: routeResults,
  };
}

/**
 * Cache validation results to avoid repeated requests
 * Key format: validation:v2:{domain}:{routes_hash}
 * Version bumped to v2 to invalidate old cache entries after fixing validation logic
 */
const VALIDATION_CACHE_TTL = 300; // 5 minutes
const VALIDATION_CACHE_VERSION = 'v2'; // Bump this to invalidate old cache

export async function validateDomainCached(
  env: Env,
  domain: string,
  routes: string[]
): Promise<DomainValidationResult> {
  // Create cache key from domain and routes (with version)
  const routesKey = routes.sort((a, b) => a.localeCompare(b)).join('|');
  const cacheKey = `validation:${VALIDATION_CACHE_VERSION}:${domain}:${routesKey}`;

  // Try to get cached result
  try {
    const cached = await env.CACHE.get(cacheKey, 'json');
    if (cached) {
      return cached as DomainValidationResult;
    }
  } catch (error) {
    // Cache read error, continue with validation
    console.error('Cache read error:', error);
  }

  // Perform validation
  const result = await validateDomain(env, domain, routes);

  // Store in cache
  try {
    await env.CACHE.put(cacheKey, JSON.stringify(result), {
      expirationTtl: VALIDATION_CACHE_TTL,
    });
  } catch (error) {
    // Cache write error, not critical
    console.error('Cache write error:', error);
  }

  return result;
}


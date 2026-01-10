/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Authentication middleware

import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env, ApiKeyContext, Variables } from '../types';
import { getSessionTokenFromRequest, getSession, type Session } from '../services/session';
import { getUserById } from '../db/users';
import { getUserDomainIds } from '../db/userDomains';
import { verifyApiKey } from '../utils/crypto';
import { getApiKeyByHash, listApiKeys, updateLastUsed } from '../db/apiKeys';

// Domain cache TTL (5 minutes) - matches session.ts
const DOMAIN_CACHE_TTL = 5 * 60;

// Failed auth rate limit: configurable via environment variables
// Default: 5 failures per 2 hours (7200 seconds) for production security
// Can be overridden in wrangler.toml for development/testing (e.g., 60 seconds)
const getFailedAuthLimit = (env: Env): number => {
  const parsed = parseInt(env.FAILED_AUTH_LIMIT || '5');
  return isNaN(parsed) ? 5 : parsed;
};

const getFailedAuthWindow = (env: Env): number => {
  const parsed = parseInt(env.FAILED_AUTH_WINDOW || '7200');
  return isNaN(parsed) ? 7200 : parsed; // Default 2 hours
};

// Rate limit data structure for fixed-window rate limiting
interface RateLimitData {
  firstFailure: number;  // Unix timestamp (seconds) of first failure in window
  count: number;         // Number of failures in current window
}

// Helper: Check if IP is rate limited due to too many auth failures
// Uses fixed-window rate limiting to prevent boundary attacks
async function checkAuthFailureRateLimit(env: Env, ip: string): Promise<boolean> {
  const window = getFailedAuthWindow(env);
  const limit = getFailedAuthLimit(env);
  const key = `auth_fail:${ip}`;
  const data = await env.CACHE.get(key);
  
  if (!data) return false;
  
  try {
    const parsed: RateLimitData = JSON.parse(data);
    const now = Math.floor(Date.now() / 1000);
    
    // If window has expired, not rate limited
    if (now - parsed.firstFailure > window) {
      return false;
    }
    
    // Check if count exceeds limit
    return parsed.count >= limit;
  } catch {
    return false;
  }
}

// Helper: Increment auth failure counter for IP
// Uses fixed-window rate limiting - tracks first failure timestamp
//
// IMPORTANT: Cloudflare KV Limitation
// ------------------------------------
// KV requires a minimum TTL of 60 seconds. We considered using a calculated
// `remainingTtl = window - elapsed_time` to prevent window extension, but this
// fails when elapsed_time > 0 because remainingTtl would be < 60 seconds.
//
// Trade-off: We use the full `window` TTL for each update, which means the
// rate limit window CAN extend if an attacker spaces requests. For example:
// - Failure at time 0s → expires at 60s
// - Failure at time 30s → expires at 90s (extended by 30s)
//
// This is acceptable because:
// 1. Most brute-force attacks are rapid-fire, not strategically spaced
// 2. Working rate limiting > perfect rate limiting
// 3. The extension is limited to `window` seconds maximum per request
async function trackAuthFailure(env: Env, ip: string): Promise<void> {
  const window = getFailedAuthWindow(env);
  const key = `auth_fail:${ip}`;
  const existing = await env.CACHE.get(key);
  const now = Math.floor(Date.now() / 1000);
  
  if (existing) {
    try {
      const data: RateLimitData = JSON.parse(existing);
      
      // If still within same window, increment count
      if (now - data.firstFailure < window) {
        // Use full window TTL - see comment above about KV 60s minimum TTL limitation
        await env.CACHE.put(key, JSON.stringify({
          firstFailure: data.firstFailure,
          count: data.count + 1
        }), { expirationTtl: window });
        return;
      }
    } catch {
      // Invalid data, start fresh
    }
  }
  
  // Start new window
  await env.CACHE.put(key, JSON.stringify({
    firstFailure: now,
    count: 1
  }), { expirationTtl: window });
}

// Helper: Get client IP from request
function getClientIp(c: Context<{ Bindings: Env; Variables: Variables }>): string | null {
  return c.req.header('cf-connecting-ip') || 
         c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
         null;
}

export async function authMiddleware(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const ip = getClientIp(c);
  
  // Reject requests without identifiable IP
  if (!ip) {
    throw new HTTPException(403, { message: 'Unable to identify client' });
  }
  
  // Check if IP is blocked due to too many failed auth attempts
  if (await checkAuthFailureRateLimit(c.env, ip)) {
    throw new HTTPException(429, { message: 'Too many failed authentication attempts. Please try again later.' });
  }

  // Get session token from request
  const token = getSessionTokenFromRequest(c.req.raw);
  
  if (!token) {
    // Don't track missing tokens as failures - legitimate users visit protected pages
    // before logging in (new visitors, expired sessions, cleared cookies)
    throw new HTTPException(401, { message: 'Authentication required' });
  }

  // Get session from cache
  const session = await getSession(c.env, token);
  
  if (!session) {
    // #3 FIX: Don't track expired sessions as failures
    // Expired sessions are natural, not brute-force attempts
    throw new HTTPException(401, { message: 'Invalid or expired session' });
  }

  // Get user from database to ensure user still exists
  const user = await getUserById(c.env, session.user_id);
  
  if (!user) {
    await trackAuthFailure(c.env, ip);
    throw new HTTPException(401, { message: 'User not found' });
  }

  // Check if cached domain access is valid
  const hasGlobalAccess = user.global_access === 1 || user.role === 'admin' || user.role === 'owner';
  const now = Math.floor(Date.now() / 1000);
  
  let accessibleDomainIds: string[] = [];
  let shouldRefreshCache = false;

  if (!hasGlobalAccess) {
    // Check if cache is valid
    const cacheValid = 
      session.accessible_domain_ids !== undefined &&
      session.permission_version !== undefined &&
      session.cached_at !== undefined &&
      session.permission_version === (user.permission_version || 0) &&
      (now - session.cached_at) < DOMAIN_CACHE_TTL;

    if (cacheValid) {
      // Use cached data (FAST PATH - no DB query)
      accessibleDomainIds = session.accessible_domain_ids ?? [];
    } else {
      // Cache is stale - refresh from database
      accessibleDomainIds = await getUserDomainIds(c.env, user.id);
      shouldRefreshCache = true;
    }
  }

  // Update session cache if it was refreshed
  if (shouldRefreshCache) {
    const updatedSession: Session = {
      ...session,
      accessible_domain_ids: accessibleDomainIds,
      global_access: hasGlobalAccess,
      permission_version: user.permission_version || 0,
      cached_at: now,
    };
    const accessKey = `session:${token}`;
    await c.env.CACHE.put(
      accessKey,
      JSON.stringify(updatedSession),
      { expirationTtl: 1 * 60 * 60 } // 1 hour
    );
  }
  
  // Store user info in context for use in routes
  c.set('user', {
    id: user.id,
    username: (user as { username?: string }).username || user.email,
    email: user.email,
    role: user.role,
    global_access: hasGlobalAccess,
    accessible_domain_ids: accessibleDomainIds,
  });
  c.set('session', session);
  
  await next();
}

export async function optionalAuth(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  // Optional authentication - doesn't fail if no auth
  const token = getSessionTokenFromRequest(c.req.raw);
  
  if (token) {
    const session = await getSession(c.env, token);
    if (session) {
      const user = await getUserById(c.env, session.user_id);
      if (user) {
        // Check if cached domain access is valid (same optimization as authMiddleware)
        const hasGlobalAccess = user.global_access === 1 || user.role === 'admin' || user.role === 'owner';
        const now = Math.floor(Date.now() / 1000);
        
        let accessibleDomainIds: string[] = [];
        let shouldRefreshCache = false;

        if (!hasGlobalAccess) {
          // Check if cache is valid
          const cacheValid = 
            session.accessible_domain_ids !== undefined &&
            session.permission_version !== undefined &&
            session.cached_at !== undefined &&
            session.permission_version === (user.permission_version || 0) &&
            (now - session.cached_at) < DOMAIN_CACHE_TTL;

          if (cacheValid) {
            // Use cached data (FAST PATH - no DB query)
            accessibleDomainIds = session.accessible_domain_ids ?? [];
          } else {
            // Cache is stale - refresh from database
            accessibleDomainIds = await getUserDomainIds(c.env, user.id);
            shouldRefreshCache = true;
          }
        }

        // Update session cache if it was refreshed
        if (shouldRefreshCache) {
          const updatedSession: Session = {
            ...session,
            accessible_domain_ids: accessibleDomainIds,
            global_access: hasGlobalAccess,
            permission_version: user.permission_version || 0,
            cached_at: now,
          };
          const accessKey = `session:${token}`;
          await c.env.CACHE.put(
            accessKey,
            JSON.stringify(updatedSession),
            { expirationTtl: 1 * 60 * 60 } // 1 hour
          );
        }
        
        c.set('user', {
          id: user.id,
          username: (user as { username?: string }).username || user.email,
          email: user.email,
          role: user.role,
          global_access: hasGlobalAccess,
          accessible_domain_ids: accessibleDomainIds,
        });
        c.set('session', session);
      }
    }
  }
  
  await next();
}

// API key authentication middleware
export async function apiKeyMiddleware(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const ip = getClientIp(c);
  
  // Reject requests without identifiable IP
  if (!ip) {
    throw new HTTPException(403, { message: 'Unable to identify client' });
  }
  
  // Check if IP is blocked due to too many failed auth attempts
  if (await checkAuthFailureRateLimit(c.env, ip)) {
    throw new HTTPException(429, { message: 'Too many failed authentication attempts. Please try again later.' });
  }

  // Check for API key in Authorization header
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    await trackAuthFailure(c.env, ip);
    throw new HTTPException(401, { message: 'API key required' });
  }
  
  const providedKey = authHeader.substring(7); // Remove "Bearer " prefix
  
  // Extract prefix (first 16 chars: "sk_live_ab12cd34")
  if (providedKey.length < 16) {
    await trackAuthFailure(c.env, ip);
    throw new HTTPException(401, { message: 'Invalid API key format' });
  }
  
  const keyPrefix = providedKey.substring(0, 16);
  
  // Query API keys with matching prefix (much more efficient than checking all keys)
  const allApiKeys = await c.env.DB.prepare(
    `SELECT * FROM api_keys WHERE key_prefix = ? AND status = 'active'`
  ).bind(keyPrefix).all<{ id: string; key_hash: string; user_id: string; allow_all_ips: number; ip_whitelist: string | null; expires_at: number | null; domain_ids?: string[] }>();
  
  if (!allApiKeys.results || allApiKeys.results.length === 0) {
    await trackAuthFailure(c.env, ip);
    throw new HTTPException(401, { message: 'Invalid API key' });
  }
  
  // Try to verify against each API key with matching prefix
  let verifiedKey = null;
  for (const keyRecord of allApiKeys.results) {
    const isValid = await verifyApiKey(providedKey, keyRecord.key_hash);
    if (isValid) {
      verifiedKey = keyRecord;
      break;
    }
  }
  
  if (!verifiedKey) {
    await trackAuthFailure(c.env, ip);
    throw new HTTPException(401, { message: 'Invalid API key' });
  }
  
  // Check expiration
  if (verifiedKey.expires_at && verifiedKey.expires_at <= Date.now()) {
    // Auto-update status to expired
    await c.env.DB.prepare(
      `UPDATE api_keys SET status = 'expired', updated_at = ? WHERE id = ?`
    ).bind(Date.now(), verifiedKey.id).run();
    // Don't track expired keys as failures (same as expired sessions - natural expiration, not attack)
    throw new HTTPException(401, { message: 'API key has expired' });
  }
  
  // Check IP whitelist
  // Use existing IP from helper (already validated at top of function)
  const clientIp = ip;
  
  // If IP whitelist is required, check it
  if (verifiedKey.allow_all_ips !== 1 && verifiedKey.ip_whitelist) {
    try {
      const allowedIps = JSON.parse(verifiedKey.ip_whitelist) as string[];
      // Normalize all whitelisted IPs (trim whitespace and filter empty)
      const normalizedAllowedIps = allowedIps
        .map(ip => String(ip).trim())
        .filter(ip => ip.length > 0);
      
      // Normalize client IP
      const normalizedClientIp = clientIp.trim();
      
      // Check if IP is whitelisted
      if (!normalizedAllowedIps.includes(normalizedClientIp)) {
        throw new HTTPException(403, { 
          message: `Access forbidden. Client IP: ${normalizedClientIp}` 
        });
      }
    } catch (error) {
      // Only catch JSON parsing errors, not HTTPException
      if (error instanceof HTTPException) {
        throw error; // Re-throw HTTPException (IP not whitelisted)
      }
      // Invalid JSON, treat as configuration error
      console.error('Invalid IP whitelist JSON format for API key');
      throw new HTTPException(500, { message: 'Invalid IP whitelist configuration' });
    }
  }
  
  // Update last used timestamp
  await updateLastUsed(c.env, verifiedKey.id);
  
  // Get associated domains
  const domainResults = await c.env.DB.prepare(
    `SELECT domain_id FROM api_key_domains WHERE api_key_id = ?`
  ).bind(verifiedKey.id).all<{ domain_id: string }>();
  
  const domainIds = domainResults.results 
    ? domainResults.results.map(r => r.domain_id)
    : undefined;
  
  // Store API key context in request context
  const apiKeyContext: ApiKeyContext = {
    api_key_id: verifiedKey.id,
    user_id: verifiedKey.user_id,
    domain_ids: domainIds,
    allow_all_ips: verifiedKey.allow_all_ips === 1,
    ip_whitelist: verifiedKey.ip_whitelist ? JSON.parse(verifiedKey.ip_whitelist) as string[] : undefined,
  };
  
  c.set('apiKey', apiKeyContext);
  
  // Also set user info for compatibility
  const user = await getUserById(c.env, verifiedKey.user_id);
  if (user) {
    c.set('user', {
      id: user.id,
      username: (user as { username?: string }).username || user.email,
      email: user.email,
      role: user.role,
    });
  }
  
  await next();
}

// Combined middleware: accepts either session auth OR API key auth
export async function authOrApiKeyMiddleware(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  // Try session auth first
  const sessionToken = getSessionTokenFromRequest(c.req.raw);
  if (sessionToken) {
    const session = await getSession(c.env, sessionToken);
    if (session) {
      const user = await getUserById(c.env, session.user_id);
      if (user) {
        c.set('user', {
          id: user.id,
          username: (user as { username?: string }).username || user.email,
          email: user.email,
          role: user.role,
        });
        c.set('session', session);
        await next();
        return;
      }
    }
  }
  
  // Fall back to API key auth
  await apiKeyMiddleware(c, next);
}


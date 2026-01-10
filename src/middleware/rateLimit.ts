/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Rate limiting middleware

import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../types';

interface RateLimitOptions {
  window: number; // seconds
  max: number | ((c: Context<{ Bindings: Env }>) => number); // Support dynamic limits
  key: string | ((c: Context<{ Bindings: Env }>) => string);
}

// Legacy function for backwards compatibility (not recommended)
export async function rateLimitMiddleware(
  c: Context<{ Bindings: Env }>,
  next: Next,
  options: RateLimitOptions
) {
  return createRateLimit(options)(c, next);
}

// Factory function (recommended)
export function createRateLimit(options: RateLimitOptions) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const { window, max, key } = options;
    
    // Resolve key if it's a function
    const keyPrefix = typeof key === 'function' ? key(c) : key;
    
    // Resolve max if it's a function
    const maxRequests = typeof max === 'function' ? max(c) : max;
    
    const rateLimitKey = `ratelimit:${keyPrefix}:${Math.floor(Date.now() / 1000 / window)}`;
    
    const current = await c.env.CACHE.get(rateLimitKey);
    const count = current ? parseInt(current) : 0;

    if (count >= maxRequests) {
      throw new HTTPException(429, {
        message: 'Rate limit exceeded',
      });
    }

    await c.env.CACHE.put(rateLimitKey, String(count + 1), {
      expirationTtl: window,
    });

    c.header('X-RateLimit-Limit', String(maxRequests));
    c.header('X-RateLimit-Remaining', String(maxRequests - count - 1));
    c.header('X-RateLimit-Reset', String((Math.floor(Date.now() / 1000 / window) + 1) * window));

    await next();
  };
}


/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Logging middleware

import type { Context, Next } from 'hono';
import type { Env } from '../types';

export async function loggerMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  const hostname = new URL(c.req.url).hostname;
  const logLevel = c.env.LOG_LEVEL || 'info';

  // DEBUG: Log incoming request (always log to see if worker is receiving requests)
  // console.log(`[REQUEST] ${method} ${hostname}${path}`);

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  // Always log redirect requests (3xx) and errors (4xx, 5xx)
  // Also log in debug mode
  const shouldLog = logLevel === 'debug' || status >= 300 || status >= 400;
  
  if (shouldLog) {
    // DEBUG: console.log(`[RESPONSE] ${method} ${hostname}${path} - ${status} - ${duration}ms`);
  }
}


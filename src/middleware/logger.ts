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

  try {
    await next();
  } catch (error) {
    // Log the error, then re-throw so the app's onError handler still shapes the response.
    const duration = Date.now() - start;
    console.error(
      `[REQUEST] ${method} ${hostname}${path} - ERROR - ${duration}ms:`,
      error instanceof Error ? error.stack || error.message : error
    );
    throw error;
  }

  const duration = Date.now() - start;
  const status = c.res.status;

  // Log redirects (3xx) and errors (4xx/5xx) at all levels; log everything in debug mode.
  const shouldLog = logLevel === 'debug' || status >= 300;

  if (shouldLog) {
    const line = `[REQUEST] ${method} ${hostname}${path} - ${status} - ${duration}ms`;
    if (status >= 500) {
      console.error(line);
    } else if (status >= 400) {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
}


/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { createMiddleware } from 'hono/factory';

/**
 * Cache-Control middleware for API routes
 * Ensures that API responses are not cached by clients or proxies
 */
export const cacheControl = createMiddleware(async (c, next) => {
    await next();

    // Only set Cache-Control headers if not already set
    if (!c.res.headers.get('Cache-Control')) {
        c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        c.header('Pragma', 'no-cache');
        c.header('Expires', '0');
    }
});

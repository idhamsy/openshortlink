/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// CSRF Protection Middleware
// Phase 5: Modernized with createMiddleware for better typing

import { createMiddleware } from 'hono/factory';
import { getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import type { Env, Variables } from '../types';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const CSRF_FORM_FIELD = '_csrf';

/**
 * CSRF Protection Middleware
 * 
 * Features:
 * - Uses createMiddleware for proper typing
 * - Environment-aware secure cookie (dev vs production)
 * - Supports both header and form field tokens
 * - Clones request for form data parsing to preserve body for downstream
 */
export const csrfProtection = createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    // 1. Get existing token from cookie
    let token = getCookie(c, CSRF_COOKIE_NAME);

    // 2. If no token exists, generate a new one
    if (!token) {
        token = crypto.randomUUID();
        // Use secure flag only in production (allows local dev over HTTP)
        const isProduction = c.env?.ENVIRONMENT === 'production';
        setCookie(c, CSRF_COOKIE_NAME, token, {
            path: '/',
            secure: isProduction,
            httpOnly: true,
            sameSite: 'Strict',
        });
    }

    // 3. Make token available to views/handlers
    c.set('csrfToken', token);

    // 4. Check if request method is safe (no CSRF check needed)
    const safeMethods = ['GET', 'HEAD', 'OPTIONS', 'TRACE'];
    if (safeMethods.includes(c.req.method)) {
        return next();
    }

    // 5. For unsafe methods, verify the token
    // Try header first (preferred for API/fetch calls)
    let submittedToken = c.req.header(CSRF_HEADER_NAME);

    // 6. Fall back to form field for HTML form submissions
    if (!submittedToken) {
        const contentType = c.req.header('Content-Type') || '';
        if (contentType.includes('application/x-www-form-urlencoded') || 
            contentType.includes('multipart/form-data')) {
            try {
                // Clone request to preserve body for downstream handlers
                const clonedReq = c.req.raw.clone();
                const formData = await clonedReq.formData();
                submittedToken = formData.get(CSRF_FORM_FIELD) as string;
            } catch {
                // Ignore parsing errors - token will be null and fail validation
            }
        }
    }

    // 7. Validate token
    if (!submittedToken || submittedToken !== token) {
        throw new HTTPException(403, { message: 'Invalid CSRF token' });
    }

    return next();
});

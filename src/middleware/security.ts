/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Security Headers Middleware
// Phase 2: Using createMiddleware with proper typing

import { createMiddleware } from 'hono/factory';
import type { Env, Variables } from '../types';

export const securityHeaders = createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
    // Generate a random nonce for this request
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
    c.set('nonce', nonce);

    await next();

    // Prevent clickjacking
    c.header('X-Frame-Options', 'DENY');

    // HTTP Strict Transport Security (HSTS)
    // Forces browsers to use HTTPS for all future requests to this origin
    // max-age=31536000 = 1 year, which is the recommended minimum
    c.header('Strict-Transport-Security', 'max-age=31536000');

    // Prevent MIME sniffing
    c.header('X-Content-Type-Options', 'nosniff');

    // Control referrer information
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Restrict browser features
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), vr=()');

    // Content Security Policy
    // We use a nonce for scripts to allow inline scripts in dashboard.ts while blocking others.
    // We still allow 'unsafe-inline' for styles because of the heavy use of style attributes.
    c.header(
        'Content-Security-Policy',
        `default-src 'self'; script-src 'self' 'nonce-${nonce}' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; connect-src 'self' https://cdn.jsdelivr.net;`
    );
});

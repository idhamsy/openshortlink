/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Main Cloudflare Worker entry point

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, Variables } from './types';
import { errorHandler } from './middleware/error';
import { loggerMiddleware } from './middleware/logger';
import { csrfProtection } from './middleware/csrf';
import { securityHeaders } from './middleware/security';
import { cacheControl } from './middleware/cache-control';
import { handleRedirect } from './services/redirect';
import { getDomainByRoutingPath } from './db/domains';
import { getRootPageSettingsOrDefault } from './db/settings';
import { escapeHtml } from './utils/html';

// Import API routes (static - they're small and needed for functionality)
import { linksRouter } from './api/links';
import { domainsRouter } from './api/domains';
import { analyticsRouter } from './api/analytics';
import { authRouter } from './api/auth';
import { usersRouter } from './api/users';
import { tagsRouter } from './api/tags';
import { categoriesRouter } from './api/categories';
import { apiKeysRouter } from './api/apiKeys';
import { settingsRouter } from './api/settings';
import { importRouter } from './api/import';
import { staticRouter } from './api/static';
// Dynamic imports only for large dashboard/auth views (reduces bundle size)

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware
app.use('*', loggerMiddleware);
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

// Conditional middleware: Skip CSRF and security headers for redirect routes
// Redirects are GET-only and don't return HTML, so these are unnecessary
app.use('*', async (c, next) => {
  const path = new URL(c.req.url).pathname;
  
  // Apply CSRF/security for dashboard and API routes only
  // Everything else is a redirect route
  const isAdminRoute = path.startsWith('/dashboard') || path.startsWith('/api');
  
  // Exclude auth endpoints from CSRF (they create sessions, can't have CSRF token before login)
  const isAuthEndpoint = path === '/api/auth/login' || 
                         path === '/api/auth/register' ||
                         path === '/api/auth/refresh' ||
                         path === '/api/auth/mfa/verify';
  
  if (isAdminRoute && !isAuthEndpoint) {
    // Apply CSRF and security headers for dashboard/API routes
    // Chain them properly: CSRF first, then security headers
    await csrfProtection(c, async () => {
      await securityHeaders(c, next);
    });
  } else if (isAdminRoute && isAuthEndpoint) {
    // Auth endpoints: security headers only, no CSRF
    await securityHeaders(c, next);
  } else {
    // Public routes (redirects + the root/route landing page, which can now return
    // branded or custom HTML): apply security headers. No CSRF — GET-only, no session
    // writes. CSP allows inline styles ('unsafe-inline') so the branded page renders,
    // and blocks unnonced inline scripts in custom-HTML mode.
    await securityHeaders(c, next);
  }
});

// Cache control for API routes
app.use('/api/*', cacheControl);

// ============================================================================
// DASHBOARD ROUTES - All admin functionality under /dashboard/*
// ============================================================================

// Dashboard - Health check (moved under /dashboard)
app.get('/dashboard/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() });
});

// Debug - Returns Cloudflare GeoIP headers for the current visitor
// Useful for users to verify exact city/country names before setting up redirect rules
app.get('/api/v1/debug/my-location', (c) => {
  // request.cf is populated by Cloudflare by default; the cf-* headers require the
  // "visitor location headers" Managed Transform, so fall back to them if present.
  const cf = (c.req.raw as { cf?: Record<string, string> }).cf || {};
  const city = cf.city || c.req.header('cf-ipcity') || null;
  const country = cf.country || c.req.header('cf-ipcountry') || null;
  const region = cf.region || c.req.header('cf-region') || null;
  const regionCode = cf.regionCode || c.req.header('cf-region-code') || null;
  const timezone = cf.timezone || c.req.header('cf-timezone') || null;

  return c.json({
    success: true,
    data: {
      city,
      country,
      region,
      region_code: regionCode,
      timezone,
      note: 'Use these exact values when setting up city/country redirect rules. City matching is case-insensitive.',
      docs: 'https://developers.cloudflare.com/fundamentals/reference/http-request-headers/#cf-ipcity',
    },
  });
});

app.get('/dashboard/api/v1/debug/my-location', (c) => {
  // request.cf is populated by Cloudflare by default; the cf-* headers require the
  // "visitor location headers" Managed Transform, so fall back to them if present.
  const cf = (c.req.raw as { cf?: Record<string, string> }).cf || {};
  const city = cf.city || c.req.header('cf-ipcity') || null;
  const country = cf.country || c.req.header('cf-ipcountry') || null;
  const region = cf.region || c.req.header('cf-region') || null;
  const regionCode = cf.regionCode || c.req.header('cf-region-code') || null;
  const timezone = cf.timezone || c.req.header('cf-timezone') || null;

  return c.json({
    success: true,
    data: {
      city,
      country,
      region,
      region_code: regionCode,
      timezone,
      note: 'Use these exact values when setting up city/country redirect rules. City matching is case-insensitive.',
      docs: 'https://developers.cloudflare.com/fundamentals/reference/http-request-headers/#cf-ipcity',
    },
  });
});

// Dashboard - Validation endpoint (moved under /dashboard)
app.get('/dashboard/__validate__', (c) => {
  return c.json({
    valid: true,
    script: 'openshortlink',
    timestamp: Date.now()
  });
});

// Dashboard - Login page (moved from /login to /dashboard/login)
app.get('/dashboard/login', async (c) => {
  const { loginHtml } = await import('./views/auth');
  const csrfToken = c.get('csrfToken') || '';
  const nonce = c.get('nonce') || '';
  return c.html(loginHtml(csrfToken, nonce));
});

// Dashboard - Setup page (moved from /setup to /dashboard/setup)
app.get('/dashboard/setup', async (c) => {
  // Check if users already exist
  const existingUsers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
  const userCount = existingUsers?.count || 0;

  if (userCount > 0) {
    // Users exist, redirect to login
    return c.redirect('/dashboard/login');
  }

  // Check if SETUP_TOKEN is configured
  if (!c.env.SETUP_TOKEN) {
    const { setupErrorHtml } = await import('./views/auth');
    return c.html(setupErrorHtml);
  }

  const { setupHtml } = await import('./views/auth');
  const csrfToken = c.get('csrfToken') || '';
  const nonce = c.get('nonce') || '';
  return c.html(setupHtml(csrfToken, nonce));
});

// Dashboard - Static assets (moved from /static to /dashboard/static)
app.route('/dashboard/static', staticRouter);

// Dashboard - Main dashboard page
app.get('/dashboard', async (c) => {
  // Dynamic import - only loads dashboard code when accessed
  const { dashboardHtml } = await import('./views/dashboard');
  
  // Check for auth cookie
  const cookieHeader = c.req.header('Cookie');
  const token = cookieHeader?.match(/session_token=([^;]+)/)?.[1];

  if (!token) {
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return c.redirect('/dashboard/login');
  }

  // Prevent caching of dashboard
  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  c.header('Pragma', 'no-cache');
  c.header('Expires', '0');
  const csrfToken = c.get('csrfToken') || '';
  const nonce = c.get('nonce') || '';
  return c.html(dashboardHtml(csrfToken, nonce));
});

// Dashboard - Catch-all for unmatched dashboard routes (MUST come after more specific /dashboard/* routes)
// Note: Moved to after API routes to allow /dashboard/api/* to be matched first

// ============================================================================
// API ROUTES - Mounted at BOTH /dashboard/api/* (for dashboard) and /api/* (for external)
// ============================================================================

// Dashboard internal API - used by dashboard JavaScript
// These endpoints work with just /dashboard/* Cloudflare route
app.route('/dashboard/api/v1/auth', authRouter);
app.route('/dashboard/api/v1/users', usersRouter);
app.route('/dashboard/api/v1/links/import', importRouter);
app.route('/dashboard/api/v1/links', linksRouter);
app.route('/dashboard/api/v1/domains', domainsRouter);
app.route('/dashboard/api/v1/analytics', analyticsRouter);
app.route('/dashboard/api/v1/tags', tagsRouter);
app.route('/dashboard/api/v1/categories', categoriesRouter);
app.route('/dashboard/api/v1/api-keys', apiKeysRouter);
app.route('/dashboard/api/v1/settings', settingsRouter);

// Auto-create first user - also available under /dashboard/api
app.post('/dashboard/api/v1/auth/setup-auto', async (c) => {
  const existingUsers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
  const userCount = existingUsers?.count || 0;

  if (userCount > 0) {
    return c.json({ success: false, message: 'Users already exist. Auto-setup is only for first user.' }, 400);
  }

  if (!c.env.FIRST_USER_USERNAME || !c.env.FIRST_USER_PASSWORD) {
    return c.json({
      success: false,
      message: 'Auto-setup requires FIRST_USER_USERNAME and FIRST_USER_PASSWORD environment variables.'
    }, 400);
  }

  const { getUserByUsername } = await import('./db/users');
  const existingUser = await getUserByUsername(c.env, c.env.FIRST_USER_USERNAME);
  if (existingUser) {
    return c.json({ success: false, message: 'User already exists.' }, 400);
  }

  const { hashPassword } = await import('./utils/crypto');
  const { createUser } = await import('./db/users');
  const passwordHash = await hashPassword(c.env.FIRST_USER_PASSWORD);

  const user = await createUser(c.env, {
    username: c.env.FIRST_USER_USERNAME,
    email: c.env.FIRST_USER_EMAIL || undefined,
    password_hash: passwordHash,
    role: 'owner',
  });

  return c.json({
    success: true,
    message: 'First user created successfully from environment variables.',
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  }, 201);
});

// Dashboard catch-all - AFTER API routes
app.get('/dashboard/*', async (c) => {
  return c.redirect('/dashboard');
});

// ============================================================================
// EXTERNAL API ROUTES - Optional, enable /api/* route in Cloudflare if needed
// ============================================================================

// External API - for third-party integrations (requires /api/* Cloudflare route)
app.post('/api/v1/auth/setup-auto', async (c) => {
  const existingUsers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
  const userCount = existingUsers?.count || 0;

  if (userCount > 0) {
    return c.json({ success: false, message: 'Users already exist. Auto-setup is only for first user.' }, 400);
  }

  if (!c.env.FIRST_USER_USERNAME || !c.env.FIRST_USER_PASSWORD) {
    return c.json({
      success: false,
      message: 'Auto-setup requires FIRST_USER_USERNAME and FIRST_USER_PASSWORD environment variables.'
    }, 400);
  }

  const { getUserByUsername } = await import('./db/users');
  const existingUser = await getUserByUsername(c.env, c.env.FIRST_USER_USERNAME);
  if (existingUser) {
    return c.json({ success: false, message: 'User already exists.' }, 400);
  }

  const { hashPassword } = await import('./utils/crypto');
  const { createUser } = await import('./db/users');
  const passwordHash = await hashPassword(c.env.FIRST_USER_PASSWORD);

  const user = await createUser(c.env, {
    username: c.env.FIRST_USER_USERNAME,
    email: c.env.FIRST_USER_EMAIL || undefined,
    password_hash: passwordHash,
    role: 'owner',
  });

  return c.json({
    success: true,
    message: 'First user created successfully from environment variables.',
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  }, 201);
});

app.route('/api/v1/auth', authRouter);
app.route('/api/v1/users', usersRouter);
app.route('/api/v1/links/import', importRouter);
app.route('/api/v1/links', linksRouter);
app.route('/api/v1/domains', domainsRouter);
app.route('/api/v1/analytics', analyticsRouter);
app.route('/api/v1/tags', tagsRouter);
app.route('/api/v1/categories', categoriesRouter);
app.route('/api/v1/api-keys', apiKeysRouter);
app.route('/api/v1/settings', settingsRouter);

// ============================================================================
// LINK REDIRECT HANDLER - Catch-all for short link redirects
// ============================================================================

app.get('*', async (c) => {
  const url = new URL(c.req.url);
  const domain = url.hostname;
  const path = url.pathname;

  // Handle __validate__ endpoint for domain route validation
  // This allows external domains to validate their Cloudflare Worker routes
  if (path.endsWith('/__validate__')) {
    return c.json({
      valid: true,
      script: 'openshortlink',
      timestamp: Date.now()
    });
  }

  // Try to find domain and routing path
  const result = await getDomainByRoutingPath(c.env, domain, path);

  if (!result) {
    return c.text('Not found', 404);
  }

  const { domain: domainObj, matchedRoute } = result;

  // Extract slug from path using the matched route
  const routingPath = matchedRoute.replace(/\*/g, '').replace(/\/$/, '');
  const slug = path.replace(routingPath, '').replace(/^\//, '').replace(/\/$/, '');

  if (!slug) {
    // #12: serve the configured default page for the domain root (no slug given).
    const rootPage = await getRootPageSettingsOrDefault(c.env);

    if (rootPage.mode === 'redirect' && rootPage.redirect_url) {
      return Response.redirect(rootPage.redirect_url, 302);
    }

    if (rootPage.mode === 'html' && rootPage.html.trim()) {
      return c.html(rootPage.html);
    }

    // Default: a built-in branded welcome page.
    return c.html(renderBrandedRootPage(domainObj.domain_name));
  }

  // Handle redirect (pass execution context for proper async tracking)
  const redirectResponse = await handleRedirect(c.env, c.req.raw, domainObj, slug, c.executionCtx, matchedRoute);

  return redirectResponse;
});

// Error handler
app.onError(errorHandler);

// Cron trigger for scheduled tasks
async function scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  const cron = event.cron;

  // Handle different cron triggers
  if (cron === '0 0 * * *') {
    // Daily tasks (midnight UTC)
    ctx.waitUntil((async () => {
      try {
        // Daily analytics aggregation
        const { aggregateYesterday } = await import('./services/analyticsAggregation');
        await aggregateYesterday(env);
      } catch (error) {
        console.error('[CRON ERROR] Failed to aggregate analytics:', error);
      }

      try {
        // Daily top 100 links status check
        const { processDailyTop100Check } = await import('./services/status-check');
        const result = await processDailyTop100Check(env);
      } catch (error) {
        console.error('[CRON ERROR] Failed to check top 100 links:', error);
      }
    })());
  } else if (cron === '0 */6 * * *') {
    // Status check every 6 hours (batch size read from settings)
    ctx.waitUntil((async () => {
      try {
        const { processScheduledStatusCheck } = await import('./services/status-check');
        const result = await processScheduledStatusCheck(env);
      } catch (error) {
        console.error('[CRON ERROR] Failed to check link statuses:', error);
      }
    })());
  }
}

// #12: built-in branded welcome page served at a domain root when no custom
// page or redirect is configured. domainName is escaped (it originates from the DB).
function renderBrandedRootPage(domainName: string): string {
  const safeDomain = escapeHtml(domainName);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeDomain}</title>
  <style>
    body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #fff; }
    .card { text-align: center; padding: 2.5rem; max-width: 480px; }
    h1 { font-size: 2rem; margin: 0 0 0.5rem; }
    p { opacity: 0.85; line-height: 1.6; margin: 0.5rem 0; }
    .domain { font-weight: 600; }
    .footer { margin-top: 2rem; font-size: 0.8rem; opacity: 0.6; }
    a { color: #fff; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🔗 ${safeDomain}</h1>
    <p>This is a URL shortener powered by <span class="domain">OpenShort.link</span>.</p>
    <p>Short links on this domain redirect to their destinations. There's nothing to see here.</p>
    <div class="footer">Powered by <a href="https://openshort.link" rel="noopener noreferrer">OpenShort.link</a></div>
  </div>
</body>
</html>`;
}

// Export default object with both fetch (HTTP handler) and scheduled (cron handler)
export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => app.fetch(request, env, ctx),
  scheduled,
};

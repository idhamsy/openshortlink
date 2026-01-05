/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the Common Public Attribution License Version 1.0 (CPAL-1.0)
 * See LICENSE file or https://opensource.org/license/cpal-1-0
 */

// Handles password verification for protected links

import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import type { Env } from '../types';
import { getDomainByRoutingPath } from '../db/domains';
import { getLinkBySlug } from '../db/links';
import { verifyPassword, hashPassword } from '../utils/crypto';
import { passwordHtml } from '../views/password';

export async function handlePasswordVerification(c: any) {
  // CSRF Protection (Basic Manual Check since we are outside standard middleware chain)
  // In a real app, we should use the middleware. But for this wildcard handler, we check manually.
  // We expect _csrf field in body. We can validate against a cookie if we had one.
  // Since this is a public access page (no session), standard CSRF tokens might not apply easily without session.
  // However, we can use a "double submit cookie" pattern or just rely on the fact that
  // the attacker needs to know the password to do anything useful (redirect).
  // The risk here is someone brute-forcing passwords. Rate limiting is more important.

  // For now, we proceed without strict CSRF token validation because we don't have a session to store the token in
  // before the user authenticates. The 'nonce' we passed to the view was for CSP, not CSRF.
  // To implement proper CSRF here, we'd need to set a cookie on the GET request (in redirect.ts)
  // and verify it here.

  const url = new URL(c.req.url);
  const domain = url.hostname;
  const path = url.pathname;

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
    return c.text('Slug required', 400);
  }

  const link = await getLinkBySlug(c.env, domainObj.id, slug);

  if (!link) {
    return c.text('Link not found', 404);
  }

  // Handle POST request (Password submission)
  const formData = await c.req.parseBody();
  const password = formData['password'] as string;
  // const csrfToken = formData['_csrf'] as string; // CSRF Token from form (ignored for now as we don't have session in this context)

  // Note: Standard CSRF protection relies on session cookies which we don't have for public link access.
  // We could implement a stateless CSRF using a signed cookie if needed, but for a simple password prompt,
  // the risk is low (attacker can only bruteforce, which should be rate limited).

  if (!password) {
    const csrfToken = c.get('csrfToken') || '';
    const nonce = c.get('nonce') || '';
    return c.html(passwordHtml(csrfToken, nonce, 'Password is required'));
  }

  // Check if link has password (if not, why are we here? maybe race condition or direct access)
  if (!link.password_hash) {
    return c.redirect(url.toString()); // Redirect back to GET handler
  }

  const isValid = await verifyPassword(password, link.password_hash);

  if (!isValid) {
    const csrfToken = c.get('csrfToken') || '';
    const nonce = c.get('nonce') || '';
    return c.html(passwordHtml(csrfToken, nonce, 'Incorrect password'));
  }

  // Password valid! Set a cookie to remember authorization
  // We'll use a simple approach: cookie name = `pwd_token_${link.id}`
  // Value = hash of (link.password_hash + secret) or just re-use the valid password hash?
  // Let's use a signed value or similar. For simplicity, we can set a cookie that proves we know the password.
  // Ideally we should use a session token, but for a link unlock, a cookie with short expiry is okay.
  // We'll verify it by checking if we have a cookie that matches a derived value we can re-compute.

  // Actually, simplest is:
  // Cookie Name: `pl_auth_${link.id}`
  // Cookie Value: `sha256(link.password_hash + c.env.SETUP_TOKEN)` (server side secret)
  // But we need to do this verification in `handleRedirect` too.

  // Let's create a helper to generate the auth token
  const encoder = new TextEncoder();
  const data = encoder.encode(link.password_hash + (c.env.SETUP_TOKEN || 'default-secret'));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const authValue = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  setCookie(c, `pl_auth_${link.id}`, authValue, {
    path: '/',
    secure: true,
    httpOnly: true,
    maxAge: 3600 * 24, // 1 day
    sameSite: 'Lax',
  });

  // Redirect back to the same URL (GET), which should now pass the check
  return c.redirect(url.toString());
}

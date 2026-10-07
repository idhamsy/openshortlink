/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { securityHeaders } from '../security';

function app() {
  const a = new Hono();
  a.use('*', securityHeaders);
  a.get('/own-csp', () => new Response('<p>x</p>', {
    headers: { 'Content-Type': 'text/html', 'Content-Security-Policy': "default-src 'none'" },
  }));
  a.get('/plain', (c) => c.html('<p>x</p>'));
  return a;
}

describe('securityHeaders', () => {
  it('keeps a CSP the response already set', async () => {
    const res = await app().request('/own-csp');
    expect(res.headers.get('content-security-policy')).toBe("default-src 'none'");
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('strict-transport-security')).toContain('max-age=');
  });

  it('applies the default CSP otherwise', async () => {
    const res = await app().request('/plain');
    expect(res.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(res.headers.get('x-frame-options')).toBe('DENY');
  });
});

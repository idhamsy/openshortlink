/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Responses that set or clear two cookies must send two Set-Cookie headers
// (c.header() replaces by default, which silently dropped session_token).

import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { createFullTestEnv } from '../../test-utils/fullD1';
import { errorHandler } from '../../middleware/error';

vi.mock('../../middleware/auth', async (orig) => ({
  ...(await orig<typeof import('../../middleware/auth')>()),
  optionalAuth: async (_c: any, next: any) => { await next(); },
}));

import { authRouter } from '../auth';

describe('auth cookies', () => {
  it('logout clears both session_token and refresh_token', async () => {
    const { env } = createFullTestEnv();
    const app = new Hono<any>();
    app.onError(errorHandler);
    app.route('/auth', authRouter);
    const res = await app.request('/auth/logout', {
      method: 'POST',
      headers: { Cookie: 'session_token=s1; refresh_token=r1' },
    }, env);
    const cookies = res.headers.getSetCookie();
    expect(cookies.some((v) => v.startsWith('session_token=;') && v.includes('Max-Age=0'))).toBe(true);
    expect(cookies.some((v) => v.startsWith('refresh_token=;') && v.includes('Max-Age=0'))).toBe(true);
  });
});

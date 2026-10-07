/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Admin MFA reset: recovery when a user lost their authenticator or SETUP_TOKEN changed.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const state: { user: any } = { user: undefined };

vi.mock('../../middleware/auth', () => ({
  authMiddleware: async (c: any, next: any) => {
    c.set('user', state.user);
    await next();
  },
}));

vi.mock('../../middleware/authorization', () => ({
  requireRole: (roles: string[]) => async (c: any, next: any) => {
    if (!roles.includes(c.get('user')?.role)) return c.json({ error: 'forbidden' }, 403);
    await next();
  },
}));

const users: Record<string, any> = {
  'u-owner': { id: 'u-owner', username: 'owner', role: 'owner' },
  'u-admin': { id: 'u-admin', username: 'admin', role: 'admin' },
  'u-user': { id: 'u-user', username: 'bob', role: 'user' },
};

vi.mock('../../db/users', async (orig) => ({
  ...(await orig<any>()),
  getUserById: vi.fn(async (_env: any, id: string) => users[id] ?? null),
  updateUser: vi.fn(),
}));

vi.mock('../../services/audit', async (orig) => ({
  ...(await orig<any>()),
  logAuditEvent: vi.fn(),
}));

import { usersRouter } from '../users';
import { updateUser } from '../../db/users';

function reset(targetId: string) {
  const app = new Hono();
  app.route('/users', usersRouter);
  app.onError((err: any, c) => c.json({ error: err.message }, err.status || 500));
  return app.request('/users/' + targetId + '/mfa/reset', { method: 'POST' }, {} as any);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /users/:id/mfa/reset', () => {
  it('admin resets a user: clears MFA enabled, secret and backup codes', async () => {
    state.user = users['u-admin'];
    const res = await reset('u-user');
    expect(res.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith(expect.anything(), 'u-user', {
      mfa_enabled: 0, mfa_secret: null, mfa_backup_codes: null,
    });
  });

  it('refuses your own account (must use /auth/mfa/disable with re-auth)', async () => {
    state.user = users['u-admin'];
    expect((await reset('u-admin')).status).toBe(400);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("admin cannot reset an owner's MFA", async () => {
    state.user = users['u-admin'];
    expect((await reset('u-owner')).status).toBe(403);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('non-admin is forbidden', async () => {
    state.user = users['u-user'];
    expect((await reset('u-admin')).status).toBe(403);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('404 for an unknown user', async () => {
    state.user = users['u-owner'];
    expect((await reset('nope')).status).toBe(404);
  });
});

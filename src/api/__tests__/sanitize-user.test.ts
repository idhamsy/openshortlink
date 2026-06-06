/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Security: unit tests ensuring secret columns never leak from the users API.

import { describe, it, expect } from 'vitest';
import { sanitizeUser } from '../users';

describe('sanitizeUser (users API secret stripping)', () => {
  const fullUser = {
    id: 'user_123',
    email: 'a@b.com',
    username: 'alice',
    role: 'admin',
    password_hash: 'deadbeef:cafebabe',
    mfa_secret: 'JBSWY3DPEHPK3PXP',
    mfa_backup_codes: '["aaaa","bbbb"]',
    mfa_enabled: 1,
    global_access: 1,
    must_change_password: 0,
    created_at: 1,
    updated_at: 2,
  };

  it('removes password_hash, mfa_secret, and mfa_backup_codes', () => {
    const safe = sanitizeUser(fullUser);
    expect(safe).not.toHaveProperty('password_hash');
    expect(safe).not.toHaveProperty('mfa_secret');
    expect(safe).not.toHaveProperty('mfa_backup_codes');
  });

  it('retains non-secret fields the UI relies on', () => {
    const safe = sanitizeUser(fullUser);
    expect(safe).toMatchObject({
      id: 'user_123',
      email: 'a@b.com',
      username: 'alice',
      role: 'admin',
      mfa_enabled: 1,
      global_access: 1,
      must_change_password: 0,
    });
  });

  it('does not mutate the original object', () => {
    sanitizeUser(fullUser);
    expect(fullUser.password_hash).toBe('deadbeef:cafebabe');
    expect(fullUser.mfa_secret).toBe('JBSWY3DPEHPK3PXP');
  });

  it('is a no-op for objects without secret fields', () => {
    const safe = sanitizeUser({ id: 'x', role: 'user' });
    expect(safe).toEqual({ id: 'x', role: 'user' });
  });
});

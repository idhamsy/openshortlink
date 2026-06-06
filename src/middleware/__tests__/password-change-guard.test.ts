/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// #11: unit tests for the forced-password-change guard decision.

import { describe, it, expect } from 'vitest';
import { shouldBlockForPasswordChange } from '../auth';

describe('shouldBlockForPasswordChange (#11)', () => {
  it('does not block when the flag is not set', () => {
    expect(shouldBlockForPasswordChange('/dashboard/api/v1/links', 0)).toBe(false);
    expect(shouldBlockForPasswordChange('/dashboard/api/v1/links', undefined)).toBe(false);
  });

  it('blocks ordinary resource routes when the flag is set', () => {
    expect(shouldBlockForPasswordChange('/dashboard/api/v1/links', 1)).toBe(true);
    expect(shouldBlockForPasswordChange('/api/v1/users', 1)).toBe(true);
    expect(shouldBlockForPasswordChange('/api/v1/settings/root-page', 1)).toBe(true);
  });

  it('allows the endpoints needed to complete the change', () => {
    expect(shouldBlockForPasswordChange('/dashboard/api/v1/auth/change-password', 1)).toBe(false);
    expect(shouldBlockForPasswordChange('/api/v1/auth/change-password', 1)).toBe(false);
    expect(shouldBlockForPasswordChange('/dashboard/api/v1/auth/me', 1)).toBe(false);
    expect(shouldBlockForPasswordChange('/dashboard/api/v1/auth/logout', 1)).toBe(false);
    expect(shouldBlockForPasswordChange('/api/v1/auth/me/', 1)).toBe(false); // trailing slash tolerated
  });

  it('uses exact-path matching, not a permissive suffix (CodeRabbit hardening)', () => {
    // A route that merely ENDS in an allowed name must still be blocked.
    expect(shouldBlockForPasswordChange('/api/v1/links/auth/me', 1)).toBe(true);
    expect(shouldBlockForPasswordChange('/evil/auth/change-password', 1)).toBe(true);
    expect(shouldBlockForPasswordChange('/api/v2/auth/me', 1)).toBe(true);
  });

  it('only treats the value 1 as "must change" (not other truthy numbers)', () => {
    // The DB column is a 0/1 integer; guard strictly on 1.
    expect(shouldBlockForPasswordChange('/api/v1/links', 2 as unknown as number)).toBe(false);
  });
});

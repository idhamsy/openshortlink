/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hasPermission } from '../permissions';
import type { User } from '../../types';

describe('manage_pixels permission + router mounting', () => {
  it('admin/owner/user may manage pixels; analyst may not', () => {
    for (const role of ['admin', 'owner', 'user']) expect(hasPermission({ role } as User, 'manage_pixels')).toBe(true);
    expect(hasPermission({ role: 'analyst' } as User, 'manage_pixels')).toBe(false);
  });
  it('pixels router is mounted on both API prefixes', () => {
    const index = readFileSync(join(process.cwd(), 'src/index.ts'), 'utf8');
    expect(index).toContain("app.route('/dashboard/api/v1/pixels', pixelsRouter)");
    expect(index).toContain("app.route('/api/v1/pixels', pixelsRouter)");
  });
});

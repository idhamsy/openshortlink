/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = readFileSync(join(process.cwd(), 'src/api/links.ts'), 'utf8');
const bulkSrc = readFileSync(join(process.cwd(), 'src/services/bulkLinks.ts'), 'utf8');

describe('links.ts pixel wiring', () => {
  it('resolves pixel ids on create (with defaults), update and bulk (without)', () => {
    expect(src).toContain('resolveLinkPixelIds(c.env, validated.domain_id, validated.pixel_ids, { applyDefaults: true })');
    expect(src).toContain('resolveLinkPixelIds(c.env, existingLink.domain_id, validated.pixel_ids, { applyDefaults: false })');
    // Bulk lives in the service now; it must still resolve (without defaults) before writing.
    expect(bulkSrc).toContain('resolveLinkPixelIds(env, link.domain_id, pixel_ids, { applyDefaults: false })');
    expect(bulkSrc.indexOf('resolveLinkPixelIds(')).toBeLessThan(bulkSrc.indexOf('env.DB.batch(stmts)'));
  });
  it('never saves raw request pixel_ids', () => {
    expect(src).not.toMatch(/pixel_ids:\s*validated\.pixel_ids/);
    expect(src).not.toMatch(/saveLinkExtras\(c\.env, id, \{ og_meta, pixel_ids \}\)/);
  });
});

/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, it, expect } from 'vitest';
import { createLinkSchema, updateLinkSchema } from '../link';

const base = { domain_id: 'd1', destination_url: 'https://example.com' };

describe('link pixel_ids schema', () => {
  it('leaves pixel_ids undefined on create when omitted (domain defaults apply)', () => {
    expect(createLinkSchema.parse(base).pixel_ids).toBeUndefined();
  });
  it('accepts up to 5 ids, rejects 6', () => {
    expect(createLinkSchema.safeParse({ ...base, pixel_ids: ['a', 'b', 'c', 'd', 'e'] }).success).toBe(true);
    expect(createLinkSchema.safeParse({ ...base, pixel_ids: ['a', 'b', 'c', 'd', 'e', 'f'] }).success).toBe(false);
  });
  it('update: omitted stays undefined, [] is kept for clearing', () => {
    expect(updateLinkSchema.parse({}).pixel_ids).toBeUndefined();
    expect(updateLinkSchema.parse({ pixel_ids: [] }).pixel_ids).toEqual([]);
  });
});

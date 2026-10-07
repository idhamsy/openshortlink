/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, it, expect } from 'vitest';
import { createLinkSchema, updateLinkSchema } from '../link';

// Zod 4 keeps .default() through .partial(), so a default on the shared base schema
// would silently overwrite stored values on every update that omits the field.
describe('link update schema does not inject defaults', () => {
  it('omitted redirect_code stays undefined on update (PUT)', () => {
    expect(updateLinkSchema.parse({ title: 'x' }).redirect_code).toBeUndefined();
  });

  it('omitted redirect_code stays undefined on bulk update', () => {
    expect(updateLinkSchema.partial().parse({ pixel_ids: [] }).redirect_code).toBeUndefined();
  });

  it('an explicit redirect_code is kept and still validated on update', () => {
    expect(updateLinkSchema.parse({ redirect_code: 302 }).redirect_code).toBe(302);
    expect(updateLinkSchema.safeParse({ redirect_code: 303 }).success).toBe(false);
  });

  it('create still defaults redirect_code to 301', () => {
    expect(createLinkSchema.parse({ domain_id: 'd1', destination_url: 'https://example.com' }).redirect_code).toBe(301);
  });
});

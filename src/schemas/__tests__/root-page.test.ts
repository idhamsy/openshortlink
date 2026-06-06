/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// #12: unit tests for the root-page settings schema.

import { describe, it, expect } from 'vitest';
import { rootPageSchema } from '../settings';

describe('rootPageSchema (#12)', () => {
  it('accepts branded mode with defaults', () => {
    const r = rootPageSchema.safeParse({ mode: 'branded' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.mode).toBe('branded');
      expect(r.data.html).toBe('');
      expect(r.data.redirect_url).toBe('');
    }
  });

  it('accepts html mode with custom html', () => {
    const r = rootPageSchema.safeParse({ mode: 'html', html: '<h1>Hi</h1>' });
    expect(r.success).toBe(true);
  });

  it('requires a redirect_url when mode is redirect', () => {
    const missing = rootPageSchema.safeParse({ mode: 'redirect' });
    expect(missing.success).toBe(false);

    const empty = rootPageSchema.safeParse({ mode: 'redirect', redirect_url: '' });
    expect(empty.success).toBe(false);

    const ok = rootPageSchema.safeParse({ mode: 'redirect', redirect_url: 'https://example.com/welcome' });
    expect(ok.success).toBe(true);
  });

  it('rejects an invalid redirect_url', () => {
    const r = rootPageSchema.safeParse({ mode: 'redirect', redirect_url: 'not-a-url' });
    expect(r.success).toBe(false);
  });

  it('rejects unknown modes', () => {
    const r = rootPageSchema.safeParse({ mode: 'iframe' });
    expect(r.success).toBe(false);
  });
});

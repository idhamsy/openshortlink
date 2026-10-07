/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, it, expect } from 'vitest';
import { mergeQueryParams } from '../redirect';

describe('mergeQueryParams (F13b — owner params win)', () => {
  it('copies request params the destination does not define', () => {
    const result = mergeQueryParams(
      'https://example.com/page',
      new URL('https://short.link/go/abc?ref=twitter')
    );
    expect(new URL(result).searchParams.get('ref')).toBe('twitter');
  });

  it('does NOT let a request param override an owner-set destination param', () => {
    const result = mergeQueryParams(
      'https://example.com/page?utm_source=owner',
      new URL('https://short.link/go/abc?utm_source=attacker')
    );
    expect(new URL(result).searchParams.get('utm_source')).toBe('owner');
  });

  it('merges non-conflicting params while preserving owner params', () => {
    const result = mergeQueryParams(
      'https://example.com/page?utm_source=owner',
      new URL('https://short.link/go/abc?utm_source=attacker&extra=1')
    );
    const params = new URL(result).searchParams;
    expect(params.get('utm_source')).toBe('owner');
    expect(params.get('extra')).toBe('1');
  });

  it('returns the destination unchanged when there are no request params', () => {
    const dest = 'https://example.com/page?a=1';
    expect(mergeQueryParams(dest, new URL('https://short.link/go/abc'))).toBe(dest);
  });

  it('falls back to the original destination when it is not a valid absolute URL', () => {
    const dest = 'not a url';
    expect(mergeQueryParams(dest, new URL('https://short.link/go/abc?x=1'))).toBe(dest);
  });
});

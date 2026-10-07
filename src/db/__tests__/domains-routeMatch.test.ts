/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Tests for domain route matching (F5 / CX19): segment-boundary matching and
// longest-prefix-first ordering, plus a re-derivation of the slug that
// src/index.ts extracts from the matched route.

import { describe, it, expect } from 'vitest';
import type { Env, Domain } from '../../types';
import {
  normalizeRoutePrefix,
  matchesRoutePrefix,
  getDomainByRoutingPath,
} from '../domains';

describe('normalizeRoutePrefix', () => {
  it('strips wildcard and trailing slash, keeps a leading slash', () => {
    expect(normalizeRoutePrefix('/go/*')).toBe('/go');
    expect(normalizeRoutePrefix('/go/')).toBe('/go');
    expect(normalizeRoutePrefix('/go')).toBe('/go');
    expect(normalizeRoutePrefix('go/*')).toBe('/go');
  });

  it('normalizes root catch-alls to "/"', () => {
    expect(normalizeRoutePrefix('/*')).toBe('/');
    expect(normalizeRoutePrefix('/')).toBe('/');
  });
});

describe('matchesRoutePrefix (segment boundary)', () => {
  it('matches exact and child-segment paths', () => {
    expect(matchesRoutePrefix('/go', '/go')).toBe(true);
    expect(matchesRoutePrefix('/go/abc', '/go')).toBe(true);
  });

  it('does NOT match a longer sibling prefix (the /gopher bug)', () => {
    expect(matchesRoutePrefix('/gopher', '/go')).toBe(false);
    expect(matchesRoutePrefix('/gone/abc', '/go')).toBe(false);
  });

  it('root catch-all matches everything', () => {
    expect(matchesRoutePrefix('/anything/here', '/')).toBe(true);
    expect(matchesRoutePrefix('/', '/')).toBe(true);
  });
});

// Re-derivation of the slug extraction in src/index.ts, to lock in the boundary
// behavior it depends on.
function extractSlug(path: string, matchedRoute: string): string {
  const routePrefix = normalizeRoutePrefix(matchedRoute);
  let slug = path;
  if (
    routePrefix !== '' &&
    routePrefix !== '/' &&
    (slug === routePrefix || slug.startsWith(routePrefix + '/'))
  ) {
    slug = slug.slice(routePrefix.length);
  }
  return slug.replace(/^\//, '').replace(/\/$/, '');
}

describe('slug extraction (mirrors src/index.ts)', () => {
  it('strips exactly the matched prefix', () => {
    expect(extractSlug('/go/abc', '/go/*')).toBe('abc');
    expect(extractSlug('/go/foo/bar', '/go/*')).toBe('foo/bar');
    expect(extractSlug('/abc', '/*')).toBe('abc');
  });
});

// --- getDomainByRoutingPath integration with a mocked Env -------------------

function makeDomain(routes: string[]): Domain {
  return {
    id: 'd_' + routes.join('_'),
    cloudflare_account_id: 'acct',
    domain_name: 'short.example',
    routing_path: routes[0],
    default_redirect_code: 301,
    status: 'active',
    settings: JSON.stringify({ routes }),
    created_at: 1,
    updated_at: 1,
  } as Domain;
}

function makeEnv(domains: Domain[]): Env {
  return {
    CACHE: {
      get: async () => null, // force cache miss + version 0
      put: async () => {},
    },
    DB: {
      prepare: () => ({
        bind: () => ({
          all: async () => ({ results: domains }),
        }),
      }),
    },
  } as unknown as Env;
}

describe('getDomainByRoutingPath', () => {
  it("matches '/go/abc' to '/go/*' and rejects '/gone/abc'", async () => {
    const env = makeEnv([makeDomain(['/go/*'])]);

    const matched = await getDomainByRoutingPath(env, 'short.example', '/go/abc');
    expect(matched?.matchedRoute).toBe('/go/*');

    const notMatched = await getDomainByRoutingPath(env, 'short.example', '/gone/abc');
    expect(notMatched).toBeNull();
  });

  it("prefers the longer prefix when routes are ['/*','/go/*']", async () => {
    const env = makeEnv([makeDomain(['/*', '/go/*'])]);

    const go = await getDomainByRoutingPath(env, 'short.example', '/go/abc');
    expect(go?.matchedRoute).toBe('/go/*');

    const other = await getDomainByRoutingPath(env, 'short.example', '/other/thing');
    expect(other?.matchedRoute).toBe('/*');
  });

  it('longest-prefix ordering holds regardless of route declaration order', async () => {
    const env = makeEnv([makeDomain(['/go/*', '/*'])]);
    const go = await getDomainByRoutingPath(env, 'short.example', '/go/abc');
    expect(go?.matchedRoute).toBe('/go/*');
  });
});

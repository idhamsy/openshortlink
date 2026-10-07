/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, it, expect } from 'vitest';
import { handleRedirect, buildVaryHeader } from '../redirect';
import { buildCachedLink } from '../linkService';
import type { CachedLink, Domain, Env, Link } from '../../types';

const domain = { id: 'dom1', domain_name: 'sho.rt', status: 'active', routing_path: '/*' } as unknown as Domain;
const link = {
  id: 'link1', domain_id: 'dom1', slug: 'abc', destination_url: 'https://dest.example.com/page',
  redirect_code: 301, status: 'active', metadata: null,
} as unknown as Link;

/** Fake env: KV map + D1 that answers by table name. */
function fakeEnv(opts: { cached?: CachedLink | null; pixelRows?: unknown[] } = {}) {
  const kv = new Map<string, string>();
  if (opts.cached) kv.set('link:sho.rt:abc', JSON.stringify(opts.cached));
  const rowsFor = (sql: string): unknown[] => (sql.includes('link_pixels') ? opts.pixelRows || [] : []);
  const env = {
    CACHE: {
      async get(key: string) { const v = kv.get(key); return v ? JSON.parse(v) : null; },
      async put(key: string, value: string) { kv.set(key, value); },
    },
    DB: {
      prepare(sql: string) {
        return {
          bind() { return this; },
          async first() { return sql.includes('FROM links') ? link : null; },
          async all() { return { results: rowsFor(sql) }; },
          async run() { return {}; },
        };
      },
    },
    ANALYTICS: { writeDataPoint() {} },
  } as unknown as Env;
  return { env, kv };
}

const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;
const HUMAN = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const BOT = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';

describe('pixels in the cached link', () => {
  const pixelRows = [{ id: 'pxl_1', name: 'Main', pixel_type: 'facebook', pixel_id: '111' }];

  it('buildCachedLink includes pixels', async () => {
    const { env } = fakeEnv({ pixelRows });
    const cached = await buildCachedLink(env, link, domain);
    expect(cached.pixels).toEqual([{ pixel_type: 'facebook', pixel_id: '111' }]);
  });

  it('buildCachedLink leaves pixels undefined when none', async () => {
    const { env } = fakeEnv();
    expect((await buildCachedLink(env, link, domain)).pixels).toBeUndefined();
  });

  it('handleRedirect cache-miss rebuild stores pixels in KV', async () => {
    const { env, kv } = fakeEnv({ pixelRows });
    await handleRedirect(env, new Request('https://sho.rt/abc', { headers: { 'user-agent': BOT } }), domain, 'abc', ctx);
    const stored = JSON.parse(kv.get('link:sho.rt:abc')!);
    expect(stored.pixels).toEqual([{ pixel_type: 'facebook', pixel_id: '111' }]);
  });
});


describe('pixel interstitial branch in handleRedirect', () => {
  const withPixels = (dest = 'https://dest.example.com/page'): CachedLink => ({
    destination_url: dest, redirect_code: 301, status: 'active', link_id: 'link1',
    route: '', domain_routing_path: '/*',
    pixels: [{ pixel_type: 'facebook', pixel_id: '111' }],
  });
  const req = (ua: string) => new Request('https://sho.rt/abc', { headers: { 'user-agent': ua } });

  it('serves a 200 uncacheable interstitial with its own nonced CSP to humans', async () => {
    const { env } = fakeEnv({ cached: withPixels() });
    const res = await handleRedirect(env, req(HUMAN), domain, 'abc', ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(res.headers.get('cache-control')).toBe('private, no-store, max-age=0');
    const body = await res.text();
    expect(body).toContain("fbq('init', '111')");
    expect(body).toContain('https://dest.example.com/page');
    const csp = res.headers.get('content-security-policy') || '';
    const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
    expect(nonce).toBeTruthy();
    expect(body).toContain(`nonce="${nonce}"`);
  });

  it('gives bots the normal redirect, varying on User-Agent', async () => {
    const { env } = fakeEnv({ cached: withPixels() });
    const res = await handleRedirect(env, req(BOT), domain, 'abc', ctx);
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://dest.example.com/page');
    expect(res.headers.get('vary')).toContain('User-Agent');
  });

  it('never JS-navigates to a non-http(s) destination', async () => {
    const { env } = fakeEnv({ cached: withPixels('javascript:alert(1)') });
    const res = await handleRedirect(env, req(HUMAN), domain, 'abc', ctx);
    expect(res.status).toBe(301);
    expect(res.headers.get('content-type') || '').not.toContain('text/html');
  });

  it('links without pixels still redirect humans directly', async () => {
    const cached = withPixels();
    delete cached.pixels;
    const { env } = fakeEnv({ cached });
    const res = await handleRedirect(env, req(HUMAN), domain, 'abc', ctx);
    expect(res.status).toBe(301);
  });

  it('buildVaryHeader includes User-Agent when pixels are set', () => {
    expect(buildVaryHeader(withPixels())).toContain('User-Agent');
  });
});

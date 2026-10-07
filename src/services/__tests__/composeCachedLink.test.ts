import { describe, it, expect } from 'vitest';
import { buildCachedLink, composeCachedLink, type CachedLinkParts } from '../linkService';
import { createFullTestEnv, seedDomainRow } from '../../test-utils/fullD1';
import {
  upsertGeoRedirect, upsertDeviceRedirect, upsertCityRedirect, upsertOsRedirect,
} from '../../db/linkRedirects';
import { upsertOgMeta } from '../../db/linkOgMeta';
import type { Domain, Link } from '../../types';

function setup(metadata: string | null = null) {
  const t = createFullTestEnv();
  seedDomainRow(t.raw, { id: 'dom1', domain_name: 'sho.rt', routes: ['/go/*'] });
  const now = Date.now();
  t.raw.prepare(
    `INSERT INTO links (id, domain_id, slug, destination_url, redirect_code, status, expires_at, password_hash, metadata, created_at, updated_at)
     VALUES ('lnk1', 'dom1', 'abc', 'https://dest.example.com', 302, 'active', 4102444800000, 'hash123', ?, ?, ?)`
  ).run(metadata, now, now);
  const link = t.raw.prepare('SELECT * FROM links WHERE id = ?').get('lnk1') as unknown as Link;
  const domain = t.raw.prepare('SELECT * FROM domains WHERE id = ?').get('dom1') as unknown as Domain;
  return { ...t, link, domain };
}

describe('composeCachedLink', () => {
  it('all-undefined parts equals buildCachedLink for a link with no rules', async () => {
    const { env, link, domain } = setup('{"route":"/go/*"}');
    const built = await buildCachedLink(env, link, domain);
    const composed = composeCachedLink(link, domain, {});
    expect(JSON.stringify(composed)).toBe(JSON.stringify(built));
    expect(composed.route).toBe('/go/*');
    expect(composed.geo_redirects).toBeUndefined();
    expect(composed.city_redirects).toBeUndefined();
    expect(composed.pixels).toBeUndefined();
  });

  it('with rules/og/pixels equals buildCachedLink after writing the same data', async () => {
    const { env, raw, link, domain } = setup();
    await upsertGeoRedirect(env, 'lnk1', 'us', 'https://us.example.com');
    await upsertGeoRedirect(env, 'lnk1', 'GB', 'https://gb.example.com');
    await upsertDeviceRedirect(env, 'lnk1', 'mobile', 'https://m.example.com');
    await upsertCityRedirect(env, 'lnk1', 'Jakarta', 'https://jkt.example.com');
    await upsertOsRedirect(env, 'lnk1', 'ios', 'https://ios.example.com');
    await upsertOgMeta(env, 'lnk1', { og_title: 'T', og_description: 'D', og_image: 'https://i.example.com/x.png' });
    const now = Date.now();
    raw.prepare(`INSERT INTO pixel_library (id, domain_id, name, pixel_type, pixel_id, is_default, created_at, updated_at)
      VALUES ('pxl_1', 'dom1', 'Main', 'facebook', '111', 0, ?, ?)`).run(now, now);
    raw.prepare(`INSERT INTO link_pixels (link_id, library_pixel_id, created_at) VALUES ('lnk1', 'pxl_1', ?)`).run(now);

    const built = await buildCachedLink(env, link, domain);
    const parts: CachedLinkParts = {
      geo: { GB: 'https://gb.example.com', US: 'https://us.example.com' }, // DB orders by country_code
      device: { mobile: 'https://m.example.com' },
      city: [{ city_name: 'jakarta', destination_url: 'https://jkt.example.com' }],
      os: { ios: 'https://ios.example.com' },
      og_meta: { og_title: 'T', og_description: 'D', og_image: 'https://i.example.com/x.png', og_type: 'website', twitter_card: 'summary_large_image' },
      pixels: [{ pixel_type: 'facebook', pixel_id: '111' }],
    };
    expect(built.geo_redirects).toBeDefined();
    expect(JSON.stringify(composeCachedLink(link, domain, parts))).toBe(JSON.stringify(built));
  });

  it('parses route from link.metadata and tolerates bad JSON', () => {
    const domain = { routing_path: '/go/*' } as unknown as Domain;
    const mk = (metadata: string | null) => ({ id: 'l', destination_url: 'https://d', redirect_code: 301, status: 'active', metadata }) as unknown as Link;
    expect(composeCachedLink(mk('{"route":"/x/*"}'), domain, {}).route).toBe('/x/*');
    expect(composeCachedLink(mk('{oops'), domain, {}).route).toBeUndefined();
    expect(composeCachedLink(mk(null), domain, {}).route).toBeUndefined();
    expect(composeCachedLink(mk(null), domain, {}).domain_routing_path).toBe('/go/*');
  });

  it('never emits empty groups', () => {
    const domain = { routing_path: '/go/*' } as unknown as Domain;
    const link = { id: 'l', destination_url: 'https://d', redirect_code: 301, status: 'active' } as unknown as Link;
    const json = JSON.stringify(composeCachedLink(link, domain, {}));
    expect(json).not.toMatch(/\[\]|\{\}|null/);
  });
});

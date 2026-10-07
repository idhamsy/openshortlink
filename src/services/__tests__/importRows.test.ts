import { describe, it, expect } from 'vitest';
import { importRows, canImportToDomain } from '../importRows';
import { buildCachedLink } from '../linkService';
import { createFullTestEnv, seedDomainRow, seedUser } from '../../test-utils/fullD1';
import { createLibraryPixel } from '../../db/pixelLibrary';
import { getDomainById } from '../../db/domains';
import type { Link, User } from '../../types';

async function setup() {
  const t = createFullTestEnv();
  seedDomainRow(t.raw, { id: 'dom1', domain_name: 'sho.rt', routes: ['/go/*', '/x/*'] });
  t.raw.prepare("UPDATE domains SET normalized_domain_name = 'sho.rt' WHERE id = 'dom1'").run();
  seedUser(t.raw, { id: 'u1', role: 'admin' });
  const domain = (await getDomainById(t.env, 'dom1'))!;
  const user = t.raw.prepare('SELECT * FROM users WHERE id = ?').get('u1') as unknown as User;
  const run = (rows: Record<string, string>[], onExisting: 'skip' | 'error' | 'update' = 'skip', columnMapping: Record<string, string> = {}) =>
    importRows(t.env, { domain, actor: { user }, onExisting, columnMapping }, rows);
  const link = (slug: string) => t.raw.prepare('SELECT * FROM links WHERE domain_id = ? AND slug = ?').get('dom1', slug) as any;
  return { ...t, domain, user, run, link };
}

const q = <T = any>(raw: any, sql: string, ...a: any[]) => raw.prepare(sql).all(...a) as T[];

describe('importRows', () => {
  it('create: link, tags, rules, default pixels, KV entry w/ pixels', async () => {
    const s = await setup();
    await createLibraryPixel(s.env, { domain_id: 'dom1', name: 'A', pixel_type: 'facebook', pixel_id: '1234567890', is_default: true });
    const r = await s.run(
      [{ destination_url: 'https://a.example.com', slug: 'one', tags: 'news, promo', title: '<b>T</b>', us: 'https://us.example.com', mobile: 'https://m.example.com' }],
      'skip'
    );
    expect(r.created).toBe(1);
    expect(r.results[0]).toMatchObject({ row: 0, success: true, action: 'created', slug: 'one' });
    const l = s.link('one');
    expect(l.destination_url).toBe('https://a.example.com/');
    expect(JSON.parse(l.metadata).route).toBe('/go/*');
    expect(q(s.raw, 'SELECT * FROM link_tags WHERE link_id = ?', l.id)).toHaveLength(2);
    expect(q(s.raw, 'SELECT * FROM link_geo_redirects WHERE link_id = ?', l.id)).toHaveLength(1);
    expect(q(s.raw, 'SELECT * FROM link_device_redirects WHERE link_id = ?', l.id)).toHaveLength(1);
    expect(q(s.raw, 'SELECT * FROM link_pixels WHERE link_id = ?', l.id)).toHaveLength(1);
    const key = [...s.kv.keys()].find((k) => k.includes('one'))!;
    const cached = JSON.parse(s.kv.get(key)!);
    expect(cached.pixels).toEqual([{ pixel_type: 'facebook', pixel_id: '1234567890' }]);
    // parity with buildCachedLink
    const built = await buildCachedLink(s.env, l as Link, s.domain);
    expect(JSON.stringify(cached)).toBe(JSON.stringify(built));
  });

  it('skip / error modes on existing slug', async () => {
    const s = await setup();
    await s.run([{ destination_url: 'https://a.example.com', slug: 'one' }]);
    const skip = await s.run([{ destination_url: 'https://b.example.com', slug: 'one' }], 'skip');
    expect(skip.results[0]).toMatchObject({ success: true, action: 'skipped' });
    expect(skip.skipped).toBe(1);
    expect(s.link('one').destination_url).toBe('https://a.example.com/');
    const err = await s.run([{ destination_url: 'https://b.example.com', slug: 'one' }], 'error');
    expect(err.results[0]).toMatchObject({ success: false, action: 'error', error: 'Slug already exists' });
    expect(err.errors).toBe(1);
  });

  it('update: only non-blank fields change; tags replace; rules upsert; pixels untouched; KV deleted', async () => {
    const s = await setup();
    await s.run([{ destination_url: 'https://a.example.com', slug: 'one', title: 'Keep', tags: 'x, y', us: 'https://us.example.com', mobile: 'https://m.example.com' }]);
    const px = await createLibraryPixel(s.env, { domain_id: 'dom1', name: 'A', pixel_type: 'facebook', pixel_id: '1234567890', is_default: false });
    const id = s.link('one').id;
    s.raw.prepare('INSERT INTO link_pixels (link_id, library_pixel_id, created_at) VALUES (?, ?, 1)').run(id, px.id);
    expect([...s.kv.keys()].some((k) => k.includes('one'))).toBe(true);
    const r = await s.run([{ slug: 'one', tags: 'z', gb: 'https://gb.example.com', redirect_code: '302' }], 'update');
    expect(r.results[0]).toMatchObject({ success: true, action: 'updated', slug: 'one' });
    expect(r.updated).toBe(1);
    const l = s.link('one');
    expect(l.title).toBe('Keep');
    expect(l.destination_url).toBe('https://a.example.com/');
    expect(l.redirect_code).toBe(302);
    const tags = q(s.raw, 'SELECT t.name FROM link_tags lt JOIN tags t ON t.id = lt.tag_id WHERE lt.link_id = ?', id);
    expect(tags.map((t: any) => t.name)).toEqual(['z']);
    expect(q(s.raw, 'SELECT country_code FROM link_geo_redirects WHERE link_id = ? ORDER BY country_code', id).map((x: any) => x.country_code)).toEqual(['GB', 'US']);
    expect(q(s.raw, 'SELECT * FROM link_device_redirects WHERE link_id = ?', id)).toHaveLength(1);
    expect(q(s.raw, 'SELECT * FROM link_pixels WHERE link_id = ?', id)).toHaveLength(1);
    expect([...s.kv.keys()].some((k) => k.includes('one'))).toBe(false);
  });

  it('soft-deleted slug errors in every mode', async () => {
    const s = await setup();
    await s.run([{ destination_url: 'https://a.example.com', slug: 'gone' }]);
    s.raw.prepare("UPDATE links SET status = 'deleted' WHERE slug = 'gone'").run();
    for (const m of ['skip', 'error', 'update'] as const) {
      const r = await s.run([{ destination_url: 'https://b.example.com', slug: 'gone' }], m);
      expect(r.results[0]).toMatchObject({ success: false, action: 'error', error: 'Slug belongs to a deleted link — restore or hard-delete it first' });
    }
  });

  it('update with invalid destination errors and leaves row unchanged', async () => {
    const s = await setup();
    await s.run([{ destination_url: 'https://a.example.com', slug: 'one', title: 'T' }]);
    const before = s.link('one');
    const r = await s.run([{ slug: 'one', destination_url: 'not a url at all ::', title: 'New' }], 'update');
    expect(r.results[0]).toMatchObject({ success: false, action: 'error' });
    expect(s.link('one')).toEqual(before);
  });

  it('same slug twice with update: created then updated', async () => {
    const s = await setup();
    const r = await s.run(
      [{ destination_url: 'https://a.example.com', slug: 'dup' }, { destination_url: 'https://b.example.com', slug: 'dup' }],
      'update'
    );
    expect(r.results.map((x) => x.action)).toEqual(['created', 'updated']);
    expect(s.link('dup').destination_url).toBe('https://b.example.com/');
  });

  it('loop destination is rejected on create without writes', async () => {
    const s = await setup();
    const r = await s.run([{ destination_url: 'https://sho.rt/go/abc', slug: 'loop' }]);
    expect(r.results[0].action).toBe('error');
    expect(s.link('loop')).toBeUndefined();
  });

  it('rejects > 10 tags', async () => {
    const s = await setup();
    const tags = Array.from({ length: 11 }, (_, i) => `t${i}`).join(',');
    const r = await s.run([{ destination_url: 'https://a.example.com', slug: 'many', tags }]);
    expect(r.results[0]).toMatchObject({ action: 'error' });
    expect(s.link('many')).toBeUndefined();
  });

  it('canImportToDomain: user without access denied, api key scope enforced', async () => {
    const s = await setup();
    seedUser(s.raw, { id: 'u2', role: 'user' });
    const u2 = s.raw.prepare('SELECT * FROM users WHERE id = ?').get('u2') as unknown as User;
    expect(await canImportToDomain(s.env, { user: u2 }, 'dom1')).toBe(false);
    expect(await canImportToDomain(s.env, { user: s.user }, 'dom1')).toBe(true);
    const key = (ids?: string[]) => ({ api_key_id: 'k', user_id: 'u1', domain_ids: ids, allow_all_ips: true });
    expect(await canImportToDomain(s.env, { apiKey: key(['other']) }, 'dom1')).toBe(false);
    expect(await canImportToDomain(s.env, { apiKey: key(['dom1']) }, 'dom1')).toBe(true);
    expect(await canImportToDomain(s.env, { apiKey: key(undefined) }, 'dom1')).toBe(true);
  });

  describe('call budget', () => {
    const mkRows = () =>
      Array.from({ length: 100 }, (_, i) => ({
        destination_url: `https://dest${i % 5}.example.com/p${i}`,
        slug: `s${i}`,
        tags: 'alpha, beta',
        us: 'https://us.example.com', gb: 'https://gb.example.com', de: 'https://de.example.com',
        mobile: 'https://m.example.com', desktop: 'https://d.example.com',
      }));

    it('100-row create <= 500 calls, update <= 500 calls', async () => {
      const s = await setup();
      await createLibraryPixel(s.env, { domain_id: 'dom1', name: 'A', pixel_type: 'facebook', pixel_id: '1234567890', is_default: true });
      await createLibraryPixel(s.env, { domain_id: 'dom1', name: 'B', pixel_type: 'ga4', pixel_id: 'G-ABC123XYZ', is_default: true });
      s.calls.count = 0;
      const c = await s.run(mkRows(), 'update');
      console.log('IMPORT create calls', s.calls.count);
      expect(c.created).toBe(100);
      expect(s.calls.count).toBeLessThanOrEqual(500);
      s.calls.count = 0;
      const u = await s.run(mkRows(), 'update');
      console.log('IMPORT update calls', s.calls.count);
      expect(u.updated).toBe(100);
      expect(s.calls.count).toBeLessThanOrEqual(500);
    });
  });
});

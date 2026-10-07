import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createFullTestEnv, seedDomainRow, seedUser, type SqliteDb } from '../../test-utils/fullD1';
import { errorHandler } from '../../middleware/error';

const actor: { user?: unknown; apiKey?: unknown } = {};
vi.mock('../../middleware/auth', async (orig) => ({
  ...(await orig<typeof import('../../middleware/auth')>()),
  authOrApiKeyMiddleware: async (c: any, next: any) => {
    if (actor.user) c.set('user', actor.user);
    if (actor.apiKey) c.set('apiKey', actor.apiKey);
    await next();
  },
}));
vi.mock('../../middleware/authorization', async (orig) => ({
  ...(await orig<typeof import('../../middleware/authorization')>()),
  requirePermission: () => async (_c: any, next: any) => { await next(); },
}));

import { linksRouter } from '../links';

const admin = { id: 'u-admin', role: 'admin' };

function setup() {
  const t = createFullTestEnv();
  seedUser(t.raw, admin);
  seedDomainRow(t.raw, { id: 'd1', domain_name: 'a.test', routes: ['/go/*', '/r/*'] });
  seedDomainRow(t.raw, { id: 'd2', domain_name: 'b.test' });
  const app = new Hono<any>();
  app.onError(errorHandler);
  app.route('/links', linksRouter);
  const post = async (body: unknown) => {
    const res = await app.request('/links/bulk', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }, t.env);
    return { status: res.status, json: (await res.json()) as any };
  };
  return { ...t, post };
}

function seedLink(raw: SqliteDb, id: string, slug: string, domainId = 'd1') {
  const now = Date.now();
  raw.prepare(
    `INSERT INTO links (id, domain_id, slug, destination_url, redirect_code, status, metadata, created_at, updated_at)
     VALUES (?, ?, ?, 'https://old.example.com/', 301, 'active', ?, ?, ?)`
  ).run(id, domainId, slug, JSON.stringify({ route: '/go/*', keep: 1 }), now, now);
}

function persisted(raw: SqliteDb, id: string) {
  const link = raw.prepare('SELECT destination_url, title, description, redirect_code, status, metadata, category_id FROM links WHERE id = ?').get(id);
  const tags = raw.prepare('SELECT tag_id FROM link_tags WHERE link_id = ? ORDER BY tag_id').all(id);
  const geo = raw.prepare('SELECT country_code, destination_url FROM link_geo_redirects WHERE link_id = ? ORDER BY country_code').all(id);
  const device = raw.prepare('SELECT device_type, destination_url FROM link_device_redirects WHERE link_id = ? ORDER BY device_type').all(id);
  const city = raw.prepare('SELECT city_name, destination_url FROM link_city_redirects WHERE link_id = ? ORDER BY city_name').all(id);
  const os = raw.prepare('SELECT os, destination_url FROM link_os_redirects WHERE link_id = ? ORDER BY os').all(id);
  const og = raw.prepare('SELECT og_title, og_description FROM link_og_meta WHERE link_id = ?').all(id);
  return JSON.parse(JSON.stringify({ link, tags, geo, device, city, os, og }));
}

beforeEach(() => { actor.user = admin; actor.apiKey = undefined; });

describe('POST /links/bulk old format (regression snapshot)', () => {
  it('persists link fields, tags, rules, og, route/metadata merge and category column', async () => {
    const { raw, post } = setup();
    const now = Date.now();
    raw.prepare('INSERT INTO tags (id, name, domain_id, created_at) VALUES (?, ?, ?, ?)').run('t1', 'one', 'd1', now);
    raw.prepare('INSERT INTO tags (id, name, domain_id, created_at) VALUES (?, ?, ?, ?)').run('t2', 'two', 'd1', now);
    seedLink(raw, 'l1', 's1');
    raw.prepare("INSERT INTO link_geo_redirects (id, link_id, country_code, destination_url, created_at, updated_at) VALUES ('g0','l1','DE','https://de.old/',1,1)").run();
    const res = await post({
      action: 'update',
      link_ids: ['l1', 'missing'],
      updates: {
        destination_url: 'https://new.example.com/x',
        title: 'Hello', description: 'Desc', redirect_code: 302, status: 'archived',
        category_id: 'cat1', route: '/r/*', metadata: { extra: true },
        tags: ['t1', 't2'],
        geo_redirects: [{ country_code: 'us', destination_url: 'https://us.example.com/' }],
        device_redirects: [{ device_type: 'mobile', destination_url: 'https://m.example.com/' }],
        city_redirects: [{ city_name: 'Berlin', destination_url: 'https://berlin.example.com/' }],
        os_redirects: [{ os: 'ios', destination_url: 'https://ios.example.com/' }],
        og_meta: { og_title: 'OG', og_description: 'OGD' },
      },
    });
    expect(res.status).toBe(200);
    expect(res.json.data).toEqual([{ id: 'l1', success: true }, { id: 'missing', success: false, error: 'Link not found' }]);
    const p = persisted(raw, 'l1');
    expect(JSON.parse(p.link.metadata)).toEqual({ route: '/r/*', keep: 1, extra: true });
    p.link.metadata = '<meta>';
    expect(p).toEqual({
      link: { destination_url: 'https://new.example.com/x', title: 'Hello', description: 'Desc', redirect_code: 302, status: 'archived', metadata: '<meta>', category_id: 'cat1' },
      tags: [{ tag_id: 't1' }, { tag_id: 't2' }],
      geo: [{ country_code: 'US', destination_url: 'https://us.example.com/' }],
      device: [{ device_type: 'mobile', destination_url: 'https://m.example.com/' }],
      city: [{ city_name: 'berlin', destination_url: 'https://berlin.example.com/' }],
      os: [{ os: 'ios', destination_url: 'https://ios.example.com/' }],
      og: [{ og_title: 'OG', og_description: 'OGD' }],
    });
  });

  it('empty rule arrays clear existing rules; invalid route fails that link only', async () => {
    const { raw, post } = setup();
    seedLink(raw, 'l1', 's1');
    raw.prepare("INSERT INTO link_geo_redirects (id, link_id, country_code, destination_url, created_at, updated_at) VALUES ('g0','l1','DE','https://de.old/',1,1)").run();
    const ok = await post({ action: 'update', link_ids: ['l1'], updates: { geo_redirects: [] } });
    expect(ok.json.data).toEqual([{ id: 'l1', success: true }]);
    expect(persisted(raw, 'l1').geo).toEqual([]);
    const bad = await post({ action: 'update', link_ids: ['l1'], updates: { route: '/nope/*', title: 'X' } });
    expect(bad.json.data).toEqual([{ id: 'l1', success: false, error: 'Invalid route for domain' }]);
    expect(persisted(raw, 'l1').link.title).toBeNull();
  });

  it('delete soft-deletes and old-format access messages are preserved', async () => {
    const { raw, post } = setup();
    seedLink(raw, 'l1', 's1');
    seedUser(raw, { id: 'u2', role: 'user' });
    actor.user = { id: 'u2', role: 'user' };
    const denied = await post({ action: 'delete', link_ids: ['l1'] });
    expect(denied.json.data).toEqual([{ id: 'l1', success: false, error: 'Access denied. You do not have access to this domain.' }]);
    actor.user = admin;
    actor.apiKey = { domain_ids: ['d2'] };
    const scoped = await post({ action: 'delete', link_ids: ['l1'] });
    expect(scoped.json.data).toEqual([{ id: 'l1', success: false, error: 'Domain not on scope' }]);
    actor.apiKey = undefined;
    const del = await post({ action: 'delete', link_ids: ['l1'] });
    expect(del.json.data).toEqual([{ id: 'l1', success: true }]);
    expect(persisted(raw, 'l1').link.status).toBe('deleted');
  });
});

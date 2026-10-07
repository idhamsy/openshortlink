/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Regression (GHSA-9f2c-cqrr-gcqp): a non-admin user or a scoped API key must not mutate
// links of a domain they cannot access via bulk (both formats) or CSV import. Asserts the
// persisted state, not just the response.

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
import { importRouter } from '../import';

// The attacker only has access to domain dA; the victim link lives on dB.
const attacker = { id: 'u-attacker', role: 'user', global_access: 0 };
const admin = { id: 'u-admin', role: 'admin', global_access: 1 };

function setup() {
  const t = createFullTestEnv();
  seedUser(t.raw, attacker);
  seedUser(t.raw, admin);
  seedDomainRow(t.raw, { id: 'dA', domain_name: 'a.test' });
  seedDomainRow(t.raw, { id: 'dB', domain_name: 'b.test' });
  t.raw.prepare('INSERT INTO user_domains (user_id, domain_id, created_at) VALUES (?, ?, ?)').run(attacker.id, 'dA', Date.now());
  seedLink(t.raw, 'victim', 'victim', 'dB');
  const app = new Hono<any>();
  app.onError(errorHandler);
  app.route('/links/import', importRouter);
  app.route('/links', linksRouter);
  const bulk = async (body: unknown) => {
    const res = await app.request('/links/bulk', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }, t.env);
    return { status: res.status, json: (await res.json()) as any };
  };
  const importCsv = async (domainId: string) => {
    const fd = new FormData();
    fd.append('file', new File(['destination_url,slug\nhttps://evil.example/,victim\n'], 'x.csv', { type: 'text/csv' }));
    fd.append('domain_id', domainId);
    fd.append('column_mapping', JSON.stringify({ destination_url: 'destination_url', slug: 'slug' }));
    fd.append('on_existing', 'update');
    const res = await app.request('/links/import', { method: 'POST', body: fd }, t.env);
    return { status: res.status, json: (await res.json()) as any };
  };
  return { ...t, bulk, importCsv };
}

function seedLink(raw: SqliteDb, id: string, slug: string, domainId: string) {
  const now = Date.now();
  raw.prepare(
    `INSERT INTO links (id, domain_id, slug, destination_url, redirect_code, status, metadata, created_at, updated_at)
     VALUES (?, ?, ?, 'https://victim.example/', 301, 'active', '{}', ?, ?)`
  ).run(id, domainId, slug, now, now);
}

function victim(raw: SqliteDb) {
  return raw.prepare("SELECT destination_url, status FROM links WHERE id = 'victim'").get() as { destination_url: string; status: string };
}

const UNCHANGED = { destination_url: 'https://victim.example/', status: 'active' };

beforeEach(() => { actor.user = attacker; actor.apiKey = undefined; });

describe('cross-domain access: bulk', () => {
  it('legacy format: cannot update or delete another domain\'s link by id', async () => {
    const { raw, bulk } = setup();
    const up = await bulk({ action: 'update', link_ids: ['victim'], updates: { destination_url: 'https://evil.example/' } });
    expect(up.json.data[0]).toMatchObject({ id: 'victim', success: false });
    const del = await bulk({ action: 'delete', link_ids: ['victim'] });
    expect(del.json.data[0]).toMatchObject({ id: 'victim', success: false });
    expect(victim(raw)).toEqual(UNCHANGED);
  });

  it('items format: cannot update or delete by id or by domain_id + slug', async () => {
    const { raw, bulk } = setup();
    const up = await bulk({ action: 'update', items: [
      { id: 'victim', updates: { destination_url: 'https://evil.example/' } },
      { domain_id: 'dB', slug: 'victim', updates: { destination_url: 'https://evil.example/' } },
    ] });
    expect(up.json.data.map((r: any) => r.success)).toEqual([false, false]);
    const del = await bulk({ action: 'delete', items: [{ id: 'victim' }, { domain_id: 'dB', slug: 'victim' }] });
    expect(del.json.data.map((r: any) => r.success)).toEqual([false, false]);
    expect(victim(raw)).toEqual(UNCHANGED);
  });

  it('scoped API key cannot touch a link outside its domains', async () => {
    const { raw, bulk } = setup();
    actor.user = undefined;
    actor.apiKey = { domain_ids: ['dA'] };
    const del = await bulk({ action: 'delete', link_ids: ['victim'] });
    expect(del.json.data[0]).toMatchObject({ id: 'victim', success: false });
    expect(victim(raw)).toEqual(UNCHANGED);
  });

  it('control: an admin can update the same link', async () => {
    const { raw, bulk } = setup();
    actor.user = admin;
    const up = await bulk({ action: 'update', link_ids: ['victim'], updates: { destination_url: 'https://new.example/' } });
    expect(up.json.data[0]).toMatchObject({ id: 'victim', success: true });
    expect(victim(raw).destination_url).toBe('https://new.example/');
  });
});

describe('cross-domain access: CSV import', () => {
  it('session user gets 403 importing into a domain they cannot access', async () => {
    const { raw, importCsv } = setup();
    const res = await importCsv('dB');
    expect(res.status).toBe(403);
    expect(victim(raw)).toEqual(UNCHANGED);
  });

  it('scoped API key gets 403 importing outside its domains', async () => {
    const { raw, importCsv } = setup();
    actor.user = undefined;
    actor.apiKey = { domain_ids: ['dA'] };
    const res = await importCsv('dB');
    expect(res.status).toBe(403);
    expect(victim(raw)).toEqual(UNCHANGED);
  });

  it('control: importing into an accessible domain passes the check', async () => {
    const { importCsv } = setup();
    const res = await importCsv('dA');
    expect(res.status).toBe(200);
  });
});

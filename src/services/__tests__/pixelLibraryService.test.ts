/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, it, expect } from 'vitest';
import { createTestD1, seedDomain, seedLink } from '../../test-utils/sqliteD1';
import {
  createPixel, updatePixel, deletePixel, attachPixelToAll, detachPixelFromAll, listPixels,
  resolveLinkPixelIds, invalidateKeys, MAX_CACHE_INVALIDATIONS, PixelError, type Actor,
} from '../pixelLibrary';
import { setLinkPixels } from '../../db/linkPixels';
import type { Env, User } from '../../types';

const admin: Actor = { user: { id: 'u1', role: 'admin' } as User };
const scopedKey: Actor = { user: { id: 'u2', role: 'user' } as User, apiKey: { api_key_id: 'k', user_id: 'u2', domain_ids: ['d2'], allow_all_ips: true } };

function setup() {
  const t = createTestD1();
  const deleted: string[] = [];
  const kv = { async delete(key: string) { deleted.push(key); }, async get() { return null; }, async put() {} };
  const env = { ...t.env, CACHE: kv } as unknown as Env;
  // domains need the columns getDomainById selects; add any missing ones to BASE_SCHEMA if it errors.
  // pixel_library.created_by has a FK to users; seed the actors.
  t.raw.exec("INSERT INTO users (id, username, role) VALUES ('u1', 'admin', 'admin'), ('u2', 'user2', 'user')");
  seedDomain(t.raw, 'd1', 'a.test');
  seedDomain(t.raw, 'd2', 'b.test');
  seedLink(t.raw, 'l1', 'd1', 's1');
  seedLink(t.raw, 'l2', 'd1', 's2');
  seedLink(t.raw, 'l9', 'd2', 'x');
  return { env, raw: t.raw, deleted };
}
const meta = (o: Partial<{ name: string; pixel_type: 'facebook' | 'ga4'; pixel_id: string; is_default: boolean; domain_id: string }> = {}) =>
  ({ domain_id: 'd1', name: 'Main', pixel_type: 'facebook' as const, pixel_id: '1234567890', is_default: false, ...o });

async function expectPixelError(p: Promise<unknown>, status: number, msg?: RegExp) {
  const err = await p.then(() => null, (e) => e);
  expect(err).toBeInstanceOf(PixelError);
  expect(err.status).toBe(status);
  if (msg) expect(err.message).toMatch(msg);
}

describe('pixel library service', () => {
  it('normalises ids and maps duplicates to 409', async () => {
    const { env } = setup();
    const p = await createPixel(env, admin, meta({ pixel_type: 'ga4', pixel_id: 'g-abcd' }));
    expect(p.pixel_id).toBe('G-ABCD');
    await expectPixelError(createPixel(env, admin, meta({ pixel_type: 'ga4', pixel_id: 'G-ABCD', name: 'Other' })), 409, /already saved/);
    await expectPixelError(createPixel(env, admin, meta({ name: 'Main', pixel_id: '9999999999' })), 409, /name/);
  });

  it('enforces 25 per domain and 5 defaults per domain', async () => {
    const { env } = setup();
    for (let i = 0; i < 5; i++) await createPixel(env, admin, meta({ name: 'D' + i, pixel_id: '100000000' + i, is_default: true }));
    await expectPixelError(createPixel(env, admin, meta({ name: 'D5', pixel_id: '1000000005', is_default: true })), 400, /default/);
    for (let i = 5; i < 25; i++) await createPixel(env, admin, meta({ name: 'N' + i, pixel_id: '20000000' + String(i).padStart(2, '0') }));
    await expectPixelError(createPixel(env, admin, meta({ name: 'Too many', pixel_id: '3000000000' })), 400, /25/);
  });

  it('API key scoped to another domain cannot touch d1 pixels', async () => {
    const { env } = setup();
    await expectPixelError(createPixel(env, scopedKey, meta()), 403);
    await expectPixelError(listPixels(env, scopedKey, 'd1'), 403);
    await expectPixelError(listPixels(env, admin, undefined), 400);
  });

  it('update re-validates the (type, id) pair and only invalidates on type/id change', async () => {
    const { env, deleted } = setup();
    const p = await createPixel(env, admin, meta());
    await setLinkPixels(env, 'l1', [p.id]);
    await expectPixelError(updatePixel(env, admin, p.id, { pixel_type: 'ga4' }), 400, /Google Analytics 4/);
    await updatePixel(env, admin, p.id, { name: 'Renamed', is_default: true });
    expect(deleted).toEqual([]);
    await updatePixel(env, admin, p.id, { pixel_id: '5555555555' });
    expect(deleted).toEqual(['link:a.test:s1']);
  });

  it('delete collects cache keys before the cascade and reports affected links', async () => {
    const { env, deleted } = setup();
    const p = await createPixel(env, admin, meta());
    await setLinkPixels(env, 'l1', [p.id]);
    await setLinkPixels(env, 'l2', [p.id]);
    expect(await deletePixel(env, admin, p.id)).toEqual({ affected_links: 2, stale_links: 0 });
    expect(deleted.sort()).toEqual(['link:a.test:s1', 'link:a.test:s2']);
    await expectPixelError(deletePixel(env, admin, p.id), 404);
  });

  it('attach-all / detach-all invalidate the affected links', async () => {
    const { env, deleted } = setup();
    const p = await createPixel(env, admin, meta());
    expect(await attachPixelToAll(env, admin, p.id)).toEqual({ attached: 2, skipped_full: 0, stale_links: 0 });
    expect(deleted.sort()).toEqual(['link:a.test:s1', 'link:a.test:s2']);
    deleted.length = 0;
    expect(await detachPixelFromAll(env, admin, p.id)).toEqual({ detached: 2, stale_links: 0 });
    expect(deleted.sort()).toEqual(['link:a.test:s1', 'link:a.test:s2']);
  });

  it('resolveLinkPixelIds: defaults when omitted, rejects foreign/unknown ids', async () => {
    const { env } = setup();
    const d = await createPixel(env, admin, meta({ is_default: true }));
    const n = await createPixel(env, admin, meta({ name: 'N', pixel_id: '2222222222' }));
    const foreign = await createPixel(env, admin, meta({ domain_id: 'd2', name: 'F' }));
    expect(await resolveLinkPixelIds(env, 'd1', undefined, { applyDefaults: true })).toEqual([d.id]);
    expect(await resolveLinkPixelIds(env, 'd1', undefined, { applyDefaults: false })).toBeUndefined();
    expect(await resolveLinkPixelIds(env, 'd1', [], { applyDefaults: true })).toEqual([]);
    expect(await resolveLinkPixelIds(env, 'd1', [n.id, n.id], { applyDefaults: true })).toEqual([n.id]);
    await expectPixelError(resolveLinkPixelIds(env, 'd1', [foreign.id], { applyDefaults: true }), 400, /domain/);
    await expectPixelError(resolveLinkPixelIds(env, 'd1', ['pxl_nope'], { applyDefaults: true }), 400, /domain/);
  });

  it('delete reports stale_links when a KV delete rejects, and still deletes the others', async () => {
    const { env, deleted } = setup();
    const p = await createPixel(env, admin, meta());
    await setLinkPixels(env, 'l1', [p.id]);
    await setLinkPixels(env, 'l2', [p.id]);
    const failing = { async delete(key: string) { if (key === 'link:a.test:s1') throw new Error('kv down'); deleted.push(key); }, async get() { return null; }, async put() {} };
    const res = await deletePixel({ ...env, CACHE: failing } as unknown as Env, admin, p.id);
    expect(res).toEqual({ affected_links: 2, stale_links: 1 });
    expect(deleted).toEqual(['link:a.test:s2']);
  });

  it('invalidateKeys attempts at most MAX_CACHE_INVALIDATIONS and counts the rest as stale', async () => {
    const { env } = setup();
    let attempts = 0;
    const kv = { async delete() { attempts++; }, async get() { return null; }, async put() {} };
    const total = MAX_CACHE_INVALIDATIONS + 20;
    const keys = Array.from({ length: total }, (_, i) => ({ domain_name: 'a.test', slug: 's' + i }));
    const stale = await invalidateKeys({ ...env, CACHE: kv } as unknown as Env, keys);
    expect(attempts).toBe(MAX_CACHE_INVALIDATIONS);
    expect(stale).toBe(20);
  });

  it('updatePixel returns stale_links 0 when no invalidation is needed', async () => {
    const { env } = setup();
    const p = await createPixel(env, admin, meta());
    const res = await updatePixel(env, admin, p.id, { name: 'Renamed' });
    expect(res.stale_links).toBe(0);
    expect(res.name).toBe('Renamed');
  });

  it('resolveLinkPixelIds caps defaults at MAX_PIXELS_PER_LINK, keeping name order', async () => {
    const { env, raw } = setup();
    for (let i = 0; i < 6; i++) {
      raw.prepare(`INSERT INTO pixel_library (id, domain_id, name, pixel_type, pixel_id, is_default, created_at, updated_at)
        VALUES (?, 'd1', ?, 'facebook', ?, 1, 1, 1)`).run('pxl_' + i, 'N' + i, '100000000' + i);
    }
    const ids = await resolveLinkPixelIds(env, 'd1', undefined, { applyDefaults: true });
    expect(ids).toEqual(['pxl_0', 'pxl_1', 'pxl_2', 'pxl_3', 'pxl_4']);
  });
});

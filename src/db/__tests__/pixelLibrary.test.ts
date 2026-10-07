/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, it, expect } from 'vitest';
import { createTestD1, seedDomain, seedLink } from '../../test-utils/sqliteD1';
import {
  createLibraryPixel, listLibraryPixels, getDefaultPixelIds, updateLibraryPixel,
  deleteLibraryPixel, getLibraryPixelsByIds, countLibraryPixels, countDefaultPixels,
} from '../pixelLibrary';
import {
  getLinkPixels, setLinkPixels, getLinkCacheKeysForPixel, attachPixelToAllLinks, detachPixelFromAllLinks,
} from '../linkPixels';

function setup() {
  const t = createTestD1();
  seedDomain(t.raw, 'd1', 'a.test');
  seedDomain(t.raw, 'd2', 'b.test');
  seedLink(t.raw, 'l1', 'd1', 's1');
  seedLink(t.raw, 'l2', 'd1', 's2');
  seedLink(t.raw, 'l3', 'd1', 'gone', 'deleted');
  seedLink(t.raw, 'l9', 'd2', 'other');
  return t;
}
const fb = (name = 'Main Meta', id = '1234567890', is_default = false) =>
  ({ domain_id: 'd1', name, pixel_type: 'facebook' as const, pixel_id: id, is_default });

describe('pixel library DB', () => {
  it('creates, lists with link_count, counts, and returns defaults by name', async () => {
    const { env } = setup();
    const a = await createLibraryPixel(env, fb('B pixel', '1111111111', true));
    const b = await createLibraryPixel(env, fb('A pixel', '2222222222', true));
    await createLibraryPixel(env, fb('C pixel', '3333333333', false));
    await setLinkPixels(env, 'l1', [a.id]);
    const list = await listLibraryPixels(env, 'd1');
    expect(list.map((p) => p.name)).toEqual(['A pixel', 'B pixel', 'C pixel']);
    expect(list.find((p) => p.id === a.id)!.link_count).toBe(1);
    expect(await countLibraryPixels(env, 'd1')).toBe(3);
    expect(await countDefaultPixels(env, 'd1')).toBe(2);
    expect(await countDefaultPixels(env, 'd1', a.id)).toBe(1);
    expect(await getDefaultPixelIds(env, 'd1')).toEqual([b.id, a.id]);
    expect(await listLibraryPixels(env, 'd2')).toEqual([]);
  });

  it('setLinkPixels replaces atomically and dedupes; getLinkPixels joins names', async () => {
    const { env } = setup();
    const a = await createLibraryPixel(env, fb('A', '1111111111'));
    const b = await createLibraryPixel(env, { ...fb('B'), pixel_type: 'ga4', pixel_id: 'G-ABCD' });
    await setLinkPixels(env, 'l1', [a.id, b.id, a.id]);
    expect((await getLinkPixels(env, 'l1')).map((p) => [p.name, p.pixel_type, p.pixel_id]))
      .toEqual([['A', 'facebook', '1111111111'], ['B', 'ga4', 'G-ABCD']]);
    await setLinkPixels(env, 'l1', []);
    expect(await getLinkPixels(env, 'l1')).toEqual([]);
  });

  it('cache keys, attach-all (skips deleted + full links), detach-all', async () => {
    const { env, raw } = setup();
    const p = await createLibraryPixel(env, fb());
    const fillers = [];
    for (let i = 0; i < 5; i++) fillers.push((await createLibraryPixel(env, fb('F' + i, '90000000' + i + '0'))).id);
    await setLinkPixels(env, 'l2', fillers); // l2 is full
    const res = await attachPixelToAllLinks(env, { id: p.id, domain_id: 'd1' }, 5);
    expect(res).toEqual({ attached: 1, skippedFull: 1 }); // l1 attached; l2 full; l3 deleted ignored; l9 other domain
    expect(await getLinkCacheKeysForPixel(env, p.id)).toEqual([{ domain_name: 'a.test', slug: 's1' }]);
    expect(await attachPixelToAllLinks(env, { id: p.id, domain_id: 'd1' }, 5)).toEqual({ attached: 0, skippedFull: 1 });
    expect(await detachPixelFromAllLinks(env, p.id)).toBe(1);
    expect(raw.prepare('SELECT COUNT(*) AS n FROM link_pixels WHERE library_pixel_id = ?').get(p.id)!.n).toBe(0);
  });

  it('update patches only given fields; delete cascades', async () => {
    const { env } = setup();
    const p = await createLibraryPixel(env, fb());
    await setLinkPixels(env, 'l1', [p.id]);
    await updateLibraryPixel(env, p.id, { name: 'Renamed', is_default: true });
    const [row] = await getLibraryPixelsByIds(env, [p.id]);
    expect([row.name, row.pixel_id, row.is_default]).toEqual(['Renamed', '1234567890', 1]);
    await deleteLibraryPixel(env, p.id);
    expect(await getLinkPixels(env, 'l1')).toEqual([]);
  });
});

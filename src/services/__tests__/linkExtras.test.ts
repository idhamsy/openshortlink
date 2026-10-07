/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, it, expect } from 'vitest';
import { saveLinkExtras } from '../linkService';
import type { Env } from '../../types';

/** Fake D1 that records every executed statement (run() and batch()). */
function fakeEnv() {
  const executed: string[] = [];
  const db = {
    prepare(sql: string) {
      return { sql, bind() { return this; }, async run() { executed.push(sql); return {}; } };
    },
    async batch(stmts: Array<{ sql: string }>) { for (const s of stmts) executed.push(s.sql); return []; },
  };
  return { env: { DB: db } as unknown as Env, executed };
}
const has = (executed: string[], re: RegExp) => executed.some((s) => re.test(s));

describe('saveLinkExtras (shared by PUT /:id and POST /bulk update)', () => {
  it('does nothing when og_meta and pixel_ids are omitted', async () => {
    const { env, executed } = fakeEnv();
    await saveLinkExtras(env, 'l1', {});
    expect(executed).toEqual([]);
  });

  it('replaces pixels when given', async () => {
    const { env, executed } = fakeEnv();
    await saveLinkExtras(env, 'l1', { pixel_ids: ['pxl_1'] });
    expect(has(executed, /DELETE FROM link_pixels/)).toBe(true);
    expect(has(executed, /INSERT INTO link_pixels/)).toBe(true);
  });

  it('clears pixels on an empty array', async () => {
    const { env, executed } = fakeEnv();
    await saveLinkExtras(env, 'l1', { pixel_ids: [] });
    expect(has(executed, /DELETE FROM link_pixels/)).toBe(true);
    expect(has(executed, /INSERT INTO link_pixels/)).toBe(false);
  });

  it('upserts og_meta with a real field, clears it when empty', async () => {
    const a = fakeEnv();
    await saveLinkExtras(a.env, 'l1', { og_meta: { og_title: 'T', og_type: 'website', twitter_card: 'summary' } });
    expect(has(a.executed, /INSERT INTO link_og_meta/)).toBe(true);
    const b = fakeEnv();
    await saveLinkExtras(b.env, 'l1', { og_meta: { og_type: 'website', twitter_card: 'summary' } });
    expect(has(b.executed, /DELETE FROM link_og_meta/)).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { createFullTestEnv, seedDomainRow, seedUser, type SqliteDb } from '../../test-utils/fullD1';
import { parseBulkRequest, runBulk, type BulkActor } from '../bulkLinks';

const admin: BulkActor = { user: { id: 'u-admin', role: 'admin' } as any };

function setup() {
  const t = createFullTestEnv();
  seedUser(t.raw, { id: 'u-admin', role: 'admin' });
  seedDomainRow(t.raw, { id: 'd1', domain_name: 'a.test', routes: ['/go/*', '/r/*'] });
  seedDomainRow(t.raw, { id: 'd2', domain_name: 'b.test' });
  return t;
}

function seedLink(raw: SqliteDb, id: string, slug: string, domainId = 'd1') {
  const now = Date.now();
  raw.prepare(
    `INSERT INTO links (id, domain_id, slug, destination_url, redirect_code, status, metadata, created_at, updated_at)
     VALUES (?, ?, ?, 'https://old.example.com/', 301, 'active', NULL, ?, ?)`
  ).run(id, domainId, slug, now, now);
}

const dest = (raw: SqliteDb, id: string) => (raw.prepare('SELECT destination_url FROM links WHERE id = ?').get(id) as any)?.destination_url;
const status = (raw: SqliteDb, id: string) => (raw.prepare('SELECT status FROM links WHERE id = ?').get(id) as any)?.status;

async function run(env: any, body: unknown, actor: BulkActor = admin) {
  const parsed = parseBulkRequest(body);
  if (!parsed.ok) throw new Error('unexpected 400: ' + parsed.message);
  return runBulk(env, actor, parsed.request);
}

describe('parseBulkRequest', () => {
  it('rejects both/neither of link_ids and items', () => {
    expect(parseBulkRequest({ action: 'update', link_ids: ['a'], items: [], updates: { title: 'x' } }).ok).toBe(false);
    expect(parseBulkRequest({ action: 'update' }).ok).toBe(false);
  });
  it('accepts 100 entries, rejects 101 in both formats', () => {
    const ids = Array.from({ length: 101 }, (_, i) => `l${i}`);
    expect(parseBulkRequest({ action: 'delete', link_ids: ids.slice(0, 100) }).ok).toBe(true);
    const r1 = parseBulkRequest({ action: 'delete', link_ids: ids });
    expect(r1).toEqual({ ok: false, message: 'Too many links: max 100 per request — split into smaller batches' });
    const r2 = parseBulkRequest({ action: 'update', items: ids.map((id) => ({ id, updates: { title: 't' } })) });
    expect(r2).toEqual({ ok: false, message: 'Too many links: max 100 per request — split into smaller batches' });
  });
  it('rejects unknown action and old update without updates', () => {
    expect(parseBulkRequest({ action: 'nuke', link_ids: ['a'] }).ok).toBe(false);
    expect(parseBulkRequest({ action: 'update', link_ids: ['a'] })).toEqual({ ok: false, message: 'updates must contain at least one field' });
    expect(parseBulkRequest({ action: 'update', link_ids: ['a'], updates: {} })).toEqual({ ok: false, message: 'updates must contain at least one field' });
  });
});

describe('runBulk items format', () => {
  it('applies different destinations per item, by id and by domain_id+slug; response carries index/id/slug', async () => {
    const { env, raw } = setup();
    seedLink(raw, 'l1', 's1');
    seedLink(raw, 'l2', 's2');
    const res = await run(env, {
      action: 'update',
      items: [
        { id: 'l1', updates: { destination_url: 'https://one.example.com/' } },
        { domain_id: 'd1', slug: 's2', updates: { destination_url: 'https://two.example.com/' } },
      ],
    });
    expect(res).toEqual([
      { index: 0, id: 'l1', slug: 's1', success: true },
      { index: 1, id: 'l2', slug: 's2', success: true },
    ]);
    expect(dest(raw, 'l1')).toBe('https://one.example.com/');
    expect(dest(raw, 'l2')).toBe('https://two.example.com/');
  });

  it('item errors do not abort: bad target, empty updates, invalid/loop destination, not found', async () => {
    const { env, raw } = setup();
    seedLink(raw, 'l1', 's1');
    seedLink(raw, 'l2', 's2');
    seedLink(raw, 'l3', 's3');
    const res = await run(env, {
      action: 'update',
      items: [
        { id: 'l1', domain_id: 'd1', slug: 's1', updates: { title: 'x' } },
        { updates: { title: 'x' } },
        { id: 'l1', updates: {} },
        { id: 'l1', updates: { destination_url: 'not a url' } },
        { id: 'l1', updates: { destination_url: 'https://a.test/go/loop' } },
        { id: 'nope', updates: { title: 'x' } },
        { domain_id: 'd1', slug: 'nope', updates: { title: 'x' } },
        { id: 'l3', updates: { destination_url: 'https://ok.example.com/' } },
      ],
    });
    expect(res.map((r: any) => r.success)).toEqual([false, false, false, false, false, false, false, true]);
    expect(res[0].error).toMatch(/either/i);
    expect(res[1].error).toMatch(/either/i);
    expect(res[2].error).toBe('updates must contain at least one field');
    expect(res[3].error).toBeTruthy();
    expect(res[4].error).toMatch(/infinite redirect loop/);
    expect(res[5].error).toBe('Link not found');
    expect(res[6].error).toBe('Link not found');
    expect(dest(raw, 'l1')).toBe('https://old.example.com/');
    expect(dest(raw, 'l3')).toBe('https://ok.example.com/');
  });

  it('foreign-domain slug with non-admin user yields access error, not Link not found', async () => {
    const { env, raw } = setup();
    seedUser(raw, { id: 'u2', role: 'user' });
    seedLink(raw, 'l1', 's1');
    const res = await run(env, { action: 'update', items: [{ domain_id: 'd1', slug: 's1', updates: { title: 'x' } }, { domain_id: 'd1', slug: 'zzz', updates: { title: 'x' } }] },
      { user: { id: 'u2', role: 'user' } as any });
    expect(res[0].error).toBe('Access denied. You do not have access to this domain.');
    expect(res[1].error).toBe('Access denied. You do not have access to this domain.');
  });

  it('API key scoped elsewhere gets Domain not on scope for slug and id targets', async () => {
    const { env, raw } = setup();
    seedLink(raw, 'l1', 's1');
    const actor: BulkActor = { apiKey: { domain_ids: ['d2'] } as any };
    const res = await run(env, { action: 'update', items: [{ domain_id: 'd1', slug: 's1', updates: { title: 'x' } }, { id: 'l1', updates: { title: 'x' } }] }, actor);
    expect(res.map((r: any) => r.error)).toEqual(['Domain not on scope', 'Domain not on scope']);
  });

  it('deletes the KV cache key after update, including status: deleted', async () => {
    const { env, raw, kv } = setup();
    seedLink(raw, 'l1', 's1');
    seedLink(raw, 'l2', 's2');
    kv.set('link:a.test:s1', '{"stale":true}');
    kv.set('link:a.test:s2', '{"stale":true}');
    await run(env, { action: 'update', items: [
      { id: 'l1', updates: { destination_url: 'https://n.example.com/' } },
      { id: 'l2', updates: { status: 'deleted' } },
    ] });
    expect(kv.has('link:a.test:s1')).toBe(false);
    expect(kv.has('link:a.test:s2')).toBe(false);
    expect(status(raw, 'l2')).toBe('deleted');
  });

  it('delete by slug soft-deletes and clears cache; second delete is Link not found', async () => {
    const { env, raw, kv } = setup();
    seedLink(raw, 'l1', 's1');
    kv.set('link:a.test:s1', '{"stale":true}');
    const res = await run(env, { action: 'delete', items: [{ domain_id: 'd1', slug: 's1' }, { domain_id: 'd1', slug: 's1' }] });
    expect(res).toEqual([
      { index: 0, id: 'l1', slug: 's1', success: true },
      { index: 1, id: undefined, slug: 's1', success: false, error: 'Link not found' },
    ]);
    expect(status(raw, 'l1')).toBe('deleted');
    expect(kv.has('link:a.test:s1')).toBe(false);
  });

  it('duplicate targets apply in order (last write wins)', async () => {
    const { env, raw } = setup();
    seedLink(raw, 'l1', 's1');
    await run(env, { action: 'update', items: [
      { id: 'l1', updates: { destination_url: 'https://first.example.com/' } },
      { domain_id: 'd1', slug: 's1', updates: { destination_url: 'https://last.example.com/' } },
    ] });
    expect(dest(raw, 'l1')).toBe('https://last.example.com/');
  });
});

describe('call budget', () => {
  it('100 items (destination + tags) stay within 600 calls', async () => {
    const { env, raw, calls } = setup();
    const now = Date.now();
    raw.prepare('INSERT INTO tags (id, name, domain_id, created_at) VALUES (?, ?, ?, ?)').run('t1', 'one', 'd1', now);
    raw.prepare('INSERT INTO tags (id, name, domain_id, created_at) VALUES (?, ?, ?, ?)').run('t2', 'two', 'd1', now);
    const items: unknown[] = [];
    for (let i = 0; i < 100; i++) {
      seedLink(raw, `l${i}`, `s${i}`);
      items.push({ domain_id: 'd1', slug: `s${i}`, updates: { destination_url: `https://h${i}.example.com/p`, tags: ['t1', 't2'] } });
    }
    calls.reset();
    const res = await run(env, { action: 'update', items });
    expect(res.every((r: any) => r.success)).toBe(true);
    expect(calls.count).toBeLessThanOrEqual(600);
    expect(dest(raw, 'l99')).toBe('https://h99.example.com/p');
    expect((raw.prepare('SELECT COUNT(*) AS n FROM link_tags').get() as any).n).toBe(200);
  });
});

describe('final-review fixes', () => {
  const loopMsg = 'Destination URL cannot point to a reserved route on a managed domain (infinite redirect loop).';

  it('loop guard checks the path per item, not per host (ok path then reserved path)', async () => {
    const { env, raw } = setup();
    seedLink(raw, 'l1', 's1');
    seedLink(raw, 'l2', 's2');
    const res: any[] = await run(env, { action: 'update', items: [
      { id: 'l1', updates: { destination_url: 'https://a.test/ok' } },
      { id: 'l2', updates: { destination_url: 'https://a.test/go/x' } },
    ] });
    expect(res[0].success).toBe(true);
    expect(res[1].error).toBe(loopMsg);
    expect(dest(raw, 'l2')).toBe('https://old.example.com/');
  });

  it('loop guard checks the path per item (reserved path then ok path)', async () => {
    const { env, raw } = setup();
    seedLink(raw, 'l1', 's1');
    seedLink(raw, 'l2', 's2');
    const res: any[] = await run(env, { action: 'update', items: [
      { id: 'l1', updates: { destination_url: 'https://a.test/go/x' } },
      { id: 'l2', updates: { destination_url: 'https://a.test/ok' } },
    ] });
    expect(res[0].error).toBe(loopMsg);
    expect(res[1].success).toBe(true);
    expect(dest(raw, 'l1')).toBe('https://old.example.com/');
    expect(dest(raw, 'l2')).toBe('https://a.test/ok');
  });

  it('items mode: updates with only unknown keys is an item error, nothing written, cache kept', async () => {
    const { env, raw, kv } = setup();
    seedLink(raw, 'l1', 's1');
    kv.set('link:a.test:s1', '{"stale":true}');
    const res: any[] = await run(env, { action: 'update', items: [{ id: 'l1', updates: { destination: 'https://x.example.com/' } }] });
    expect(res[0].success).toBe(false);
    expect(res[0].error).toBe('updates must contain at least one field');
    expect(dest(raw, 'l1')).toBe('https://old.example.com/');
    expect(kv.has('link:a.test:s1')).toBe(true);
  });

  it('link_ids mode: updates with only unknown keys is a 400-style parse error', () => {
    expect(parseBulkRequest({ action: 'update', link_ids: ['a'], updates: { destination: 'https://x.example.com/' } }))
      .toEqual({ ok: false, message: 'updates must contain at least one field' });
  });

  it('a D1 failure (unknown tag id) errors that item only; others succeed', async () => {
    const { env, raw } = setup();
    seedLink(raw, 'l1', 's1');
    seedLink(raw, 'l2', 's2');
    seedLink(raw, 'l3', 's3');
    const res: any[] = await run(env, { action: 'update', items: [
      { id: 'l1', updates: { destination_url: 'https://one.example.com/' } },
      { id: 'l2', updates: { tags: ['no-such-tag'] } },
      { id: 'l3', updates: { destination_url: 'https://three.example.com/' } },
    ] });
    expect(res[0].success).toBe(true);
    expect(res[1].success).toBe(false);
    expect(res[1].error).toBe('Update failed due to an internal error — please retry');
    expect(res[1].error).not.toMatch(/FOREIGN KEY|constraint|link_tags/i);
    expect(res[2].success).toBe(true);
    expect(dest(raw, 'l3')).toBe('https://three.example.com/');
  });

  it('KV delete failure is retried once, then reported as cache-refresh item error (data saved)', async () => {
    const { env, raw } = setup();
    seedLink(raw, 'l1', 's1');
    let attempts = 0;
    (env as any).CACHE.delete = async () => { attempts++; throw new Error('kv down'); };
    const res: any[] = await run(env, { action: 'update', items: [{ id: 'l1', updates: { destination_url: 'https://n.example.com/' } }] });
    expect(attempts).toBe(2);
    expect(res[0].success).toBe(false);
    expect(res[0].error).toBe('Saved, but cache refresh failed — changes may take up to 7 days');
    expect(dest(raw, 'l1')).toBe('https://n.example.com/');
  });

  it('KV delete failure on delete action is retried once then reported', async () => {
    const { env, raw } = setup();
    seedLink(raw, 'l1', 's1');
    let attempts = 0;
    (env as any).CACHE.delete = async () => { attempts++; throw new Error('kv down'); };
    const res: any[] = await run(env, { action: 'delete', items: [{ id: 'l1' }] });
    expect(attempts).toBe(2);
    expect(res[0].error).toBe('Saved, but cache refresh failed — changes may take up to 7 days');
    expect(status(raw, 'l1')).toBe('deleted');
  });

  it('legacy link_ids with null / non-string entries yield Link not found', async () => {
    const { env, raw } = setup();
    seedLink(raw, 'l1', 's1');
    const res: any[] = await run(env, { action: 'delete', link_ids: [null, 5, 'l1'] });
    expect(res.map((r) => r.error)).toEqual(['Link not found', 'Link not found', undefined]);
    expect(res[2].success).toBe(true);
  });

  it('a failing delete reports a generic error without leaking DB details', async () => {
    const { env, raw } = setup();
    seedLink(raw, 'l1', 's1');
    const db: any = (env as any).DB;
    const orig = db.prepare.bind(db);
    db.prepare = (sql: string) => {
      if (/^\s*UPDATE\s+links/i.test(sql)) throw new Error('D1_ERROR: no such column: secret_col in table links');
      return orig(sql);
    };
    const res: any[] = await run(env, { action: 'delete', items: [{ id: 'l1' }] });
    expect(res[0].success).toBe(false);
    expect(res[0].error).toBe('Delete failed due to an internal error — please retry');
    expect(res[0].error).not.toMatch(/secret_col|D1_ERROR|links/);
  });
});

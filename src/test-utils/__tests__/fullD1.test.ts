import { describe, it, expect } from 'vitest';
import { createFullTestEnv, seedDomainRow, seedUser } from '../fullD1';

describe('createFullTestEnv', () => {
  it('applies all migrations', () => {
    const { raw } = createFullTestEnv();
    const names = (raw.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map((r) => r.name);
    for (const t of ['links', 'tags', 'link_tags', 'categories', 'link_geo_redirects', 'link_device_redirects',
      'link_city_redirects', 'link_os_redirects', 'link_og_meta', 'pixel_library', 'link_pixels']) {
      expect(names).toContain(t);
    }
  });

  it('counts prepare, batch (once) and KV calls; reset zeroes', async () => {
    const { env, calls, kv } = createFullTestEnv();
    await env.DB.prepare('SELECT 1').run();
    await env.DB.batch([env.DB.prepare('SELECT 1'), env.DB.prepare('SELECT 2')]);
    await env.CACHE.put('k', JSON.stringify({ a: 1 }));
    expect(calls.count).toBe(3);
    expect(kv.get('k')).toBe('{"a":1}');
    expect(await env.CACHE.get('k', { type: 'json' })).toEqual({ a: 1 });
    expect(await env.CACHE.get('k')).toBe('{"a":1}');
    await env.CACHE.delete('k');
    expect(kv.has('k')).toBe(false);
    calls.reset();
    expect(calls.count).toBe(0);
  });

  it('seed helpers insert valid rows without counting', async () => {
    const { env, raw, calls } = createFullTestEnv();
    seedUser(raw, { id: 'u1', role: 'admin' });
    seedDomainRow(raw, { id: 'd1', domain_name: 'a.test', routes: ['/go/*', '/r/*'] });
    expect(calls.count).toBe(0);
    const d = await env.DB.prepare('SELECT routing_path, settings FROM domains WHERE id = ?').bind('d1').first<{ routing_path: string; settings: string }>();
    expect(d!.routing_path).toBe('/go/*');
    expect(JSON.parse(d!.settings).routes).toEqual(['/go/*', '/r/*']);
  });
});

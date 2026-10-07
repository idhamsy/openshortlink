import { describe, it, expect } from 'vitest';
import { createFullTestEnv, seedDomainRow } from '../../test-utils/fullD1';
import {
  buildLinkInsertStatement, buildLinkUpdateStatement, getLinkById, getLinkBySlug,
  getLinkBySlugIncludingDeleted, createLink, updateLink, deleteLink, SlugConflictError,
} from '../links';
import { buildSetLinkTagsStatements, setLinkTags } from '../tags';
import {
  buildUpsertGeoRedirectStatement, buildUpsertDeviceRedirectStatement, buildUpsertCityRedirectStatement,
  buildUpsertOsRedirectStatement, buildClearRedirectsStatements,
  getGeoRedirects, getDeviceRedirects, getCityRedirects, getOsRedirects,
} from '../linkRedirects';
import { buildUpsertOgMetaStatement, buildClearOgMetaStatement, getOgMeta } from '../linkOgMeta';
import { buildSetLinkPixelsStatements, getLinkPixels, setLinkPixels } from '../linkPixels';

const base = (slug: string) => ({
  domain_id: 'd1', slug, destination_url: 'https://example.com/a', redirect_code: 301 as const,
  status: 'active' as const,
}) as any;

function setup() {
  const t = createFullTestEnv();
  seedDomainRow(t.raw, { id: 'd1', domain_name: 'a.test' });
  return t;
}

describe('batch statement builders', () => {
  it('link insert builder does not execute; batch persists row', async () => {
    const { env, calls } = setup();
    const { statement, row } = buildLinkInsertStatement(env, base('abc'));
    expect(calls.count).toBe(0);
    expect(row.id).toMatch(/^link_/);
    await env.DB.batch([statement]);
    const got = await getLinkById(env, row.id);
    expect(got?.slug).toBe('abc');
    expect(got?.created_at).toBe(row.created_at);
  });

  it('createLink maps unique conflict to SlugConflictError', async () => {
    const { env } = setup();
    await createLink(env, base('dup'));
    await expect(createLink(env, base('dup'))).rejects.toBeInstanceOf(SlugConflictError);
  });

  it('update builder changes only given fields', async () => {
    const { env } = setup();
    const l = await createLink(env, { ...base('u1'), title: 'T' });
    await env.DB.batch([buildLinkUpdateStatement(env, l.id, { destination_url: 'https://new.com' })]);
    const got = await getLinkById(env, l.id);
    expect(got?.destination_url).toBe('https://new.com');
    expect(got?.title).toBe('T');
    const viaFn = await updateLink(env, l.id, { title: 'T2' });
    expect(viaFn?.title).toBe('T2');
    expect(viaFn?.destination_url).toBe('https://new.com');
  });

  it('tags builder replaces set; setLinkTags uses one batch', async () => {
    const { env, raw, calls } = setup();
    const l = await createLink(env, base('t1'));
    for (const id of ['tg1', 'tg2', 'tg3'])
      raw.prepare('INSERT INTO tags (id, name, domain_id, created_at) VALUES (?, ?, ?, ?)').run(id, id, 'd1', 1);
    await env.DB.batch(buildSetLinkTagsStatements(env, l.id, ['tg1', 'tg2']));
    const ids = () => (raw.prepare('SELECT tag_id FROM link_tags WHERE link_id = ? ORDER BY tag_id').all(l.id) as any[]).map((r) => r.tag_id);
    expect(ids()).toEqual(['tg1', 'tg2']);
    calls.count = 0;
    await setLinkTags(env, l.id, ['tg3']);
    expect(calls.count).toBe(1);
    expect(ids()).toEqual(['tg3']);
  });

  it('redirect upsert builders use correct casing and upsert', async () => {
    const { env } = setup();
    const l = await createLink(env, base('r1'));
    await env.DB.batch([
      buildUpsertGeoRedirectStatement(env, l.id, 'us', 'https://us.com'),
      buildUpsertDeviceRedirectStatement(env, l.id, 'mobile', 'https://m.com'),
      buildUpsertCityRedirectStatement(env, l.id, 'Jakarta', 'https://j.com'),
      buildUpsertOsRedirectStatement(env, l.id, 'ios', 'https://i.com'),
    ]);
    await env.DB.batch([buildUpsertGeoRedirectStatement(env, l.id, 'US', 'https://us2.com')]);
    const geo = await getGeoRedirects(env, l.id);
    expect(geo.map((g) => [g.country_code, g.destination_url])).toEqual([['US', 'https://us2.com']]);
    expect((await getCityRedirects(env, l.id))[0].city_name).toBe('jakarta');
    expect(await getDeviceRedirects(env, l.id)).toHaveLength(1);
    expect(await getOsRedirects(env, l.id)).toHaveLength(1);
  });

  it('clear builder empties chosen kinds only', async () => {
    const { env } = setup();
    const l = await createLink(env, base('r2'));
    await env.DB.batch([
      buildUpsertGeoRedirectStatement(env, l.id, 'US', 'https://us.com'),
      buildUpsertDeviceRedirectStatement(env, l.id, 'mobile', 'https://m.com'),
      buildUpsertCityRedirectStatement(env, l.id, 'x', 'https://j.com'),
      buildUpsertOsRedirectStatement(env, l.id, 'ios', 'https://i.com'),
    ]);
    await env.DB.batch(buildClearRedirectsStatements(env, l.id, ['geo', 'os']));
    expect(await getGeoRedirects(env, l.id)).toHaveLength(0);
    expect(await getOsRedirects(env, l.id)).toHaveLength(0);
    expect(await getDeviceRedirects(env, l.id)).toHaveLength(1);
    expect(await getCityRedirects(env, l.id)).toHaveLength(1);
  });

  it('og builders upsert and clear', async () => {
    const { env } = setup();
    const l = await createLink(env, base('og1'));
    await env.DB.batch([buildUpsertOgMetaStatement(env, l.id, { og_title: 'Hi' })]);
    await env.DB.batch([buildUpsertOgMetaStatement(env, l.id, { og_title: 'Yo', og_type: 'article' })]);
    const m = await getOgMeta(env, l.id);
    expect([m?.og_title, m?.og_type, m?.twitter_card]).toEqual(['Yo', 'article', 'summary_large_image']);
    await env.DB.batch([buildClearOgMetaStatement(env, l.id)]);
    expect(await getOgMeta(env, l.id)).toBeNull();
  });

  it('pixel builder replaces attachments, drops duplicates', async () => {
    const { env, raw } = setup();
    const l = await createLink(env, base('px1'));
    const now = Date.now();
    for (const id of ['p1', 'p2'])
      raw.prepare(`INSERT INTO pixel_library (id, domain_id, name, pixel_type, pixel_id, is_default, created_at, updated_at) VALUES (?, 'd1', ?, 'facebook', ?, 0, ?, ?)`).run(id, id, `12345678${id}`, now, now);
    await env.DB.batch(buildSetLinkPixelsStatements(env, l.id, ['p1', 'p1', 'p2']));
    expect((await getLinkPixels(env, l.id)).map((p) => p.id)).toEqual(['p1', 'p2']);
    await setLinkPixels(env, l.id, ['p2']);
    expect((await getLinkPixels(env, l.id)).map((p) => p.id)).toEqual(['p2']);
  });

  it('getLinkBySlugIncludingDeleted returns soft-deleted row', async () => {
    const { env } = setup();
    const l = await createLink(env, base('gone'));
    await deleteLink(env, l.id);
    expect(await getLinkBySlug(env, 'd1', 'gone')).toBeNull();
    expect((await getLinkBySlugIncludingDeleted(env, 'd1', 'gone'))?.status).toBe('deleted');
    expect(await getLinkBySlugIncludingDeleted(env, 'd1', 'nope')).toBeNull();
  });
});

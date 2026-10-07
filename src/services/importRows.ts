/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// CSV import row processing. Each row is written in ONE env.DB.batch (atomic) so a
// 100-row chunk stays inside the per-invocation D1/KV call budget.

import type { Env, Domain, Link, User, ApiKeyContext, CachedLink } from '../types';
import { generateSlug } from '../utils/id';
import { isValidUrl, isValidSlug, normalizeUrl, isReservedSlug, sanitizeHtml } from '../utils/validation';
import { isInfiniteRedirect } from '../utils/domains';
import { getEffectiveLinkRoute } from '../utils/route';
import { canAccessDomain } from '../utils/permissions';
import {
  buildLinkInsertStatement,
  buildLinkUpdateStatement,
  checkSlugExists,
  getLinkBySlugIncludingDeleted,
} from '../db/links';
import {
  buildUpsertGeoRedirectStatement,
  buildUpsertDeviceRedirectStatement,
  buildUpsertCityRedirectStatement,
  buildUpsertOsRedirectStatement,
} from '../db/linkRedirects';
import { buildSetLinkTagsStatements, listTags, createTag, getTagById } from '../db/tags';
import { listCategories, createCategory, getCategoryById } from '../db/categories';
import { buildSetLinkPixelsStatements } from '../db/linkPixels';
import { getLibraryPixelsByIds } from '../db/pixelLibrary';
import { resolveLinkPixelIds } from './pixelLibrary';
import { composeCachedLink, type CachedLinkParts } from './linkService';
import { setCachedLink, deleteCachedLink } from './cache';

export type OnExisting = 'skip' | 'error' | 'update';

export interface ImportActor {
  user?: User;
  apiKey?: ApiKeyContext;
}

export interface RowResult {
  row: number;
  success: boolean;
  action: 'created' | 'updated' | 'skipped' | 'error';
  slug?: string;
  error?: string;
}

export interface ImportContext {
  domain: Domain;
  actor: ImportActor;
  onExisting: OnExisting;
  columnMapping: Record<string, string>;
}

export interface ImportSummary {
  results: RowResult[];
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

const MAX_NAME = 50; // matches createTagSchema / createCategorySchema
const MAX_TAGS = 10;
const DELETED_SLUG_MESSAGE = 'Slug belongs to a deleted link — restore or hard-delete it first';
const COUNTRY_CODES = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'JP', 'CN', 'IN', 'BR', 'MX', 'RU', 'KR', 'ID', 'TR', 'SA', 'ZA'];

/** Access check used by the import handler: session users via canAccessDomain, API keys via domain_ids scope. */
export async function canImportToDomain(env: Env, actor: ImportActor, domainId: string): Promise<boolean> {
  if (actor.apiKey && actor.apiKey.domain_ids && actor.apiKey.domain_ids.length > 0) {
    if (!actor.apiKey.domain_ids.includes(domainId)) return false;
  }
  if (actor.user) {
    return canAccessDomain(env, actor.user, domainId);
  }
  return true;
}

interface RowFields {
  destinationUrl?: string;
  slug?: string;
  title?: string;
  description?: string;
  tagsStr?: string;
  route?: string;
  categoryId?: string;
  redirectCodeStr?: string;
}

function extractFields(row: Record<string, string>, mapping: Record<string, string>): RowFields {
  const f: RowFields = {
    destinationUrl: row['destination_url'] || row['url'] || row['link'] || row['target'],
    slug: row['slug'] || row['alias'] || row['short_url'] || row['keyword'],
    title: row['title'] || row['name'],
    description: row['description'] || row['desc'],
    tagsStr: row['tags'] || row['tag'],
    route: row['route'] || row['path_prefix'],
    categoryId: row['category_id'] || row['category'],
    redirectCodeStr: row['redirect_code'],
  };
  // Mapping format: { "csv_header": "field_name" }
  for (const [csvHeader, fieldName] of Object.entries(mapping)) {
    if (row[csvHeader] === undefined) continue;
    if (fieldName === 'destination_url') f.destinationUrl = row[csvHeader];
    else if (fieldName === 'slug') f.slug = row[csvHeader];
    else if (fieldName === 'title') f.title = row[csvHeader];
    else if (fieldName === 'description') f.description = row[csvHeader];
    else if (fieldName === 'tags') f.tagsStr = row[csvHeader];
    else if (fieldName === 'route') f.route = row[csvHeader];
    else if (fieldName === 'category_id') f.categoryId = row[csvHeader];
    else if (fieldName === 'redirect_code') f.redirectCodeStr = row[csvHeader];
  }
  return f;
}

interface Rules {
  geo: Map<string, string>; // UPPER country code
  device: Map<'desktop' | 'mobile' | 'tablet', string>;
  city: Map<string, string>; // lower-case city
  os: Map<'android' | 'ios', string>;
}

/** Detects redirect-rule columns (geo/device/city/OS) via column mapping or header auto-detection. */
function collectRules(row: Record<string, string>, mapping: Record<string, string>): Rules {
  const rules: Rules = { geo: new Map(), device: new Map(), city: new Map(), os: new Map() };
  for (const [key, value] of Object.entries(row)) {
    if (!value || key === 'destination_url' || key === 'slug' || key === 'title' || key === 'description' || key === 'tags') continue;
    if (!isValidUrl(value)) continue;

    const mappedType = mapping[key];
    let countryCode: string | null = null;
    let deviceType: string | null = null;
    let cityName: string | null = null;
    let osType: string | null = null;

    if (mappedType) {
      if (mappedType.startsWith('geo:')) countryCode = mappedType.split(':')[1];
      else if (mappedType.startsWith('city:') || mappedType.startsWith('city_redirect:')) cityName = mappedType.substring(mappedType.indexOf(':') + 1);
      else if (mappedType.startsWith('os:') || mappedType.startsWith('os_redirect:')) osType = mappedType.substring(mappedType.indexOf(':') + 1).toLowerCase();
      else if (mappedType.startsWith('device_redirect:')) deviceType = mappedType.substring('device_redirect:'.length);
      else if (mappedType === 'mobile' || mappedType === 'desktop' || mappedType === 'tablet') deviceType = mappedType;
    } else {
      const lk = key.toLowerCase();
      if (COUNTRY_CODES.includes(key.toUpperCase())) countryCode = key.toUpperCase();
      else if (lk.includes('united states') || lk === 'us') countryCode = 'US';
      else if (lk.includes('united kingdom') || lk === 'uk') countryCode = 'GB';
      else if (lk.includes('mobile')) deviceType = 'mobile';
      else if (lk.includes('desktop')) deviceType = 'desktop';
      else if (lk.includes('tablet')) deviceType = 'tablet';
    }

    if (countryCode) rules.geo.set(countryCode.toUpperCase(), value);
    else if (deviceType === 'mobile' || deviceType === 'desktop' || deviceType === 'tablet') rules.device.set(deviceType, value);
    else if (cityName) rules.city.set(cityName.toLowerCase(), value);
    else if (osType === 'android' || osType === 'ios') rules.os.set(osType, value);
  }
  return rules;
}

function ruleStatements(env: Env, linkId: string, rules: Rules): D1PreparedStatement[] {
  const st: D1PreparedStatement[] = [];
  for (const [cc, url] of rules.geo) st.push(buildUpsertGeoRedirectStatement(env, linkId, cc, url));
  for (const [d, url] of rules.device) st.push(buildUpsertDeviceRedirectStatement(env, linkId, d, url));
  for (const [city, url] of rules.city) st.push(buildUpsertCityRedirectStatement(env, linkId, city, url));
  for (const [os, url] of rules.os) st.push(buildUpsertOsRedirectStatement(env, linkId, os, url));
  return st;
}

/** Rules in cache shape, ordered like the DB's ORDER BY reads so JSON matches buildCachedLink. */
function rulesToCacheParts(rules: Rules): CachedLinkParts {
  const sortedEntries = <V,>(m: Map<string, V>) => [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return {
    geo: rules.geo.size ? Object.fromEntries(sortedEntries(rules.geo)) : undefined,
    device: rules.device.size
      ? { desktop: rules.device.get('desktop'), mobile: rules.device.get('mobile'), tablet: rules.device.get('tablet') }
      : undefined,
    city: rules.city.size
      ? sortedEntries(rules.city).map(([city_name, destination_url]) => ({ city_name, destination_url }))
      : undefined,
    os: rules.os.size ? { android: rules.os.get('android'), ios: rules.os.get('ios') } : undefined,
  };
}

function parseRedirectCode(raw: string | undefined): number | undefined {
  if (raw === undefined || String(raw).trim() === '') return undefined;
  const parsed = parseInt(String(raw).trim(), 10);
  if (![301, 302, 307, 308].includes(parsed)) {
    throw new Error(`Invalid redirect code: ${raw} (allowed: 301, 302, 307, 308)`);
  }
  return parsed;
}

function splitTags(tagsStr: string | undefined): string[] {
  if (!tagsStr) return [];
  return tagsStr.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
}

export async function importRows(
  env: Env,
  ctx: ImportContext,
  rows: Record<string, string>[]
): Promise<ImportSummary> {
  const { domain, actor, onExisting, columnMapping } = ctx;
  const domainId = domain.id;

  // ---- per-request memo / lazily loaded lists ----
  const domainMemo = new Map<string, Domain | null>();
  const loopCheck = (url: string) => isInfiniteRedirect(env, url, domainMemo);

  // Tag name→id (reused across rows; new tags are added so repeated names map to one tag).
  const tagNameToId = new Map<string, string>();
  const knownTagIds = new Set<string>();
  for (const t of await listTags(env, { domainId })) {
    if (t.name) tagNameToId.set(t.name.toLowerCase(), t.id);
    knownTagIds.add(t.id);
  }
  const resolveTagIds = async (values: string[]): Promise<string[]> => {
    const ids: string[] = [];
    for (const value of values) {
      if (knownTagIds.has(value)) { ids.push(value); continue; }
      if (value.startsWith('tag_') && (await getTagById(env, value))) {
        knownTagIds.add(value);
        ids.push(value);
        continue;
      }
      if (value.length > MAX_NAME) throw new Error(`Tag name too long (max ${MAX_NAME}): ${value}`);
      const key = value.toLowerCase();
      let id = tagNameToId.get(key);
      if (!id) {
        const created = await createTag(env, { name: value, domain_id: domainId });
        id = created.id;
        tagNameToId.set(key, id);
        knownTagIds.add(id);
      }
      ids.push(id);
    }
    return [...new Set(ids)];
  };

  const catNameToId = new Map<string, string>();
  const knownCatIds = new Set<string>();
  for (const cat of await listCategories(env, { domainId })) {
    if (cat.name) catNameToId.set(cat.name.toLowerCase(), cat.id);
    knownCatIds.add(cat.id);
  }
  const resolveCategoryId = async (value: string): Promise<string> => {
    if (knownCatIds.has(value)) return value;
    if (value.startsWith('cat_') && (await getCategoryById(env, value))) {
      knownCatIds.add(value);
      return value;
    }
    if (value.length > MAX_NAME) throw new Error(`Category name too long (max ${MAX_NAME}): ${value}`);
    const key = value.toLowerCase();
    let id = catNameToId.get(key);
    if (!id) {
      const created = await createCategory(env, { name: value, domain_id: domainId });
      id = created.id;
      catNameToId.set(key, id);
      knownCatIds.add(id);
    }
    return id;
  };

  // Default pixels: resolved once, on the first create.
  let defaultPixels: { ids: string[]; cache: NonNullable<CachedLink['pixels']> } | undefined;
  const getDefaultPixels = async () => {
    if (!defaultPixels) {
      const ids = (await resolveLinkPixelIds(env, domainId, undefined, { applyDefaults: true })) ?? [];
      const libs = (await getLibraryPixelsByIds(env, ids)).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      defaultPixels = { ids, cache: libs.map((p) => ({ pixel_type: p.pixel_type, pixel_id: p.pixel_id })) };
    }
    return defaultPixels;
  };

  const createdBy = actor.user?.id ?? actor.apiKey?.user_id;

  /** Validates + normalizes a destination URL (incl. loop check). */
  const checkDestination = async (raw: string): Promise<string> => {
    let url = raw;
    if (!isValidUrl(url)) {
      if (isValidUrl('http://' + url)) url = 'http://' + url;
      else throw new Error('Invalid destination URL');
    }
    url = normalizeUrl(url);
    if (await loopCheck(url)) {
      throw new Error('Destination URL cannot point to a reserved route on a managed domain (infinite redirect loop).');
    }
    return url;
  };

  const checkRoute = (route: string | undefined) => {
    if (route && (!domain.routes || !domain.routes.includes(route))) {
      throw new Error(`Invalid route: ${route}`);
    }
  };

  const createRow = async (f: RowFields, row: Record<string, string>, slugIn: string | undefined): Promise<RowResult> => {
    // (index filled by caller)
    const redirectCode = parseRedirectCode(f.redirectCodeStr) ?? 301;
    if (!f.destinationUrl) throw new Error('Missing destination URL');
    const destinationUrl = await checkDestination(f.destinationUrl);
    checkRoute(f.route);
    const effectiveRoute = getEffectiveLinkRoute(domain, f.route);

    let slug = slugIn;
    if (!slug) {
      slug = generateSlug(8);
      let attempts = 0;
      while ((await checkSlugExists(env, domainId, slug)) && attempts < 10) {
        slug = generateSlug(8);
        attempts++;
      }
      if (attempts >= 10) throw new Error('Failed to generate unique slug');
    }

    const tagValues = splitTags(f.tagsStr);
    if (tagValues.length > MAX_TAGS) throw new Error(`Too many tags: max ${MAX_TAGS} per link`);
    const rules = collectRules(row, columnMapping);
    const defaults = await getDefaultPixels();

    // Resolve category/tags AFTER all pre-insert validation so a failing row creates no strays.
    const categoryId = f.categoryId ? await resolveCategoryId(f.categoryId) : undefined;
    const tagIds = tagValues.length > 0 ? await resolveTagIds(tagValues) : [];

    const { statement, row: linkRow } = buildLinkInsertStatement(env, {
      domain_id: domainId,
      slug,
      destination_url: destinationUrl,
      title: f.title ? sanitizeHtml(f.title) : undefined,
      description: f.description ? sanitizeHtml(f.description) : undefined,
      redirect_code: redirectCode,
      status: 'active',
      click_count: 0,
      unique_visitors: 0,
      category_id: categoryId,
      metadata: effectiveRoute ? JSON.stringify({ route: effectiveRoute }) : undefined,
      created_by: createdBy,
    });

    const statements: D1PreparedStatement[] = [statement];
    if (tagIds.length > 0) statements.push(...buildSetLinkTagsStatements(env, linkRow.id, tagIds));
    statements.push(...ruleStatements(env, linkRow.id, rules));
    if (defaults.ids.length > 0) statements.push(...buildSetLinkPixelsStatements(env, linkRow.id, defaults.ids));

    try {
      await env.DB.batch(statements);
    } catch (err) {
      if (/UNIQUE constraint failed/i.test(err instanceof Error ? err.message : String(err))) {
        throw new Error('Slug already exists');
      }
      throw err;
    }

    const cached = composeCachedLink(linkRow, domain, {
      ...rulesToCacheParts(rules),
      og_meta: undefined,
      pixels: defaults.cache.length > 0 ? defaults.cache : undefined,
    });
    try {
      await setCachedLink(env, domain.domain_name, linkRow.slug, cached);
    } catch (err) {
      // Data is saved; the redirect cache-miss path rebuilds the entry on first click.
      console.error('Import: cache write failed for', linkRow.slug, err);
    }
    return { row: -1, success: true, action: 'created', slug: linkRow.slug };
  };

  const updateRow = async (f: RowFields, row: Record<string, string>, existing: Link): Promise<RowResult> => {
    const updates: Partial<Omit<Link, 'id' | 'created_at' | 'domain_id' | 'slug'>> = {};

    const redirectCode = parseRedirectCode(f.redirectCodeStr);
    if (redirectCode !== undefined) updates.redirect_code = redirectCode;
    if (f.destinationUrl) updates.destination_url = await checkDestination(f.destinationUrl);
    if (f.route) {
      checkRoute(f.route);
      let meta: Record<string, unknown> = {};
      try { meta = JSON.parse(existing.metadata || '{}') || {}; } catch { meta = {}; }
      updates.metadata = JSON.stringify({ ...meta, route: f.route });
    }
    if (f.title) updates.title = sanitizeHtml(f.title);
    if (f.description) updates.description = sanitizeHtml(f.description);

    const tagValues = splitTags(f.tagsStr);
    if (tagValues.length > MAX_TAGS) throw new Error(`Too many tags: max ${MAX_TAGS} per link`);
    const rules = collectRules(row, columnMapping);

    // Resolve (possibly auto-creating) category/tags only after the row validated.
    if (f.categoryId) updates.category_id = await resolveCategoryId(f.categoryId);
    const tagIds = tagValues.length > 0 ? await resolveTagIds(tagValues) : undefined;

    const statements: D1PreparedStatement[] = [buildLinkUpdateStatement(env, existing.id, updates)];
    if (tagIds) statements.push(...buildSetLinkTagsStatements(env, existing.id, tagIds));
    statements.push(...ruleStatements(env, existing.id, rules));
    await env.DB.batch(statements);

    // Invalidate (don't rebuild): the redirect cache-miss path repopulates on next click.
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await deleteCachedLink(env, domain.domain_name, existing.slug);
        return { row: -1, success: true, action: 'updated', slug: existing.slug };
      } catch (err) {
        lastErr = err;
      }
    }
    console.error('Import: cache delete failed for', existing.slug, lastErr);
    return {
      row: -1,
      success: false,
      action: 'error',
      slug: existing.slug,
      error: 'Saved, but cache refresh failed — changes may take up to 7 days',
    };
  };

  const summary: ImportSummary = { results: [], created: 0, updated: 0, skipped: 0, errors: 0 };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (Object.keys(row).length === 0) continue;

    let result: RowResult;
    try {
      const f = extractFields(row, columnMapping);
      const slug = f.slug;
      if (slug) {
        if (!isValidSlug(slug)) throw new Error('Invalid slug format');
        if (isReservedSlug(slug)) throw new Error('Slug is reserved');
        const existing = await getLinkBySlugIncludingDeleted(env, domainId, slug);
        if (!existing) {
          result = await createRow(f, row, slug);
        } else if (existing.status === 'deleted') {
          throw new Error(DELETED_SLUG_MESSAGE);
        } else if (onExisting === 'skip') {
          result = { row: -1, success: true, action: 'skipped', slug };
        } else if (onExisting === 'error') {
          throw new Error('Slug already exists');
        } else {
          result = await updateRow(f, row, existing);
        }
      } else {
        result = await createRow(f, row, undefined);
      }
    } catch (error: any) {
      result = { row: -1, success: false, action: 'error', error: error?.message || 'Import failed' };
    }

    result.row = i;
    summary.results.push(result);
    if (result.action === 'created') summary.created++;
    else if (result.action === 'updated') summary.updated++;
    else if (result.action === 'skipped') summary.skipped++;
    else summary.errors++;
  }

  return summary;
}

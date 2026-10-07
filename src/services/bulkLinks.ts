/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Bulk link operations (POST /links/bulk). Two request formats:
//  - old: { action, link_ids, updates? } — one `updates` object applied to every id
//  - new: { action, items: [{ id | domain_id+slug, updates? }] } — per-item updates
// Each item costs at most: slug lookup + loop check + pixel check + ONE D1 batch + ONE KV delete.

import type { Env, User, ApiKeyContext, Link, Domain } from '../types';
import { getLinkById, getLinkBySlug, buildLinkUpdateStatement, deleteLink } from '../db/links';
import { getDomainById } from '../db/domains';
import { buildSetLinkTagsStatements } from '../db/tags';
import {
  buildClearRedirectsStatements,
  buildUpsertGeoRedirectStatement,
  buildUpsertDeviceRedirectStatement,
  buildUpsertCityRedirectStatement,
  buildUpsertOsRedirectStatement,
} from '../db/linkRedirects';
import { buildUpsertOgMetaStatement, buildClearOgMetaStatement } from '../db/linkOgMeta';
import { buildSetLinkPixelsStatements } from '../db/linkPixels';
import { resolveLinkPixelIds, PixelError } from './pixelLibrary';
import { deleteCachedLink } from './cache';
import { canAccessDomain } from '../utils/permissions';
import { isInfiniteRedirect } from '../utils/domains';
import { isValidUrl, normalizeUrl, sanitizeHtml } from '../utils/validation';
import { updateLinkSchema } from '../schemas/link';

export const MAX_BULK_ENTRIES = 100;
const TOO_MANY = 'Too many links: max 100 per request — split into smaller batches';
const ACCESS_DENIED = 'Access denied. You do not have access to this domain.';
const NOT_ON_SCOPE = 'Domain not on scope';
const NOT_FOUND = 'Link not found';
const EMPTY_UPDATES = 'updates must contain at least one field';
const BAD_TARGET = 'Specify either id, or domain_id and slug';

export interface BulkActor {
  user?: User;
  apiKey?: ApiKeyContext;
}

type UpdatesInput = ReturnType<typeof updateLinkSchema.parse>;

export interface BulkRequest {
  action: 'update' | 'delete';
  mode: 'ids' | 'items';
  /** ids mode: string ids. items mode: raw item objects. */
  entries: unknown[];
  /** ids mode + update: already validated updates (shared by every id). */
  updates?: UpdatesInput;
}

export type ParseResult = { ok: true; request: BulkRequest } | { ok: false; message: string };

export interface BulkResultOld {
  id: unknown;
  success: boolean;
  error?: string;
}
export interface BulkResultNew {
  index: number;
  id?: string;
  slug?: string;
  success: boolean;
  error?: string;
}

interface BulkCtx {
  domains: Map<string, Promise<Domain | null>>;
  access: Map<string, string | null>;
  /** hostname -> domain row, shared with isInfiniteRedirect (path check stays per call). */
  hosts: Map<string, Domain | null>;
}

function newCtx(): BulkCtx {
  return { domains: new Map(), access: new Map(), hosts: new Map() };
}

/** Validates the envelope only; per-item updates are validated while processing. May throw ZodError (ids-mode updates). */
export function parseBulkRequest(body: unknown): ParseResult {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const { action, link_ids, items, updates } = b;

  if (action !== 'update' && action !== 'delete') {
    return { ok: false, message: 'Invalid action: must be "update" or "delete"' };
  }
  const hasIds = link_ids !== undefined;
  const hasItems = items !== undefined;
  if (hasIds === hasItems) {
    return { ok: false, message: 'Provide either link_ids or items (not both, not neither)' };
  }
  const entries = hasIds ? link_ids : items;
  if (!Array.isArray(entries) || entries.length === 0) {
    return { ok: false, message: hasIds ? 'link_ids array required' : 'items array required' };
  }
  if (entries.length > MAX_BULK_ENTRIES) {
    return { ok: false, message: TOO_MANY };
  }

  if (hasIds) {
    if (action === 'update') {
      if (!updates || typeof updates !== 'object' || Object.keys(updates as object).length === 0) {
        return { ok: false, message: EMPTY_UPDATES };
      }
      // Throws ZodError on invalid input -> 400 via the global error handler (unchanged behaviour).
      const validated = updateLinkSchema.partial().parse(updates);
      // Unknown-only keys are stripped by zod; reject so nothing silently "succeeds".
      if (Object.keys(validated).length === 0) return { ok: false, message: EMPTY_UPDATES };
      return { ok: true, request: { action, mode: 'ids', entries, updates: validated } };
    }
    return { ok: true, request: { action, mode: 'ids', entries } };
  }
  return { ok: true, request: { action, mode: 'items', entries } };
}

function getDomain(env: Env, ctx: BulkCtx, domainId: string): Promise<Domain | null> {
  let p = ctx.domains.get(domainId);
  if (!p) {
    p = getDomainById(env, domainId);
    ctx.domains.set(domainId, p);
  }
  return p;
}

/** Returns an error message, or null when the actor may touch the domain. Memoized per domain. */
async function checkDomainAccess(env: Env, actor: BulkActor, ctx: BulkCtx, domainId: string): Promise<string | null> {
  if (ctx.access.has(domainId)) return ctx.access.get(domainId) ?? null;
  let err: string | null = null;
  // Session users (mirror requireLinkAccess on the single-item routes).
  if (actor.user && !actor.apiKey) {
    if (!(await canAccessDomain(env, actor.user, domainId))) err = ACCESS_DENIED;
  }
  if (!err && actor.apiKey && actor.apiKey.domain_ids && actor.apiKey.domain_ids.length > 0) {
    if (!actor.apiKey.domain_ids.includes(domainId)) err = NOT_ON_SCOPE;
  }
  ctx.access.set(domainId, err);
  return err;
}

/**
 * Resolves a bulk target to a live link, enforcing access. For domain_id+slug the access
 * check on the domain happens BEFORE the slug lookup (no cross-tenant slug enumeration).
 */
export async function resolveBulkTarget(
  env: Env,
  actor: BulkActor,
  item: { id?: unknown; domain_id?: unknown; slug?: unknown },
  ctx: BulkCtx
): Promise<{ link: Link } | { error: string }> {
  const hasId = item.id !== undefined && item.id !== null;
  const hasSlug = (item.domain_id !== undefined && item.domain_id !== null) || (item.slug !== undefined && item.slug !== null);
  if (hasId === hasSlug) return { error: BAD_TARGET };

  if (hasId) {
    if (typeof item.id !== 'string') return { error: NOT_FOUND };
    const link = await getLinkById(env, item.id);
    if (!link) return { error: NOT_FOUND };
    const err = await checkDomainAccess(env, actor, ctx, link.domain_id);
    return err ? { error: err } : { link };
  }

  if (typeof item.domain_id !== 'string' || !item.domain_id || typeof item.slug !== 'string' || !item.slug) {
    return { error: BAD_TARGET };
  }
  const err = await checkDomainAccess(env, actor, ctx, item.domain_id);
  if (err) return { error: err };
  const link = await getLinkBySlug(env, item.domain_id, item.slug);
  return link ? { link } : { error: NOT_FOUND };
}

/**
 * Applies already-validated updates to one link: one D1 batch, then one cache-key delete.
 * Returns an error message, or null on success.
 */
export async function applyLinkUpdate(
  env: Env,
  link: Link,
  domain: Domain | null,
  updates: UpdatesInput,
  ctx: BulkCtx
): Promise<string | null> {
  // Fields living outside the links columns are handled separately.
  const { tags, category_id, route, metadata: metadataObj, geo_redirects, device_redirects, city_redirects, os_redirects, og_meta, pixel_ids, ...linkUpdates } = updates;
  const columnUpdates: Parameters<typeof buildLinkUpdateStatement>[2] = { ...linkUpdates };

  if (linkUpdates.destination_url !== undefined) {
    if (!isValidUrl(linkUpdates.destination_url)) return 'Invalid destination URL';
    columnUpdates.destination_url = normalizeUrl(linkUpdates.destination_url);
    if (await isInfiniteRedirect(env, columnUpdates.destination_url, ctx.hosts)) {
      return 'Destination URL cannot point to a reserved route on a managed domain (infinite redirect loop).';
    }
  }
  try {
    if (linkUpdates.title !== undefined) columnUpdates.title = linkUpdates.title ? sanitizeHtml(linkUpdates.title) : linkUpdates.title;
    if (linkUpdates.description !== undefined) columnUpdates.description = linkUpdates.description ? sanitizeHtml(linkUpdates.description) : linkUpdates.description;
  } catch {
    return 'Invalid input: failed to sanitize title or description';
  }

  // Pixels must belong to THIS link's domain; a mismatch fails this link only.
  let linkPixelIds: string[] | undefined;
  try {
    linkPixelIds = await resolveLinkPixelIds(env, link.domain_id, pixel_ids, { applyDefaults: false });
  } catch (error) {
    if (error instanceof PixelError) return error.message;
    throw error;
  }

  // `route` is handled independently of metadata/category so a route-only update is persisted.
  // `category_id` goes to its dedicated column, NOT metadata, so list/filter queries see it.
  let finalMetadata: string | undefined;
  if (metadataObj !== undefined || route !== undefined) {
    const current = link.metadata ? JSON.parse(link.metadata) : {};
    const merged = metadataObj ? { ...current, ...metadataObj } : { ...current };
    if (route !== undefined) {
      if (domain && domain.routes && domain.routes.includes(route)) {
        merged.route = route;
      } else {
        return 'Invalid route for domain';
      }
    }
    finalMetadata = JSON.stringify(merged);
  }
  if (category_id !== undefined) columnUpdates.category_id = category_id;
  if (finalMetadata !== undefined) columnUpdates.metadata = finalMetadata;

  const stmts: D1PreparedStatement[] = [];
  if (Object.keys(columnUpdates).length > 0) stmts.push(buildLinkUpdateStatement(env, link.id, columnUpdates));
  if (tags !== undefined) stmts.push(...buildSetLinkTagsStatements(env, link.id, tags));

  const clear: Array<'geo' | 'device' | 'city' | 'os'> = [];
  const upserts: D1PreparedStatement[] = [];
  if (geo_redirects !== undefined) {
    clear.push('geo');
    for (const g of geo_redirects) upserts.push(buildUpsertGeoRedirectStatement(env, link.id, g.country_code, g.destination_url));
  }
  if (device_redirects !== undefined) {
    clear.push('device');
    for (const d of device_redirects) upserts.push(buildUpsertDeviceRedirectStatement(env, link.id, d.device_type, d.destination_url));
  }
  if (city_redirects !== undefined) {
    clear.push('city');
    for (const c of city_redirects) upserts.push(buildUpsertCityRedirectStatement(env, link.id, c.city_name, c.destination_url));
  }
  if (os_redirects !== undefined) {
    clear.push('os');
    for (const o of os_redirects) upserts.push(buildUpsertOsRedirectStatement(env, link.id, o.os, o.destination_url));
  }
  if (clear.length > 0) stmts.push(...buildClearRedirectsStatements(env, link.id, clear), ...upserts);

  if (og_meta !== undefined) {
    stmts.push(
      og_meta.og_title || og_meta.og_description || og_meta.og_image
        ? buildUpsertOgMetaStatement(env, link.id, og_meta)
        : buildClearOgMetaStatement(env, link.id)
    );
  }
  if (linkPixelIds !== undefined) stmts.push(...buildSetLinkPixelsStatements(env, link.id, linkPixelIds));

  if (stmts.length > 0) await env.DB.batch(stmts);

  return refreshCache(env, link, domain);
}

const CACHE_REFRESH_FAILED = 'Saved, but cache refresh failed — changes may take up to 7 days';

/**
 * Invalidate rather than rebuild: the redirect cache-miss path repopulates on next click
 * (also fixes a stale active entry after status -> 'deleted'). Retries once; data is already saved.
 */
async function refreshCache(env: Env, link: Link, domain: Domain | null): Promise<string | null> {
  if (!domain) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await deleteCachedLink(env, domain.domain_name, link.slug);
      return null;
    } catch (error) {
      if (attempt === 1) console.error('bulk: cache refresh failed', link.id, error);
    }
  }
  return CACHE_REFRESH_FAILED;
}

async function deleteOne(env: Env, link: Link, domain: Domain | null): Promise<string | null> {
  await deleteLink(env, link.id, false);
  return refreshCache(env, link, domain);
}

/** Runs a parsed bulk request. Never throws for per-entry problems. */
export async function runBulk(
  env: Env,
  actor: BulkActor,
  request: BulkRequest
): Promise<Array<BulkResultOld | BulkResultNew>> {
  const ctx = newCtx();
  const results: Array<BulkResultOld | BulkResultNew> = [];

  for (let index = 0; index < request.entries.length; index++) {
    const entry = request.entries[index];
    const isItems = request.mode === 'items';
    const item = (isItems ? entry : { id: entry }) as { id?: unknown; domain_id?: unknown; slug?: unknown; updates?: unknown };
    const safeItem = item && typeof item === 'object' ? item : {};

    const finish = (link: Link | undefined, error: string | null) => {
      if (!isItems) {
        results.push(error ? { id: entry, success: false, error } : { id: entry, success: true });
        return;
      }
      const r: BulkResultNew = {
        index,
        id: link?.id ?? (typeof safeItem.id === 'string' ? safeItem.id : undefined),
        slug: link?.slug ?? (typeof safeItem.slug === 'string' ? safeItem.slug : undefined),
        success: !error,
      };
      if (error) r.error = error;
      results.push(r);
    };

    // Legacy link_ids: a null/non-string entry is simply an unknown link (old behaviour).
    if (!isItems && typeof entry !== 'string') {
      finish(undefined, NOT_FOUND);
      continue;
    }

    let link: Link | undefined;
    try {
      const target = await resolveBulkTarget(env, actor, safeItem, ctx);
      if ('error' in target) {
        finish(undefined, target.error);
        continue;
      }
      link = target.link;
      finish(link, await processLink(env, ctx, request, safeItem, link));
    } catch (error) {
      console.error('[BULK] item failed', { action: request.action, index, linkId: link?.id }, error);
      finish(link, request.action === 'delete'
        ? 'Delete failed due to an internal error — please retry'
        : 'Update failed due to an internal error — please retry');
    }
  }
  return results;
}

/** Delete or update one resolved link. Returns an item error message or null. May throw (D1/KV); caller reports it. */
async function processLink(
  env: Env,
  ctx: BulkCtx,
  request: BulkRequest,
  item: { updates?: unknown },
  link: Link
): Promise<string | null> {
  const domain = await getDomain(env, ctx, link.domain_id);
  if (request.action === 'delete') return deleteOne(env, link, domain);

  let updates: UpdatesInput;
  if (request.mode === 'ids') {
    updates = request.updates as UpdatesInput;
  } else {
    const raw = item.updates;
    if (!raw || typeof raw !== 'object' || Object.keys(raw as object).length === 0) return EMPTY_UPDATES;
    const parsed = updateLinkSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return `Invalid updates: ${issue.path.join('.') || 'updates'} ${issue.message}`.trim();
    }
    if (Object.keys(parsed.data).length === 0) return EMPTY_UPDATES;
    updates = parsed.data;
  }
  return applyLinkUpdate(env, link, domain, updates, ctx);
}

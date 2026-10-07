/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Per-domain pixel library: access checks, limits, and cache invalidation.
// Routers stay thin and translate PixelError into HTTP responses.

import type { Env, User, ApiKeyContext } from '../types';
import { canAccessDomain } from '../utils/permissions';
import { getDomainById } from '../db/domains';
import {
  listLibraryPixels, countLibraryPixels, countDefaultPixels, getLibraryPixel, getLibraryPixelsByIds,
  getDefaultPixelIds, createLibraryPixel, updateLibraryPixel, deleteLibraryPixel, type LibraryPixel,
} from '../db/pixelLibrary';
import { getLinkCacheKeysForPixel, attachPixelToAllLinks, detachPixelFromAllLinks } from '../db/linkPixels';
import { deleteCachedLink } from './cache';
import { isValidPixelId, normalizePixelId, PIXEL_RULES_CLIENT } from '../utils/pixelIds';
import type { CreatePixelInput, UpdatePixelInput } from '../schemas/pixel';

export const MAX_PIXELS_PER_LINK = 5;
export const MAX_PIXELS_PER_DOMAIN = 25;
export const MAX_DEFAULT_PIXELS = 5;

export class PixelError extends Error {
  constructor(public status: 400 | 403 | 404 | 409, message: string) {
    super(message);
    this.name = 'PixelError';
  }
}

export interface Actor {
  user?: User;
  apiKey?: ApiKeyContext;
}

/** Mirrors links.ts: API keys are limited by domain_ids; session users by canAccessDomain. */
async function assertDomainAccess(env: Env, actor: Actor, domainId: string): Promise<void> {
  const scoped = actor.apiKey?.domain_ids;
  if (scoped && scoped.length > 0 && !scoped.includes(domainId)) {
    throw new PixelError(403, 'Domain not in API key scope');
  }
  if (actor.user && !actor.apiKey && !(await canAccessDomain(env, actor.user, domainId))) {
    throw new PixelError(403, 'Access denied. You do not have access to this domain.');
  }
}

async function loadOwnedPixel(env: Env, actor: Actor, id: string): Promise<LibraryPixel> {
  const pixel = await getLibraryPixel(env, id);
  if (!pixel) throw new PixelError(404, 'Pixel not found');
  await assertDomainAccess(env, actor, pixel.domain_id);
  return pixel;
}

function mapUniqueError(error: unknown): unknown {
  const msg = error instanceof Error ? error.message : String(error);
  if (!msg.includes('UNIQUE constraint failed')) return error;
  return msg.includes('pixel_library.name')
    ? new PixelError(409, 'A pixel with this name already exists in this domain')
    : new PixelError(409, 'This pixel is already saved in this domain');
}

async function assertDefaultSlot(env: Env, domainId: string, excludeId?: string): Promise<void> {
  if ((await countDefaultPixels(env, domainId, excludeId)) >= MAX_DEFAULT_PIXELS) {
    throw new PixelError(400, `A domain can have at most ${MAX_DEFAULT_PIXELS} default pixels`);
  }
}

export const MAX_CACHE_INVALIDATIONS = 500;
const INVALIDATION_CHUNK = 50;

/**
 * Clear KV entries so the redirect cache-miss path rebuilds them. Bounded to stay under
 * the Workers per-request binding-call limit. Returns how many links could NOT be cleared
 * (failed deletes + keys beyond the cap); those may serve stale pixels until the KV TTL.
 */
export async function invalidateKeys(env: Env, keys: Array<{ domain_name: string; slug: string }>): Promise<number> {
  const attempt = keys.slice(0, MAX_CACHE_INVALIDATIONS);
  let stale = keys.length - attempt.length;
  for (let i = 0; i < attempt.length; i += INVALIDATION_CHUNK) {
    const chunk = attempt.slice(i, i + INVALIDATION_CHUNK);
    const results = await Promise.allSettled(chunk.map((k) => deleteCachedLink(env, k.domain_name, k.slug)));
    const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    if (failed.length > 0) {
      stale += failed.length;
      console.error('[PIXELS] Failed to invalidate ' + failed.length + ' cache key(s)', failed[0].reason);
    }
  }
  return stale;
}

export async function listPixels(env: Env, actor: Actor, domainId: string | undefined) {
  if (!domainId) throw new PixelError(400, 'domain_id is required');
  if (!(await getDomainById(env, domainId))) throw new PixelError(404, 'Domain not found');
  await assertDomainAccess(env, actor, domainId);
  return listLibraryPixels(env, domainId);
}

export async function createPixel(env: Env, actor: Actor, input: CreatePixelInput): Promise<LibraryPixel> {
  if (!(await getDomainById(env, input.domain_id))) throw new PixelError(404, 'Domain not found');
  await assertDomainAccess(env, actor, input.domain_id);
  if ((await countLibraryPixels(env, input.domain_id)) >= MAX_PIXELS_PER_DOMAIN) {
    throw new PixelError(400, `A domain can have at most ${MAX_PIXELS_PER_DOMAIN} saved pixels`);
  }
  if (input.is_default) await assertDefaultSlot(env, input.domain_id);
  const pixelId = normalizePixelId(input.pixel_type, input.pixel_id);
  if (!isValidPixelId(input.pixel_type, pixelId)) {
    throw new PixelError(400, `Invalid ${PIXEL_RULES_CLIENT[input.pixel_type].label} ID`);
  }
  try {
    return await createLibraryPixel(env, {
      domain_id: input.domain_id,
      name: input.name,
      pixel_type: input.pixel_type,
      pixel_id: pixelId,
      is_default: !!input.is_default,
      created_by: actor.user?.id ?? null,
    });
  } catch (error) {
    throw mapUniqueError(error);
  }
}

export async function updatePixel(env: Env, actor: Actor, id: string, patch: UpdatePixelInput): Promise<LibraryPixel & { stale_links: number }> {
  const existing = await loadOwnedPixel(env, actor, id);
  const type = patch.pixel_type ?? existing.pixel_type;
  const pixelId = normalizePixelId(type, patch.pixel_id ?? existing.pixel_id);
  if (!isValidPixelId(type, pixelId)) {
    throw new PixelError(400, `Invalid ${PIXEL_RULES_CLIENT[type].label} ID`);
  }
  if (patch.is_default && !existing.is_default) await assertDefaultSlot(env, existing.domain_id, id);
  try {
    await updateLibraryPixel(env, id, { name: patch.name, pixel_type: type, pixel_id: pixelId, is_default: patch.is_default });
  } catch (error) {
    throw mapUniqueError(error);
  }
  // Only the (type, id) pair is in the cached link; name/default changes don't affect redirects.
  let stale = 0;
  if (type !== existing.pixel_type || pixelId !== existing.pixel_id) {
    stale = await invalidateKeys(env, await getLinkCacheKeysForPixel(env, id));
  }
  return { ...(await getLibraryPixel(env, id))!, stale_links: stale };
}

export async function deletePixel(env: Env, actor: Actor, id: string): Promise<{ affected_links: number; stale_links: number }> {
  await loadOwnedPixel(env, actor, id);
  // Collect keys BEFORE the delete: the cascade removes the link_pixels rows we join on.
  const keys = await getLinkCacheKeysForPixel(env, id);
  await deleteLibraryPixel(env, id);
  const stale = await invalidateKeys(env, keys);
  return { affected_links: keys.length, stale_links: stale };
}

export async function attachPixelToAll(env: Env, actor: Actor, id: string): Promise<{ attached: number; skipped_full: number; stale_links: number }> {
  const pixel = await loadOwnedPixel(env, actor, id);
  const { attached, skippedFull } = await attachPixelToAllLinks(env, pixel, MAX_PIXELS_PER_LINK);
  const stale = attached > 0 ? await invalidateKeys(env, await getLinkCacheKeysForPixel(env, id)) : 0;
  return { attached, skipped_full: skippedFull, stale_links: stale };
}

export async function detachPixelFromAll(env: Env, actor: Actor, id: string): Promise<{ detached: number; stale_links: number }> {
  await loadOwnedPixel(env, actor, id);
  const keys = await getLinkCacheKeysForPixel(env, id);
  const detached = await detachPixelFromAllLinks(env, id);
  const stale = await invalidateKeys(env, keys);
  return { detached, stale_links: stale };
}

/**
 * Resolve the pixel ids a link write should store.
 * - undefined + applyDefaults → the domain's default pixels (link create)
 * - undefined otherwise → undefined (leave untouched)
 * - list → deduped; every id must exist in THIS domain's library, else 400.
 */
export async function resolveLinkPixelIds(
  env: Env,
  domainId: string,
  pixelIds: string[] | undefined,
  opts: { applyDefaults: boolean }
): Promise<string[] | undefined> {
  if (pixelIds === undefined) {
    return opts.applyDefaults ? (await getDefaultPixelIds(env, domainId)).slice(0, MAX_PIXELS_PER_LINK) : undefined;
  }
  const unique = [...new Set(pixelIds)];
  if (unique.length > MAX_PIXELS_PER_LINK) {
    throw new PixelError(400, `A link can have at most ${MAX_PIXELS_PER_LINK} pixels`);
  }
  if (unique.length === 0) return [];
  const rows = await getLibraryPixelsByIds(env, unique);
  if (rows.length !== unique.length || rows.some((r) => r.domain_id !== domainId)) {
    throw new PixelError(400, "Pixel not in this link's domain");
  }
  return unique;
}

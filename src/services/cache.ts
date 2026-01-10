/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// KV cache management service

import type { CachedLink, Domain, Env } from '../types';

const CACHE_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const DOMAIN_CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds
const DOMAIN_CACHE_VERSION_KEY = 'domain_cache_version';

// Edge cache TTLs (for KV.get cacheTtl parameter)
// These cache KV reads at the edge datacenter for faster subsequent reads
const LINK_CACHE_EDGE_TTL = 3600; // 1 hour - reduces KV origin fetches significantly
const DOMAIN_CACHE_EDGE_TTL = 3600; // 1 hour - domains rarely change
const DOMAIN_VERSION_EDGE_TTL = 300; // 5 minutes - version changes trigger cache invalidation

// Get cache version (incremented on any domain change)
async function getDomainCacheVersion(env: Env): Promise<number> {
  const version = await env.CACHE.get(DOMAIN_CACHE_VERSION_KEY, { cacheTtl: DOMAIN_VERSION_EDGE_TTL });
  return version ? parseInt(version) : 0;
}

// Increment cache version (invalidates all domain caches)
export async function invalidateDomainCache(env: Env): Promise<void> {
  const current = await getDomainCacheVersion(env);
  // Store without expiration - omit expirationTtl to make it permanent
  await env.CACHE.put(DOMAIN_CACHE_VERSION_KEY, String(current + 1));
}

// Cache key includes version for automatic invalidation
function getDomainCacheKey(domainName: string, version: number): string {
  return `domain:${version}:${domainName}`;
}

export async function getCachedLink(
  env: Env,
  domain: string,
  slug: string
): Promise<CachedLink | null> {
  const key = `link:${domain}:${slug}`;
  const cached = await env.CACHE.get(key, { type: 'json', cacheTtl: LINK_CACHE_EDGE_TTL });
  return (cached as CachedLink) || null;
}

export async function setCachedLink(
  env: Env,
  domain: string,
  slug: string,
  link: CachedLink
): Promise<void> {
  const key = `link:${domain}:${slug}`;
  await env.CACHE.put(key, JSON.stringify(link));
}

export async function deleteCachedLink(env: Env, domain: string, slug: string): Promise<void> {
  const key = `link:${domain}:${slug}`;
  await env.CACHE.delete(key);
}

export async function getCachedDomain(env: Env, domainName: string): Promise<Domain[] | null> {
  const version = await getDomainCacheVersion(env);
  const key = getDomainCacheKey(domainName, version);
  const cached = await env.CACHE.get(key, { type: 'json', cacheTtl: DOMAIN_CACHE_EDGE_TTL });
  return cached as Domain[] | null;
}

export async function setCachedDomain(env: Env, domainName: string, domains: Domain[]): Promise<void> {
  const version = await getDomainCacheVersion(env);
  const key = getDomainCacheKey(domainName, version);
  // Only cache ACTIVE domains
  const activeDomains = domains.filter(d => d.status === 'active');
  await env.CACHE.put(key, JSON.stringify(activeDomains), { expirationTtl: DOMAIN_CACHE_TTL });
}


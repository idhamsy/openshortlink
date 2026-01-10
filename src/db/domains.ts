/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Database operations for domains

import type { Domain, Env } from '../types';
import { generateId } from '../utils/id';
import { getCachedDomain, setCachedDomain, invalidateDomainCache } from '../services/cache';

/**
 * Parse domain settings and enrich domain object with routes
 */
function enrichDomain(domain: Domain): Domain {
  try {
    if (domain.settings) {
      const settings = JSON.parse(domain.settings);

      // Parse routes from settings, fallback to routing_path
      if (settings.routes && Array.isArray(settings.routes)) {
        domain.routes = settings.routes;
      } else {
        // Backward compatibility: use routing_path as single route
        domain.routes = domain.routing_path ? [domain.routing_path] : ['/go/*'];
      }
    } else {
      // No settings: use routing_path as single route
      domain.routes = domain.routing_path ? [domain.routing_path] : ['/go/*'];
    }
  } catch (error) {
    // Invalid JSON in settings, use defaults
    domain.routes = domain.routing_path ? [domain.routing_path] : ['/go/*'];
  }

  // Ensure routes is always an array
  if (!domain.routes || !Array.isArray(domain.routes) || domain.routes.length === 0) {
    domain.routes = domain.routing_path ? [domain.routing_path] : ['/go/*'];
  }

  return domain;
}

async function retryGetDomain(
  env: Env,
  domainId: string,
  attempts = 3
): Promise<Domain | null> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const found = await getDomainById(env, domainId);
    if (found) {
      return found;
    }
    // Simple retry without delay - D1 should be consistent by second attempt
  }
  return null;
}

/**
 * Build settings JSON from routes
 */
export function buildDomainSettings(routes: string[]): string {
  return JSON.stringify({
    routes,
  });
}

export async function getDomainById(env: Env, domainId: string): Promise<Domain | null> {
  const result = await env.DB.prepare(`SELECT * FROM domains WHERE id = ?`).bind(domainId).first<Domain>();
  if (!result) return null;
  return enrichDomain(result);
}

export async function getDomainByName(env: Env, domainName: string): Promise<Domain | null> {
  // Normalize domain name (remove trailing slash, lowercase)
  const normalizedDomain = domainName.replace(/\/+$/, '').toLowerCase().trim();

  // OPTIMIZATION: Use normalized_domain_name column with index (O(log N) instead of O(N))
  // Old query used LOWER(REPLACE(...)) which prevented index usage
  const result = await env.DB.prepare(
    `SELECT * FROM domains WHERE normalized_domain_name = ?`
  ).bind(normalizedDomain).first<Domain>();

  if (!result) {
    return null;
  }

  return enrichDomain(result);
}

export async function createDomain(
  env: Env,
  domain: Omit<Domain, 'id' | 'created_at' | 'updated_at'>
): Promise<Domain> {
  const id = generateId('domain');
  const now = Date.now();

  // Try using RETURNING clause
  let insertSucceeded = false;
  try {
    const result = await env.DB.prepare(
      `INSERT INTO domains (
        id, cloudflare_account_id, domain_name, routing_path,
        default_redirect_code, status, settings, normalized_domain_name, created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *`
    )
      .bind(
        id,
        domain.cloudflare_account_id,
        domain.domain_name,
        domain.routing_path,
        domain.default_redirect_code,
        domain.status,
        domain.settings || null,
        domain.domain_name.replace(/\/+$/g, '').toLowerCase().trim(), // normalized_domain_name
        now,
        now,
        domain.created_by || null
      )
      .first<Domain>();

    if (result) {
      insertSucceeded = true; // Mark that INSERT succeeded
      // Invalidate domain cache (version bump invalidates all domain caches)
      await invalidateDomainCache(env);
      return enrichDomain(result);
    }
  } catch (error) {
    // Check if it's a UNIQUE constraint error - if so, domain already exists
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      // INSERT might have succeeded before constraint check, try to fetch existing domain
      const existing = await getDomainById(env, id) || await getDomainByName(env, domain.domain_name);
      if (existing) {
        await invalidateDomainCache(env);
        return existing;
      }
      throw error; // Re-throw if we can't find it
    }
    // If INSERT succeeded but enrichment failed, don't try fallback INSERT
    if (insertSucceeded) {
      // Try to fetch the domain that was just inserted
      const inserted = await getDomainById(env, id);
      if (inserted) {
        await invalidateDomainCache(env);
        return inserted;
      }
      throw error; // Re-throw original error if we can't fetch it
    }
    // RETURNING not supported or INSERT failed, fall back to SELECT
  }

  // Fallback: Use SELECT
  try {
    await env.DB.prepare(
      `INSERT INTO domains (
        id, cloudflare_account_id, domain_name, routing_path,
        default_redirect_code, status, settings, normalized_domain_name, created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        domain.cloudflare_account_id,
        domain.domain_name,
        domain.routing_path,
        domain.default_redirect_code,
        domain.status,
        domain.settings || null,
        domain.domain_name.replace(/\/+$/g, '').toLowerCase().trim(), // normalized_domain_name
        now,
        now,
        domain.created_by || null
      )
      .run();
  } catch (error) {
    // If UNIQUE constraint error, domain might already exist from RETURNING path
    // Try to fetch it instead of failing
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      const existing = await getDomainById(env, id);
      if (existing) {
        await invalidateDomainCache(env);
        return existing;
      }
      // If not found by ID, try by name
      const existingByName = await getDomainByName(env, domain.domain_name);
      if (existingByName) {
        await invalidateDomainCache(env);
        return existingByName;
      }
      // If still not found, re-throw the error
      throw error;
    }
    throw error;
  }

  const createdDomain =
    (await retryGetDomain(env, id)) ??
    enrichDomain({
      id,
      cloudflare_account_id: domain.cloudflare_account_id,
      domain_name: domain.domain_name,
      routing_path: domain.routing_path,
      default_redirect_code: domain.default_redirect_code,
      status: domain.status,
      settings: domain.settings,
      created_at: now,
      updated_at: now,
      created_by: domain.created_by,
    });

  // Invalidate domain cache (version bump invalidates all domain caches)
  await invalidateDomainCache(env);

  return createdDomain;
}

export async function updateDomain(
  env: Env,
  domainId: string,
  updates: Partial<Omit<Domain, 'id' | 'created_at' | 'cloudflare_account_id'>>
): Promise<Domain | null> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.domain_name !== undefined) {
    fields.push('domain_name = ?');
    values.push(updates.domain_name);
    // Also update normalized_domain_name to keep in sync
    fields.push('normalized_domain_name = ?');
    values.push(updates.domain_name.replace(/\/+$/g, '').toLowerCase().trim());
  }
  if (updates.routing_path !== undefined) {
    fields.push('routing_path = ?');
    values.push(updates.routing_path);
  }
  if (updates.default_redirect_code !== undefined) {
    fields.push('default_redirect_code = ?');
    values.push(updates.default_redirect_code);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.settings !== undefined) {
    fields.push('settings = ?');
    values.push(updates.settings);
  }

  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(domainId);

  // Try using RETURNING clause
  let updatedDomain: Domain | null = null;
  try {
    const result = await env.DB.prepare(
      `UPDATE domains SET ${fields.join(', ')} WHERE id = ? RETURNING *`
    ).bind(...values).first<Domain>();

    if (result) {
      updatedDomain = enrichDomain(result);
    }
  } catch {
    // RETURNING not supported, fall back to SELECT
  }

  // Fallback: Use SELECT
  if (!updatedDomain) {
    await env.DB.prepare(`UPDATE domains SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    updatedDomain = await getDomainById(env, domainId);
  }

  // Invalidate cache if domain_name, routing_path, or status changed
  if (updates.domain_name !== undefined ||
    updates.routing_path !== undefined ||
    updates.status !== undefined) {
    await invalidateDomainCache(env);
  }

  return updatedDomain;
}

export async function listDomains(env: Env, accountId?: string): Promise<Domain[]> {
  let query = 'SELECT * FROM domains';
  const params: unknown[] = [];

  if (accountId) {
    query += ' WHERE cloudflare_account_id = ?';
    params.push(accountId);
  }

  query += ' ORDER BY created_at DESC';

  const result = await env.DB.prepare(query).bind(...params).all<Domain>();
  const domains = result.results || [];

  // Enrich each domain with routes
  return domains.map(domain => enrichDomain(domain));
}

export async function getDomainByRoutingPath(env: Env, domainName: string, path: string): Promise<{ domain: Domain, matchedRoute: string } | null> {
  // Try cache first
  let domains = await getCachedDomain(env, domainName);

  if (!domains) {
    // DEBUG: console.log('[DOMAIN CACHE] Cache miss for domain:', domainName);
    // Cache miss: Query database for ALL domains with this name (handles multiple domains)
    const allDomains = await env.DB.prepare(
      `SELECT * FROM domains WHERE domain_name = ? AND status = 'active' ORDER BY created_at ASC`
    ).bind(domainName).all<Domain>();

    domains = allDomains.results || [];

    // Cache the result to prevent race conditions and cascading cache misses
    // Awaited to ensure cache is populated before next request (consistent with other cache writes)
    try {
      await setCachedDomain(env, domainName, domains);
      // DEBUG: console.log('[DOMAIN CACHE] Domain cached for:', domainName, '- count:', domains.length);
    } catch (err) {
      console.error('[DOMAIN CACHE] Failed to cache domain:', err);
      // Continue - cache miss is acceptable, but we tried to cache it
    }
  } else {
    // DEBUG: console.log('[DOMAIN CACHE] Cache hit for domain:', domainName, '- count:', domains.length);
  }

  // Match routing path (same logic as before, but on cached/fetched domains)
  // Normalize path to handle edge cases
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  for (const domain of domains) {
    // Enrich domain to get routes array
    const enrichedDomain = enrichDomain(domain);
    const routesToCheck = enrichedDomain.routes || [domain.routing_path];

    // Check each route
    for (const route of routesToCheck) {
      // Remove wildcard and trailing slash for matching
      const routingPath = route.replace(/\*/g, '').replace(/\/$/, '');
      const normalizedRoutingPath = routingPath.startsWith('/') ? routingPath : `/${routingPath}`;

      // Check if path matches routing path
      if (normalizedPath.startsWith(normalizedRoutingPath) || normalizedPath === normalizedRoutingPath) {
        return { domain: enrichedDomain, matchedRoute: route };
      }
    }
  }

  return null;
}

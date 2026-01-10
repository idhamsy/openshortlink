/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Database operations for API keys

import type { ApiKey, ApiKeyCreateRequest, Domain, Env } from '../types';
import { generateId } from '../utils/id';
import { hashApiKey } from '../utils/crypto';

export interface ApiKeyWithKey extends ApiKey {
  api_key: string; // Only returned on creation
}

// Generate API key: sk_live_<64-char-hex>
export function generateApiKey(): { key: string; prefix: string } {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const hex = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const key = `sk_live_${hex}`;
  const prefix = key.substring(0, 16); // "sk_live_ab12cd34"
  return { key, prefix };
}

export async function createApiKey(
  env: Env,
  userId: string,
  data: ApiKeyCreateRequest
): Promise<ApiKeyWithKey> {
  const id = generateId('apikey');
  const now = Date.now();

  // Generate API key
  const { key, prefix } = generateApiKey();

  // Hash the API key
  const keyHash = await hashApiKey(key);

  // Store IP whitelist as JSON string
  const ipWhitelistJson = data.ip_whitelist && data.ip_whitelist.length > 0
    ? JSON.stringify(data.ip_whitelist)
    : null;

  // Insert API key
  await env.DB.prepare(
    `INSERT INTO api_keys (
      id, user_id, name, key_hash, key_prefix,
      ip_whitelist, allow_all_ips, expires_at,
      created_at, updated_at, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      userId,
      data.name,
      keyHash,
      prefix,
      ipWhitelistJson,
      data.allow_all_ips ? 1 : 0,
      data.expires_at || null,
      now,
      now,
      'active'
    )
    .run();

  // Associate domains if provided
  if (data.domain_ids && data.domain_ids.length > 0) {
    await setApiKeyDomains(env, id, data.domain_ids);
  }

  // Get the created API key with the full key
  const apiKey = await getApiKeyById(env, id);
  if (!apiKey) {
    throw new Error('Failed to create API key');
  }

  return { ...apiKey, api_key: key };
}

export async function getApiKeyById(env: Env, id: string): Promise<ApiKey | null> {
  const result = await env.DB.prepare(
    `SELECT * FROM api_keys WHERE id = ?`
  ).bind(id).first<ApiKey>();

  if (!result) return null;

  // Get associated domains
  const domains = await getApiKeyDomains(env, id);
  return {
    ...result,
    domain_ids: domains.map(d => d.id),
    domains,
  };
}

export async function getApiKeyByHash(env: Env, keyHash: string): Promise<ApiKey | null> {
  const result = await env.DB.prepare(
    `SELECT * FROM api_keys WHERE key_hash = ?`
  ).bind(keyHash).first<ApiKey>();

  if (!result) return null;

  // Get associated domains
  const domains = await getApiKeyDomains(env, result.id);
  return {
    ...result,
    domain_ids: domains.map(d => d.id),
    domains,
  };
}

export async function listApiKeys(env: Env, userId: string): Promise<ApiKey[]> {
  const apiKeys = await env.DB.prepare(
    `SELECT * FROM api_keys WHERE user_id = ? ORDER BY created_at DESC`
  ).bind(userId).all<ApiKey>();

  if (!apiKeys.results || apiKeys.results.length === 0) return [];

  // Batch fetch all domains for all API keys in ONE query
  const apiKeyIds = apiKeys.results.map(k => k.id);
  const placeholders = apiKeyIds.map(() => '?').join(',');

  const domainsResult = await env.DB.prepare(
    `SELECT 
      akd.api_key_id,
      d.id, d.cloudflare_account_id, d.domain_name, d.routing_path,
      d.default_redirect_code, d.status, d.settings, 
      d.created_at, d.updated_at, d.created_by
     FROM api_key_domains akd
     INNER JOIN domains d ON akd.domain_id = d.id
     WHERE akd.api_key_id IN (${placeholders})
     AND d.status = 'active'`
  ).bind(...apiKeyIds).all<{
    api_key_id: string;
    id: string;
    cloudflare_account_id: string;
    domain_name: string;
    routing_path: string;
    default_redirect_code: number;
    status: string;
    settings: string | null;
    created_at: number;
    updated_at: number;
    created_by: string | null;
  }>();

  // Group domains by API key ID
  const domainsByApiKey = new Map<string, Domain[]>();
  for (const row of (domainsResult.results || [])) {
    if (!domainsByApiKey.has(row.api_key_id)) {
      domainsByApiKey.set(row.api_key_id, []);
    }
    domainsByApiKey.get(row.api_key_id)!.push({
      id: row.id,
      cloudflare_account_id: row.cloudflare_account_id,
      domain_name: row.domain_name,
      routing_path: row.routing_path,
      default_redirect_code: row.default_redirect_code,
      status: row.status as 'active' | 'inactive' | 'pending',
      settings: row.settings || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by || undefined,
    });
  }

  // Map API keys with their domains
  return apiKeys.results.map(key => ({
    ...key,
    domain_ids: (domainsByApiKey.get(key.id) || []).map(d => d.id),
    domains: domainsByApiKey.get(key.id) || [],
  }));
}

export async function updateApiKey(
  env: Env,
  id: string,
  updates: Partial<{
    name: string;
    ip_whitelist: string[];
    allow_all_ips: boolean;
    expires_at: number | null;
    status: 'active' | 'revoked' | 'expired';
    domain_ids: string[];
  }>
): Promise<ApiKey | null> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.ip_whitelist !== undefined) {
    const ipWhitelistJson = updates.ip_whitelist.length > 0
      ? JSON.stringify(updates.ip_whitelist)
      : null;
    fields.push('ip_whitelist = ?');
    values.push(ipWhitelistJson);
  }
  if (updates.allow_all_ips !== undefined) {
    fields.push('allow_all_ips = ?');
    values.push(updates.allow_all_ips ? 1 : 0);
  }
  if (updates.expires_at !== undefined) {
    fields.push('expires_at = ?');
    values.push(updates.expires_at);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }

  if (fields.length > 0) {
    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    await env.DB.prepare(
      `UPDATE api_keys SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run();
  }

  // Update domain associations if provided
  if (updates.domain_ids !== undefined) {
    // Delete existing associations
    await env.DB.prepare(
      `DELETE FROM api_key_domains WHERE api_key_id = ?`
    ).bind(id).run();

    // Add new associations
    if (updates.domain_ids.length > 0) {
      await setApiKeyDomains(env, id, updates.domain_ids);
    }
  }

  return getApiKeyById(env, id);
}

export async function revokeApiKey(env: Env, id: string): Promise<ApiKey | null> {
  return updateApiKey(env, id, { status: 'revoked' });
}

export async function deleteApiKey(env: Env, id: string): Promise<boolean> {
  try {
    await env.DB.prepare(`DELETE FROM api_keys WHERE id = ?`).bind(id).run();
    return true;
  } catch {
    return false;
  }
}

export async function updateLastUsed(env: Env, id: string): Promise<void> {
  await env.DB.prepare(
    `UPDATE api_keys SET last_used_at = ? WHERE id = ?`
  ).bind(Date.now(), id).run();
}

export async function getApiKeyDomains(env: Env, apiKeyId: string): Promise<Domain[]> {
  // Single JOIN query that:
  // 1. Filters out orphaned records (INNER JOIN excludes deleted domains)
  // 2. Only returns active domains (WHERE d.status = 'active')
  // 3. Handles deleted domains (excluded by status check)
  const results = await env.DB.prepare(
    `SELECT d.* 
     FROM api_key_domains akd
     INNER JOIN domains d ON akd.domain_id = d.id
     WHERE akd.api_key_id = ? 
     AND d.status = 'active'`
  ).bind(apiKeyId).all<Domain>();

  return results.results || [];
}

/**
 * Get all API key domain relationships (for batch processing)
 */
export async function getAllApiKeyDomains(env: Env): Promise<{ api_key_id: string; domain_id: string }[]> {
  const results = await env.DB.prepare(
    `SELECT * FROM api_key_domains`
  ).all<{ api_key_id: string; domain_id: string }>();

  return results.results || [];
}

export async function setApiKeyDomains(env: Env, apiKeyId: string, domainIds: string[]): Promise<void> {
  // Validate all domain IDs exist (don't check status - allow any existing domain)
  if (domainIds.length > 0) {
    const placeholders = domainIds.map(() => '?').join(',');
    const existingDomains = await env.DB.prepare(
      `SELECT id FROM domains WHERE id IN (${placeholders})`
    ).bind(...domainIds).all<{ id: string }>();

    const existingDomainIds = new Set((existingDomains.results || []).map(d => d.id));
    const invalidDomainIds = domainIds.filter(id => !existingDomainIds.has(id));

    if (invalidDomainIds.length > 0) {
      throw new Error(`Domain IDs not found: ${invalidDomainIds.join(', ')}`);
    }
  }

  // Use D1 batch API for atomic transaction
  const statements = [
    env.DB.prepare(`DELETE FROM api_key_domains WHERE api_key_id = ?`).bind(apiKeyId),
  ];

  // Add INSERT statements
  if (domainIds.length > 0) {
    const insertStmt = env.DB.prepare(`INSERT INTO api_key_domains (api_key_id, domain_id) VALUES (?, ?)`);
    statements.push(
      ...domainIds.map(domainId => insertStmt.bind(apiKeyId, domainId))
    );
  }

  // Execute all in one atomic transaction
  await env.DB.batch(statements);
}


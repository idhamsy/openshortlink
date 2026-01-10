/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// API Keys API endpoints

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env, Variables } from '../types';
import {
  createApiKey,
  getApiKeyById,
  listApiKeys,
  updateApiKey,
  revokeApiKey,
  deleteApiKey,
  getAllApiKeyDomains,
} from '../db/apiKeys';
import { authMiddleware } from '../middleware/auth';
import { validateJson } from '../middleware/validate';
import { requireRole } from '../middleware/authorization';
import { getDomainById, listDomains } from '../db/domains';
import { createApiKeySchema, updateApiKeySchema } from '../schemas';

const apiKeysRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// Schemas imported from ../schemas

// List API keys (admin only)
apiKeysRouter.get('/', authMiddleware, requireRole(['admin', 'owner']), async (c) => {
  // List all API keys (admin can see all)
  const apiKeysResult = await c.env.DB.prepare(
    `SELECT * FROM api_keys ORDER BY created_at DESC`
  ).all<{
    id: string;
    user_id: string;
    name: string;
    key_prefix: string;
    ip_whitelist: string | null;
    allow_all_ips: number;
    expires_at: number | null;
    last_used_at: number | null;
    created_at: number;
    status: string;
  }>();

  const allKeys = apiKeysResult.results || [];

  // Get domains for each key
  // Fetch all domains and relationships in parallel
  const [allDomains, allApiKeyDomains] = await Promise.all([
    listDomains(c.env),
    getAllApiKeyDomains(c.env),
  ]);

  // Create lookup map for domains
  const domainsById = new Map(allDomains.map(d => [d.id, d]));

  // Group domain IDs by API key ID
  const domainIdsByApiKeyId: Record<string, string[]> = {};
  for (const rel of allApiKeyDomains) {
    if (!domainIdsByApiKeyId[rel.api_key_id]) {
      domainIdsByApiKeyId[rel.api_key_id] = [];
    }
    domainIdsByApiKeyId[rel.api_key_id].push(rel.domain_id);
  }

  // Map keys to their domains
  const keysWithDomains = allKeys.map((key) => {
    const domainIds = domainIdsByApiKeyId[key.id] || [];
    const domains = domainIds
      .map(id => domainsById.get(id))
      .filter((d): d is NonNullable<typeof d> => d !== undefined); // Filter out undefined

    return {
      id: key.id,
      user_id: key.user_id,
      name: key.name,
      key_prefix: key.key_prefix,
      domain_ids: domainIds,
      domains: domains,
      ip_whitelist: key.ip_whitelist ? JSON.parse(key.ip_whitelist) : [],
      allow_all_ips: key.allow_all_ips === 1,
      expires_at: key.expires_at || null,
      last_used_at: key.last_used_at || null,
      created_at: key.created_at,
      status: key.status,
    };
  });

  return c.json({ success: true, data: keysWithDomains });
});

// Get API key by ID (admin only)
apiKeysRouter.get('/:id', authMiddleware, requireRole(['admin', 'owner']), async (c) => {
  const id = c.req.param('id');
  const apiKey = await getApiKeyById(c.env, id);

  if (!apiKey) {
    throw new HTTPException(404, { message: 'API key not found' });
  }

  // Format response (never include full key)
  const response = {
    id: apiKey.id,
    name: apiKey.name,
    key_prefix: apiKey.key_prefix,
    domain_ids: apiKey.domain_ids || [],
    domains: apiKey.domains || [],
    ip_whitelist: apiKey.ip_whitelist ? JSON.parse(apiKey.ip_whitelist) : [],
    allow_all_ips: apiKey.allow_all_ips === 1,
    expires_at: apiKey.expires_at || null,
    last_used_at: apiKey.last_used_at || null,
    created_at: apiKey.created_at,
    status: apiKey.status,
  };

  return c.json({ success: true, data: response });
});

// Create API key (admin only)
// Note: Rate limiting intentionally removed for simplicity (internal/self-hosted use)
// Production deployments should use Cloudflare's infrastructure-level rate limiting or add:
// createRateLimit({ window: 60, max: 10, key: (c) => `apikey:create:${c.req.header('CF-Connecting-IP')}` })
apiKeysRouter.post('/', authMiddleware, requireRole(['admin', 'owner']), validateJson(createApiKeySchema), async (c) => {
  const validated = c.req.valid('json');

  // Get user_id from validated body or use current admin user
  const userId = validated.user_id || (c.get('user') as { id: string }).id;

  // Validate domains if provided
  if (validated.domain_ids && validated.domain_ids.length > 0) {
    // Get user's domains to verify ownership
    const userDomains = await listDomains(c.env);

    // For now, we'll allow any domain (could add user-domain ownership check later)
    for (const domainId of validated.domain_ids) {
      const domain = await getDomainById(c.env, domainId);
      if (!domain) {
        throw new HTTPException(404, { message: `Domain ${domainId} not found` });
      }
    }
  }

  // Validate expiration is in future (only if provided and not null)
  if (validated.expires_at !== null && validated.expires_at !== undefined && validated.expires_at <= Date.now()) {
    throw new HTTPException(400, { message: 'Expiration date must be in the future' });
  }

  // Validate IP whitelist: if allow_all_ips is false, ip_whitelist must be provided and not empty
  if (!validated.allow_all_ips) {
    if (!validated.ip_whitelist || validated.ip_whitelist.length === 0) {
      throw new HTTPException(400, { message: 'IP whitelist is required when "Allow All IPs" is disabled. Please provide at least one IP address or enable "Allow All IPs".' });
    }
  }

  // Create API key (generates and hashes key internally)
  // null = never expires, undefined = not provided (will default to null in DB), number = specific expiration
  const apiKeyWithKey = await createApiKey(c.env, userId, {
    name: validated.name,
    domain_ids: validated.domain_ids,
    ip_whitelist: validated.ip_whitelist,
    allow_all_ips: validated.allow_all_ips,
    expires_at: validated.expires_at ?? undefined, // Keep null for "never expire", convert to undefined if not provided
  });

  // Format response (include full key ONLY on creation)
  const response = {
    id: apiKeyWithKey.id,
    name: apiKeyWithKey.name,
    key_prefix: apiKeyWithKey.key_prefix,
    domain_ids: apiKeyWithKey.domain_ids || [],
    domains: apiKeyWithKey.domains || [],
    ip_whitelist: apiKeyWithKey.ip_whitelist ? JSON.parse(apiKeyWithKey.ip_whitelist) : [],
    allow_all_ips: apiKeyWithKey.allow_all_ips === 1,
    expires_at: apiKeyWithKey.expires_at || null,
    created_at: apiKeyWithKey.created_at,
    status: apiKeyWithKey.status,
    api_key: apiKeyWithKey.api_key, // Only shown once!
  };

  return c.json({ success: true, data: response }, 201);
});

// Update API key (admin only)
apiKeysRouter.put('/:id', authMiddleware, requireRole(['admin', 'owner']), validateJson(updateApiKeySchema), async (c) => {
  const id = c.req.param('id');
  const validated = c.req.valid('json');

  const existingKey = await getApiKeyById(c.env, id);
  if (!existingKey) {
    throw new HTTPException(404, { message: 'API key not found' });
  }

  // Validate domains if provided
  if (validated.domain_ids !== undefined && validated.domain_ids.length > 0) {
    for (const domainId of validated.domain_ids) {
      const domain = await getDomainById(c.env, domainId);
      if (!domain) {
        throw new HTTPException(404, { message: `Domain ${domainId} not found` });
      }
    }
  }

  // Validate expiration is in future
  if (validated.expires_at !== undefined && validated.expires_at !== null && validated.expires_at <= Date.now()) {
    throw new HTTPException(400, { message: 'Expiration date must be in the future' });
  }

  // Validate IP whitelist: if allow_all_ips is being set to false, ip_whitelist must be provided and not empty
  // Also check if allow_all_ips is false and ip_whitelist is being cleared
  const finalAllowAllIps = validated.allow_all_ips !== undefined ? validated.allow_all_ips : existingKey.allow_all_ips === 1;
  const finalIpWhitelist = validated.ip_whitelist !== undefined ? validated.ip_whitelist : (existingKey.ip_whitelist ? JSON.parse(existingKey.ip_whitelist) : []);

  if (!finalAllowAllIps && (!finalIpWhitelist || finalIpWhitelist.length === 0)) {
    throw new HTTPException(400, { message: 'IP whitelist is required when "Allow All IPs" is disabled. Please provide at least one IP address or enable "Allow All IPs".' });
  }

  // Prepare updates
  const updates: Parameters<typeof updateApiKey>[2] = {};
  if (validated.name !== undefined) {
    updates.name = validated.name;
  }
  if (validated.ip_whitelist !== undefined) {
    updates.ip_whitelist = validated.ip_whitelist;
  }
  if (validated.allow_all_ips !== undefined) {
    updates.allow_all_ips = validated.allow_all_ips;
  }
  if (validated.expires_at !== undefined) {
    // null = never expires, number = specific expiration date
    updates.expires_at = validated.expires_at;
  }
  if (validated.domain_ids !== undefined) {
    updates.domain_ids = validated.domain_ids;
  }

  const updatedKey = await updateApiKey(c.env, id, updates);
  if (!updatedKey) {
    throw new HTTPException(500, { message: 'Failed to update API key' });
  }

  // Format response (never include full key)
  const response = {
    id: updatedKey.id,
    name: updatedKey.name,
    key_prefix: updatedKey.key_prefix,
    domain_ids: updatedKey.domain_ids || [],
    domains: updatedKey.domains || [],
    ip_whitelist: updatedKey.ip_whitelist ? JSON.parse(updatedKey.ip_whitelist) : [],
    allow_all_ips: updatedKey.allow_all_ips === 1,
    expires_at: updatedKey.expires_at || null,
    last_used_at: updatedKey.last_used_at || null,
    created_at: updatedKey.created_at,
    status: updatedKey.status,
  };

  return c.json({ success: true, data: response });
});

// Revoke API key (admin only)
apiKeysRouter.delete('/:id', authMiddleware, requireRole(['admin', 'owner']), async (c) => {
  const id = c.req.param('id');
  const hardDelete = c.req.query('hard') === 'true';

  const existingKey = await getApiKeyById(c.env, id);
  if (!existingKey) {
    throw new HTTPException(404, { message: 'API key not found' });
  }

  if (hardDelete) {
    const success = await deleteApiKey(c.env, id);
    if (!success) {
      throw new HTTPException(500, { message: 'Failed to delete API key' });
    }
    return c.json({ success: true, message: 'API key deleted' });
  } else {
    const revoked = await revokeApiKey(c.env, id);
    if (!revoked) {
      throw new HTTPException(500, { message: 'Failed to revoke API key' });
    }
    return c.json({ success: true, message: 'API key revoked' });
  }
});

export { apiKeysRouter };


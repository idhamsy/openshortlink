/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Domains API endpoints

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env, User } from '../types';
import {
  getDomainById,
  getDomainByName,
  createDomain,
  updateDomain,
  listDomains,
  buildDomainSettings,
} from '../db/domains';
import { authMiddleware } from '../middleware/auth';
import { validateJson } from '../middleware/validate';
import { requireRole, requireDomainAccessFromParam } from '../middleware/authorization';
import { filterDomainsByAccess } from '../utils/permissions';
import { createDomainSchema, updateDomainSchema } from '../schemas';

const domainsRouter = new Hono<{ Bindings: Env }>();

// Schemas imported from ../schemas

// List domains
domainsRouter.get('/', authMiddleware, async (c) => {
  const accountId = c.req.query('account_id');
  const domains = await listDomains(c.env, accountId || undefined);

  // Filter by user's domain access (admin sees all)
  const user = (c as any).get('user') as User;
  // Use cached accessible_domain_ids from context (already fetched in authMiddleware)
  const accessibleDomainIds = (user as any).accessible_domain_ids;
  const filteredDomains = await filterDomainsByAccess(c.env, domains, user, accessibleDomainIds);

  return c.json({ success: true, data: filteredDomains });
});

// Get domain by ID
domainsRouter.get('/:id', authMiddleware, requireDomainAccessFromParam('view'), async (c) => {
  const id = c.req.param('id');
  const domain = await getDomainById(c.env, id);

  if (!domain) {
    throw new HTTPException(404, { message: 'Domain not found' });
  }

  return c.json({ success: true, data: domain });
});

// Create domain (admin only)
// Note: Rate limiting intentionally removed for simplicity (internal/self-hosted use)
// Production deployments should use Cloudflare's infrastructure-level rate limiting or add:
// createRateLimit({ window: 60, max: 10, key: (c) => `domain:create:${c.req.header('CF-Connecting-IP')}` })
domainsRouter.post('/', authMiddleware, requireRole(['admin', 'owner']), validateJson(createDomainSchema), async (c) => {
  try {
    const validated = c.req.valid('json');

    // Check if domain already exists
    const existing = await getDomainByName(c.env, validated.domain_name);
    if (existing) {
      throw new HTTPException(409, { message: 'Domain already exists' });
    }

    // Build settings from routes
    const settings = buildDomainSettings(validated.routes);

    // Use first route as routing_path for backward compatibility
    const routingPath = validated.routing_path || validated.routes[0];

    const domain = await createDomain(c.env, {
      cloudflare_account_id: validated.cloudflare_account_id,
      domain_name: validated.domain_name,
      routing_path: routingPath,
      default_redirect_code: validated.default_redirect_code,
      status: validated.status,
      settings,
    });

    return c.json({ success: true, data: domain }, 201);
  } catch (error) {
    console.error('[DOMAIN CREATE ERROR]', error);
    // Re-throw HTTPExceptions as-is
    if (error instanceof HTTPException) {
      throw error;
    }
    // Handle UNIQUE constraint violation (duplicate domain name)
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      throw new HTTPException(409, {
        message: 'Domain already exists'
      });
    }
    // Convert other errors to HTTPException with descriptive message
    throw new HTTPException(500, {
      message: error instanceof Error ? error.message : 'Failed to create domain'
    });
  }
});

// Update domain (admin only)
domainsRouter.put('/:id', authMiddleware, requireDomainAccessFromParam('edit'), validateJson(updateDomainSchema), async (c) => {
  const id = c.req.param('id');
  const validated = c.req.valid('json');

  const existingDomain = await getDomainById(c.env, id);
  if (!existingDomain) {
    throw new HTTPException(404, { message: 'Domain not found' });
  }

  const updates: Parameters<typeof updateDomain>[2] = {};
  if (validated.domain_name !== undefined) {
    updates.domain_name = validated.domain_name;
  }
  if (validated.default_redirect_code !== undefined) {
    updates.default_redirect_code = validated.default_redirect_code;
  }
  if (validated.status !== undefined) {
    updates.status = validated.status;
  }

  // Handle routes updates
  if (validated.routes !== undefined) {
    // Get current settings
    const currentRoutes = validated.routes || existingDomain.routes || [existingDomain.routing_path];

    // Build new settings
    updates.settings = buildDomainSettings(currentRoutes);

    // Update routing_path if routes changed
    updates.routing_path = validated.routes[0];
  }

  // Handle legacy routing_path update
  if (validated.routing_path !== undefined && validated.routes === undefined) {
    updates.routing_path = validated.routing_path;
  }

  const domain = await updateDomain(c.env, id, updates);

  if (!domain) {
    // Try to get the domain one more time in case update succeeded but retrieval failed
    const retrievedDomain = await getDomainById(c.env, id);
    if (retrievedDomain) {
      return c.json({ success: true, data: retrievedDomain });
    }
    throw new HTTPException(500, { message: 'Failed to update domain' });
  }

  return c.json({ success: true, data: domain });
});

// Toggle domain status (admin only - activate/deactivate)
domainsRouter.delete('/:id', authMiddleware, requireDomainAccessFromParam('delete'), async (c) => {
  const id = c.req.param('id');
  const hardDelete = c.req.query('hard') === 'true';

  const domain = await getDomainById(c.env, id);
  if (!domain) {
    throw new HTTPException(404, { message: 'Domain not found' });
  }

  if (hardDelete) {
    // In production, you might want to add a proper delete function
    throw new HTTPException(400, { message: 'Hard delete not implemented' });
  }

  // Toggle status: active -> inactive, inactive -> active
  const newStatus = domain.status === 'active' ? 'inactive' : 'active';
  await updateDomain(c.env, id, { status: newStatus });

  const action = newStatus === 'active' ? 'activated' : 'deactivated';
  return c.json({ success: true, message: `Domain ${action}`, data: { status: newStatus } });
});

export { domainsRouter };


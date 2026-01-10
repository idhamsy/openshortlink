/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Categories API endpoints

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env, User, Variables } from '../types';
import { listCategories, countCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from '../db/categories';
import { getDomainById } from '../db/domains';
import { authMiddleware } from '../middleware/auth';
import { validateJson } from '../middleware/validate';
import { requirePermission } from '../middleware/authorization';
import { filterCategoriesByAccess, canAccessDomain } from '../utils/permissions';
import { createCategorySchema, updateCategorySchema } from '../schemas';

const categoriesRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// Schemas imported from ../schemas

// List categories
categoriesRouter.get('/', authMiddleware, async (c) => {
  const domainId = c.req.query('domain_id');
  const limitParam = c.req.query('limit');
  const offsetParam = c.req.query('offset');

  // Validate and set limit (default 25, max 500)
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam) || 25, 1), 500) : 25;
  const offset = offsetParam ? Math.max(parseInt(offsetParam) || 0, 0) : 0;

  let categories = await listCategories(c.env, {
    domainId: domainId || undefined,
    limit: 10000, // Get all for filtering
    offset: 0,
  });

  // Filter by user's domain access
  const user = c.get('user') as User;
  // Use cached accessible_domain_ids from context (already fetched in authMiddleware)
  const accessibleDomainIds = (user as any).accessible_domain_ids;
  categories = await filterCategoriesByAccess(c.env, categories, user, accessibleDomainIds);

  // Apply pagination after filtering
  const totalCount = categories.length;
  categories = categories.slice(offset, offset + limit);

  return c.json({
    success: true,
    data: categories,
    pagination: {
      limit,
      offset,
      count: categories.length,
      total: totalCount,
      hasMore: offset + limit < totalCount,
    },
  });
});

// Get category by ID
categoriesRouter.get('/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const category = await getCategoryById(c.env, id);

  if (!category) {
    throw new HTTPException(404, { message: 'Category not found' });
  }

  // Check domain access if category has a domain
  if (category.domain_id) {
    const user = c.get('user') as User;
    const hasAccess = await canAccessDomain(c.env, user, category.domain_id);
    if (!hasAccess) {
      throw new HTTPException(403, { message: 'Access denied. You do not have access to this domain.' });
    }
  }

  return c.json({ success: true, data: category });
});

// Create category
// Note: Rate limiting intentionally removed for simplicity (internal/self-hosted use)
// Production deployments should use Cloudflare's infrastructure-level rate limiting or add:
// createRateLimit({ window: 60, max: 20, key: (c) => `category:create:${c.req.header('CF-Connecting-IP')}` })
categoriesRouter.post('/', authMiddleware, requirePermission('manage_categories'), validateJson(createCategorySchema), async (c) => {
  const validated = c.req.valid('json');

  // Validate domain exists if domain_id is provided
  if (validated.domain_id) {
    const domain = await getDomainById(c.env, validated.domain_id);
    if (!domain) {
      throw new HTTPException(404, { message: 'Domain not found' });
    }

    // Check domain access
    const user = c.get('user') as User;
    const hasAccess = await canAccessDomain(c.env, user, validated.domain_id);
    if (!hasAccess) {
      throw new HTTPException(403, { message: 'Access denied. You do not have access to this domain.' });
    }
  }

  // Check if category already exists for this domain
  const existingCategories = await listCategories(c.env, { domainId: validated.domain_id });
  if (existingCategories.some(c => c.name.toLowerCase() === validated.name.toLowerCase())) {
    throw new HTTPException(409, { message: 'Category already exists' });
  }

  const category = await createCategory(c.env, validated);

  return c.json({ success: true, data: category }, 201);
});

// Update category
categoriesRouter.put('/:id', authMiddleware, requirePermission('manage_categories'), validateJson(updateCategorySchema), async (c) => {
  try {
    const id = c.req.param('id');
    const validated = c.req.valid('json');

    const existingCategory = await getCategoryById(c.env, id);
    if (!existingCategory) {
      throw new HTTPException(404, { message: 'Category not found' });
    }

    // Check domain access if category has a domain
    if (existingCategory.domain_id) {
      const user = c.get('user') as User;
      const hasAccess = await canAccessDomain(c.env, user, existingCategory.domain_id);
      if (!hasAccess) {
        throw new HTTPException(403, { message: 'Access denied. You do not have access to this domain.' });
      }
    }

    const category = await updateCategory(c.env, id, validated);

    return c.json({ success: true, data: category });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    // Handle UNIQUE constraint violation
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('UNIQUE constraint failed')) {
      throw new HTTPException(409, { message: 'A category with this name already exists in this domain' });
    }
    console.error('[CATEGORY UPDATE ERROR]', error);
    throw new HTTPException(500, { message: 'Failed to update category' });
  }
});

// Delete category
categoriesRouter.delete('/:id', authMiddleware, requirePermission('manage_categories'), async (c) => {
  const id = c.req.param('id');

  const existingCategory = await getCategoryById(c.env, id);
  if (!existingCategory) {
    throw new HTTPException(404, { message: 'Category not found' });
  }

  // Check domain access if category has a domain
  if (existingCategory.domain_id) {
    const user = c.get('user') as User;
    const hasAccess = await canAccessDomain(c.env, user, existingCategory.domain_id);
    if (!hasAccess) {
      throw new HTTPException(403, { message: 'Access denied. You do not have access to this domain.' });
    }
  }

  await deleteCategory(c.env, id);

  return c.json({ success: true, message: 'Category deleted successfully' });
});

export { categoriesRouter };


/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Database operations for categories

import type { Category, Env } from '../types';
import { generateId } from '../utils/id';

export async function listCategories(
  env: Env,
  options: {
    domainId?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<Category[]> {
  let query = 'SELECT * FROM categories';
  const params: unknown[] = [];

  if (options.domainId) {
    query += ' WHERE domain_id = ?';
    params.push(options.domainId);
  }

  query += ' ORDER BY name ASC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  const result = await env.DB.prepare(query).bind(...params).all<Category>();
  return result.results || [];
}

export async function countCategories(env: Env, domainId?: string): Promise<number> {
  let query = 'SELECT COUNT(*) as count FROM categories';
  const params: unknown[] = [];

  if (domainId) {
    query += ' WHERE domain_id = ?';
    params.push(domainId);
  }

  const result = await env.DB.prepare(query).bind(...params).first<{ count: number }>();
  return result?.count || 0;
}

export async function getCategoryById(env: Env, categoryId: string): Promise<Category | null> {
  const result = await env.DB.prepare('SELECT * FROM categories WHERE id = ?')
    .bind(categoryId)
    .first<Category>();
  return result || null;
}

export async function createCategory(
  env: Env,
  category: Omit<Category, 'id' | 'created_at'>
): Promise<Category> {
  const id = generateId('cat');
  const now = Date.now();

  // Try using RETURNING clause
  try {
    const result = await env.DB.prepare(
      `INSERT INTO categories (id, name, domain_id, icon, created_at) VALUES (?, ?, ?, ?, ?) RETURNING *`
    )
      .bind(id, category.name, category.domain_id || null, category.icon || null, now)
      .first<Category>();

    if (result) {
      return result;
    }
  } catch {
    // RETURNING not supported, fall back to SELECT
  }

  // Fallback: Use SELECT
  await env.DB.prepare(
    `INSERT INTO categories (id, name, domain_id, icon, created_at) VALUES (?, ?, ?, ?, ?)`
  )
    .bind(id, category.name, category.domain_id || null, category.icon || null, now)
    .run();

  return getCategoryById(env, id) as Promise<Category>;
}

export async function updateCategory(
  env: Env,
  categoryId: string,
  updates: Partial<Omit<Category, 'id' | 'created_at'>>
): Promise<Category | null> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.icon !== undefined) {
    fields.push('icon = ?');
    values.push(updates.icon);
  }

  if (fields.length === 0) {
    return getCategoryById(env, categoryId);
  }

  values.push(categoryId);

  // Try using RETURNING clause
  try {
    const result = await env.DB.prepare(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = ? RETURNING *`
    ).bind(...values).first<Category>();

    if (result) {
      return result;
    }
  } catch {
    // RETURNING not supported, fall back to SELECT
  }

  // Fallback: Use SELECT
  await env.DB.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return getCategoryById(env, categoryId);
}

export async function deleteCategory(env: Env, categoryId: string): Promise<boolean> {
  const result = await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(categoryId).run();
  return result.success;
}

/**
 * Batch fetch categories for multiple links (optimized to avoid N+1 queries)
 * Categories are stored in link.metadata as JSON with category_id field
 * Returns a Map where key is link_id and value is Category
 */
export async function getLinksCategoriesBatch(
  env: Env,
  links: Array<{ id: string; category_id?: string }>
): Promise<Map<string, Category>> {
  if (links.length === 0) {
    return new Map();
  }

  // Extract unique category IDs from link.category_id (dedicated column)
  const categoryIds = new Set<string>();
  const linkCategoryMap = new Map<string, string>(); // link_id -> category_id

  for (const link of links) {
    if (!link || !link.id) {
      continue; // Skip invalid links
    }
    if (link.category_id) {
      categoryIds.add(link.category_id);
      linkCategoryMap.set(link.id, link.category_id);
    }
  }

  if (categoryIds.size === 0) {
    return new Map();
  }

  // Chunk categoryIds to avoid "too many SQL variables" error
  const categoryIdsArray = Array.from(categoryIds);
  const BATCH_SIZE = 100;
  const chunks = [];
  for (let i = 0; i < categoryIdsArray.length; i += BATCH_SIZE) {
    chunks.push(categoryIdsArray.slice(i, i + BATCH_SIZE));
  }

  // Execute queries in parallel
  const results = await Promise.all(
    chunks.map(async (chunkIds) => {
      const placeholders = chunkIds.map(() => '?').join(',');
      const result = await env.DB.prepare(
        `SELECT * FROM categories WHERE id IN (${placeholders})`
      ).bind(...chunkIds).all<Category>();
      return result.results || [];
    })
  );

  // Flatten results
  const allCategories = results.flat();

  // Create category lookup map
  const categoriesMap = new Map<string, Category>();
  for (const category of allCategories) {
    categoriesMap.set(category.id, category);
  }

  // Map categories back to links
  const linksCategoriesMap = new Map<string, Category>();
  for (const [linkId, categoryId] of linkCategoryMap.entries()) {
    const category = categoriesMap.get(categoryId);
    if (category) {
      linksCategoriesMap.set(linkId, category);
    }
  }

  return linksCategoriesMap;
}


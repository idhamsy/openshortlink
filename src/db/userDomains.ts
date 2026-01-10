/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Database operations for user-domain relationships

import type { UserDomain, Env } from '../types';

/**
 * Get all domains a user has access to
 */
export async function getUserDomains(env: Env, userId: string): Promise<UserDomain[]> {
  const results = await env.DB.prepare(
    `SELECT * FROM user_domains WHERE user_id = ? ORDER BY created_at DESC`
  )
    .bind(userId)
    .all<UserDomain>();

  return results.results || [];
}

/**
 * Get all user-domain relationships (for batch processing)
 */
export async function getAllUserDomains(env: Env): Promise<UserDomain[]> {
  const results = await env.DB.prepare(
    `SELECT * FROM user_domains ORDER BY user_id`
  ).all<UserDomain>();

  return results.results || [];
}

/**
 * Get all domain IDs a user has access to (as array of strings)
 */
export async function getUserDomainIds(env: Env, userId: string): Promise<string[]> {
  const userDomains = await getUserDomains(env, userId);
  return userDomains.map(ud => ud.domain_id);
}

/**
 * Check if a user has access to a specific domain
 * Optimized: Single query with JOIN instead of two separate queries
 */
export async function hasDomainAccess(env: Env, userId: string, domainId: string): Promise<boolean> {
  // Single query with JOIN to check both global_access and specific domain access
  const result = await env.DB.prepare(
    `SELECT 
      CASE 
        WHEN u.global_access = 1 THEN 1
        WHEN ud.domain_id IS NOT NULL THEN 1
        ELSE 0
      END as has_access
    FROM users u
    LEFT JOIN user_domains ud ON u.id = ud.user_id AND ud.domain_id = ?
    WHERE u.id = ?
    LIMIT 1`
  )
    .bind(domainId, userId)
    .first<{ has_access: number }>();

  return result?.has_access === 1;
}

/**
 * Add domain access for a user
 */
export async function addUserDomain(env: Env, userId: string, domainId: string): Promise<UserDomain> {
  const now = Date.now();

  await env.DB.prepare(
    `INSERT OR IGNORE INTO user_domains (user_id, domain_id, created_at) VALUES (?, ?, ?)`
  )
    .bind(userId, domainId, now)
    .run();

  const result = await env.DB.prepare(
    `SELECT * FROM user_domains WHERE user_id = ? AND domain_id = ?`
  )
    .bind(userId, domainId)
    .first<UserDomain>();

  if (!result) {
    throw new Error('Failed to create user domain relationship');
  }

  // Increment permission_version to invalidate all caches
  await env.DB.prepare(
    `UPDATE users SET permission_version = COALESCE(permission_version, 0) + 1 WHERE id = ?`
  ).bind(userId).run();

  return result;
}

/**
 * Remove domain access for a user
 */
export async function removeUserDomain(env: Env, userId: string, domainId: string): Promise<boolean> {
  const result = await env.DB.prepare(
    `DELETE FROM user_domains WHERE user_id = ? AND domain_id = ?`
  )
    .bind(userId, domainId)
    .run();

  if (result.success) {
    // Increment permission_version to invalidate all caches
    await env.DB.prepare(
      `UPDATE users SET permission_version = COALESCE(permission_version, 0) + 1 WHERE id = ?`
    ).bind(userId).run();
  }

  return result.success;
}

/**
 * Set user's domain access (replaces all existing domain access)
 */
export async function setUserDomains(env: Env, userId: string, domainIds: string[]): Promise<void> {
  // Remove all existing domain access
  await env.DB.prepare(`DELETE FROM user_domains WHERE user_id = ?`).bind(userId).run();

  // Add new domain access
  if (domainIds.length > 0) {
    const now = Date.now();
    const stmt = env.DB.prepare(
      `INSERT INTO user_domains (user_id, domain_id, created_at) VALUES (?, ?, ?)`
    );

    // Use batch insert for better performance
    await env.DB.batch(
      domainIds.map(domainId => stmt.bind(userId, domainId, now))
    );
  }

  // Increment permission_version to invalidate all caches
  await env.DB.prepare(
    `UPDATE users SET permission_version = COALESCE(permission_version, 0) + 1 WHERE id = ?`
  ).bind(userId).run();
}

/**
 * Get all users with access to a specific domain
 */
export async function getUsersWithDomainAccess(env: Env, domainId: string): Promise<string[]> {
  const results = await env.DB.prepare(
    `SELECT DISTINCT user_id FROM user_domains WHERE domain_id = ?`
  )
    .bind(domainId)
    .all<{ user_id: string }>();

  return (results.results || []).map(r => r.user_id);
}

/**
 * Get all users with global access
 */
export async function getUsersWithGlobalAccess(env: Env): Promise<string[]> {
  const results = await env.DB.prepare(
    `SELECT id FROM users WHERE global_access = 1`
  )
    .all<{ id: string }>();

  return (results.results || []).map(r => r.id);
}

/**
 * Remove all domain access for a user (when setting global_access = 1)
 */
export async function clearUserDomains(env: Env, userId: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM user_domains WHERE user_id = ?`).bind(userId).run();
  // Note: permission_version is incremented by the caller (updateUser) to avoid double increment
}


/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Database operations for users

import type { User, Env } from '../types';
import { generateId } from '../utils/id';
import { clearUserDomains } from './userDomains';

export async function getUserById(env: Env, userId: string): Promise<User | null> {
  const result = await env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(userId).first<User>();
  return result || null;
}

export async function getUserByEmail(env: Env, email: string): Promise<User | null> {
  const result = await env.DB.prepare(`SELECT * FROM users WHERE email = ?`).bind(email).first<User>();
  return result || null;
}

export async function getUserByUsername(env: Env, username: string): Promise<User | null> {
  const result = await env.DB.prepare(`SELECT * FROM users WHERE username = ?`).bind(username).first<User>();
  return result || null;
}

export async function createUser(
  env: Env,
  user: Omit<User, 'id' | 'created_at' | 'updated_at' | 'last_login_at'> & { password_hash?: string }
): Promise<User> {
  const id = generateId('user');
  const now = Date.now();

  // Set global_access: admin always has global access, others default to 0
  const globalAccess = user.role === 'admin' || user.role === 'owner' ? 1 : (user.global_access ?? 0);

  await env.DB.prepare(
    `INSERT INTO users (
      id, email, username, password_hash, cloudflare_access_id,
      role, preferences, created_at, updated_at, global_access
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      user.email || null,
      (user as { username?: string }).username || null,
      (user as { password_hash?: string }).password_hash || null,
      user.cloudflare_access_id || null,
      user.role,
      user.preferences || null,
      now,
      now,
      globalAccess
    )
    .run();

  return getUserById(env, id) as Promise<User>;
}

export async function updateUser(
  env: Env,
  userId: string,
  updates: Partial<Omit<User, 'id' | 'created_at'>>
): Promise<User | null> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.email !== undefined) {
    fields.push('email = ?');
    values.push(updates.email);
  }
  if ((updates as { username?: string }).username !== undefined) {
    fields.push('username = ?');
    values.push((updates as { username?: string }).username);
  }
  if ((updates as { password_hash?: string }).password_hash !== undefined) {
    fields.push('password_hash = ?');
    values.push((updates as { password_hash?: string }).password_hash);
  }
  if (updates.role !== undefined) {
    fields.push('role = ?');
    values.push(updates.role);
  }
  if (updates.preferences !== undefined) {
    fields.push('preferences = ?');
    values.push(updates.preferences);
  }
  if ((updates as { mfa_enabled?: number }).mfa_enabled !== undefined) {
    fields.push('mfa_enabled = ?');
    values.push((updates as { mfa_enabled?: number }).mfa_enabled);
  }
  if ((updates as { mfa_secret?: string }).mfa_secret !== undefined) {
    fields.push('mfa_secret = ?');
    values.push((updates as { mfa_secret?: string }).mfa_secret);
  }
  if ((updates as { mfa_backup_codes?: string }).mfa_backup_codes !== undefined) {
    fields.push('mfa_backup_codes = ?');
    values.push((updates as { mfa_backup_codes?: string }).mfa_backup_codes);
  }
  let permissionChanged = false;
  
  if (updates.global_access !== undefined) {
    fields.push('global_access = ?');
    values.push(updates.global_access);
    permissionChanged = true;
    
    // If setting global_access to 1, clear specific domain access
    if (updates.global_access === 1) {
      await clearUserDomains(env, userId);
    }
  }
  // If role is being updated to admin, ensure global_access is 1
  if (updates.role === 'admin' || updates.role === 'owner') {
    permissionChanged = true;
    // Check if global_access field is already being updated
    const hasGlobalAccessUpdate = updates.global_access !== undefined;
    if (!hasGlobalAccessUpdate) {
      fields.push('global_access = ?');
      values.push(1);
      await clearUserDomains(env, userId);
    }
  }

  // Increment permission_version if domain access changed
  if (permissionChanged) {
    fields.push('permission_version = COALESCE(permission_version, 0) + 1');
  }

  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(userId);

  await env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();

  return getUserById(env, userId);
}

export async function updateLastLogin(env: Env, userId: string): Promise<void> {
  await env.DB.prepare(`UPDATE users SET last_login_at = ? WHERE id = ?`)
    .bind(Date.now(), userId)
    .run();
}


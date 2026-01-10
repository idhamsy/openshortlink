/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Permission checking utilities for multi-user system

import type { User, Domain, Link, Tag, Category } from '../types';
import { hasDomainAccess, getUserDomainIds } from '../db/userDomains';
import type { Env } from '../types';

/**
 * Check if user has a specific permission based on role
 */
export function hasPermission(user: User, permission: string): boolean {
  const role = user.role;
  
  // Admin has all permissions
  if (role === 'admin' || role === 'owner') {
    return true;
  }
  
  // Permission matrix
  const permissions: Record<string, string[]> = {
    'manage_users': ['admin'],
    'manage_domains': ['admin'],
    'create_links': ['admin', 'user'],
    'edit_links': ['admin', 'user'],
    'delete_links': ['admin', 'user'],
    'view_analytics': ['admin', 'user', 'analyst'],
    'manage_tags': ['admin', 'user'],
    'manage_categories': ['admin', 'user'],
    'manage_api_keys': ['admin'],
  };
  
  const allowedRoles = permissions[permission] || [];
  return allowedRoles.includes(role);
}

/**
 * Check if user can access a domain (considering global_access and specific domain access)
 */
export async function canAccessDomain(
  env: Env,
  user: User,
  domainId: string
): Promise<boolean> {
  // Admin always has access
  if (user.role === 'admin' || user.role === 'owner') {
    return true;
  }
  
  // Check global access
  if (user.global_access === 1) {
    return true;
  }
  
  // Check specific domain access
  return hasDomainAccess(env, user.id, domainId);
}

/**
 * Filter domains by user's access
 * Optimized: Accepts accessibleDomainIds from context to avoid DB query
 */
export async function filterDomainsByAccess(
  env: Env,
  domains: Domain[],
  user: User,
  accessibleDomainIds?: string[] // Optional: pass from context to avoid DB query
): Promise<Domain[]> {
  // Admin sees all domains
  if (user.role === 'admin' || user.role === 'owner') {
    return domains;
  }
  
  // If global access, return all
  if (user.global_access === 1) {
    return domains;
  }
  
  // Use provided domain IDs or fetch from DB (backward compatibility)
  let domainIds: string[];
  if (accessibleDomainIds !== undefined) {
    domainIds = accessibleDomainIds;
  } else {
    domainIds = await getUserDomainIds(env, user.id);
  }
  
  const accessibleDomainIdsSet = new Set(domainIds);
  
  // Filter domains
  return domains.filter(domain => accessibleDomainIdsSet.has(domain.id));
}

/**
 * Filter links by user's domain access
 * Optimized: Accepts accessibleDomainIds from context to avoid DB query
 */
export function filterLinksByAccess(
  links: Link[],
  accessibleDomainIds: string[] | undefined, // Pass from context
  hasGlobalAccess: boolean // Pass from context
): Link[] {
  // Admin/global access sees all links
  if (hasGlobalAccess) {
    return links;
  }
  
  // If no accessible domains, return empty
  if (!accessibleDomainIds || accessibleDomainIds.length === 0) {
    return [];
  }
  
  const accessibleDomainIdsSet = new Set(accessibleDomainIds);
  
  // Filter links
  return links.filter(link => accessibleDomainIdsSet.has(link.domain_id));
}

/**
 * Filter tags by user's domain access
 * Optimized: Accepts accessibleDomainIds from context to avoid DB query
 */
export async function filterTagsByAccess(
  env: Env,
  tags: Tag[],
  user: User,
  accessibleDomainIds?: string[] // Optional: pass from context to avoid DB query
): Promise<Tag[]> {
  // Admin sees all tags
  if (user.role === 'admin' || user.role === 'owner') {
    return tags;
  }
  
  // If global access, return all
  if (user.global_access === 1) {
    return tags;
  }
  
  // Use provided domain IDs or fetch from DB (backward compatibility)
  let domainIds: string[];
  if (accessibleDomainIds !== undefined) {
    domainIds = accessibleDomainIds;
  } else {
    domainIds = await getUserDomainIds(env, user.id);
  }
  
  const accessibleDomainIdsSet = new Set(domainIds);
  
  // Filter tags (tags without domain_id are considered global and accessible to all)
  return tags.filter(tag => !tag.domain_id || accessibleDomainIdsSet.has(tag.domain_id));
}

/**
 * Filter categories by user's domain access
 * Optimized: Accepts accessibleDomainIds from context to avoid DB query
 */
export async function filterCategoriesByAccess(
  env: Env,
  categories: Category[],
  user: User,
  accessibleDomainIds?: string[] // Optional: pass from context to avoid DB query
): Promise<Category[]> {
  // Admin sees all categories
  if (user.role === 'admin' || user.role === 'owner') {
    return categories;
  }
  
  // If global access, return all
  if (user.global_access === 1) {
    return categories;
  }
  
  // Use provided domain IDs or fetch from DB (backward compatibility)
  let domainIds: string[];
  if (accessibleDomainIds !== undefined) {
    domainIds = accessibleDomainIds;
  } else {
    domainIds = await getUserDomainIds(env, user.id);
  }
  
  const accessibleDomainIdsSet = new Set(domainIds);
  
  // Filter categories (categories without domain_id are considered global and accessible to all)
  return categories.filter(cat => !cat.domain_id || accessibleDomainIdsSet.has(cat.domain_id));
}

/**
 * Check if user can perform action on a link
 */
export async function canAccessLink(
  env: Env,
  user: User,
  link: Link,
  action: 'view' | 'edit' | 'delete' = 'view'
): Promise<boolean> {
  // Check domain access first
  const hasAccess = await canAccessDomain(env, user, link.domain_id);
  if (!hasAccess) {
    return false;
  }
  
  // Check role permissions for action
  if (action === 'view') {
    return hasPermission(user, 'view_analytics'); // Viewing links requires analytics permission
  }
  
  if (action === 'edit' || action === 'delete') {
    return hasPermission(user, 'edit_links');
  }
  
  return false;
}

/**
 * Check if user can perform action on a domain
 */
export async function canAccessDomainAction(
  env: Env,
  user: User,
  domain: Domain,
  action: 'view' | 'edit' | 'delete' = 'view'
): Promise<boolean> {
  // Check domain access first
  const hasAccess = await canAccessDomain(env, user, domain.id);
  if (!hasAccess) {
    return false;
  }
  
  // Domain management is admin-only
  if (action === 'edit' || action === 'delete') {
    return hasPermission(user, 'manage_domains');
  }
  
  return true; // View is allowed if domain access is granted
}


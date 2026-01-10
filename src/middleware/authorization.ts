/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Authorization middleware for role and domain access checks

import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env, User, Variables } from '../types';
import { hasPermission, canAccessDomain, canAccessLink, canAccessDomainAction } from '../utils/permissions';
import { getLinkById } from '../db/links';
import { getDomainById } from '../db/domains';

/**
 * Require user to have one of the specified roles
 */
export function requireRole(roles: string[]) {
  return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
    const user = c.get('user') as User | undefined;
    
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' });
    }
    
    if (!roles.includes(user.role)) {
      throw new HTTPException(403, { 
        message: `Access denied. Required role: ${roles.join(' or ')}` 
      });
    }
    
    await next();
  };
}

/**
 * Require user to have a specific permission
 */
export function requirePermission(permission: string) {
  return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
    const user = c.get('user') as User | undefined;
    
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' });
    }
    
    if (!hasPermission(user, permission)) {
      throw new HTTPException(403, { 
        message: `Access denied. Required permission: ${permission}` 
      });
    }
    
    await next();
  };
}

/**
 * Require user to have access to a domain (from query param, body, or route param)
 */
export function requireDomainAccess() {
  return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
    const user = c.get('user') as User | undefined;
    
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' });
    }
    
    // Admin always has access
    if (user.role === 'admin' || user.role === 'owner') {
      await next();
      return;
    }
    
    // Try to get domain_id from various sources
    let domainId: string | undefined;
    
    // From route param
    domainId = c.req.param('domain_id') || c.req.param('id');
    
    // From query param
    if (!domainId) {
      domainId = c.req.query('domain_id');
    }
    
    // From body (for POST/PUT requests)
    if (!domainId) {
      try {
        const body = await c.req.json().catch(() => ({}));
        domainId = body.domain_id;
      } catch {
        // Ignore JSON parse errors
      }
    }
    
    if (!domainId) {
      throw new HTTPException(400, { message: 'domain_id is required' });
    }
    
    // Check domain access
    const hasAccess = await canAccessDomain(c.env, user, domainId);
    if (!hasAccess) {
      throw new HTTPException(403, { 
        message: 'Access denied. You do not have access to this domain.' 
      });
    }
    
    await next();
  };
}

/**
 * Require user to have access to a link (from route param)
 */
export function requireLinkAccess(action: 'view' | 'edit' | 'delete' = 'view') {
  return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
    const user = c.get('user') as User | undefined;
    
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' });
    }
    
    // Admin always has access
    if (user.role === 'admin' || user.role === 'owner') {
      await next();
      return;
    }
    
    const linkId = c.req.param('id');
    if (!linkId) {
      throw new HTTPException(400, { message: 'Link ID is required' });
    }
    
    // Get link
    const link = await getLinkById(c.env, linkId);
    if (!link) {
      throw new HTTPException(404, { message: 'Link not found' });
    }
    
    // Check access
    const hasAccess = await canAccessLink(c.env, user, link, action);
    if (!hasAccess) {
      throw new HTTPException(403, { 
        message: `Access denied. You do not have ${action} permission for this link.` 
      });
    }
    
    await next();
  };
}

/**
 * Require user to have access to a domain (from route param)
 */
export function requireDomainAccessFromParam(action: 'view' | 'edit' | 'delete' = 'view') {
  return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
    const user = c.get('user') as User | undefined;
    
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' });
    }
    
    // Admin always has access
    if (user.role === 'admin' || user.role === 'owner') {
      await next();
      return;
    }
    
    const domainId = c.req.param('id') || c.req.param('domain_id');
    if (!domainId) {
      throw new HTTPException(400, { message: 'Domain ID is required' });
    }
    
    // Get domain
    const domain = await getDomainById(c.env, domainId);
    if (!domain) {
      throw new HTTPException(404, { message: 'Domain not found' });
    }
    
    // Check access
    const hasAccess = await canAccessDomainAction(c.env, user, domain, action);
    if (!hasAccess) {
      throw new HTTPException(403, { 
        message: `Access denied. You do not have ${action} permission for this domain.` 
      });
    }
    
    await next();
  };
}


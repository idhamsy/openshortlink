/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// User management API endpoints (admin only)

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env, Variables } from '../types';
import {
  getUserById,
  getUserByUsername,
  getUserByEmail,
  createUser,
  updateUser
} from '../db/users';
import { hashPassword } from '../utils/crypto';
import { authMiddleware } from '../middleware/auth';
import { validateJson } from '../middleware/validate';
import { requireRole } from '../middleware/authorization';
import { createUserSchema, updateUserSchema, setUserDomainsSchema, strongPasswordSchema } from '../schemas';
import { setUserDomains, getUserDomains, getAllUserDomains } from '../db/userDomains';
import { getDomainById } from '../db/domains';
import { logAuditEvent, getIpAddress, getUserAgent } from '../services/audit';

const usersRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// List all users (admin only)
usersRouter.get('/', authMiddleware, requireRole(['admin', 'owner']), async (c) => {
  const users = await c.env.DB.prepare(
    `SELECT id, email, username, role, global_access, created_at, updated_at, last_login_at 
     FROM users 
     ORDER BY created_at DESC`
  ).all<{
    id: string;
    email?: string;
    username?: string;
    role: string;
    global_access: number;
    created_at: number;
    updated_at: number;
    last_login_at?: number;
  }>();

  // Get domain access for each user
  // Get all user domains in one query
  const allUserDomains = await getAllUserDomains(c.env);

  // Group domains by user_id
  const domainsByUserId: Record<string, string[]> = {};
  for (const ud of allUserDomains) {
    if (!domainsByUserId[ud.user_id]) {
      domainsByUserId[ud.user_id] = [];
    }
    domainsByUserId[ud.user_id].push(ud.domain_id);
  }

  // Map users to their domains
  const usersWithDomains = users.results.map((user) => {
    const userDomainIds = user.global_access === 1
      ? []
      : (domainsByUserId[user.id] || []);

    return {
      ...user,
      global_access: user.global_access === 1,
      domain_ids: userDomainIds,
    };
  });

  return c.json({ success: true, data: usersWithDomains });
});

// Get user by ID (admin only)
usersRouter.get('/:id', authMiddleware, requireRole(['admin', 'owner']), async (c) => {
  const id = c.req.param('id');
  const user = await getUserById(c.env, id);

  if (!user) {
    throw new HTTPException(404, { message: 'User not found' });
  }

  // Get domain access
  const userDomains = user.global_access === 1
    ? []
    : await getUserDomains(c.env, user.id);

  return c.json({
    success: true,
    data: {
      ...user,
      global_access: user.global_access === 1,
      domain_ids: userDomains.map(ud => ud.domain_id),
    },
  });
});

// Create user (admin only)
usersRouter.post('/', authMiddleware, requireRole(['admin', 'owner']), validateJson(createUserSchema), async (c) => {
  const validated = c.req.valid('json');

  // Check if username already exists
  const existingUser = await getUserByUsername(c.env, validated.username);
  if (existingUser) {
    throw new HTTPException(409, { message: 'Username already exists' });
  }

  // Check if email already exists (if provided)
  if (validated.email) {
    const existingEmail = await getUserByEmail(c.env, validated.email);
    if (existingEmail) {
      throw new HTTPException(409, { message: 'Email already exists' });
    }
  }

  // Validate domains if provided
  if (validated.domain_ids && validated.domain_ids.length > 0) {
    for (const domainId of validated.domain_ids) {
      const domain = await getDomainById(c.env, domainId);
      if (!domain) {
        throw new HTTPException(404, { message: `Domain ${domainId} not found` });
      }
    }
  }

  // #13 FIX: Log warning for weak passwords (admin flexibility preserved)
  // Uses centralized strongPasswordSchema for consistent validation
  const password = validated.password;
  const isStrongPassword = strongPasswordSchema.safeParse(password).success;
  
  if (!isStrongPassword) {
    console.warn(`[SECURITY] User "${validated.username}" created with weak password (does not meet strong password requirements)`);
  }

  // Hash password
  const passwordHash = await hashPassword(validated.password);

  // Determine global_access
  // Admin always has global_access = 1
  // If global_access is explicitly set to true, use it
  // Otherwise, if domain_ids provided, global_access = false
  const globalAccess = validated.role === 'admin' || validated.role === 'owner'
    ? 1
    : (validated.global_access === true ? 1 : 0);

  // Create user
  const user = await createUser(c.env, {
    username: validated.username,
    email: validated.email,
    password_hash: passwordHash,
    role: validated.role,
    global_access: globalAccess,
  });

  // Set domain access if not global
  if (globalAccess === 0 && validated.domain_ids && validated.domain_ids.length > 0) {
    await setUserDomains(c.env, user.id, validated.domain_ids);
  }

  // Log user creation
  const currentUser = c.get('user') as { id: string };
  await logAuditEvent(c.env, {
    user_id: currentUser.id,
    event_type: 'user_created',
    ip_address: getIpAddress(c.req.raw),
    user_agent: getUserAgent(c.req.raw),
    details: {
      created_user_id: user.id,
      created_user_role: user.role,
      global_access: globalAccess === 1,
    },
  });

  // Get domain access for response
  const userDomains = globalAccess === 1
    ? []
    : await getUserDomains(c.env, user.id);

  return c.json({
    success: true,
    data: {
      ...user,
      global_access: globalAccess === 1,
      domain_ids: userDomains.map(ud => ud.domain_id),
    },
  }, 201);
});

// Update user (admin only)
usersRouter.put('/:id', authMiddleware, requireRole(['admin', 'owner']), validateJson(updateUserSchema), async (c) => {
  const id = c.req.param('id');
  const validated = c.req.valid('json');

  const existingUser = await getUserById(c.env, id);
  if (!existingUser) {
    throw new HTTPException(404, { message: 'User not found' });
  }

  // Check if username already exists (if changing)
  if (validated.username && validated.username !== existingUser.username) {
    const existingUsername = await getUserByUsername(c.env, validated.username);
    if (existingUsername) {
      throw new HTTPException(409, { message: 'Username already exists' });
    }
  }

  // Check if email already exists (if changing)
  if (validated.email && validated.email !== existingUser.email) {
    const existingEmail = await getUserByEmail(c.env, validated.email);
    if (existingEmail) {
      throw new HTTPException(409, { message: 'Email already exists' });
    }
  }

  // Validate domains if provided
  if (validated.domain_ids && validated.domain_ids.length > 0) {
    for (const domainId of validated.domain_ids) {
      const domain = await getDomainById(c.env, domainId);
      if (!domain) {
        throw new HTTPException(404, { message: `Domain ${domainId} not found` });
      }
    }
  }

  // Prepare updates
  const updates: Parameters<typeof updateUser>[2] = {};

  if (validated.username !== undefined) {
    updates.username = validated.username;
  }
  if (validated.email !== undefined) {
    updates.email = validated.email;
  }
  if (validated.role !== undefined) {
    updates.role = validated.role;
    // Admin always has global_access = 1
    if (validated.role === 'admin' || validated.role === 'owner') {
      updates.global_access = 1;
    }
  }
  if (validated.global_access !== undefined) {
    // Admin always has global_access = 1 (enforced)
    if (existingUser.role === 'admin' || existingUser.role === 'owner') {
      updates.global_access = 1;
    } else {
      updates.global_access = validated.global_access ? 1 : 0;
    }
  }
  if (validated.preferences !== undefined) {
    updates.preferences = JSON.stringify(validated.preferences);
  }

  // Update user
  const updatedUser = await updateUser(c.env, id, updates);
  if (!updatedUser) {
    throw new HTTPException(500, { message: 'Failed to update user' });
  }

  // Update domain access if provided
  if (validated.domain_ids !== undefined) {
    const finalGlobalAccess = updatedUser.global_access === 1 ||
      updatedUser.role === 'admin' ||
      updatedUser.role === 'owner';

    if (finalGlobalAccess) {
      // Clear domain access if global
      await setUserDomains(c.env, id, []);
    } else {
      // Set domain access
      await setUserDomains(c.env, id, validated.domain_ids || []);
    }
  }

  // Log user update
  const currentUser = c.get('user') as { id: string };
  await logAuditEvent(c.env, {
    user_id: currentUser.id,
    event_type: 'user_updated',
    ip_address: getIpAddress(c.req.raw),
    user_agent: getUserAgent(c.req.raw),
    details: { updated_user_id: id },
  });

  // Get domain access for response
  const userDomains = updatedUser.global_access === 1
    ? []
    : await getUserDomains(c.env, id);

  return c.json({
    success: true,
    data: {
      ...updatedUser,
      global_access: updatedUser.global_access === 1,
      domain_ids: userDomains.map(ud => ud.domain_id),
    },
  });
});

// Set user's domain access (admin only)
usersRouter.put('/:id/domains', authMiddleware, requireRole(['admin', 'owner']), validateJson(setUserDomainsSchema), async (c) => {
  try {
    const id = c.req.param('id');
    const validated = c.req.valid('json');

    const user = await getUserById(c.env, id);
    if (!user) {
      throw new HTTPException(404, { message: 'User not found' });
    }

    // Admin always has global access
    if (user.role === 'admin' || user.role === 'owner') {
      throw new HTTPException(400, {
        message: 'Cannot set domain access for admin users. Admins always have global access.'
      });
    }

    // Validate domains if provided
    if (validated.domain_ids && validated.domain_ids.length > 0) {
      for (const domainId of validated.domain_ids) {
        const domain = await getDomainById(c.env, domainId);
        if (!domain) {
          throw new HTTPException(404, { message: `Domain ${domainId} not found` });
        }
      }
    }

    // Update global_access
    await updateUser(c.env, id, {
      global_access: validated.global_access ? 1 : 0,
    });

    // Set domain access
    if (validated.global_access) {
      await setUserDomains(c.env, id, []);
    } else {
      await setUserDomains(c.env, id, validated.domain_ids || []);
    }

    // Log domain access change
    const currentUser = c.get('user') as { id: string };
    await logAuditEvent(c.env, {
      user_id: currentUser.id,
      event_type: 'user_updated',
      ip_address: getIpAddress(c.req.raw),
      user_agent: getUserAgent(c.req.raw),
      details: {
        updated_user_id: id,
        global_access: validated.global_access,
        domain_ids: validated.domain_ids,
      },
    });

    // Get updated domain access
    const userDomains = validated.global_access
      ? []
      : await getUserDomains(c.env, id);

    return c.json({
      success: true,
      data: {
        global_access: validated.global_access,
        domain_ids: userDomains.map(ud => ud.domain_id),
      },
    });
  } catch (error) {
    console.error('[USERS] Set domains error:', error);
    // Re-throw HTTPException and ZodError for error handler
    if (error instanceof HTTPException) {
      throw error;
    }
    // Handle database errors
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      throw new HTTPException(409, { message: 'Duplicate entry detected' });
    }
    throw new HTTPException(500, { 
      message: error instanceof Error ? error.message : 'Failed to update user domain access' 
    });
  }
});

// Get user's accessible domains (admin only)
usersRouter.get('/:id/domains', authMiddleware, requireRole(['admin', 'owner']), async (c) => {
  const id = c.req.param('id');
  const user = await getUserById(c.env, id);

  if (!user) {
    throw new HTTPException(404, { message: 'User not found' });
  }

  const userDomains = user.global_access === 1
    ? []
    : await getUserDomains(c.env, id);

  return c.json({
    success: true,
    data: {
      global_access: user.global_access === 1,
      domain_ids: userDomains.map(ud => ud.domain_id),
      domains: userDomains,
    },
  });
});

// Delete user (admin only) - moved from auth.ts
usersRouter.delete('/:id', authMiddleware, requireRole(['admin', 'owner']), async (c) => {
  const currentUser = c.get('user') as { id: string; role: string };
  const targetUserId = c.req.param('id');

  // Cannot delete yourself
  if (currentUser.id === targetUserId) {
    throw new HTTPException(400, { message: 'You cannot delete your own account' });
  }

  // Get target user
  const targetUser = await getUserById(c.env, targetUserId);
  if (!targetUser) {
    throw new HTTPException(404, { message: 'User not found' });
  }

  // Check if deleting an owner
  if (targetUser.role === 'owner') {
    const result = await c.env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'owner'").first<{ count: number }>();
    if (result && result.count <= 1) {
      throw new HTTPException(400, { message: 'Cannot delete the last owner' });
    }
  }

  // Delete all refresh tokens for this user
  const counterKey = `refresh_count:${targetUserId}`;
  await c.env.CACHE.delete(counterKey);

  // Delete user from database (cascade will handle user_domains)
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(targetUserId).run();

  // Log user deletion
  await logAuditEvent(c.env, {
    user_id: currentUser.id,
    event_type: 'user_deleted',
    ip_address: getIpAddress(c.req.raw),
    user_agent: getUserAgent(c.req.raw),
    details: { deleted_user_id: targetUserId, deleted_user_email: targetUser.email },
  });

  return c.json({
    success: true,
    message: 'User deleted successfully',
  });
});

export { usersRouter };


/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Authentication API endpoints

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type { Env, Variables } from '../types';
import { getUserByUsername, getUserByEmail, getUserById, createUser, updateLastLogin } from '../db/users';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { createSession, deleteSession, getRefreshToken, deleteRefreshToken, countUserRefreshTokens } from '../services/session';
import { createRateLimit } from '../middleware/rateLimit';
import { validateJson } from '../middleware/validate';
import { optionalAuth, authMiddleware } from '../middleware/auth';
import { generateMFASecret, verifyMFACode, generateBackupCodes, verifyBackupCode, createMFATempToken, getMFATempToken, deleteMFATempToken } from '../services/mfa';
import { updateUser } from '../db/users';
import { logAuditEvent, getAuditLogs, getIpAddress, getUserAgent, type AuditEventType, cleanupOldAuditLogs } from '../services/audit';
import { getSessionTokenFromRequest } from '../services/session';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  mfaVerifySchema,
  mfaVerifySetupSchema,
  changePasswordSchema,
  createTokenSchema,
} from '../schemas';

const authRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// Schemas imported from ../schemas

// Login
authRouter.post('/login', createRateLimit({
  window: 60,
  max: 5,
  key: (c) => `auth:login:${c.req.header('CF-Connecting-IP') || 'unknown'}`,
}), validateJson(loginSchema), async (c) => {
  const validated = c.req.valid('json');

  // Find user by username or email
  let user = await getUserByUsername(c.env, validated.username);
  if (!user) {
    user = await getUserByEmail(c.env, validated.username);
  }

  if (!user) {
    throw new HTTPException(401, { message: 'Invalid username or password' });
  }

  // Check if user has password_hash
  const passwordHash = (user as { password_hash?: string }).password_hash;
  if (!passwordHash) {
    throw new HTTPException(401, { message: 'Invalid authentication method' });
  }

  // Verify password
  const isValid = await verifyPassword(validated.password, passwordHash);
  if (!isValid) {
    // Log failed login attempt
    await logAuditEvent(c.env, {
      event_type: 'login_failure',
      ip_address: getIpAddress(c.req.raw),
      user_agent: getUserAgent(c.req.raw),
      details: { username: validated.username },
    });
    throw new HTTPException(401, { message: 'Invalid username or password' });
  }

  // Check if MFA is enabled
  const mfaEnabled = user.mfa_enabled === 1;

  if (mfaEnabled) {
    // Create temporary MFA token
    const mfaToken = await createMFATempToken(c.env, user.id);

    return c.json({
      success: true,
      requires_mfa: true,
      mfa_token: mfaToken,
      message: 'MFA code required',
    }, 200);
  }

  // Create session with refresh token (no MFA required)
  const { accessToken, refreshToken } = await createSession(c.env, {
    id: user.id,
    username: (user as { username?: string }).username,
    email: user.email,
    role: user.role,
  });

  // Update last login
  await updateLastLogin(c.env, user.id);

  // Log successful login
  await logAuditEvent(c.env, {
    user_id: user.id,
    event_type: 'login_success',
    ip_address: getIpAddress(c.req.raw),
    user_agent: getUserAgent(c.req.raw),
  });

  // Set cookie - use Secure only in production (HTTPS)
  const isProduction = c.env.ENVIRONMENT === 'production';
  const secureFlag = isProduction ? 'Secure;' : '';

  // Create response with proper headers
  const responseData = {
    success: true,
    data: {
      token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        username: (user as { username?: string }).username || user.email,
        email: user.email,
        role: user.role,
      },
    },
  };

  const response = new Response(JSON.stringify(responseData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Append multiple Set-Cookie headers (append allows multiple headers with same name)
  response.headers.append('Set-Cookie', `session_token=${accessToken}; HttpOnly; ${secureFlag} SameSite=Lax; Path=/; Max-Age=${1 * 60 * 60}`);
  response.headers.append('Set-Cookie', `refresh_token=${refreshToken}; HttpOnly; ${secureFlag} SameSite=Strict; Path=/; Max-Age=${30 * 24 * 60 * 60}`);

  return response;
});

// Register - Disabled for public registration
// First user requires SETUP_TOKEN from environment
// Subsequent users can only be created by admin/owner via API
authRouter.post('/register', createRateLimit({
  window: 60,
  max: 3,
  key: (c) => `auth:register:${c.req.header('CF-Connecting-IP') || 'unknown'}`,
}), optionalAuth, validateJson(registerSchema), async (c) => {
  // Check if any users exist
  const existingUsers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>();
  const userCount = existingUsers?.count || 0;

  const validated = c.req.valid('json');

  // If users already exist, registration is disabled
  if (userCount > 0) {
    // Only allow admin/owner to create users via API (not through /register endpoint)
    const currentUser = (c as any).get?.('user') as { role?: string } | undefined;
    if (!currentUser) {
      throw new HTTPException(403, {
        message: 'Public registration is disabled. Contact an administrator to create an account.'
      });
    }
    const role = currentUser.role;
    if (role !== 'owner' && role !== 'admin') {
      throw new HTTPException(403, {
        message: 'Public registration is disabled. Contact an administrator to create an account.'
      });
    }
  } else {
    // No users exist - first user setup requires SETUP_TOKEN
    if (!c.env.SETUP_TOKEN) {
      throw new HTTPException(500, {
        message: 'Server configuration error: SETUP_TOKEN not configured. Please contact administrator.'
      });
    }

    if (!validated.setup_token || validated.setup_token !== c.env.SETUP_TOKEN) {
      throw new HTTPException(403, {
        message: 'Invalid setup token. First user creation requires a valid setup token.'
      });
    }
  }

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

  // Hash password
  const passwordHash = await hashPassword(validated.password);

  // Create user
  const user = await createUser(c.env, {
    username: validated.username,
    email: validated.email,
    password_hash: passwordHash,
    role: userCount === 0 ? 'owner' : validated.role, // First user is always owner
  });

  // Create session with refresh token
  const { accessToken, refreshToken } = await createSession(c.env, {
    id: user.id,
    username: validated.username,
    email: validated.email,
    role: user.role,
  });

  // Log user creation
  await logAuditEvent(c.env, {
    user_id: user.id,
    event_type: 'user_created',
    ip_address: getIpAddress(c.req.raw),
    user_agent: getUserAgent(c.req.raw),
    details: { role: user.role },
  });

  // Set cookie - use Secure only in production (HTTPS)
  const isProduction = c.env.ENVIRONMENT === 'production';
  const secureFlag = isProduction ? 'Secure;' : '';

  // Create response with proper headers
  const responseData = {
    success: true,
    data: {
      token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        username: validated.username,
        email: validated.email,
        role: user.role,
      },
    },
  };

  const response = new Response(JSON.stringify(responseData), {
    status: 201,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Append multiple Set-Cookie headers (append allows multiple headers with same name)
  response.headers.append('Set-Cookie', `session_token=${accessToken}; HttpOnly; ${secureFlag} SameSite=Lax; Path=/; Max-Age=${1 * 60 * 60}`);
  response.headers.append('Set-Cookie', `refresh_token=${refreshToken}; HttpOnly; ${secureFlag} SameSite=Strict; Path=/; Max-Age=${30 * 24 * 60 * 60}`);

  return response;
});

// Logout
authRouter.post('/logout', optionalAuth, async (c) => {
  const token = getSessionTokenFromRequest(c.req.raw);

  if (token) {
    await deleteSession(c.env, token);
  }

  // Clear cookie
  const isProduction = c.env.ENVIRONMENT === 'production';
  const secureFlag = isProduction ? 'Secure;' : '';
  c.header('Set-Cookie', `session_token=; HttpOnly; ${secureFlag} SameSite=Strict; Path=/; Max-Age=0`);

  // Also delete refresh token if present
  const refreshToken = c.req.header('Cookie')?.split(';').find(c => c.trim().startsWith('refresh_token='))?.split('=')[1];
  if (refreshToken) {
    await deleteRefreshToken(c.env, refreshToken);
    c.header('Set-Cookie', `refresh_token=; HttpOnly; ${secureFlag} SameSite=Strict; Path=/; Max-Age=0`);
  }

  // Log logout
  const user = (c as any).get?.('user') as { id: string } | undefined;
  if (user) {
    await logAuditEvent(c.env, {
      user_id: user.id,
      event_type: 'logout',
      ip_address: getIpAddress(c.req.raw),
      user_agent: getUserAgent(c.req.raw),
    });
  }

  return c.json({ success: true, message: 'Logged out successfully' });
});

// Refresh access token - schema imported from ../schemas
// Note: Supports both JSON body and cookie-only (empty body) scenarios

authRouter.post('/refresh', createRateLimit({
  window: 60,
  max: 10,
  key: (c) => `auth:refresh:${c.req.header('CF-Connecting-IP') || 'unknown'}`,
}), async (c) => {
  // Handle empty body gracefully (for cookie-only requests)
  const body = await c.req.json().catch(() => ({}));
  const validated = refreshTokenSchema.parse(body);

  // Get refresh token from body or cookie
  let refreshToken = validated.refresh_token;
  if (!refreshToken) {
    const cookieHeader = c.req.header('Cookie');
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map(c => c.trim());
      const refreshCookie = cookies.find(c => c.startsWith('refresh_token='));
      if (refreshCookie) {
        refreshToken = refreshCookie.substring('refresh_token='.length);
      }
    }
  }

  if (!refreshToken) {
    throw new HTTPException(401, { message: 'Refresh token required' });
  }

  // Get refresh token data
  const refreshData = await getRefreshToken(c.env, refreshToken);
  if (!refreshData) {
    throw new HTTPException(401, { message: 'Invalid or expired refresh token' });
  }

  // Get user
  const user = await getUserById(c.env, refreshData.user_id);
  if (!user) {
    throw new HTTPException(401, { message: 'User not found' });
  }

  // Rotate refresh token (security best practice)
  // Delete old refresh token
  await deleteRefreshToken(c.env, refreshToken);

  // Create new access token and new refresh token
  const { accessToken, refreshToken: newRefreshToken } = await createSession(c.env, {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  });

  // Log token refresh
  await logAuditEvent(c.env, {
    user_id: user.id,
    event_type: 'token_refreshed',
    ip_address: getIpAddress(c.req.raw),
    user_agent: getUserAgent(c.req.raw),
  });

  // Set cookie
  const isProduction = c.env.ENVIRONMENT === 'production';
  const secureFlag = isProduction ? 'Secure;' : '';
  c.header('Set-Cookie', `session_token=${accessToken}; HttpOnly; ${secureFlag} SameSite=Strict; Path=/; Max-Age=${1 * 60 * 60}`);
  c.header('Set-Cookie', `refresh_token=${newRefreshToken}; HttpOnly; ${secureFlag} SameSite=Strict; Path=/; Max-Age=${30 * 24 * 60 * 60}`);

  return c.json({
    success: true,
    data: {
      token: accessToken,
      refresh_token: newRefreshToken,
    },
  });
});

// Get current user
authRouter.get('/me', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string; username?: string; email?: string; role: string };

  // Get full user data to include MFA status
  const fullUser = await getUserById(c.env, user.id);
  if (!fullUser) {
    throw new HTTPException(404, { message: 'User not found' });
  }

  return c.json({
    success: true,
    data: {
      id: fullUser.id,
      username: fullUser.username,
      email: fullUser.email,
      role: fullUser.role,
      mfa_enabled: fullUser.mfa_enabled === 1,
    }
  });
});

// Get audit logs (admin/owner only)
authRouter.get('/audit', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string; role: string };

  // Only owner/admin can view audit logs
  if (user.role !== 'owner' && user.role !== 'admin') {
    throw new HTTPException(403, { message: 'Only owner and admin roles can view audit logs' });
  }

  const query = c.req.query();
  const user_id = query.user_id;
  const event_type = query.event_type as AuditEventType | undefined;
  const days = query.days ? parseInt(query.days) : 30;
  const limit = query.limit ? parseInt(query.limit) : 100;
  const offset = query.offset ? parseInt(query.offset) : 0;

  const result = await getAuditLogs(c.env, {
    user_id,
    event_type,
    days,
    limit,
    offset,
  });

  return c.json({
    success: true,
    data: result.logs,
    pagination: {
      total: result.total,
      limit,
      offset,
    },
  });
});

// Cleanup old audit logs (admin/owner only, manual trigger)
authRouter.post('/audit/cleanup', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string; role: string };

  // Only owner/admin can trigger cleanup
  if (user.role !== 'owner' && user.role !== 'admin') {
    throw new HTTPException(403, { message: 'Only owner and admin roles can trigger audit log cleanup' });
  }

  const query = c.req.query();
  const daysToKeep = query.days ? parseInt(query.days) : 30;

  if (daysToKeep < 1 || daysToKeep > 365) {
    throw new HTTPException(400, { message: 'Days to keep must be between 1 and 365' });
  }

  const deletedCount = await cleanupOldAuditLogs(c.env, daysToKeep);

  // Log the cleanup action
  await logAuditEvent(c.env, {
    user_id: user.id,
    event_type: 'user_deleted', // Reusing event type for cleanup
    ip_address: getIpAddress(c.req.raw),
    user_agent: getUserAgent(c.req.raw),
    details: { action: 'audit_cleanup', deleted_count: deletedCount, days_kept: daysToKeep },
  });

  return c.json({
    success: true,
    message: `Cleaned up ${deletedCount} audit log(s) older than ${daysToKeep} days`,
    deleted_count: deletedCount,
  });
});



// MFA Setup - Generate QR code and secret (admin/owner only)
authRouter.post('/mfa/setup', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string; email?: string; role: string };

  // Only allow owner/admin to enable MFA
  if (user.role !== 'owner' && user.role !== 'admin') {
    throw new HTTPException(403, { message: 'Only owner and admin roles can enable MFA' });
  }

  // Get full user data
  const fullUser = await getUserById(c.env, user.id);
  if (!fullUser) {
    throw new HTTPException(404, { message: 'User not found' });
  }

  const email = fullUser.email || user.id;
  const { secret, qrCodeUrl } = generateMFASecret(user.id, email);
  const backupCodes = generateBackupCodes();

  // Store secret and backup codes (but don't enable MFA yet - user needs to verify first)
  await updateUser(c.env, user.id, {
    mfa_secret: secret,
    mfa_backup_codes: JSON.stringify(backupCodes),
  } as any);

  // Log MFA setup initiation
  await logAuditEvent(c.env, {
    user_id: user.id,
    event_type: 'mfa_setup',
    ip_address: getIpAddress(c.req.raw),
    user_agent: getUserAgent(c.req.raw),
  });

  return c.json({
    success: true,
    data: {
      secret,
      qrCodeUrl,
      backupCodes, // Show these to user - they need to save them
    },
  });
});

// MFA Verify Setup - schema imported from ../schemas

authRouter.post('/mfa/verify-setup', authMiddleware, validateJson(mfaVerifySetupSchema), async (c) => {
  const user = c.get('user') as { id: string; role: string };

  if (user.role !== 'owner' && user.role !== 'admin') {
    throw new HTTPException(403, { message: 'Only owner and admin roles can enable MFA' });
  }

  const validated = c.req.valid('json');

  // Get user with MFA secret
  const fullUser = await getUserById(c.env, user.id);
  if (!fullUser || !fullUser.mfa_secret) {
    throw new HTTPException(400, { message: 'MFA setup not initiated. Call /mfa/setup first.' });
  }

  const secret = fullUser.mfa_secret;
  const isValid = verifyMFACode(secret, validated.code);

  if (!isValid) {
    throw new HTTPException(400, { message: 'Invalid MFA code' });
  }

  // Enable MFA
  await updateUser(c.env, user.id, {
    mfa_enabled: 1,
  } as any);

  // Log MFA enabled
  await logAuditEvent(c.env, {
    user_id: user.id,
    event_type: 'mfa_enabled',
    ip_address: getIpAddress(c.req.raw),
    user_agent: getUserAgent(c.req.raw),
  });

  return c.json({
    success: true,
    message: 'MFA enabled successfully',
  });
});

// MFA Disable
authRouter.post('/mfa/disable', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string; role: string };

  if (user.role !== 'owner' && user.role !== 'admin') {
    throw new HTTPException(403, { message: 'Only owner and admin roles can disable MFA' });
  }

  // Disable MFA and clear secret
  await updateUser(c.env, user.id, {
    mfa_enabled: 0,
    mfa_secret: null,
    mfa_backup_codes: null,
  } as any);

  // Log MFA disabled
  await logAuditEvent(c.env, {
    user_id: user.id,
    event_type: 'mfa_disabled',
    ip_address: getIpAddress(c.req.raw),
    user_agent: getUserAgent(c.req.raw),
  });

  return c.json({
    success: true,
    message: 'MFA disabled successfully',
  });
});

// MFA Verify (for login) - schema imported from ../schemas

authRouter.post('/mfa/verify', validateJson(mfaVerifySchema), async (c) => {
  const validated = c.req.valid('json');

  if (!validated.code && !validated.backup_code) {
    throw new HTTPException(400, { message: 'Either code or backup_code is required' });
  }

  // Get temporary token
  const tempToken = await getMFATempToken(c.env, validated.mfa_token);
  if (!tempToken) {
    throw new HTTPException(401, { message: 'Invalid or expired MFA token' });
  }

  // Get user
  const user = await getUserById(c.env, tempToken.user_id);
  if (!user || !user.mfa_enabled) {
    throw new HTTPException(400, { message: 'MFA not enabled for this user' });
  }

  if (!user.mfa_secret) {
    throw new HTTPException(400, { message: 'MFA secret not configured for this user' });
  }

  const secret = user.mfa_secret;
  let isValid = false;

  // Try TOTP code first
  if (validated.code && !validated.backup_code) {
    isValid = verifyMFACode(secret, validated.code);
  } else if (validated.backup_code) {
    // Try backup code
    const backupCodesJson = user.mfa_backup_codes || '[]';
    const result = verifyBackupCode(backupCodesJson, validated.backup_code);
    isValid = result.valid;

    if (isValid) {
      // Update backup codes (remove used one)
      await updateUser(c.env, user.id, {
        mfa_backup_codes: JSON.stringify(result.remainingCodes),
      } as any);
    }
  }

  if (!isValid) {
    // Log MFA verification failure
    await logAuditEvent(c.env, {
      user_id: user.id,
      event_type: 'mfa_verify_failure',
      ip_address: getIpAddress(c.req.raw),
      user_agent: getUserAgent(c.req.raw),
    });
    throw new HTTPException(401, { message: 'Invalid MFA code' });
  }

  // Log MFA verification success
  await logAuditEvent(c.env, {
    user_id: user.id,
    event_type: 'mfa_verify_success',
    ip_address: getIpAddress(c.req.raw),
    user_agent: getUserAgent(c.req.raw),
  });

  // Delete temporary token
  await deleteMFATempToken(c.env, validated.mfa_token);

  // Create session with refresh token
  const { accessToken, refreshToken } = await createSession(c.env, {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  });

  // Update last login
  await updateLastLogin(c.env, user.id);

  // Get remaining backup codes count (if MFA is enabled)
  let remainingBackupCodes = null;
  if (user.mfa_backup_codes) {
    try {
      const codes = JSON.parse(user.mfa_backup_codes) as string[];
      remainingBackupCodes = codes.length;
    } catch {
      // Ignore parse errors
    }
  }

  // Set cookie
  const isProduction = c.env.ENVIRONMENT === 'production';
  const secureFlag = isProduction ? 'Secure;' : '';
  c.header('Set-Cookie', `session_token=${accessToken}; HttpOnly; ${secureFlag} SameSite=Strict; Path=/; Max-Age=${1 * 60 * 60}`);
  c.header('Set-Cookie', `refresh_token=${refreshToken}; HttpOnly; ${secureFlag} SameSite=Strict; Path=/; Max-Age=${30 * 24 * 60 * 60}`);

  return c.json({
    success: true,
    data: {
      token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        username: user.username || user.email,
        email: user.email,
        role: user.role,
      },
      ...(remainingBackupCodes !== null && remainingBackupCodes < 3 ? {
        warning: `You have only ${remainingBackupCodes} backup code(s) remaining. Consider regenerating them.`,
        remaining_backup_codes: remainingBackupCodes,
      } : {}),
    },
  });
});

// Change password - schema imported from ../schemas

authRouter.post('/change-password', authMiddleware, validateJson(changePasswordSchema), async (c) => {
  const user = c.get('user') as { id: string };
  const validated = c.req.valid('json');

  // Get user with password hash
  const fullUser = await getUserById(c.env, user.id);
  if (!fullUser || !fullUser.password_hash) {
    throw new HTTPException(400, { message: 'User does not have a password set' });
  }

  // Verify current password
  const isValid = await verifyPassword(validated.current_password, fullUser.password_hash);
  if (!isValid) {
    throw new HTTPException(401, { message: 'Current password is incorrect' });
  }

  // Hash new password
  const newPasswordHash = await hashPassword(validated.new_password);

  // Update password
  await updateUser(c.env, user.id, {
    password_hash: newPasswordHash,
  } as any);

  // Log password change
  await logAuditEvent(c.env, {
    user_id: user.id,
    event_type: 'password_change',
    ip_address: getIpAddress(c.req.raw),
    user_agent: getUserAgent(c.req.raw),
  });

  return c.json({
    success: true,
    message: 'Password changed successfully',
  });
});

// Delete user endpoint moved to /api/v1/users/:id (see users.ts)

// Regenerate MFA backup codes
authRouter.post('/mfa/regenerate-backup-codes', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string; role: string };

  if (user.role !== 'owner' && user.role !== 'admin') {
    throw new HTTPException(403, { message: 'Only owner and admin roles can regenerate backup codes' });
  }

  // Get user
  const fullUser = await getUserById(c.env, user.id);
  if (!fullUser || !fullUser.mfa_enabled) {
    throw new HTTPException(400, { message: 'MFA is not enabled for this user' });
  }

  // Require MFA verification to regenerate codes (security)
  const body = await c.req.json();
  const mfaCode = body.mfa_code;

  if (!mfaCode || !fullUser.mfa_secret) {
    throw new HTTPException(400, { message: 'MFA code required to regenerate backup codes' });
  }

  const isValid = verifyMFACode(fullUser.mfa_secret, mfaCode);
  if (!isValid) {
    throw new HTTPException(401, { message: 'Invalid MFA code' });
  }

  // Generate new backup codes
  const newBackupCodes = generateBackupCodes();

  // Update backup codes
  await updateUser(c.env, user.id, {
    mfa_backup_codes: JSON.stringify(newBackupCodes),
  } as any);

  // Log backup code regeneration
  await logAuditEvent(c.env, {
    user_id: user.id,
    event_type: 'mfa_setup', // Reusing this event type
    ip_address: getIpAddress(c.req.raw),
    user_agent: getUserAgent(c.req.raw),
    details: { action: 'backup_codes_regenerated' },
  });

  return c.json({
    success: true,
    data: {
      backupCodes: newBackupCodes,
      message: 'Backup codes regenerated successfully. Please save these codes securely.',
    },
  });
});

// Create token with custom expiration (for testing) - schema imported from ../schemas
// Note: Supports empty body (defaults to 1 hour expiration)

authRouter.post('/token', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as { id: string; username?: string; email?: string; role: string };
    
    // Handle empty body gracefully (for default expiration)
    const body = await c.req.json().catch(() => ({}));
    const validated = createTokenSchema.parse(body);
    
    const expiresIn = validated.expires_in || 3600; // Default 1 hour
    
    // Validate expiration range (Cloudflare KV requires minimum 60 seconds)
    if (expiresIn < 60 || expiresIn > 3600) {
      throw new HTTPException(400, { 
        message: 'Expiration time must be between 60 and 3600 seconds (Cloudflare KV requirement)' 
      });
    }
    
    // Log for debugging
    console.log('Creating token with custom expiry:', { 
      userId: user.id, 
      expiresIn,
      username: user.username,
      email: user.email,
      role: user.role
    });
    
    // Create token with custom expiration
    const { createSessionWithExpiry } = await import('../services/session');
    
    const { accessToken, refreshToken } = await createSessionWithExpiry(c.env, {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    }, expiresIn);
    
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
    
    console.log('Token created successfully:', { expiresAt, expiresIn });
    
    return c.json({
      success: true,
      data: {
        token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        expires_in: expiresIn,
      },
    }, 201);
  } catch (error) {
    // Detailed error logging
    console.error('Error creating token:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error?.constructor?.name
    });
    
    if (error instanceof HTTPException) {
      throw error;
    }
    
    // Return detailed error for debugging
    throw new HTTPException(500, { 
      message: 'Failed to create token',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { authRouter };


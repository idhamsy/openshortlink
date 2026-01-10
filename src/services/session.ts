/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Session management service

import type { Env } from '../types';
import { generateSessionToken } from '../utils/crypto';

const SESSION_TTL = 1 * 60 * 60; // 1 hour in seconds (access token)
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days in seconds
const DOMAIN_CACHE_TTL = 5 * 60; // 5 minutes in seconds - cache TTL for domain access

export interface Session {
  user_id: string;
  username: string;
  email?: string;
  role: string;
  created_at: number;
  // Cached domain access (for performance optimization)
  accessible_domain_ids?: string[];
  global_access?: boolean;
  permission_version?: number; // Matches user.permission_version for cache invalidation
  cached_at?: number; // Unix timestamp when domain access was cached
}

export async function createSession(env: Env, user: { id: string; username?: string; email?: string; role: string }, refreshToken?: string): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = generateSessionToken();
  const refreshTokenValue = refreshToken || generateSessionToken();
  
  const session: Session = {
    user_id: user.id,
    username: user.username || user.email || 'user',
    email: user.email,
    role: user.role,
    created_at: Date.now(),
  };
  
  // Store access token (short-lived)
  const accessKey = `session:${accessToken}`;
  await env.CACHE.put(accessKey, JSON.stringify(session), { expirationTtl: SESSION_TTL });
  
  // Store refresh token (long-lived) with user ID reference
  await storeRefreshToken(env, refreshTokenValue, user.id);
  
  return { accessToken, refreshToken: refreshTokenValue };
}

// Legacy function for backwards compatibility
export async function createSessionLegacy(env: Env, user: { id: string; username?: string; email?: string; role: string }): Promise<string> {
  const { accessToken } = await createSession(env, user);
  return accessToken;
}

// Create session with custom expiration (for testing)
export async function createSessionWithExpiry(env: Env, user: { id: string; username?: string; email?: string; role: string }, expiresIn: number): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = generateSessionToken();
  const refreshTokenValue = generateSessionToken();
  
  const session: Session = {
    user_id: user.id,
    username: user.username || user.email || 'user',
    email: user.email,
    role: user.role,
    created_at: Date.now(),
  };
  
  // Store access token with custom TTL
  const accessKey = `session:${accessToken}`;
  await env.CACHE.put(accessKey, JSON.stringify(session), { expirationTtl: expiresIn });
  
  // Store refresh token (long-lived) with user ID reference
  await storeRefreshToken(env, refreshTokenValue, user.id);
  
  return { accessToken, refreshToken: refreshTokenValue };
}

export async function getSession(env: Env, token: string): Promise<Session | null> {
  const key = `session:${token}`;
  const session = await env.CACHE.get(key, 'json');
  return (session as Session) || null;
}

export async function deleteSession(env: Env, token: string): Promise<void> {
  const key = `session:${token}`;
  await env.CACHE.delete(key);
}

// Get refresh token
export async function getRefreshToken(env: Env, refreshToken: string): Promise<{ user_id: string; created_at: number } | null> {
  const key = `refresh:${refreshToken}`;
  const data = await env.CACHE.get(key, 'json');
  return data as { user_id: string; created_at: number } | null;
}

// Delete refresh token
export async function deleteRefreshToken(env: Env, refreshToken: string): Promise<void> {
  const key = `refresh:${refreshToken}`;
  const tokenData = await env.CACHE.get(key, 'json') as { user_id: string } | null;
  await env.CACHE.delete(key);
  
  // Decrement counter if token existed
  if (tokenData?.user_id) {
    await decrementRefreshTokenCount(env, tokenData.user_id);
  }
}

// Count active refresh tokens for a user
export async function countUserRefreshTokens(env: Env, userId: string): Promise<number> {
  // Note: KV doesn't support listing keys, so we can't count directly
  // This is a limitation - we'll track this differently
  // For now, we'll use a counter in KV
  const counterKey = `refresh_count:${userId}`;
  const count = await env.CACHE.get(counterKey);
  return count ? parseInt(count) : 0;
}

// Increment refresh token counter for user
export async function incrementRefreshTokenCount(env: Env, userId: string): Promise<void> {
  const counterKey = `refresh_count:${userId}`;
  const current = await countUserRefreshTokens(env, userId);
  await env.CACHE.put(counterKey, String(current + 1), { expirationTtl: REFRESH_TOKEN_TTL });
}

// Decrement refresh token counter for user
export async function decrementRefreshTokenCount(env: Env, userId: string): Promise<void> {
  const counterKey = `refresh_count:${userId}`;
  const current = await countUserRefreshTokens(env, userId);
  if (current > 0) {
    await env.CACHE.put(counterKey, String(current - 1), { expirationTtl: REFRESH_TOKEN_TTL });
  }
}

// Store refresh token with user tracking
const MAX_REFRESH_TOKENS_PER_USER = 10;

export async function storeRefreshToken(env: Env, refreshToken: string, userId: string): Promise<void> {
  // Check current count
  const currentCount = await countUserRefreshTokens(env, userId);
  
  if (currentCount >= MAX_REFRESH_TOKENS_PER_USER) {
    // We've hit the limit - in a real implementation, we'd need to track and delete oldest tokens
    // For now, we'll just log a warning and allow it (KV limitation - can't list keys)
    // DEBUG: console.warn(`User ${userId} has ${currentCount} refresh tokens, limit is ${MAX_REFRESH_TOKENS_PER_USER}`);
  }
  
  const refreshKey = `refresh:${refreshToken}`;
  const refreshData = {
    user_id: userId,
    created_at: Date.now(),
  };
  await env.CACHE.put(refreshKey, JSON.stringify(refreshData), { expirationTtl: REFRESH_TOKEN_TTL });
  
  // Increment counter
  await incrementRefreshTokenCount(env, userId);
}

export function getSessionTokenFromRequest(request: Request): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check cookie
  const cookieHeader = request.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const sessionCookie = cookies.find(c => c.startsWith('session_token='));
    if (sessionCookie) {
      return sessionCookie.substring('session_token='.length);
    }
  }
  
  return null;
}


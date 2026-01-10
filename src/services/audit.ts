/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Audit logging service for security events

import type { Env } from '../types';
import { generateId } from '../utils/id';

export type AuditEventType =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'password_change'
  | 'mfa_setup'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'mfa_verify_success'
  | 'mfa_verify_failure'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'role_changed'
  | 'session_created'
  | 'session_deleted'
  | 'token_refreshed';

export interface AuditLog {
  id: string;
  user_id?: string;
  event_type: AuditEventType;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, unknown>;
  created_at: number;
}

// Log an audit event
export async function logAuditEvent(
  env: Env,
  event: {
    user_id?: string;
    event_type: AuditEventType;
    ip_address?: string;
    user_agent?: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  const id = generateId('audit');
  const created_at = Date.now();

  try {
    await env.DB.prepare(
      `INSERT INTO audit_logs (id, user_id, event_type, ip_address, user_agent, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        event.user_id || null,
        event.event_type,
        event.ip_address || null,
        event.user_agent || null,
        event.details ? JSON.stringify(event.details) : null,
        created_at
      )
      .run();
  } catch (error) {
    // Log error but don't throw - audit logging should never break the app
    console.error('Failed to log audit event:', error);
  }
}

// Get audit logs
export async function getAuditLogs(
  env: Env,
  options: {
    user_id?: string;
    event_type?: AuditEventType;
    days?: number;
    limit?: number;
    offset?: number;
  }
): Promise<{ logs: AuditLog[]; total: number }> {
  const days = options.days || 30;
  const limit = options.limit || 100;
  const offset = options.offset || 0;
  const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

  let whereClauses: string[] = ['created_at >= ?'];
  const bindings: unknown[] = [cutoffTime];

  if (options.user_id) {
    whereClauses.push('user_id = ?');
    bindings.push(options.user_id);
  }

  if (options.event_type) {
    whereClauses.push('event_type = ?');
    bindings.push(options.event_type);
  }

  const whereClause = whereClauses.join(' AND ');

  // Get total count
  const countResult = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM audit_logs WHERE ${whereClause}`
  )
    .bind(...bindings)
    .first<{ count: number }>();

  const total = countResult?.count || 0;

  // Get logs
  const logs = await env.DB.prepare(
    `SELECT * FROM audit_logs WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(...bindings, limit, offset)
    .all<AuditLog>();

  // Parse details JSON
  const parsedLogs = logs.results.map((log) => ({
    ...log,
    details: log.details ? JSON.parse(log.details as unknown as string) : undefined,
  }));

  return { logs: parsedLogs, total };
}

// Cleanup logs older than 30 days
// This should be called via a scheduled task (cron job) or manually
// Not called automatically to avoid performance issues
export async function cleanupOldAuditLogs(env: Env, daysToKeep: number = 30): Promise<number> {
  const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const result = await env.DB.prepare('DELETE FROM audit_logs WHERE created_at < ?')
    .bind(cutoffTime)
    .run();

  return result.meta.changes || 0;
}

// Get IP address from request
export function getIpAddress(request: Request): string | undefined {
  // Check CF-Connecting-IP header (Cloudflare)
  const cfIp = request.headers.get('CF-Connecting-IP');
  if (cfIp) return cfIp;

  // Check X-Forwarded-For header
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  // Check X-Real-IP header
  const xRealIp = request.headers.get('X-Real-IP');
  if (xRealIp) return xRealIp;

  return undefined;
}

// Get user agent from request
export function getUserAgent(request: Request): string | undefined {
  return request.headers.get('User-Agent') || undefined;
}


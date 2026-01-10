/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// User management validation schemas
// Moved from utils/validation.ts for centralized schema organization

import { z } from 'zod';

// ============================================================================
// User Schemas
// ============================================================================

/**
 * Schema for creating a new user (admin endpoint)
 * Note: Admin creating users can use simpler passwords for testing/service accounts
 * Owner setup (register endpoint) still requires strong password
 */
export const createUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscore, and hyphen'
  }),
  email: z.string().email().optional(),
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(128, { message: 'Password must be less than 128 characters' }),
  role: z.enum(['admin', 'user', 'analyst', 'owner']).default('user'),
  global_access: z.boolean().optional(),
  domain_ids: z.array(z.string()).optional(),
});

/**
 * Schema for updating an existing user
 */
export const updateUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user', 'analyst', 'owner']).optional(),
  global_access: z.boolean().optional(),
  domain_ids: z.array(z.string()).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Schema for setting user domain access
 */
export const setUserDomainsSchema = z.object({
  global_access: z.boolean(),
  domain_ids: z.array(z.string()).optional(),
}).refine(
  (data) => data.global_access || (data.domain_ids && data.domain_ids.length > 0),
  { message: 'domain_ids is required when global_access is false' }
);

// ============================================================================
// Type Inference
// ============================================================================

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type SetUserDomainsInput = z.infer<typeof setUserDomainsSchema>;

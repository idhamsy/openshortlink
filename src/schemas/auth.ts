/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Auth schemas with type inference
// Phase 4: Schema Composition & Type Inference

import { z } from 'zod';

// ============================================================================
// Shared Validation Patterns
// ============================================================================

/**
 * Strong password validation schema
 * - At least 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const strongPasswordSchema = z.string()
  .min(12, { message: 'Password must be at least 12 characters long' })
  .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  .regex(/[0-9]/, { message: 'Password must contain at least one number' })
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, {
    message: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"\\|,.<>/? etc.)'
  });

/**
 * Username validation schema
 */
export const usernameSchema = z.string()
  .min(3)
  .max(50)
  .regex(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscore, and hyphen'
  });

/**
 * MFA code validation (6 digits)
 */
export const mfaCodeSchema = z.string().regex(/^[0-9]{6}$/, {
  message: 'MFA code must be exactly 6 digits'
});

/**
 * Backup code validation (8 digits)
 */
export const backupCodeSchema = z.string().regex(/^[0-9]{8}$/, {
  message: 'Backup code must be exactly 8 digits'
});

// ============================================================================
// Login Schema
// ============================================================================

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// ============================================================================
// Register Schema
// ============================================================================

export const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().email().optional(),
  password: strongPasswordSchema,
  role: z.enum(['admin', 'user', 'analyst', 'owner']).default('admin'),
  setup_token: z.string().optional(),
});

// ============================================================================
// Refresh Token Schema
// ============================================================================

export const refreshTokenSchema = z.object({
  refresh_token: z.string().optional(),
});

// ============================================================================
// MFA Schemas
// ============================================================================

export const mfaVerifySetupSchema = z.object({
  code: mfaCodeSchema,
});

export const mfaVerifySchema = z.object({
  mfa_token: z.string().min(1),
  code: mfaCodeSchema.optional(),
  backup_code: backupCodeSchema.optional(),
}).refine(
  (data) => data.code !== undefined || data.backup_code !== undefined,
  { message: 'Either code or backup_code must be provided' }
);

// ============================================================================
// Change Password Schema
// ============================================================================

export const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: strongPasswordSchema,
});

// ============================================================================
// Type Inference
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type MFAVerifySetupInput = z.infer<typeof mfaVerifySetupSchema>;
export type MFAVerifyInput = z.infer<typeof mfaVerifySchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ============================================================================
// Create Token Schema (for testing/custom expiration)
// ============================================================================

export const createTokenSchema = z.object({
  expires_in: z.number().min(60).max(3600).optional(), // 60 seconds to 1 hour (KV minimum is 60)
});

export type CreateTokenInput = z.infer<typeof createTokenSchema>;

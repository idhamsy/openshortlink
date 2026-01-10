/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Domain schemas with type inference
// Phase 4: Schema Composition & Type Inference

import { z } from 'zod';

// ============================================================================
// Validation Patterns
// ============================================================================

/**
 * Domain name validation regex
 * Validates: subdomain.example.com, example.com, etc.
 * Rules:
 * - Contains only letters, numbers, dots, and hyphens
 * - Each label (part between dots) is 1-63 characters
 * - Labels cannot start or end with hyphens
 * - Total length max 253 characters (RFC 1035)
 * - Must have at least one dot (for TLD)
 * - No consecutive dots
 */
const domainNameRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

/**
 * Shared domain name validation with refinements
 */
const domainNameSchema = z.string()
  .min(1, { message: 'Domain name is required' })
  .max(253, { message: 'Domain name must be 253 characters or less' })
  .regex(domainNameRegex, {
    message: 'Invalid domain name format. Domain must be valid (e.g., example.com, subdomain.example.com)'
  })
  .refine((val) => !val.startsWith('.') && !val.endsWith('.'), {
    message: 'Domain name cannot start or end with a dot'
  })
  .refine((val) => !val.includes('..'), {
    message: 'Domain name cannot contain consecutive dots'
  });

// ============================================================================
// Create Schema
// ============================================================================

/**
 * Schema for creating a new domain
 */
export const createDomainSchema = z.object({
  cloudflare_account_id: z.string().min(1),
  domain_name: domainNameSchema,
  routes: z.array(z.string().min(1)).min(1).default(['/go/*']),
  routing_path: z.string().optional(),
  default_redirect_code: z.number().int().min(301).max(308).default(301),
  status: z.enum(['active', 'inactive', 'pending']).default('active'),
});

// ============================================================================
// Update Schema
// ============================================================================

/**
 * Schema for updating an existing domain
 */
export const updateDomainSchema = z.object({
  domain_name: domainNameSchema.optional(),
  routes: z.array(z.string().min(1)).min(1).optional(),
  routing_path: z.string().optional(),
  default_redirect_code: z.number().int().min(301).max(308).optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
});

// ============================================================================
// Type Inference
// ============================================================================

export type CreateDomainInput = z.infer<typeof createDomainSchema>;
export type UpdateDomainInput = z.infer<typeof updateDomainSchema>;

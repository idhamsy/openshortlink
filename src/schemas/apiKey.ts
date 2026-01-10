/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// API Key schemas with type inference
// Phase 4: Schema Composition & Type Inference

import { z } from 'zod';

// ============================================================================
// Validation Patterns
// ============================================================================

/**
 * IP address validation using Zod 4.x built-in validators
 * z.ipv4() for IPv4 addresses, z.ipv6() for IPv6 addresses
 * Combined with z.union() to accept either format
 */
const ipAddressSchema = z.union([z.ipv4(), z.ipv6()]);

// ============================================================================
// API Key Schemas
// ============================================================================

/**
 * Lenient expiration schema - accepts both:
 * - Unix timestamp (number in milliseconds)
 * - ISO 8601 date string (e.g., "2025-12-18T23:50:00Z")
 * Transforms string to timestamp for storage
 */
const lenientExpiresAtSchema = z.union([
  z.number(),
  z.string().transform((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    return date.getTime();
  }),
]).nullable().optional();

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  domain_ids: z.array(z.string()).optional(),
  ip_whitelist: z.array(ipAddressSchema).optional(),
  allow_all_ips: z.boolean().optional().default(false),
  expires_at: lenientExpiresAtSchema,
  user_id: z.string().optional(),
});

export const updateApiKeySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  domain_ids: z.array(z.string()).optional(),
  ip_whitelist: z.array(ipAddressSchema).optional(),
  allow_all_ips: z.boolean().optional(),
  expires_at: lenientExpiresAtSchema,
});

// ============================================================================
// Type Inference
// ============================================================================

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;

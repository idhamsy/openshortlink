/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Link schemas with type inference
// Phase 4: Schema Composition & Type Inference

import { z } from 'zod';

// ============================================================================
// Shared Components
// ============================================================================

/**
 * Geo redirect schema - used in both create and update
 */
export const geoRedirectSchema = z.object({
  country_code: z.string().length(2).transform((val) => val.toUpperCase()),
  destination_url: z.string().url(),
});

/**
 * Device redirect schema - used in both create and update
 */
export const deviceRedirectSchema = z.object({
  device_type: z.enum(['desktop', 'mobile', 'tablet']),
  destination_url: z.string().url(),
});

// ============================================================================
// Base Schema (shared fields)
// ============================================================================

/**
 * Base link schema with all shared fields between create and update
 */
const baseLinkSchema = z.object({
  destination_url: z.string().url(),
  title: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  redirect_code: z.number().int().min(301).max(308).default(301),
  tags: z.array(z.string()).max(10).optional(),
  category_id: z.string().optional(),
  expires_at: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  geo_redirects: z.array(geoRedirectSchema).max(10).optional().default([]),
  device_redirects: z.array(deviceRedirectSchema).optional().default([]),
});

// ============================================================================
// Create Schema
// ============================================================================

/**
 * Schema for creating a new link
 */
export const createLinkSchema = baseLinkSchema.extend({
  domain_id: z.string().min(1),
  slug: z.string().optional(),
  route: z.string().optional(),
});

// ============================================================================
// Update Schema
// ============================================================================

/**
 * Schema for updating an existing link
 * All base fields are optional (partial), with additional status field
 */
export const updateLinkSchema = baseLinkSchema.partial().extend({
  route: z.string().optional(),
  status: z.enum(['active', 'expired', 'archived', 'deleted']).optional(),
});

// ============================================================================
// Query/Pagination Schema
// ============================================================================

/**
 * Helper to handle empty string to undefined conversion for coercion
 */
const safeNumberCoerce = (min: number, max: number, defaultValue: number) =>
  z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : val),
    z.coerce.number().int().min(min).max(max).optional()
  ).default(defaultValue);

/**
 * Schema for link list query parameters
 */
export const linkQuerySchema = z.object({
  limit: safeNumberCoerce(1, 10000, 25),
  offset: safeNumberCoerce(0, Number.MAX_SAFE_INTEGER, 0),
  domain_id: z.string().optional(),
  status: z.string().optional(),
  search: z.string().max(200).optional(),
  tag_id: z.string().optional(),
  category_id: z.string().optional(),
  include_redirects: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean()
  ).default(false),
});

// ============================================================================
// Type Inference - Auto-generated from schemas!
// ============================================================================

export type GeoRedirectInput = z.infer<typeof geoRedirectSchema>;
export type DeviceRedirectInput = z.infer<typeof deviceRedirectSchema>;
export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
export type LinkQueryParams = z.infer<typeof linkQuerySchema>;

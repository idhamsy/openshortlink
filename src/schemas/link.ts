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

/**
 * City redirect schema - used in both create and update
 */
export const cityRedirectSchema = z.object({
  city_name: z.string().min(1).transform((val) => val.toLowerCase()),
  destination_url: z.string().url(),
});

/**
 * OS redirect schema - used in both create and update
 */
export const osRedirectSchema = z.object({
  os: z.enum(['android', 'ios']),
  destination_url: z.string().url(),
});

/**
 * Open Graph / Twitter Card metadata schema (one object per link)
 */
export const ogMetaSchema = z.object({
  og_title: z.string().max(255).optional(),
  og_description: z.string().max(500).optional(),
  og_image: z.string().url().optional(),
  og_type: z.enum(['website', 'article', 'product', 'video.other']).default('website'),
  twitter_card: z.enum(['summary', 'summary_large_image']).default('summary_large_image'),
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
  geo_redirects: z.array(geoRedirectSchema).max(10).optional(),
  device_redirects: z.array(deviceRedirectSchema).optional(),
  city_redirects: z.array(cityRedirectSchema).max(20).optional(),
  os_redirects: z.array(osRedirectSchema).max(20).optional(),
  og_meta: ogMetaSchema.optional(),
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
  geo_redirects: z.array(geoRedirectSchema).max(10).optional().default([]),
  device_redirects: z.array(deviceRedirectSchema).optional().default([]),
  city_redirects: z.array(cityRedirectSchema).max(20).optional().default([]),
  os_redirects: z.array(osRedirectSchema).max(20).optional().default([]),
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
export type CityRedirectInput = z.infer<typeof cityRedirectSchema>;
export type OsRedirectInput = z.infer<typeof osRedirectSchema>;
export type OgMetaSchemaInput = z.infer<typeof ogMetaSchema>;

// ============================================================================
// OG Fetch (scrape destination URL for Open Graph tags)
// ============================================================================

/**
 * Body schema for the "Fetch from URL" action — scrapes the destination's OG tags.
 */
export const ogFetchSchema = z.object({
  url: z.string().url(),
});

export type OgFetchInput = z.infer<typeof ogFetchSchema>;
export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
export type LinkQueryParams = z.infer<typeof linkQuerySchema>;

/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Tag and Category schemas with type inference
// Phase 4: Schema Composition & Type Inference

import { z } from 'zod';

// ============================================================================
// Shared Validation Patterns
// ============================================================================

/**
 * Hex color validation (#RRGGBB format)
 * Accepts: valid hex color, null, or empty string
 */
const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, {
  message: 'Color must be in hex format (#RRGGBB)'
});

// Lenient color schema - accepts hex color, empty string, or null
// Transforms to undefined or valid hex for DB compatibility
const lenientColorSchema = z.union([
  hexColorSchema,
  z.literal(''),
  z.null(),
]).optional().transform(val => (!val || val === '') ? undefined : val);

// ============================================================================
// Tag Schemas
// ============================================================================

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  domain_id: z.string().optional(),
  color: lenientColorSchema,
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: lenientColorSchema,
});

// ============================================================================
// Category Schemas
// ============================================================================

// Lenient icon schema - accepts string, empty string, or null
// Transforms to undefined or valid string for DB compatibility
const lenientIconSchema = z.union([
  z.string().max(50),
  z.literal(''),
  z.null(),
]).optional().transform(val => (!val || val === '') ? undefined : val);

export const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  domain_id: z.string().optional(),
  icon: lenientIconSchema,
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  icon: lenientIconSchema,
});

// ============================================================================
// Type Inference
// ============================================================================

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

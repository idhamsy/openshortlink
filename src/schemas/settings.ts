/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Settings schemas with type inference
// Phase 4: Schema Composition & Type Inference

import { z } from 'zod';

// ============================================================================
// Settings Schemas
// ============================================================================

/**
 * Status check frequency setting schema
 */
export const statusCheckFrequencySchema = z.object({
  frequency: z.object({
    value: z.number().int().min(1).max(365),
    unit: z.enum(['days', 'weeks']),
  }),
  enabled: z.boolean(),
  check_top_100_daily: z.boolean(),
  batch_size: z.number().int().min(10).max(1000).default(100),
});

/**
 * Analytics aggregation enabled schema
 */
export const analyticsAggregationSchema = z.object({
  enabled: z.boolean(),
});

/**
 * Analytics thresholds schema
 */
export const analyticsThresholdsSchema = z.object({
  threshold_days: z.number().int().min(1).max(90),
});

/**
 * Root page schema (#12) — what the domain root serves when no slug is given.
 */
export const rootPageSchema = z.object({
  mode: z.enum(['branded', 'html', 'redirect']),
  html: z.string().max(100000).optional().default(''),
  redirect_url: z.string().url().max(2048).optional().or(z.literal('')).default(''),
}).refine(
  (data) => data.mode !== 'redirect' || (!!data.redirect_url && data.redirect_url.length > 0),
  { message: 'redirect_url is required when mode is "redirect"', path: ['redirect_url'] }
);

// ============================================================================
// Type Inference
// ============================================================================

export type StatusCheckFrequencyInput = z.infer<typeof statusCheckFrequencySchema>;
export type AnalyticsAggregationInput = z.infer<typeof analyticsAggregationSchema>;
export type AnalyticsThresholdsInput = z.infer<typeof analyticsThresholdsSchema>;
export type RootPageInput = z.infer<typeof rootPageSchema>;

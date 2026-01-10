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

// ============================================================================
// Type Inference
// ============================================================================

export type StatusCheckFrequencyInput = z.infer<typeof statusCheckFrequencySchema>;
export type AnalyticsAggregationInput = z.infer<typeof analyticsAggregationSchema>;
export type AnalyticsThresholdsInput = z.infer<typeof analyticsThresholdsSchema>;

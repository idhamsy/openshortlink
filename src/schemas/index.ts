/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Centralized schema exports
// Phase 4: Schema Composition & Type Inference

import { z } from 'zod';

// Re-export all schemas and types from a single entry point

export * from './link';
export * from './domain';
export * from './auth';
export * from './taxonomy';
export * from './apiKey';
export * from './settings';
export * from './user';

// ============================================================================
// Shared Utilities
// ============================================================================

/**
 * Helper to create safe number coercion for query parameters
 * Handles empty strings gracefully by converting to undefined
 */
export const createSafeNumberCoerce = (min: number, max: number, defaultValue: number) => {
  return z.preprocess(
    (val: unknown) => (val === '' || val === undefined || val === null ? undefined : val),
    z.coerce.number().int().min(min).max(max).optional()
  ).default(defaultValue);
};

/**
 * Standard pagination schema for list endpoints
 */
export const createPaginationSchema = (maxLimit: number = 10000, defaultLimit: number = 25) => {
  return z.object({
    limit: createSafeNumberCoerce(1, maxLimit, defaultLimit),
    offset: createSafeNumberCoerce(0, Number.MAX_SAFE_INTEGER, 0),
  });
};

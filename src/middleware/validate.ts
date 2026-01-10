/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Zod Validator Middleware with custom error formatting
// Phase 1: Hono/Zod Validator Integration
// This maintains compatibility with existing error response format

import { zValidator } from '@hono/zod-validator';
import type { ZodSchema } from 'zod';
import type { Context } from 'hono';
import type { Env } from '../types';

type ValidationTarget = 'json' | 'query' | 'form' | 'param';

/**
 * Custom Zod validator that returns errors in our standard format
 * This ensures backward compatibility with existing frontend error handling
 * 
 * Error format:
 * {
 *   success: false,
 *   error: {
 *     code: 'VALIDATION_ERROR',
 *     message: 'Invalid request data',
 *     details: [{ path, message, code }]
 *   }
 * }
 */
export function validate<T extends ZodSchema>(
  target: ValidationTarget,
  schema: T
) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      // Access error only when success is false
      const zodError = 'error' in result ? result.error : null;
      const issues = zodError?.issues || [];
      
      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
              code: issue.code,
            })),
          },
        },
        400
      );
    }
  });
}

/**
 * Alias for common validation targets
 */
export const validateJson = <T extends ZodSchema>(schema: T) => validate('json', schema);
export const validateQuery = <T extends ZodSchema>(schema: T) => validate('query', schema);
export const validateForm = <T extends ZodSchema>(schema: T) => validate('form', schema);
export const validateParam = <T extends ZodSchema>(schema: T) => validate('param', schema);

/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Error handling middleware

import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

export function errorHandler(error: Error, c: Context) {
  console.error('Error:', error);

  if (error instanceof HTTPException) {
    return c.json(
      {
        success: false,
        error: {
          code: error.status === 404 ? 'NOT_FOUND' : 'HTTP_ERROR',
          message: error.message,
          details: {},
        },
      },
      error.status
    );
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return c.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.issues.map((e: any) => ({
            path: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        },
      },
      400
    );
  }

  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        details: {},
      },
    },
    500
  );
}


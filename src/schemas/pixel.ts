/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Pixel library request schemas

import { z } from 'zod';
import { PIXEL_TYPES, PIXEL_RULES_CLIENT, isValidPixelId } from '../utils/pixelIds';

const pixelTypeSchema = z.enum(PIXEL_TYPES);

export const createPixelSchema = z
  .object({
    domain_id: z.string().min(1),
    name: z.string().trim().min(1).max(100),
    pixel_type: pixelTypeSchema,
    pixel_id: z.string().trim().min(1).max(64),
    is_default: z.boolean().optional().default(false),
  })
  .superRefine((v, ctx) => {
    if (!isValidPixelId(v.pixel_type, v.pixel_id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['pixel_id'],
        message: `Invalid ${PIXEL_RULES_CLIENT[v.pixel_type].label} ID (e.g. ${PIXEL_RULES_CLIENT[v.pixel_type].placeholder})`,
      });
    }
  });

// domain_id is immutable: strictObject rejects it (and any other unknown key) with a 400.
// The (type, id) pair is re-validated in the service against the stored row.
export const updatePixelSchema = z.strictObject({
  name: z.string().trim().min(1).max(100).optional(),
  pixel_type: pixelTypeSchema.optional(),
  pixel_id: z.string().trim().min(1).max(64).optional(),
  is_default: z.boolean().optional(),
});

export type CreatePixelInput = z.infer<typeof createPixelSchema>;
export type UpdatePixelInput = z.infer<typeof updatePixelSchema>;

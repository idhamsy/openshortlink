/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Per-domain pixel library API (rules live in services/pixelLibrary)

import { Hono, type Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env, User, ApiKeyContext, Variables } from '../types';
import { authOrApiKeyMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { validateJson } from '../middleware/validate';
import { createPixelSchema, updatePixelSchema } from '../schemas/pixel';
import {
  listPixels, createPixel, updatePixel, deletePixel, attachPixelToAll, detachPixelFromAll,
  PixelError, type Actor,
} from '../services/pixelLibrary';

const pixelsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

function actorOf(c: Context<{ Bindings: Env; Variables: Variables }>): Actor {
  return {
    user: c.get('user') as User | undefined,
    apiKey: (c as any).get?.('apiKey') as ApiKeyContext | undefined,
  };
}

async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof PixelError) throw new HTTPException(error.status, { message: error.message });
    throw error;
  }
}

pixelsRouter.get('/', authOrApiKeyMiddleware, async (c) => {
  const data = await run(() => listPixels(c.env, actorOf(c), c.req.query('domain_id')));
  return c.json({ success: true, data });
});

pixelsRouter.post('/', authOrApiKeyMiddleware, requirePermission('manage_pixels'), validateJson(createPixelSchema), async (c) => {
  const data = await run(() => createPixel(c.env, actorOf(c), c.req.valid('json')));
  return c.json({ success: true, data }, 201);
});

pixelsRouter.put('/:id', authOrApiKeyMiddleware, requirePermission('manage_pixels'), validateJson(updatePixelSchema), async (c) => {
  const data = await run(() => updatePixel(c.env, actorOf(c), c.req.param('id'), c.req.valid('json')));
  return c.json({ success: true, data });
});

pixelsRouter.delete('/:id', authOrApiKeyMiddleware, requirePermission('manage_pixels'), async (c) => {
  const data = await run(() => deletePixel(c.env, actorOf(c), c.req.param('id')));
  return c.json({ success: true, data });
});

pixelsRouter.post('/:id/attach-all', authOrApiKeyMiddleware, requirePermission('manage_pixels'), async (c) => {
  const data = await run(() => attachPixelToAll(c.env, actorOf(c), c.req.param('id')));
  return c.json({ success: true, data });
});

pixelsRouter.post('/:id/detach-all', authOrApiKeyMiddleware, requirePermission('manage_pixels'), async (c) => {
  const data = await run(() => detachPixelFromAll(c.env, actorOf(c), c.req.param('id')));
  return c.json({ success: true, data });
});

export { pixelsRouter };

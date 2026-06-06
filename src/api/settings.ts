/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Settings API endpoints

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env, User, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { validateJson } from '../middleware/validate';
import {
  getStatusCheckFrequency,
  setStatusCheckFrequency,
  getStatusCheckFrequencyOrDefault,
  getAnalyticsAggregationEnabled,
  getAnalyticsAggregationEnabledOrDefault,
  setAnalyticsAggregationEnabled,
  getAnalyticsThresholds,
  getAnalyticsThresholdsOrDefault,
  setAnalyticsThresholds,
  getRootPageSettingsOrDefault,
  setRootPageSettings,
} from '../db/settings';
import { getFrequencyLabel } from '../types';
import {
  statusCheckFrequencySchema,
  analyticsAggregationSchema,
  analyticsThresholdsSchema,
  rootPageSchema,
} from '../schemas';

const settingsRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// Schemas imported from ../schemas

// Get status check frequency setting
settingsRouter.get('/status-check-frequency', authMiddleware, async (c) => {
  const user = c.get('user');
  
  // Only admin/owner can view settings
  if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
    throw new HTTPException(403, { message: 'Insufficient permissions' });
  }

  const setting = await getStatusCheckFrequencyOrDefault(c.env);

  return c.json({
    success: true,
    data: {
      ...setting,
      frequency_label: getFrequencyLabel(setting.frequency),
    },
  });
});

// Update status check frequency setting
settingsRouter.put('/status-check-frequency', authMiddleware, validateJson(statusCheckFrequencySchema), async (c) => {
  const user = c.get('user') as User;
  
  // Only admin/owner can update settings
  if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
    throw new HTTPException(403, { message: 'Insufficient permissions' });
  }

  const validated = c.req.valid('json');

  await setStatusCheckFrequency(
    c.env,
    validated.frequency,
    validated.enabled,
    validated.check_top_100_daily,
    validated.batch_size,
    user.id
  );

  const updated = await getStatusCheckFrequency(c.env);

  return c.json({
    success: true,
    data: {
      ...updated!,
      frequency_label: getFrequencyLabel(validated.frequency),
    },
    message: 'Status check frequency updated successfully',
  });
});

// Analytics Aggregation Settings

// Get analytics aggregation enabled setting
settingsRouter.get('/analytics-aggregation', authMiddleware, async (c) => {
  const user = c.get('user');
  
  // Only admin/owner can view settings
  if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
    throw new HTTPException(403, { message: 'Insufficient permissions' });
  }

  const setting = await getAnalyticsAggregationEnabledOrDefault(c.env);

  return c.json({
    success: true,
    data: setting,
  });
});

// Update analytics aggregation enabled setting
settingsRouter.put('/analytics-aggregation', authMiddleware, validateJson(analyticsAggregationSchema), async (c) => {
  const user = c.get('user') as User;
  
  // Only admin/owner can update settings
  if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
    throw new HTTPException(403, { message: 'Insufficient permissions' });
  }

  const validated = c.req.valid('json');

  await setAnalyticsAggregationEnabled(
    c.env,
    validated.enabled,
    user.id
  );

  const updated = await getAnalyticsAggregationEnabled(c.env);

  return c.json({
    success: true,
    data: updated || await getAnalyticsAggregationEnabledOrDefault(c.env),
    message: `Analytics aggregation ${validated.enabled ? 'enabled' : 'disabled'} successfully`,
  });
});

// Get analytics thresholds
settingsRouter.get('/analytics-thresholds', authMiddleware, async (c) => {
  const user = c.get('user');
  
  // Only admin/owner can view settings
  if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
    throw new HTTPException(403, { message: 'Insufficient permissions' });
  }

  const thresholds = await getAnalyticsThresholdsOrDefault(c.env);

  return c.json({
    success: true,
    data: thresholds,
  });
});

// Update analytics thresholds
settingsRouter.put('/analytics-thresholds', authMiddleware, validateJson(analyticsThresholdsSchema), async (c) => {
  try {
    const user = c.get('user') as User;
    
    // Only admin/owner can update settings
    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
      throw new HTTPException(403, { message: 'Insufficient permissions' });
    }

    const validated = c.req.valid('json');

    await setAnalyticsThresholds(
      c.env,
      validated.threshold_days,
      user.id
    );

    const updated = await getAnalyticsThresholds(c.env);

    return c.json({
      success: true,
      data: updated || await getAnalyticsThresholdsOrDefault(c.env),
      message: 'Analytics thresholds updated successfully',
    });
  } catch (error) {
    console.error('[SETTINGS] Update analytics thresholds error:', error);
    // Re-throw HTTPException and ZodError for error handler
    if (error instanceof HTTPException) {
      throw error;
    }
    // Handle database errors
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      throw new HTTPException(409, { message: 'Duplicate settings entry' });
    }
    throw new HTTPException(500, { 
      message: error instanceof Error ? error.message : 'Failed to update analytics thresholds' 
    });
  }
});

// Root page settings (#12) — what the domain root serves when no slug is given.
settingsRouter.get('/root-page', authMiddleware, async (c) => {
  const user = c.get('user') as User;

  // Only admin/owner can view settings
  if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
    throw new HTTPException(403, { message: 'Insufficient permissions' });
  }

  const setting = await getRootPageSettingsOrDefault(c.env);
  return c.json({ success: true, data: setting });
});

settingsRouter.put('/root-page', authMiddleware, validateJson(rootPageSchema), async (c) => {
  try {
    const user = c.get('user') as User;

    // Only admin/owner can update settings
    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
      throw new HTTPException(403, { message: 'Insufficient permissions' });
    }

    const validated = c.req.valid('json');

    await setRootPageSettings(
      c.env,
      {
        mode: validated.mode,
        html: validated.html || '',
        redirect_url: validated.redirect_url || '',
      },
      user.id
    );

    const updated = await getRootPageSettingsOrDefault(c.env);

    return c.json({
      success: true,
      data: updated,
      message: 'Root page settings updated successfully',
    });
  } catch (error) {
    console.error('[SETTINGS] Update root page error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    // Keep internal error details in logs only; return a generic message to clients.
    throw new HTTPException(500, { message: 'Failed to update root page settings' });
  }
});

export { settingsRouter };


/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Links API endpoints

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env, User, ApiKeyContext, Link } from '../types';
import {
  getLinkById,
  getLinkByIdIncludingDeleted,
  createLink,
  updateLink,
  deleteLink,
  listLinks,
  countLinks,
  checkSlugExists,
  listLinksWithTagFilter,
} from '../db/links';
import { getLinkTags, setLinkTags, getLinksTagsBatch } from '../db/tags';
import { getCategoryById, getLinksCategoriesBatch } from '../db/categories';
import { getDomainById } from '../db/domains';
import {
  getGeoRedirects,
  getDeviceRedirects,
  upsertGeoRedirect,
  upsertDeviceRedirect,
  clearAllGeoRedirects,
  clearAllDeviceRedirects,
  getLinksGeoRedirectsBatch,
  getLinksDeviceRedirectsBatch,
} from '../db/linkRedirects';
import { generateId, generateSlug } from '../utils/id';
import { isValidUrl, isValidSlug, normalizeUrl, sanitizeHtml, sanitizeSearchInput, validateNumericBoundary, isReservedSlug } from '../utils/validation';
import { detectCountryCode, getCountryName } from '../utils/countryMappings';
import { authMiddleware, authOrApiKeyMiddleware } from '../middleware/auth';
import { validateJson } from '../middleware/validate';
import { deleteCachedLink, setCachedLink } from '../services/cache';
import { requireLinkAccess, requirePermission } from '../middleware/authorization';
import { canAccessDomain } from '../utils/permissions';
import { isInfiniteRedirect } from '../utils/domains';
import { createLinkSchema, updateLinkSchema } from '../schemas';

const linksRouter = new Hono<{ Bindings: Env }>();

// Schemas imported from ../schemas

// List links
linksRouter.get('/', authOrApiKeyMiddleware, async (c) => {
  const domainId = c.req.query('domain_id');
  const status = c.req.query('status');
  let search = c.req.query('search');
  const tagId = c.req.query('tag_id');
  const categoryId = c.req.query('category_id');
  const limitParam = c.req.query('limit');
  const offsetParam = c.req.query('offset');
  const includeRedirects = c.req.query('include_redirects') === 'true';

  // Validate search input to prevent SQL injection
  if (search) {
    try {
      search = sanitizeSearchInput(search);
    } catch (error) {
      throw new HTTPException(400, {
        message: error instanceof Error ? error.message : 'Invalid search input'
      });
    }
  }

  // Get user (if authenticated via session)
  const user = (c as any).get?.('user') as User | undefined;

  // Check API key domain scoping
  const apiKey = (c as any).get?.('apiKey') as ApiKeyContext | undefined;
  if (apiKey && apiKey.domain_ids && apiKey.domain_ids.length > 0) {
    // If domain_id is provided, verify it's allowed
    if (domainId && !apiKey.domain_ids.includes(domainId)) {
      throw new HTTPException(403, { message: 'Domain not on scope' });
    }
  }

  // Check domain access for authenticated users (not API keys)
  if (user && domainId) {
    const hasAccess = await canAccessDomain(c.env, user, domainId);
    if (!hasAccess) {
      throw new HTTPException(403, { message: 'Access denied. You do not have access to this domain.' });
    }
  }

  // Validate and set limit (default 25, max 10000)
  let limit = 25;
  if (limitParam) {
    try {
      // Handle very large numbers that might cause issues
      if (limitParam.length > 10) {
        throw new Error('limit value is too large');
      }
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || !isFinite(parsedLimit)) {
        throw new Error('limit must be a valid number');
      }
      if (!Number.isSafeInteger(parsedLimit)) {
        throw new Error('limit must be a safe integer (between -2^53 and 2^53)');
      }
      // Reject values outside valid range
      if (parsedLimit < 1) {
        throw new Error('limit must be at least 1');
      }
      if (parsedLimit > 10000) {
        throw new Error('limit cannot exceed 10000');
      }
      limit = parsedLimit;
    } catch (error) {
      throw new HTTPException(400, {
        message: error instanceof Error ? error.message : 'Invalid limit value'
      });
    }
  }

  let offset = 0;
  if (offsetParam) {
    try {
      // Handle very large numbers that might cause issues
      if (offsetParam.length > 10) {
        throw new Error('offset value is too large');
      }
      const parsedOffset = parseInt(offsetParam, 10);
      if (isNaN(parsedOffset) || !isFinite(parsedOffset)) {
        throw new Error('offset must be a valid number');
      }
      if (!Number.isSafeInteger(parsedOffset)) {
        throw new Error('offset must be a safe integer (between -2^53 and 2^53)');
      }
      offset = Math.max(parsedOffset, 0);
    } catch (error) {
      throw new HTTPException(400, {
        message: error instanceof Error ? error.message : 'Invalid offset value'
      });
    }
  }

  // Determine accessible domain IDs for database-level filtering
  let accessibleDomainIds: string[] | undefined = undefined;
  const hasGlobalAccess = user?.global_access || user?.role === 'admin' || user?.role === 'owner';

  if (!hasGlobalAccess && user) {
    // Use cached domain IDs from context (already fetched in authMiddleware)
    accessibleDomainIds = (user as any).accessible_domain_ids;
  } else if (apiKey && apiKey.domain_ids && apiKey.domain_ids.length > 0) {
    // Use API key domain restrictions
    accessibleDomainIds = apiKey.domain_ids;
  }

  // If tag or category filtering is needed, use optimized JOIN queries
  let links: any[];
  let totalCount: number;

  try {
    if (tagId) {
      // Use JOIN-based tag filtering (database-level, optimized)
      const result = await listLinksWithTagFilter(c.env, {
        domainIds: accessibleDomainIds,
        domainId: domainId || undefined,
        status: status || undefined,
        search: search || undefined,
        categoryId: categoryId || undefined,
        tagId,
        limit,
        offset,
      });
      links = result.links;
      totalCount = result.totalCount;
    } else {
      // Optimized path: use database pagination with domain filtering
      links = await listLinks(c.env, {
        domainIds: accessibleDomainIds, // Database-level filtering
        domainId: domainId || undefined, // Single domain if specified
        status: status || undefined,
        search: search || undefined,
        categoryId: categoryId || undefined,
        limit,
        offset,
      });

      // Get total count for pagination
      totalCount = await countLinks(c.env, {
        domainIds: accessibleDomainIds,
        domainId: domainId || undefined,
        status: status || undefined,
        search: search || undefined,
        categoryId: categoryId || undefined,
      });
    }

    // Batch fetch tags and categories (optimized - no N+1 queries)
    // Batch fetch tags and categories (optimized - no N+1 queries)
    const linkIds = links.map(l => l?.id).filter((id): id is string => !!id);

    // Prepare promises for parallel execution
    const promises: Promise<any>[] = [
      getLinksTagsBatch(c.env, linkIds),
      getLinksCategoriesBatch(c.env, links),
    ];

    // Add redirect fetches if requested
    if (includeRedirects && linkIds.length > 0) {
      promises.push(getLinksGeoRedirectsBatch(c.env, linkIds));
      promises.push(getLinksDeviceRedirectsBatch(c.env, linkIds));
    }

    const results = await Promise.all(promises);
    const tagsMap = results[0];
    const categoriesMap = results[1];

    // Extract maps if they exist (based on whether we requested them)
    const geoRedirectsMap = includeRedirects ? results[2] : new Map();
    const deviceRedirectsMap = includeRedirects ? results[3] : new Map();

    // Map results
    const linksWithTags = links.map(link => ({
      ...link,
      tags: tagsMap.get(link.id) || [],
      category: categoriesMap.get(link.id),
      geo_redirects: geoRedirectsMap.get(link.id) || [],
      device_redirects: deviceRedirectsMap.get(link.id) || [],
    }));

    return c.json({
      success: true,
      data: linksWithTags,
      pagination: {
        limit,
        offset,
        count: linksWithTags.length,
        total: totalCount,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('[GET /links] Error:', error);
    // Check if it's a validation or input error that should return 400
    if (error instanceof HTTPException) {
      throw error;
    }
    // Check for timeout or database errors
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch links';
    if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      throw new HTTPException(408, {
        message: 'Request timeout - query took too long to execute'
      });
    }
    throw new HTTPException(500, {
      message: errorMessage
    });
  }
});

// Get links grouped by destination URL (for status monitor)
// IMPORTANT: This must come BEFORE /:id route to avoid route conflicts
linksRouter.get('/grouped-by-destination', authMiddleware, async (c) => {
  try {
    const domainId = c.req.query('domain_id');
    const statusCodeParam = c.req.query('status_code');
    const search = c.req.query('search');
    const limitParam = c.req.query('limit');
    const offsetParam = c.req.query('offset');

    let limit = 25;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        throw new HTTPException(400, { message: 'limit must be a positive number' });
      }
      if (parsedLimit > 10000) {
        throw new HTTPException(400, { message: 'limit cannot exceed 10000' });
      }
      limit = parsedLimit;
    }
    const offset = offsetParam ? Math.max(parseInt(offsetParam) || 0, 0) : 0;
    const statusCode = statusCodeParam ? parseInt(statusCodeParam) : undefined;

    const { getLinksGroupedByDestination } = await import('../db/links');
    const { destinations, total } = await getLinksGroupedByDestination(c.env, {
      domainId: domainId || undefined,
      statusCode,
      search: search || undefined,
      limit,
      offset,
    });

    return c.json({
      success: true,
      data: destinations || [],
      pagination: {
        limit,
        offset,
        count: destinations?.length || 0,
        total: total || 0,
        has_more: offset + limit < (total || 0),
      },
    });
  } catch (error: any) {
    console.error('Error in grouped-by-destination endpoint:', error);
    throw new HTTPException(500, {
      message: error.message || 'Failed to fetch grouped destinations'
    });
  }
});

// Get links by destination URL
linksRouter.get('/by-destination', authMiddleware, async (c) => {
  const destinationUrl = c.req.query('destination_url');
  const limitParam = c.req.query('limit');
  const offsetParam = c.req.query('offset');

  if (!destinationUrl) {
    throw new HTTPException(400, { message: 'destination_url query parameter is required' });
  }

  // Normalize the URL to match how it's stored in the database
  const normalizedUrl = normalizeUrl(destinationUrl);

  let limit = 25;
  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      throw new HTTPException(400, { message: 'limit must be a positive number' });
    }
    if (parsedLimit > 10000) {
      throw new HTTPException(400, { message: 'limit cannot exceed 10000' });
    }
    limit = parsedLimit;
  }
  const offset = offsetParam ? Math.max(parseInt(offsetParam) || 0, 0) : 0;

  const { getLinksByDestinationUrl } = await import('../db/links');
  const links = await getLinksByDestinationUrl(c.env, normalizedUrl, {
    limit,
    offset,
  });

  return c.json({
    success: true,
    data: links,
    pagination: {
      limit,
      offset,
      count: links.length,
      total: links.length, // Could add count query if needed
    },
  });
});

// Get link by ID
linksRouter.get('/:id', authOrApiKeyMiddleware, async (c) => {
  const id = c.req.param('id');
  const link = await getLinkById(c.env, id);

  if (!link) {
    throw new HTTPException(404, { message: 'Link not found' });
  }

  // Check domain access for authenticated users (not API keys)
  const user = (c as any).get?.('user') as User | undefined;
  const apiKey = (c as any).get?.('apiKey') as ApiKeyContext | undefined;
  if (user && !apiKey) {
    const hasAccess = await canAccessDomain(c.env, user, link.domain_id);
    if (!hasAccess) {
      throw new HTTPException(403, { message: 'Access denied. You do not have access to this domain.' });
    }
  }

  // Check API key domain scoping
  if (apiKey && apiKey.domain_ids && apiKey.domain_ids.length > 0) {
    if (!apiKey.domain_ids.includes(link.domain_id)) {
      throw new HTTPException(403, { message: 'Domain not on scope' });
    }
  }

  // Get tags and category
  const tags = await getLinkTags(c.env, id);
  const linkWithTags = { ...link, tags };

  // Get category if category_id is set
  if (link.category_id) {
    const category = await getCategoryById(c.env, link.category_id);
    if (category) {
      (linkWithTags as any).category = category;
    }
  }

  // Get geo and device redirects in parallel
  const [geoRedirects, deviceRedirects] = await Promise.all([
    getGeoRedirects(c.env, id),
    getDeviceRedirects(c.env, id)
  ]);

  return c.json({
    success: true,
    data: {
      ...linkWithTags,
      geo_redirects: geoRedirects,
      device_redirects: deviceRedirects,
    },
  });
});

// Create link
// Note: Rate limiting intentionally removed for simplicity (internal/self-hosted use)
// Production deployments should use Cloudflare's infrastructure-level rate limiting or add:
// createRateLimit({ window: 60, max: 50, key: (c) => `link:create:${c.req.header('CF-Connecting-IP')}` })
linksRouter.post('/', authOrApiKeyMiddleware, requirePermission('create_links'), validateJson(createLinkSchema), async (c) => {
  const ip = c.req.header('cf-connecting-ip') || 'unknown';

  const validated = c.req.valid('json');

  // RE-VALIDATE domain access from database for write operations (security)
  // Always check from DB, ignore cache for writes
  const user = (c as any).get?.('user') as User | undefined;
  const apiKey = (c as any).get?.('apiKey') as ApiKeyContext | undefined;
  if (user && !apiKey) {
    // Re-validate from database (ignore cached domain IDs)
    const hasAccess = await canAccessDomain(c.env, user, validated.domain_id);
    if (!hasAccess) {
      throw new HTTPException(403, { message: 'Access denied. You do not have access to this domain.' });
    }
  }

  // Validate URL
  if (!isValidUrl(validated.destination_url)) {
    throw new HTTPException(400, { message: 'Invalid destination URL' });
  }

  // Check for infinite redirect loop
  if (await isInfiniteRedirect(c.env, validated.destination_url)) {
    throw new HTTPException(400, {
      message: 'Destination URL cannot point to a reserved route on a managed domain (infinite redirect loop).'
    });
  }

  // Validate domain exists and is active
  const domain = await getDomainById(c.env, validated.domain_id);
  if (!domain) {
    throw new HTTPException(404, { message: 'Domain not found' });
  }
  if (domain.status !== 'active') {
    throw new HTTPException(400, { message: 'Cannot create links for inactive domain. Please activate the domain first.' });
  }

  // Validate route if provided
  if (validated.route) {
    if (!domain.routes || !domain.routes.includes(validated.route)) {
      throw new HTTPException(400, { message: 'Invalid route for this domain' });
    }
  }

  // Check API key domain scoping (already declared above)
  if (apiKey && apiKey.domain_ids && apiKey.domain_ids.length > 0) {
    if (!apiKey.domain_ids.includes(validated.domain_id)) {
      throw new HTTPException(403, { message: 'Domain not on scope' });
    }
  }

  // Generate or validate slug
  let slug = validated.slug;
  if (!slug) {
    slug = generateSlug(8);
    // Check uniqueness
    let attempts = 0;
    while (await checkSlugExists(c.env, validated.domain_id, slug) && attempts < 10) {
      slug = generateSlug(8);
      attempts++;
    }
    if (attempts >= 10) {
      throw new HTTPException(500, { message: 'Failed to generate unique slug' });
    }
  } else {
    if (!isValidSlug(slug)) {
      throw new HTTPException(400, { message: 'Invalid slug format' });
    }
    if (isReservedSlug(slug)) {
      throw new HTTPException(400, { message: 'Slug is reserved' });
    }
    if (await checkSlugExists(c.env, validated.domain_id, slug)) {
      throw new HTTPException(409, { message: 'Slug already exists' });
    }
  }

  // Sanitize inputs
  let title: string | undefined;
  let description: string | undefined;
  try {
    title = validated.title ? sanitizeHtml(validated.title) : undefined;
    description = validated.description ? sanitizeHtml(validated.description) : undefined;
  } catch (error) {
    throw new HTTPException(400, {
      message: 'Invalid input: failed to sanitize HTML content'
    });
  }
  const destinationUrl = normalizeUrl(validated.destination_url);

  // Validate category if provided
  if (validated.category_id) {
    const category = await getCategoryById(c.env, validated.category_id);
    if (!category) {
      throw new HTTPException(404, { message: 'Category not found' });
    }
  }

  // Prepare metadata with route (category_id now goes in dedicated column)
  let metadata: string | undefined = undefined;
  if (validated.metadata || validated.route) {
    const metadataObj = validated.metadata ? { ...validated.metadata } : {};
    if (validated.route) {
      metadataObj.route = validated.route;
    }
    metadata = JSON.stringify(metadataObj);
  }

  // Create link
  const link = await createLink(c.env, {
    domain_id: validated.domain_id,
    slug,
    destination_url: destinationUrl,
    title,
    description,
    redirect_code: validated.redirect_code,
    status: 'active',
    expires_at: validated.expires_at,
    metadata,
    category_id: validated.category_id, // Use dedicated column
    click_count: 0,
    unique_visitors: 0,
  });

  // Set tags if provided
  if (validated.tags && validated.tags.length > 0) {
    await setLinkTags(c.env, link.id, validated.tags);
  }

  // Save geo redirects
  if (validated.geo_redirects && validated.geo_redirects.length > 0) {
    for (const geo of validated.geo_redirects) {
      await upsertGeoRedirect(c.env, link.id, geo.country_code, geo.destination_url);
    }
  }

  // Save device redirects
  if (validated.device_redirects && validated.device_redirects.length > 0) {
    for (const device of validated.device_redirects) {
      await upsertDeviceRedirect(c.env, link.id, device.device_type, device.destination_url);
    }
  }

  // Build cache with redirects
  const geoRedirects = await getGeoRedirects(c.env, link.id);
  const deviceRedirects = await getDeviceRedirects(c.env, link.id);

  const cachedLink = {
    destination_url: link.destination_url,
    redirect_code: link.redirect_code,
    status: link.status,
    expires_at: link.expires_at,
    password_hash: link.password_hash,
    link_id: link.id, // Include link_id in cache for tracking
    geo_redirects:
      geoRedirects.length > 0
        ? Object.fromEntries(geoRedirects.map((r) => [r.country_code, r.destination_url]))
        : undefined,
    device_redirects:
      deviceRedirects.length > 0
        ? {
          desktop: deviceRedirects.find((r) => r.device_type === 'desktop')?.destination_url,
          mobile: deviceRedirects.find((r) => r.device_type === 'mobile')?.destination_url,
          tablet: deviceRedirects.find((r) => r.device_type === 'tablet')?.destination_url,
        }
        : undefined,
    route: link.metadata ? (() => {
      try { return JSON.parse(link.metadata).route; } catch { return undefined; }
    })() : undefined,
    domain_routing_path: domain.routing_path,
  };

  await setCachedLink(c.env, domain.domain_name, link.slug, cachedLink);

  // Get link with tags
  const tags = await getLinkTags(c.env, link.id);
  const linkWithTags = { ...link, tags, geo_redirects: geoRedirects, device_redirects: deviceRedirects };

  return c.json({ success: true, data: linkWithTags }, 201);
});

// Update link
linksRouter.put('/:id', authOrApiKeyMiddleware, requireLinkAccess('edit'), validateJson(updateLinkSchema), async (c) => {
  const id = c.req.param('id');
  const validated = c.req.valid('json');

  // Use getLinkByIdIncludingDeleted to allow restoring deleted links
  const existingLink = await getLinkByIdIncludingDeleted(c.env, id);
  if (!existingLink) {
    throw new HTTPException(404, { message: 'Link not found' });
  }

  // Check API key domain scoping
  const apiKey = (c as any).get?.('apiKey') as ApiKeyContext | undefined;
  if (apiKey && apiKey.domain_ids && apiKey.domain_ids.length > 0) {
    if (!apiKey.domain_ids.includes(existingLink.domain_id)) {
      throw new HTTPException(403, { message: 'Domain not on scope' });
    }
  }

  // Sanitize inputs
  const updates: Parameters<typeof updateLink>[2] = {};
  if (validated.destination_url) {
    if (!isValidUrl(validated.destination_url)) {
      throw new HTTPException(400, { message: 'Invalid destination URL' });
    }
    updates.destination_url = normalizeUrl(validated.destination_url);

    // Check for infinite redirect loop
    if (await isInfiniteRedirect(c.env, updates.destination_url)) {
      throw new HTTPException(400, {
        message: 'Destination URL cannot point to a reserved route on a managed domain (infinite redirect loop).'
      });
    }
  }
  if (validated.title !== undefined) {
    try {
      updates.title = validated.title ? sanitizeHtml(validated.title) : undefined;
    } catch (error) {
      throw new HTTPException(400, {
        message: 'Invalid input: failed to sanitize title'
      });
    }
  }
  if (validated.description !== undefined) {
    try {
      updates.description = validated.description ? sanitizeHtml(validated.description) : undefined;
    } catch (error) {
      throw new HTTPException(400, {
        message: 'Invalid input: failed to sanitize description'
      });
    }
  }
  if (validated.redirect_code !== undefined) {
    updates.redirect_code = validated.redirect_code;
  }
  if (validated.status !== undefined) {
    updates.status = validated.status;
  }
  if (validated.expires_at !== undefined) {
    updates.expires_at = validated.expires_at;
  }
  if (validated.category_id !== undefined) {
    // Validate category if provided
    if (validated.category_id) {
      const category = await getCategoryById(c.env, validated.category_id);
      if (!category) {
        throw new HTTPException(404, { message: 'Category not found' });
      }
    }
    // Store category_id in dedicated column (optimization #4)
    updates.category_id = validated.category_id;
  }

  // Handle route update
  if (validated.route !== undefined) {
    const domain = await getDomainById(c.env, existingLink.domain_id);
    if (domain) {
      if (!domain.routes || !domain.routes.includes(validated.route)) {
        throw new HTTPException(400, { message: 'Invalid route for this domain' });
      }
      const currentMetadata = updates.metadata ? JSON.parse(updates.metadata) : (existingLink.metadata ? JSON.parse(existingLink.metadata) : {});
      updates.metadata = JSON.stringify({ ...currentMetadata, route: validated.route });
    }
  }

  if (validated.metadata !== undefined && validated.category_id === undefined && validated.route === undefined) {
    const currentMetadata = existingLink.metadata ? JSON.parse(existingLink.metadata) : {};
    updates.metadata = JSON.stringify({ ...currentMetadata, ...validated.metadata });
  }

  await updateLink(c.env, id, updates);

  // Update tags if provided
  if (validated.tags !== undefined) {
    await setLinkTags(c.env, id, validated.tags);
  }

  // Update geo redirects if provided
  if (validated.geo_redirects !== undefined) {
    // Clear existing and add new
    await clearAllGeoRedirects(c.env, id);
    for (const geo of validated.geo_redirects) {
      await upsertGeoRedirect(c.env, id, geo.country_code, geo.destination_url);
    }
  }

  // Update device redirects if provided
  if (validated.device_redirects !== undefined) {
    await clearAllDeviceRedirects(c.env, id);
    for (const device of validated.device_redirects) {
      await upsertDeviceRedirect(c.env, id, device.device_type, device.destination_url);
    }
  }

  // Get updated link with tags and category
  const updatedLink = await getLinkById(c.env, id);
  if (!updatedLink) {
    throw new HTTPException(404, { message: 'Link not found' });
  }

  const tags = await getLinkTags(c.env, id);
  let category = undefined;
  if (updatedLink.category_id) {
    category = await getCategoryById(c.env, updatedLink.category_id);
  }

  // Get redirects
  const geoRedirects = await getGeoRedirects(c.env, id);
  const deviceRedirects = await getDeviceRedirects(c.env, id);

  // Rebuild cache with updated data (same structure as create)
  const domain = await getDomainById(c.env, existingLink.domain_id);
  if (domain) {
    const cachedLink = {
      destination_url: updatedLink.destination_url,
      redirect_code: updatedLink.redirect_code,
      status: updatedLink.status,
      expires_at: updatedLink.expires_at,
      password_hash: updatedLink.password_hash,
      link_id: updatedLink.id, // Include link_id in cache for tracking
      geo_redirects:
        geoRedirects.length > 0
          ? Object.fromEntries(geoRedirects.map((r) => [r.country_code, r.destination_url]))
          : undefined,
      device_redirects:
        deviceRedirects.length > 0
          ? {
            desktop: deviceRedirects.find((r) => r.device_type === 'desktop')?.destination_url,
            mobile: deviceRedirects.find((r) => r.device_type === 'mobile')?.destination_url,
            tablet: deviceRedirects.find((r) => r.device_type === 'tablet')?.destination_url,
          }
          : undefined,
      route: updatedLink.metadata ? (() => {
        try { return JSON.parse(updatedLink.metadata).route; } catch { return undefined; }
      })() : undefined,
      domain_routing_path: domain.routing_path,
    };

    await setCachedLink(c.env, domain.domain_name, existingLink.slug, cachedLink);
  }

  const linkWithTags = { ...updatedLink, tags, category, geo_redirects: geoRedirects, device_redirects: deviceRedirects };

  return c.json({ success: true, data: linkWithTags });
});

// Delete link
linksRouter.delete('/:id', authOrApiKeyMiddleware, requireLinkAccess('delete'), async (c) => {
  const id = c.req.param('id');
  const hardDelete = c.req.query('hard') === 'true';

  // Use getLinkByIdIncludingDeleted to check if link exists (including deleted ones)
  // If already deleted and not hard delete, return 404
  const existingLink = await getLinkByIdIncludingDeleted(c.env, id);
  if (!existingLink) {
    throw new HTTPException(404, { message: 'Link not found' });
  }

  // If already soft-deleted and not hard delete, return 404
  if (existingLink.status === 'deleted' && !hardDelete) {
    throw new HTTPException(404, { message: 'Link not found' });
  }

  // Check API key domain scoping
  const apiKey = (c as any).get?.('apiKey') as ApiKeyContext | undefined;
  if (apiKey && apiKey.domain_ids && apiKey.domain_ids.length > 0) {
    if (!apiKey.domain_ids.includes(existingLink.domain_id)) {
      throw new HTTPException(403, { message: 'Domain not on scope' });
    }
  }

  const success = await deleteLink(c.env, id, hardDelete);

  if (!success) {
    throw new HTTPException(500, { message: 'Failed to delete link' });
  }

  // Invalidate cache
  const domain = await getDomainById(c.env, existingLink.domain_id);
  if (domain) {
    await deleteCachedLink(c.env, domain.domain_name, existingLink.slug);
  }

  return c.json({ success: true, message: 'Link deleted' });
});

// Bulk operations
linksRouter.post('/bulk', authOrApiKeyMiddleware, requirePermission('edit_links'), async (c) => {
  const body = await c.req.json();
  const { action, link_ids, updates } = body;

  if (!Array.isArray(link_ids) || link_ids.length === 0) {
    throw new HTTPException(400, { message: 'link_ids array required' });
  }

  // Check API key domain scoping
  const apiKey = (c as any).get?.('apiKey') as ApiKeyContext | undefined;

  const results = [];

  if (action === 'delete') {
    for (const id of link_ids) {
      const link = await getLinkById(c.env, id);
      if (link) {
        // Check API key domain scoping
        if (apiKey && apiKey.domain_ids && apiKey.domain_ids.length > 0) {
          if (!apiKey.domain_ids.includes(link.domain_id)) {
            results.push({ id, success: false, error: 'Domain not on scope' });
            continue;
          }
        }

        await deleteLink(c.env, id, false);
        const domain = await getDomainById(c.env, link.domain_id);
        if (domain) {
          await deleteCachedLink(c.env, domain.domain_name, link.slug);
        }
        results.push({ id, success: true });
      } else {
        results.push({ id, success: false, error: 'Link not found' });
      }
    }
  } else if (action === 'update' && updates) {
    const validated = updateLinkSchema.partial().parse(updates);
    // Extract tags, category_id, route, metadata, geo_redirects, and device_redirects (they're handled separately)
    const { tags, category_id, route, metadata: metadataObj, geo_redirects, device_redirects, ...linkUpdates } = validated;

    for (const id of link_ids) {
      const link = await getLinkById(c.env, id);
      if (link) {
        // Check API key domain scoping
        if (apiKey && apiKey.domain_ids && apiKey.domain_ids.length > 0) {
          if (!apiKey.domain_ids.includes(link.domain_id)) {
            results.push({ id, success: false, error: 'Domain not on scope' });
            continue;
          }
        }

        // Prepare metadata updates
        let finalMetadata: string | undefined = undefined;
        if (metadataObj !== undefined || category_id !== undefined) {
          const currentMetadata = link.metadata ? JSON.parse(link.metadata) : {};
          const updatedMetadata = metadataObj ? { ...currentMetadata, ...metadataObj } : { ...currentMetadata };
          if (category_id !== undefined) {
            updatedMetadata.category_id = category_id;
          }
          if (route !== undefined) {
            // We should validate route against domain here, but for bulk ops we might skip strict validation or fail?
            // Let's validate
            const domain = await getDomainById(c.env, link.domain_id);
            if (domain && domain.routes && domain.routes.includes(route)) {
              updatedMetadata.route = route;
            } else {
              results.push({ id, success: false, error: 'Invalid route for domain' });
              continue;
            }
          }
          finalMetadata = JSON.stringify(updatedMetadata);
        }

        // Update link fields (excluding tags, category_id, metadata, and redirects which are handled separately)
        if (Object.keys(linkUpdates).length > 0 || finalMetadata !== undefined) {
          await updateLink(c.env, id, { ...linkUpdates, ...(finalMetadata !== undefined ? { metadata: finalMetadata } : {}) });
        }

        // Handle tags separately if provided
        if (tags !== undefined) {
          await setLinkTags(c.env, id, tags);
        }

        // Handle geo redirects if provided
        if (geo_redirects !== undefined) {
          await clearAllGeoRedirects(c.env, id);
          for (const geo of geo_redirects) {
            await upsertGeoRedirect(c.env, id, geo.country_code, geo.destination_url);
          }
        }

        // Handle device redirects if provided
        if (device_redirects !== undefined) {
          await clearAllDeviceRedirects(c.env, id);
          for (const device of device_redirects) {
            await upsertDeviceRedirect(c.env, id, device.device_type, device.destination_url);
          }
        }

        // Rebuild cache with updated data (same structure as create)
        const domain = await getDomainById(c.env, link.domain_id);
        if (domain) {
          // Get updated link data
          const updatedLink = await getLinkById(c.env, id);
          if (updatedLink) {
            const geoRedirects = await getGeoRedirects(c.env, id);
            const deviceRedirects = await getDeviceRedirects(c.env, id);

            const cachedLink = {
              destination_url: updatedLink.destination_url,
              redirect_code: updatedLink.redirect_code,
              status: updatedLink.status,
              expires_at: updatedLink.expires_at,
              password_hash: updatedLink.password_hash,
              link_id: updatedLink.id, // Include link_id in cache for tracking
              geo_redirects:
                geoRedirects.length > 0
                  ? Object.fromEntries(geoRedirects.map((r) => [r.country_code, r.destination_url]))
                  : undefined,
              device_redirects:
                deviceRedirects.length > 0
                  ? {
                    desktop: deviceRedirects.find((r) => r.device_type === 'desktop')?.destination_url,
                    mobile: deviceRedirects.find((r) => r.device_type === 'mobile')?.destination_url,
                    tablet: deviceRedirects.find((r) => r.device_type === 'tablet')?.destination_url,
                  }
                  : undefined,
              route: updatedLink.metadata ? (() => {
                try { return JSON.parse(updatedLink.metadata).route; } catch { return undefined; }
              })() : undefined,
              domain_routing_path: domain.routing_path,
            };

            await setCachedLink(c.env, domain.domain_name, link.slug, cachedLink);
          }
        }
        results.push({ id, success: true });
      } else {
        results.push({ id, success: false, error: 'Link not found' });
      }
    }
  }

  return c.json({ success: true, data: results });
});

// Import links from CSV
linksRouter.post('/import', authOrApiKeyMiddleware, requirePermission('create_links'), async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const domainId = formData.get('domain_id') as string;
    const columnMappingStr = formData.get('column_mapping') as string;
    const slugPrefixFilterStr = formData.get('slug_prefix_filter') as string;
    let delimiter = (formData.get('delimiter') as string) || ',';

    // Handle tab delimiter (sent as '\t' string or actual tab character)
    if (delimiter === '\\t' || delimiter === '\t') {
      delimiter = '\t';
    }

    if (!file) {
      throw new HTTPException(400, { message: 'CSV file is required' });
    }

    // Validate file size (max 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      throw new HTTPException(400, {
        message: `File too large. Maximum size is 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`
      });
    }

    if (!domainId) {
      throw new HTTPException(400, { message: 'Domain ID is required' });
    }

    if (!columnMappingStr) {
      throw new HTTPException(400, { message: 'Column mapping is required' });
    }

    // Validate domain exists
    const domain = await getDomainById(c.env, domainId);
    if (!domain) {
      throw new HTTPException(404, { message: 'Domain not found' });
    }

    // Check API key domain scoping
    const apiKey = (c as any).get?.('apiKey') as ApiKeyContext | undefined;
    if (apiKey && apiKey.domain_ids && apiKey.domain_ids.length > 0) {
      if (!apiKey.domain_ids.includes(domainId)) {
        throw new HTTPException(403, { message: 'Domain not on scope' });
      }
    }

    // Parse column mapping
    let columnMapping: Record<string, string>;
    try {
      columnMapping = JSON.parse(columnMappingStr);
    } catch {
      throw new HTTPException(400, { message: 'Invalid column mapping JSON' });
    }

    // Parse slug prefix filter
    let slugPrefixFilter: Record<string, string> = {};
    if (slugPrefixFilterStr) {
      try {
        slugPrefixFilter = JSON.parse(slugPrefixFilterStr);
      } catch {
        // Ignore invalid prefix filter JSON
      }
    }

    // Read and parse CSV
    const csvText = await file.text();
    // Handle both \r\n and \n line endings
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);

    if (lines.length < 2) {
      throw new HTTPException(400, { message: 'CSV must have at least a header row and one data row' });
    }

    // Parse CSV header
    const headers = parseCSVLine(lines[0], delimiter);

    // Auto-detect geo and device redirect columns
    const geoColumns: Record<string, string> = {}; // { columnName: countryCode }
    const deviceColumns: Record<string, string> = {}; // { columnName: deviceType }

    const validDeviceTypes = ['desktop', 'mobile', 'tablet'];
    const deviceSuffixes = [' url', ' link', ' page', '_url', '_link', '_page', '-url', '-link', '-page', 'url', 'link', 'page'];

    headers.forEach(header => {
      const original = header.trim();
      const cleanHeader = original.toLowerCase();

      // Try to detect country using comprehensive detection
      const countryCode = detectCountryCode(original);
      if (countryCode) {
        geoColumns[header] = countryCode;
        return; // Skip device detection if country detected
      }

      // Check for device pattern with various suffixes
      let withoutSuffix = cleanHeader;
      for (const suffix of deviceSuffixes) {
        if (cleanHeader.endsWith(suffix)) {
          withoutSuffix = cleanHeader.slice(0, -suffix.length).trim();
          withoutSuffix = withoutSuffix.replace(/[_-]+$/, ''); // Remove trailing separators
          break;
        }
      }

      // Check if it matches a device type
      if (validDeviceTypes.includes(withoutSuffix)) {
        deviceColumns[header] = withoutSuffix;
      }
    });

    // Parse CSV rows
    const rows: string[][] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i], delimiter);
      if (row.length > 0) {
        rows.push(row);
      }
    }

    if (rows.length === 0) {
      throw new HTTPException(400, { message: 'CSV has no data rows' });
    }

    // Map columns to link fields
    const requiredFields = ['destination_url'];
    const results: Array<{ success: boolean; slug?: string; error?: string; row?: number }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowData: Record<string, string> = {};
      const geoRedirectsData: Record<string, string> = {}; // { countryCode: url }
      const deviceRedirectsData: Record<string, string> = {}; // { deviceType: url }

      // Map CSV columns to data
      for (const [csvColumn, linkField] of Object.entries(columnMapping)) {
        // Try exact match first, then case-insensitive match
        let columnIndex = headers.indexOf(csvColumn);
        if (columnIndex === -1) {
          // Try case-insensitive match
          columnIndex = headers.findIndex(h => h.trim().toLowerCase() === csvColumn.trim().toLowerCase());
        }
        if (columnIndex !== -1 && columnIndex < row.length) {
          let value = row[columnIndex].trim();

          // Check if this is a manual device redirect mapping
          if (linkField.startsWith('device_redirect:')) {
            const deviceType = linkField.split(':')[1] as 'desktop' | 'mobile' | 'tablet';
            if (value && isValidUrl(value)) {
              deviceRedirectsData[deviceType] = normalizeUrl(value);
            }
            continue; // Skip adding to rowData
          }

          // Apply slug prefix filter if this is a slug field
          if (linkField === 'slug' && slugPrefixFilter[csvColumn]) {
            value = extractSlugFromPrefix(value, slugPrefixFilter[csvColumn]);
          }

          rowData[linkField] = value;
        }
      }

      // Extract geo redirect URLs from detected columns
      for (const [columnName, countryCode] of Object.entries(geoColumns)) {
        const columnIndex = headers.indexOf(columnName);
        if (columnIndex !== -1 && columnIndex < row.length) {
          const url = row[columnIndex].trim();
          if (url && isValidUrl(url)) {
            geoRedirectsData[countryCode] = normalizeUrl(url);
          }
        }
      }

      // Extract device redirect URLs from detected columns
      for (const [columnName, deviceType] of Object.entries(deviceColumns)) {
        const columnIndex = headers.indexOf(columnName);
        if (columnIndex !== -1 && columnIndex < row.length) {
          const url = row[columnIndex].trim();
          if (url && isValidUrl(url)) {
            deviceRedirectsData[deviceType] = normalizeUrl(url);
          }
        }
      }

      // Validate required fields
      if (!rowData.destination_url) {
        results.push({ success: false, error: 'Missing destination_url', row: i + 2 });
        continue;
      }

      // Validate URL
      if (!isValidUrl(rowData.destination_url)) {
        results.push({ success: false, error: 'Invalid destination_url', row: i + 2 });
        continue;
      }

      // Prepare link data
      const linkData: any = {
        domain_id: domainId,
        destination_url: normalizeUrl(rowData.destination_url),
        redirect_code: rowData.redirect_code ? parseInt(rowData.redirect_code) || 301 : 301,
      };

      if (rowData.slug) {
        // Validate slug if provided
        if (!isValidSlug(rowData.slug)) {
          results.push({ success: false, error: 'Invalid slug format', row: i + 2 });
          continue;
        }
        if (await checkSlugExists(c.env, domainId, rowData.slug)) {
          results.push({ success: false, error: 'Slug already exists', row: i + 2 });
          continue;
        }
        linkData.slug = rowData.slug;
      } else {
        // Generate slug
        let slug = generateSlug(8);
        let attempts = 0;
        while (await checkSlugExists(c.env, domainId, slug) && attempts < 10) {
          slug = generateSlug(8);
          attempts++;
        }
        if (attempts >= 10) {
          results.push({ success: false, error: 'Failed to generate unique slug', row: i + 2 });
          continue;
        }
        linkData.slug = slug;
      }

      if (rowData.title) {
        try {
          linkData.title = sanitizeHtml(rowData.title);
        } catch (error) {
          results.push({ success: false, error: 'Invalid input: failed to sanitize title', row: i + 2 });
          continue;
        }
      }
      if (rowData.description) {
        try {
          linkData.description = sanitizeHtml(rowData.description);
        } catch (error) {
          results.push({ success: false, error: 'Invalid input: failed to sanitize description', row: i + 2 });
          continue;
        }
      }

      // Handle category_id if provided
      if (rowData.category_id) {
        const category = await getCategoryById(c.env, rowData.category_id);
        if (category) {
          linkData.metadata = JSON.stringify({ category_id: rowData.category_id });
        }
      }

      // Handle tags if provided (comma-separated tag names)
      let tags: string[] = [];
      if (rowData.tags) {
        const tagNames = rowData.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
        // For now, we'll skip tag creation during import - tags should be created separately
        // This could be enhanced later to auto-create tags
      }

      // Build geo redirects array from extracted data
      const geoRedirects: Array<{ country_code: string; destination_url: string }> = [];
      for (const [countryCode, url] of Object.entries(geoRedirectsData)) {
        geoRedirects.push({ country_code: countryCode, destination_url: url });
      }
      // Limit to 10 countries
      if (geoRedirects.length > 10) {
        geoRedirects.splice(10);
      }

      // Build device redirects array from extracted data
      const deviceRedirects: Array<{ device_type: 'desktop' | 'mobile' | 'tablet'; destination_url: string }> = [];
      for (const [deviceType, url] of Object.entries(deviceRedirectsData)) {
        deviceRedirects.push({
          device_type: deviceType as 'desktop' | 'mobile' | 'tablet',
          destination_url: url
        });
      }

      try {
        // Create link
        const link = await createLink(c.env, {
          ...linkData,
          status: 'active',
          click_count: 0,
          unique_visitors: 0,
        });

        // Set tags if any
        if (tags.length > 0) {
          await setLinkTags(c.env, link.id, tags);
        }

        // Set geo redirects if any
        if (geoRedirects.length > 0) {
          for (const geo of geoRedirects) {
            await upsertGeoRedirect(c.env, link.id, geo.country_code, geo.destination_url);
          }
        }

        // Set device redirects if any
        if (deviceRedirects.length > 0) {
          for (const device of deviceRedirects) {
            await upsertDeviceRedirect(c.env, link.id, device.device_type, device.destination_url);
          }
        }

        // Build and cache link with redirects
        const domain = await getDomainById(c.env, domainId);
        if (domain) {
          const cachedGeoRedirects = await getGeoRedirects(c.env, link.id);
          const cachedDeviceRedirects = await getDeviceRedirects(c.env, link.id);

          const cachedLink = {
            destination_url: link.destination_url,
            redirect_code: link.redirect_code,
            status: link.status,
            expires_at: link.expires_at,
            password_hash: link.password_hash,
            link_id: link.id, // Include link_id in cache for tracking
            geo_redirects:
              cachedGeoRedirects.length > 0
                ? Object.fromEntries(cachedGeoRedirects.map((r) => [r.country_code, r.destination_url]))
                : undefined,
            device_redirects:
              cachedDeviceRedirects.length > 0
                ? {
                  desktop: cachedDeviceRedirects.find((r) => r.device_type === 'desktop')?.destination_url,
                  mobile: cachedDeviceRedirects.find((r) => r.device_type === 'mobile')?.destination_url,
                  tablet: cachedDeviceRedirects.find((r) => r.device_type === 'tablet')?.destination_url,
                }
                : undefined,
            route: link.metadata ? (() => {
              try { return JSON.parse(link.metadata).route; } catch { return undefined; }
            })() : undefined,
            domain_routing_path: domain.routing_path,
          };

          await setCachedLink(c.env, domain.domain_name, link.slug, cachedLink);
        }

        results.push({ success: true, slug: link.slug });
      } catch (error: any) {
        results.push({ success: false, error: error.message || 'Failed to create link', row: i + 2 });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return c.json({
      success: true,
      data: {
        total: results.length,
        success: successCount,
        errors: errorCount,
        results,
      },
    });
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: error.message || 'Failed to import CSV' });
  }
});

// Helper function to extract slug from value using prefix filter
// Uses string operations instead of regex to prevent ReDoS attacks
function extractSlugFromPrefix(value: string, prefix: string): string {
  if (!value || !prefix) return value;
  
  // Limit prefix length for defense in depth
  if (prefix.length > 200) {
    return value;
  }

  // Remove trailing slash from prefix if present
  const cleanPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  const prefixWithSlash = cleanPrefix + '/';
  
  // Use case-insensitive string matching instead of regex (safer, prevents ReDoS)
  const valueLower = value.toLowerCase();
  const prefixWithSlashLower = prefixWithSlash.toLowerCase();
  const cleanPrefixLower = cleanPrefix.toLowerCase();

  // Try to find prefix with slash first
  const indexWithSlash = valueLower.indexOf(prefixWithSlashLower);
  if (indexWithSlash !== -1) {
    // Extract from original string at the correct position
    const afterPrefix = value.substring(indexWithSlash + prefixWithSlash.length);
    const extracted = afterPrefix.split('/')[0].trim();
    return extracted || value; // Return extracted, or original if somehow empty
  }

  // Try without trailing slash if prefix with slash not found
  const indexWithoutSlash = valueLower.indexOf(cleanPrefixLower);
  if (indexWithoutSlash !== -1) {
    const afterPrefix = value.substring(indexWithoutSlash + cleanPrefix.length);
    const extracted = afterPrefix.startsWith('/')
      ? afterPrefix.substring(1).split('/')[0].trim()
      : afterPrefix.split('/')[0].trim();
    return extracted || value;
  }

  return value; // Return original if prefix not found
}

// Helper function to parse CSV line (handles quoted fields and custom delimiter)
function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current);

  return result;
}

// Status Check Endpoints

// Get links by status code
linksRouter.get('/status/:statusCode', authMiddleware, async (c) => {
  const statusCode = parseInt(c.req.param('statusCode'));
  const domainId = c.req.query('domain_id');
  const destinationUrl = c.req.query('destination_url');
  const limitParam = c.req.query('limit');
  const offsetParam = c.req.query('offset');

  if (isNaN(statusCode)) {
    throw new HTTPException(400, { message: 'Invalid status code' });
  }

  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam) || 25, 1), 500) : 25;
  const offset = offsetParam ? Math.max(parseInt(offsetParam) || 0, 0) : 0;

  const { getLinksByStatusCode, getStatusSummary } = await import('../db/links');
  const { links, total } = await getLinksByStatusCode(c.env, statusCode, {
    domainId: domainId || undefined,
    destinationUrl: destinationUrl || undefined,
    limit,
    offset,
  });

  // Get status summary
  const statusSummary = await getStatusSummary(c.env, domainId || undefined);

  return c.json({
    success: true,
    data: links,
    pagination: {
      limit,
      offset,
      count: links.length,
      total,
      has_more: offset + limit < total,
    },
    status_summary: statusSummary,
  });
});


// Manual status check trigger
linksRouter.post('/check-status', authMiddleware, async (c) => {
  const user = (c as any).get?.('user') as User | undefined;

  if (!user) {
    throw new HTTPException(401, { message: 'Authentication required' });
  }

  // Only admin/owner/editor can trigger checks
  if (!['admin', 'owner', 'editor'].includes(user.role)) {
    throw new HTTPException(403, { message: 'Insufficient permissions' });
  }

  const body = await c.req.json();
  const linkIds = body.link_ids as string[] | undefined;

  const { processScheduledStatusCheck, checkLinksBatch } = await import('../services/status-check');
  const { getLinksForStatusCheck, getLinkById } = await import('../db/links');
  const { getStatusCheckFrequencyOrDefault } = await import('../db/settings');
  const { getFrequencyInMs } = await import('../types');

  const settings = await getStatusCheckFrequencyOrDefault(c.env);
  const frequencyMs = getFrequencyInMs(settings.frequency);

  let links: Link[];
  if (linkIds && linkIds.length > 0) {
    // Check specific links
    const placeholders = linkIds.map(() => '?').join(',');
    const result = await c.env.DB.prepare(
      `SELECT * FROM links WHERE id IN (${placeholders}) AND status != 'deleted'`
    ).bind(...linkIds).all<Link>();
    links = result.results || [];
  } else {
    // Check all links (use batch_size from settings)
    links = await getLinksForStatusCheck(c.env, settings.batch_size);
  }

  if (links.length === 0) {
    return c.json({
      success: true,
      message: 'No links to check',
      data: { checked: 0 },
    });
  }

  const results = await checkLinksBatch(links, c.env, frequencyMs);

  return c.json({
    success: true,
    message: `Checked ${results.length} links`,
    data: {
      checked: results.length,
      results: results.slice(0, 50), // Return first 50 results
    },
  });
});

export { linksRouter };


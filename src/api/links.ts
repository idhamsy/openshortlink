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
  getCityRedirects,
  getOsRedirects,
  upsertGeoRedirect,
  upsertDeviceRedirect,
  upsertCityRedirect,
  upsertOsRedirect,
  clearAllGeoRedirects,
  clearAllDeviceRedirects,
  clearAllCityRedirects,
  clearAllOsRedirects,
  getLinksGeoRedirectsBatch,
  getLinksDeviceRedirectsBatch,
  getLinksCityRedirectsBatch,
  getLinksOsRedirectsBatch,
  saveLinkRedirects,
  type RedirectData,
} from '../db/linkRedirects';
import { buildCachedLink } from '../services/linkService';
import { generateId, generateSlug } from '../utils/id';
import { isValidUrl, isValidSlug, normalizeUrl, sanitizeHtml, sanitizeSearchInput, validateNumericBoundary, isReservedSlug } from '../utils/validation';
import { detectCountryCode, getCountryName } from '../utils/countryMappings';
import { authMiddleware, authOrApiKeyMiddleware } from '../middleware/auth';
import { validateJson } from '../middleware/validate';
import { deleteCachedLink, setCachedLink } from '../services/cache';
import { requireLinkAccess, requirePermission } from '../middleware/authorization';
import { canAccessDomain } from '../utils/permissions';
import { isInfiniteRedirect } from '../utils/domains';
import { getEffectiveLinkRoute } from '../utils/route';
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
      promises.push(getLinksCityRedirectsBatch(c.env, linkIds));
      promises.push(getLinksOsRedirectsBatch(c.env, linkIds));
    }

    const results = await Promise.all(promises);
    const tagsMap = results[0];
    const categoriesMap = results[1];

    // Extract maps if they exist (based on whether we requested them)
    const geoRedirectsMap = includeRedirects ? results[2] : new Map();
    const deviceRedirectsMap = includeRedirects ? results[3] : new Map();
    const cityRedirectsMap = includeRedirects ? results[4] : new Map();
    const osRedirectsMap = includeRedirects ? results[5] : new Map();

    // Map results
    const linksWithTags = links.map(link => ({
      ...link,
      tags: tagsMap.get(link.id) || [],
      category: categoriesMap.get(link.id),
      geo_redirects: geoRedirectsMap.get(link.id) || [],
      device_redirects: deviceRedirectsMap.get(link.id) || [],
      city_redirects: cityRedirectsMap.get(link.id) || [],
      os_redirects: osRedirectsMap.get(link.id) || [],
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
  const [geoRedirects, deviceRedirects, cityRedirects, osRedirects] = await Promise.all([
    getGeoRedirects(c.env, id),
    getDeviceRedirects(c.env, id),
    getCityRedirects(c.env, id),
    getOsRedirects(c.env, id)
  ]);

  return c.json({
    success: true,
    data: {
      ...linkWithTags,
      geo_redirects: geoRedirects,
      device_redirects: deviceRedirects,
      city_redirects: cityRedirects,
      os_redirects: osRedirects,
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

  // Validate route if explicitly provided
  if (validated.route) {
    if (!domain.routes || !domain.routes.includes(validated.route)) {
      throw new HTTPException(400, { message: 'Invalid route for this domain' });
    }
  }

  // Resolve the effective route: an explicit route wins, otherwise default to the
  // domain's primary route so the link is always reachable and displays correctly.
  const effectiveRoute = getEffectiveLinkRoute(domain, validated.route);

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
  if (validated.metadata || effectiveRoute) {
    const metadataObj = validated.metadata ? { ...validated.metadata } : {};
    if (effectiveRoute) {
      metadataObj.route = effectiveRoute;
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

  // Save all redirects
  await saveLinkRedirects(c.env, link.id, {
    geo_redirects: validated.geo_redirects,
    device_redirects: validated.device_redirects,
    city_redirects: validated.city_redirects,
    os_redirects: validated.os_redirects,
  });

  // Build and set cache
  const cachedLink = await buildCachedLink(c.env, link, domain);
  await setCachedLink(c.env, domain.domain_name, link.slug, cachedLink);

  // Fetch fresh data for response
  const [geoRedirects, deviceRedirects, cityRedirects, osRedirects] = await Promise.all([
    getGeoRedirects(c.env, link.id),
    getDeviceRedirects(c.env, link.id),
    getCityRedirects(c.env, link.id),
    getOsRedirects(c.env, link.id),
  ]);

  // Get link with tags
  const tags = await getLinkTags(c.env, link.id);
  const linkWithTags = {
    ...link,
    tags,
    geo_redirects: geoRedirects,
    device_redirects: deviceRedirects,
    city_redirects: cityRedirects,
    os_redirects: osRedirects,
  };

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
    await saveLinkRedirects(c.env, id, { geo_redirects: validated.geo_redirects });
  }

  // Update device redirects if provided
  if (validated.device_redirects !== undefined) {
    await clearAllDeviceRedirects(c.env, id);
    await saveLinkRedirects(c.env, id, { device_redirects: validated.device_redirects });
  }

  // Update city redirects if provided
  if (validated.city_redirects !== undefined) {
    await clearAllCityRedirects(c.env, id);
    await saveLinkRedirects(c.env, id, { city_redirects: validated.city_redirects });
  }

  // Update os redirects if provided
  if (validated.os_redirects !== undefined) {
    await clearAllOsRedirects(c.env, id);
    await saveLinkRedirects(c.env, id, { os_redirects: validated.os_redirects });
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

  // Rebuild cache with updated data
  const domain = await getDomainById(c.env, existingLink.domain_id);
  if (domain) {
    const cachedLink = await buildCachedLink(c.env, updatedLink, domain);
    await setCachedLink(c.env, domain.domain_name, existingLink.slug, cachedLink);
  }

  // Fetch fresh data for response
  const [geoRedirects, deviceRedirects, cityRedirects, osRedirects] = await Promise.all([
    getGeoRedirects(c.env, id),
    getDeviceRedirects(c.env, id),
    getCityRedirects(c.env, id),
    getOsRedirects(c.env, id),
  ]);

  const linkWithTags = {
    ...updatedLink,
    tags,
    category,
    geo_redirects: geoRedirects,
    device_redirects: deviceRedirects,
    city_redirects: cityRedirects,
    os_redirects: osRedirects,
  };

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
    // Extract tags, category_id, route, metadata, geo_redirects, device_redirects, city_redirects, and os_redirects (they're handled separately)
    const { tags, category_id, route, metadata: metadataObj, geo_redirects, device_redirects, city_redirects, os_redirects, ...linkUpdates } = validated;

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

        // Handle redirects if provided
        const redirectsToSave: RedirectData = {};

        if (geo_redirects !== undefined) {
          await clearAllGeoRedirects(c.env, id);
          redirectsToSave.geo_redirects = geo_redirects;
        }

        if (device_redirects !== undefined) {
          await clearAllDeviceRedirects(c.env, id);
          redirectsToSave.device_redirects = device_redirects;
        }

        if (city_redirects !== undefined) {
          await clearAllCityRedirects(c.env, id);
          redirectsToSave.city_redirects = city_redirects;
        }

        if (os_redirects !== undefined) {
          await clearAllOsRedirects(c.env, id);
          redirectsToSave.os_redirects = os_redirects;
        }

        await saveLinkRedirects(c.env, id, redirectsToSave);

        // Rebuild cache with updated data
        const domain = await getDomainById(c.env, link.domain_id);
        if (domain) {
          // Get updated link data
          const updatedLink = await getLinkById(c.env, id);
          if (updatedLink) {
            const cachedLink = await buildCachedLink(c.env, updatedLink, domain);
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


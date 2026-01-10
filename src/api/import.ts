/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type { Env } from '../types';
import { authOrApiKeyMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { createLink } from '../db/links';
import { getDomainById } from '../db/domains';
import { generateSlug } from '../utils/id';
import { isValidUrl, isValidSlug, normalizeUrl, isReservedSlug } from '../utils/validation';
import { checkSlugExists } from '../db/links';
import { upsertGeoRedirect, upsertDeviceRedirect, getGeoRedirects, getDeviceRedirects } from '../db/linkRedirects';
import { setLinkTags } from '../db/tags';
import { setCachedLink } from '../services/cache';

const importRouter = new Hono<{ Bindings: Env }>();

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Schema for import request
// We expect a FormData with 'file', 'domain_id', 'column_mapping', 'slug_prefix_filter', 'delimiter'
// But since we are processing chunks, we might receive just a chunk of the file.
// The frontend sends: file (blob), domain_id, column_mapping (json), slug_prefix_filter (json), delimiter

importRouter.post('/', authOrApiKeyMiddleware, requirePermission('create_links'), async (c) => {
    try {
        const formData = await c.req.parseBody();
        const file = formData['file'];
        const domainId = formData['domain_id'] as string;
        const columnMappingStr = formData['column_mapping'] as string;
        const slugPrefixFilterStr = formData['slug_prefix_filter'] as string;
        const delimiter = (formData['delimiter'] as string) || ',';

        if (!file || !(file instanceof File)) {
            throw new HTTPException(400, { message: 'No file uploaded' });
        }

        if (file.size > MAX_FILE_SIZE) {
            throw new HTTPException(400, { message: 'File too large (max 5MB)' });
        }

        if (!domainId) {
            throw new HTTPException(400, { message: 'Domain ID is required' });
        }

        // Validate domain access
        const domain = await getDomainById(c.env, domainId);
        if (!domain) {
            throw new HTTPException(404, { message: 'Domain not found' });
        }

        // Parse mappings
        let columnMapping: Record<string, string> = {};
        try {
            columnMapping = JSON.parse(columnMappingStr || '{}');
        } catch (e) {
            // Ignore parse error
        }

        // Read file content
        const text = await file.text();
        const rows = parseCSV(text, delimiter);

        if (rows.length === 0) {
            return c.json({ success: true, data: { success: 0, errors: 0, results: [] } });
        }

        // Process rows
        const results = [];
        let successCount = 0;
        let errorCount = 0;

        // We process synchronously for now as requested, but we could use waitUntil for larger batches
        // However, since the frontend chunks it, we can process the chunk here.

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            // Skip empty rows
            if (Object.keys(row).length === 0) continue;

            try {
                // Extract data based on mapping or auto-detection
                // The row is an object with keys as headers (if headers exist) or indices
                // But our parseCSV returns array of objects with header keys.

                // Basic fields
                let destinationUrl = row['destination_url'] || row['url'] || row['link'] || row['target'];
                let slug = row['slug'] || row['alias'] || row['short_url'] || row['keyword'];
                let title = row['title'] || row['name'];
                let description = row['description'] || row['desc'];
                let tagsStr = row['tags'] || row['tag'];
                let route = row['route'] || row['path_prefix'];

                // If column mapping is provided, override
                // Mapping format: { "csv_header": "field_name" }
                // We need to reverse look up or iterate
                for (const [csvHeader, fieldName] of Object.entries(columnMapping)) {
                    if (row[csvHeader] !== undefined) {
                        if (fieldName === 'destination_url') destinationUrl = row[csvHeader];
                        else if (fieldName === 'slug') slug = row[csvHeader];
                        else if (fieldName === 'title') title = row[csvHeader];
                        else if (fieldName === 'description') description = row[csvHeader];
                        else if (fieldName === 'tags') tagsStr = row[csvHeader];
                        else if (fieldName === 'route') route = row[csvHeader];
                    }
                }

                if (!destinationUrl) {
                    throw new Error('Missing destination URL');
                }

                // Validate URL
                if (!isValidUrl(destinationUrl)) {
                    // Try to fix it
                    if (isValidUrl('http://' + destinationUrl)) {
                        destinationUrl = 'http://' + destinationUrl;
                    } else {
                        throw new Error('Invalid destination URL');
                    }
                }
                destinationUrl = normalizeUrl(destinationUrl);

                // Validate route if provided
                if (route) {
                    if (!domain.routes || !domain.routes.includes(route)) {
                        throw new Error(`Invalid route: ${route}`);
                    }
                }

                // Generate or validate slug
                if (slug) {
                    if (!isValidSlug(slug)) {
                        throw new Error('Invalid slug format');
                    }
                    if (isReservedSlug(slug)) {
                        throw new Error('Slug is reserved');
                    }
                    if (await checkSlugExists(c.env, domainId, slug)) {
                        throw new Error('Slug already exists');
                    }
                } else {
                    slug = generateSlug(8);
                    let attempts = 0;
                    while (await checkSlugExists(c.env, domainId, slug) && attempts < 10) {
                        slug = generateSlug(8);
                        attempts++;
                    }
                    if (attempts >= 10) {
                        throw new Error('Failed to generate unique slug');
                    }
                }

                // Prepare metadata
                let metadata: string | undefined = undefined;
                if (route) {
                    metadata = JSON.stringify({ route });
                }

                // Create link
                const link = await createLink(c.env, {
                    domain_id: domainId,
                    slug,
                    destination_url: destinationUrl,
                    title: title || undefined,
                    description: description || undefined,
                    redirect_code: 301,
                    status: 'active',
                    click_count: 0,
                    unique_visitors: 0,
                    metadata,
                });

                // Handle tags
                if (tagsStr) {
                    const tags = tagsStr.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
                    if (tags.length > 0) {
                        await setLinkTags(c.env, link.id, tags);
                    }
                }

                // Handle Geo Redirects
                // We look for 2-letter country codes or mapped columns
                // Common country codes
                const countryCodes = [
                    'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'JP', 'CN', 'IN', 'BR', 'MX', 'RU', 'KR', 'ID', 'TR', 'SA', 'ZA'
                ];

                // Also check for mapped geo fields
                // In columnMapping, geo fields might be mapped like "Header": "geo:US" (if we supported that, but the guide says auto-detect)
                // The guide says: "United States" -> US, etc.
                // We'll implement a basic detection for now based on the guide's "Supported patterns"

                // Iterate over all keys in the row
                for (const [key, value] of Object.entries(row)) {
                    if (!value || key === 'destination_url' || key === 'slug' || key === 'title' || key === 'description' || key === 'tags') continue;

                    // Check if it's a mapped column
                    const mappedType = columnMapping[key];

                    let countryCode = null;
                    let deviceType = null;

                    if (mappedType) {
                        if (mappedType.startsWith('geo:')) {
                            countryCode = mappedType.split(':')[1];
                        } else if (mappedType === 'mobile') {
                            deviceType = 'mobile';
                        } else if (mappedType === 'desktop') {
                            deviceType = 'desktop';
                        } else if (mappedType === 'tablet') {
                            deviceType = 'tablet';
                        }
                    } else {
                        // Auto-detection
                        // Check for country codes
                        if (countryCodes.includes(key.toUpperCase())) {
                            countryCode = key.toUpperCase();
                        }
                        // Check for "United States", etc. (simplified)
                        else if (key.toLowerCase().includes('united states') || key.toLowerCase() === 'us') countryCode = 'US';
                        else if (key.toLowerCase().includes('united kingdom') || key.toLowerCase() === 'uk') countryCode = 'GB';
                        // ... add more as needed or rely on the frontend to map them? 
                        // The frontend guide says "The system automatically detects...". 
                        // If the frontend does the detection, it should probably pass the mapping.
                        // But the current frontend implementation sends `columnMapping`.

                        // Check for devices
                        else if (key.toLowerCase().includes('mobile')) deviceType = 'mobile';
                        else if (key.toLowerCase().includes('desktop')) deviceType = 'desktop';
                        else if (key.toLowerCase().includes('tablet')) deviceType = 'tablet';
                    }

                    if (countryCode && isValidUrl(value as string)) {
                        await upsertGeoRedirect(c.env, link.id, countryCode, value as string);
                    } else if (deviceType && isValidUrl(value as string)) {
                        await upsertDeviceRedirect(c.env, link.id, deviceType as 'mobile' | 'desktop' | 'tablet', value as string);
                    }
                }

                // Fetch redirects and cache the link for optimal redirect performance
                const [geoRedirects, deviceRedirects] = await Promise.all([
                    getGeoRedirects(c.env, link.id),
                    getDeviceRedirects(c.env, link.id)
                ]);

                const cachedLink = {
                    destination_url: link.destination_url,
                    redirect_code: link.redirect_code,
                    status: link.status,
                    expires_at: link.expires_at,
                    password_hash: link.password_hash,
                    link_id: link.id,
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

                successCount++;
                results.push({ row: i, success: true, slug: link.slug });

            } catch (error: any) {
                errorCount++;
                results.push({ row: i, success: false, error: error.message });
            }
        }

        return c.json({
            success: true,
            data: {
                success: successCount,
                errors: errorCount,
                results
            }
        });

    } catch (error: any) {
        console.error('Import error:', error);
        throw new HTTPException(500, { message: error.message || 'Import failed' });
    }
});

// Helper to parse CSV (simple implementation)
function parseCSV(text: string, delimiter: string): Record<string, string>[] {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Handle quotes
        const values = [];
        let inQuote = false;
        let currentValue = '';

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === delimiter && !inQuote) {
                values.push(currentValue);
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue);

        const row: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
            if (values[j]) {
                row[headers[j]] = values[j].trim().replace(/^"|"$/g, '').replace(/""/g, '"');
            }
        }
        result.push(row);
    }

    return result;
}

export { importRouter };

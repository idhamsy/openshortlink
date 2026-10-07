/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type { Env, User, ApiKeyContext } from '../types';
import { authOrApiKeyMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { createLink, deleteLink } from '../db/links';
import { getDomainById } from '../db/domains';
import { generateSlug } from '../utils/id';
import { isValidUrl, isValidSlug, normalizeUrl, isReservedSlug } from '../utils/validation';
import { isInfiniteRedirect } from '../utils/domains';
import { checkSlugExists } from '../db/links';
import { upsertGeoRedirect, upsertDeviceRedirect, upsertCityRedirect, upsertOsRedirect } from '../db/linkRedirects';
import { setLinkTags, listTags, createTag, getTagById } from '../db/tags';
import { listCategories, createCategory, getCategoryById } from '../db/categories';
import { setCachedLink } from '../services/cache';
import { getEffectiveLinkRoute } from '../utils/route';
import { canAccessDomain } from '../utils/permissions';

const importRouter = new Hono<{ Bindings: Env }>();

/** Session users need domain access; API keys with domain_ids must include the domain. */
export async function canImportToDomain(
    env: Env,
    actor: { user?: User; apiKey?: ApiKeyContext },
    domainId: string
): Promise<boolean> {
    if (actor.apiKey && actor.apiKey.domain_ids && actor.apiKey.domain_ids.length > 0) {
        if (!actor.apiKey.domain_ids.includes(domainId)) return false;
    }
    if (actor.user) {
        return canAccessDomain(env, actor.user, domainId);
    }
    return true;
}

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Schema for import request
// We expect a FormData with 'file', 'domain_id', 'column_mapping', 'delimiter'.
// Since the frontend chunks the file, we might receive just a chunk of the file.
// The frontend sends: file (blob), domain_id, column_mapping (json), delimiter

importRouter.post('/', authOrApiKeyMiddleware, requirePermission('create_links'), async (c) => {
    try {
        const formData = await c.req.parseBody();
        const file = formData['file'];
        const domainId = formData['domain_id'] as string;
        const columnMappingStr = formData['column_mapping'] as string;
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
        // Enforce domain access (mirrors POST /links): without this any user/API key with
        // create_links could import into — and overwrite cache entries of — any domain.
        const user = (c as any).get?.('user') as User | undefined;
        const apiKey = (c as any).get?.('apiKey') as ApiKeyContext | undefined;
        if (!(await canImportToDomain(c.env, { user, apiKey }, domainId))) {
            throw new HTTPException(403, { message: apiKey?.domain_ids?.length && !apiKey.domain_ids.includes(domainId)
                ? 'Domain not on scope'
                : 'Access denied. You do not have access to this domain.' });
        }
        // Refuse import into an inactive domain — its links would be unreachable
        // (mirrors POST /links).
        if (domain.status !== 'active') {
            throw new HTTPException(400, { message: 'Cannot import links for inactive domain. Please activate the domain first.' });
        }

        // Parse mappings
        let columnMapping: Record<string, string> = {};
        try {
            columnMapping = JSON.parse(columnMappingStr || '{}');
            // parseCSV lower-cases header names, so the mapping KEYS (which the
            // frontend builds from the raw, original-case headers) must be
            // lower-cased to match. Values (e.g. "city_redirect:London") keep case.
            columnMapping = Object.fromEntries(
                Object.entries(columnMapping).map(([k, v]) => [k.trim().toLowerCase(), v])
            );
        } catch (e) {
            // Ignore parse error
        }

        // Read file content
        const text = await file.text();
        const rows = parseCSV(text, delimiter);

        if (rows.length === 0) {
            return c.json({ success: true, data: { success: 0, errors: 0, results: [] } });
        }

        // #14: resolve a CSV "Tags" column of human-friendly NAMES (or existing IDs)
        // into tag IDs, creating missing domain-scoped tags. Built once and reused
        // across rows so a name typed in several rows maps to a single tag.
        const tagNameToId = new Map<string, string>();
        const knownTagIds = new Set<string>();
        for (const t of await listTags(c.env, { domainId })) {
            if (t.name) tagNameToId.set(t.name.toLowerCase(), t.id);
            knownTagIds.add(t.id);
        }
        const MAX_NAME = 50; // matches createTagSchema / createCategorySchema
        const resolveTagIds = async (values: string[]): Promise<string[]> => {
            const ids: string[] = [];
            for (const value of values) {
                // Accept an existing tag ID as-is (backward compatible with ID-based CSVs)...
                if (knownTagIds.has(value)) {
                    ids.push(value);
                    continue;
                }
                // ...including a global/cross-domain tag ID we didn't preload (verify it exists,
                // so an ID-based CSV doesn't get turned into a literal "tag_..." name).
                if (value.startsWith('tag_') && await getTagById(c.env, value)) {
                    knownTagIds.add(value);
                    ids.push(value);
                    continue;
                }
                // ...otherwise treat it as a name: validate, then reuse if present, else create.
                if (value.length > MAX_NAME) {
                    throw new Error(`Tag name too long (max ${MAX_NAME}): ${value}`);
                }
                const key = value.toLowerCase();
                let id = tagNameToId.get(key);
                if (!id) {
                    const created = await createTag(c.env, { name: value, domain_id: domainId });
                    id = created.id;
                    tagNameToId.set(key, id);
                    knownTagIds.add(id);
                }
                ids.push(id);
            }
            // Dedupe so setLinkTags never inserts the same (link_id, tag_id) twice
            // (e.g. "news, News" or an existing ID plus its name).
            return [...new Set(ids)];
        };

        // #14: resolve a Category column of a NAME (or existing ID) into a category ID —
        // reuse an existing category by name, else create it — so a CSV exported by this
        // dashboard (Category column holds the name) round-trips instead of failing.
        const catNameToId = new Map<string, string>();
        const knownCatIds = new Set<string>();
        for (const cat of await listCategories(c.env, { domainId })) {
            if (cat.name) catNameToId.set(cat.name.toLowerCase(), cat.id);
            knownCatIds.add(cat.id);
        }
        const resolveCategoryId = async (value: string): Promise<string> => {
            if (knownCatIds.has(value)) return value;
            // A global/cross-domain category ID we didn't preload: accept if it exists.
            if (value.startsWith('cat_') && await getCategoryById(c.env, value)) {
                knownCatIds.add(value);
                return value;
            }
            if (value.length > MAX_NAME) {
                throw new Error(`Category name too long (max ${MAX_NAME}): ${value}`);
            }
            const key = value.toLowerCase();
            let id = catNameToId.get(key);
            if (!id) {
                const created = await createCategory(c.env, { name: value, domain_id: domainId });
                id = created.id;
                catNameToId.set(key, id);
                knownCatIds.add(id);
            }
            return id;
        };

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

            // Tracks a link created in this row so we can roll it back if a later
            // step (tags/redirects/cache) fails — keeps each row all-or-nothing.
            let createdLinkId: string | null = null;
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
                let categoryId = row['category_id'] || row['category'];
                let redirectCodeStr = row['redirect_code'];

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
                        else if (fieldName === 'category_id') categoryId = row[csvHeader];
                        else if (fieldName === 'redirect_code') redirectCodeStr = row[csvHeader];
                    }
                }

                // Validate redirect code if provided (else default to 301). Without this,
                // a mapped "Redirect Code" column would be silently ignored.
                let redirectCode = 301;
                if (redirectCodeStr !== undefined && String(redirectCodeStr).trim() !== '') {
                    const parsed = parseInt(String(redirectCodeStr).trim(), 10);
                    if (![301, 302, 307, 308].includes(parsed)) {
                        throw new Error(`Invalid redirect code: ${redirectCodeStr} (allowed: 301, 302, 307, 308)`);
                    }
                    redirectCode = parsed;
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

                // Reject self-referential / loop destinations (mirrors POST /links).
                if (await isInfiniteRedirect(c.env, destinationUrl)) {
                    throw new Error('Destination URL cannot point to a reserved route on a managed domain (infinite redirect loop).');
                }

                // Validate route if explicitly provided, then default to the domain's
                // primary route so imported links are reachable and display correctly.
                if (route) {
                    if (!domain.routes || !domain.routes.includes(route)) {
                        throw new Error(`Invalid route: ${route}`);
                    }
                }
                const effectiveRoute = getEffectiveLinkRoute(domain, route);

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

                // Resolve category AFTER all pre-insert validation (slug etc.) so a row that
                // fails validation never creates a stray category. Stored in its own column.
                let validCategoryId: string | undefined = undefined;
                if (categoryId) {
                    validCategoryId = await resolveCategoryId(categoryId);
                }

                // Prepare metadata (route stored here; category goes in its own column)
                let metadata: string | undefined = undefined;
                if (effectiveRoute) {
                    metadata = JSON.stringify({ route: effectiveRoute });
                }

                // Create link
                const link = await createLink(c.env, {
                    domain_id: domainId,
                    slug,
                    destination_url: destinationUrl,
                    title: title || undefined,
                    description: description || undefined,
                    redirect_code: redirectCode,
                    status: 'active',
                    click_count: 0,
                    unique_visitors: 0,
                    category_id: validCategoryId,
                    metadata,
                });
                createdLinkId = link.id;

                // Handle tags — resolve names (or existing IDs) to tag IDs (#14)
                if (tagsStr) {
                    const tagValues = tagsStr.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
                    if (tagValues.length > 0) {
                        const tagIds = await resolveTagIds(tagValues);
                        await setLinkTags(c.env, link.id, tagIds);
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

                // Accumulate the redirect rules we upsert this row so the cache object can
                // be built directly from them — avoiding a re-SELECT of all 4 redirect tables
                // per row (P5). Mirrors the stored casing (geo upper-cased, city lower-cased).
                const geoRules: Record<string, string> = {};
                const deviceRules: { desktop?: string; mobile?: string; tablet?: string } = {};
                const cityRules: { city_name: string; destination_url: string }[] = [];
                const osRules: { android?: string; ios?: string } = {};

                // Iterate over all keys in the row
                for (const [key, value] of Object.entries(row)) {
                    if (!value || key === 'destination_url' || key === 'slug' || key === 'title' || key === 'description' || key === 'tags') continue;

                    // Check if it's a mapped column
                    const mappedType = columnMapping[key];

                    let countryCode = null;
                    let deviceType = null;
                    let cityName: string | null = null;
                    let osType: string | null = null;

                    if (mappedType) {
                        if (mappedType.startsWith('geo:')) {
                            countryCode = mappedType.split(':')[1];
                        } else if (mappedType.startsWith('city:') || mappedType.startsWith('city_redirect:')) {
                            cityName = mappedType.substring(mappedType.indexOf(':') + 1);
                        } else if (mappedType.startsWith('os:') || mappedType.startsWith('os_redirect:')) {
                            osType = mappedType.substring(mappedType.indexOf(':') + 1).toLowerCase();
                        } else if (mappedType.startsWith('device_redirect:')) {
                            deviceType = mappedType.substring('device_redirect:'.length);
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
                        geoRules[countryCode.toUpperCase()] = value as string;
                    } else if ((deviceType === 'mobile' || deviceType === 'desktop' || deviceType === 'tablet') && isValidUrl(value as string)) {
                        await upsertDeviceRedirect(c.env, link.id, deviceType, value as string);
                        deviceRules[deviceType] = value as string;
                    } else if (cityName && isValidUrl(value as string)) {
                        await upsertCityRedirect(c.env, link.id, cityName, value as string);
                        cityRules.push({ city_name: cityName.toLowerCase(), destination_url: value as string });
                    } else if ((osType === 'android' || osType === 'ios') && isValidUrl(value as string)) {
                        await upsertOsRedirect(c.env, link.id, osType, value as string);
                        osRules[osType] = value as string;
                    }
                }

                // Build the cache object directly from the rules just upserted (P5) — no
                // re-SELECT of the redirect tables. Empty groups collapse to undefined.
                const hasGeo = Object.keys(geoRules).length > 0;
                const hasDevice = Object.keys(deviceRules).length > 0;
                const hasCity = cityRules.length > 0;
                const hasOs = Object.keys(osRules).length > 0;

                const cachedLink = {
                    destination_url: link.destination_url,
                    redirect_code: link.redirect_code,
                    status: link.status,
                    expires_at: link.expires_at,
                    password_hash: link.password_hash,
                    link_id: link.id,
                    geo_redirects: hasGeo ? geoRules : undefined,
                    device_redirects: hasDevice ? deviceRules : undefined,
                    city_redirects: hasCity ? cityRules : undefined,
                    os_redirects: hasOs ? osRules : undefined,
                    route: link.metadata ? (() => {
                        try { return JSON.parse(link.metadata).route; } catch { return undefined; }
                    })() : undefined,
                    domain_routing_path: domain.routing_path,
                };

                await setCachedLink(c.env, domain.domain_name, link.slug, cachedLink);

                successCount++;
                results.push({ row: i, success: true, slug: link.slug });

            } catch (error: any) {
                // Roll back a partially-created row: if the link was inserted but a
                // later step failed, hard-delete it (FK ON DELETE CASCADE removes its
                // tags/redirects) so a failed row leaves nothing behind.
                if (createdLinkId) {
                    try {
                        await deleteLink(c.env, createdLinkId, true);
                    } catch (cleanupErr) {
                        console.error(`Import row ${i}: cleanup of link ${createdLinkId} failed:`, cleanupErr);
                    }
                }
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
        // Preserve intended client errors (e.g. 400 "Domain ID is required", 404
        // "Domain not found") instead of masking every failure as a 500.
        if (error instanceof HTTPException) {
            throw error;
        }
        console.error('Import error:', error);
        throw new HTTPException(500, { message: error.message || 'Import failed' });
    }
});

// Parse CSV into an array of row objects keyed by (lower-cased) header name.
//
// A proper state machine over the WHOLE text, so it correctly handles:
//   - quoted fields containing the delimiter and/or newlines,
//   - doubled quotes ("") inside a quoted field un-escaped to a single ",
//   - CRLF / LF / lone-CR line endings.
// Header names are lower-cased so the auto-detect lookups (row['url'], row['slug'], …)
// work regardless of the CSV's header casing (URL,Slug,Title).
//
// NOTE: the `if (value)` guard below intentionally keeps a "0" cell (a truthy string);
// only genuinely empty cells are dropped.
function parseCSV(text: string, delimiter: string): Record<string, string>[] {
    const records: string[][] = [];
    let record: string[] = [];
    let field = '';
    let inQuotes = false;
    const len = text.length;

    const endField = () => {
        record.push(field);
        field = '';
    };
    const endRecord = () => {
        endField();
        records.push(record);
        record = [];
    };

    for (let i = 0; i < len; i++) {
        const char = text[i];

        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    // Escaped quote: consume both, emit one literal quote.
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            inQuotes = true;
        } else if (char === delimiter) {
            endField();
        } else if (char === '\r') {
            endRecord();
            if (text[i + 1] === '\n') i++; // swallow the LF of a CRLF pair
        } else if (char === '\n') {
            endRecord();
        } else {
            field += char;
        }
    }

    // Flush the trailing field/record when the text doesn't end with a newline.
    if (field.length > 0 || record.length > 0) {
        endRecord();
    }

    if (records.length === 0) return [];

    const headers = records[0].map(h => h.trim().toLowerCase());
    const result: Record<string, string>[] = [];

    for (let r = 1; r < records.length; r++) {
        const values = records[r];
        // Skip a blank line (parses to a single empty field).
        if (values.length === 1 && values[0].trim() === '') continue;

        const row: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
            const value = values[j];
            if (value) {
                row[headers[j]] = value.trim();
            }
        }
        result.push(row);
    }

    return result;
}

export { parseCSV };

export { importRouter };

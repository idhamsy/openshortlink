/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env, User, ApiKeyContext } from '../types';
import { authOrApiKeyMiddleware } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';
import { getDomainById } from '../db/domains';
import { importRows, canImportToDomain, type OnExisting } from '../services/importRows';

const importRouter = new Hono<{ Bindings: Env }>();

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
        const onExistingRaw = ((formData['on_existing'] as string) || 'skip').trim();
        if (!['skip', 'error', 'update'].includes(onExistingRaw)) {
            throw new HTTPException(400, { message: 'Invalid on_existing (allowed: skip, error, update)' });
        }
        const onExisting = onExistingRaw as OnExisting;

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
        // Refuse import into an inactive domain — its links would be unreachable
        // (mirrors POST /links).
        if (domain.status !== 'active') {
            throw new HTTPException(400, { message: 'Cannot import links for inactive domain. Please activate the domain first.' });
        }

        // Domain access (security): session users need access to this domain; API keys
        // scoped to specific domains must include it.
        const user0 = (c as any).get?.('user') as User | undefined;
        const apiKey0 = (c as any).get?.('apiKey') as ApiKeyContext | undefined;
        if (!(await canImportToDomain(c.env, { user: user0, apiKey: apiKey0 }, domainId))) {
            throw new HTTPException(403, { message: apiKey0?.domain_ids?.length && !apiKey0.domain_ids.includes(domainId)
                ? 'Domain not on scope'
                : 'Access denied. You do not have access to this domain.' });
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
            return c.json({ success: true, data: { success: 0, created: 0, updated: 0, skipped: 0, errors: 0, results: [] } });
        }

        const user = (c as any).get?.('user') as User | undefined;
        const apiKey = (c as any).get?.('apiKey') as ApiKeyContext | undefined;
        const actor = { user, apiKey };

        const summary = await importRows(c.env, { domain, actor, onExisting, columnMapping }, rows);

        return c.json({
            success: true,
            data: {
                success: summary.created + summary.updated + summary.skipped,
                created: summary.created,
                updated: summary.updated,
                skipped: summary.skipped,
                errors: summary.errors,
                results: summary.results
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

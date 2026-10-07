/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import type { Env, Domain } from '../types';
import { getDomainByName } from '../db/domains';

/**
 * Check if a destination URL would cause an infinite redirect loop
 * by pointing to a reserved route on a managed domain.
 */
export async function isInfiniteRedirect(
    env: Env,
    destinationUrl: string,
    memo?: Map<string, Domain | null>
): Promise<boolean> {
    try {
        const url = new URL(destinationUrl);
        const hostname = url.hostname;

        // Check if hostname matches a managed domain
        // Optional per-request memo (by hostname) so bulk callers pay one lookup per host.
        let domain: Domain | null | undefined = memo?.get(hostname);
        if (domain === undefined) {
            domain = await getDomainByName(env, hostname);
            memo?.set(hostname, domain ?? null);
        }
        if (!domain) {
            return false;
        }

        // Check if path matches any reserved routes
        // Default to ['/go/*'] if no routes defined (backward compatibility)
        const routes = domain.routes && domain.routes.length > 0 ? domain.routes : ['/go/*'];

        for (const route of routes) {
            // Handle wildcard routes (e.g., "/go/*")
            if (route.endsWith('*')) {
                const prefix = route.slice(0, -1); // Remove trailing '*'
                if (url.pathname.startsWith(prefix)) {
                    return true;
                }
            } else {
                // Exact match
                if (url.pathname === route) {
                    return true;
                }
            }
        }

        return false;
    } catch (e) {
        // If URL parsing fails, it's not a valid URL, so not an infinite redirect in our context
        // (Validation elsewhere will catch invalid URLs)
        return false;
    }
}

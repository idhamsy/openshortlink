/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

declare module "*.css" {
    const content: string;
    export default content;
}

/**
 * Runtime environment bindings (wrangler vars/secrets) reference.
 *
 * ALLOWED_ORIGINS — comma-separated allowlist of browser Origins permitted for
 * CORS (e.g. "https://app.example.com,https://admin.example.com"). When unset,
 * CORS falls back to the previous permissive ('*') behavior. Read in src/index.ts.
 *
 * NOTE: the canonical typed declaration belongs on the `Env` interface in
 * src/types/index.ts. A relative `declare module "./types"` augmentation from
 * this ambient .d.ts resolves the whole module to `any` instead of merging, so
 * ALLOWED_ORIGINS is instead read with a local type assertion at its use site.
 * If src/types/index.ts is editable, add `ALLOWED_ORIGINS?: string;` there and
 * drop the assertion.
 */

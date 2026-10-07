/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Cache-buster for /dashboard/static/* (served with `immutable`, cached for a year).
// Bump this whenever styles/*.ts or utils/*.ts served by src/api/static.ts change,
// otherwise browsers keep the old CSS/JS. v5: .stat-skipped (import summary); v4: .btn-danger + checkbox-label flex (#6, #7).
export const ASSET_VERSION = 'v5';

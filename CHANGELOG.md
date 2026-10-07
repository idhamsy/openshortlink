# Changelog

All notable changes to this project will be documented in this file.

---

## [0.11.0] - 2026-10-07

### ⚠️ Behaviour changes to check before upgrading
- **CSV import: an existing slug is now skipped by default, not reported as an error.** New `on_existing` field: `skip` (default) / `error` / `update`. In `skip` mode the row is left untouched and counted as `skipped` with `success: true`. **Scripts that detected duplicates through `errors > 0` or a row's `success: false` must send `on_existing=error`** to keep the old behaviour. Nothing is ever overwritten unless you send `on_existing=update`.
- **CSV import summary:** `data.success` now counts `created + updated + skipped` (it used to count created links only). Use the new `created`, `updated` and `skipped` counts; each result row carries `action` (`created` / `updated` / `skipped` / `error`).
- **Bulk (`POST /links/bulk`):** at most 100 entries per request (both formats); an unknown or missing `action`, empty `updates`, or `updates` with only unrecognised fields now return 400.

### Added
- **Retargeting pixel library**: per-domain pixel library managed on a new Pixels page (`/pixels` API), a pixel picker on links (`pixel_ids`), default pixels per domain (applied on link create and CSV import when `pixel_ids` is not sent), and a redirect interstitial that fires the pixels (served with a nonce-based CSP). Links without pixels redirect exactly as before. Link responses include `pixels`.
- **CSV import `on_existing`** (see above). In `update` mode blank cells leave the existing value unchanged and tags in a non-blank cell replace the link's tags. Each row is written atomically.
- **Bulk `items` format**: `POST /links/bulk` accepts an `items` array where each item targets a link by `id` or by `domain_id` + `slug`, with per-item `updates`. Delete by slug is supported. The new format returns `{index, id, slug, success, error?}` per item; the legacy `link_ids` format is unchanged apart from the limits above.

### Fixed
- Editing a link (`PUT /links/:id` or bulk update) no longer resets its `redirect_code` to 301 when `redirect_code` is not sent. Links already reset by earlier versions keep 301.
- MFA sign-in and `/auth/refresh` now set both the `session_token` and `refresh_token` cookies (only the last one was kept), and logout clears both. The dashboard was unaffected (it sends its token as a header).
- Importing a slug that belongs to a deleted link gives a clear message ("restore or hard-delete it first") instead of a database error.
- Dashboard: checkbox layout, red danger buttons, a single domain-selector handler, import preview/slug-prefix consistency, and true CSV row numbers in import errors.

### Changed
- Bulk destination URLs are validated (normalized and checked for redirect loops); bulk titles/descriptions are sanitized like single-link edits.
- Bulk and import updates invalidate the link cache instead of rebuilding it (the next click rebuilds it).
- Static asset version bumped to `v5`.

### Upgrade notes
- New DB migration `0023_add_pixel_library.sql` (adds `pixel_library` and `link_pixels`; no existing data is changed). **Deploy with `npm run deploy`** (runs migrations). With `npm run deploy:only` the new code fails on link reads and cache-miss redirects until the migration is applied.
- Added a regression test for cross-domain access in bulk and import (GHSA-9f2c-cqrr-gcqp).

---

## [0.10.2] - 2026-10-07

Follow-up to 0.10.1: safer MFA recovery and clearer upgrade notes. Recommended for everyone on 0.10.1.

### Fixed
- **MFA no longer fails with a server error when `SETUP_TOKEN` was changed or removed.** Since 0.10.1, MFA secrets are encrypted with `SETUP_TOKEN`; if it later changes, login now answers with a clear message instead of a 500. **Backup codes keep working** in that case, and **Settings → Disable MFA** now accepts your account password as well as an MFA code (the API already did).
- **Password change**: the dashboard now explains that your sessions (including the current one) were signed out and sends you to the sign-in page, instead of showing "success" and then logging you out on the next click.

### Added
- **Admin MFA reset**: `POST /users/:id/mfa/reset` (admin/owner) and a **Reset MFA** button in Users. Clears the user's MFA so they can sign in with their password and enrol again. Not for your own account (use Settings → Disable MFA); only an owner can reset another owner. Logged in the audit log.
- `DEPLOYMENT.md`: **keep `SETUP_TOKEN` after setup once users have MFA**, and how to recover if it was changed (backup code, admin reset, or a D1 command for a locked-out sole owner).

### Changed in 0.10.1 (upgrade notes that were missing from that release)
- `DELETE /domains/:id` now only **deactivates** (idempotent). It used to toggle; re-activate with `PUT /domains/:id` `{ "status": "active" }`.
- `POST /auth/token` returns 404 when `ENVIRONMENT = "production"`. Use `/auth/login` and `/auth/refresh`.
- `POST /auth/mfa/disable` requires `mfa_code` or `password` in the body.
- `POST /auth/mfa/verify` is rate-limited (5/min per IP) and a temporary MFA token is revoked after 5 failed attempts.
- Global tags/categories (no `domain_id`) can only be created, edited or deleted by admins/owners.
- `redirect_code` on link create/update accepts only 301, 302, 307, 308. Existing links stored with another code keep redirecting.
- Changing your password signs out the current session and every other session created on 0.10.1 or later. Sessions created before upgrading to 0.10.1 carry no issue time and stay valid until they expire (up to 7 days).
- Bot traffic no longer increments click counts; city/country rules use `request.cf` only (client `cf-*` headers are ignored).
- Password hashes and new API keys use a versioned format (upgraded on next login). Rolling back to 0.10.0 or earlier after upgrading makes those users/keys unable to authenticate.

---

## [0.10.1] - 2026-10-07

Security release. **All deployments should upgrade.**

### Security
- **Cross-domain authorization in bulk operations (GHSA-9f2c-cqrr-gcqp):** `POST /links/bulk` now checks, per link, that a session user can access the link's domain (as the single-link routes already did). Previously a user with `edit_links` could update or delete links on domains they had no access to. Reported by @furkan-arslan-sec.
- **Cross-domain authorization in CSV import:** `POST /links/import` now returns 403 unless the session user can access the target domain, or the API key's `domain_ids` include it.
- Stored XSS fixes in the audit log and analytics overview; inline event handlers replaced with delegated listeners (CSP-compatible).
- MFA: rate limit + lockout on verification, a valid code is required to disable MFA, backup codes are hashed, and the MFA secret is encrypted at rest with `SETUP_TOKEN` (when set). **Changing `SETUP_TOKEN` after upgrading makes MFA secrets enrolled afterwards unreadable** — affected users must re-enrol.
- Sessions are revoked on password change; constant-time setup-token comparison; `/auth/setup-auto` requires `SETUP_TOKEN` and is rate limited; `/auth/token` is disabled in production.
- SSRF guard rejects encoded IP literals; global tags/categories are admin-only.
- Password hashes use a versioned format and are upgraded on next login (legacy hashes keep working).
- A Content-Security-Policy already set on a response is no longer overwritten.

### Fixed
- Disabled links stop redirecting (including cached entries); bots no longer inflate click counts; tablet user-agent detection; city/country matching uses `request.cf` only (not client-supplied headers).
- `redirect_code` restricted to 301/302/307/308; route matching respects path-segment boundaries.
- CSV parser rewrite; import refuses inactive domains and redirect loops.
- Analytics D1 aggregation fixes (cron boundary, source split, catch-up, sample-adjusted counts, dedup); hard-delete cascades to analytics rows.

### Upgrade notes
- New DB migration `0022_normalize_analytics_null_dimensions.sql` (data repair only) — run `npm run db:migrate` (included in `npm run deploy`).
- Optional new variable `ALLOWED_ORIGINS` (comma-separated CORS allowlist); unset keeps the previous behaviour.

---

## [0.10.0] - 2026-06-22

### Added
- **Social Media Meta (Open Graph)**: each link can carry custom Open Graph / Twitter Card tags (title, description, image, type, card). When a social crawler (Facebook, X, LinkedIn, Slack, Discord, WhatsApp, …) scrapes the short URL, the worker serves a preview page built from those tags; human visitors are redirected normally (301). Configured per link in the dashboard.
- **"Fetch from destination URL"**: a dashboard button that scrapes the destination's existing OG/Twitter tags and pre-fills the fields (only blank fields, so manual edits win). SSRF-guarded (blocks private/loopback/link-local/cloud-metadata hosts), 8s timeout, HTML-only, bounded read.
- DB migration `0021_add_og_meta.sql` — adds the `link_og_meta` table (one row per link, `UNIQUE(link_id)`, `ON DELETE CASCADE`).

---

## [0.9.2] - 2026-06-22

### Security
- Pinned `vitest` to **4.1.8** (was `^1.6.0`) to resolve critical advisory **GHSA-5xrq-8626-4rwp** / CVE-2026-47429 (Vitest UI server arbitrary file read / code execution). Development-only dependency — it is **not** bundled into the deployed Worker, so there is no production or runtime impact.

---

## [0.9.1] - 2026-06-06

### Added
- **Force password change on first login (#11)**: admins can mark a user "must change password" when creating or editing them. Such users are blocked from the dashboard and API (except change-password / identity / logout) until they set a new password; a forced change screen is shown on login. Enforced server-side on both session middlewares.
- **Configurable route landing page (#12)**: a new **Settings → Default Page** lets an admin choose what a domain's route base serves when no short link is given — a built-in branded page (default), custom HTML, or a redirect to a URL. Replaces the previous "Slug required" message.
- **CSV import column auto-mapping (#14)**: the import UI now auto-selects the matching field for common headers (Destination URL, Slug, Title, Description, Redirect Code, Category, Tags, Route). A "Category" or "Tags" column of **names** is resolved to IDs (existing reused, missing created), a mapped "Redirect Code" column is honored (301/302/307/308), and so CSVs exported by the dashboard round-trip.
- DB migration `0020_add_must_change_password.sql` — adds `users.must_change_password` (`NOT NULL DEFAULT 0`).

### Changed
- Dashboard styling migrated from hardcoded inline colors to theme CSS variables, giving consistent, readable **dark mode** across modals, callouts, panels, and help text. Light mode is visually unchanged.
- Category selection dropdowns and filters now load all categories instead of only the first 25.

### Fixed
- **#18**: only 25 of N categories were selectable in link create/edit and in filters; all categories now appear.
- **#19**: dark-mode readability — callout/info boxes and help text rendered light-on-light (notably the Add Domain modal) and were unreadable.
- CSV import returned HTTP 500 for client errors (missing/unknown domain) instead of the intended 400/404.
- CSV import rows are now atomic — if a row fails after the link is created, the link (and its tags/redirects) is rolled back instead of leaving an orphan.
- Several inline dashboard regexes were silently broken by template-literal escaping (`\s`, `\.` lost), affecting domain-name and IP validation, JSON response highlighting, CSV geo country-name detection, and CSV header auto-mapping.

### Security
- `password_hash`, `mfa_secret`, and `mfa_backup_codes` are no longer included in `/users` API responses (GET/POST/PUT) — they previously leaked to admin/owner callers (and thus browser devtools/logs). `mfa_secret` exposure in particular allowed reconstructing another user's TOTP.

---

## [0.9.0] - 2026-06-03

### Added
- City-based redirect rules: per-link rules that route visitors to a different destination based on their city, matched case-insensitively (`city_name` auto-lowercased on save, max 20 rules per link)
- OS-based redirect rules: per-link rules for `android` and `ios` visitors (max 20 rules per link)
- New redirect priority order: **City → Country → OS → Device → Default URL**
- `GET /api/v1/debug/my-location` endpoint — returns the visitor's detected city, country, region, and timezone; useful for verifying exact values before setting up redirect rules
- `Vary: CF-IPCity` added to response headers when city redirects are present, preventing cross-city cache poisoning
- Dashboard UI forms for managing city and OS redirect rules, including inline help text
- DB migration `0018_add_city_os_redirects.sql` — new `link_city_redirects` and `link_os_redirects` tables with `ON DELETE CASCADE`
- Batch fetch support for city/OS redirects (`getLinksCityRedirectsBatch`, `getLinksOsRedirectsBatch`)
- CSV import support for `city_redirects` and `os_redirects` columns
- Bulk update support for city and OS redirect rules
- Links created via the API or CSV import now default their `route` to the domain's primary route (`routes[0]` / `routing_path`) when none is provided, matching dashboard behavior so links are always reachable under the domain's configured path (`getEffectiveLinkRoute` in new `src/utils/route.ts`)
- DB migration `0019_backfill_link_routes.sql` — backfills the route on pre-existing links that were created without one

### Changed
- Geo data source switched from `cf-ipcountry`/`cf-ipcity` headers to `request.cf.country`/`request.cf.city` (populated by Cloudflare by default), with header fallback for environments using the Visitor Location Headers Managed Transform
- OS detection in `parseUserAgent` now checks `android` and `ios` before `mac`/`linux`, fixing misclassification of Android (which contains "linux") and iOS (which contains "mac") user agents
- Analytics click tracking (`trackClickAsync`) uses the same `request.cf` source for city/country, keeping geo data consistent with redirect resolution
- Redirect cache (re)build now always fetches all redirect rules from the database instead of reusing a stale cache entry — an older entry could predate the city/OS feature and silently drop those rules
- Links list query now returns the domain's `routing_path` so the dashboard can render the correct short URL for routeless links
- `resolveDestinationUrl`, `extractGeoFromRequest`, and `buildVaryHeader` exported from `redirect.ts` for testability

### Fixed
- 7 issues identified in city/OS redirect code review: type safety, stale-cache patch path, Vary header, OS detection order, analytics geo source, schema defaults, and batch fetch wiring
- Dashboard "Short URL" column showed a bare slug (e.g. `domain.com/slug`) for links without a stored route on a prefixed domain (e.g. `/go/*`); now falls back to the domain's `routing_path` and displays the working URL (`domain.com/go/slug`)
- `deleteCityRedirect` now lowercases `city_name` before matching, consistent with how city names are stored

---

## [0.8.1] - 2026-01-10

### Changed
- Updated license details and notices (`ec13c6d`)
- Added copyright and license headers to all source files

---

## [0.8.0] - 2026-01-04

### Changed
- Updated license notice and third-party dependency notices
- Updated product description to "multi domain"
- Added link to latest version updates in dashboard

---

## [0.7.0] - 2025-12-31

### Added
- Centralized Zod request validation and shared schemas across all API endpoints (`c8f0052`)
- Dynamic rate limiting for API endpoints configurable via environment variables (`297cde8`)
- Per-IP failed authentication protection using token bucket algorithm (`1457684`)
- Rate limiting for auth token refresh endpoint (`b0cf38b`)
- Custom token expiration via `createTokenSchema` on `/token` endpoint (`e16e3ba`)
- `/refresh` endpoint now supports cookie-only requests (no body required) (`e16e3ba`)
- Empty body allowed for `/token` endpoint to use default expiration (`9fe7d38`)
- Weak password warning in dashboard UI (`1457684`)
- SECURITY.md with security policy and disclosure guidelines (`61eb1f5`)
- Support section in dashboard with GitHub star and donate buttons (`3a9035a`)
- Expanded API documentation: bulk operations, CSV import options, `include_redirects`, rate-limit details, error codes, domain scoping, IP whitelisting (`a5f6771`, `3faa075`, `745ceab`, `337fe20`)

### Changed
- Failed authentication window increased to 2 hours (`61eb1f5`)
- `FAILED_AUTH_WINDOW` set to 60 seconds for development/testing environments (`556942d`)
- Auth middleware strengthened: stricter IP detection, rejection of unidentifiable clients (`a8183f3`)
- `user_id` added to API key schema (`6c8634e`)
- User schemas moved to dedicated file (`6c8634e`)
- Removed active status check when associating domains with API keys (`7b27d34`)
- Improved IP whitelist placeholder and help text with IPv6 examples (`5825814`)
- Rate limit check logging simplified; KV TTL behaviour documented in comments (`9871507`)
- Separate `details` property for token creation failure errors (`1afa2b0`)

### Fixed
- Rate limit window calculation corrected (`63f1087`)
- Expired API keys excluded from failed-auth failure tracking (`63f1087`)
- MFA schema field presence enforced (`63f1087`)
- Dashboard status filter removed from query parameters (belongs to Link Monitor page) (`ca6b6c9`)
- Domain selector initialization order fixed to prevent links loading before domain is selected (`a5decac`, `39b59bc`)
- Table alias added to `status` column in link query to resolve ambiguous column reference (`824c117`)
- Tag and category update endpoints now return `409` on unique constraint violations (`9e05043`)
- Try-catch added to tag and category update routes (`77bdcd7`)
- Lenient date format handling for API key expiration; empty/null values handled for tag colors and category icons (`bc74140`)

---

## [0.6.0-beta1] - 2025-12-16

### Added
- Zod validation middleware scaffolding and core type updates (`c8f0052`)
- D1 database and KV namespace IDs configured in `wrangler.toml` (`f60e72c`)
- Project renamed in wrangler configuration and analytics dataset (`40a312b`)

### Fixed
- Setup token issue resolved
- Vulnerability detected by CodeQL fixed
- Authentication endpoints excluded from CSRF protection (`8244b67`)
- Password validation relaxed for user creation flow (`8244b67`)

### Changed
- Deployment flow improved

---

## [0.5.0-beta.1] - 2025-12-15

### Added
- Initial release — Cloudflare Workers-based link shortener with multi-domain support
- Country-based (geo) redirect rules per link
- Device-based redirect rules per link (desktop / mobile / tablet)
- Short link management API (create, read, update, delete, bulk operations)
- CSV import for bulk link creation
- Analytics via Cloudflare Analytics Engine (clicks, geo, device, browser, UTM params)
- Role-based access control (owner / admin / analyst / user)
- API key authentication with domain scoping, IP whitelisting, and expiration
- MFA (TOTP) support with backup codes
- Dashboard UI (CardService-style web interface)
- D1 (SQLite) persistence with migration system
- KV-based caching layer for redirect resolution

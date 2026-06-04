/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Route helpers shared between link creation (API) and short-URL display.

import type { Domain } from '../types';

/**
 * Returns the domain's primary route: the first configured route, falling back
 * to routing_path. Every domain is guaranteed at least one route by the domain
 * schema (min 1, default '/go/*'), so this is effectively always defined.
 */
export function getDomainPrimaryRoute(
  domain: Pick<Domain, 'routes' | 'routing_path'>
): string | undefined {
  return (domain.routes && domain.routes[0]) || domain.routing_path || undefined;
}

/**
 * Resolves the route to store on a link. Uses the explicitly provided route when
 * given; otherwise defaults to the domain's primary route so an API-created link
 * is always reachable under the domain's configured path and displays correctly
 * (matching what the dashboard UI already does for human-created links).
 */
export function getEffectiveLinkRoute(
  domain: Pick<Domain, 'routes' | 'routing_path'>,
  providedRoute?: string
): string | undefined {
  return providedRoute || getDomainPrimaryRoute(domain);
}

/**
 * Builds the short-link path for a slug under a route. Mirrors the dashboard's
 * client-side constructShortUrl path logic so server and client agree.
 *
 *   "/go/*" + "abc" => "/go/abc"   (wildcard replaced)
 *   "/*"    + "abc" => "/abc"      (root wildcard → bare slug)
 *   "/go"   + "abc" => "/go/abc"   (no wildcard → appended)
 *   ""      + "abc" => "/abc"      (no route → bare slug)
 */
export function buildShortUrlPath(route: string | undefined, slug: string): string {
  if (!slug) return '';
  let urlPath = '/' + slug;
  if (route && route.includes('*')) {
    // split/join substitutes the slug literally (String.replace would interpret
    // $-sequences in the slug) and replaces every wildcard, not just the first.
    urlPath = route.split('*').join(slug);
    if (!urlPath.startsWith('/')) urlPath = '/' + urlPath;
  } else if (route) {
    urlPath = route.endsWith('/') ? route + slug : route + '/' + slug;
    if (!urlPath.startsWith('/')) urlPath = '/' + urlPath;
  }
  return urlPath;
}

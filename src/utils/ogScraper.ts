/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Fetches a destination URL and extracts its Open Graph / Twitter Card meta tags,
// so the dashboard can pre-fill a link's social preview fields ("Fetch from URL").

import { parseHTML, preview, type PreviewResult } from 'linkpeek';
import { isValidUrl } from './validation';

export interface ScrapedOgMeta {
  og_title?: string;
  og_description?: string;
  og_image?: string;
  og_type?: string;
  twitter_card?: string;
}

const MAX_HTML_BYTES = 1_000_000; // only parse the first ~1MB of HTML
const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

/**
 * Reject URLs that point at private / loopback / link-local / cloud-metadata hosts.
 * Defense-in-depth on top of isValidUrl (which only checks the http/https scheme).
 *
 * FOLLOW-UP (SSRF hardening): this checks the URL *literal* only. A public hostname
 * that resolves via DNS to a private IP (DNS-rebinding) is NOT caught here. That is
 * acceptable on Cloudflare Workers, whose fetch runs from the edge and cannot reach a
 * private network. If this is ever self-hosted where the worker shares a network with
 * internal services, add post-resolution IP validation (resolve host -> reject private
 * IPs) before the fetch in fetchOgTags().
 */
/**
 * Parse a single dotted part per inet_aton rules: 0x.. = hex, 0.. = octal, else decimal.
 * Returns null for anything that is not a valid numeric part.
 */
function parseNumericPart(part: string): number | null {
  if (part === '') return null;
  let value: number;
  if (/^0x[0-9a-f]+$/i.test(part)) {
    value = parseInt(part.slice(2), 16);
  } else if (/^0[0-7]+$/.test(part)) {
    value = parseInt(part, 8);
  } else if (/^[0-9]+$/.test(part)) {
    value = parseInt(part, 10);
  } else {
    return null;
  }
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Parse an IPv4 host in ANY encoding a resolver would accept — dotted-decimal,
 * dotted-octal ("0177.0.0.1"), dotted-hex ("0x7f.0.0.1"), or a single integer/hex
 * value ("2130706433", "0x7f000001") — into its four octets. Returns null if the
 * host is not an IPv4 literal (e.g. a normal DNS name), mirroring inet_aton's
 * 1-to-4-part addressing.
 */
export function parseIpv4Host(host: string): [number, number, number, number] | null {
  const parts = host.split('.');
  if (parts.length < 1 || parts.length > 4) return null;

  const nums: number[] = [];
  for (const p of parts) {
    const n = parseNumericPart(p);
    if (n === null) return null;
    nums.push(n);
  }

  let a: number, b: number, c: number, d: number;
  switch (nums.length) {
    case 1: {
      const v = nums[0];
      if (v > 0xffffffff) return null;
      a = (v >>> 24) & 0xff; b = (v >>> 16) & 0xff; c = (v >>> 8) & 0xff; d = v & 0xff;
      break;
    }
    case 2: {
      if (nums[0] > 0xff || nums[1] > 0xffffff) return null;
      a = nums[0]; b = (nums[1] >>> 16) & 0xff; c = (nums[1] >>> 8) & 0xff; d = nums[1] & 0xff;
      break;
    }
    case 3: {
      if (nums[0] > 0xff || nums[1] > 0xff || nums[2] > 0xffff) return null;
      a = nums[0]; b = nums[1]; c = (nums[2] >>> 8) & 0xff; d = nums[2] & 0xff;
      break;
    }
    default: { // 4 parts
      if (nums.some(n => n > 0xff)) return null;
      [a, b, c, d] = nums;
      break;
    }
  }
  return [a, b, c, d];
}

/** True if the given IPv4 octets fall in a loopback/private/link-local/unspecified range. */
export function isPrivateIpv4(octets: [number, number, number, number]): boolean {
  const [a, b] = octets;
  if (a === 127 || a === 10 || a === 0) return true; // loopback, private, unspecified
  if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata 169.254.169.254)
  if (a === 192 && b === 168) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  return false;
}

export function isPubliclyFetchableUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (!host) return false;

  // Hostnames that are never public.
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return false;
  if (host === 'metadata.google.internal') return false;

  // Strip IPv6 brackets if present.
  const bare = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;

  // IPv6 loopback / unspecified, and IPv4-mapped/ULA ranges.
  if (bare === '::1' || bare === '::') return false;
  if (bare.startsWith('fc') || bare.startsWith('fd') || bare.startsWith('fe80')) return false;

  // IPv4 literal checks — normalize ANY encoding (decimal/octal/hex/integer) first,
  // so http://2130706433, http://0177.0.0.1, http://0x7f.0.0.1 are all caught.
  const octets = parseIpv4Host(bare);
  if (octets && isPrivateIpv4(octets)) {
    return false;
  }

  return true;
}

function toOgMeta(page: PreviewResult): ScrapedOgMeta {
  return {
    // Fit the save schema (src/schemas/link.ts) so a long <title> doesn't block saving.
    og_title: page.title?.slice(0, 255) ?? undefined,
    og_description: page.description?.slice(0, 500) ?? undefined,
    og_image: page.image ?? undefined,
    og_type: page.mediaType,
    twitter_card: page.twitterCard ?? undefined,
  };
}

/**
 * Parse Open Graph / Twitter Card meta tags out of an HTML string.
 * Relative image URLs are resolved against baseUrl.
 */
export function parseOgTags(html: string, baseUrl: string): ScrapedOgMeta {
  return toOgMeta(parseHTML(html, baseUrl));
}

/**
 * Fetch a URL and return its OG/Twitter meta. Throws on guard failure, timeout,
 * or network error — the caller maps that to a 4xx/5xx response.
 * linkpeek re-validates every redirect hop, caps the body, and detects the charset.
 */
export async function fetchOgTags(url: string): Promise<ScrapedOgMeta> {
  const page = await preview(url, {
    timeout: FETCH_TIMEOUT_MS,
    maxBytes: MAX_HTML_BYTES,
    maxRedirects: MAX_REDIRECTS,
    userAgent: 'OpenShortLink-OGFetcher/1.0',
  });
  if (page.statusCode < 200 || page.statusCode >= 300) {
    throw new Error(`Destination returned ${page.statusCode}`);
  }
  return toOgMeta(page);
}

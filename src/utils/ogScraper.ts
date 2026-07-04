/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Fetches a destination URL and extracts its Open Graph / Twitter Card meta tags,
// so the dashboard can pre-fill a link's social preview fields ("Fetch from URL").

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
 * Decode the handful of HTML entities that commonly appear in meta content.
 * We decode here so the value is stored raw; the render layer re-escapes via escapeHtml.
 */
function decodeEntities(value: string): string {
  // Single left-to-right pass: chaining sequential .replace() calls would let an
  // earlier replacement's output be re-matched by a later one (e.g. "&amp;lt;" ->
  // "&lt;" -> "<"). Matching each entity once avoids that double-unescape.
  return value.replace(/&(?:amp|lt|gt|quot|#0*39|#x27);/gi, (match) => {
    const e = match.toLowerCase();
    if (e === '&amp;') return '&';
    if (e === '&lt;') return '<';
    if (e === '&gt;') return '>';
    if (e === '&quot;') return '"';
    return "'"; // &#39; / &#039; / &#x27;
  });
}

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

  // IPv4 literal checks.
  const m = bare.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 127 || a === 10 || a === 0) return false; // loopback, private, unspecified
    if (a === 169 && b === 254) return false; // link-local (incl. cloud metadata 169.254.169.254)
    if (a === 192 && b === 168) return false; // private
    if (a === 172 && b >= 16 && b <= 31) return false; // private
  }

  return true;
}

/**
 * Parse Open Graph / Twitter Card meta tags out of an HTML string.
 * Pure function — handles either attribute order and single/double quotes.
 */
export function parseOgTags(html: string): ScrapedOgMeta {
  const result: ScrapedOgMeta = {};
  const head = html.slice(0, MAX_HTML_BYTES);

  const metaTagRegex = /<meta\b[^>]*>/gi;
  const keyRegex = /(?:property|name)\s*=\s*["']([^"']+)["']/i;
  const contentRegex = /content\s*=\s*["']([^"']*)["']/i;

  const tags = head.match(metaTagRegex) || [];
  for (const tag of tags) {
    const keyMatch = tag.match(keyRegex);
    const contentMatch = tag.match(contentRegex);
    if (!keyMatch || !contentMatch) continue;

    const key = keyMatch[1].trim().toLowerCase();
    const content = decodeEntities(contentMatch[1].trim());
    if (!content) continue;

    switch (key) {
      case 'og:title':
        result.og_title = result.og_title ?? content;
        break;
      case 'og:description':
        result.og_description = result.og_description ?? content;
        break;
      case 'og:image':
      case 'og:image:url':
      case 'og:image:secure_url':
        result.og_image = result.og_image ?? content;
        break;
      case 'og:type':
        result.og_type = result.og_type ?? content;
        break;
      case 'twitter:card':
        result.twitter_card = result.twitter_card ?? content;
        break;
      // Twitter fallbacks for title/description/image when OG ones are absent.
      case 'twitter:title':
        result.og_title = result.og_title ?? content;
        break;
      case 'twitter:description':
        result.og_description = result.og_description ?? content;
        break;
      case 'twitter:image':
        result.og_image = result.og_image ?? content;
        break;
      default:
        break;
    }
  }

  return result;
}

/**
 * Fetch a URL and return its OG/Twitter meta. Throws on guard failure, timeout,
 * non-HTML, or network error — the caller maps that to a 4xx/5xx response.
 */
export async function fetchOgTags(url: string): Promise<ScrapedOgMeta> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // Follow redirects MANUALLY, re-validating every hop against the SSRF guard.
    // `redirect: 'follow'` would let a public URL redirect the worker to a private/
    // internal host, bypassing the initial isPubliclyFetchableUrl() check.
    let currentUrl = url;
    let response: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!isPubliclyFetchableUrl(currentUrl)) {
        throw new Error('URL is not publicly fetchable');
      }
      response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'OpenShortLink-OGFetcher/1.0',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) break; // redirect without a target -> treat as terminal
        if (hop === MAX_REDIRECTS) {
          throw new Error('Too many redirects');
        }
        // Resolve relative redirects; the next loop iteration re-checks the SSRF guard.
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }
      break; // not a redirect -> use this response
    }

    if (!response || !response.ok) {
      throw new Error(`Destination returned ${response ? response.status : 'no response'}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error('Destination is not an HTML page');
    }

    // Read at most MAX_HTML_BYTES so a huge or chunked page can't exhaust worker
    // memory (content-length may be absent, so we cap the stream, not the header).
    const reader = response.body?.getReader();
    if (!reader) {
      return {};
    }
    const decoder = new TextDecoder();
    let html = '';
    let received = 0;
    try {
      while (received < MAX_HTML_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        html += decoder.decode(value, { stream: true });
      }
    } finally {
      try {
        await reader.cancel();
      } catch {
        // ignore – we already have what we need
      }
    }
    return parseOgTags(html);
  } finally {
    clearTimeout(timeoutId);
  }
}

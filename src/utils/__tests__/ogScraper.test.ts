/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseOgTags, isPubliclyFetchableUrl, fetchOgTags } from '../ogScraper';

describe('parseOgTags', () => {
  it('extracts standard Open Graph tags', () => {
    const html = `
      <head>
        <meta property="og:title" content="My Page">
        <meta property="og:description" content="A description">
        <meta property="og:image" content="https://cdn.example.com/i.png">
        <meta property="og:type" content="article">
        <meta name="twitter:card" content="summary_large_image">
      </head>`;
    const og = parseOgTags(html);
    expect(og.og_title).toBe('My Page');
    expect(og.og_description).toBe('A description');
    expect(og.og_image).toBe('https://cdn.example.com/i.png');
    expect(og.og_type).toBe('article');
    expect(og.twitter_card).toBe('summary_large_image');
  });

  it('handles reversed attribute order and single quotes', () => {
    const html = `<meta content='Reversed Title' property='og:title'>`;
    expect(parseOgTags(html).og_title).toBe('Reversed Title');
  });

  it('decodes common HTML entities', () => {
    const html = `<meta property="og:title" content="Tom &amp; Jerry &lt;3 &quot;quotes&quot;">`;
    expect(parseOgTags(html).og_title).toBe('Tom & Jerry <3 "quotes"');
  });

  it('does not double-unescape nested entities', () => {
    // "&amp;lt;" is the literal text "&lt;", not "<".
    const html = `<meta property="og:title" content="A &amp;lt; B">`;
    expect(parseOgTags(html).og_title).toBe('A &lt; B');
  });

  it('falls back to twitter:* when og:* is absent', () => {
    const html = `
      <meta name="twitter:title" content="TW Title">
      <meta name="twitter:image" content="https://x.example.com/a.png">`;
    const og = parseOgTags(html);
    expect(og.og_title).toBe('TW Title');
    expect(og.og_image).toBe('https://x.example.com/a.png');
  });

  it('prefers og:* over twitter:* when both exist', () => {
    const html = `
      <meta property="og:title" content="OG Wins">
      <meta name="twitter:title" content="TW Loses">`;
    expect(parseOgTags(html).og_title).toBe('OG Wins');
  });

  it('returns an empty object when there are no tags', () => {
    expect(parseOgTags('<html><body>no meta</body></html>')).toEqual({});
  });

  it('ignores meta tags with empty content', () => {
    expect(parseOgTags(`<meta property="og:title" content="">`).og_title).toBeUndefined();
  });
});

describe('isPubliclyFetchableUrl', () => {
  it('accepts normal public http/https URLs', () => {
    expect(isPubliclyFetchableUrl('https://example.com/page')).toBe(true);
    expect(isPubliclyFetchableUrl('http://example.com')).toBe(true);
  });

  it('rejects non-http(s) schemes', () => {
    expect(isPubliclyFetchableUrl('ftp://example.com')).toBe(false);
    expect(isPubliclyFetchableUrl('file:///etc/passwd')).toBe(false);
    expect(isPubliclyFetchableUrl('not a url')).toBe(false);
  });

  it('rejects loopback and localhost', () => {
    expect(isPubliclyFetchableUrl('http://localhost/x')).toBe(false);
    expect(isPubliclyFetchableUrl('http://127.0.0.1/x')).toBe(false);
    expect(isPubliclyFetchableUrl('http://[::1]/x')).toBe(false);
  });

  it('rejects private and link-local ranges (incl. cloud metadata)', () => {
    expect(isPubliclyFetchableUrl('http://10.0.0.5')).toBe(false);
    expect(isPubliclyFetchableUrl('http://192.168.1.1')).toBe(false);
    expect(isPubliclyFetchableUrl('http://172.16.0.1')).toBe(false);
    expect(isPubliclyFetchableUrl('http://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isPubliclyFetchableUrl('http://metadata.google.internal')).toBe(false);
  });
});

describe('fetchOgTags redirect handling (SSRF guard)', () => {
  afterEach(() => vi.unstubAllGlobals());

  // Minimal Response-like stubs mimicking only what fetchOgTags reads.
  const redirectTo = (location: string, status = 302) =>
    ({ status, ok: false, headers: new Headers({ location }), body: null }) as unknown as Response;
  const htmlPage = (html: string) => {
    const bytes = new TextEncoder().encode(html);
    let sent = false;
    return {
      status: 200,
      ok: true,
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      body: {
        getReader: () => ({
          read: async () => (sent ? { done: true, value: undefined } : ((sent = true), { done: false, value: bytes })),
          cancel: async () => {},
        }),
      },
    } as unknown as Response;
  };

  it('rejects a redirect that points at a private/internal host', async () => {
    vi.stubGlobal('fetch', vi.fn(async (u: string | URL) =>
      String(u) === 'https://public.example.com/'
        ? redirectTo('http://169.254.169.254/latest/meta-data')
        : htmlPage('<meta property="og:title" content="SHOULD NOT LEAK">')
    ));
    await expect(fetchOgTags('https://public.example.com/')).rejects.toThrow(/not publicly fetchable/i);
  });

  it('follows a redirect to another public host and parses its tags', async () => {
    vi.stubGlobal('fetch', vi.fn(async (u: string | URL) =>
      String(u) === 'https://a.example.com/'
        ? redirectTo('https://b.example.com/page', 301)
        : htmlPage('<meta property="og:title" content="Hello">')
    ));
    const og = await fetchOgTags('https://a.example.com/');
    expect(og.og_title).toBe('Hello');
  });

  it('stops after too many redirects', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => redirectTo('https://loop.example.com/next')));
    await expect(fetchOgTags('https://loop.example.com/')).rejects.toThrow(/too many redirects/i);
  });
});

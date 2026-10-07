/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, it, expect } from 'vitest';
import { renderPixelInterstitial, pixelInterstitialCsp, isHttpUrl, generateNonce } from '../pixelInterstitial';

const DEST = 'https://dest.example.com/page';
const N = 'testNonce123';

/** Body of the inline <script> blocks (everything between the tags). */
function scripts(html: string): string {
  return [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script[^>]*>/gi)].map((m) => m[1]).join('\n');
}

describe('renderPixelInterstitial snippets', () => {
  it('Meta: one loader, one init per id, one PageView', () => {
    const html = renderPixelInterstitial(
      [{ pixel_type: 'facebook', pixel_id: '111' }, { pixel_type: 'facebook', pixel_id: '222' }], DEST, N);
    expect(html.match(/fbevents\.js/g)).toHaveLength(1);
    expect(html).toContain("fbq('init', '111')");
    expect(html).toContain("fbq('init', '222')");
    expect(html.match(/fbq\('track', 'PageView'\)/g)).toHaveLength(1);
  });

  it('Google: gtag.js once with the first id, config per id', () => {
    const html = renderPixelInterstitial(
      [{ pixel_type: 'google_ads', pixel_id: 'AW-123456' }, { pixel_type: 'google_ads', pixel_id: 'G-2' }], DEST, N);
    expect(html.match(/gtag\/js\?id=/g)).toHaveLength(1);
    expect(html).toContain('gtag/js?id=AW-123456');
    expect(html).toContain("gtag('config', 'AW-123456')");
    expect(html).toContain("gtag('config', 'G-2')");
  });

  it('Google Ads + GA4 share one gtag loader with a config per id', () => {
    const html = renderPixelInterstitial(
      [{ pixel_type: 'google_ads', pixel_id: 'AW-123456' }, { pixel_type: 'ga4', pixel_id: 'G-ABCD' }], DEST, N);
    expect(html.match(/gtag\/js\?id=/g)).toHaveLength(1);
    expect(html).toContain("gtag('config', 'AW-123456')");
    expect(html).toContain("gtag('config', 'G-ABCD')");
  });

  it('LinkedIn, TikTok and X snippets', () => {
    const html = renderPixelInterstitial([
      { pixel_type: 'linkedin', pixel_id: '555' },
      { pixel_type: 'tiktok', pixel_id: 'TT9' },
      { pixel_type: 'twitter', pixel_id: 'tw1' },
    ], DEST, N);
    expect(html).toContain("_linkedin_data_partner_ids.push('555')");
    expect(html).toContain('snap.licdn.com/li.lms-analytics/insight.min.js');
    expect(html).toContain("ttq.load('TT9')");
    expect(html).toContain('ttq.page()');
    expect(html).toContain("twq('config', 'tw1')");
  });

  it('strips characters outside the pixel id charset', () => {
    const html = renderPixelInterstitial([{ pixel_type: 'facebook', pixel_id: "1');alert(1);('" }], DEST, N);
    expect(html).not.toContain('alert(1)');
    expect(html).toContain("fbq('init', '1alert1')");
  });

  it('puts the nonce on every script tag', () => {
    const html = renderPixelInterstitial([{ pixel_type: 'facebook', pixel_id: '1' }], DEST, N);
    const tags = html.match(/<script\b[^>]*>/gi) || [];
    expect(tags.length).toBeGreaterThan(0);
    for (const t of tags) expect(t).toContain(`nonce="${N}"`);
  });
});

describe('renderPixelInterstitial redirect', () => {
  it('redirects with location.replace after load, capped at 2s', () => {
    const html = renderPixelInterstitial([], 'https://dest.example.com/p?x=1&y=2', N);
    const js = scripts(html);
    expect(js).toContain('location.replace');
    expect(js).toContain('https://dest.example.com/p?x=1&y=2');
    expect(js).toContain("addEventListener('load'");
    expect(js).toContain('2000');
  });

  it('has a noscript meta-refresh and a manual link', () => {
    const html = renderPixelInterstitial([], 'https://dest.example.com/p?x=1&y=2', N);
    expect(html).toMatch(/<noscript><meta http-equiv="refresh" content="0;url=https:\/\/dest\.example\.com\/p\?x=1&amp;y=2"><\/noscript>/);
    expect(html).toContain('href="https://dest.example.com/p?x=1&amp;y=2"');
  });

  it('escapes the destination inside the JS string', () => {
    const html = renderPixelInterstitial([], "https://e.example.com/'+alert(1)+'</script><b>\n", N);
    const js = scripts(html);
    expect(js).not.toContain("'+alert(1)+'");
    expect(js).not.toMatch(/<\/script/i);
    expect(js).not.toContain('<b>');
    expect(js).not.toMatch(/\n'\)/); // raw newline would break the string literal
  });
});

describe('isHttpUrl', () => {
  it('accepts http and https only', () => {
    expect(isHttpUrl('https://a.example.com')).toBe(true);
    expect(isHttpUrl('http://a.example.com/x')).toBe(true);
    expect(isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isHttpUrl('JaVaScRiPt:alert(1)')).toBe(false);
    expect(isHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isHttpUrl('not a url')).toBe(false);
  });
});

describe('pixelInterstitialCsp / generateNonce', () => {
  it('allows only nonced scripts (+ what they load) and blocks framing', () => {
    const csp = pixelInterstitialCsp(N);
    expect(csp).toContain(`'nonce-${N}'`);
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain('connect-src https:');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).not.toContain("'unsafe-inline' https:; script"); // scripts never unsafe-inline
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it('generates distinct base64 nonces', () => {
    const a = generateNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/=]{16,}$/);
    expect(generateNonce()).not.toBe(a);
  });
});

describe('renderPixelInterstitial output is valid JavaScript', () => {
  it('both inline scripts parse with every platform and a hostile destination', () => {
    const html = renderPixelInterstitial([
      { pixel_type: 'facebook', pixel_id: '1' }, { pixel_type: 'google_ads', pixel_id: 'AW-123456' }, { pixel_type: 'ga4', pixel_id: 'G-ABCD' },
      { pixel_type: 'linkedin', pixel_id: '2' }, { pixel_type: 'tiktok', pixel_id: 'T3' },
      { pixel_type: 'twitter', pixel_id: 'x4' },
    ], "https://e.example.com/'  \n\"</script>", N);
    const blocks = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script[^>]*>/gi)].map((m) => m[1]);
    expect(blocks).toHaveLength(2);
    for (const b of blocks) expect(() => new Function(b)).not.toThrow();
  });
});

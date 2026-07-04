/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, it, expect } from 'vitest';
import { renderOgPreviewPage } from '../ogPreview';

describe('renderOgPreviewPage', () => {
  const meta = {
    og_title: 'Hello "World"',
    og_description: 'A <great> page',
    og_image: 'https://cdn.example.com/img.png',
    og_type: 'article',
    twitter_card: 'summary_large_image',
  };

  it('includes Open Graph and Twitter meta tags', () => {
    const html = renderOgPreviewPage(meta, 'https://dest.example.com/page');
    expect(html).toContain('property="og:type" content="article"');
    expect(html).toContain('property="og:image" content="https://cdn.example.com/img.png"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('property="og:url" content="https://dest.example.com/page"');
  });

  it('HTML-escapes title and description to prevent injection', () => {
    const html = renderOgPreviewPage(meta, 'https://dest.example.com/page');
    expect(html).toContain('Hello &quot;World&quot;');
    expect(html).toContain('A &lt;great&gt; page');
    expect(html).not.toContain('A <great> page');
  });

  it('does NOT auto-redirect (no meta-refresh) so scrapers read our tags, not the destination', () => {
    const html = renderOgPreviewPage(meta, 'https://short.example.com/go/abc');
    expect(html).not.toContain('http-equiv="refresh"');
    expect(html).not.toContain('rel="canonical"');
  });

  it('sets og:url to the short link passed in', () => {
    const html = renderOgPreviewPage(meta, 'https://short.example.com/go/abc');
    expect(html).toContain('property="og:url" content="https://short.example.com/go/abc"');
  });

  it('omits image tags when no image is provided', () => {
    const html = renderOgPreviewPage({ og_type: 'website', twitter_card: 'summary' }, 'https://dest.example.com');
    expect(html).not.toContain('og:image');
  });
});

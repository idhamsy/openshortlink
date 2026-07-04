/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Renders an HTML preview page with Open Graph / Twitter Card tags for social crawlers.
//
// This page is served ONLY to crawlers (humans get a 301 redirect), so it must NOT
// auto-redirect: a `<meta http-equiv="refresh">` here makes scrapers like Facebook
// follow through to the destination and scrape ITS tags, overriding the custom OG.
// We therefore present our tags and stop. `og:url` is the short link itself so the
// preview is attributed to the short URL, not the destination.

import { escapeHtml } from '../utils/html';

export interface OgPreviewMeta {
  og_title?: string;
  og_description?: string;
  og_image?: string;
  og_type: string;
  twitter_card: string;
}

export function renderOgPreviewPage(meta: OgPreviewMeta, pageUrl: string): string {
  const url = escapeHtml(pageUrl);
  const title = meta.og_title ? escapeHtml(meta.og_title) : '';
  const description = meta.og_description ? escapeHtml(meta.og_description) : '';
  const image = meta.og_image ? escapeHtml(meta.og_image) : '';
  const ogType = escapeHtml(meta.og_type);
  const twitterCard = escapeHtml(meta.twitter_card);

  const tags: string[] = [
    `<meta property="og:type" content="${ogType}">`,
    `<meta property="og:url" content="${url}">`,
  ];
  if (title) {
    tags.push(`<meta property="og:title" content="${title}">`);
    tags.push(`<meta name="twitter:title" content="${title}">`);
  }
  if (description) {
    tags.push(`<meta property="og:description" content="${description}">`);
    tags.push(`<meta name="twitter:description" content="${description}">`);
  }
  if (image) {
    tags.push(`<meta property="og:image" content="${image}">`);
    tags.push(`<meta name="twitter:image" content="${image}">`);
  }
  tags.push(`<meta name="twitter:card" content="${twitterCard}">`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title || 'Link preview'}</title>
${tags.join('\n')}
</head>
<body>
<p>${title || 'Shared link'}</p>
</body>
</html>`;
}

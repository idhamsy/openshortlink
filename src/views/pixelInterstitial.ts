/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Interstitial page served to human visitors of links with retargeting pixels:
// fires the configured ad-platform pixels, then redirects to the destination.

import { escapeHtml } from '../utils/html';

import type { PixelType } from '../utils/pixelIds';

export type { PixelType };

type LoaderKey = 'facebook' | 'gtag' | 'linkedin' | 'tiktok' | 'twitter';

export interface PixelEntry {
  pixel_type: PixelType;
  pixel_id: string;
}

/** Redirect this long after window.load (gives the pixel beacons time to leave). */
const REDIRECT_AFTER_LOAD_MS = 250;
/** Hard cap: redirect even if a pixel script hangs and window.load never fires. */
const REDIRECT_MAX_WAIT_MS = 2000;

/** Only http(s) destinations may be navigated to via JS (never javascript:/data:). */
export function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export function generateNonce(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
}

/**
 * CSP for the interstitial. Only nonced inline scripts run; 'strict-dynamic' lets them
 * load the platforms' own scripts (which load further scripts), so no per-vendor host
 * list has to be maintained. `https:` in script-src is a fallback for CSP2 browsers.
 */
export function pixelInterstitialCsp(nonce: string): string {
  return [
    "default-src 'none'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' https:`,
    'connect-src https:',
    'img-src https: data:',
    'frame-src https:',
    "style-src 'unsafe-inline'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/** Escape for a single-quoted JS string literal inside an inline <script>. */
function jsString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** Restrict to the schema's charset again (defense-in-depth for old/cached data). */
function safePixelId(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]/g, '');
}

/** Official loader snippets, one loader per platform with an init/config per id. */
function snippetFor(type: LoaderKey, ids: string[]): string {
  const q = (id: string) => `'${id}'`;
  switch (type) {
    case 'facebook':
      return `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');`
        + ids.map((id) => `fbq('init', ${q(id)});`).join('')
        + `fbq('track', 'PageView');`;
    case 'gtag':
      return `var g=document.createElement('script');g.async=true;g.src='https://www.googletagmanager.com/gtag/js?id=${ids[0]}';document.head.appendChild(g);`
        + `window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments);};gtag('js',new Date());`
        + ids.map((id) => `gtag('config', ${q(id)});`).join('');
    case 'linkedin':
      return `window._linkedin_partner_id=${q(ids[0])};window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];`
        + ids.map((id) => `window._linkedin_data_partner_ids.push(${q(id)});`).join('')
        + `(function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[]}var s=document.getElementsByTagName('script')[0];var b=document.createElement('script');b.type='text/javascript';b.async=true;b.src='https://snap.licdn.com/li.lms-analytics/insight.min.js';s.parentNode.insertBefore(b,s);})(window.lintrk);`;
    case 'tiktok':
      return `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie','holdConsent','revokeConsent','grantConsent'],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r='https://analytics.tiktok.com/i18n/pixel/events.js';ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=d.createElement('script');n.type='text/javascript',n.async=!0,n.src=r+'?sdkid='+e+'&lib='+t;e=d.getElementsByTagName('script')[0];e.parentNode.insertBefore(n,e)};`
        + ids.map((id) => `ttq.load(${q(id)});`).join('')
        + `ttq.page();}(window,document,'ttq');`;
    case 'twitter':
      return `!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');`
        + ids.map((id) => `twq('config', ${q(id)});`).join('');
    default:
      return '';
  }
}

export function renderPixelInterstitial(pixels: PixelEntry[], destinationUrl: string, nonce: string): string {
  // Group ids by platform (insertion order), dropping empties and duplicates.
  const byType = new Map<LoaderKey, string[]>();
  for (const p of pixels || []) {
    const id = safePixelId(p.pixel_id);
    if (!id) continue;
    const key: LoaderKey = p.pixel_type === 'google_ads' || p.pixel_type === 'ga4' ? 'gtag' : p.pixel_type;
    const ids = byType.get(key) || [];
    if (!ids.includes(id)) ids.push(id);
    byType.set(key, ids);
  }
  // Each platform in its own try so one failing loader can't stop the others.
  const snippets = [...byType.entries()]
    .map(([type, ids]) => snippetFor(type, ids))
    .filter(Boolean)
    .map((s) => `try{${s}}catch(e){}`)
    .join('\n');

  const destForJs = jsString(destinationUrl);
  const destForHtml = escapeHtml(destinationUrl);
  const n = escapeHtml(nonce);

  // The redirect script comes first and is a separate <script>: a syntax/runtime error
  // in the pixel block can never prevent the visitor from being redirected.
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Redirecting…</title>
<noscript><meta http-equiv="refresh" content="0;url=${destForHtml}"></noscript>
<style>body{font-family:system-ui,-apple-system,sans-serif;color:#555;display:flex;align-items:center;justify-content:center;min-height:90vh;margin:0}a{color:inherit}</style>
</head>
<body>
<p>Redirecting… <a href="${destForHtml}">Continue</a></p>
<script nonce="${n}">
(function(){var done=false;function go(){if(done)return;done=true;location.replace('${destForJs}');}
window.addEventListener('load',function(){setTimeout(go,${REDIRECT_AFTER_LOAD_MS});});
setTimeout(go,${REDIRECT_MAX_WAIT_MS});})();
</script>
<script nonce="${n}">
${snippets}
</script>
</body>
</html>`;
}

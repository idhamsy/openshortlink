/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Retargeting pixel platforms and their ID formats. Single source of truth for the
// API (Zod), the service layer, and the dashboard (serialised as PIXEL_RULES_CLIENT).
// Patterns deliberately avoid backslash escapes so they can be embedded verbatim in
// the dashboard's template literal. All are subsets of [A-Za-z0-9_-], which the
// interstitial relies on when interpolating ids into JS.

export const PIXEL_TYPES = ['facebook', 'google_ads', 'ga4', 'linkedin', 'tiktok', 'twitter'] as const;
export type PixelType = (typeof PIXEL_TYPES)[number];

interface PixelRule {
  label: string;
  placeholder: string;
  hint: string;
  pattern: string;
  normalize: 'upper' | 'lower' | 'none';
}

export const PIXEL_RULES_CLIENT: Record<PixelType, PixelRule> = {
  facebook: { label: 'Meta / Facebook', placeholder: '1234567890123456', hint: 'Meta Events Manager → Data sources → your pixel', pattern: '^[0-9]{10,20}$', normalize: 'none' },
  google_ads: { label: 'Google Ads', placeholder: 'AW-123456789', hint: 'Google Ads → Tools → Google tag', pattern: '^AW-[0-9]{6,15}$', normalize: 'upper' },
  ga4: { label: 'Google Analytics 4', placeholder: 'G-ABC123XYZ', hint: 'GA4 Admin → Data streams → web stream → Measurement ID', pattern: '^G-[A-Z0-9]{4,20}$', normalize: 'upper' },
  linkedin: { label: 'LinkedIn Insight', placeholder: '1234567', hint: 'Campaign Manager → Analyze → Insight Tag → Partner ID', pattern: '^[0-9]{3,12}$', normalize: 'none' },
  tiktok: { label: 'TikTok', placeholder: 'C4ABCDEFGH1234567890', hint: 'TikTok Events Manager → Web events → Pixel ID', pattern: '^[A-Z0-9]{10,30}$', normalize: 'upper' },
  twitter: { label: 'X / Twitter', placeholder: 'o1abc', hint: 'X Ads → Tools → Events Manager → Pixel ID', pattern: '^[a-z0-9]{3,10}$', normalize: 'lower' },
};

export function normalizePixelId(type: PixelType, raw: string): string {
  const v = (raw || '').trim();
  const rule = PIXEL_RULES_CLIENT[type];
  if (!rule) return v;
  if (rule.normalize === 'upper') return v.toUpperCase();
  if (rule.normalize === 'lower') return v.toLowerCase();
  return v;
}

export function isValidPixelId(type: PixelType, raw: string): boolean {
  const rule = PIXEL_RULES_CLIENT[type];
  return !!rule && new RegExp(rule.pattern).test(normalizePixelId(type, raw));
}

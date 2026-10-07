/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, it, expect } from 'vitest';
import { isValidPixelId, normalizePixelId, PIXEL_RULES_CLIENT, PIXEL_TYPES } from '../pixelIds';
import { createPixelSchema, updatePixelSchema } from '../../schemas/pixel';

describe('pixel id rules', () => {
  const valid: Array<[string, string]> = [
    ['facebook', '1234567890123456'], ['google_ads', 'aw-123456789'], ['ga4', 'g-abc123xyz'],
    ['linkedin', '1234567'], ['tiktok', 'c4abcdefgh1234567890'], ['twitter', 'O1ABC'],
  ];
  const invalid: Array<[string, string]> = [
    ['facebook', '12345'], ['facebook', 'AW-123456789'], ['google_ads', 'G-ABC123'],
    ['ga4', 'AW-123456789'], ['linkedin', 'abc'], ['tiktok', 'short'], ['twitter', "o1');x"],
  ];
  it.each(valid)('%s accepts %s (after normalising)', (type, id) => {
    expect(isValidPixelId(type as never, id)).toBe(true);
  });
  it.each(invalid)('%s rejects %s', (type, id) => {
    expect(isValidPixelId(type as never, id)).toBe(false);
  });
  it('normalises case per platform and trims', () => {
    expect(normalizePixelId('google_ads', ' aw-123456789 ')).toBe('AW-123456789');
    expect(normalizePixelId('twitter', 'O1ABC')).toBe('o1abc');
    expect(normalizePixelId('facebook', ' 1234567890 ')).toBe('1234567890');
  });
  it('client rules are JSON-safe and contain no backslashes (dashboard template literal)', () => {
    const json = JSON.stringify(PIXEL_RULES_CLIENT);
    expect(json).not.toContain('\\');
    expect(Object.keys(PIXEL_RULES_CLIENT)).toEqual([...PIXEL_TYPES]);
  });
});

describe('library schemas', () => {
  const base = { domain_id: 'd1', name: 'Main Meta', pixel_type: 'facebook', pixel_id: '1234567890' };
  it('accepts a valid create body and defaults is_default to false', () => {
    expect(createPixelSchema.parse(base).is_default).toBe(false);
  });
  it('rejects an id that does not match its platform', () => {
    expect(createPixelSchema.safeParse({ ...base, pixel_id: 'AW-123456789' }).success).toBe(false);
  });
  it('rejects empty/too-long names and unknown types', () => {
    expect(createPixelSchema.safeParse({ ...base, name: ' ' }).success).toBe(false);
    expect(createPixelSchema.safeParse({ ...base, name: 'x'.repeat(101) }).success).toBe(false);
    expect(createPixelSchema.safeParse({ ...base, pixel_type: 'google' }).success).toBe(false);
  });
  it('update is partial and refuses domain_id', () => {
    expect(updatePixelSchema.safeParse({ name: 'New' }).success).toBe(true);
    expect(updatePixelSchema.safeParse({ domain_id: 'd2' }).success).toBe(false);
  });
});

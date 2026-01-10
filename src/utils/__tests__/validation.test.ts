/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Basic validation tests

import { describe, it, expect } from 'vitest';
import { isValidUrl, isValidSlug, sanitizeSlug, normalizeUrl } from '../validation';

describe('Validation utilities', () => {
  describe('isValidUrl', () => {
    it('should validate HTTP URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('isValidSlug', () => {
    it('should validate correct slugs', () => {
      expect(isValidSlug('abc123')).toBe(true);
      expect(isValidSlug('my-link')).toBe(true);
      expect(isValidSlug('my_link')).toBe(true);
      expect(isValidSlug('a')).toBe(false); // Too short
    });

    it('should reject invalid slugs', () => {
      expect(isValidSlug('')).toBe(false);
      expect(isValidSlug('a')).toBe(false);
      expect(isValidSlug('invalid slug')).toBe(false);
      expect(isValidSlug('invalid@slug')).toBe(false);
    });
  });

  describe('sanitizeSlug', () => {
    it('should sanitize slugs correctly', () => {
      expect(sanitizeSlug('My Link')).toBe('mylink');
      expect(sanitizeSlug('My-Link_123')).toBe('my-link_123');
      expect(sanitizeSlug('---test---')).toBe('test');
    });
  });

  describe('normalizeUrl', () => {
    it('should normalize URLs', () => {
      expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
      expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path');
    });
  });
});


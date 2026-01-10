/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Utility functions for generating IDs

export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  // Use cryptographically secure random bytes instead of Math.random()
  const randomBytes = crypto.getRandomValues(new Uint8Array(5));
  const random = Array.from(randomBytes)
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
    .substring(0, 9);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

export function generateSlug(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const charsLength = chars.length; // 62
  // Calculate the largest multiple of charsLength that fits in 256
  // This ensures unbiased distribution via rejection sampling
  const maxValid = 256 - (256 % charsLength); // 256 - 8 = 248
  
  let result = '';
  while (result.length < length) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(length - result.length));
    for (const byte of randomBytes) {
      if (byte < maxValid) {
        result += chars.charAt(byte % charsLength);
        if (result.length >= length) break;
      }
      // Reject bytes >= 248 (they would cause bias)
    }
  }
  return result;
}

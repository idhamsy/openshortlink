/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Tests for crypto utilities: versioned PBKDF2 hashing, migration-safe verify,
// constant-time compare, SHA-256 backup-code hashing, and AES-GCM at-rest crypto.

import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  needsRehash,
  constantTimeEqualStr,
  sha256Hex,
  isSha256Hash,
  encryptSecret,
  decryptSecret,
  isEncrypted,
  DUMMY_PASSWORD_HASH,
} from '../crypto';

// Build a legacy-format hash (`saltHex:hashHex`, implicit 100k iterations) the
// way the old hashPassword did, so we can prove verify still accepts it.
async function makeLegacyHash(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const hex = (b: Uint8Array) => Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
  return `${hex(salt)}:${hex(new Uint8Array(bits))}`;
}

describe('crypto', () => {
  describe('hashPassword / verifyPassword (A5)', () => {
    it('produces the versioned format (100k — Cloudflare Workers PBKDF2 cap) and verifies it', async () => {
      const hash = await hashPassword('Correct-Horse-Battery-9!');
      expect(hash.startsWith('pbkdf2$100000$')).toBe(true);
      expect(await verifyPassword('Correct-Horse-Battery-9!', hash)).toBe(true);
      expect(await verifyPassword('wrong-password', hash)).toBe(false);
    });

    it('still verifies legacy salt:hash (100k) hashes', async () => {
      const legacy = await makeLegacyHash('legacy-pass-123');
      expect(legacy.includes('$')).toBe(false);
      expect(await verifyPassword('legacy-pass-123', legacy)).toBe(true);
      expect(await verifyPassword('nope', legacy)).toBe(false);
    });

    it('returns false for malformed stored hashes', async () => {
      expect(await verifyPassword('x', 'garbage')).toBe(false);
      expect(await verifyPassword('x', '')).toBe(false);
    });

    it('DUMMY_PASSWORD_HASH never matches a real password', async () => {
      expect(await verifyPassword('anything', DUMMY_PASSWORD_HASH)).toBe(false);
    });
  });

  describe('needsRehash (A5)', () => {
    it('flags legacy unversioned hashes for migration, not current versioned ones', async () => {
      const legacy = await makeLegacyHash('p');
      expect(needsRehash(legacy)).toBe(true); // unprefixed salt:hash → migrate to versioned format
      const current = await hashPassword('p');
      expect(needsRehash(current)).toBe(false); // already versioned at the max supported iterations
    });
  });

  describe('constantTimeEqualStr (A8)', () => {
    it('compares strings correctly', () => {
      expect(constantTimeEqualStr('token-abc', 'token-abc')).toBe(true);
      expect(constantTimeEqualStr('token-abc', 'token-abd')).toBe(false);
      expect(constantTimeEqualStr('short', 'longer-string')).toBe(false);
      expect(constantTimeEqualStr('', '')).toBe(true);
    });
  });

  describe('sha256Hex / isSha256Hash (A2/A10)', () => {
    it('hashes deterministically and is recognisable', async () => {
      const h = await sha256Hex('12345678');
      expect(h.startsWith('sha256:')).toBe(true);
      expect(isSha256Hash(h)).toBe(true);
      expect(isSha256Hash('12345678')).toBe(false);
      expect(await sha256Hex('12345678')).toBe(h);
      expect(await sha256Hex('87654321')).not.toBe(h);
    });
  });

  describe('encryptSecret / decryptSecret (A2)', () => {
    it('round-trips through AES-GCM with a passphrase', async () => {
      const enc = await encryptSecret('JBSWY3DPEHPK3PXP', 'setup-token-secret');
      expect(isEncrypted(enc)).toBe(true);
      expect(enc).not.toContain('JBSWY3DPEHPK3PXP');
      expect(await decryptSecret(enc, 'setup-token-secret')).toBe('JBSWY3DPEHPK3PXP');
    });

    it('uses a fresh salt/iv each call (ciphertext differs)', async () => {
      const a = await encryptSecret('same', 'pw');
      const b = await encryptSecret('same', 'pw');
      expect(a).not.toBe(b);
      expect(await decryptSecret(a, 'pw')).toBe('same');
      expect(await decryptSecret(b, 'pw')).toBe('same');
    });

    it('treats non-prefixed values as legacy plaintext on decrypt', async () => {
      expect(await decryptSecret('PLAINSECRET', 'pw')).toBe('PLAINSECRET');
      expect(isEncrypted('PLAINSECRET')).toBe(false);
    });

    it('returns plaintext when no passphrase is configured', async () => {
      const enc = await encryptSecret('secret', undefined);
      expect(enc).toBe('secret');
      expect(isEncrypted(enc)).toBe(false);
    });

    it('fails to decrypt with the wrong passphrase', async () => {
      const enc = await encryptSecret('secret', 'right');
      await expect(decryptSecret(enc, 'wrong')).rejects.toBeTruthy();
    });
  });
});

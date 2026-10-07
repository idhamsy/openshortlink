/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Tests for backup-code hashing + constant-time verification (A2/A10).

import { describe, it, expect } from 'vitest';
import { hashBackupCodes, verifyBackupCode, encryptMFASecret, tryDecryptMFASecret } from '../mfa';

describe('MFA backup codes', () => {
  describe('hashBackupCodes (A2)', () => {
    it('stores SHA-256 hashes, not plaintext', async () => {
      const codes = ['12345678', '87654321'];
      const hashed = await hashBackupCodes(codes);
      expect(hashed).toHaveLength(2);
      for (const h of hashed) {
        expect(h.startsWith('sha256:')).toBe(true);
      }
      expect(hashed).not.toContain('12345678');
    });
  });

  describe('verifyBackupCode (A2/A10)', () => {
    it('verifies against hashed storage and removes the used code', async () => {
      const codes = ['12345678', '87654321', '11112222'];
      const hashed = await hashBackupCodes(codes);
      const json = JSON.stringify(hashed);

      const result = await verifyBackupCode(json, '87654321');
      expect(result.valid).toBe(true);
      // The used code's hash is gone; the other two remain (still hashed).
      expect(result.remainingCodes).toHaveLength(2);
      expect(result.remainingCodes).toContain(hashed[0]);
      expect(result.remainingCodes).toContain(hashed[2]);
      expect(result.remainingCodes).not.toContain(hashed[1]);
    });

    it('rejects an unknown code without dropping any stored code', async () => {
      const hashed = await hashBackupCodes(['12345678']);
      const result = await verifyBackupCode(JSON.stringify(hashed), '00000000');
      expect(result.valid).toBe(false);
      expect(result.remainingCodes).toHaveLength(1);
    });

    it('supports legacy plaintext codes (backward compatibility)', async () => {
      const legacy = JSON.stringify(['12345678', '87654321']);
      const result = await verifyBackupCode(legacy, '12345678');
      expect(result.valid).toBe(true);
      expect(result.remainingCodes).toEqual(['87654321']);
    });

    it('handles malformed JSON gracefully', async () => {
      const result = await verifyBackupCode('not-json', '12345678');
      expect(result.valid).toBe(false);
    });
  });
});

describe('tryDecryptMFASecret (SETUP_TOKEN rotation)', () => {
  const secret = 'JBSWY3DPEHPK3PXP';

  it('round-trips with the same SETUP_TOKEN', async () => {
    const stored = await encryptMFASecret({ SETUP_TOKEN: 'token-a' } as any, secret);
    expect(stored).not.toBe(secret);
    expect(await tryDecryptMFASecret({ SETUP_TOKEN: 'token-a' } as any, stored)).toBe(secret);
  });

  it('returns null (does not throw) after SETUP_TOKEN is changed', async () => {
    const stored = await encryptMFASecret({ SETUP_TOKEN: 'token-a' } as any, secret);
    expect(await tryDecryptMFASecret({ SETUP_TOKEN: 'token-b' } as any, stored)).toBeNull();
  });

  it('returns null (does not throw) after SETUP_TOKEN is removed', async () => {
    const stored = await encryptMFASecret({ SETUP_TOKEN: 'token-a' } as any, secret);
    expect(await tryDecryptMFASecret({} as any, stored)).toBeNull();
  });

  it('passes legacy plaintext secrets through', async () => {
    expect(await tryDecryptMFASecret({} as any, secret)).toBe(secret);
  });
});

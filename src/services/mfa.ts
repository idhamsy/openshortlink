/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// MFA/2FA service using TOTP (Time-based One-Time Password)

import { TOTP } from 'otpauth';
import type { Env } from '../types';
import {
  generateSessionToken,
  sha256Hex,
  isSha256Hash,
  constantTimeEqualStr,
  encryptSecret,
  decryptSecret,
} from '../utils/crypto';

const ISSUER = 'OpenShort.link';
const ALGORITHM = 'SHA1';
const DIGITS = 6;
const PERIOD = 30; // 30 seconds

// Generate MFA secret for a user
export function generateMFASecret(userId: string, email: string): { secret: string; qrCodeUrl: string } {
  const secret = new TOTP({
    issuer: ISSUER,
    label: email || userId,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
  });

  return {
    secret: secret.secret.base32,
    qrCodeUrl: secret.toString(), // This generates the otpauth:// URL for QR code
  };
}

// Verify TOTP code
export function verifyMFACode(secret: string, code: string): boolean {
  try {
    const totp = new TOTP({
      secret: secret,
      algorithm: ALGORITHM,
      digits: DIGITS,
      period: PERIOD,
    });

    // Verify with 1 window tolerance (30 seconds before/after)
    const delta = totp.validate({ token: code, window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}

// Generate backup codes (10 codes, 8 digits each)
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  const randomBytes = crypto.getRandomValues(new Uint8Array(10 * 4)); // 10 codes * 4 bytes each

  for (let i = 0; i < 10; i++) {
    const codeBytes = randomBytes.slice(i * 4, (i + 1) * 4);
    // Convert to 8-digit number
    const code = Array.from(codeBytes)
      .map(b => (b % 10).toString())
      .join('')
      .padStart(8, '0')
      .substring(0, 8);
    codes.push(code);
  }

  return codes;
}

// Hash a set of backup codes for storage (SHA-256). Backup codes are single-use
// high-entropy values, so a fast hash is sufficient. Store the result; show the
// plaintext codes to the user only once (at generation time).
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map(code => sha256Hex(code)));
}

// Verify backup code and remove it from the list.
// Storage may contain either sha256Hex() hashes (new) or legacy plaintext codes;
// both are supported. Comparison is constant-time and does not early-exit on the
// matching entry (A10). Returns the remaining stored entries (still hashed).
export async function verifyBackupCode(
  backupCodesJson: string,
  code: string
): Promise<{ valid: boolean; remainingCodes: string[] }> {
  try {
    const codes = JSON.parse(backupCodesJson) as string[];
    const hashedInput = await sha256Hex(code);

    let matchedIndex = -1;
    for (let i = 0; i < codes.length; i++) {
      const stored = codes[i];
      const isMatch = isSha256Hash(stored)
        ? constantTimeEqualStr(stored, hashedInput)
        : constantTimeEqualStr(stored, code); // legacy plaintext entry
      if (isMatch) {
        matchedIndex = i;
      }
    }

    if (matchedIndex === -1) {
      return { valid: false, remainingCodes: codes };
    }

    const remaining = codes.filter((_, i) => i !== matchedIndex);
    return { valid: true, remainingCodes: remaining };
  } catch {
    return { valid: false, remainingCodes: [] };
  }
}

// Encrypt an MFA secret for storage at rest (AES-GCM keyed off SETUP_TOKEN).
export async function encryptMFASecret(env: Env, secret: string): Promise<string> {
  return encryptSecret(secret, env.SETUP_TOKEN);
}

// Decrypt a stored MFA secret. Legacy plaintext secrets are returned unchanged.
export async function decryptMFASecret(env: Env, stored: string): Promise<string> {
  return decryptSecret(stored, env.SETUP_TOKEN);
}

export const MFA_SECRET_UNREADABLE =
  'Your MFA secret can no longer be read (SETUP_TOKEN was changed or removed on this server). ' +
  'Sign in with a backup code, or ask an admin to reset your MFA.';

// Like decryptMFASecret, but returns null instead of throwing when the secret can't be
// decrypted (SETUP_TOKEN rotated/removed after enrolment), so callers can respond cleanly.
export async function tryDecryptMFASecret(env: Env, stored: string): Promise<string | null> {
  try {
    return await decryptMFASecret(env, stored);
  } catch (err) {
    console.error('[MFA] cannot decrypt stored MFA secret:', err instanceof Error ? err.message : err);
    return null;
  }
}

// Store temporary MFA verification token (for login flow)
export async function createMFATempToken(env: Env, userId: string): Promise<string> {
  // Use a 32-byte cryptographically random token (A9) instead of generateId(),
  // which is timestamp + ~40 bits of entropy.
  const token = generateSessionToken();
  const key = `mfa_temp:${token}`;
  const data = {
    user_id: userId,
    created_at: Date.now(),
  };

  // Expires in 5 minutes
  await env.CACHE.put(key, JSON.stringify(data), { expirationTtl: 300 });
  return token;
}

// Get temporary MFA verification token
export async function getMFATempToken(env: Env, token: string): Promise<{ user_id: string; created_at: number } | null> {
  const key = `mfa_temp:${token}`;
  const data = await env.CACHE.get(key, 'json');
  return data as { user_id: string; created_at: number } | null;
}

// Delete temporary MFA verification token
export async function deleteMFATempToken(env: Env, token: string): Promise<void> {
  const key = `mfa_temp:${token}`;
  await env.CACHE.delete(key);
}


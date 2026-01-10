/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// MFA/2FA service using TOTP (Time-based One-Time Password)

import { TOTP } from 'otpauth';
import type { Env } from '../types';
import { generateId } from '../utils/id';

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

// Verify backup code and remove it from list
export function verifyBackupCode(backupCodesJson: string, code: string): { valid: boolean; remainingCodes: string[] } {
  try {
    const codes = JSON.parse(backupCodesJson) as string[];
    const index = codes.indexOf(code);

    if (index === -1) {
      return { valid: false, remainingCodes: codes };
    }

    // Remove used code
    const remaining = codes.filter((_, i) => i !== index);
    return { valid: true, remainingCodes: remaining };
  } catch {
    return { valid: false, remainingCodes: [] };
  }
}

// Store temporary MFA verification token (for login flow)
export async function createMFATempToken(env: Env, userId: string): Promise<string> {
  const token = generateId();
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


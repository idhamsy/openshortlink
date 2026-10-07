/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Cryptographic utilities for password hashing and verification

// PBKDF2 iteration counts.
// New hashes use 600k (OWASP 2023 guidance for PBKDF2-SHA256). Legacy hashes
// stored in the old `salt:hash` format were generated at 100k and must still
// verify — verifyPassword defaults to LEGACY_PBKDF2_ITERATIONS for them.
// Cloudflare Workers HARD-CAPS PBKDF2 at 100000 iterations in PRODUCTION
// (crypto.subtle throws NotSupportedError above it — this limit is NOT enforced
// in local Node/workerd, so raising it passes tests but 500s in prod). Keep this
// at 100000. The versioned `pbkdf2$<iters>$...` format below still lets us migrate
// to a higher count (or a server-side pepper) later without breaking existing hashes.
const PBKDF2_ITERATIONS = 100000;
const LEGACY_PBKDF2_ITERATIONS = 100000;

// Versioned hash prefix. New format: `pbkdf2$<iterations>$<saltHex>$<hashHex>`.
// Legacy format (no prefix): `<saltHex>:<hashHex>` (implicit 100k iterations).
const PBKDF2_PREFIX = 'pbkdf2';

// A syntactically-valid legacy-format hash used only to run a dummy verify on
// the login "user not found" path so that timing does not leak account
// existence (A7). It intentionally matches no real password.
export const DUMMY_PASSWORD_HASH =
  '00112233445566778899aabbccddeeff:' +
  '0000000000000000000000000000000000000000000000000000000000000000';

// --- helpers -----------------------------------------------------------------

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const matched = hex.match(/.{1,2}/g);
  if (!matched) return new Uint8Array(0);
  return new Uint8Array(matched.map(byte => parseInt(byte, 16)));
}

// Constant-time comparison of two byte arrays. Returns false on length mismatch.
export function constantTimeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

// Constant-time comparison of two strings (compared as UTF-8 bytes).
// Length is not secret here (used for fixed-length tokens), and returning
// early on a length mismatch is acceptable.
export function constantTimeEqualStr(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  return constantTimeEqualBytes(encoder.encode(a), encoder.encode(b));
}

async function deriveBitsFromPassword(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return new Uint8Array(derivedBits);
}

// --- password hashing --------------------------------------------------------

// Hash password using Web Crypto API (PBKDF2). Produces the versioned format
// `pbkdf2$<iterations>$<saltHex>$<hashHex>` at PBKDF2_ITERATIONS.
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await deriveBitsFromPassword(password, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(derived)}`;
}

// Parse a stored hash into its parameters. Supports both the versioned format
// and the legacy `salt:hash` format (implicit 100k iterations).
function parseStoredHash(
  storedHash: string
): { iterations: number; salt: Uint8Array; hash: Uint8Array } | null {
  if (storedHash.startsWith(`${PBKDF2_PREFIX}$`)) {
    const parts = storedHash.split('$');
    // ['pbkdf2', '<iterations>', '<saltHex>', '<hashHex>']
    if (parts.length !== 4) return null;
    const iterations = parseInt(parts[1], 10);
    if (!Number.isFinite(iterations) || iterations <= 0) return null;
    if (!parts[2] || !parts[3]) return null;
    return { iterations, salt: fromHex(parts[2]), hash: fromHex(parts[3]) };
  }

  // Legacy format: saltHex:hashHex at 100k iterations.
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return null;
  return {
    iterations: LEGACY_PBKDF2_ITERATIONS,
    salt: fromHex(saltHex),
    hash: fromHex(hashHex),
  };
}

// Verify password against a stored hash (versioned or legacy format).
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parsed = parseStoredHash(storedHash);
    if (!parsed) return false;

    const derived = await deriveBitsFromPassword(password, parsed.salt, parsed.iterations);
    return constantTimeEqualBytes(derived, parsed.hash);
  } catch {
    return false;
  }
}

// Returns true when a stored hash should be upgraded (legacy format, or a
// versioned hash below the current iteration count). Callers can rehash on a
// successful login to opportunistically migrate users.
export function needsRehash(storedHash: string): boolean {
  const parsed = parseStoredHash(storedHash);
  if (!parsed) return false; // unparseable — nothing we can do here
  return !storedHash.startsWith(`${PBKDF2_PREFIX}$`) || parsed.iterations < PBKDF2_ITERATIONS;
}

// Generate secure session token
export function generateSessionToken(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return toHex(randomBytes);
}

// Hash API key using same PBKDF2 hashing as passwords (versioned format).
export async function hashApiKey(apiKey: string): Promise<string> {
  return await hashPassword(apiKey);
}

// Verify API key against stored hash (versioned or legacy format).
export async function verifyApiKey(apiKey: string, storedHash: string): Promise<boolean> {
  return await verifyPassword(apiKey, storedHash);
}

// --- SHA-256 (for backup-code hashing) --------------------------------------

const SHA256_PREFIX = 'sha256:';

// Hash a short secret (e.g. an MFA backup code) with SHA-256. Backup codes are
// high-entropy single-use values, so a plain fast hash is sufficient (unlike
// user passwords which need a slow KDF).
export async function sha256Hex(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return `${SHA256_PREFIX}${toHex(new Uint8Array(digest))}`;
}

// True when a stored value is a sha256Hex() output (vs. legacy plaintext).
export function isSha256Hash(value: string): boolean {
  return value.startsWith(SHA256_PREFIX);
}

// --- AES-GCM encryption at rest (for MFA secrets) ---------------------------

// Ciphertext prefix so decrypt can distinguish encrypted values from legacy
// plaintext. Format: `enc:v1:<saltHex>:<ivHex>:<ciphertextHex>`.
const ENC_PREFIX = 'enc:v1:';

// True when a stored value was produced by encryptSecret().
export function isEncrypted(value: string): boolean {
  return value.startsWith(ENC_PREFIX);
}

// Derive an AES-GCM key from a passphrase (the Worker's SETUP_TOKEN) + salt.
async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt a value at rest with AES-GCM using a key derived from `passphrase`.
// If no passphrase is available the value is returned unchanged (plaintext) so
// deployments without SETUP_TOKEN keep working — decrypt handles both.
export async function encryptSecret(plaintext: string, passphrase: string | undefined): Promise<string> {
  if (!passphrase) return plaintext;

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passphrase, salt);

  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );

  return `${ENC_PREFIX}${toHex(salt)}:${toHex(iv)}:${toHex(new Uint8Array(ciphertext))}`;
}

// Decrypt a value produced by encryptSecret(). Legacy plaintext (no ENC_PREFIX)
// is returned as-is for backward compatibility.
export async function decryptSecret(stored: string, passphrase: string | undefined): Promise<string> {
  if (!stored.startsWith(ENC_PREFIX)) return stored; // legacy plaintext
  if (!passphrase) {
    throw new Error('Cannot decrypt secret: no passphrase configured');
  }

  const body = stored.slice(ENC_PREFIX.length);
  const [saltHex, ivHex, ctHex] = body.split(':');
  if (!saltHex || !ivHex || !ctHex) {
    throw new Error('Malformed encrypted secret');
  }

  const key = await deriveAesKey(passphrase, fromHex(saltHex));
  const plaintextBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromHex(ivHex) as BufferSource },
    key,
    fromHex(ctHex) as BufferSource
  );

  return new TextDecoder().decode(plaintextBuf);
}

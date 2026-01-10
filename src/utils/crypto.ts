/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Cryptographic utilities for password hashing and verification

// Hash password using Web Crypto API (PBKDF2)
export async function hashPassword(password: string): Promise<string> {
  // Generate a random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Convert password to Uint8Array
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  // Import key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  // Derive key using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  
  // Convert to base64 for storage
  const hashArray = Array.from(new Uint8Array(derivedBits));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Return salt:hash format
  return `${saltHex}:${hashHex}`;
}

// Verify password
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [saltHex, hashHex] = storedHash.split(':');
    if (!saltHex || !hashHex) return false;
    
    // Convert hex strings back to Uint8Array
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const hash = new Uint8Array(hashHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    // Convert password to Uint8Array
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    
    // Import key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    // Derive key using same parameters
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );
    
    // Compare hashes using constant-time comparison to prevent timing attacks
    const derivedHash = new Uint8Array(derivedBits);
    if (derivedHash.length !== hash.length) return false;
    
    // Use XOR to compare all bytes without early exit
    // This ensures the comparison takes the same time regardless of where a mismatch occurs
    let result = 0;
    for (let i = 0; i < hash.length; i++) {
      result |= derivedHash[i] ^ hash[i];
    }
    
    return result === 0;
  } catch {
    return false;
  }
}

// Generate secure session token
export function generateSessionToken(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Hash API key using same PBKDF2 hashing as passwords
export async function hashApiKey(apiKey: string): Promise<string> {
  return await hashPassword(apiKey);
}

// Verify API key against stored hash
export async function verifyApiKey(apiKey: string, storedHash: string): Promise<boolean> {
  return await verifyPassword(apiKey, storedHash);
}


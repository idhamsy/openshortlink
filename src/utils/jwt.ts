/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

/**
 * JWT utility functions for Cloudflare Access token validation
 * 
 * NOTE: This code is NOT currently used - Cloudflare Access integration is not implemented.
 * These functions are commented out to avoid confusion.
 * 
 * If you need to implement Cloudflare Access in the future:
 * 1. Uncomment this code
 * 2. IMPORTANT: Implement proper JWT signature verification using Cloudflare's public keys
 *    See: https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
 * 3. Import and use these functions in your auth middleware
 */

/*
export interface CloudflareAccessJWT {
  aud?: string;
  email?: string;
  sub?: string;
  iss?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export async function validateCloudflareAccessToken(
  token: string,
  audience: string
): Promise<CloudflareAccessJWT | null> {
  try {
    // Split JWT into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode payload (base64url)
    // WARNING: This does NOT verify the signature! 
    // In production, you MUST verify the JWT signature with Cloudflare's public keys
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    
    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    // Check audience
    if (payload.aud && payload.aud !== audience) {
      return null;
    }

    // TODO: Implement signature verification before using in production
    // Fetch Cloudflare's public keys from:
    // https://<your-team-domain>.cloudflareaccess.com/cdn-cgi/access/certs
    
    return payload as CloudflareAccessJWT;
  } catch {
    return null;
  }
}

export function extractUserFromToken(token: CloudflareAccessJWT): {
  id: string;
  email?: string;
} {
  return {
    id: token.sub || token.email || 'unknown',
    email: token.email,
  };
}
*/


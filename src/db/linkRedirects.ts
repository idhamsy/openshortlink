/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Database operations for link geo and device redirects

import type { Env } from '../types';
import { generateId } from '../utils/id';

export interface LinkGeoRedirect {
  id: string;
  link_id: string;
  country_code: string;
  destination_url: string;
  created_at: number;
  updated_at: number;
}

export interface LinkDeviceRedirect {
  id: string;
  link_id: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  destination_url: string;
  created_at: number;
  updated_at: number;
}

// ===== GEO REDIRECTS =====

export async function getGeoRedirects(env: Env, linkId: string): Promise<LinkGeoRedirect[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM link_geo_redirects WHERE link_id = ? ORDER BY country_code'
  )
    .bind(linkId)
    .all<LinkGeoRedirect>();

  return result.results || [];
}

export async function upsertGeoRedirect(
  env: Env,
  linkId: string,
  countryCode: string,
  destinationUrl: string
): Promise<void> {
  const id = generateId('geo');
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO link_geo_redirects (id, link_id, country_code, destination_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(link_id, country_code) 
     DO UPDATE SET destination_url = ?, updated_at = ?`
  )
    .bind(id, linkId, countryCode.toUpperCase(), destinationUrl, now, now, destinationUrl, now)
    .run();
}

export async function deleteGeoRedirect(
  env: Env,
  linkId: string,
  countryCode: string
): Promise<void> {
  await env.DB.prepare('DELETE FROM link_geo_redirects WHERE link_id = ? AND country_code = ?')
    .bind(linkId, countryCode.toUpperCase())
    .run();
}

export async function clearAllGeoRedirects(env: Env, linkId: string): Promise<void> {
  await env.DB.prepare('DELETE FROM link_geo_redirects WHERE link_id = ?').bind(linkId).run();
}

// ===== DEVICE REDIRECTS =====

export async function getDeviceRedirects(env: Env, linkId: string): Promise<LinkDeviceRedirect[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM link_device_redirects WHERE link_id = ? ORDER BY device_type'
  )
    .bind(linkId)
    .all<LinkDeviceRedirect>();

  return result.results || [];
}

export async function upsertDeviceRedirect(
  env: Env,
  linkId: string,
  deviceType: 'desktop' | 'mobile' | 'tablet',
  destinationUrl: string
): Promise<void> {
  const id = generateId('device');
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO link_device_redirects (id, link_id, device_type, destination_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(link_id, device_type) 
     DO UPDATE SET destination_url = ?, updated_at = ?`
  )
    .bind(id, linkId, deviceType, destinationUrl, now, now, destinationUrl, now)
    .run();
}

export async function deleteDeviceRedirect(
  env: Env,
  linkId: string,
  deviceType: 'desktop' | 'mobile' | 'tablet'
): Promise<void> {
  await env.DB.prepare('DELETE FROM link_device_redirects WHERE link_id = ? AND device_type = ?')
    .bind(linkId, deviceType)
    .run();
}

export async function clearAllDeviceRedirects(env: Env, linkId: string): Promise<void> {
  await env.DB.prepare('DELETE FROM link_device_redirects WHERE link_id = ?').bind(linkId).run();
}

// Batch fetch operations
export async function getLinksGeoRedirectsBatch(
  env: Env,
  linkIds: string[]
): Promise<Map<string, LinkGeoRedirect[]>> {
  if (linkIds.length === 0) {
    return new Map();
  }

  // Chunk linkIds to avoid "too many SQL variables" error
  const BATCH_SIZE = 100;
  const chunks = [];
  for (let i = 0; i < linkIds.length; i += BATCH_SIZE) {
    chunks.push(linkIds.slice(i, i + BATCH_SIZE));
  }

  // Execute queries in parallel
  const results = await Promise.all(
    chunks.map(async (chunkIds) => {
      const placeholders = chunkIds.map(() => '?').join(',');
      const result = await env.DB.prepare(
        `SELECT * FROM link_geo_redirects WHERE link_id IN (${placeholders}) ORDER BY link_id, country_code`
      )
        .bind(...chunkIds)
        .all<LinkGeoRedirect>();
      return result.results || [];
    })
  );

  // Group by link_id
  const map = new Map<string, LinkGeoRedirect[]>();
  const allRows = results.flat();

  for (const row of allRows) {
    if (!map.has(row.link_id)) {
      map.set(row.link_id, []);
    }
    map.get(row.link_id)!.push(row);
  }

  return map;
}

export async function getLinksDeviceRedirectsBatch(
  env: Env,
  linkIds: string[]
): Promise<Map<string, LinkDeviceRedirect[]>> {
  if (linkIds.length === 0) {
    return new Map();
  }

  // Chunk linkIds
  const BATCH_SIZE = 100;
  const chunks = [];
  for (let i = 0; i < linkIds.length; i += BATCH_SIZE) {
    chunks.push(linkIds.slice(i, i + BATCH_SIZE));
  }

  const results = await Promise.all(
    chunks.map(async (chunkIds) => {
      const placeholders = chunkIds.map(() => '?').join(',');
      const result = await env.DB.prepare(
        `SELECT * FROM link_device_redirects WHERE link_id IN (${placeholders}) ORDER BY link_id, device_type`
      )
        .bind(...chunkIds)
        .all<LinkDeviceRedirect>();
      return result.results || [];
    })
  );

  const map = new Map<string, LinkDeviceRedirect[]>();
  const allRows = results.flat();

  for (const row of allRows) {
    if (!map.has(row.link_id)) {
      map.set(row.link_id, []);
    }
    map.get(row.link_id)!.push(row);
  }

  return map;
}


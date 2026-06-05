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

export interface LinkCityRedirect {
  id: string;
  link_id: string;
  city_name: string;
  destination_url: string;
  created_at: number;
  updated_at: number;
}

export interface LinkOsRedirect {
  id: string;
  link_id: string;
  os: 'android' | 'ios';
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

// ===== CITY REDIRECTS =====

export async function getCityRedirects(env: Env, linkId: string): Promise<LinkCityRedirect[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM link_city_redirects WHERE link_id = ? ORDER BY city_name'
  )
    .bind(linkId)
    .all<LinkCityRedirect>();

  return result.results || [];
}

export async function upsertCityRedirect(
  env: Env,
  linkId: string,
  cityName: string,
  destinationUrl: string
): Promise<void> {
  const id = generateId('city');
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO link_city_redirects (id, link_id, city_name, destination_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(link_id, city_name) 
     DO UPDATE SET destination_url = ?, updated_at = ?`
  )
    .bind(id, linkId, cityName.toLowerCase(), destinationUrl, now, now, destinationUrl, now)
    .run();
}

export async function deleteCityRedirect(
  env: Env,
  linkId: string,
  cityName: string
): Promise<void> {
  // city_name is stored lowercased (see upsertCityRedirect); match the same way
  // so a mixed-case argument still deletes the row.
  await env.DB.prepare('DELETE FROM link_city_redirects WHERE link_id = ? AND city_name = ?')
    .bind(linkId, cityName.toLowerCase())
    .run();
}

export async function clearAllCityRedirects(env: Env, linkId: string): Promise<void> {
  await env.DB.prepare('DELETE FROM link_city_redirects WHERE link_id = ?').bind(linkId).run();
}

// ===== OS REDIRECTS =====

export async function getOsRedirects(env: Env, linkId: string): Promise<LinkOsRedirect[]> {
  const result = await env.DB.prepare(
    'SELECT * FROM link_os_redirects WHERE link_id = ? ORDER BY os'
  )
    .bind(linkId)
    .all<LinkOsRedirect>();

  return result.results || [];
}

export async function upsertOsRedirect(
  env: Env,
  linkId: string,
  os: 'android' | 'ios',
  destinationUrl: string
): Promise<void> {
  const id = generateId('os');
  const now = Date.now();

  await env.DB.prepare(
    `INSERT INTO link_os_redirects (id, link_id, os, destination_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(link_id, os) 
     DO UPDATE SET destination_url = ?, updated_at = ?`
  )
    .bind(id, linkId, os, destinationUrl, now, now, destinationUrl, now)
    .run();
}

export async function deleteOsRedirect(
  env: Env,
  linkId: string,
  os: 'android' | 'ios'
): Promise<void> {
  await env.DB.prepare('DELETE FROM link_os_redirects WHERE link_id = ? AND os = ?')
    .bind(linkId, os)
    .run();
}

export async function clearAllOsRedirects(env: Env, linkId: string): Promise<void> {
  await env.DB.prepare('DELETE FROM link_os_redirects WHERE link_id = ?').bind(linkId).run();
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

export async function getLinksCityRedirectsBatch(
  env: Env,
  linkIds: string[]
): Promise<Map<string, LinkCityRedirect[]>> {
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
        `SELECT * FROM link_city_redirects WHERE link_id IN (${placeholders}) ORDER BY link_id, city_name`
      )
        .bind(...chunkIds)
        .all<LinkCityRedirect>();
      return result.results || [];
    })
  );

  const map = new Map<string, LinkCityRedirect[]>();
  const allRows = results.flat();

  for (const row of allRows) {
    if (!map.has(row.link_id)) {
      map.set(row.link_id, []);
    }
    map.get(row.link_id)!.push(row);
  }

  return map;
}

export async function getLinksOsRedirectsBatch(
  env: Env,
  linkIds: string[]
): Promise<Map<string, LinkOsRedirect[]>> {
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
        `SELECT * FROM link_os_redirects WHERE link_id IN (${placeholders}) ORDER BY link_id, os`
      )
        .bind(...chunkIds)
        .all<LinkOsRedirect>();
      return result.results || [];
    })
  );

  const map = new Map<string, LinkOsRedirect[]>();
  const allRows = results.flat();

  for (const row of allRows) {
    if (!map.has(row.link_id)) {
      map.set(row.link_id, []);
    }
    map.get(row.link_id)!.push(row);
  }

  return map;
}

export interface RedirectData {
  geo_redirects?: { country_code: string; destination_url: string }[];
  device_redirects?: { device_type: 'desktop' | 'mobile' | 'tablet'; destination_url: string }[];
  city_redirects?: { city_name: string; destination_url: string }[];
  os_redirects?: { os: 'android' | 'ios'; destination_url: string }[];
}

export async function saveLinkRedirects(env: Env, linkId: string, data: RedirectData): Promise<void> {
  if (data.geo_redirects && data.geo_redirects.length > 0) {
    for (const geo of data.geo_redirects) {
      await upsertGeoRedirect(env, linkId, geo.country_code, geo.destination_url);
    }
  }

  if (data.device_redirects && data.device_redirects.length > 0) {
    for (const device of data.device_redirects) {
      await upsertDeviceRedirect(env, linkId, device.device_type, device.destination_url);
    }
  }

  if (data.city_redirects && data.city_redirects.length > 0) {
    for (const city of data.city_redirects) {
      await upsertCityRedirect(env, linkId, city.city_name, city.destination_url);
    }
  }

  if (data.os_redirects && data.os_redirects.length > 0) {
    for (const os of data.os_redirects) {
      await upsertOsRedirect(env, linkId, os.os, os.destination_url);
    }
  }
}


import type { Env, Link, CachedLink, Domain } from '../types';
import { getGeoRedirects, getDeviceRedirects, getCityRedirects, getOsRedirects } from '../db/linkRedirects';
import { getOgMeta, upsertOgMeta, clearOgMeta, type OgMetaInput } from '../db/linkOgMeta';
import { getLinkPixels, setLinkPixels } from '../db/linkPixels';

/** Redirect/OG/pixel data already in cache shape (geo keys UPPER, city names lower, empty groups undefined). */
export interface CachedLinkParts {
  geo?: CachedLink['geo_redirects'];
  device?: CachedLink['device_redirects'];
  city?: CachedLink['city_redirects'];
  os?: CachedLink['os_redirects'];
  og_meta?: CachedLink['og_meta'];
  pixels?: CachedLink['pixels'];
}

/**
 * Pure: builds the KV cache entry from a link, its domain and parts already in hand.
 * Single source of truth for the cache shape (shared by buildCachedLink and CSV import).
 */
export function composeCachedLink(link: Link, domain: Domain, parts: CachedLinkParts): CachedLink {
  return {
    destination_url: link.destination_url,
    redirect_code: link.redirect_code,
    status: link.status,
    expires_at: link.expires_at,
    password_hash: link.password_hash,
    link_id: link.id,
    geo_redirects: parts.geo,
    device_redirects: parts.device,
    city_redirects: parts.city,
    os_redirects: parts.os,
    og_meta: parts.og_meta,
    pixels: parts.pixels,
    route: link.metadata ? (() => {
      try { return JSON.parse(link.metadata).route; } catch { return undefined; }
    })() : undefined,
    domain_routing_path: domain.routing_path,
  };
}

/**
 * Builds the complete cached link object including all redirect rules.
 * Fetches data from all redirect tables in parallel.
 */
export async function buildCachedLink(env: Env, link: Link, domain: Domain): Promise<CachedLink> {
  const [geoRedirects, deviceRedirects, cityRedirects, osRedirects, ogMeta, pixels] = await Promise.all([
    getGeoRedirects(env, link.id),
    getDeviceRedirects(env, link.id),
    getCityRedirects(env, link.id),
    getOsRedirects(env, link.id),
    getOgMeta(env, link.id),
    getLinkPixels(env, link.id)
  ]);

  return composeCachedLink(link, domain, {
    geo:
      geoRedirects.length > 0
        ? Object.fromEntries(geoRedirects.map((r) => [r.country_code, r.destination_url]))
        : undefined,
    device:
      deviceRedirects.length > 0
        ? {
          desktop: deviceRedirects.find((r) => r.device_type === 'desktop')?.destination_url,
          mobile: deviceRedirects.find((r) => r.device_type === 'mobile')?.destination_url,
          tablet: deviceRedirects.find((r) => r.device_type === 'tablet')?.destination_url,
        }
        : undefined,
    city:
      cityRedirects.length > 0
        ? cityRedirects.map((r) => ({ city_name: r.city_name, destination_url: r.destination_url }))
        : undefined,
    os:
      osRedirects.length > 0
        ? {
          android: osRedirects.find((r) => r.os === 'android')?.destination_url,
          ios: osRedirects.find((r) => r.os === 'ios')?.destination_url,
        }
        : undefined,
    og_meta: ogMeta
      ? {
          og_title: ogMeta.og_title,
          og_description: ogMeta.og_description,
          og_image: ogMeta.og_image,
          og_type: ogMeta.og_type,
          twitter_card: ogMeta.twitter_card,
        }
      : undefined,
    pixels:
      pixels.length > 0
        ? pixels.map((p) => ({ pixel_type: p.pixel_type, pixel_id: p.pixel_id }))
        : undefined,
  });
}

/**
 * Persists a link's OG meta and pixels from an update payload. Shared by PUT /links/:id and
 * the bulk update so neither silently drops these fields (updateLink only writes link columns).
 * Omitted fields are left untouched; an og_meta without title/description/image, or an empty
 * pixel_ids array, clears them.
 */
export async function saveLinkExtras(
  env: Env,
  linkId: string,
  extras: { og_meta?: OgMetaInput; pixel_ids?: string[] }
): Promise<void> {
  if (extras.og_meta !== undefined) {
    const meta = extras.og_meta;
    if (meta.og_title || meta.og_description || meta.og_image) {
      await upsertOgMeta(env, linkId, meta);
    } else {
      await clearOgMeta(env, linkId);
    }
  }
  if (extras.pixel_ids !== undefined) {
    await setLinkPixels(env, linkId, extras.pixel_ids);
  }
}

import type { Env, Link, CachedLink, Domain } from '../types';
import { getGeoRedirects, getDeviceRedirects, getCityRedirects, getOsRedirects } from '../db/linkRedirects';

/**
 * Builds the complete cached link object including all redirect rules.
 * Fetches data from all redirect tables in parallel.
 */
export async function buildCachedLink(env: Env, link: Link, domain: Domain): Promise<CachedLink> {
  const [geoRedirects, deviceRedirects, cityRedirects, osRedirects] = await Promise.all([
    getGeoRedirects(env, link.id),
    getDeviceRedirects(env, link.id),
    getCityRedirects(env, link.id),
    getOsRedirects(env, link.id)
  ]);

  return {
    destination_url: link.destination_url,
    redirect_code: link.redirect_code,
    status: link.status,
    expires_at: link.expires_at,
    password_hash: link.password_hash,
    link_id: link.id,
    geo_redirects:
      geoRedirects.length > 0
        ? Object.fromEntries(geoRedirects.map((r) => [r.country_code, r.destination_url]))
        : undefined,
    device_redirects:
      deviceRedirects.length > 0
        ? {
          desktop: deviceRedirects.find((r) => r.device_type === 'desktop')?.destination_url,
          mobile: deviceRedirects.find((r) => r.device_type === 'mobile')?.destination_url,
          tablet: deviceRedirects.find((r) => r.device_type === 'tablet')?.destination_url,
        }
        : undefined,
    city_redirects:
      cityRedirects.length > 0
        ? cityRedirects.map((r) => ({ city_name: r.city_name, destination_url: r.destination_url }))
        : undefined,
    os_redirects:
      osRedirects.length > 0
        ? {
          android: osRedirects.find((r) => r.os === 'android')?.destination_url,
          ios: osRedirects.find((r) => r.os === 'ios')?.destination_url,
        }
        : undefined,
    route: link.metadata ? (() => {
      try { return JSON.parse(link.metadata).route; } catch { return undefined; }
    })() : undefined,
    domain_routing_path: domain.routing_path,
  };
}

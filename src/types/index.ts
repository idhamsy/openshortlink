/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Core types for the openshortlink platform

export interface Link {
  id: string;
  domain_id: string;
  slug: string;
  destination_url: string;
  title?: string;
  description?: string;
  redirect_code: number;
  status: 'active' | 'expired' | 'archived' | 'deleted';
  expires_at?: number;
  password_hash?: string;
  metadata?: string; // JSON string
  category_id?: string; // Category ID (dedicated column for performance)
  click_count: number;
  unique_visitors: number;
  created_at: number;
  updated_at: number;
  created_by?: string;
  tags?: Tag[];
  category?: Category;
}

export interface Domain {
  id: string;
  cloudflare_account_id: string;
  domain_name: string;
  routing_path: string; // Kept for backward compatibility
  default_redirect_code: number;
  status: 'active' | 'inactive' | 'pending';
  settings?: string; // JSON string
  created_at: number;
  updated_at: number;
  created_by?: string;
  // Computed fields (parsed from settings or database)
  routes?: string[]; // Array of route patterns (e.g., ['/go/*', '/r/*'])
  validation_status?: DomainValidationStatus;
}

export interface DomainValidationStatus {
  overall: 'valid' | 'invalid' | 'unknown';
  routes: Array<{
    route: string;
    valid: boolean;
    reason?: string;
    error?: string;
  }>;
}

export interface Tag {
  id: string;
  name: string;
  domain_id?: string;
  color?: string;
  created_at: number;
}

export interface Category {
  id: string;
  name: string;
  domain_id?: string;
  icon?: string;
  created_at: number;
}

export interface User {
  id: string;
  email?: string;
  username?: string;
  password_hash?: string;
  cloudflare_access_id?: string;
  role: 'admin' | 'user' | 'analyst' | 'owner'; // owner kept for backward compatibility
  preferences?: string; // JSON string
  created_at: number;
  updated_at: number;
  last_login_at?: number;
  // MFA fields
  mfa_enabled?: number; // 0 or 1 (SQLite boolean)
  mfa_secret?: string;
  mfa_backup_codes?: string; // JSON array of backup codes
  refresh_token_enabled?: number; // 0 or 1 (SQLite boolean)
  // Multi-user system
  global_access?: number; // 0 or 1 (SQLite boolean) - 1 = access to all domains
  permission_version?: number; // Incremented when domain access changes (for cache invalidation)
}

export interface UserDomain {
  user_id: string;
  domain_id: string;
  created_at: number;
}

export interface AnalyticsDaily {
  id: string;
  link_id: string;
  date: string; // YYYY-MM-DD
  clicks: number;
  unique_visitors: number;
  created_at: number;
}

export interface AnalyticsGeo {
  id: string;
  link_id: string;
  country?: string;
  city?: string;
  clicks: number;
  date: string;
}

export interface AnalyticsReferrer {
  id: string;
  link_id: string;
  referrer_domain?: string;
  clicks: number;
  date: string;
}

export interface AnalyticsDevice {
  id: string;
  link_id: string;
  device_type: string | null; // desktop, mobile, tablet
  browser: string | null;
  os: string | null;
  date: string; // YYYY-MM-DD
  clicks: number;
  unique_visitors: number;
  created_at: number;
}

export interface AnalyticsUtm {
  id: string;
  link_id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  date: string; // YYYY-MM-DD
  clicks: number;
  unique_visitors: number;
  created_at: number;
}

export interface AnalyticsCustomParam {
  id: string;
  link_id: string;
  param_name: string; // 'custom_param1', 'custom_param2', 'custom_param3'
  param_value: string | null;
  date: string; // YYYY-MM-DD
  clicks: number;
  unique_visitors: number;
  created_at: number;
}

export interface ClickEvent {
  timestamp: number;
  link_id: string;
  domain: string;
  slug: string;
  destination_url: string;
  country: string;
  city: string;
  user_agent: string;
  referrer: string;
  ip_address: string; // hashed
  device_type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  // Additional tracking parameters
  gclid?: string; // Google Click ID
  fbclid?: string; // Facebook Click ID
  msclkid?: string; // Microsoft Click ID
  ttclid?: string; // TikTok Click ID
  li_fat_id?: string; // LinkedIn Click ID
  twclid?: string; // Twitter Click ID
  custom_param1?: string;
  custom_param2?: string;
  custom_param3?: string;
}

export interface CachedLink {
  destination_url: string;
  redirect_code: number;
  status: string;
  expires_at?: number;
  password_hash?: string;
  link_id?: string; // Link ID for tracking
  geo_redirects?: Record<string, string>; // { "US": "https://...", "GB": "https://..." }
  device_redirects?: {
    desktop?: string;
    mobile?: string;
    tablet?: string;
  };
  route?: string; // The specific route this link is assigned to (for strict routing)
  domain_routing_path?: string; // The domain's default routing path (for legacy strict routing check)
}

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  ANALYTICS: AnalyticsEngineDataset;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  ACCESS_AUDIENCE_TAG?: string;
  JWT_SECRET?: string;
  ENVIRONMENT?: string;
  LOG_LEVEL?: string;
  CACHE_TTL?: string;
  MAX_LINKS_PER_DOMAIN?: string;
  // First user setup (secure)
  SETUP_TOKEN?: string; // Required token to create first user
  FIRST_USER_USERNAME?: string; // Optional: auto-create first user from env
  FIRST_USER_EMAIL?: string; // Optional: auto-create first user from env
  FIRST_USER_PASSWORD?: string; // Optional: auto-create first user from env
  // Analytics configuration
  ANALYTICS_DATASET_NAME?: string; // Analytics Engine dataset name (default: "link-clicks")
  ANALYTICS_ENGINE_THRESHOLD_DAYS?: string; // Days threshold for using Analytics Engine (default: "89")
  ANALYTICS_AGGREGATION_THRESHOLD_DAYS?: string; // Days threshold for aggregation (default: "90")
  ANALYTICS_AGGREGATION_ENABLED?: string; // "true" or "false" (default: check settings table)
  // Rate limiting (optional - defaults will be used if not set)
  RATE_LIMIT_API_KEY?: string; // Default: 100 requests/minute
  RATE_LIMIT_USER?: string; // Default: 100 requests/minute
  RATE_LIMIT_IP?: string; // Default: 20 requests/minute
  // Auth rate limiting (optional - for brute-force protection)
  FAILED_AUTH_LIMIT?: string; // Default: 5 attempts
  FAILED_AUTH_WINDOW?: string; // Default: 7200 seconds (2 hours)
}

// Extended user type for context (includes cached domain access)
export interface ContextUser {
  id: string;
  username?: string;
  email?: string;
  role: string;
  global_access?: boolean;
  accessible_domain_ids?: string[];
}

// Session type reference (defined in services/session.ts)
export interface SessionData {
  user_id: string;
  username: string;
  email?: string;
  role: string;
  created_at: number;
  accessible_domain_ids?: string[];
  global_access?: boolean;
  permission_version?: number;
  cached_at?: number;
}

export interface Variables {
  user?: ContextUser;
  apiKey?: ApiKeyContext;
  csrfToken?: string;
  nonce?: string;
  session?: SessionData;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  ip_whitelist?: string; // JSON string of IP addresses
  allow_all_ips: number; // 0 or 1 (SQLite boolean)
  expires_at?: number;
  last_used_at?: number;
  created_at: number;
  updated_at: number;
  status: 'active' | 'revoked' | 'expired';
  // Virtual fields (not in DB, computed at runtime)
  domain_ids?: string[];
  domains?: Domain[];
}

export interface ApiKeyCreateRequest {
  name: string;
  domain_ids?: string[]; // Array of domain IDs (empty array = all domains)
  ip_whitelist?: string[]; // Array of IP addresses (empty array = all IPs)
  allow_all_ips?: boolean; // If true, ignores ip_whitelist
  expires_at?: number | null; // Unix timestamp (null = never expires, undefined = not provided)
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  key_prefix: string; // Only show prefix, never full key
  domain_ids?: string[];
  ip_whitelist?: string[];
  allow_all_ips: boolean;
  expires_at?: number;
  last_used_at?: number;
  created_at: number;
  status: 'active' | 'revoked' | 'expired';
  domains?: Domain[];
  // Only returned on creation:
  api_key?: string; // Full key shown ONLY once on creation
}

export interface ApiKeyContext {
  api_key_id: string;
  user_id: string;
  domain_ids?: string[];
  allow_all_ips: boolean;
  ip_whitelist?: string[];
}

// Status Check Types
export interface StatusCheckFrequency {
  value: number;        // e.g., 7, 14, 30
  unit: 'days' | 'weeks';  // 'days' or 'weeks'
}

export interface StatusCheckSettings {
  frequency: StatusCheckFrequency;
  enabled: boolean;
  check_top_100_daily: boolean; // Check top 100 links by clicks daily
  batch_size: number; // Number of links to check per cron run
  last_updated_at: number;
  last_updated_by?: string;
}

export interface StatusCheckResult {
  link_id: string;
  destination_url: string;
  status_code: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  checked_at: number;
}

export interface LinkWithStatusCheck extends Link {
  last_status_check_at?: number;
  last_status_code?: number;
  next_status_check_at?: number;
}

// Helper function to convert frequency to milliseconds
export function getFrequencyInMs(frequency: StatusCheckFrequency): number {
  const days = frequency.unit === 'weeks' ? frequency.value * 7 : frequency.value;
  return days * 24 * 60 * 60 * 1000;
}

// Helper function to format frequency label
export function getFrequencyLabel(frequency: StatusCheckFrequency): string {
  const unitLabel = frequency.value === 1
    ? (frequency.unit === 'weeks' ? 'Week' : 'Day')
    : (frequency.unit === 'weeks' ? 'Weeks' : 'Days');
  return `Every ${frequency.value} ${unitLabel}`;
}

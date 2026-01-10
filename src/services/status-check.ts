/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Status check service for monitoring link destination URLs

import type { Env, Link, StatusCheckResult } from '../types';
import { getFrequencyInMs } from '../types';
import {
  getLinksForStatusCheck,
  getTopLinksForDailyCheck,
  updateLinkStatusCheck,
  recordStatusCheck,
} from '../db/links';
import { getStatusCheckFrequencyOrDefault } from '../db/settings';
import { generateId } from '../utils/id';

// Check a single link's status
export async function checkLinkStatus(
  url: string,
  timeout: number = 10000
): Promise<Omit<StatusCheckResult, 'link_id' | 'checked_at'>> {
  const startTime = Date.now();
  let statusCode: number | null = null;
  let errorMessage: string | null = null;

  try {
    // Use HEAD request first (faster, less bandwidth)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // First, check if the URL redirects without following redirects
      // This helps us identify if a URL is redirecting (301/302) vs actually returning 404
      let initialResponse: Response | null = null;
      try {
        initialResponse = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'manual', // Don't follow redirects initially
          headers: {
            'User-Agent': 'LinkShortener-StatusChecker/1.0',
          },
        });
      } catch (manualError: any) {
        // If manual redirect fails, try with follow
        // Some environments don't support manual redirect mode
        initialResponse = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'follow',
          headers: {
            'User-Agent': 'LinkShortener-StatusChecker/1.0',
          },
        });
      }

      // If we got a redirect status (301, 302, 307, 308), follow it to get final status
      if (initialResponse && (initialResponse.status === 301 || initialResponse.status === 302 ||
        initialResponse.status === 307 || initialResponse.status === 308)) {
        // This is a redirect - follow it to get the final destination status
        const redirectUrl = initialResponse.headers.get('Location');
        if (redirectUrl) {
          try {
            // Resolve relative URLs
            const resolvedUrl = redirectUrl.startsWith('http')
              ? redirectUrl
              : new URL(redirectUrl, url).toString();

            const finalResponse = await fetch(resolvedUrl, {
              method: 'HEAD',
              signal: controller.signal,
              redirect: 'follow',
              headers: {
                'User-Agent': 'LinkShortener-StatusChecker/1.0',
              },
            });
            statusCode = finalResponse.status;
          } catch (redirectError: any) {
            // If following redirect fails, the redirect itself is valid (301/302)
            // So we'll use the redirect status code as valid
            statusCode = initialResponse.status;
          }
        } else {
          // No Location header, use redirect status
          statusCode = initialResponse.status;
        }
      } else if (initialResponse) {
        // Not a redirect, use the status code directly
        statusCode = initialResponse.status;
      }
    } catch (headError: any) {
      // If HEAD fails, try GET (some servers don't support HEAD)
      if (headError.name !== 'AbortError') {
        try {
          // Try with manual redirect first
          let getResponse: Response | null = null;
          try {
            getResponse = await fetch(url, {
              method: 'GET',
              signal: controller.signal,
              redirect: 'manual',
              headers: {
                'User-Agent': 'LinkShortener-StatusChecker/1.0',
              },
            });
          } catch (manualError: any) {
            // Fall back to following redirects
            getResponse = await fetch(url, {
              method: 'GET',
              signal: controller.signal,
              redirect: 'follow',
              headers: {
                'User-Agent': 'LinkShortener-StatusChecker/1.0',
              },
            });
          }

          if (getResponse) {
            // Check if it's a redirect
            if (getResponse.status === 301 || getResponse.status === 302 ||
              getResponse.status === 307 || getResponse.status === 308) {
              const redirectUrl = getResponse.headers.get('Location');
              if (redirectUrl) {
                try {
                  // Resolve relative URLs
                  const resolvedUrl = redirectUrl.startsWith('http')
                    ? redirectUrl
                    : new URL(redirectUrl, url).toString();

                  const finalResponse = await fetch(resolvedUrl, {
                    method: 'GET',
                    signal: controller.signal,
                    redirect: 'follow',
                    headers: {
                      'User-Agent': 'LinkShortener-StatusChecker/1.0',
                    },
                  });
                  statusCode = finalResponse.status;
                } catch (redirectError: any) {
                  // Redirect is valid even if final destination can't be reached
                  statusCode = getResponse.status;
                }
              } else {
                statusCode = getResponse.status;
              }
            } else {
              statusCode = getResponse.status;
            }
          }
        } catch (getError: any) {
          throw getError;
        }
      } else {
        throw headError;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    errorMessage = error.message || 'Unknown error';

    // Categorize errors
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      errorMessage = 'Request timeout';
    } else if (error.message?.includes('Failed to fetch') || error.message?.includes('network')) {
      errorMessage = 'Network error';
    } else if (error.message?.includes('DNS')) {
      errorMessage = 'DNS resolution failed';
    } else if (error.message?.includes('SSL') || error.message?.includes('certificate')) {
      errorMessage = 'SSL certificate error';
    } else if (error.message?.includes('CORS')) {
      errorMessage = 'CORS error - may be redirecting';
    }
  }

  const responseTimeMs = Date.now() - startTime;

  return {
    destination_url: url,
    status_code: statusCode,
    response_time_ms: responseTimeMs,
    error_message: errorMessage,
  };
}

// Check a batch of links
export async function checkLinksBatch(
  links: Link[],
  env: Env,
  frequencyMs: number
): Promise<StatusCheckResult[]> {
  const results: StatusCheckResult[] = [];
  const rateLimitDelay = 100; // 100ms between requests (10 requests/second)

  // OPTIMIZATION: Collect all statements for batch execution
  const updateStatements: any[] = [];
  const historyStatements: any[] = [];

  for (const link of links) {
    try {
      // Check status
      const checkResult = await checkLinkStatus(link.destination_url);

      const fullResult: StatusCheckResult = {
        link_id: link.id,
        destination_url: link.destination_url,
        status_code: checkResult.status_code,
        response_time_ms: checkResult.response_time_ms,
        error_message: checkResult.error_message,
        checked_at: Date.now(),
      };

      // Prepare update statement (instead of executing immediately)
      const now = Date.now();
      const nextCheckAt = now + frequencyMs;
      updateStatements.push(
        env.DB.prepare(
          `UPDATE links 
           SET last_status_check_at = ?,
               last_status_code = ?,
               next_status_check_at = ?,
               updated_at = ?
           WHERE id = ?`
        ).bind(now, checkResult.status_code, nextCheckAt, now, link.id)
      );

      // Prepare history statement (instead of executing immediately)
      const historyId = generateId('status_check');
      historyStatements.push(
        env.DB.prepare(
          `INSERT INTO link_status_checks 
           (id, link_id, destination_url, status_code, checked_at, response_time_ms, error_message)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          historyId,
          link.id,
          link.destination_url,
          checkResult.status_code,
          now,
          checkResult.response_time_ms,
          checkResult.error_message
        )
      );

      results.push(fullResult);

      // Rate limiting: wait between requests
      if (links.indexOf(link) < links.length - 1) {
        await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
      }
    } catch (error: any) {
      // Log error but continue with other links
      const errorResult: StatusCheckResult = {
        link_id: link.id,
        destination_url: link.destination_url,
        status_code: null,
        response_time_ms: null,
        error_message: error.message || 'Check failed',
        checked_at: Date.now(),
      };

      results.push(errorResult);
    }
  }

  // Execute all database operations in a single batch
  const allStatements = [...updateStatements, ...historyStatements];
  const BATCH_SIZE = 500;

  if (allStatements.length > 0) {
    for (let i = 0; i < allStatements.length; i += BATCH_SIZE) {
      const batch = allStatements.slice(i, i + BATCH_SIZE);
      try {
        await env.DB.batch(batch);
      } catch (error) {
        console.error(`[STATUS CHECK] Batch execution failed for batch starting at index ${i}:`, error);
        // Continue despite error - status checks are not critical for redirect functionality
      }
    }
  }

  return results;
}

// Main function to process scheduled status checks
export async function processScheduledStatusCheck(
  env: Env,
  batchSize?: number
): Promise<{ checked: number; results: StatusCheckResult[] }> {
  // Get frequency setting
  const settings = await getStatusCheckFrequencyOrDefault(env);

  // Check if status checking is enabled
  if (!settings.enabled) {
    return { checked: 0, results: [] };
  }

  // Use batch_size from settings if not provided
  const effectiveBatchSize = batchSize ?? settings.batch_size;

  // Get frequency in milliseconds
  const frequencyMs = getFrequencyInMs(settings.frequency);

  // Get links that need checking
  const links = await getLinksForStatusCheck(env, effectiveBatchSize);

  if (links.length === 0) {
    return { checked: 0, results: [] };
  }

  // Check the batch
  const results = await checkLinksBatch(links, env, frequencyMs);

  return {
    checked: results.length,
    results,
  };
}

// Process daily top 100 links check
export async function processDailyTop100Check(
  env: Env
): Promise<{ checked: number; results: StatusCheckResult[] }> {
  // Get frequency setting
  const settings = await getStatusCheckFrequencyOrDefault(env);

  // Check if daily top 100 checking is enabled
  if (!settings.check_top_100_daily) {
    return { checked: 0, results: [] };
  }

  // Get top 100 links by click count
  const links = await getTopLinksForDailyCheck(env, 100);

  if (links.length === 0) {
    return { checked: 0, results: [] };
  }

  // Use 1 day as frequency for daily checks (24 hours)
  const dailyFrequencyMs = 24 * 60 * 60 * 1000;

  // Check the batch
  const results = await checkLinksBatch(links, env, dailyFrequencyMs);

  return {
    checked: results.length,
    results,
  };
}


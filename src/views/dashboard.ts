/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { html } from '../utils/html';
import { ASSET_VERSION } from '../utils/constants';
import { LOGO_DATA_URI } from '../utils/logo';

export function dashboardHtml(csrfToken: string, nonce: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="csrf-token" content="${csrfToken}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenShort.link - Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js" nonce="${nonce}"></script>
  <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js" nonce="${nonce}"></script>
  <link rel="stylesheet" href="/dashboard/static/base.css?v=${ASSET_VERSION}">
  <link rel="stylesheet" href="/dashboard/static/dark-mode.css?v=${ASSET_VERSION}">
  <link rel="stylesheet" href="/dashboard/static/components.css?v=${ASSET_VERSION}">
  <script src="/dashboard/static/utils/api-client.js?v=${ASSET_VERSION}"></script>
  <script src="/dashboard/static/utils/toast.js?v=${ASSET_VERSION}"></script>
  <script src="/dashboard/static/utils/pagination.js?v=${ASSET_VERSION}"></script>
</head>
<body>
  <div id="app">
    <nav class="navbar">
      <div class="nav-brand"><a href="https://openshort.link/" target="_blank" rel="noopener" style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: 0; line-height: 0;"><img src="${LOGO_DATA_URI}" alt="OpenShort.link" style="height: 120px; width: auto; display: block; margin: 0; padding: 0; vertical-align: top;" /></a></div>
      <div class="nav-items">
        <select id="domain-selector" class="domain-selector">
          <option value="">Select Domain</option>
        </select>
        <button id="theme-toggle" class="btn btn-secondary" aria-label="Toggle Dark Mode">🌙</button>
        <button id="logout-btn" class="btn btn-secondary">Logout</button>
      </div>
    </nav>
    <div class="container">
      <button class="sidebar-toggle" id="sidebar-toggle" aria-label="Toggle sidebar">Hide Sidebar</button>
      <aside class="sidebar" id="sidebar">
        <nav class="sidebar-nav">
          <a href="#dashboard" class="nav-link active" data-page="dashboard">Dashboard</a>
          <div class="nav-link" id="analytics-nav-link" data-page="analytics">
            <span>Analytics</span>
            <span class="nav-link-toggle">▶</span>
          </div>
          <div class="nav-submenu" id="analytics-submenu">
            <a href="#analytics" class="nav-submenu-link" data-page="analytics">Overview</a>
            <a href="#analytics-geography" class="nav-submenu-link" data-page="analytics-geography">Geography</a>
            <a href="#analytics-devices" class="nav-submenu-link" data-page="analytics-devices">Devices</a>
            <a href="#analytics-referrers" class="nav-submenu-link" data-page="analytics-referrers">Referrers</a>
            <a href="#analytics-utm" class="nav-submenu-link" data-page="analytics-utm">UTM Campaigns</a>
            <a href="#analytics-custom-params" class="nav-submenu-link" data-page="analytics-custom-params">Custom Parameters</a>
            <a href="#analytics-os" class="nav-submenu-link" data-page="analytics-os">Operating Systems</a>
            <a href="#analytics-browsers" class="nav-submenu-link" data-page="analytics-browsers">Browsers</a>
          </div>
          <a href="#status-monitor" class="nav-link" data-page="status-monitor">Link Monitor</a>
          <div class="nav-link" id="integrations-nav-link" data-page="integrations">
            <span>Integrations</span>
            <span class="nav-link-toggle">▶</span>
          </div>
          <div class="nav-submenu" id="integrations-submenu">
            <a href="https://openshort.link/integration" class="external-nav-link" target="_blank" rel="noopener" style="padding: 0.5rem 1rem; text-decoration: none; color: var(--sidebar-text); opacity: 0.8; border-radius: 6px; transition: all 0.2s; font-size: 0.9rem; display: block;">App Integration <span style="font-size: 0.7em; opacity: 0.7;">↗</span></a>
            <a href="#integrations" class="nav-submenu-link" data-page="integrations">API Keys</a>
            <a href="#manual-integration" class="nav-submenu-link" data-page="manual-integration">Manual Integration</a>
          </div>
          <a href="#domains" class="nav-link" data-page="domains">Domains</a>
          <div class="nav-link" id="settings-nav-link" data-page="settings">
            <span>Settings</span>
            <span class="nav-link-toggle">▶</span>
          </div>
          <div class="nav-submenu" id="settings-submenu">
            <a href="#settings-account-info" class="nav-submenu-link" data-page="settings-account-info">Account Information</a>
            <a href="#settings-security" class="nav-submenu-link" data-page="settings-security">Security</a>
            <a href="#settings-status-check" class="nav-submenu-link" data-page="settings-status-check">Status Check Configuration</a>
            <a href="#settings-analytics-aggregation" class="nav-submenu-link" data-page="settings-analytics-aggregation" id="settings-analytics-aggregation-link" style="display: none;">Analytics Aggregation</a>
            <a href="#settings-user-management" class="nav-submenu-link" data-page="settings-user-management" id="settings-user-management-link" style="display: none;">User Management</a>
            <a href="#settings-audit-log" class="nav-submenu-link" data-page="settings-audit-log">Audit Log</a>
          </div>
          <a href="#help" class="nav-link" data-page="help">Help</a>
        </nav>
      </aside>
      <main class="main-content">
        <div id="dashboard-page" class="page active">
          <h1>Dashboard</h1>

          <div style="margin-top: 2rem;">
            <div class="page-header">
              <h2>Link Management</h2>
              <div style="display: flex; gap: 0.5rem;">
                <button id="import-links-btn" class="btn btn-secondary">Import CSV</button>
                <button id="export-links-btn" class="btn btn-secondary">Export CSV</button>
                <button id="create-link-btn" class="btn btn-primary">Create Link</button>
              </div>
            </div>
            <div class="filters">
              <input type="text" id="search-input" placeholder="Search links..." class="search-input">
              <div class="searchable-dropdown" style="position: relative;">
                <input type="text" id="tag-filter-search" class="filter-select" placeholder="Search tags..." autocomplete="off" style="width: 100%;">
                <div id="tag-filter-dropdown" class="dropdown-list" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ddd; border-radius: 4px; max-height: 200px; overflow-y: auto; z-index: 1000; margin-top: 0.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <div class="dropdown-item" data-value="" style="padding: 0.5rem; cursor: pointer; border-bottom: 1px solid #f0f0f0;">All Tags</div>
                </div>
                <input type="hidden" id="tag-filter" value="">
              </div>
              <div class="searchable-dropdown" style="position: relative;">
                <input type="text" id="category-filter-search" class="filter-select" placeholder="Search categories..." autocomplete="off" style="width: 100%;">
                <div id="category-filter-dropdown" class="dropdown-list" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ddd; border-radius: 4px; max-height: 200px; overflow-y: auto; z-index: 1000; margin-top: 0.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <div class="dropdown-item" data-value="" style="padding: 0.5rem; cursor: pointer; border-bottom: 1px solid #f0f0f0;">All Categories</div>
                </div>
                <input type="hidden" id="category-filter" value="">
              </div>
              <button id="manage-tags-btn" class="btn btn-secondary" style="white-space: nowrap;">Manage Tags</button>
              <button id="manage-categories-btn" class="btn btn-secondary" style="white-space: nowrap;">Manage Categories</button>
            </div>
            <div class="pagination-controls-top">
              <div class="per-page-selector">
                <label for="links-per-page">Per page:</label>
                <select id="links-per-page" class="per-page-select">
                  <option value="10">10</option>
                  <option value="50" selected>50</option>
                  <option value="100">100</option>
                  <option value="500">500</option>
                </select>
              </div>
              <div class="pagination-info" id="links-pagination-info"></div>
            </div>
            <div class="table-container">
              <table id="links-table" class="data-table">
                <thead>
                  <tr>
                    <th class="resizable-column" data-column="shortUrl" style="width: var(--col-short-url-width, 300px); position: relative; min-width: 150px; max-width: 600px;">Short URL<div class="resize-handle" data-column="shortUrl"></div></th>
                    <th class="resizable-column" data-column="destination" style="width: var(--col-destination-width, 400px); position: relative; min-width: 200px; max-width: 800px;">Destination<div class="resize-handle" data-column="destination"></div></th>
                    <th style="width: 80px;">Clicks</th>
                    <th style="width: 100px;">Status</th>
                    <th style="width: 150px;">Category</th>
                    <th style="width: 120px;">Created</th>
                    <th style="width: 280px;">Actions</th>
                  </tr>
                </thead>
                <tbody id="links-tbody">
                  <tr><td colspan="7">Loading...</td></tr>
                </tbody>
              </table>
            </div>
            <div class="pagination-controls" id="links-pagination"></div>
          </div>
        </div>
        <div id="analytics-page" class="page">
          <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h1 style="margin: 0;">Analytics Overview</h1>
          </div>
          
          <div class="analytics-controls" style="margin-top: 1.5rem;">
            <div class="filters" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; margin-bottom: 1rem;">
              <div class="searchable-dropdown" style="position: relative;">
                <input type="text" id="analytics-domain-filter-search" class="filter-select" placeholder="Filter by domain..." autocomplete="off" style="width: 100%;">
                <div id="analytics-domain-filter-dropdown" class="dropdown-list" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 4px; max-height: 200px; overflow-y: auto; z-index: 1000; margin-top: 0.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <div class="dropdown-item" data-value="" style="padding: 0.5rem; cursor: pointer; border-bottom: 1px solid var(--border-color);">All Domains</div>
                </div>
                <input type="hidden" id="analytics-domain-filter" value="">
              </div>
              
              <div class="searchable-dropdown" style="position: relative;">
                <input type="text" id="analytics-tag-filter-search" class="filter-select" placeholder="Filter by tag..." autocomplete="off" style="width: 100%;">
                <div id="analytics-tag-filter-dropdown" class="dropdown-list" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 4px; max-height: 200px; overflow-y: auto; z-index: 1000; margin-top: 0.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <div class="dropdown-item" data-value="" style="padding: 0.5rem; cursor: pointer; border-bottom: 1px solid var(--border-color);">All Tags</div>
                </div>
                <input type="hidden" id="analytics-tag-filter" value="">
              </div>
              
              <div class="searchable-dropdown" style="position: relative;">
                <input type="text" id="analytics-category-filter-search" class="filter-select" placeholder="Filter by category..." autocomplete="off" style="width: 100%;">
                <div id="analytics-category-filter-dropdown" class="dropdown-list" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 4px; max-height: 200px; overflow-y: auto; z-index: 1000; margin-top: 0.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <div class="dropdown-item" data-value="" style="padding: 0.5rem; cursor: pointer; border-bottom: 1px solid var(--border-color);">All Categories</div>
                </div>
                <input type="hidden" id="analytics-category-filter" value="">
              </div>
            </div>
            
            <div class="date-range-selector" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <label>Date Range:</label>
              <input type="date" id="analytics-start-date" class="date-input">
              <span>to</span>
              <input type="date" id="analytics-end-date" class="date-input">
              <button class="btn btn-primary" id="analytics-apply-btn">Apply Filters</button>
              <button class="btn btn-secondary" id="analytics-export-btn">Export CSV</button>
            </div>
            
            <div class="quick-ranges" style="margin-top: 0.75rem;">
              <button class="btn btn-sm btn-secondary" data-range="7d">Last 7 Days</button>
              <button class="btn btn-sm btn-secondary" data-range="30d">Last 30 Days</button>
              <button class="btn btn-sm btn-secondary" data-range="90d">Last 90 Days</button>
              <button class="btn btn-sm btn-secondary" data-range="all">All Time</button>
            </div>
          </div>

          <!-- Analytics Content (Grid Layout) -->
          <div id="analytics-content" style="margin-top: 2rem;">
            <p style="text-align: center; color: var(--secondary-color); padding: 2rem;">Click "Apply Filters" to load analytics data</p>
          </div>
        </div>
        <div id="link-analytics-page" class="page">
          <div class="page-header" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <button class="btn btn-secondary" id="link-analytics-back-btn">← Back to Links</button>
            </div>
            <div style="text-align: center;">
              <h1 style="margin: 0;">Link Analytics</h1>
              <p id="link-analytics-url" style="margin: 0.5rem 0 0 0; color: var(--secondary-color); font-size: 0.9rem;"></p>
            </div>
            <div></div>
          </div>
          
          <div class="analytics-controls">
            <div class="date-range-selector">
              <label>Date Range:</label>
              <input type="date" id="link-analytics-start-date" class="date-input">
              <span>to</span>
              <input type="date" id="link-analytics-end-date" class="date-input">
              <button class="btn btn-primary" id="link-analytics-apply-btn">Apply</button>
              <button class="btn btn-secondary" id="link-analytics-export-btn">Export CSV</button>
            </div>
            <div class="quick-ranges">
              <button class="btn btn-sm btn-secondary" data-range="7d">Last 7 Days</button>
              <button class="btn btn-sm btn-secondary" data-range="30d">Last 30 Days</button>
              <button class="btn btn-sm btn-secondary" data-range="90d">Last 90 Days</button>
              <button class="btn btn-sm btn-secondary" data-range="all">All Time</button>
            </div>
          </div>


          <!-- Analytics Sections (Grid Layout) -->
          <div id="link-analytics-content">
            <!-- All sections will be rendered here in grid layout -->
          </div>
        </div>
        <div id="analytics-geography-page" class="page">
          <h1>Geography Analytics</h1>
          <div id="analytics-geography-filters" class="analytics-breakdown-filters"></div>
          <div id="analytics-geography-content"><p>Loading geography analytics...</p></div>
        </div>
        <div id="analytics-devices-page" class="page">
          <h1>Devices Analytics</h1>
          <div id="analytics-devices-filters" class="analytics-breakdown-filters"></div>
          <div id="analytics-devices-content"><p>Loading devices analytics...</p></div>
        </div>
        <div id="analytics-referrers-page" class="page">
          <h1>Referrers Analytics</h1>
          <div id="analytics-referrers-filters" class="analytics-breakdown-filters"></div>
          <div id="analytics-referrers-content"><p>Loading referrers analytics...</p></div>
        </div>
        <div id="analytics-utm-page" class="page">
          <h1>UTM Campaigns Analytics</h1>
          <div id="analytics-utm-filters" class="analytics-breakdown-filters"></div>
          <div id="analytics-utm-content"><p>Loading UTM analytics...</p></div>
        </div>
        <div id="analytics-custom-params-page" class="page">
          <h1>Custom Parameters Analytics</h1>
          <div id="analytics-custom-params-filters" class="analytics-breakdown-filters"></div>
          <div id="analytics-custom-params-content"><p>Loading custom parameters analytics...</p></div>
        </div>
        <div id="analytics-os-page" class="page">
          <h1>Operating Systems Analytics</h1>
          <div id="analytics-os-filters" class="analytics-breakdown-filters"></div>
          <div id="analytics-os-content"><p>Loading OS analytics...</p></div>
        </div>
        <div id="analytics-browsers-page" class="page">
          <h1>Browsers Analytics</h1>
          <div id="analytics-browsers-filters" class="analytics-breakdown-filters"></div>
          <div id="analytics-browsers-content"><p>Loading browsers analytics...</p></div>
        </div>
        <div id="domains-page" class="page">
          <div class="page-header">
            <h1>Domains</h1>
            <button id="add-domain-btn" class="btn btn-primary">Add Domain</button>
          </div>
          <div id="domains-list"></div>
        </div>
        <div id="integrations-page" class="page">
          <div class="page-header">
            <h1>API Keys</h1>
            <button id="create-api-key-btn" class="btn btn-primary">Create API Key</button>
          </div>
          <div class="table-container">
            <table id="api-keys-table" class="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Key Prefix</th>
                  <th>Domains</th>
                  <th>IP Whitelist</th>
                  <th>Expires</th>
                  <th>Last Used</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="api-keys-tbody">
                <tr><td colspan="8">Loading...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div id="manual-integration-page" class="page">
          <div class="page-header">
            <div>
              <h1>Manual Integration</h1>
              <p style="margin-top: 0.5rem; color: var(--secondary-color);">API Documentation & Testing Playground</p>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: flex-start;">
              <button id="try-playground-btn" class="btn btn-primary">Try in Playground</button>
              <button id="copy-llm-txt-btn" class="btn btn-secondary">Copy LLM.txt</button>
              <button id="copy-openai-json-btn" class="btn btn-secondary">Copy openapi.json</button>
            </div>
          </div>
          
          <!-- Documentation Section -->
          <div style="margin-bottom: 3rem;">
            <h2 style="margin-bottom: 1.5rem; border-bottom: 2px solid #007bff; padding-bottom: 0.5rem;">API Documentation</h2>
            
            <!-- Authentication Section -->
            <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem;">
              <h3 style="margin-bottom: 1rem; color: #007bff;">🔐 Authentication</h3>
              <p style="margin-bottom: 1rem; color: #666;">All API requests require authentication using an API key in the Authorization header:</p>
              <div style="background: #f8f9fa; padding: 1rem; border-radius: 4px; border-left: 4px solid #007bff; margin-bottom: 1rem;">
                <code style="font-family: monospace; font-size: 0.9rem;">Authorization: Bearer &lt;your_api_key&gt;</code>
              </div>
              
              <p style="margin-bottom: 0.5rem; color: #666;"><strong>Base URL:</strong></p>
              <div style="background: #f8f9fa; padding: 1rem; border-radius: 4px; margin-bottom: 1.5rem;">
                <code id="api-base-url" style="font-family: monospace; font-size: 0.9rem;">/api/v1</code>
              </div>
              
              <details style="margin-bottom: 1rem;">
                <summary style="cursor: pointer; padding: 0.75rem; background: #f8f9fa; border-radius: 4px; font-weight: 600; color: #333; user-select: none;">
                  🔐 API Key Details - Click to expand/collapse
                </summary>
                <div style="padding: 1rem 0;">
                  <h4 style="margin: 1rem 0 0.5rem 0; color: #333;">📋 API Key Format</h4>
                  <p style="margin-bottom: 0.5rem; color: #666;">API keys follow this format:</p>
                  <div style="background: #f8f9fa; padding: 1rem; border-radius: 4px; margin-bottom: 1rem;">
                    <code style="font-family: monospace; font-size: 0.9rem;">sk_live_&lt;random_string&gt;</code>
                  </div>
                  <ul style="margin: 0.5rem 0 1.5rem 1.5rem; color: #666;">
                    <li><strong>sk_live_</strong> - Prefix indicating a live API key</li>
                    <li>Keys are shown only once during creation - store them securely</li>
                    <li>Keys are hashed in the database for security</li>
                  </ul>
                  
                  <h4 style="margin: 1.5rem 0 0.5rem 0; color: #333;">🌐 Domain Scoping</h4>
                  <p style="margin-bottom: 0.5rem; color: #666;">API keys can be scoped to specific domains:</p>
                  <ul style="margin: 0.5rem 0 1.5rem 1.5rem; color: #666;">
                    <li><strong>All Domains:</strong> Leave domain_ids empty during creation</li>
                    <li><strong>Specific Domains:</strong> Provide array of domain IDs to restrict access</li>
                    <li>Scoped keys can only access resources within assigned domains</li>
                  </ul>
                  
                  <h4 style="margin: 1.5rem 0 0.5rem 0; color: #333;">🔒 IP Whitelisting</h4>
                  <p style="margin-bottom: 0.5rem; color: #666;">Control which IPs can use your API key:</p>
                  <ul style="margin: 0.5rem 0 0 1.5rem; color: #666;">
                    <li><strong>Allow All IPs:</strong> Set <code>allow_all_ips: true</code></li>
                    <li><strong>Whitelist Specific IPs:</strong> Provide array of IP addresses in <code>ip_whitelist</code></li>
                    <li>Both IPv4 and IPv6 addresses are supported</li>
                  </ul>
                  
                  <h4 style="margin: 1.5rem 0 0.5rem 0; color: #333;">⚠️ Error Codes</h4>
                  <p style="margin-bottom: 1rem; color: #666;">All API responses follow a consistent format. Errors include a status code and descriptive message.</p>
                  
                  <h5 style="margin: 1rem 0 0.5rem 0; color: #555; font-size: 0.95rem;">Standard Error Codes</h5>
                  <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
                    <thead>
                      <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
                        <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Code</th>
                        <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Name</th>
                        <th style="padding: 0.75rem; text-align: left; font-weight: 600;">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style="border-bottom: 1px solid #dee2e6;">
                        <td style="padding: 0.75rem; font-family: monospace; color: #dc3545;">400</td>
                        <td style="padding: 0.75rem; font-weight: 500;">Bad Request</td>
                        <td style="padding: 0.75rem; color: #666;">Invalid parameters, validation errors, or malformed request</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #dee2e6;">
                        <td style="padding: 0.75rem; font-family: monospace; color: #dc3545;">401</td>
                        <td style="padding: 0.75rem; font-weight: 500;">Unauthorized</td>
                        <td style="padding: 0.75rem; color: #666;">Missing, invalid, or expired API key</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #dee2e6;">
                        <td style="padding: 0.75rem; font-family: monospace; color: #dc3545;">403</td>
                        <td style="padding: 0.75rem; font-weight: 500;">Forbidden</td>
                        <td style="padding: 0.75rem; color: #666;">Access denied to resource, domain not in scope, or insufficient permissions</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #dee2e6;">
                        <td style="padding: 0.75rem; font-family: monospace; color: #dc3545;">404</td>
                        <td style="padding: 0.75rem; font-weight: 500;">Not Found</td>
                        <td style="padding: 0.75rem; color: #666;">Resource doesn't exist or has been deleted</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #dee2e6;">
                        <td style="padding: 0.75rem; font-family: monospace; color: #dc3545;">408</td>
                        <td style="padding: 0.75rem; font-weight: 500;">Request Timeout</td>
                        <td style="padding: 0.75rem; color: #666;">Query took too long to execute (only for complex list operations)</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #dee2e6;">
                        <td style="padding: 0.75rem; font-family: monospace; color: #dc3545;">409</td>
                        <td style="padding: 0.75rem; font-weight: 500;">Conflict</td>
                        <td style="padding: 0.75rem; color: #666;">Resource already exists (e.g., slug, domain, tag, or category name)</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #dee2e6;">
                        <td style="padding: 0.75rem; font-family: monospace; color: #dc3545;">429</td>
                        <td style="padding: 0.75rem; font-weight: 500;">Too Many Requests</td>
                        <td style="padding: 0.75rem; color: #666;">Rate limit exceeded (applies to failed authentication attempts)</td>
                      </tr>
                      <tr>
                        <td style="padding: 0.75rem; font-family: monospace; color: #dc3545;">500</td>
                        <td style="padding: 0.75rem; font-weight: 500;">Internal Server Error</td>
                        <td style="padding: 0.75rem; color: #666;">Server-side error occurred</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </details>
              
              <div style="background: #fff3cd; padding: 1rem; border-radius: 4px; border-left: 4px solid #ffc107;">
                <p style="margin: 0; color: #856404;"><strong>⚠️ Security Requirements:</strong></p>
                <ul style="margin: 0.5rem 0 0 1.5rem; color: #856404;">
                  <li>API keys must be active and not expired</li>
                  <li>Your IP address must be whitelisted (if IP whitelist is enabled)</li>
                  <li>Domain scoping applies - you can only access domains assigned to your API key</li>
                  <li>Never expose API keys in client-side code or public repositories</li>
                </ul>
              </div>
            </div>

            
            <!-- Endpoints Documentation -->
            <div id="api-endpoints-docs"></div>
          </div>
          
          <!-- Playground Section -->
          <div>
            <h2 style="margin-bottom: 1.5rem; border-bottom: 2px solid #007bff; padding-bottom: 0.5rem;">API Playground</h2>
            
            <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- API Key Input -->
              <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">API Key</label>
                <input type="password" id="playground-api-key" placeholder="Enter your API key (sk_live_...)" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-family: monospace;">
                <div id="api-key-info" style="margin-top: 0.5rem; font-size: 0.875rem; color: #666; display: none;"></div>
              </div>
              
              <!-- Endpoint Selector -->
              <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Select Endpoint</label>
                <select id="playground-endpoint" style="width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px;">
                  <option value="">-- Select an endpoint --</option>
                </select>
              </div>
              
              <!-- Domain Scoping Warning -->
              <div id="domain-scoping-warning" style="display: none; margin-bottom: 1.5rem; background: #fff3cd; padding: 1rem; border-radius: 4px; border-left: 4px solid #ffc107;">
                <p style="margin: 0; color: #856404; font-weight: 600;">⚠️ Domain Scoping Active</p>
                <p style="margin: 0.5rem 0 0 0; color: #856404; font-size: 0.875rem;" id="domain-scoping-message">This API key is scoped to specific domains.</p>
              </div>
              
              <!-- Request Builder -->
              <div id="playground-request-builder" style="display: none; margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Request</label>
                
                <!-- Path Parameters -->
                <div id="playground-path-params" style="margin-bottom: 1rem; display: none;"></div>
                
                <!-- Query Parameters -->
                <div id="playground-query-params" style="margin-bottom: 1rem; display: none;"></div>
                
                <!-- Request Body -->
                <div id="playground-request-body" style="margin-bottom: 1rem; display: none;">
                  <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: #666;">Request Body (JSON)</label>
                  <textarea id="playground-body-editor" style="width: 100%; min-height: 200px; padding: 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 0.875rem;" placeholder='{"key": "value"}'></textarea>
                  <div id="body-validation-errors" style="margin-top: 0.5rem; display: none; background: #f8d7da; padding: 0.75rem; border-radius: 4px; border-left: 4px solid #dc3545;"></div>
                </div>
                
                <!-- Request Validation Errors -->
                <div id="request-validation-errors" style="margin-bottom: 1rem; display: none; background: #f8d7da; padding: 1rem; border-radius: 4px; border-left: 4px solid #dc3545;">
                  <p style="margin: 0 0 0.5rem 0; color: #721c24; font-weight: 600;">Validation Errors:</p>
                  <ul id="validation-errors-list" style="margin: 0; padding-left: 1.5rem; color: #721c24;"></ul>
                </div>
                
                <!-- File Upload -->
                <div id="playground-file-upload" style="margin-bottom: 1rem; display: none;">
                  <label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: #666;">File Upload</label>
                  <input type="file" id="playground-file-input" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <!-- Request Preview -->
                <div style="margin-bottom: 1rem;">
                  <label class="helper-text" style="display: block; margin-bottom: 0.5rem;">Request Preview</label>
                  <div class="playground-preview">
                    <div style="margin-bottom: 0.5rem;">
                      <strong>Method:</strong> <span id="playground-method" style="font-family: monospace; padding: 0.25rem 0.5rem; background: #007bff; color: white; border-radius: 3px; font-size: 0.75rem;"></span>
                    </div>
                    <div>
                      <strong>URL:</strong> <code id="playground-url" style="font-family: monospace; font-size: 0.875rem; word-break: break-all; color: var(--text-color);"></code>
                    </div>
                  </div>
                </div>
                
                <!-- Send Button -->
                <button id="playground-send-btn" class="btn btn-primary" disabled style="width: 100%; padding: 0.75rem;">
                  <span id="playground-send-text">Send Request</span>
                  <span id="playground-send-loading" style="display: none;">Sending...</span>
                </button>
              </div>
              
              <!-- Response Display -->
              <div id="playground-response" style="display: none; margin-top: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                  <label style="font-weight: 600; color: var(--text-color);">Response</label>
                  <div style="display: flex; gap: 0.5rem;">
                    <button id="copy-curl-btn" class="btn btn-secondary btn-sm">Copy cURL</button>
                    <button id="copy-response-btn" class="btn btn-secondary btn-sm">Copy Response</button>
                  </div>
                </div>
                <div class="playground-response-container">
                  <div style="margin-bottom: 0.5rem;">
                    <strong>Status:</strong> <span id="playground-status" style="padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.875rem; font-weight: 600;"></span>
                  </div>
                  <div id="playground-response-body" class="playground-response-body"></div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Request History Sidebar -->
          <div class="playground-history">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h3 style="margin: 0; color: var(--text-color);">Request History</h3>
              <button id="clear-history-btn" class="btn btn-secondary btn-sm">Clear History</button>
            </div>
            <div id="request-history-list" style="max-height: 300px; overflow-y: auto;">
              <p class="helper-text" style="text-align: center; padding: 1rem;">No requests yet. Send a request to see history.</p>
            </div>
          </div>
        </div>
        
        <!-- API Key Selection Modal -->
        <div id="api-key-selection-modal" class="modal">
          <div class="modal-content" style="max-width: 800px;">
            <span class="close" id="close-api-key-modal">&times;</span>
            <h2>Select API Key</h2>
            <div style="margin-bottom: 1rem;">
              <input type="text" id="api-key-search" placeholder="Search API keys..." style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div class="table-container" style="max-height: 400px; overflow-y: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Key Prefix</th>
                    <th>Domains</th>
                    <th>Expires</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody id="api-key-selection-tbody">
                  <tr><td colspan="6">Loading...</td></tr>
                </tbody>
              </table>
            </div>
            <div style="margin-top: 1rem; text-align: right;">
              <button id="cancel-api-key-selection" class="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
        
        <div id="tags-page" class="page">
          <div class="page-header" style="display: flex; align-items: center; justify-content: flex-start; gap: 1rem; margin-bottom: 1.5rem;">
            <button id="back-to-links-from-tags" class="btn btn-secondary" style="padding: 0.5rem 1rem;">← Back to Dashboard</button>
            <h1 style="margin: 0;">Manage Tags</h1>
          </div>
          <div id="create-tag-section" style="display: none; margin-bottom: 1rem; background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="margin-bottom: 1rem;">Create New Tag</h2>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <input type="text" id="new-tag-name" placeholder="Tag name" style="width: 250px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
              <input type="color" id="new-tag-color" value="#007bff" style="width: 80px; height: 40px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">
              <button id="create-tag-btn" class="btn btn-primary">Create</button>
            </div>
          </div>
          <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <div style="display: flex; align-items: center; gap: 1rem;">
                <h2 style="margin: 0;">All Tags</h2>
                <button id="toggle-create-tag-btn" class="btn btn-primary">+ Add New Tag</button>
              </div>
              <input type="text" id="tags-search" placeholder="Search tags..." style="padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; width: 250px;">
            </div>
            <div class="pagination-controls-top">
              <div class="per-page-selector">
                <label for="tags-per-page">Per page:</label>
                <select id="tags-per-page" class="per-page-select">
                  <option value="10">10</option>
                  <option value="50" selected>50</option>
                  <option value="100">100</option>
                  <option value="500">500</option>
                </select>
              </div>
              <div class="pagination-info" id="tags-pagination-info"></div>
            </div>
            <div id="tags-list" style="max-height: 500px; overflow-y: auto;"></div>
            <div class="pagination-controls" id="tags-pagination"></div>
          </div>
        </div>
        <div id="categories-page" class="page">
          <div class="page-header" style="display: flex; align-items: center; justify-content: flex-start; gap: 1rem; margin-bottom: 1.5rem;">
            <button id="back-to-links-from-categories" class="btn btn-secondary" style="padding: 0.5rem 1rem;">← Back to Dashboard</button>
            <h1 style="margin: 0;">Manage Categories</h1>
          </div>
          <div id="create-category-section" style="display: none; margin-bottom: 1rem; background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="margin-bottom: 1rem;">Create New Category</h2>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <input type="text" id="new-category-name" placeholder="Category name" style="width: 250px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
              <button id="create-category-btn" class="btn btn-primary">Create</button>
            </div>
          </div>
          <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <div style="display: flex; align-items: center; gap: 1rem;">
                <h2 style="margin: 0;">All Categories</h2>
                <button id="toggle-create-category-btn" class="btn btn-primary">+ Add New Category</button>
              </div>
              <input type="text" id="categories-search" placeholder="Search categories..." style="padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; width: 250px;">
            </div>
            <div class="pagination-controls-top">
              <div class="per-page-selector">
                <label for="categories-per-page">Per page:</label>
                <select id="categories-per-page" class="per-page-select">
                  <option value="10">10</option>
                  <option value="50" selected>50</option>
                  <option value="100">100</option>
                  <option value="500">500</option>
                </select>
              </div>
              <div class="pagination-info" id="categories-pagination-info"></div>
            </div>
            <div id="categories-list" style="max-height: 500px; overflow-y: auto;"></div>
            <div class="pagination-controls" id="categories-pagination"></div>
          </div>
        </div>
        <div id="status-monitor-page" class="page">
          <h1>Link Status Monitor</h1>
          <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem;">
            <h2 style="margin-bottom: 1rem;">Status Summary</h2>
            <div id="status-summary-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
              <div class="stat-card status-filter-card" style="cursor: pointer;" data-status="200">
                <h3>200 OK</h3>
                <p id="status-count-200">-</p>
              </div>
              <div class="stat-card status-filter-card" style="cursor: pointer;" data-status="404">
                <h3>404 Not Found</h3>
                <p id="status-count-404">-</p>
              </div>
              <div class="stat-card status-filter-card" style="cursor: pointer;" data-status="500">
                <h3>500 Error</h3>
                <p id="status-count-500">-</p>
              </div>

            </div>
          </div>
          <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
              <h2 style="margin: 0;">Links by Status</h2>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <select id="status-filter" style="padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                  <option value="">All Status Codes</option>
                  <option value="200">200 OK</option>
                  <option value="301">301 Redirect</option>
                  <option value="302">302 Redirect</option>
                  <option value="404">404 Not Found</option>
                  <option value="500">500 Error</option>

                </select>
                <select id="status-domain-filter" style="padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                  <option value="">All Domains</option>
                </select>
                <input type="text" id="status-search" placeholder="Search destination URL..." style="padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; width: 250px;">
                <button id="recheck-status-btn" class="btn btn-primary" style="display: none;">Recheck Selected</button>
              </div>
            </div>
            <div class="pagination-controls-top">
              <div class="per-page-selector">
                <label for="status-per-page">Per page:</label>
                <select id="status-per-page" class="per-page-select">
                  <option value="25" selected>25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
              <div class="pagination-info" id="status-pagination-info"></div>
            </div>
            <div id="status-links-list" style="max-height: 600px; overflow-y: auto;"></div>
            <div class="pagination-controls" id="status-pagination"></div>
          </div>
        </div>
        <div id="links-by-destination-page" class="page">
          <h1>Links by Destination URL</h1>
          <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem;">
            <div style="margin-bottom: 1rem;">
              <button class="btn btn-secondary" id="back-to-link-monitor-btn" style="margin-bottom: 1rem;">← Back to Link Monitor</button>
              <p id="destination-url-display" style="word-break: break-all; font-size: 1.1rem; color: #495057; margin: 0.5rem 0;"></p>
            </div>
            <div id="links-by-destination-list" style="max-height: 600px; overflow-y: auto;"></div>
            <div class="pagination-controls" id="links-by-destination-pagination"></div>
          </div>
        </div>
        <!-- Settings Pages - Each submenu is now a separate page -->
        <div id="settings-account-info-page" class="page">
          <h1>Account Information</h1>
          <div class="settings-content" id="account-info-content">
            <p>Loading account information...</p>
          </div>
        </div>
        <div id="settings-security-page" class="page">
          <h1>Security</h1>
          <div class="settings-content" id="security-content">
            <p>Loading security settings...</p>
          </div>
        </div>
        <div id="settings-status-check-page" class="page">
          <h1>Status Check Configuration</h1>
          <div class="settings-content" id="status-check-content">
            <p>Loading status check settings...</p>
          </div>
        </div>
        <div id="settings-analytics-aggregation-page" class="page">
          <h1>Analytics Aggregation</h1>
          <div class="settings-content" id="analytics-aggregation-content">
            <p>Loading analytics aggregation settings...</p>
          </div>
        </div>
        <div id="settings-user-management-page" class="page">
          <h1>User Management</h1>
          <div class="settings-content" id="user-management-content">
            <p>Loading user management...</p>
          </div>
        </div>
        <div id="settings-audit-log-page" class="page">
          <h1>Audit Log</h1>
          <div class="settings-content" id="audit-log-content">
            <p>Loading audit logs...</p>
          </div>
        </div>
        <div id="help-page" class="page">
          <div class="page-header">
            <h1>Help & Resources</h1>
          </div>
          <div class="settings-content" style="max-width: 800px;">
            <div style="margin-bottom: 2rem;">
               <h2>About <a href="https://openshort.link" target="_blank" style="text-decoration: none; color: inherit;">OpenShort.link</a></h2>
               <p style="margin-top: 0.5rem; line-height: 1.6;"><a href="https://openshort.link" target="_blank" style="text-decoration: none; color: var(--primary-color); font-weight: 500;">OpenShort.link</a> is an all-in-one, open-source link management platform built on Cloudflare Workers, offering high-performance redirects, comprehensive analytics, and multi domain.</p>

            </div>
            <div style="margin-bottom: 2rem;">
               <h2>Resources</h2>
               <ul style="list-style-type: none; padding: 0; margin-top: 0.5rem;">
                 <li style="margin-bottom: 0.75rem;"><a href="https://openshort.link/docs" target="_blank" style="text-decoration: none; color: var(--primary-color); display: flex; align-items: center; gap: 0.5rem; font-size: 1.05rem;">📚 Documentation</a></li>
                 <li style="margin-bottom: 0.75rem;"><a href="https://openshort.link/roadmap" target="_blank" style="text-decoration: none; color: var(--primary-color); display: flex; align-items: center; gap: 0.5rem; font-size: 1.05rem;">🗺️ Roadmap</a></li>
                 <li style="margin-bottom: 0.75rem;"><a href="https://github.com/idhamsy/openshortlink/issues" target="_blank" style="text-decoration: none; color: var(--primary-color); display: flex; align-items: center; gap: 0.5rem; font-size: 1.05rem;">🐛 Report a bug</a></li>
                  <li style="margin-bottom: 0.75rem;"><a href="https://openshort.link/updates" target="_blank" style="text-decoration: none; color: var(--primary-color); display: flex; align-items: center; gap: 0.5rem; font-size: 1.05rem;">🆕 Update to latest version</a></li>
                </ul>
            </div>

            <div style="margin-bottom: 2rem; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
               <div style="display: flex; align-items: center; gap: 0.75rem;">
                 <span style="font-size: 1.5rem;">🚀</span>
                 <h3 style="margin: 0; font-size: 1.25rem;">Support OpenShort.link</h3>
               </div>
               <p style="margin: 0; line-height: 1.6; color: var(--text-color); font-size: 1rem;">
                 Your support keeps OpenShort.link alive! This project is open-source and free to use. If you find it valuable, please consider giving us a star on GitHub or making a small donation. Your support directly helps us maintain infrastructure and develop new features for the community.
               </p>
               <div style="display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 0.5rem;">
                 <a href="https://github.com/idhamsy/openshortlink" target="_blank" class="btn btn-secondary" style="display: flex; align-items: center; gap: 0.5rem; border: 1px solid var(--border-color);">
                    <svg height="20" width="20" viewBox="0 0 16 16" fill="#e3b341"><path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.719-4.192-3.046-2.97a.75.75 0 01.416-1.28l4.21-.612L7.327.668A.75.75 0 018 .25z"></path></svg>
                    Star on GitHub
                 </a>
                 <a href="https://openshort.link/support-us" target="_blank" class="btn btn-primary" style="display: flex; align-items: center; gap: 0.5rem; background-color: #e91e63; border-color: #e91e63; color: white;">
                    💝 Donate
                 </a>
               </div>
            </div>

            <div style="margin-bottom: 2rem;">
               <h2>License</h2>
               <div style="padding: 1rem; background: var(--hover-bg); border-radius: 8px; border: 1px solid var(--border-color);">
                  <p style="margin-bottom: 0.5rem; font-weight: 600;">GNU Affero General Public License Version 3 (AGPL-3.0)</p>
                  <p style="margin-bottom: 0.5rem; color: var(--secondary-color); font-size: 0.9rem;">Copyright (c) 2025 OpenShort.link Contributors.</p>
                  <p style="font-size: 0.95rem; line-height: 1.5; color: var(--text-color);">The source code for OpenShort.link is available under the AGPL-3.0 license. This license guarantees your freedom to share and change all versions of a program, and requires that any network-deployed modifications must also be open-source.</p>
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
  <div id="create-link-modal" class="modal">
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Create Link</h2>
      <form id="create-link-form">
        <div class="form-group">
          <label for="link-domain">Domain</label>
          <select id="link-domain" required></select>
          <small id="domain-help-text" style="display: none; margin-top: 0.25rem; color: #ff6b6b; font-weight: 500;">⚠️ Domain is permanent. Create a new link to use a different domain.</small>
        </div>
        <div class="form-group">
          <label for="link-route">Route</label>
          <select id="link-route" required>
            <option value="">Select Route</option>
          </select>
          <small style="display: block; margin-top: 0.25rem; color: #666;">Select the path prefix for this link</small>
        </div>
        <div class="form-group">
          <label for="link-slug">Slug (optional)</label>
          <input type="text" id="link-slug" placeholder="Auto-generated if empty">
          <small id="slug-help-text" style="display: none; margin-top: 0.25rem; color: #ff6b6b; font-weight: 500;">⚠️ Slug is permanent. Create a new link for a different slug.</small>
        </div>
        <div class="form-group">
          <label for="link-url">Destination URL</label>
          <input type="url" id="link-url" required>
        </div>
        <div class="form-group">
          <label for="link-title">Title (Optional)</label>
          <input type="text" id="link-title">
        </div>
        <div class="form-group">
          <label for="link-description">Description (Optional)</label>
          <textarea id="link-description"></textarea>
        </div>
        <div class="form-group">
          <label for="link-redirect-code">Redirect Code</label>
          <select id="link-redirect-code">
            <option value="301">301 - Permanent (cached 1 year)</option>
            <option value="302">302 - Temporary (cached 1 hour)</option>
            <option value="307">307 - Temporary Redirect (cached 1 hour)</option>
            <option value="308">308 - Permanent Redirect (cached 1 year)</option>
          </select>
          <small style="display: block; margin-top: 0.25rem; color: #666;">
            <strong>301/308 (Permanent):</strong> Browsers cache for 1 year - use when destination won't change.<br>
            <strong>302/307 (Temporary):</strong> Browsers cache for 1 hour - use for temporary redirects or A/B testing.
          </small>
        </div>
        <div class="form-group">
          <label for="link-category">Category (optional)</label>
          <select id="link-category">
            <option value="">No Category</option>
          </select>
        </div>
        <div class="form-group" style="position: relative;">
          <label for="link-tags">Tags (optional)</label>
          <div id="link-tags-container" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;"></div>
          <input type="text" id="link-tags-input" placeholder="Type to search or create tags..." style="margin-top: 0.5rem; width: 100%;">
          <small style="display: block; margin-top: 0.25rem; color: #666;">Select existing tags or create new ones</small>
        </div>
        
        <!-- Geo Redirects Section -->
        <div class="form-group">
          <label>
            <input type="checkbox" id="geo-redirect-enabled">
            Enable Country-Specific Redirects
          </label>
          <small style="display: block; margin-top: 0.25rem; color: #666;">
            Redirect users to different URLs based on their country (max 10 countries)
          </small>
        </div>
        <div id="geo-redirects-section" style="display: none; margin-top: 1rem; background: #f8f9fa; padding: 1rem; border-radius: 4px;">
          <h4 style="margin: 0 0 0.5rem 0;">Country-Specific Redirects</h4>
          <p style="margin: 0 0 1rem 0; font-size: 0.875rem; color: #666;">
            Users from selected countries will be redirected to their specific URL. Others use the default URL above.
          </p>
          <div id="geo-redirects-list"></div>
          <button type="button" id="add-geo-redirect" class="btn btn-secondary" style="margin-top: 0.5rem;">
            + Add Country
          </button>
          <small id="geo-count" style="display: block; margin-top: 0.5rem; color: #666;">0 / 10 countries</small>
        </div>

        <!-- Device Redirects Section -->
        <div class="form-group">
          <label>
            <input type="checkbox" id="device-redirect-enabled">
            Enable Device-Specific Redirects
          </label>
          <small style="display: block; margin-top: 0.25rem; color: #666;">
            Redirect users to different URLs based on their device type
          </small>
        </div>
        <div id="device-redirects-section" style="display: none; margin-top: 1rem; background: #f8f9fa; padding: 1rem; border-radius: 4px;">
          <h4 style="margin: 0 0 0.5rem 0;">Device-Specific Redirects</h4>
          <p style="margin: 0 0 1rem 0; font-size: 0.875rem; color: #666;">
            Users on selected device types will be redirected to their specific URL. Leave empty to use default URL.
          </p>
          <div class="form-group">
            <label for="device-desktop-url">Desktop URL (optional)</label>
            <input type="url" id="device-desktop-url" placeholder="https://example.com/desktop">
          </div>
          <div class="form-group">
            <label for="device-mobile-url">Mobile URL (optional)</label>
            <input type="url" id="device-mobile-url" placeholder="https://example.com/mobile">
          </div>
          <div class="form-group">
            <label for="device-tablet-url">Tablet URL (optional)</label>
            <input type="url" id="device-tablet-url" placeholder="https://example.com/tablet">
          </div>
        </div>
        
        <button type="submit" id="submit-link-btn" class="btn btn-primary">Create Link</button>
      </form>
    </div>
  </div>

  <div id="api-key-modal" class="modal">
    <div class="modal-content" style="max-width: 600px;">
      <span class="close">&times;</span>
      <h2 id="api-key-modal-title">Create API Key</h2>
      <form id="api-key-form">
        <div class="form-group">
          <label for="api-key-name">Name</label>
          <input type="text" id="api-key-name" required placeholder="e.g., Production API Key">
        </div>
        <div class="form-group">
          <label for="api-key-domains">Domain Scope</label>
          <select id="api-key-domains" multiple style="height: 120px;">
            <option value="">All Domains</option>
          </select>
          <small style="display: block; margin-top: 0.25rem; color: #666;">Select one or more domains. If none selected, all domains are allowed.</small>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="api-key-allow-all-ips" checked>
            Allow All IP Addresses
          </label>
        </div>
        <div class="form-group" id="api-key-ip-whitelist-group" style="display: none;">
          <label for="api-key-ip-whitelist">IP Whitelist (one per line)</label>
          <textarea id="api-key-ip-whitelist" rows="4" placeholder="192.168.1.1&#10;10.0.0.1&#10;2001:0db8:85a3::8a2e:0370:7334"></textarea>
          <small style="display: block; margin-top: 0.25rem; color: #666;">Enter one IP address per line. Supports both IPv4 and IPv6 addresses.</small>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="api-key-never-expire" checked>
            Never Expire
          </label>
        </div>
        <div class="form-group" id="api-key-expires-group" style="display: none;">
          <label for="api-key-expires">Expiration Date</label>
          <input type="datetime-local" id="api-key-expires">
        </div>
        <div id="api-key-display" class="api-key-box" style="display: none;">
          <p class="api-key-label">Your API Key (copy this now - it won&apos;t be shown again!):</p>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <code id="api-key-value" class="api-key-code"></code>
            <button type="button" id="copy-api-key-btn" class="btn btn-secondary">Copy</button>
          </div>
          <p class="api-key-warning">⚠️ This key will not be shown again. Save it securely!</p>
        </div>
        <button type="submit" id="submit-api-key-btn" class="btn btn-primary">Create API Key</button>
      </form>
    </div>
  </div>
  <div id="import-csv-modal" class="modal">
    <div class="modal-content" style="max-width: 800px;">
      <span class="close">&times;</span>
      <h2>Import Links from CSV</h2>
      <div id="import-csv-form">
        <div class="form-group">
          <label for="csv-file">CSV/TSV File</label>
          <input type="file" id="csv-file" accept=".csv,.tsv,.txt" required>
          <small style="display: block; margin-top: 0.25rem; color: #666;">Select a delimited file to import (CSV, TSV, etc.)</small>
        </div>
        <div class="form-group">
          <label for="csv-delimiter">Field Delimiter</label>
          <select id="csv-delimiter">
            <option value="auto">Auto-detect</option>
            <option value="," selected>Comma (,)</option>
            <option value="\t">Tab</option>
            <option value=";">Semicolon (;)</option>
            <option value="|">Pipe (|)</option>
            <option value="custom">Custom</option>
          </select>
          <input type="text" id="csv-delimiter-custom" placeholder="Enter custom delimiter" style="display: none; margin-top: 0.5rem; width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
          <small style="display: block; margin-top: 0.25rem; color: #666;">Select the character that separates fields in your file</small>
        </div>
        <div class="form-group">
          <label for="import-domain">Domain</label>
          <select id="import-domain" required>
            <option value="">Select Domain</option>
          </select>
          <small style="display: block; margin-top: 0.25rem; color: #666;">Only one domain per CSV file</small>
        </div>
        <div id="csv-preview-section" style="display: none; margin-top: 1.5rem;">
          <h3 style="margin-bottom: 1rem;">Column Mapping</h3>
          <div style="background: #f8f9fa; padding: 1rem; border-radius: 4px; margin-bottom: 1rem;">
            <p style="margin: 0; color: #666; font-size: 0.875rem;">Map CSV columns to link fields. Leave unmapped if not needed.</p>
          </div>
          <div id="column-mapping-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;"></div>
          <div style="background: white; padding: 1rem; border-radius: 4px; border: 1px solid #ddd; max-height: 300px; overflow-y: auto;">
            <h4 style="margin-bottom: 0.5rem;">Preview (first 5 rows)</h4>
            <div id="csv-preview-table"></div>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
          <button type="button" id="import-csv-submit-btn" class="btn btn-primary" style="display: none;">Import Links</button>
          <button type="button" id="import-csv-cancel-btn" class="btn btn-secondary">Cancel</button>
        </div>
        <div id="import-results" style="display: none; margin-top: 1rem;"></div>
      </div>
    </div>
  </div>

  <!-- Import Progress Modal -->
  <div id="import-progress-modal" class="modal">
    <div class="modal-content" style="max-width: 600px;">
      <h2>Import Progress</h2>
      <div class="progress-container">
        <div id="progress-bar" class="progress-bar" style="width: 0%;"></div>
        <span id="progress-percent" class="progress-percent">0%</span>
      </div>
      <p id="progress-text" class="progress-text">Preparing import...</p>
      
      <!-- Results Summary -->
      <div id="import-summary" class="import-summary" style="display: none;">
        <div class="summary-stats">
          <div class="stat-success">
            ✓ <span id="success-count">0</span> succeeded
          </div>
          <div class="stat-error">
            ✗ <span id="error-count">0</span> failed
          </div>
        </div>
        
        <!-- Error Details (collapsible) -->
        <div id="error-details-section" class="error-details" style="display: none;">
          <h3 id="error-details-toggle">
            <span class="error-toggle">▶</span>
            View Error Details
          </h3>
          <div id="error-list" class="error-list" style="display: none;"></div>
        </div>
      </div>
      
      <div id="progress-complete" class="progress-actions" style="display: none;">
        <button id="download-errors-btn" class="btn btn-secondary" style="display: none;">Download Error Report</button>
        <button id="progress-ok-btn" class="btn btn-primary">OK</button>
      </div>
    </div>
  </div>

  <!-- Add Domain Modal -->
  <div id="add-domain-modal" class="modal">
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2 id="domain-modal-title">Add Domain</h2>
      <form id="add-domain-form">
        <div class="form-group">
          <label for="domain-name">Domain Name</label>
          <input type="text" id="domain-name" placeholder="example.com" required 
                 pattern="^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$"
                 maxlength="253"
                 title="Enter a valid domain name (e.g., example.com, subdomain.example.com)">
          <small style="display: block; margin-top: 0.25rem; color: #666;">Enter the domain name (e.g., example.com)</small>
        </div>
        
        <div class="form-group">
          <label>Routes</label>
          
          <!-- Cloudflare Workers Route Configuration Information -->
          <div style="background: #e7f3ff; border-left: 4px solid #2196F3; padding: 1rem; margin-bottom: 1rem; border-radius: 4px;">
            <h4 style="margin: 0 0 0.5rem 0; color: #1976D2; font-size: 1rem;">
              📋 Cloudflare Workers Route Configuration
            </h4>
            <p style="margin: 0 0 0.5rem 0; font-size: 0.9rem; line-height: 1.5;">
              <strong>Important:</strong> You must also add these domain routes to your Cloudflare Workers settings to ensure they're handled by this application.
            </p>
            <ol style="margin: 0 0 0.5rem 0; padding-left: 1.5rem; font-size: 0.875rem; line-height: 1.6;">
              <li>Go to <a href="https://dash.cloudflare.com" target="_blank" style="color: #1976D2; text-decoration: underline;">Cloudflare Dashboard</a></li>
              <li>Navigate to <strong>Workers & Pages</strong> → Your Worker → <strong>Settings</strong> → <strong>Triggers</strong></li>
              <li>Add routes matching the ones you configure here (e.g., <code>example.com/go/*</code>)</li>
            </ol>
            <p style="margin: 0 0 0.5rem 0; font-size: 0.875rem; background: #fff3cd; border-left: 3px solid #ffc107; padding: 0.5rem; border-radius: 3px;">
              ⚠️ <strong>Avoid Conflicts:</strong> Ensure your routes don't clash with existing website paths. Use unique path prefixes (e.g., <code>/go/*</code>, <code>/r/*</code>, <code>/link/*</code>) that aren't used by your main website.
            </p>
            <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem; background: #e8f5e9; border-left: 3px solid #4caf50; padding: 0.5rem; border-radius: 3px;">
              💡 <strong>Using the Entire Domain:</strong> You can use <code>/*</code> as a route to handle all paths on the domain without additional prefixes (e.g., <code>example.com/*</code>). <strong>Only use this if there's no existing website on this domain</strong>, as it will intercept all traffic.
            </p>
          </div>
          
          <div id="routes-container">
            <!-- Routes will be added dynamically -->
          </div>
          <button type="button" id="add-route-btn" class="btn btn-secondary" style="margin-top: 0.5rem;">+ Add Route</button>
          <small style="display: block; margin-top: 0.25rem; color: #666;">Add routing paths (e.g., /go/*, /r/*). At least one route is required.</small>
        </div>
        
        <div class="form-group">
          <label for="domain-redirect-code">Default Redirect Code</label>
          <select id="domain-redirect-code">
            <option value="301">301 - Moved Permanently (cached 1 year)</option>
            <option value="302">302 - Found (Temporary, cached 1 hour)</option>
            <option value="307">307 - Temporary Redirect (cached 1 hour)</option>
            <option value="308">308 - Permanent Redirect (cached 1 year)</option>
          </select>
          <small style="display: block; margin-top: 0.25rem; color: #666;">
            Default HTTP redirect status code for all links on this domain. Individual links can override this.<br>
            <strong>301/308 (Permanent):</strong> Cached 1 year - use when destinations are permanent.<br>
            <strong>302/307 (Temporary):</strong> Cached 1 hour - use for temporary redirects.
          </small>
        </div>
        
        
        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
          <button type="submit" id="submit-domain-btn" class="btn btn-primary">Create Domain</button>
          <button type="button" class="btn btn-secondary close-modal-btn">Cancel</button>
        </div>
        <input type="hidden" id="domain-edit-id" value="">
      </form>
    </div>
  </div>

  <script nonce="${nonce}">
    // API Client logic moved to /static/dashboard/utils/api-client.js
    
    // ============================================================================
    // PAGE CONTROLLERS - Navigation & Page Management
    // ============================================================================
    // This section contains page-level controllers and navigation:
    // - initNavigation: Setup page navigation and routing
    // - showPage: Display specific pages
    // - Event listeners for page interactions
    // - Page initialization logic
    // ============================================================================
    
    function initNavigation() {
      // DEBUG: console.log('Initializing navigation...');
      const navLinks = document.querySelectorAll('.nav-link');
      // DEBUG: console.log('Found', navLinks.length, 'navigation links');
      
      // Handle Settings menu toggle
      const settingsNavLink = document.getElementById('settings-nav-link');
      const settingsSubmenu = document.getElementById('settings-submenu');
      
      if (settingsNavLink && settingsSubmenu) {
        settingsNavLink.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          // If clicking to expand, also navigate to first section
          if (!settingsNavLink.classList.contains('expanded')) {
            settingsNavLink.classList.toggle('expanded');
            settingsSubmenu.classList.toggle('expanded');
            // Navigate to first section (account-info)
            const firstSubmenuLink = settingsSubmenu.querySelector('.nav-submenu-link');
            if (firstSubmenuLink) {
              firstSubmenuLink.click();
            }
          } else {
            // Just toggle if already expanded
            settingsNavLink.classList.toggle('expanded');
            settingsSubmenu.classList.toggle('expanded');
          }
        });
      }
      
      // Handle Analytics menu toggle
      const analyticsNavLink = document.getElementById('analytics-nav-link');
      const analyticsSubmenu = document.getElementById('analytics-submenu');
      
      if (analyticsNavLink && analyticsSubmenu) {
        analyticsNavLink.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          // If clicking to expand, also navigate to first section
          if (!analyticsNavLink.classList.contains('expanded')) {
            analyticsNavLink.classList.toggle('expanded');
            analyticsSubmenu.classList.toggle('expanded');
            // Navigate to first section (Overview)
            const firstSubmenuLink = analyticsSubmenu.querySelector('.nav-submenu-link');
            if (firstSubmenuLink) {
              firstSubmenuLink.click();
            }
          } else {
            // Just toggle if already expanded
            analyticsNavLink.classList.toggle('expanded');
            analyticsSubmenu.classList.toggle('expanded');
          }
        });
      }
      
      // Handle Integrations menu toggle
      const integrationsNavLink = document.getElementById('integrations-nav-link');
      const integrationsSubmenu = document.getElementById('integrations-submenu');
      
      if (integrationsNavLink && integrationsSubmenu) {
        integrationsNavLink.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          // If clicking to expand, also navigate to first section
          if (!integrationsNavLink.classList.contains('expanded')) {
            integrationsNavLink.classList.toggle('expanded');
            integrationsSubmenu.classList.toggle('expanded');
            // Navigate to first section (API Keys)
            const firstSubmenuLink = integrationsSubmenu.querySelector('.nav-submenu-link');
            if (firstSubmenuLink) {
              firstSubmenuLink.click();
            }
          } else {
            // Just toggle if already expanded
            integrationsNavLink.classList.toggle('expanded');
            integrationsSubmenu.classList.toggle('expanded');
          }
        });
      }
      
      // Handle submenu links
      const submenuLinks = document.querySelectorAll('.nav-submenu-link');
      submenuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          const page = this.dataset.page;
          
          if (page) {
            // Handle page navigation (settings pages or other submenu pages)
            showPage(page);
            
            // Expand parent menu if needed
            if (page.startsWith('settings-')) {
              // Settings submenu
              if (settingsNavLink && settingsSubmenu) {
                settingsNavLink.classList.add('expanded', 'active');
                settingsSubmenu.classList.add('expanded');
              }
              // Clear other nav link active states
              navLinks.forEach(l => {
                if (l.id !== 'settings-nav-link') {
                  l.classList.remove('active');
                }
              });
            } else if (page === 'integrations' || page === 'manual-integration') {
              // Integrations submenu
              const integrationsNavLink = document.getElementById('integrations-nav-link');
              const integrationsSubmenu = document.getElementById('integrations-submenu');
              if (integrationsNavLink && integrationsSubmenu) {
                integrationsNavLink.classList.add('expanded', 'active');
                integrationsSubmenu.classList.add('expanded');
              }
              // Clear other nav link active states
              navLinks.forEach(l => {
                if (l.id !== 'integrations-nav-link' && l.id !== 'settings-nav-link') {
                  l.classList.remove('active');
                }
              });
            }
            
            // Update active state
            submenuLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            // Update hash
            window.location.hash = page;
          }
        });
      });
      
      navLinks.forEach((link, index) => {
        // Skip settings nav link (handled separately)
        if (link.id === 'settings-nav-link') return;
        
        // DEBUG: console.log('Setting up link', index, link.dataset.page);
        link.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          const page = this.dataset.page;
          // DEBUG: console.log('Clicked link, navigating to:', page);
          if (page) {
            showPage(page);
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            // Clear submenu active states
            submenuLinks.forEach(l => l.classList.remove('active'));
            window.location.hash = page;
          }
        });
      });
      
      // Handle hash changes
      window.addEventListener('hashchange', () => {
        // Redirect old #links hash to #dashboard
        if (window.location.hash === '#links') {
          window.location.hash = 'dashboard';
          return;
        }
        
        const hash = window.location.hash.substring(1) || 'dashboard';
        
        // DEBUG: console.log('Hash changed to:', hash);
        const targetLink = document.querySelector('[data-page="' + hash + '"]');
        // DEBUG: console.log('Target link found:', targetLink, 'for hash:', hash);
        
        if (targetLink) {
          // Handle settings pages
          if (hash.startsWith('settings-')) {
            if (settingsNavLink && settingsSubmenu) {
              settingsNavLink.classList.add('expanded', 'active');
              settingsSubmenu.classList.add('expanded');
            }
            navLinks.forEach(l => {
              if (l.id !== 'settings-nav-link') l.classList.remove('active');
            });
          } else {
            navLinks.forEach(l => l.classList.remove('active'));
            targetLink.classList.add('active');
            // Clear settings nav link active state if not on settings
            if (settingsNavLink) {
              settingsNavLink.classList.remove('active');
            }
          }
          
          submenuLinks.forEach(l => {
            l.classList.remove('active');
            if (l.dataset.page === hash) {
              l.classList.add('active');
            }
          });
          
          // DEBUG: console.log('Calling showPage with:', hash);
          showPage(hash);
        } else {
          console.error('No target link found for hash:', hash);
          // Try to show page anyway if element exists
          const pageElement = document.getElementById(hash + '-page');
          // DEBUG: console.log('Page element exists:', pageElement, 'for hash:', hash);
          if (pageElement) {
            // DEBUG: console.log('Showing page directly without nav link');
            // Handle settings pages
            if (hash.startsWith('settings-')) {
              if (settingsNavLink && settingsSubmenu) {
                settingsNavLink.classList.add('expanded', 'active');
                settingsSubmenu.classList.add('expanded');
              }
            }
            showPage(hash);
          }
        }
      });
      
      // Set initial hash if not set
      if (!window.location.hash || window.location.hash === '#') {
        window.location.hash = 'dashboard';
      }
      
      // Redirect old #links hash to #dashboard
      if (window.location.hash === '#links') {
        window.location.hash = 'dashboard';
      }
      
      // Trigger initial page load based on hash
      const initialHash = window.location.hash.substring(1) || 'dashboard';
      
      const initialLink = document.querySelector('[data-page="' + initialHash + '"]');
      // DEBUG: console.log('Initial hash:', initialHash, 'link found:', initialLink);
      
      if (initialLink) {
        // Handle settings pages
        if (initialHash.startsWith('settings-')) {
          if (settingsNavLink && settingsSubmenu) {
            settingsNavLink.classList.add('expanded', 'active');
            settingsSubmenu.classList.add('expanded');
          }
          navLinks.forEach(l => {
            if (l.id !== 'settings-nav-link') l.classList.remove('active');
          });
        } else {
          navLinks.forEach(l => l.classList.remove('active'));
          initialLink.classList.add('active');
          // Clear settings nav link active state if not on settings
          if (settingsNavLink) {
            settingsNavLink.classList.remove('active');
          }
        }
        
        submenuLinks.forEach(l => {
          l.classList.remove('active');
          if (l.dataset.page === initialHash) {
            l.classList.add('active');
          }
        });
        
        // DEBUG: console.log('Calling showPage with initial hash:', initialHash);
        showPage(initialHash);
      } else {
        console.error('No initial link found for hash:', initialHash);
        // Try to show page anyway if element exists
        const pageElement = document.getElementById(initialHash + '-page');
        // DEBUG: console.log('Page element exists:', pageElement, 'for initial hash:', initialHash);
        if (pageElement) {
          // DEBUG: console.log('Showing page directly without nav link');
          // Handle settings pages
          if (initialHash.startsWith('settings-')) {
            if (settingsNavLink && settingsSubmenu) {
              settingsNavLink.classList.add('expanded', 'active');
              settingsSubmenu.classList.add('expanded');
            }
          }
          showPage(initialHash);
        }
      }
    }
    
    function initSidebarToggle() {
      const sidebar = document.getElementById('sidebar');
      const toggleBtn = document.getElementById('sidebar-toggle');
      
      if (!sidebar || !toggleBtn) {
        // DEBUG: console.warn('Sidebar or toggle button not found');
        return;
      }
      
      // Function to update toggle button position and text
      const updateToggleButton = (collapsed) => {
        if (collapsed) {
          // When collapsed, show "Show Sidebar"
          toggleBtn.textContent = 'Show Sidebar';
          toggleBtn.style.left = '0';
        } else {
          // When expanded, show "Hide Sidebar"
          toggleBtn.textContent = 'Hide Sidebar';
          toggleBtn.style.left = '250px';
        }
      };
      
      // Restore collapsed state from localStorage
      const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
      if (isCollapsed) {
        sidebar.classList.add('collapsed');
      }
      updateToggleButton(isCollapsed);
      
      // Toggle sidebar on button click
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        const collapsed = sidebar.classList.contains('collapsed');
        
        // Save state to localStorage
        localStorage.setItem('sidebarCollapsed', collapsed.toString());
        
        // Update button position and icon
        updateToggleButton(collapsed);
      });
    }
    async function showPage(pageName) {
      // DEBUG: console.log('showPage called with:', pageName);
      const pages = document.querySelectorAll('.page');
      // DEBUG: console.log('Found', pages.length, 'pages');
      // Hide all pages - remove active class (CSS .page { display: none; } handles hiding)
      pages.forEach(page => {
        page.classList.remove('active');
        // Explicitly ensure page is hidden (in case CSS hasn't loaded or is overridden)
        if (!page.classList.contains('active')) {
          page.style.display = 'none';
        }
      });
      const targetPage = document.getElementById(pageName + '-page');
      // DEBUG: console.log('Target page element:', targetPage, 'for pageName:', pageName);
      if (targetPage) {
        // Add active class and show the page
        targetPage.classList.add('active');
        targetPage.style.display = 'block';
        // DEBUG: console.log('Page activated:', pageName);
        
        // Hide domain selector on Settings, Domains, Integrations, Link Monitor, and Analytics pages
        const domainSelector = document.getElementById('domain-selector');
        if (domainSelector) {
          const pagesToHideSelector = [
            'settings-account-info',
            'settings-security',
            'settings-status-check',
            'settings-analytics-aggregation',
            'settings-user-management',
            'settings-audit-log',
            'help',
            'domains', 
            'integrations', 
            'manual-integration', 
            'status-monitor',
            'analytics',
            'analytics-geography',
            'analytics-devices',
            'analytics-referrers',
            'analytics-utm',
            'analytics-custom-params',
            'analytics-os',
            'analytics-browsers',
            'link-analytics',
            'links-by-destination'
          ];
          if (pagesToHideSelector.includes(pageName)) {
            domainSelector.style.display = 'none';
          } else {
            domainSelector.style.display = 'block';
          }
        }
        
        // Show page first, then load data (so page is visible even if API fails)
        if (pageName === 'dashboard') {
          // loadDashboard(); // DEPRECATED - summary stats removed
          loadLinks();
          loadTags();
          loadCategories();
          loadAllTagsForFilter(); // Load all tags for filter dropdown
        }
        else if (pageName === 'domains') loadDomains();
        else if (pageName === 'integrations') {
          loadApiKeys();
        }
        else if (pageName === 'manual-integration') {
          loadManualIntegrationPage();
        }
        else if (pageName === 'analytics') loadAnalytics();
        else if (pageName === 'analytics-geography') loadAnalyticsGeography();
        else if (pageName === 'analytics-devices') loadAnalyticsDevices();
        else if (pageName === 'analytics-referrers') loadAnalyticsReferrers();
        else if (pageName === 'analytics-utm') loadAnalyticsUtm();
        else if (pageName === 'analytics-custom-params') loadAnalyticsCustomParams();
        else if (pageName === 'analytics-os') loadAnalyticsOS();
        else if (pageName === 'analytics-browsers') loadAnalyticsBrowsers();
        else if (pageName === 'tags') {
          loadTags();
          loadTagsManagement();
        }
        else if (pageName === 'categories') {
          loadCategories();
          loadCategoriesManagement();
        }
        else if (pageName === 'status-monitor') {
          loadStatusMonitor();
        }
        else if (pageName === 'links-by-destination') {
          const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
          const destinationUrl = params.get('destination_url');
          if (destinationUrl) {
            showLinksByDestinationPage(decodeURIComponent(destinationUrl));
          } else {
            showPage('status-monitor'); // Fallback if no destination URL
          }
        }
        else if (pageName === 'settings-account-info') {
          loadAccountInfoPage();
        }
        else if (pageName === 'settings-security') {
          loadSecurityPage();
        }
        else if (pageName === 'settings-status-check') {
          loadStatusCheckPage();
        }
        else if (pageName === 'settings-analytics-aggregation') {
          loadAnalyticsAggregationPage();
        }
        else if (pageName === 'settings-user-management') {
          loadUserManagementPage();
        }
        else if (pageName === 'settings-audit-log') {
          loadAuditLogPage();
        }
      } else {
        console.error('Page not found:', pageName);
      }
    }
    // DEPRECATED: loadDashboard function disabled - summary stats elements were removed
    // This function tried to update: total-links, active-links, total-clicks, top-link
    // which no longer exist in the DOM
    /*
    async function loadDashboard() {
      try {
        const links = await apiRequest('/links?limit=1000');
        const totalLinks = links.data?.length || 0;
        const activeLinks = links.data?.filter(l => l.status === 'active').length || 0;
        const totalClicks = links.data?.reduce((sum, l) => sum + (l.click_count || 0), 0) || 0;
        const topLink = links.data?.sort((a, b) => (b.click_count || 0) - (a.click_count || 0))[0];
        document.getElementById('total-links').textContent = totalLinks;
        document.getElementById('active-links').textContent = activeLinks;
        document.getElementById('total-clicks').textContent = totalClicks;
        document.getElementById('top-link').textContent = topLink?.slug || 'N/A';
      } catch (error) {
        console.error('Failed to load dashboard:', error);
        document.getElementById('total-links').textContent = 'Error';
        document.getElementById('total-clicks').textContent = 'Error';
        document.getElementById('active-links').textContent = 'Error';
        document.getElementById('top-link').textContent = 'Error';
      }
    }
    */
    // Pagination state
    const paginationState = {
      links: { page: 1, perPage: 50 },
      categories: { page: 1, perPage: 50 },
      tags: { page: 1, perPage: 50 },
      auditLogs: { page: 1, perPage: 50 }
    };
    
    // Pagination helper function moved to /static/dashboard/utils/pagination.js
    
    // ============================================================================
    // LINK SERVICE - Link Management Functions
    // ============================================================================
    // This section contains all link-related business logic:
    // - loadLinks: Fetch and display links with pagination/filters
    // - createLink: Create new short links
    // - editLink: Update existing links
    // - deleteLink: Remove links
    // - exportLinks: Export links to CSV
    // ============================================================================
    
    function showTableLoading(tableId, colspan = 7) {
      const tbody = document.getElementById(tableId);
      if (!tbody) return;
      tbody.innerHTML = 
        '<tr>' +
          '<td colspan="' + colspan + '" style="text-align: center; padding: 2rem;">' +
            '<div style="' +
              'border: 3px solid #f3f3f3;' +
              'border-top: 3px solid #3498db;' +
              'border-radius: 50%;' +
              'width: 40px;' +
              'height: 40px;' +
              'animation: spin 1s linear infinite;' +
              'margin: 0 auto 1rem;' +
            '"></div>' +
            '<div>Loading...</div>' +
            '<style>' +
              '@keyframes spin {' +
                '0% { transform: rotate(0deg); }' +
                '100% { transform: rotate(360deg); }' +
              '}' +
            '</style>' +
          '</td>' +
        '</tr>';
    }

    async function loadLinks(page = null, perPage = null) {
      try {
        showTableLoading('links-tbody');
        
        // Update pagination state
        if (page !== null) paginationState.links.page = page;
        if (perPage !== null) {
          paginationState.links.perPage = perPage;
          paginationState.links.page = 1; // Reset to first page
        }
        
        const state = paginationState.links;
        const offset = (state.page - 1) * state.perPage;
        
        const domainSelector = document.getElementById('domain-selector');
        const domainId = domainSelector?.value || '';
        const searchTerm = document.getElementById('search-input')?.value || '';
        // Note: status-filter belongs to Link Monitor page, not Dashboard - do not read it here
        const tagFilter = document.getElementById('tag-filter')?.value || '';
        const categoryFilter = document.getElementById('category-filter')?.value || '';
        
        const params = new URLSearchParams({ 
          limit: state.perPage.toString(),
          offset: offset.toString()
        });
        // Only add domain_id if it's a valid non-empty string
        if (domainId && domainId.trim() !== '' && domainId !== 'undefined') {
          params.append('domain_id', domainId);
        }
        if (searchTerm) params.append('search', searchTerm);
        if (tagFilter) params.append('tag_id', tagFilter);
        if (categoryFilter) params.append('category_id', categoryFilter);
        
        const response = await apiRequest('/links?' + params.toString());
        const links = response.data || [];
        const pagination = response.pagination || {};
        
        // Update table
        const tbody = document.getElementById('links-tbody');
        if (!tbody) return;
        
        if (links.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7">No links found</td></tr>';
        } else {
          tbody.innerHTML = links.map(link => {
            const category = link.category ? '<span class="category-badge" style="background: #e7f3ff; color: #004085; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">' + escapeHtml(link.category.name) + '</span>' : '';
            const titleOrUrl = link.title || link.destination_url;
            const truncatedTitle = titleOrUrl.substring(0, 50) + (titleOrUrl.length > 50 ? '...' : '');
            const linkIdEscaped = escapeAttr(link.id);
            const categoryDisplay = category || '<span style="color: #999;">No category</span>';
            
            // Extract route from metadata
            let route = '';
            try {
              if (link.metadata) {
                const meta = JSON.parse(link.metadata);
                route = meta.route || '';
              }
            } catch (e) {}
            
            // Construct short URL
            const shortUrl = constructShortUrl(link.domain_name, link.slug, route);
            
            return '<tr>' +
              '<td style="width: var(--col-short-url-width, 300px); max-width: var(--col-short-url-width, 300px);">' +
                '<div style="display: flex; align-items: center; gap: 0.5rem;">' +
                  '<a href="' + escapeAttr(shortUrl) + '" target="_blank" rel="noopener" style="color: var(--primary-color); text-decoration: none; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;" title="' + escapeAttr(shortUrl) + '">' + escapeHtml(shortUrl) + '</a>' +
                  '<button class="copy-url-btn" data-url="' + escapeAttr(shortUrl) + '" style="background: var(--primary-color); color: white; border: none; cursor: pointer; padding: 0.25rem 0.5rem; font-size: 0.75rem; border-radius: 4px; white-space: nowrap; transition: opacity 0.2s; flex-shrink: 0;" title="Copy to clipboard">Copy</button>' +
                '</div>' +
              '</td>' +
              '<td style="width: var(--col-destination-width, 400px); max-width: var(--col-destination-width, 400px);"><a href="' + escapeAttr(link.destination_url) + '" target="_blank" style="display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + escapeAttr(link.destination_url) + '">' + escapeHtml(link.destination_url) + '</a></td>' +
              '<td>' + (link.click_count || 0) + '</td>' +
              '<td><span class="status-badge status-' + escapeHtml(link.status) + '">' + escapeHtml(link.status) + '</span></td>' +
              '<td>' + categoryDisplay + '</td>' +
              '<td>' + new Date(link.created_at).toLocaleDateString() + '</td>' +
              '<td>' +
                '\u003cbutton class=\"btn btn-sm\" data-action=\"edit\" data-link-id=\"' + linkIdEscaped + '\" style=\"margin-right: 0.5rem;\"\u003eEdit\u003c/button\u003e' +
                '\u003cbutton class=\"btn btn-sm btn-secondary\" data-action=\"qr\" data-link-id=\"' + linkIdEscaped + '\" data-domain=\"' + escapeAttr(link.domain_name || '') + '\" data-slug=\"' + escapeAttr(link.slug || '') + '\" data-route=\"' + escapeAttr(route) + '\" style=\"margin-right: 0.5rem;\"\u003e📱 QR\u003c/button\u003e' +
                '\u003cbutton class=\"btn btn-sm btn-secondary\" data-action=\"analytics\" data-link-id=\"' + linkIdEscaped + '\" style=\"margin-right: 0.5rem;\"\u003e📊 Analytics\u003c/button\u003e' +
                '\u003cbutton class=\"btn btn-sm btn-secondary\" data-action=\"delete\" data-link-id=\"' + linkIdEscaped + '\"\u003eDelete\u003c/button\u003e' +
              '</td>' +
            '</tr>';
          }).join('');
          
          // Attach event delegation for button clicks and short URL clicks (CSP-compliant)
          tbody.removeEventListener('click', handleLinkButtonClick);
          tbody.addEventListener('click', handleLinkButtonClick);
          
          // Handle short URL clicks for copy functionality
          tbody.removeEventListener('click', handleShortUrlClick);
          tbody.addEventListener('click', handleShortUrlClick);
        }
        
        // Update pagination info
        const infoEl = document.getElementById('links-pagination-info');
        if (infoEl && pagination.total !== undefined && pagination.total > 0) {
          const start = (pagination.offset || 0) + 1;
          const end = Math.min((pagination.offset || 0) + pagination.count, pagination.total);
          infoEl.textContent = 'Showing ' + start + '-' + end + ' of ' + pagination.total;
        } else if (infoEl) {
          infoEl.textContent = 'No items';
        }
        
        // Render pagination controls
        if (pagination.total !== undefined && pagination.total > 0) {
          renderPagination('links-pagination', state, pagination.total, (page) => loadLinks(page));
        } else {
          const paginationEl = document.getElementById('links-pagination');
          if (paginationEl) paginationEl.innerHTML = '';
        }
        
        // Store all links for filters (if needed for other features)

      } catch (error) {
        console.error('Failed to load links:', error);
        const tbody = document.getElementById('links-tbody');
        if (tbody) {
          let errorMessage = 'Error loading links.';
          
          // Normalize error to string for robust checking (handles non-Error objects)
          const errorStr = String(error?.message || error || '');
          
          // Provide more specific error messages
          if (errorStr.includes('401') || errorStr.includes('Unauthorized')) {
            errorMessage = 'Authentication error. Please log in again.';
          } else if (errorStr.includes('403') || errorStr.includes('Forbidden')) {
            errorMessage = 'Access denied. Check domain permissions.';
          } else if (errorStr.includes('404')) {
            errorMessage = 'Domain not found. Please select a valid domain.';
          } else if (errorStr.includes('network') || errorStr.includes('fetch')) {
            errorMessage = 'Network error. Please check your connection.';
          }
          
          tbody.innerHTML = '<tr><td colspan="7">' + errorMessage + '</td></tr>';
        }
        showToast('Failed to load links: ' + (errorStr || 'Unknown error'), 'error');
      } finally {
        // Loading state is cleared when content is replaced
      }
    }
    
    // Event delegation handler for link management buttons (CSP-compliant)
    function handleLinkButtonClick(e) {
      const target = e.target;
      if (!target || !target.dataset) return;
      
      const action = target.dataset.action;
      if (!action) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const linkId = target.dataset.linkId;
      
      if (action === 'edit' && linkId) {
        editLink(linkId);
      } else if (action === 'delete' && linkId) {
        deleteLink(linkId);
      } else if (action === 'qr') {
        showQRCode(target.dataset);
      } else if (action === 'analytics' && linkId) {
        showLinkAnalytics(linkId, target.dataset);
      }
    }
    
    // Handler for short URL copy button clicks
    function handleShortUrlClick(e) {
      const target = e.target;
      if (target && target.classList.contains('copy-url-btn')) {
        e.preventDefault();
        const url = target.dataset.url;
        if (url && navigator.clipboard) {
          navigator.clipboard.writeText(url)
            .then(() => {
              showToast('Short URL copied to clipboard!', 'success');
              // Visual feedback: change button text temporarily
              const originalText = target.textContent;
              target.textContent = 'Copied!';
              target.style.background = '#28a745';
              setTimeout(() => {
                target.textContent = originalText;
                target.style.background = 'var(--primary-color)';
              }, 1500);
            })
            .catch((err) => {
              console.error('Failed to copy:', err);
              showToast('Failed to copy URL', 'error');
            });
        } else {
          showToast('Copy not supported', 'error');
        }
      }
    }
    
    function goToLinksPage(page) {
      loadLinks(page);
    }
    

    async function loadDomains() {
      try {
        const domains = await apiRequest('/domains');
        const container = document.getElementById('domains-list');
        if (domains.data?.length === 0) {
          container.innerHTML = '<p>No domains configured</p>';
          return;
        }
        container.innerHTML = domains.data?.map(domain => 
          '<div class="domain-card">' +
            '<h3>' + domain.domain_name + '</h3>' +
            '<p>Path: ' + domain.routing_path + '</p>' +
            '<p>Status: ' + domain.status + '</p>' +
          '</div>'
        ).join('') || '';
      } catch (error) {
        console.error('Failed to load domains:', error);
        document.getElementById('domains-list').innerHTML = '<p>Error loading domains. Check authentication.</p>';
      }
    }
    function initCreateLinkModal() {
      const modal = document.getElementById('create-link-modal');
      const createBtn = document.getElementById('create-link-btn');
      const closeBtn = modal.querySelector('.close');
      const form = document.getElementById('create-link-form');
      const title = modal.querySelector('h2');
      
      const resetModal = () => {
        form.reset();
        document.getElementById('link-slug').disabled = false;
        document.getElementById('link-domain').disabled = false;
        // Hide help texts
        document.getElementById('domain-help-text').style.display = 'none';
        document.getElementById('slug-help-text').style.display = 'none';
        title.textContent = 'Create Link';
        const submitBtn = document.getElementById('submit-link-btn');
        if (submitBtn) submitBtn.textContent = 'Create Link';
        form.onsubmit = async (e) => {
          e.preventDefault();
          await createLink();
        };
      };
      
      createBtn?.addEventListener('click', async () => {
        resetModal();
        selectedTags = [];
        updateTagsUI();
        await loadTags();
        await loadCategories();
        modal.classList.add('active');
        loadDomainsForSelect();
      });
      
      closeBtn?.addEventListener('click', () => {
        modal.classList.remove('active');
        // Only reset if not in edit mode (slug not disabled)
        if (!document.getElementById('link-slug').disabled) {
        resetModal();
        }
      });
      
      // Close on outside click
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
          // Only reset if not in edit mode (slug not disabled)
          if (!document.getElementById('link-slug').disabled) {
          resetModal();
          }
        }
      });
      
      // NOTE: form.onsubmit is set in resetModal() for create mode
      // and overridden in editLink() for edit mode. No addEventListener needed.
    }
    let availableDomains = []; // Store domains for route selection

    async function loadDomainsForSelect() {
      try {
        const domains = await apiRequest('/domains');
        availableDomains = domains.data || [];
        const select = document.getElementById('link-domain');
        const routeSelect = document.getElementById('link-route');
        
        // Save current selection if any
        const currentDomainId = select.value;
        
        select.innerHTML = '<option value="">Select Domain</option>';
        
        availableDomains.forEach(domain => {
          // Only show active domains for link creation
          if (domain.status === 'active') {
            const option = document.createElement('option');
            option.value = domain.id;
            option.textContent = domain.domain_name;
            select.appendChild(option);
          }
        });
        
        // Restore selection if valid
        if (currentDomainId) {
          select.value = currentDomainId;
          updateRouteOptions(currentDomainId);
        }

        // Add change listener to update routes
        select.addEventListener('change', (e) => {
          updateRouteOptions(e.target.value);
        });
        
      } catch (error) {
        console.error('Failed to load domains:', error);
      }
    }

    function updateRouteOptions(domainId) {
      const routeSelect = document.getElementById('link-route');
      routeSelect.innerHTML = '';
      
      if (!domainId) {
        routeSelect.innerHTML = '<option value="">Select Domain First</option>';
        return;
      }
      
      const domain = availableDomains.find(d => d.id === domainId);
      if (domain && domain.routes && domain.routes.length > 0) {
        domain.routes.forEach(route => {
          const option = document.createElement('option');
          option.value = route;
          option.textContent = route;
          routeSelect.appendChild(option);
        });
        // Select first route by default
        if (domain.routes.length > 0) {
          routeSelect.value = domain.routes[0];
        }
      } else if (domain && domain.routing_path) {
        // Fallback to routing_path
        const option = document.createElement('option');
        option.value = domain.routing_path;
        option.textContent = domain.routing_path;
        routeSelect.appendChild(option);
        routeSelect.value = domain.routing_path;
      } else {
        routeSelect.innerHTML = '<option value="/go/*">/go/* (Default)</option>';
      }
    }
    // Utility functions for escaping HTML and attributes
    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    // Note: escapeAttr is defined once in the tag/category section (around line 3080)
    // to avoid duplicate function definitions. The later definition handles all cases.
    
    
    // Toast notification system moved to /static/dashboard/utils/toast.js
    
    
    // Loading state helpers
    function setLoading(elementId, isLoading) {
      const element = document.getElementById(elementId);
      if (!element) return;
      if (isLoading) {
        element.style.opacity = '0.6';
        element.style.pointerEvents = 'none';
      } else {
        element.style.opacity = '1';
        element.style.pointerEvents = 'auto';
      }
    }
    

    
    async function createLink() {
      try {
        setLoading('create-link-form', true);
        const form = document.getElementById('create-link-form');
        const formData = {
          domain_id: document.getElementById('link-domain').value,
          slug: document.getElementById('link-slug').value || undefined,
          route: document.getElementById('link-route').value || undefined,
          destination_url: document.getElementById('link-url').value,
          title: document.getElementById('link-title').value || undefined,
          description: document.getElementById('link-description').value || undefined,
          redirect_code: parseInt(document.getElementById('link-redirect-code').value),
          category_id: document.getElementById('link-category').value || undefined,
        };
        // Only include tags if they exist
        if (selectedTags && selectedTags.length > 0) {
          formData.tags = selectedTags.map(t => typeof t === 'string' ? t : t.id);
        }
        
        // Include geo redirects if enabled
        if (document.getElementById('geo-redirect-enabled')?.checked) {
          const geoRedirects = getGeoRedirects();
          if (geoRedirects.length > 0) {
            formData.geo_redirects = geoRedirects;
          }
        }
        
        // Include device redirects if enabled
        if (document.getElementById('device-redirect-enabled')?.checked) {
          const deviceRedirects = getDeviceRedirects();
          if (deviceRedirects.length > 0) {
            formData.device_redirects = deviceRedirects;
          }
        }
        
        await apiRequest('/links', { method: 'POST', body: JSON.stringify(formData) });
        document.getElementById('create-link-modal').classList.remove('active');
        form.reset();
        selectedTags = [];
        updateTagsUI();
        
        // Reset redirect sections
        document.getElementById('geo-redirect-enabled').checked = false;
        document.getElementById('device-redirect-enabled').checked = false;
        document.getElementById('geo-redirects-section').style.display = 'none';
        document.getElementById('device-redirects-section').style.display = 'none';
        setGeoRedirects([]);
        setDeviceRedirects([]);
        
        await loadLinks();
        showToast('Link created successfully!', 'success');
      } catch (error) {
        showToast('Failed to create link: ' + error.message, 'error');
      } finally {
        setLoading('create-link-form', false);
      }
    }
    
    // Edit link function
    async function editLink(linkId) {
      try {
        const link = await apiRequest('/links/' + linkId);
        const modal = document.getElementById('create-link-modal');
        const form = document.getElementById('create-link-form');
        const title = modal.querySelector('h2');
        
        title.textContent = 'Edit Link';
        const submitBtn = document.getElementById('submit-link-btn');
        if (submitBtn) submitBtn.textContent = 'Save Edit';
        
        // Set domain first (needed for loading categories/tags filtered by domain)
        await loadDomainsForSelect();
        document.getElementById('link-domain').value = link.data.domain_id;
        document.getElementById('link-domain').disabled = true; // Domain cannot be changed
        // Show domain help text
        document.getElementById('domain-help-text').style.display = 'block';
        // Trigger route update
        updateRouteOptions(link.data.domain_id);
        
        // Load categories and tags BEFORE setting values
        await loadCategories();
        await loadTags();
        
        // Now set form fields
        document.getElementById('link-slug').value = link.data.slug;
        document.getElementById('link-slug').disabled = true; // Slug cannot be changed
        // Show slug help text
        document.getElementById('slug-help-text').style.display = 'block';
        document.getElementById('link-url').value = link.data.destination_url;
        document.getElementById('link-title').value = link.data.title || '';
        document.getElementById('link-description').value = link.data.description || '';
        document.getElementById('link-redirect-code').value = link.data.redirect_code || 301;
        
        // Set category AFTER categories are loaded
        // Set category AFTER categories are loaded
        if (link.data.category) {
          document.getElementById('link-category').value = link.data.category.id;
        } else if (link.data.metadata) {
          try {
            const metadata = JSON.parse(link.data.metadata);
            if (metadata.category_id) {
              document.getElementById('link-category').value = metadata.category_id;
            }
            if (metadata.route) {
              document.getElementById('link-route').value = metadata.route;
            }
          } catch {}
        }
        
        // Set tags AFTER tags are loaded - ensure tags are objects with id and name
        if (link.data.tags && Array.isArray(link.data.tags)) {
          selectedTags = link.data.tags.map(t => {
            const tagId = typeof t === 'string' ? t : t.id;
            const tagObj = allTags.find(tag => tag.id === tagId);
            return tagObj || (typeof t === 'object' ? t : { id: tagId, name: tagId });
          });
        } else {
          selectedTags = [];
        }
        updateTagsUI();
        
        // Set geo redirects if they exist
        if (link.data.geo_redirects && link.data.geo_redirects.length > 0) {
          document.getElementById('geo-redirect-enabled').checked = true;
          document.getElementById('geo-redirects-section').style.display = 'block';
          setGeoRedirects(link.data.geo_redirects);
        } else {
          document.getElementById('geo-redirect-enabled').checked = false;
          document.getElementById('geo-redirects-section').style.display = 'none';
          setGeoRedirects([]);
        }
        
        // Set device redirects if they exist
        if (link.data.device_redirects && link.data.device_redirects.length > 0) {
          document.getElementById('device-redirect-enabled').checked = true;
          document.getElementById('device-redirects-section').style.display = 'block';
          setDeviceRedirects(link.data.device_redirects);
        } else {
          document.getElementById('device-redirect-enabled').checked = false;
          document.getElementById('device-redirects-section').style.display = 'none';
          setDeviceRedirects([]);
        }
        
        modal.classList.add('active');
        
        // Update form submit handler for edit mode
        form.onsubmit = async (e) => {
          e.preventDefault();
          try {
            setLoading('create-link-form', true);
            const formData = {
              destination_url: document.getElementById('link-url').value,
              route: document.getElementById('link-route').value || undefined,
              title: document.getElementById('link-title').value || undefined,
              description: document.getElementById('link-description').value || undefined,
              redirect_code: parseInt(document.getElementById('link-redirect-code').value),
              category_id: document.getElementById('link-category').value || undefined,
            };
            // Only include tags if they exist
            if (selectedTags && selectedTags.length > 0) {
              formData.tags = selectedTags.map(t => typeof t === 'string' ? t : t.id);
            } else {
              formData.tags = [];
            }
            
            // Include geo redirects (always include to handle clearing)
            if (document.getElementById('geo-redirect-enabled')?.checked) {
              formData.geo_redirects = getGeoRedirects();
            } else {
              formData.geo_redirects = [];
            }
            
            // Include device redirects (always include to handle clearing)
            if (document.getElementById('device-redirect-enabled')?.checked) {
              formData.device_redirects = getDeviceRedirects();
            } else {
              formData.device_redirects = [];
            }
            
            await apiRequest('/links/' + linkId, { method: 'PUT', body: JSON.stringify(formData) });
            modal.classList.remove('active');
            // Reset modal state after successful edit
            form.reset();
            document.getElementById('link-slug').disabled = false;
            document.getElementById('link-domain').disabled = false;
            // Hide help texts
            document.getElementById('domain-help-text').style.display = 'none';
            document.getElementById('slug-help-text').style.display = 'none';
            selectedTags = [];
            updateTagsUI();
            
            // Reset redirect sections
            document.getElementById('geo-redirect-enabled').checked = false;
            document.getElementById('device-redirect-enabled').checked = false;
            document.getElementById('geo-redirects-section').style.display = 'none';
            document.getElementById('device-redirects-section').style.display = 'none';
            setGeoRedirects([]);
            setDeviceRedirects([]);
            
            title.textContent = 'Create Link';
            const submitBtn = document.getElementById('submit-link-btn');
            if (submitBtn) submitBtn.textContent = 'Create Link';
            form.onsubmit = async (e) => { e.preventDefault(); await createLink(); };
            await loadLinks();
            showToast('Link updated successfully!', 'success');
          } catch (error) {
            showToast('Failed to update link: ' + error.message, 'error');
          } finally {
            setLoading('create-link-form', false);
          }
        };
      } catch (error) {
        showToast('Failed to load link: ' + error.message, 'error');
      }
    }
    
    // Delete link function
    async function deleteLink(linkId) {
      if (!confirm('Are you sure you want to delete this link? This action cannot be undone.')) {
        return;
      }
      try {
        await apiRequest('/links/' + linkId, { method: 'DELETE' });
        await loadLinks();
        showToast('Link deleted successfully!', 'success');
      } catch (error) {
        showToast('Failed to delete link: ' + error.message, 'error');
      }
    }
    
    // ============================================================================
    // END LINK SERVICE
    // ============================================================================
    
    // Check authentication on load
    async function checkAuth() {
      try {
        const token = getAuthToken();
        if (!token) {
          // DEBUG: console.log('No auth token found, redirecting to login');
          window.location.href = '/dashboard/login';
          return false;
        }
        
        const response = await fetch('/dashboard/api/v1/auth/me', {
          headers: { 'Authorization': 'Bearer ' + token },
          credentials: 'include', // Include cookies
        });
        
        if (!response.ok) {
          // DEBUG: console.log('Auth check failed, redirecting to login');
          // Clear any stored tokens
          localStorage.removeItem('auth_token');
          document.cookie = 'session_token=; Path=/; Max-Age=0';
          document.cookie = 'refresh_token=; Path=/; Max-Age=0';
          window.location.href = '/dashboard/login';
          return false;
        }
        
        const user = await response.json();
        if (user.success && user.data) {
          // DEBUG: console.log('Authenticated as:', user.data.username || user.data.email);
          return true;
        } else {
          // DEBUG: console.log('Invalid auth response, redirecting to login');
          window.location.href = '/dashboard/login';
          return false;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Clear any stored tokens
        localStorage.removeItem('auth_token');
        document.cookie = 'session_token=; Path=/; Max-Age=0';
        window.location.href = '/dashboard/login';
        return false;
      }
    }
    
    // ============================================================================
    // UI COMPONENTS & HELPERS - Reusable UI Functions
    // ============================================================================
    // This section contains reusable UI component functions:
    // - escapeHtml: Sanitize user input for display
    // - setLoading: Show/hide loading states
    // - showPage: Page navigation and visibility
    // - Modal management functions
    // - Form validation helpers
    // ============================================================================
    
    // Update UI visibility based on user role
    async function updateUIVisibilityByRole() {
      try {
        const user = await apiRequest('/auth/me');
        const userData = user.data || {};
        const isAdminOrOwner = userData.role === 'owner' || userData.role === 'admin';
        
        // Hide/show Integrations menu item (API Keys)
        const integrationsNavLink = document.getElementById('integrations-nav-link');
        const integrationsSubmenu = document.getElementById('integrations-submenu');
        if (integrationsNavLink && integrationsSubmenu) {
          if (!isAdminOrOwner) {
            integrationsNavLink.style.display = 'none';
            integrationsSubmenu.style.display = 'none';
          } else {
            integrationsNavLink.style.display = 'flex';
          }
        }
        
        // Hide/show Domains menu item
        const domainsNavLink = document.querySelector('[data-page="domains"]');
        if (domainsNavLink) {
          if (!isAdminOrOwner) {
            domainsNavLink.style.display = 'none';
          } else {
            domainsNavLink.style.display = 'block';
          }
        }
        
        // Hide/show "Add Domain" button
        const addDomainBtn = document.getElementById('add-domain-btn');
        if (addDomainBtn) {
          if (!isAdminOrOwner) {
            addDomainBtn.style.display = 'none';
          } else {
            addDomainBtn.style.display = 'block';
          }
        }
        
        // Hide/show "Create API Key" button
        const createApiKeyBtn = document.getElementById('create-api-key-btn');
        if (createApiKeyBtn) {
          if (!isAdminOrOwner) {
            createApiKeyBtn.style.display = 'none';
          } else {
            createApiKeyBtn.style.display = 'block';
          }
        }
      } catch (error) {
        console.error('Failed to update UI visibility by role:', error);
        // Don't block the app if this fails, just log the error
      }
    }
    
    async function logout() {
      try {
        await fetch('/dashboard/api/v1/auth/logout', { 
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        console.error('Logout failed:', error);
      }
        localStorage.removeItem('auth_token');
      document.cookie = 'session_token=; Path=/; Max-Age=0';
      document.cookie = 'refresh_token=; Path=/; Max-Age=0';
        window.location.href = '/dashboard/login';
    }
    
    // Make functions global for inline onclick handlers
    // (These are already set above, but keeping for clarity)
    window.logout = logout;
    
    // Initialize search and filter
    function initSearchFilter() {
      const searchInput = document.getElementById('search-input');
      // Note: status-filter belongs to Link Monitor page, not Dashboard
      // Removed listener that incorrectly called loadLinks on status-filter change
      
      // Debounce search input
      let searchTimeout;
      searchInput?.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          loadLinks(1); // Reset to page 1 on search
        }, 500);
      });
      
      // Tag and category filters are now handled by searchable dropdowns
      initSearchableDropdowns();
      
      // Per-page selector for links
      const linksPerPage = document.getElementById('links-per-page');
      linksPerPage?.addEventListener('change', (e) => {
        loadLinks(null, parseInt(e.target.value));
      });
      
      // Per-page selectors for tags and categories
      const tagsPerPage = document.getElementById('tags-per-page');
      tagsPerPage?.addEventListener('change', (e) => {
        loadTagsManagement(null, parseInt(e.target.value));
      });
      
      const categoriesPerPage = document.getElementById('categories-per-page');
      categoriesPerPage?.addEventListener('change', (e) => {
        loadCategoriesManagement(null, parseInt(e.target.value));
      });
      
      // Search handlers for tags and categories management pages
      const tagsSearch = document.getElementById('tags-search');
      let tagsSearchTimeout;
      tagsSearch?.addEventListener('input', () => {
        clearTimeout(tagsSearchTimeout);
        tagsSearchTimeout = setTimeout(() => {
          loadTagsManagement(1); // Reset to page 1 on search
        }, 300);
      });
      
      const categoriesSearch = document.getElementById('categories-search');
      let categoriesSearchTimeout;
      categoriesSearch?.addEventListener('input', () => {
        clearTimeout(categoriesSearchTimeout);
        categoriesSearchTimeout = setTimeout(() => {
          loadCategoriesManagement(1); // Reset to page 1 on search
        }, 300);
      });
    }
    
    // Tags and Categories management
    let allTags = [];
    let allTagsForFilter = []; // All tags across all domains for filter dropdown
    let allCategories = [];
    let selectedTags = [];
    
    // Geo and Device redirects management
    let geoRedirectCount = 0;
    
    // Country list (ISO 3166-1 alpha-2 codes)
    const countries = [
      { code: 'US', name: 'United States' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'CA', name: 'Canada' },
      { code: 'AU', name: 'Australia' },
      { code: 'DE', name: 'Germany' },
      { code: 'FR', name: 'France' },
      { code: 'IT', name: 'Italy' },
      { code: 'ES', name: 'Spain' },
      { code: 'NL', name: 'Netherlands' },
      { code: 'BE', name: 'Belgium' },
      { code: 'CH', name: 'Switzerland' },
      { code: 'AT', name: 'Austria' },
      { code: 'SE', name: 'Sweden' },
      { code: 'NO', name: 'Norway' },
      { code: 'DK', name: 'Denmark' },
      { code: 'FI', name: 'Finland' },
      { code: 'PL', name: 'Poland' },
      { code: 'CZ', name: 'Czech Republic' },
      { code: 'IE', name: 'Ireland' },
      { code: 'PT', name: 'Portugal' },
      { code: 'GR', name: 'Greece' },
      { code: 'JP', name: 'Japan' },
      { code: 'KR', name: 'South Korea' },
      { code: 'CN', name: 'China' },
      { code: 'HK', name: 'Hong Kong' },
      { code: 'SG', name: 'Singapore' },
      { code: 'IN', name: 'India' },
      { code: 'BR', name: 'Brazil' },
      { code: 'MX', name: 'Mexico' },
      { code: 'AR', name: 'Argentina' },
      { code: 'CL', name: 'Chile' },
      { code: 'CO', name: 'Colombia' },
      { code: 'ZA', name: 'South Africa' },
      { code: 'NZ', name: 'New Zealand' },
      { code: 'RU', name: 'Russia' },
      { code: 'TR', name: 'Turkey' },
      { code: 'SA', name: 'Saudi Arabia' },
      { code: 'AE', name: 'United Arab Emirates' },
      { code: 'IL', name: 'Israel' },
      { code: 'EG', name: 'Egypt' },
      { code: 'TH', name: 'Thailand' },
      { code: 'MY', name: 'Malaysia' },
      { code: 'ID', name: 'Indonesia' },
      { code: 'PH', name: 'Philippines' },
      { code: 'VN', name: 'Vietnam' },
    ];
    
    // Toggle geo redirects section
    document.getElementById('geo-redirect-enabled')?.addEventListener('change', (e) => {
      const section = document.getElementById('geo-redirects-section');
      if (section) {
        section.style.display = e.target.checked ? 'block' : 'none';
      }
    });
    
    // Toggle device redirects section
    document.getElementById('device-redirect-enabled')?.addEventListener('change', (e) => {
      const section = document.getElementById('device-redirects-section');
      if (section) {
        section.style.display = e.target.checked ? 'block' : 'none';
      }
    });
    
    // Add geo redirect
    document.getElementById('add-geo-redirect')?.addEventListener('click', () => {
      const list = document.getElementById('geo-redirects-list');
      if (!list) return;
      
      const currentCount = list.children.length;
      if (currentCount >= 10) {
        showToast('Maximum 10 countries allowed', 'error');
        return;
      }
      
      const index = geoRedirectCount++;
      const div = document.createElement('div');
      div.className = 'geo-redirect-item';
      div.setAttribute('data-index', index);
      div.style.cssText = 'display: flex; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center;';
      
      const countryOptions = countries.map(c => 
        '<option value="' + c.code + '">' + c.name + '</option>'
      ).join('');
      
      div.innerHTML = 
        '<select class="geo-country" style="flex: 0 0 180px;" required>' +
          '<option value="">Select Country</option>' +
          countryOptions +
        '</select>' +
        '<input type="url" class="geo-url" placeholder="https://example.com/country" style="flex: 1;" required>' +
        '<button type="button" class="btn btn-secondary remove-geo" style="padding: 0.5rem 0.75rem;">✕</button>';
      
      list.appendChild(div);
      updateGeoCount();
    });
    
    // Remove geo redirect (using event delegation)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-geo')) {
        e.target.closest('.geo-redirect-item')?.remove();
        updateGeoCount();
      }
    });
    
    function updateGeoCount() {
      const list = document.getElementById('geo-redirects-list');
      const count = list ? list.children.length : 0;
      const countEl = document.getElementById('geo-count');
      if (countEl) {
        countEl.textContent = count + ' / 10 countries';
      }
    }
    
    function getGeoRedirects() {
      const list = document.getElementById('geo-redirects-list');
      if (!list) return [];
      
      const redirects = [];
      const items = list.querySelectorAll('.geo-redirect-item');
      items.forEach(item => {
        const country = item.querySelector('.geo-country')?.value;
        const url = item.querySelector('.geo-url')?.value;
        if (country && url) {
          redirects.push({ country_code: country, destination_url: url });
        }
      });
      return redirects;
    }
    
    function setGeoRedirects(redirects) {
      const list = document.getElementById('geo-redirects-list');
      if (!list) return;
      
      // Clear existing
      list.innerHTML = '';
      geoRedirectCount = 0;
      
      // Add each redirect
      if (redirects && redirects.length > 0) {
        redirects.forEach(redirect => {
          // Trigger add button to create structure
          const addBtn = document.getElementById('add-geo-redirect');
          if (addBtn) {
            addBtn.click();
            
            // Get the last added item and populate it
            const items = list.querySelectorAll('.geo-redirect-item');
            const lastItem = items[items.length - 1];
            if (lastItem) {
              const countrySelect = lastItem.querySelector('.geo-country');
              const urlInput = lastItem.querySelector('.geo-url');
              if (countrySelect) countrySelect.value = redirect.country_code;
              if (urlInput) urlInput.value = redirect.destination_url;
            }
          }
        });
      }
      updateGeoCount();
    }
    
    function getDeviceRedirects() {
      const redirects = [];
      const desktop = document.getElementById('device-desktop-url')?.value;
      const mobile = document.getElementById('device-mobile-url')?.value;
      const tablet = document.getElementById('device-tablet-url')?.value;
      
      if (desktop) redirects.push({ device_type: 'desktop', destination_url: desktop });
      if (mobile) redirects.push({ device_type: 'mobile', destination_url: mobile });
      if (tablet) redirects.push({ device_type: 'tablet', destination_url: tablet });
      
      return redirects;
    }
    
    function setDeviceRedirects(redirects) {
      // Clear existing
      const desktopInput = document.getElementById('device-desktop-url');
      const mobileInput = document.getElementById('device-mobile-url');
      const tabletInput = document.getElementById('device-tablet-url');
      
      if (desktopInput) desktopInput.value = '';
      if (mobileInput) mobileInput.value = '';
      if (tabletInput) tabletInput.value = '';
      
      // Set new values
      if (redirects && redirects.length > 0) {
        redirects.forEach(redirect => {
          if (redirect.device_type === 'desktop' && desktopInput) {
            desktopInput.value = redirect.destination_url;
          } else if (redirect.device_type === 'mobile' && mobileInput) {
            mobileInput.value = redirect.destination_url;
          } else if (redirect.device_type === 'tablet' && tabletInput) {
            tabletInput.value = redirect.destination_url;
          }
        });
      }
    }
    
    async function loadTags() {
      try {
        const domainId = document.getElementById('domain-selector')?.value;
        const params = domainId ? '?domain_id=' + domainId : '';
        const tags = await apiRequest('/tags' + params);
        allTags = tags.data || [];
        updateTagsUI();
      } catch (error) {
        console.error('Failed to load tags:', error);
      }
    }
    
    async function loadAllTagsForFilter() {
      try {
        // Load all tags regardless of domain for filter dropdown
        const tags = await apiRequest('/tags');
        allTagsForFilter = tags.data || [];
        updateTagFilters();
      } catch (error) {
        console.error('Failed to load all tags for filter:', error);
      }
    }
    
    async function loadCategories() {
      try {
        const domainId = document.getElementById('domain-selector')?.value;
        const params = domainId ? '?domain_id=' + domainId : '';
        const categories = await apiRequest('/categories' + params);
        allCategories = categories.data || [];
        updateCategoriesUI();
        updateCategoryFilters();
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    }
    
    function updateTagsUI() {
      const container = document.getElementById('link-tags-container');
      if (!container) return;
      
      container.innerHTML = selectedTags.map(tag => 
        '<span class="tag-badge" style="background: ' + (tag.color || '#007bff') + '; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; cursor: pointer;" data-tag-id="' + tag.id + '" onclick="removeTag(this.dataset.tagId)">' +
          tag.name + ' ×' +
        '</span>'
      ).join('');
    }
    
    function updateTagFilters() {
      const dropdown = document.getElementById('tag-filter-dropdown');
      if (!dropdown) return;
      
      // Clear existing items except "All Tags"
      const allTagsItem = document.createElement('div');
      allTagsItem.className = 'dropdown-item';
      allTagsItem.setAttribute('data-value', '');
      allTagsItem.style.cssText = 'padding: 0.5rem; cursor: pointer; border-bottom: 1px solid #f0f0f0;';
      allTagsItem.textContent = 'All Tags';
      allTagsItem.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('tag-filter').value = '';
        document.getElementById('tag-filter-search').value = '';
        dropdown.style.display = 'none';
        loadLinks(1); // Reset to page 1 on filter change
      });
      dropdown.innerHTML = '';
      dropdown.appendChild(allTagsItem);
      
      // Use allTagsForFilter which contains all tags across all domains
      allTagsForFilter.forEach(tag => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.setAttribute('data-value', tag.id);
        item.style.cssText = 'padding: 0.5rem; cursor: pointer; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; gap: 0.5rem;';
        item.innerHTML = '<span style="width: 12px; height: 12px; border-radius: 2px; background: ' + (tag.color || '#007bff') + '; display: inline-block;"></span><span>' + tag.name + '</span>';
        item.addEventListener('click', () => {
          document.getElementById('tag-filter').value = tag.id;
          document.getElementById('tag-filter-search').value = tag.name;
          dropdown.style.display = 'none';
          loadLinks(1); // Reset to page 1 on filter change
        });
        item.addEventListener('mouseenter', () => {
          item.style.background = '#f0f0f0';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = 'white';
        });
        dropdown.appendChild(item);
      });
    }
    
    function updateCategoriesUI() {
      const select = document.getElementById('link-category');
      if (!select) return;
      
      select.innerHTML = '<option value="">No Category</option>';
      allCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        select.appendChild(option);
      });
    }
    
    function updateCategoryFilters() {
      const dropdown = document.getElementById('category-filter-dropdown');
      if (!dropdown) return;
      
      // Clear existing items except "All Categories"
      const allCategoriesItem = document.createElement('div');
      allCategoriesItem.className = 'dropdown-item';
      allCategoriesItem.setAttribute('data-value', '');
      allCategoriesItem.style.cssText = 'padding: 0.5rem; cursor: pointer; border-bottom: 1px solid #f0f0f0;';
      allCategoriesItem.textContent = 'All Categories';
      allCategoriesItem.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('category-filter').value = '';
        document.getElementById('category-filter-search').value = '';
        dropdown.style.display = 'none';
        loadLinks(1);
      });
      dropdown.innerHTML = '';
      dropdown.appendChild(allCategoriesItem);
      
      allCategories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.setAttribute('data-value', cat.id);
        item.style.cssText = 'padding: 0.5rem; cursor: pointer; border-bottom: 1px solid #f0f0f0;';
        item.textContent = cat.name;
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          document.getElementById('category-filter').value = cat.id;
          document.getElementById('category-filter-search').value = cat.name;
          dropdown.style.display = 'none';
          loadLinks(1);
        });
        item.addEventListener('mouseenter', () => {
          item.style.background = '#f0f0f0';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = 'white';
        });
        dropdown.appendChild(item);
      });
    }
    
    function initSearchableDropdowns() {
      // Tag filter dropdown
      const tagSearch = document.getElementById('tag-filter-search');
      const tagDropdown = document.getElementById('tag-filter-dropdown');
      
      if (tagSearch && tagDropdown) {
        tagSearch.addEventListener('focus', () => {
          tagDropdown.style.display = 'block';
          filterDropdownItems(tagSearch, tagDropdown);
        });
        
        tagSearch.addEventListener('input', (e) => {
          filterDropdownItems(tagSearch, tagDropdown);
        });
        
        tagSearch.addEventListener('blur', () => {
          // Delay to allow click on dropdown item
          setTimeout(() => {
            tagDropdown.style.display = 'none';
          }, 200);
        });
        
        // Clear filter when clicking "All Tags"
        tagSearch.addEventListener('click', (e) => {
          if (e.target.value === '') {
            document.getElementById('tag-filter').value = '';
            loadLinks(1);
          }
        });
      }
      
      // Category filter dropdown
      const categorySearch = document.getElementById('category-filter-search');
      const categoryDropdown = document.getElementById('category-filter-dropdown');
      
      if (categorySearch && categoryDropdown) {
        categorySearch.addEventListener('focus', () => {
          categoryDropdown.style.display = 'block';
          filterDropdownItems(categorySearch, categoryDropdown);
        });
        
        categorySearch.addEventListener('input', (e) => {
          filterDropdownItems(categorySearch, categoryDropdown);
        });
        
        categorySearch.addEventListener('blur', () => {
          // Delay to allow click on dropdown item
          setTimeout(() => {
            categoryDropdown.style.display = 'none';
          }, 200);
        });
        
        // Allow clearing filter by clicking when empty
        categorySearch.addEventListener('dblclick', (e) => {
          if (e.target.value === '') {
            document.getElementById('category-filter').value = '';
            loadLinks(1);
          }
        });
      }
      
      // Close dropdowns when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.searchable-dropdown')) {
          if (tagDropdown) tagDropdown.style.display = 'none';
          if (categoryDropdown) categoryDropdown.style.display = 'none';
        }
      });
    }
    
    function filterDropdownItems(searchInput, dropdown) {
      const searchValue = searchInput.value.toLowerCase();
      const items = dropdown.querySelectorAll('.dropdown-item');
      
      items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(searchValue) || searchValue === '') {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    }
    
    window.removeTag = (tagId) => {
      selectedTags = selectedTags.filter(t => t.id !== tagId);
      updateTagsUI();
    };
    
    function initTagsInput() {
      const input = document.getElementById('link-tags-input');
      if (!input) return;
      
      // Create autocomplete dropdown container
      let autocompleteContainer = document.getElementById('tags-autocomplete');
      if (!autocompleteContainer) {
        autocompleteContainer = document.createElement('div');
        autocompleteContainer.id = 'tags-autocomplete';
        autocompleteContainer.style.cssText = 'position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ddd; border-radius: 4px; max-height: 200px; overflow-y: auto; z-index: 1000; display: none; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-top: 0.25rem;';
        input.parentNode.appendChild(autocompleteContainer);
      }
      
      function showSuggestions(value = '') {
        const searchValue = value.toLowerCase();
        // Filter tags that aren't already selected
        const suggestions = allTags.filter(t => {
          const isNotSelected = !selectedTags.find(st => st.id === t.id);
          const matchesSearch = searchValue === '' || t.name.toLowerCase().includes(searchValue);
          return isNotSelected && matchesSearch;
        });
        
        if (suggestions.length === 0) {
          autocompleteContainer.style.display = 'none';
          return;
        }
        
        autocompleteContainer.innerHTML = suggestions.map(tag => {
          // Escape for HTML to prevent XSS
          const tagIdEscaped = escapeAttr(tag.id);
          const tagNameEscaped = escapeAttr(tag.name);
          const tagColorEscaped = escapeAttr(tag.color || '#007bff');
          // Use data attribute instead of inline onclick to avoid escaping issues
          // Use double quotes for style attribute values to avoid escaping issues
          return '<div style="padding: 0.5rem; cursor: pointer; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; gap: 0.5rem;" data-tag-id="' + tagIdEscaped + '" data-hover-bg="#f0f0f0" data-normal-bg="white">' +
            '<span style="width: 12px; height: 12px; border-radius: 2px; background: ' + tagColorEscaped + '; display: inline-block;"></span>' +
            '<span>' + tagNameEscaped + '</span>' +
          '</div>';
        }).join('');
        
        // Attach mouse event handlers after setting innerHTML
        autocompleteContainer.querySelectorAll('[data-tag-id]').forEach(item => {
          const hoverBg = item.getAttribute('data-hover-bg') || '#f0f0f0';
          const normalBg = item.getAttribute('data-normal-bg') || 'white';
          item.addEventListener('mouseenter', () => {
            item.style.background = hoverBg;
          });
          item.addEventListener('mouseleave', () => {
            item.style.background = normalBg;
          });
          item.addEventListener('click', () => {
            const tagId = item.getAttribute('data-tag-id');
            if (tagId) {
              window.selectTagFromAutocomplete(tagId);
            }
          });
        });
        autocompleteContainer.style.display = 'block';
      }
      
      function hideSuggestions() {
        autocompleteContainer.style.display = 'none';
      }
      
      window.selectTagFromAutocomplete = (tagId) => {
        const tag = allTags.find(t => t.id === tagId);
        if (tag && !selectedTags.find(st => st.id === tag.id)) {
          selectedTags.push(tag);
          updateTagsUI();
          input.value = '';
          hideSuggestions();
        }
      };
      
      input.addEventListener('focus', () => {
        showSuggestions(input.value);
      });
      
      input.addEventListener('input', (e) => {
        const value = e.target.value.toLowerCase();
        showSuggestions(value);
        
        // Auto-select if exact match
        if (value.length > 0) {
        const suggestions = allTags.filter(t => 
            t.name.toLowerCase() === value && !selectedTags.find(st => st.id === t.id)
        );
          if (suggestions.length === 1) {
          selectedTags.push(suggestions[0]);
          updateTagsUI();
          e.target.value = '';
            hideSuggestions();
          }
        }
      });
      
      input.addEventListener('blur', (e) => {
        // Delay hiding to allow click on suggestions
        setTimeout(() => hideSuggestions(), 200);
      });
      
      input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const value = e.target.value.trim();
          if (!value) return;
          
          // Check if tag exists
          const existing = allTags.find(t => t.name.toLowerCase() === value.toLowerCase());
          if (existing && !selectedTags.find(st => st.id === existing.id)) {
            selectedTags.push(existing);
            updateTagsUI();
            e.target.value = '';
            return;
          }
          
          // Create new tag
          try {
            const domainId = document.getElementById('link-domain')?.value;
            const tag = await apiRequest('/tags', {
              method: 'POST',
              body: JSON.stringify({
                name: value,
                domain_id: domainId || undefined,
                color: '#007bff',
              }),
            });
            allTags.push(tag.data);
            selectedTags.push(tag.data);
            updateTagsUI();
            await loadAllTagsForFilter(); // Reload all tags for filter
            e.target.value = '';
            showToast('Tag created and added!', 'success');
          } catch (error) {
            showToast('Failed to create tag: ' + error.message, 'error');
          }
        }
      });
    }
    
    async function createTag() {
      const name = document.getElementById('new-tag-name')?.value.trim();
      const color = document.getElementById('new-tag-color')?.value;
      
      if (!name) {
        showToast('Tag name is required', 'error');
        return;
      }
      
      try {
        const domainId = document.getElementById('domain-selector')?.value;
        const tag = await apiRequest('/tags', {
          method: 'POST',
          body: JSON.stringify({
            name,
            color,
            domain_id: domainId || undefined,
          }),
        });
        allTags.push(tag.data);
        updateTagsUI();
        await loadAllTagsForFilter(); // Reload all tags for filter
        loadTagsManagement();
        document.getElementById('new-tag-name').value = '';
        document.getElementById('create-tag-section').style.display = 'none';
        showToast('Tag created successfully!', 'success');
      } catch (error) {
        showToast('Failed to create tag: ' + error.message, 'error');
      }
    }
    
    async function deleteTag(tagId) {
      if (!confirm('Are you sure you want to delete this tag? It will be removed from all links.')) {
        return;
      }
      
      try {
        await apiRequest('/tags/' + tagId, { method: 'DELETE' });
        allTags = allTags.filter(t => t.id !== tagId);
        selectedTags = selectedTags.filter(t => t.id !== tagId);
        updateTagsUI();
        await loadAllTagsForFilter(); // Reload all tags for filter
        loadTagsManagement();
        showToast('Tag deleted successfully!', 'success');
      } catch (error) {
        showToast('Failed to delete tag: ' + error.message, 'error');
      }
    }
    
    window.deleteTagGlobal = deleteTag;
    
    let editingTagId = null;
    let editingCategoryId = null;
    
    // Note: escapeHtml is defined earlier in the script
    
    // Escape for HTML attribute values (handles quotes and special chars)
    function escapeAttr(text) {
      if (!text) return '';
      const str = String(text);
      let result = '';
      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        const charCode = char.charCodeAt(0);
        if (char === '&') {
          result += '&amp;';
        } else if (char === '<') {
          result += '&lt;';
        } else if (char === '>') {
          result += '&gt;';
        } else if (char === '"') {
          result += '&quot;';
        } else if (charCode === 39) {
          result += '&#039;';
        } else if (charCode !== 10 && charCode !== 13) {
          result += char;
        }
      }
      return result;
    }
    
    // Sanitize for use in HTML IDs (removes invalid characters)
    function sanitizeId(text) {
      if (text === null || text === undefined) return '';
      try {
        const str = String(text);
        if (!str) return '';
        let result = '';
        let lastWasHyphen = false;
        // Process each character
        for (let i = 0; i < str.length; i++) {
          const char = str[i];
          const charCode = char.charCodeAt(0);
          // Check if character is valid for HTML ID (letters, numbers, hyphen, underscore, dot)
          const isValid = (charCode >= 48 && charCode <= 57) || // 0-9
                         (charCode >= 65 && charCode <= 90) ||  // A-Z
                         (charCode >= 97 && charCode <= 122) || // a-z
                         charCode === 45 || charCode === 95 || charCode === 46; // -, _, .
          
          if (isValid) {
            if (charCode === 45) { // hyphen
              if (!lastWasHyphen && result.length > 0) {
                result += char;
                lastWasHyphen = true;
              }
            } else {
              result += char;
              lastWasHyphen = false;
            }
          } else {
            // Replace invalid character with hyphen (but not if last was hyphen)
            if (!lastWasHyphen && result.length > 0) {
              result += '-';
              lastWasHyphen = true;
            }
          }
        }
        // Remove leading/trailing hyphens
        while (result.length > 0 && result.charCodeAt(0) === 45) {
          result = result.substring(1);
        }
        while (result.length > 0 && result.charCodeAt(result.length - 1) === 45) {
          result = result.substring(0, result.length - 1);
        }
        return result;
      } catch (e) {
        console.error('Error sanitizing ID:', e);
        return '';
        }
    }
    

    
    // Event delegation handler for tag and category buttons (CSP-compliant)
    function handleTagCategoryClick(e) {
      const target = e.target;
      if (!target || !target.dataset) return;
      
      const action = target.dataset.action;
      if (!action) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      if (action === 'edit-tag') {
        editTag(target.dataset.tagId);
      } else if (action === 'delete-tag') {
        deleteTagGlobal(target.dataset.tagId);
      } else if (action === 'save-tag') {
        saveTagEdit(target.dataset.tagId);
      } else if (action === 'cancel-tag-edit') {
        cancelTagEdit();
      } else if (action === 'edit-category') {
        editCategory(target.dataset.categoryId);
      } else if (action === 'delete-category') {
        deleteCategoryGlobal(target.dataset.categoryId);
      } else if (action === 'save-category') {
        saveCategoryEdit(target.dataset.categoryId);
      } else if (action === 'cancel-category-edit') {
        cancelCategoryEdit();
      }
    }
    
    function renderTagsList(tags) {
      const container = document.getElementById('tags-list');
      if (!container) return;
      
      // Attach event delegation (CSP-compliant)
      // We need to clone and replace to remove old listeners to prevent duplicates
      // But since we're setting innerHTML below, we can just attach to container once
      // However, renderTagsList is called multiple times, so we should be careful
      
      // Better approach: Attach listener to container once if not already attached
      if (!container.hasAttribute('data-listener-attached')) {
        container.addEventListener('click', handleTagCategoryClick);
        container.setAttribute('data-listener-attached', 'true');
      }
      
      if (tags.length === 0) {
        container.innerHTML = '<p class="helper-text">No tags found.</p>';
        return;
      }
      
      container.innerHTML = tags.map((tag, index) => {
        if (editingTagId === tag.id) {
          // Edit mode
          const tagIdEscaped = escapeAttr(tag.id);
          let tagIdSanitized = sanitizeId(tag.id);
          // Ensure we always have a valid ID (fallback to index if sanitization results in empty)
          if (!tagIdSanitized) {
            tagIdSanitized = 'tag-' + index;
          }
          const tagNameEscaped = escapeAttr(tag.name || '');
          const tagColorEscaped = escapeAttr(tag.color || '#007bff');
          return '<div class="tag-item-edit">' +
            '<div style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">' +
              '<input type="text" id="edit-tag-name-' + tagIdSanitized + '" value="' + tagNameEscaped + '" class="settings-input" style="flex: 1;">' +
              '<input type="color" id="edit-tag-color-' + tagIdSanitized + '" value="' + tagColorEscaped + '" style="width: 60px; height: 40px; border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;">' +
            '</div>' +
            '<div style="display: flex; gap: 0.5rem; margin-left: 0.5rem;">' +
              '<button class="btn btn-sm btn-primary" data-action="save-tag" data-tag-id="' + tagIdEscaped + '">Save</button>' +
              '<button class="btn btn-sm btn-secondary" data-action="cancel-tag-edit">Cancel</button>' +
            '</div>' +
          '</div>';
        } else {
          // View mode
          const tagIdEscaped = escapeAttr(tag.id);
          const tagNameEscaped = escapeHtml(tag.name);
          const tagColorEscaped = escapeAttr(tag.color || '#007bff');
          return '<div class="tag-item">' +
          '<div style="display: flex; align-items: center; gap: 0.5rem;">' +
              '<span class="tag-badge" style="background: ' + tagColorEscaped + '; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem;">' + tagNameEscaped + '</span>' +
            '<span class="helper-text">' + (tag.domain_id ? 'Domain-specific' : 'Global') + '</span>' +
          '</div>' +
            '<div style="display: flex; gap: 0.5rem;">' +
              '<button class="btn btn-sm btn-primary" data-action="edit-tag" data-tag-id="' + tagIdEscaped + '">Edit</button>' +
              '<button class="btn btn-sm btn-secondary" data-action="delete-tag" data-tag-id="' + tagIdEscaped + '">Delete</button>' +
            '</div>' +
          '</div>';
        }
      }).join('');
    }

    async function loadTagsManagement(page = null, perPage = null) {
      try {
        // Update pagination state
        if (page !== null) paginationState.tags.page = page;
        if (perPage !== null) {
          paginationState.tags.perPage = perPage;
          paginationState.tags.page = 1;
        }
        
        const state = paginationState.tags;
        const offset = (state.page - 1) * state.perPage;
        
        const domainId = document.getElementById('domain-selector')?.value;
        const searchInput = document.getElementById('tags-search');
        const searchTerm = searchInput ? searchInput.value : '';
        
        const params = new URLSearchParams({
          limit: state.perPage.toString(),
          offset: offset.toString()
        });
        if (domainId) params.append('domain_id', domainId);
        
        const response = await apiRequest('/tags?' + params.toString());
        const tags = response.data || [];
        const pagination = response.pagination || {};
        
        // Filter by search term client-side (since API doesn't support search)
        const filteredTags = searchTerm 
          ? tags.filter(tag => tag.name.toLowerCase().includes(searchTerm.toLowerCase()))
          : tags;
        
        // Also update allTags for other features
        allTags = tags;
        renderTagsList(filteredTags);
        
        // Update pagination info
        const infoEl = document.getElementById('tags-pagination-info');
        if (infoEl && pagination.total !== undefined && pagination.total > 0) {
          const start = (pagination.offset || 0) + 1;
          const end = Math.min((pagination.offset || 0) + pagination.count, pagination.total);
          infoEl.textContent = 'Showing ' + start + '-' + end + ' of ' + pagination.total;
        } else if (infoEl) {
          infoEl.textContent = 'No items';
        }
        
        // Render pagination controls
        if (pagination.total !== undefined && pagination.total > 0) {
          renderPagination('tags-pagination', state, pagination.total, (page) => loadTagsManagement(page));
        } else {
          const paginationEl = document.getElementById('tags-pagination');
          if (paginationEl) paginationEl.innerHTML = '';
        }
      } catch (error) {
        console.error('Failed to load tags management:', error);
      }
    }
    
    async function createCategory() {
      const name = document.getElementById('new-category-name')?.value.trim();
      
      if (!name) {
        showToast('Category name is required', 'error');
        return;
      }
      
      try {
        const domainId = document.getElementById('domain-selector')?.value;
        const category = await apiRequest('/categories', {
          method: 'POST',
          body: JSON.stringify({
            name,
            domain_id: domainId || undefined,
          }),
        });
        allCategories.push(category.data);
        updateCategoriesUI();
        updateCategoryFilters();
        loadCategoriesManagement();
        document.getElementById('new-category-name').value = '';
        document.getElementById('create-category-section').style.display = 'none';
        showToast('Category created successfully!', 'success');
      } catch (error) {
        showToast('Failed to create category: ' + error.message, 'error');
      }
    }
    
    async function deleteCategory(categoryId) {
      if (!confirm('Are you sure you want to delete this category? Links using this category will lose their category assignment.')) {
        return;
      }
      
      try {
        await apiRequest('/categories/' + categoryId, { method: 'DELETE' });
        allCategories = allCategories.filter(c => c.id !== categoryId);
        updateCategoriesUI();
        updateCategoryFilters();
        loadCategoriesManagement();
        showToast('Category deleted successfully!', 'success');
      } catch (error) {
        showToast('Failed to delete category: ' + error.message, 'error');
      }
    }
    
    window.deleteCategoryGlobal = deleteCategory;
    
    function renderCategoriesList(categories) {
      const container = document.getElementById('categories-list');
      if (!container) return;
      
      // Attach event delegation (CSP-compliant)
      if (!container.hasAttribute('data-listener-attached')) {
        container.addEventListener('click', handleTagCategoryClick);
        container.setAttribute('data-listener-attached', 'true');
      }
      
      if (categories.length === 0) {
        container.innerHTML = '<p class="helper-text">No categories found.</p>';
        return;
      }
      
      container.innerHTML = categories.map((cat, index) => {
        if (editingCategoryId === cat.id) {
          // Edit mode
          const catIdEscaped = escapeAttr(cat.id);
          let catIdSanitized = sanitizeId(cat.id);
          // Ensure we always have a valid ID (fallback to index if sanitization results in empty)
          if (!catIdSanitized) {
            catIdSanitized = 'cat-' + index;
          }
          const catNameEscaped = escapeAttr(cat.name || '');
          return '<div class="category-item-edit">' +
            '<div style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">' +
              '<input type="text" id="edit-category-name-' + catIdSanitized + '" value="' + catNameEscaped + '" class="settings-input" style="flex: 1;">' +
            '</div>' +
            '<div style="display: flex; gap: 0.5rem; margin-left: 0.5rem;">' +
              '<button class="btn btn-sm btn-primary" data-action="save-category" data-category-id="' + catIdEscaped + '">Save</button>' +
              '<button class="btn btn-sm btn-secondary" data-action="cancel-category-edit">Cancel</button>' +
            '</div>' +
          '</div>';
        } else {
          // View mode
          const catIdEscaped = escapeAttr(cat.id);
          const catNameEscaped = escapeHtml(cat.name);
          return '<div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f8f9fa; border-radius: 4px; margin-bottom: 0.5rem;">' +
          '<div style="display: flex; align-items: center; gap: 0.5rem;">' +
              '<span style="font-weight: 500;">' + catNameEscaped + '</span>' +
            '<span style="color: #666; font-size: 0.875rem;">' + (cat.domain_id ? 'Domain-specific' : 'Global') + '</span>' +
          '</div>' +
            '<div style="display: flex; gap: 0.5rem;">' +
              '<button class="btn btn-sm btn-primary" data-action="edit-category" data-category-id="' + catIdEscaped + '">Edit</button>' +
              '<button class="btn btn-sm btn-secondary" data-action="delete-category" data-category-id="' + catIdEscaped + '">Delete</button>' +
            '</div>' +
          '</div>';
        }
      }).join('');
    }
    
    async function loadCategoriesManagement(page = null, perPage = null) {
      try {
        // Update pagination state
        if (page !== null) paginationState.categories.page = page;
        if (perPage !== null) {
          paginationState.categories.perPage = perPage;
          paginationState.categories.page = 1;
        }
        
        const state = paginationState.categories;
        const offset = (state.page - 1) * state.perPage;
        
        const domainId = document.getElementById('domain-selector')?.value;
        const searchInput = document.getElementById('categories-search');
        const searchTerm = searchInput ? searchInput.value : '';
        
        const params = new URLSearchParams({
          limit: state.perPage.toString(),
          offset: offset.toString()
        });
        if (domainId) params.append('domain_id', domainId);
        
        const response = await apiRequest('/categories?' + params.toString());
        const categories = response.data || [];
        const pagination = response.pagination || {};
        
        // Filter by search term client-side (since API doesn't support search)
        const filteredCategories = searchTerm 
          ? categories.filter(cat => cat.name.toLowerCase().includes(searchTerm.toLowerCase()))
          : categories;
        
        // Also update allCategories for other features
        allCategories = categories;
        renderCategoriesList(filteredCategories);
        
        // Update pagination info
        const infoEl = document.getElementById('categories-pagination-info');
        if (infoEl && pagination.total !== undefined && pagination.total > 0) {
          const start = (pagination.offset || 0) + 1;
          const end = Math.min((pagination.offset || 0) + pagination.count, pagination.total);
          infoEl.textContent = 'Showing ' + start + '-' + end + ' of ' + pagination.total;
        } else if (infoEl) {
          infoEl.textContent = 'No items';
        }
        
        // Render pagination controls
        if (pagination.total !== undefined && pagination.total > 0) {
          renderPagination('categories-pagination', state, pagination.total, (page) => loadCategoriesManagement(page));
        } else {
          const paginationEl = document.getElementById('categories-pagination');
          if (paginationEl) paginationEl.innerHTML = '';
        }
      } catch (error) {
        console.error('Failed to load categories management:', error);
      }
    }
    
    // Tag edit functions
    function editTag(tagId) {
      editingTagId = tagId;
      loadTagsManagement();
    }
    
    async function saveTagEdit(tagId) {
      const tagIdSanitized = sanitizeId(tagId);
      const nameInput = document.getElementById('edit-tag-name-' + tagIdSanitized);
      const colorInput = document.getElementById('edit-tag-color-' + tagIdSanitized);
      
      if (!nameInput || !colorInput) {
        showToast('Failed to find edit inputs', 'error');
        return;
      }
      
      const name = nameInput.value.trim();
      if (!name) {
        showToast('Tag name is required', 'error');
        return;
      }
      
      try {
        const response = await apiRequest('/tags/' + tagId, {
          method: 'PUT',
          body: JSON.stringify({
            name,
            color: colorInput.value,
          }),
        });
        
        // Update the tag in allTags array
        const tagIndex = allTags.findIndex(t => t.id === tagId);
        if (tagIndex !== -1) {
          allTags[tagIndex] = response.data;
        }
        
        // Update selected tags if this tag is selected
        const selectedIndex = selectedTags.findIndex(t => t.id === tagId);
        if (selectedIndex !== -1) {
          selectedTags[selectedIndex] = response.data;
        }
        
        editingTagId = null;
        updateTagsUI();
        await loadAllTagsForFilter();
        loadTagsManagement();
        showToast('Tag updated successfully!', 'success');
      } catch (error) {
        showToast('Failed to update tag: ' + error.message, 'error');
      }
    }
    
    function cancelTagEdit() {
      editingTagId = null;
      loadTagsManagement();
    }
    
    // Category edit functions
    function editCategory(categoryId) {
      editingCategoryId = categoryId;
      loadCategoriesManagement();
    }
    
    async function saveCategoryEdit(categoryId) {
      const categoryIdSanitized = sanitizeId(categoryId);
      const nameInput = document.getElementById('edit-category-name-' + categoryIdSanitized);
      
      if (!nameInput) {
        showToast('Failed to find edit input', 'error');
        return;
      }
      
      const name = nameInput.value.trim();
      if (!name) {
        showToast('Category name is required', 'error');
        return;
      }
      
      try {
        const response = await apiRequest('/categories/' + categoryId, {
          method: 'PUT',
          body: JSON.stringify({
            name,
          }),
        });
        
        // Update the category in allCategories array
        const catIndex = allCategories.findIndex(c => c.id === categoryId);
        if (catIndex !== -1) {
          allCategories[catIndex] = response.data;
        }
        
        editingCategoryId = null;
        updateCategoriesUI();
        updateCategoryFilters();
        loadCategoriesManagement();
        showToast('Category updated successfully!', 'success');
      } catch (error) {
        showToast('Failed to update category: ' + error.message, 'error');
      }
    }
    
    function cancelCategoryEdit() {
      editingCategoryId = null;
      loadCategoriesManagement();
    }
    
    // Make functions globally available
    window.editTag = editTag;
    window.saveTagEdit = saveTagEdit;
    window.cancelTagEdit = cancelTagEdit;
    window.editCategory = editCategory;
    window.saveCategoryEdit = saveCategoryEdit;
    window.cancelCategoryEdit = cancelCategoryEdit;
    
    function initTagsCategoriesModals() {
      // Tag and category management buttons navigate to pages
      const manageTagsBtn = document.getElementById('manage-tags-btn');
      const manageCategoriesBtn = document.getElementById('manage-categories-btn');
      
      manageTagsBtn?.addEventListener('click', () => {
        // Navigate to tags page
        window.location.hash = 'tags';
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(l => l.classList.remove('active'));
        const tagsLink = document.querySelector('[data-page="tags"]');
        if (tagsLink) tagsLink.classList.add('active');
        showPage('tags');
      });
      
      manageCategoriesBtn?.addEventListener('click', () => {
        // Navigate to categories page
        window.location.hash = 'categories';
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(l => l.classList.remove('active'));
        const categoriesLink = document.querySelector('[data-page="categories"]');
        if (categoriesLink) categoriesLink.classList.add('active');
        showPage('categories');
      });
      
      // Back buttons
      document.getElementById('back-to-links-from-tags')?.addEventListener('click', () => {
        window.location.hash = 'dashboard';
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(l => l.classList.remove('active'));
        const dashboardLink = document.querySelector('[data-page="dashboard"]');
        if (dashboardLink) dashboardLink.classList.add('active');
        showPage('dashboard');
      });
      
      document.getElementById('back-to-links-from-categories')?.addEventListener('click', () => {
        window.location.hash = 'dashboard';
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(l => l.classList.remove('active'));
        const dashboardLink = document.querySelector('[data-page="dashboard"]');
        if (dashboardLink) dashboardLink.classList.add('active');
        showPage('dashboard');
      });
      
      // Search functionality
      document.getElementById('tags-search')?.addEventListener('input', () => {
        loadTagsManagement();
      });
      
      document.getElementById('categories-search')?.addEventListener('input', () => {
        loadCategoriesManagement();
      });
      
      // Toggle create sections
      document.getElementById('toggle-create-tag-btn')?.addEventListener('click', () => {
        const section = document.getElementById('create-tag-section');
        if (section) {
          section.style.display = section.style.display === 'none' ? 'block' : 'none';
        }
      });
      
      document.getElementById('toggle-create-category-btn')?.addEventListener('click', () => {
        const section = document.getElementById('create-category-section');
        if (section) {
          section.style.display = section.style.display === 'none' ? 'block' : 'none';
        }
      });
      
      document.getElementById('create-tag-btn')?.addEventListener('click', createTag);
      document.getElementById('create-category-btn')?.addEventListener('click', createCategory);
    }
    
    
    // ============================================================================
    // DOMAIN SERVICE - Domain Management Functions
    // ============================================================================
    // This section contains all domain-related business logic:
    // - loadDomains: Fetch and display domains
    // - createDomain: Add new custom domains
    // - editDomain: Update domain settings
    // - deleteDomain: Remove domains
    // - activateDomain/deactivateDomain: Toggle domain status
    // ============================================================================
    
    // Domain modal state
    let domainRoutes = [];
    
    function renderRoutes() {
      const routesContainer = document.getElementById('routes-container');
      if (!routesContainer) return;
      
      routesContainer.innerHTML = domainRoutes.map((route, index) => {
        const routeValue = escapeAttr(route);
        return '<div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;" data-route-index="' + index + '">' +
          '<input type="text" class="route-input" data-index="' + index + '" value="' + routeValue + '" placeholder="/go/*" style="flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" required>' +
          (domainRoutes.length > 1 ? 
            '<button type="button" class="btn btn-secondary remove-route-btn" data-index="' + index + '" style="padding: 0.5rem 1rem;">Remove</button>' 
            : '') +
        '</div>';
      }).join('');
      
      // Attach event listeners to route inputs
      routesContainer.querySelectorAll('.route-input').forEach(input => {
        input.addEventListener('input', (e) => {
          const index = parseInt(e.target.getAttribute('data-index'));
          domainRoutes[index] = e.target.value;
        });
      });
      
      // Attach event listeners to remove buttons
      routesContainer.querySelectorAll('.remove-route-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const index = parseInt(e.target.getAttribute('data-index'));
          domainRoutes.splice(index, 1);
          renderRoutes();
        });
      });
    }
    
    function initAddDomainModal() {
      const modal = document.getElementById('add-domain-modal');
      const addBtn = document.getElementById('add-domain-btn');
      const closeBtn = modal.querySelector('.close');
      const cancelBtn = modal.querySelector('.close-modal-btn');
      const form = document.getElementById('add-domain-form');
      const addRouteBtn = document.getElementById('add-route-btn');
      
      // Open modal for adding
      addBtn?.addEventListener('click', () => {
        // Reset form and set to "Add" mode
        form.reset();
        document.getElementById('domain-edit-id').value = '';
        document.getElementById('domain-modal-title').textContent = 'Add Domain';
        document.getElementById('submit-domain-btn').textContent = 'Create Domain';
        domainRoutes = ['/go/*']; // Default route
        renderRoutes();
        modal.classList.add('active');
      });
      
      // Close modal
      closeBtn?.addEventListener('click', () => {
        modal.classList.remove('active');
      });
      
      cancelBtn?.addEventListener('click', () => {
        modal.classList.remove('active');
      });
      
      // Close on outside click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
      
      // Add route button
      addRouteBtn?.addEventListener('click', () => {
        domainRoutes.push('');
        renderRoutes();
      });
      
      // Form submission
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitDomain();
      });
    }
    
    async function submitDomain() {
      try {
        const domainName = document.getElementById('domain-name').value.trim();
        const redirectCode = parseInt(document.getElementById('domain-redirect-code').value);
        const editId = document.getElementById('domain-edit-id').value;
        const isEdit = editId !== '';
        
        // Validate domain name
        if (!domainName) {
          showToast('Domain name is required', 'error');
          return;
        }
        
        if (domainName.length > 253) {
          showToast('Domain name must be 253 characters or less', 'error');
          return;
        }
        
        // Domain name validation regex (same as backend)
        const domainNameRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
        if (!domainNameRegex.test(domainName)) {
          showToast('Invalid domain name format. Domain must be valid (e.g., example.com, subdomain.example.com)', 'error');
          return;
        }
        
        if (domainName.startsWith('.') || domainName.endsWith('.')) {
          showToast('Domain name cannot start or end with a dot', 'error');
          return;
        }
        
        if (domainName.includes('..')) {
          showToast('Domain name cannot contain consecutive dots', 'error');
          return;
        }
        
        // Validate routes
        const validRoutes = domainRoutes.filter(r => r.trim() !== '');
        if (validRoutes.length === 0) {
          showToast('At least one route is required', 'error');
          return;
        }
        
        // Prepare request body
        const requestBody = {
          routes: validRoutes,
          default_redirect_code: redirectCode,
        };
        
        // For edit, also include domain_name if it changed
        if (isEdit) {
          requestBody.domain_name = domainName;
        } else {
          // For create, include all required fields
          requestBody.domain_name = domainName;
          requestBody.cloudflare_account_id = 'default';
          requestBody.status = 'active';
        }
        
        // Submit domain (POST for create, PUT for update)
        let response;
        if (isEdit) {
          response = await apiRequest('/domains/' + editId, {
            method: 'PUT',
            body: JSON.stringify(requestBody),
          });
        } else {
          response = await apiRequest('/domains', {
            method: 'POST',
            body: JSON.stringify(requestBody),
          });
        }
        
        // Check if response indicates success
        if (!response) {
          showToast('Failed to ' + (isEdit ? 'update' : 'add') + ' domain: No response from server', 'error');
          return;
        }
        
        if (!response.success) {
          // Extract error message from response
          const errorMessage = response.error?.message || response.error?.code || 'An unknown error occurred';
          showToast('Failed to ' + (isEdit ? 'update' : 'add') + ' domain: ' + errorMessage, 'error');
          return;
        }
        
        // Success - close modal and refresh
        document.getElementById('add-domain-modal').classList.remove('active');
        await loadDomains();
        await loadDomainSelector();
        showToast(isEdit ? 'Domain updated successfully!' : 'Domain added successfully!', 'success');
      } catch (error) {
        // Extract error message properly
        let errorMessage = 'An internal error occurred';
        if (error instanceof Error) {
          errorMessage = error.message || errorMessage;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error && typeof error === 'object' && 'message' in error) {
          errorMessage = String(error.message);
        }
        showToast('Failed to ' + (document.getElementById('domain-edit-id').value ? 'update' : 'add') + ' domain: ' + errorMessage, 'error');
      }
    }
    
    async function editDomain(domainId) {
      try {
        // Fetch domain data
        const domain = await apiRequest('/domains/' + domainId);
        const domainData = domain.data;
        
        if (!domainData) {
          showToast('Domain not found', 'error');
          return;
        }
        
        // Get routes (fallback to routing_path if routes not available)
        const routes = domainData.routes || [domainData.routing_path];
        
        // Populate form fields
        document.getElementById('domain-name').value = domainData.domain_name || '';
        document.getElementById('domain-redirect-code').value = domainData.default_redirect_code || 301;
        document.getElementById('domain-edit-id').value = domainId;
        
        // Set routes
        domainRoutes = routes.length > 0 ? routes : ['/go/*'];
        renderRoutes();
        
        // Update modal title and button
        document.getElementById('domain-modal-title').textContent = 'Edit Domain';
        document.getElementById('submit-domain-btn').textContent = 'Update Domain';
        
        // Open modal
        document.getElementById('add-domain-modal').classList.add('active');
      } catch (error) {
        showToast('Failed to load domain: ' + error.message, 'error');
      }
    }
    
    async function toggleDomainStatus(domainId) {
      try {
        // Get current domain status to show appropriate confirmation
        const domain = await apiRequest('/domains/' + domainId);
        const currentStatus = domain.data?.status;
        const action = currentStatus === 'active' ? 'deactivate' : 'activate';
        const actionPast = currentStatus === 'active' ? 'deactivated' : 'activated';
        
        const confirmMessage = currentStatus === 'active' 
          ? 'Are you sure you want to ' + action + ' this domain? Links will stop redirecting and new links cannot be created.'
          : 'Are you sure you want to ' + action + ' this domain? Domain will be re-enabled and links will start redirecting again.';
        if (!confirm(confirmMessage)) {
          return;
        }
        
        const response = await apiRequest('/domains/' + domainId, { method: 'DELETE' });
        await loadDomains();
        await loadDomainSelector();
        showToast('Domain ' + actionPast + ' successfully!', 'success');
      } catch (error) {
        showToast('Failed to toggle domain status: ' + error.message, 'error');
      }
    }
    
    window.toggleDomainStatus = toggleDomainStatus;
    window.editDomain = editDomain;
    
    // Load domain selector (only active domains for link creation)
    async function loadDomainSelector() {
      try {
        const domains = await apiRequest('/domains');
        const selector = document.getElementById('domain-selector');
        if (!selector) return;
        
        selector.innerHTML = '<option value="">All Domains</option>';
        domains.data?.forEach(domain => {
          // Only show active domains in selector for link creation
          if (domain.status === 'active') {
            const option = document.createElement('option');
            option.value = domain.id;
            option.textContent = domain.domain_name;
            selector.appendChild(option);
          }
        });
        
        selector.addEventListener('change', () => {
          loadLinks();
          // loadDashboard(); // DEPRECATED - summary stats removed
        });
      } catch (error) {
        console.error('Failed to load domains:', error);
      }
    }
    
    // Event delegation handler for domain buttons
    function handleDomainButtonClick(e) {
      const target = e.target;
      // Handle clicks on buttons or elements inside buttons
      const button = target.closest('button');
      if (!button || !button.dataset.action) return;
      
      const action = button.dataset.action;
      const domainId = button.dataset.domainId;
      
      if (!action || !domainId) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      if (action === 'edit-domain') {
        editDomain(domainId);
      } else if (action === 'toggle-status') {
        toggleDomainStatus(domainId);
      }
    }

    // Load domains with information display
    async function loadDomains() {
      const container = document.getElementById('domains-list');
      if (!container) return;
      
      // Show loading indicator immediately
      container.innerHTML = '<div style="text-align: center; padding: 3rem; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">' +
        '<div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;"></div>' +
        '<p style="color: #666; margin: 0;">Loading domains...</p>' +
        '</div>';
      
      try {
        // Request domains
        const domains = await apiRequest('/domains');
        
        // Check user role to determine if delete buttons should be shown
        let isAdminOrOwner = false;
        try {
          const user = await apiRequest('/auth/me');
          isAdminOrOwner = user.data?.role === 'owner' || user.data?.role === 'admin';
        } catch (error) {
          console.error('Failed to get user role:', error);
        }
        
        if (domains.data?.length === 0) {
          container.innerHTML = '<p>No domains configured. Click "Add Domain" to add one.</p>';
          return;
        }
        
        container.innerHTML = domains.data?.map(domain => {
          // Get routes (fallback to routing_path if routes not available)
          const routes = domain.routes || [domain.routing_path];
          
          // Format dates - timestamps are stored in milliseconds (from Date.now())
          const formatDate = (timestamp) => {
            if (!timestamp) return 'N/A';
            // Timestamps are already in milliseconds, don't multiply by 1000
            const date = new Date(timestamp);
            return date.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          };
          const createdDate = formatDate(domain.created_at);
          const updatedDate = formatDate(domain.updated_at);
                    // Build routes HTML
           const routesHtml = routes.map(r => '<span class="code-badge">' + escapeHtml(r) + '</span>').join('');
           
           // Status warning for inactive domains
           const statusWarning = domain.status === 'inactive' 
             ? '<div class="warning-box">' +
                 '<strong style="display: block; margin-bottom: 0.5rem;">⚠️ Domain Inactive</strong>' +
                 '<p style="margin: 0; font-size: 0.875rem;">This domain is inactive. Links will not redirect and new links cannot be created. Click "Activate Domain" to re-enable anytime.</p>' +
               '</div>'
             : '';
           
           // Toggle button based on status
           const toggleButtonText = domain.status === 'active' ? 'Deactivate Domain' : 'Activate Domain';
           const toggleButtonClass = domain.status === 'active' ? 'btn-secondary' : 'btn-primary';
           
           const actionButtons = isAdminOrOwner 
             ? '<div style="display: flex; gap: 0.5rem; margin-top: 1rem;">' +
                 '<button class="btn btn-primary" data-action="edit-domain" data-domain-id="' + domain.id + '">Edit</button>' +
                 '<button class="btn ' + toggleButtonClass + '" data-action="toggle-status" data-domain-id="' + domain.id + '">' + escapeHtml(toggleButtonText) + '</button>' +
               '</div>'
             : '';
             
           return '<div class="domain-card">' +
             '<h3 style="margin: 0 0 1rem 0; color: var(--text-color);">' + escapeHtml(domain.domain_name) + '</h3>' +
             statusWarning +
             '<div style="margin: 0.5rem 0;"><strong>Routes:</strong><div style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">' + routesHtml + '</div></div>' +
             '<p style="margin: 0.5rem 0;"><strong>Status:</strong> <span class="status-badge status-' + domain.status + '">' + escapeHtml(domain.status) + '</span></p>' +
             '<p style="margin: 0.5rem 0;"><strong>Default Redirect Code:</strong> ' + domain.default_redirect_code + '</p>' +
             '<p style="margin: 0.5rem 0;"><strong>Created:</strong> ' + escapeHtml(createdDate) + '</p>' +
             '<p style="margin: 0.5rem 0;"><strong>Last Updated:</strong> ' + escapeHtml(updatedDate) + '</p>' +
             '<p class="helper-text" style="margin: 0.5rem 0;"><strong>Note:</strong> Ensure these routes are configured in your Cloudflare Workers route settings.</p>' +
             actionButtons +
           '</div>';
        }).join('') || '';
        
        // Attach event listener for domain buttons
        container.removeEventListener('click', handleDomainButtonClick);
        container.addEventListener('click', handleDomainButtonClick);
      } catch (error) {
        console.error('Failed to load domains:', error);
        const container = document.getElementById('domains-list');
        if (container) {
          container.innerHTML = '<p>Error loading domains. Check authentication.</p>';
        }
      }
    }
    
    
    // ============================================================================
    // END DOMAIN SERVICE
    // ============================================================================
    
    // ============================================================================
    // ANALYTICS SERVICE - Analytics & Reporting Functions
    // ============================================================================
    // This section contains all analytics-related business logic:
    // - loadAnalytics: Fetch and display dashboard analytics
    // - loadAnalyticsGeography: Load geographic data
    // - loadAnalyticsDevices: Load device breakdown
    // - loadAnalyticsBrowsers: Load browser statistics
    // - Chart rendering and data processing
    // ============================================================================
    
    async function loadAnalytics() {
      try {
        let startDate = document.getElementById('analytics-start-date')?.value;
        let endDate = document.getElementById('analytics-end-date')?.value;
        const domainFilter = document.getElementById('analytics-domain-filter')?.value;
        const tagFilter = document.getElementById('analytics-tag-filter')?.value;
        const categoryFilter = document.getElementById('analytics-category-filter')?.value;
        // Get breakdown value before making API call
        const breakdownValue = document.getElementById('analytics-breakdown')?.value || 'day';
        
        // Ensure dates are set (default to last 30 days if not set)
        if (!startDate || !endDate) {
          const defaultEndDate = new Date();
          const defaultStartDate = new Date();
          defaultStartDate.setDate(defaultStartDate.getDate() - 30);
          if (!startDate) startDate = defaultStartDate.toISOString().slice(0, 10);
          if (!endDate) endDate = defaultEndDate.toISOString().slice(0, 10);
        }
        
        // DEBUG: console.log('[LOAD ANALYTICS] Filter values:', {
        //   startDate,
        //   endDate,
        //   domainFilter,
        //   tagFilter,
        //   categoryFilter,
        //   breakdownValue
        // });
        
        const content = document.getElementById('analytics-content');
        if (!content) return;
        
        content.innerHTML = '<div class="loading-spinner"></div> Loading analytics data...';
        
        // Build query parameters
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (domainFilter) params.append('domain_names', domainFilter);
        if (tagFilter) params.append('tag_ids', tagFilter);
        if (categoryFilter) params.append('category_ids', categoryFilter);
        // Add group_by parameter
        params.append('group_by', breakdownValue);
        
        // DEBUG: console.log('[LOAD ANALYTICS] API URL:', '/analytics/dashboard?' + params.toString());
        
        const analytics = await apiRequest('/analytics/dashboard?' + params.toString());
        
        // DEBUG: console.log('[LOAD ANALYTICS] API Response:', analytics);
        // DEBUG: console.log('[LOAD ANALYTICS] Time series data:', analytics.data?.time_series);
        // DEBUG: console.log('[LOAD ANALYTICS] Time series length:', analytics.data?.time_series?.length);
        // DEBUG: console.log('[LOAD ANALYTICS] Meta info:', analytics.meta);
        // DEBUG: console.log('[LOAD ANALYTICS] Warnings:', analytics.meta?.warnings);
        // DEBUG: console.log('[LOAD ANALYTICS] Debug info:', analytics.meta?.debug);
        
        if (!analytics.data) {
          content.innerHTML = '<p style="color: var(--error-color);">No data available</p>';
          return;
        }
        
        const data = analytics.data;
        const summary = data.summary || {};
        const warnings = analytics.meta?.warnings || [];
        const debug = analytics.meta?.debug;
        
        // DEBUG: console.log('[LOAD ANALYTICS] Summary:', summary);
        // DEBUG: console.log('[LOAD ANALYTICS] Time series in data:', data.time_series);
        
        // Show warnings if any
        if (warnings.length > 0) {
          // DEBUG: console.warn('[LOAD ANALYTICS] API Warnings:', warnings);
          warnings.forEach(warning => {
            showToast(warning, 'warning');
          });
        }
        
        // Clear content and build grid layout
        content.innerHTML = '';
        
        // 1. Key Metrics Row (3 Cards)
        const metricsRow = document.createElement('div');
        metricsRow.className = 'analytics-grid';
        metricsRow.innerHTML = [
          '<div class="analytics-card col-span-3">',
            '<h3>📊 Total Clicks</h3>',
            '<div class="metric-value">' + (summary.total_clicks || 0).toLocaleString() + '</div>',
            '<div class="metric-sub">All time clicks</div>',
          '</div>',
          '<div class="analytics-card col-span-3">',
            '<h3>👥 Unique Visitors</h3>',
            '<div class="metric-value">' + (summary.total_unique_visitors || 0).toLocaleString() + '</div>',
            '<div class="metric-sub">Distinct visitors</div>',
          '</div>',
          '<div class="analytics-card col-span-3">',
            '<h3>🔗 Total Links</h3>',
            '<div class="metric-value">' + (summary.total_links || 0).toLocaleString() + '</div>',
            '<div class="metric-sub">All links</div>',
          '</div>'
        ].join('');
        content.appendChild(metricsRow);
        
        // 2. Main Chart Row - Always show, even if no data
        const chartRow = document.createElement('div');
        chartRow.className = 'analytics-grid';
        const breakdownLabels = {
          day: 'Daily Clicks',
          week: 'Weekly Clicks',
          month: 'Monthly Clicks'
        };
        chartRow.innerHTML = [
          '<div class="analytics-card col-span-12">',
            '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">',
              '<h3 style="margin: 0;">' + (breakdownLabels[breakdownValue] || 'Daily Clicks') + '</h3>',
              '<select id="analytics-breakdown" style="padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; background: var(--card-bg); color: var(--text-color); cursor: pointer;">',
                '<option value="day"' + (breakdownValue === 'day' ? ' selected' : '') + '>By Day</option>',
                '<option value="week"' + (breakdownValue === 'week' ? ' selected' : '') + '>By Week</option>',
                '<option value="month"' + (breakdownValue === 'month' ? ' selected' : '') + '>By Month</option>',
              '</select>',
            '</div>',
            '<div class="chart-container">',
              '<canvas id="analytics-overview-chart"></canvas>',
            '</div>',
          '</div>'
        ].join('');
        content.appendChild(chartRow);
        
        // Add event listener for breakdown change
        const breakdownSelect = document.getElementById('analytics-breakdown');
        if (breakdownSelect) {
          breakdownSelect.addEventListener('change', () => {
            loadAnalytics();
          });
        }
        
        // Render chart (will handle empty data gracefully)
        if (data.time_series && data.time_series.length > 0) {
          // DEBUG: console.log('[LOAD ANALYTICS] Rendering chart with', data.time_series.length, 'data points');
          renderOverallAnalyticsChart(data, 'analytics-overview-chart', breakdownValue);
        } else {
          // DEBUG: console.warn('[LOAD ANALYTICS] No time series data available. Summary:', summary);
          // DEBUG: console.warn('[LOAD ANALYTICS] Debug info:', debug);
          
          // Build helpful message based on debug info
          let message = 'No analytics data available for the selected date range.';
          if (debug) {
            if (debug.linkIdsCount === 0) {
              message += '<br><small>No links match your filters. Try removing filters or creating links.</small>';
            } else if (!debug.hasRecentRange && !debug.hasOldRange) {
              message += '<br><small>Invalid date range selected.</small>';
            } else {
              message += '<br><small>No clicks were tracked during this period. Try a different date range.</small>';
            }
          }
          
          // Show message in chart container if no data
          const chartContainer = document.querySelector('#analytics-overview-chart')?.parentElement;
          if (chartContainer) {
            const canvas = document.getElementById('analytics-overview-chart');
            if (canvas) {
              canvas.style.display = 'none';
            }
            // Check if message already exists
            if (!chartContainer.querySelector('.no-data-message')) {
              const noDataMsg = document.createElement('div');
              noDataMsg.className = 'no-data-message';
              noDataMsg.style.cssText = 'text-align: center; padding: 3rem; color: var(--secondary-color);';
              noDataMsg.innerHTML = '<p style="font-size: 1.1rem; margin-bottom: 0.5rem;">' + message + '</p>';
              chartContainer.appendChild(noDataMsg);
            } else {
              // Update existing message
              const existingMsg = chartContainer.querySelector('.no-data-message');
              if (existingMsg) {
                existingMsg.innerHTML = '<p style="font-size: 1.1rem; margin-bottom: 0.5rem;">' + message + '</p>';
              }
            }
          } else {
            // Fallback: render empty chart
            renderOverallAnalyticsChart({ time_series: [] }, 'analytics-overview-chart', breakdownValue);
          }
        }
        
        // 3. Tech & Geo Row (3 Columns)
        const techGeoRow = document.createElement('div');
        techGeoRow.className = 'analytics-grid';
        
        // Device Types
        const deviceCard = document.createElement('div');
        deviceCard.className = 'analytics-card col-span-4';
        deviceCard.innerHTML = '<h3>💻 Device Types</h3><div class="donut-wrapper"><canvas id="analytics-device-chart"></canvas></div>';
        techGeoRow.appendChild(deviceCard);
        
        // Operating Systems
        const osCard = document.createElement('div');
        osCard.className = 'analytics-card col-span-4';
        osCard.innerHTML = '<h3>🖥️ Operating Systems</h3><div class="donut-wrapper"><canvas id="analytics-os-chart"></canvas></div>';
        techGeoRow.appendChild(osCard);
        
        // Top Locations
        const geoCard = document.createElement('div');
        geoCard.className = 'analytics-card col-span-4';
        geoCard.innerHTML = '<h3>🌍 Top Locations</h3><div id="analytics-geo-list"></div>';
        techGeoRow.appendChild(geoCard);
        
        content.appendChild(techGeoRow);
        
        renderOverallDeviceDonut(data, 'analytics-device-chart');
        renderOverallOSDonut(data, 'analytics-os-chart');
        renderOverallTopLocations(data, 'analytics-geo-list');
        
        // 4. Traffic Sources Row (2 Columns)
        const sourcesRow = document.createElement('div');
        sourcesRow.className = 'analytics-grid';
        
        const refCard = document.createElement('div');
        refCard.className = 'analytics-card col-span-6';
        refCard.innerHTML = '<h3>🔗 Top Referrers</h3><div id="analytics-ref-list"></div>';
        sourcesRow.appendChild(refCard);
        
        const utmCard = document.createElement('div');
        utmCard.className = 'analytics-card col-span-6';
        utmCard.innerHTML = '<h3>🎯 Top UTM Campaigns</h3><div id="analytics-utm-list"></div>';
        sourcesRow.appendChild(utmCard);
        
        content.appendChild(sourcesRow);
        
        renderOverallTopReferrers(data, 'analytics-ref-list');
        renderOverallTopUTM(data, 'analytics-utm-list');
        
        // Store data for export
        content.dataset.lastData = JSON.stringify(data);
        
        showToast('Analytics loaded successfully', 'success');
      } catch (error) {
        const content = document.getElementById('analytics-content');
        if (content) {
          content.innerHTML = '<p style="color: var(--error-color);">Failed to load analytics: ' + error.message + '</p>';
        }
        showToast('Failed to load analytics: ' + error.message, 'error');
      }
    }

    // Export overall analytics to CSV
    function exportOverallAnalytics() {
      const content = document.getElementById('analytics-content');
      if (!content || !content.dataset.lastData) {
        showToast('No data to export', 'warning');
        return;
      }
      
      try {
        const data = JSON.parse(content.dataset.lastData);
        const startDate = document.getElementById('analytics-start-date')?.value || 'all';
        const endDate = document.getElementById('analytics-end-date')?.value || 'all';
        
        // Create CSV content
        let csv = 'Overall Analytics Export\\n';
        csv += 'Date Range: ' + startDate + ' to ' + endDate + '\\n\\n';
        
        // Summary
        csv += 'Summary\\n';
        csv += 'Total Clicks,' + (data.summary?.total_clicks || 0) + '\\n';
        csv += 'Unique Visitors,' + (data.summary?.total_unique_visitors || 0) + '\\n';
        csv += 'Total Links,' + (data.summary?.total_links || 0) + '\\n\\n';
        
        // Time Series
        if (data.time_series && data.time_series.length > 0) {
          csv += 'Time Series\\n';
          csv += 'Date,Clicks,Unique Visitors\\n';
          data.time_series.forEach(row => {
            csv += row.date + ',' + row.clicks + ',' + row.unique_visitors + '\\n';
          });
          csv += '\\n';
        }
        
        // Geography
        if (data.geography && data.geography.length > 0) {
          csv += 'Geography\\n';
          csv += 'Country,City,Clicks,Unique Visitors\\n';
          data.geography.forEach(row => {
            csv += (row.country || 'Unknown') + ',' + (row.city || '') + ',' + row.clicks + ',' + row.unique_visitors + '\\n';
          });
          csv += '\\n';
        }
        
        // Referrers
        if (data.referrers && data.referrers.length > 0) {
          csv += 'Referrers\\n';
          csv += 'Referrer,Category,Clicks,Unique Visitors\\n';
          data.referrers.forEach(row => {
            csv += (row.referrer_domain || 'Direct') + ',' + (row.category || '') + ',' + row.clicks + ',' + row.unique_visitors + '\\n';
          });
          csv += '\\n';
        }
        
        // Devices
        if (data.devices && data.devices.length > 0) {
          csv += 'Devices\\n';
          csv += 'Device Type,Browser,OS,Clicks,Unique Visitors\\n';
          data.devices.forEach(row => {
            csv += (row.device_type || '') + ',' + (row.browser || '') + ',' + (row.os || '') + ',' + row.clicks + ',' + row.unique_visitors + '\\n';
          });
          csv += '\\n';
        }
        
        // UTM Campaigns
        if (data.utm_campaigns && data.utm_campaigns.length > 0) {
          csv += 'UTM Campaigns\\n';
          csv += 'Source,Medium,Campaign,Clicks,Unique Visitors\\n';
          data.utm_campaigns.forEach(row => {
            csv += (row.utm_source || '') + ',' + (row.utm_medium || '') + ',' + (row.utm_campaign || '') + ',' + row.clicks + ',' + row.unique_visitors + '\\n';
          });
          csv += '\\n';
        }
        
        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'overall-analytics-' + startDate + '-to-' + endDate + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast('Analytics exported successfully', 'success');
      } catch (error) {
        console.error('Export error:', error);
        showToast('Failed to export analytics', 'error');
      }
    }

    // Initialize analytics filter dropdowns
    async function initAnalyticsFilters() {
      // Load domains
      try {
        const domainsData = await apiRequest('/domains');
        const domains = domainsData.data || [];
        const domainDropdown = document.getElementById('analytics-domain-filter-dropdown');
        if (domainDropdown && domains.length > 0) {
          const domainItems = domains.map(d => {
            const domainName = d.domain_name || d.name || '';
            return '<div class="dropdown-item" data-value="' + domainName + '" style="padding: 0.5rem; cursor: pointer; border-bottom: 1px solid var(--border-color);">' + domainName + '</div>';
          }).join('');
          domainDropdown.innerHTML = '<div class="dropdown-item" data-value="" style="padding: 0.5rem; cursor: pointer; border-bottom: 1px solid var(--border-color);">All Domains</div>' + domainItems;
        } else if (domainDropdown) {
          domainDropdown.innerHTML = '<div class="dropdown-item" data-value="" style="padding: 0.5rem; cursor: pointer; border-bottom: 1px solid var(--border-color);">All Domains</div><div style="padding: 0.5rem; color: var(--secondary-color);">No domains available</div>';
        }
      } catch (error) {
        console.error('Failed to load domains for filter:', error);
        const domainDropdown = document.getElementById('analytics-domain-filter-dropdown');
        if (domainDropdown) {
          domainDropdown.innerHTML = '<div class="dropdown-item" data-value="" style="padding: 0.5rem; cursor: pointer; border-bottom: 1px solid var(--border-color);">All Domains</div><div style="padding: 0.5rem; color: var(--error-color);">Failed to load domains</div>';
        }
      }
      
      // Load tags
      try {
        const tagsData = await apiRequest('/tags');
        const tags = tagsData.data || [];
        const tagDropdown = document.getElementById('analytics-tag-filter-dropdown');
        if (tagDropdown && tags.length > 0) {
          const tagItems = tags.map(t => 
            '<div class="dropdown-item" data-value="' + t.id + '" style="padding: 0.5rem; cursor: pointer; border-bottom: 1px solid var(--border-color);">' + t.name + '</div>'
          ).join('');
          tagDropdown.innerHTML = '<div class="dropdown-item" data-value="" style="padding: 0.5rem; cursor: pointer; border-bottom: 1px solid var(--border-color);">All Tags</div>' + tagItems;
        }
      } catch (error) {
        console.error('Failed to load tags for filter:', error);
      }
      
      // Load categories
      try {
        const categoriesData = await apiRequest('/categories');
        const categories = categoriesData.data || [];
        const categoryDropdown = document.getElementById('analytics-category-filter-dropdown');
        if (categoryDropdown && categories.length > 0) {
          const categoryItems = categories.map(c => 
            '<div class="dropdown-item" data-value="' + c.id + '" style="padding: 0.5rem; cursor: pointer; border-bottom: 1px solid var(--border-color);">' + c.name + '</div>'
          ).join('');
          categoryDropdown.innerHTML = '<div class="dropdown-item" data-value="" style="padding: 0.5rem; cursor: pointer; border-bottom: 1px solid var(--border-color);">All Categories</div>' + categoryItems;
        }
      } catch (error) {
        console.error('Failed to load categories for filter:', error);
      }
      
      // Setup dropdown interactions
      setupFilterDropdown('analytics-domain-filter');
      setupFilterDropdown('analytics-tag-filter');
      setupFilterDropdown('analytics-category-filter');
    }
    
    function setupFilterDropdown(filterId) {
      const searchInput = document.getElementById(filterId + '-search');
      const dropdown = document.getElementById(filterId + '-dropdown');
      const hiddenInput = document.getElementById(filterId);
      
      if (!searchInput || !dropdown || !hiddenInput) return;
      
      // Check if already initialized to prevent duplicate event listeners
      if (searchInput.dataset.initialized === 'true') return;
      searchInput.dataset.initialized = 'true';
      
      // Show dropdown on focus
      searchInput.addEventListener('focus', () => {
        dropdown.style.display = 'block';
      });
      
      // Hide dropdown on blur (with delay for click)
      searchInput.addEventListener('blur', () => {
        setTimeout(() => {
          dropdown.style.display = 'none';
        }, 200);
      });
      
      // Filter dropdown items
      searchInput.addEventListener('input', () => {
        const filter = searchInput.value.toLowerCase();
        const items = dropdown.querySelectorAll('.dropdown-item');
        items.forEach(item => {
          const text = item.textContent.toLowerCase();
          item.style.display = text.includes(filter) ? 'block' : 'none';
        });
      });
      
      // Handle item selection
      dropdown.addEventListener('click', (e) => {
        if (e.target.classList.contains('dropdown-item')) {
          const value = e.target.dataset.value;
          const text = e.target.textContent;
          hiddenInput.value = value;
          searchInput.value = text;
          dropdown.style.display = 'none';
          // DEBUG: console.log('[FILTER] Selected:', filterId, 'value:', value, 'text:', text);
        }
      });
    }

    // aggregateTimeSeries is now defined in global scope for use by both overall and link analytics

    // Rendering functions for overall analytics (reuse link analytics patterns)
    function renderOverallAnalyticsChart(data, canvasId, breakdown = 'day') {
      const timeSeries = data?.time_series || [];
      // DEBUG: console.log('[RENDER CHART] Input data:', data);
      // DEBUG: console.log('[RENDER CHART] Time series:', timeSeries);
      // DEBUG: console.log('[RENDER CHART] Time series length:', timeSeries.length);
      
      const ctx = document.getElementById(canvasId);
      if (!ctx) {
        console.error('[RENDER CHART] Canvas element not found:', canvasId);
        return;
      }
      
      // Destroy existing chart if it exists
      if (ctx.chart) {
        ctx.chart.destroy();
      }
      
      // Aggregate data based on breakdown
      const aggregated = aggregateTimeSeries(timeSeries, breakdown);
      // DEBUG: console.log('[RENDER CHART] Aggregated data:', aggregated);
      // DEBUG: console.log('[RENDER CHART] Aggregated length:', aggregated.length);
      
      const labels = aggregated.map(d => d.label || d.date);
      const clicksData = aggregated.map(d => d.clicks || 0);
      const visitorsData = aggregated.map(d => d.unique_visitors || 0);
      
      // DEBUG: console.log('[RENDER CHART] Labels:', labels);
      // DEBUG: console.log('[RENDER CHART] Clicks data:', clicksData);
      // DEBUG: console.log('[RENDER CHART] Visitors data:', visitorsData);
      
      // Show canvas if it was hidden
      ctx.style.display = 'block';
      const noDataMsg = ctx.parentElement?.querySelector('.no-data-message');
      if (noDataMsg) {
        noDataMsg.remove();
      }
      
      // If no data, show empty chart with message
      if (aggregated.length === 0 || (clicksData.every(v => v === 0) && visitorsData.every(v => v === 0))) {
        // DEBUG: console.warn('[RENDER CHART] No data to display');
      }
      
      ctx.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Clicks',
              data: clicksData,
              borderColor: '#4f46e5',
              backgroundColor: 'rgba(79, 70, 229, 0.1)',
              tension: 0.4,
              fill: true
            },
            {
              label: 'Unique Visitors',
              data: visitorsData,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.4,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' }
          },
          scales: {
            y: { beginAtZero: true, ticks: { precision: 0 } }
          }
        }
      });
    }

    function renderOverallDeviceDonut(data, canvasId) {
      const devices = data?.devices || [];
      const ctx = document.getElementById(canvasId);
      if (!ctx) return;
      
      const deviceTypes = {};
      devices.forEach(d => {
        if (d.device_type) {
          deviceTypes[d.device_type] = (deviceTypes[d.device_type] || 0) + d.clicks;
        }
      });
      
      const labels = Object.keys(deviceTypes);
      const values = Object.values(deviceTypes);
      
      if (labels.length === 0) {
        ctx.parentElement.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--secondary-color);">No device data</p>';
        return;
      }
      
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }

    function renderOverallOSDonut(data, canvasId) {
      const devices = data?.devices || [];
      const ctx = document.getElementById(canvasId);
      if (!ctx) return;
      
      const osList = {};
      devices.forEach(d => {
        if (d.os) {
          osList[d.os] = (osList[d.os] || 0) + d.clicks;
        }
      });
      
      const labels = Object.keys(osList);
      const values = Object.values(osList);
      
      if (labels.length === 0) {
        ctx.parentElement.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--secondary-color);">No OS data</p>';
        return;
      }
      
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }

    function renderOverallTopLocations(data, containerId) {
      const geography = data?.geography || [];
      const container = document.getElementById(containerId);
      if (!container) return;
      
      if (geography.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--secondary-color);">No location data</p>';
        return;
      }
      
      const html = geography.slice(0, 10).map(g => 
        '<div style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid var(--border-color);">' +
          '<span>' + (g.country || 'Unknown') + (g.city ? ', ' + g.city : '') + '</span>' +
          '<span style="font-weight: 600;">' + (g.clicks || 0).toLocaleString() + '</span>' +
        '</div>'
      ).join('');
      
      container.innerHTML = html;
    }

    function renderOverallTopReferrers(data, containerId) {
      const referrers = data?.referrers || [];
      const container = document.getElementById(containerId);
      if (!container) return;
      
      if (referrers.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--secondary-color);">No referrer data</p>';
        return;
      }
      
      const html = referrers.slice(0, 10).map(r => 
        '<div style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid var(--border-color);">' +
          '<span>' + (r.referrer_domain || 'Direct') + '</span>' +
          '<span style="font-weight: 600;">' + (r.clicks || 0).toLocaleString() + '</span>' +
        '</div>'
      ).join('');
      
      container.innerHTML = html;
    }

    function renderOverallTopUTM(data, containerId) {
      const utmCampaigns = data?.utm_campaigns || [];
      const container = document.getElementById(containerId);
      if (!container) return;
      
      if (utmCampaigns.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--secondary-color);">No UTM data</p>';
        return;
      }
      
      const html = utmCampaigns.slice(0, 10).map(u => 
        '<div style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid var(--border-color);">' +
          '<span>' + 
            (u.utm_source || '') + 
            (u.utm_medium ? ' / ' + u.utm_medium : '') + 
            (u.utm_campaign ? ' / ' + u.utm_campaign : '') +
          '</span>' +
          '<span style="font-weight: 600;">' + (u.clicks || 0).toLocaleString() + '</span>' +
        '</div>'
      ).join('');
      
      container.innerHTML = html;
    }

    // Shared filter component for analytics breakdowns
    function createAnalyticsFilters(containerId, options = {}) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);
      const defaultEndDate = new Date();

      let groupByHtml = '';
      if (options.groupBy && options.groupByOptions) {
        const groupByOptions = options.groupByOptions.map(opt => 
          '<option value="' + escapeAttr(opt.value) + '">' + escapeHtml(opt.label) + '</option>'
        ).join('');
        groupByHtml = '<div class="filter-group"><label>Group By</label><select id="' + containerId + '-group-by" class="filter-select">' + groupByOptions + '</select></div>';
      }

      const filters = '<div class="filter-row">' +
        '<div class="filter-group"><label>Start Date</label><input type="date" id="' + containerId + '-start-date" class="date-input" value="' + defaultStartDate.toISOString().slice(0, 10) + '"></div>' +
        '<div class="filter-group"><label>End Date</label><input type="date" id="' + containerId + '-end-date" class="date-input" value="' + defaultEndDate.toISOString().slice(0, 10) + '"></div>' +
        '<div class="filter-group"><label>Domain</label><select id="' + containerId + '-domain" class="filter-select"><option value="">All Domains</option></select></div>' +
        '</div>' +
        '<div class="filter-row">' +
        '<div class="filter-group"><label>Tag</label><select id="' + containerId + '-tag-ids" class="filter-select"><option value="">All Tags</option></select></div>' +
        '<div class="filter-group"><label>Category</label><select id="' + containerId + '-category-ids" class="filter-select"><option value="">All Categories</option></select></div>' +
        groupByHtml +
        '<div class="filter-group"><label>Limit</label><input type="number" id="' + containerId + '-limit" value="100" min="1" max="1000" class="filter-input"></div>' +
        '</div>' +
        '<div class="filter-actions">' +
        '<button id="' + containerId + '-load-btn" class="btn btn-primary">Load Analytics</button>' +
        '<button id="' + containerId + '-reset-btn" class="btn btn-secondary">Reset Filters</button>' +
        '<button id="' + containerId + '-export-btn" class="btn btn-secondary">Export CSV</button>' +
        '</div>';

      container.innerHTML = filters;

      // Load domains for filter
      loadDomainsForFilter(containerId + '-domain');
      
      // Load tags and categories for filter
      loadTagsForFilter(containerId + '-tag-ids');
      loadCategoriesForFilter(containerId + '-category-ids');

      // Reset button
      const resetBtn = document.getElementById(containerId + '-reset-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          document.getElementById(containerId + '-start-date').value = defaultStartDate.toISOString().slice(0, 10);
          document.getElementById(containerId + '-end-date').value = defaultEndDate.toISOString().slice(0, 10);
          document.getElementById(containerId + '-domain').value = '';
          document.getElementById(containerId + '-tag-ids').value = '';
          document.getElementById(containerId + '-category-ids').value = '';
          if (options.groupBy) {
            document.getElementById(containerId + '-group-by').value = options.groupByOptions[0]?.value || '';
          }
          document.getElementById(containerId + '-limit').value = '100';
        });
      }
    }

    // Helper to get filter values
    function getFilterValues(containerId) {
      return {
        start_date: document.getElementById(containerId + '-start-date')?.value || '',
        end_date: document.getElementById(containerId + '-end-date')?.value || '',
        domain_id: document.getElementById(containerId + '-domain')?.value || '',
        tag_ids: document.getElementById(containerId + '-tag-ids')?.value || '',
        category_ids: document.getElementById(containerId + '-category-ids')?.value || '',
        group_by: document.getElementById(containerId + '-group-by')?.value || '',
        limit: document.getElementById(containerId + '-limit')?.value || '100',
      };
    }

    // Helper to build query params
    function buildQueryParams(filters) {
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.domain_id) params.append('domain_id', filters.domain_id);
      if (filters.tag_ids) params.append('tag_ids', filters.tag_ids);
      if (filters.category_ids) params.append('category_ids', filters.category_ids);
      if (filters.group_by) params.append('group_by', filters.group_by);
      if (filters.limit) params.append('limit', filters.limit);
      return params.toString();
    }

    // Helper to load domains for filter dropdown
    async function loadDomainsForFilter(selectId) {
      try {
        const domains = await apiRequest('/domains');
        const select = document.getElementById(selectId);
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = '<option value="">All Domains</option>';
        
        if (domains.data && Array.isArray(domains.data)) {
          domains.data.forEach(domain => {
            const option = document.createElement('option');
            option.value = domain.id;
            option.textContent = domain.domain_name;
            select.appendChild(option);
          });
        }

        if (currentValue) {
          select.value = currentValue;
        }
      } catch (error) {
        console.error('Failed to load domains for filter:', error);
      }
    }

    // Helper to load tags for filter dropdown
    async function loadTagsForFilter(selectId) {
      try {
        const tags = await apiRequest('/tags');
        const select = document.getElementById(selectId);
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = '<option value="">All Tags</option>';
        
        if (tags.data && Array.isArray(tags.data)) {
          tags.data.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.id;
            option.textContent = tag.name;
            select.appendChild(option);
          });
        }

        if (currentValue) {
          select.value = currentValue;
        }
      } catch (error) {
        console.error('Failed to load tags for filter:', error);
      }
    }

    // Helper to load categories for filter dropdown
    async function loadCategoriesForFilter(selectId) {
      try {
        const categories = await apiRequest('/categories');
        const select = document.getElementById(selectId);
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = '<option value="">All Categories</option>';
        
        if (categories.data && Array.isArray(categories.data)) {
          categories.data.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
          });
        }

        if (currentValue) {
          select.value = currentValue;
        }
      } catch (error) {
        console.error('Failed to load categories for filter:', error);
      }
    }

    // Geography breakdown
    async function loadAnalyticsGeography() {
      const containerId = 'analytics-geography-filters';
      const contentId = 'analytics-geography-content';
      
      // Initialize filters on first load
      const filtersContainer = document.getElementById(containerId);
      if (filtersContainer && !filtersContainer.dataset.initialized) {
        createAnalyticsFilters(containerId, {
          groupBy: true,
          groupByOptions: [
            { value: '', label: 'By Country' },
            { value: 'city', label: 'By City' },
          ],
        });
        filtersContainer.dataset.initialized = 'true';

        // Load button handler
        document.getElementById(containerId + '-load-btn').addEventListener('click', loadAnalyticsGeography);
        
        // Export button handler
        const exportBtn = document.getElementById(containerId + '-export-btn');
        if (exportBtn) {
          // Remove existing listeners by cloning
          const newExportBtn = exportBtn.cloneNode(true);
          exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
          
          newExportBtn.addEventListener('click', () => {
            const content = document.getElementById(contentId);
            if (!content || !content.dataset.lastData) {
              showToast('No data to export', 'warning');
              return;
            }
            
            try {
              const data = JSON.parse(content.dataset.lastData);
              if (!data || !data.geography || data.geography.length === 0) {
                showToast('No data to export', 'warning');
                return;
              }
              
              const headers = ['Country', 'City', 'Clicks', 'Unique Visitors'];
              const rows = data.geography.map(item => [
                item.country || 'Unknown',
                item.city || '-',
                item.clicks,
                item.unique_visitors
              ]);
              
              downloadCsv('analytics_geography.csv', headers, rows);
            } catch (e) {
              console.error('Export error:', e);
              showToast('Failed to export data', 'error');
            }
          });
        }
      }

      const content = document.getElementById(contentId);
      if (!content) return;

      content.innerHTML = '<div class="loading-spinner"></div> Loading geography analytics...';

      try {
        const filters = getFilterValues(containerId);
        const params = buildQueryParams(filters);
        const data = await apiRequest('/analytics/breakdown/geography?' + params);

        if (!data.success || !data.data) {
          throw new Error(data.message || 'Failed to load geography analytics');
        }

        // Store data for export
        content.dataset.lastData = JSON.stringify(data.data);

        const geography = data.data.geography || [];
        const totalClicks = data.data.total_clicks || 0;

        // Summary cards
        let html = '<div class="summary-cards">' +
          '<div class="summary-card">' +
          '<h3>Total Clicks</h3>' +
          '<div class="value">' + totalClicks.toLocaleString() + '</div>' +
          '</div>' +
          '<div class="summary-card">' +
          '<h3>Countries/Cities</h3>' +
          '<div class="value">' + geography.length + '</div>' +
          '</div>' +
          '</div>';

        if (geography.length > 0) {
          // Chart
          html += '<div class="chart-container">' +
            '<h3>Top ' + Math.min(10, geography.length) + ' by Clicks</h3>' +
            '<div class="chart-wrapper">' +
            '<canvas id="geography-chart"></canvas>' +
            '</div>' +
            '</div>';

          // Table
          const tableRows = geography.map(item => {
            const country = escapeHtml(item.country || 'Unknown');
            const city = escapeHtml(item.city || '-');
            const clicks = item.clicks.toLocaleString();
            const percent = totalClicks > 0 ? ((item.clicks / totalClicks) * 100).toFixed(2) : 0;
            return '<tr><td>' + country + '</td><td>' + city + '</td><td>' + clicks + '</td><td>' + percent + '%</td></tr>';
          }).join('');

          html += '<div class="data-table-container">' +
            '<h3>Geography Breakdown</h3>' +
            '<table class="data-table">' +
            '<thead><tr><th>Country</th><th>City</th><th>Clicks</th><th>% of Total</th></tr></thead>' +
            '<tbody>' + tableRows + '</tbody>' +
            '</table>' +
            '</div>';

          content.innerHTML = html;

          // Render chart
          const ctx = document.getElementById('geography-chart');
          if (ctx && typeof Chart !== 'undefined') {
            const top10 = geography.slice(0, 10);
            new Chart(ctx, {
              type: 'bar',
              data: {
                labels: top10.map(item => (item.country || 'Unknown') + (item.city ? ' - ' + item.city : '')),
                datasets: [{
                  label: 'Clicks',
                  data: top10.map(item => item.clicks),
                  backgroundColor: 'rgba(0, 123, 255, 0.8)',
                }],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: { beginAtZero: true },
                },
              },
            });
          }
        } else {
          content.innerHTML = html + '<p style="text-align: center; color: #666; padding: 2rem;">No geography data available for the selected filters.</p>';
        }
      } catch (error) {
        content.innerHTML = '<p style="color: #dc3545;">Error loading geography analytics: ' + escapeHtml(error.message) + '</p>';
        console.error('Geography analytics error:', error);
      }
    }

    // Devices breakdown
    async function loadAnalyticsDevices() {
      const containerId = 'analytics-devices-filters';
      const contentId = 'analytics-devices-content';
      
      const filtersContainer = document.getElementById(containerId);
      if (filtersContainer && !filtersContainer.dataset.initialized) {
        createAnalyticsFilters(containerId, {
          groupBy: true,
          groupByOptions: [
            { value: '', label: 'All Devices' },
            { value: 'device_type', label: 'By Device Type' },
            { value: 'browser', label: 'By Browser' },
            { value: 'os', label: 'By OS' },
            { value: 'date', label: 'By Date' },
          ],
        });
        filtersContainer.dataset.initialized = 'true';
        document.getElementById(containerId + '-load-btn').addEventListener('click', loadAnalyticsDevices);
        
        // Export button handler
        const exportBtn = document.getElementById(containerId + '-export-btn');
        if (exportBtn) {
          const newExportBtn = exportBtn.cloneNode(true);
          exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
          
          newExportBtn.addEventListener('click', () => {
            const content = document.getElementById(contentId);
            if (!content || !content.dataset.lastData) {
              showToast('No data to export', 'warning');
              return;
            }
            
            try {
              const data = JSON.parse(content.dataset.lastData);
              if (!data || !data.devices || data.devices.length === 0) {
                showToast('No data to export', 'warning');
                return;
              }
              
              const headers = ['Device Type', 'Browser', 'OS', 'Clicks', 'Unique Visitors'];
              const rows = data.devices.map(item => [
                item.device_type || 'Unknown',
                item.browser || 'Unknown',
                item.os || 'Unknown',
                item.clicks,
                item.unique_visitors || 0
              ]);
              
              downloadCsv('analytics_devices.csv', headers, rows);
            } catch (e) {
              console.error('Export error:', e);
              showToast('Failed to export data', 'error');
            }
          });
        }
      }

      const content = document.getElementById(contentId);
      if (!content) return;

      content.innerHTML = '<div class="loading-spinner"></div> Loading devices analytics...';

      try {
        const filters = getFilterValues(containerId);
        const params = buildQueryParams(filters);
        const data = await apiRequest('/analytics/breakdown/devices?' + params);

        if (!data.success || !data.data) {
          throw new Error(data.message || 'Failed to load devices analytics');
        }

        // Store data for export
        content.dataset.lastData = JSON.stringify(data.data);

        const devices = data.data.devices || [];
        const totalClicks = data.data.total_clicks || 0;

        let html = '<div class="summary-cards">' +
          '<div class="summary-card">' +
          '<h3>Total Clicks</h3>' +
          '<div class="value">' + totalClicks.toLocaleString() + '</div>' +
          '</div>' +
          '<div class="summary-card">' +
          '<h3>Device Types</h3>' +
          '<div class="value">' + new Set(devices.map(d => d.device_type).filter(Boolean)).size + '</div>' +
          '</div>' +
          '</div>';

        if (devices.length > 0) {
          // Aggregate by device type for pie chart
          const deviceTypeMap = new Map();
          devices.forEach(d => {
            const type = d.device_type || 'unknown';
            deviceTypeMap.set(type, (deviceTypeMap.get(type) || 0) + d.clicks);
          });

          const deviceRows = devices.slice(0, 50).map(item => {
            const deviceType = escapeHtml(item.device_type || 'Unknown');
            const browser = escapeHtml(item.browser || 'Unknown');
            const os = escapeHtml(item.os || 'Unknown');
            const clicks = item.clicks.toLocaleString();
            const uniqueVisitors = (item.unique_visitors || 0).toLocaleString();
            const percent = totalClicks > 0 ? ((item.clicks / totalClicks) * 100).toFixed(2) : 0;
            return '<tr><td>' + deviceType + '</td><td>' + browser + '</td><td>' + os + '</td><td>' + clicks + '</td><td>' + uniqueVisitors + '</td><td>' + percent + '%</td></tr>';
          }).join('');

          html += '<div class="chart-container">' +
            '<h3>Device Type Distribution</h3>' +
            '<div class="chart-wrapper">' +
            '<canvas id="devices-pie-chart"></canvas>' +
            '</div>' +
            '</div>' +
            '<div class="data-table-container">' +
            '<h3>Devices Breakdown</h3>' +
            '<table class="data-table">' +
            '<thead><tr><th>Device Type</th><th>Browser</th><th>OS</th><th>Clicks</th><th>Unique Visitors</th><th>% of Total</th></tr></thead>' +
            '<tbody>' + deviceRows + '</tbody>' +
            '</table>' +
            '</div>';

          content.innerHTML = html;

          // Render pie chart
          const ctx = document.getElementById('devices-pie-chart');
          if (ctx && typeof Chart !== 'undefined') {
            const deviceTypes = Array.from(deviceTypeMap.entries()).sort((a, b) => b[1] - a[1]);
            new Chart(ctx, {
              type: 'pie',
              data: {
                labels: deviceTypes.map(([type]) => type),
                datasets: [{
                  data: deviceTypes.map(([, clicks]) => clicks),
                  backgroundColor: [
                    'rgba(0, 123, 255, 0.8)',
                    'rgba(40, 167, 69, 0.8)',
                    'rgba(255, 193, 7, 0.8)',
                    'rgba(220, 53, 69, 0.8)',
                    'rgba(108, 117, 125, 0.8)',
                  ],
                }],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'right' },
                },
              },
            });
          }
        } else {
          content.innerHTML = html + '<p style="text-align: center; color: #666; padding: 2rem;">No devices data available for the selected filters.</p>';
        }
      } catch (error) {
        content.innerHTML = '<p style="color: #dc3545;">Error loading devices analytics: ' + escapeHtml(error.message) + '</p>';
        console.error('Devices analytics error:', error);
      }
    }

    // Referrers breakdown
    async function loadAnalyticsReferrers() {
      const containerId = 'analytics-referrers-filters';
      const contentId = 'analytics-referrers-content';
      
      const filtersContainer = document.getElementById(containerId);
      if (filtersContainer && !filtersContainer.dataset.initialized) {
        createAnalyticsFilters(containerId);
        filtersContainer.dataset.initialized = 'true';
        // Load button handler
        document.getElementById(containerId + '-load-btn').addEventListener('click', loadAnalyticsReferrers);
        
        // Export button handler
        const exportBtn = document.getElementById(containerId + '-export-btn');
        if (exportBtn) {
          const newExportBtn = exportBtn.cloneNode(true);
          exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
          
          newExportBtn.addEventListener('click', () => {
            const content = document.getElementById(contentId);
            if (!content || !content.dataset.lastData) {
              showToast('No data to export', 'warning');
              return;
            }
            
            try {
              const data = JSON.parse(content.dataset.lastData);
              if (!data || !data.referrers || data.referrers.length === 0) {
                showToast('No data to export', 'warning');
                return;
              }
              
              const headers = ['Referrer Domain', 'Category', 'Clicks', 'Unique Visitors'];
              const rows = data.referrers.map(item => [
                item.referrer_domain || 'direct',
                item.category || 'other',
                item.clicks,
                item.unique_visitors
              ]);
              
              downloadCsv('analytics_referrers.csv', headers, rows);
            } catch (e) {
              console.error('Export error:', e);
              showToast('Failed to export data', 'error');
            }
          });
        }
      }

      const content = document.getElementById(contentId);
      if (!content) return;

      content.innerHTML = '<div class="loading-spinner"></div> Loading referrers analytics...';

      try {
        const filters = getFilterValues(containerId);
        const params = buildQueryParams(filters);
        const data = await apiRequest('/analytics/breakdown/referrers?' + params);

        if (!data.success || !data.data) {
          throw new Error(data.message || 'Failed to load referrers analytics');
        }

        // Store data for export
        content.dataset.lastData = JSON.stringify(data.data);

        const referrers = data.data.referrers || [];
        const totalClicks = data.data.total_clicks || 0;

        let html = '<div class="summary-cards">' +
          '<div class="summary-card">' +
          '<h3>Total Clicks</h3>' +
          '<div class="value">' + totalClicks.toLocaleString() + '</div>' +
          '</div>' +
          '<div class="summary-card">' +
          '<h3>Referrer Sources</h3>' +
          '<div class="value">' + referrers.length + '</div>' +
          '</div>' +
          '</div>';

        if (referrers.length > 0) {
          const referrerRows = referrers.map(item => {
            const domain = escapeHtml(item.referrer_domain || 'direct');
            const category = escapeHtml(item.category || 'other');
            const clicks = item.clicks.toLocaleString();
            const percent = totalClicks > 0 ? ((item.clicks / totalClicks) * 100).toFixed(2) : 0;
            return '<tr><td>' + domain + '</td><td><span class="badge badge-secondary">' + category + '</span></td><td>' + clicks + '</td><td>' + percent + '%</td></tr>';
          }).join('');

          html += '<div class="chart-container">' +
            '<h3>Top Referrers</h3>' +
            '<div class="chart-wrapper">' +
            '<canvas id="referrers-chart"></canvas>' +
            '</div>' +
            '</div>' +
            '<div class="data-table-container">' +
            '<h3>Referrers Breakdown</h3>' +
            '<table class="data-table">' +
            '<thead><tr><th>Referrer Domain</th><th>Category</th><th>Clicks</th><th>% of Total</th></tr></thead>' +
            '<tbody>' + referrerRows + '</tbody>' +
            '</table>' +
            '</div>';

          content.innerHTML = html;

          const ctx = document.getElementById('referrers-chart');
          if (ctx && typeof Chart !== 'undefined') {
            const top10 = referrers.slice(0, 10);
            new Chart(ctx, {
              type: 'bar',
              data: {
                labels: top10.map(item => item.referrer_domain || 'direct'),
                datasets: [{
                  label: 'Clicks',
                  data: top10.map(item => item.clicks),
                  backgroundColor: 'rgba(0, 123, 255, 0.8)',
                }],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  x: { beginAtZero: true },
                },
              },
            });
          }
        } else {
          content.innerHTML = html + '<p style="text-align: center; color: #666; padding: 2rem;">No referrers data available for the selected filters.</p>';
        }
      } catch (error) {
        content.innerHTML = '<p style="color: #dc3545;">Error loading referrers analytics: ' + escapeHtml(error.message) + '</p>';
        console.error('Referrers analytics error:', error);
      }
    }

    // UTM Campaigns breakdown
    async function loadAnalyticsUtm() {
      const containerId = 'analytics-utm-filters';
      const contentId = 'analytics-utm-content';
      
      const filtersContainer = document.getElementById(containerId);
      if (filtersContainer && !filtersContainer.dataset.initialized) {
        createAnalyticsFilters(containerId, {
          groupBy: true,
          groupByOptions: [
            { value: '', label: 'All UTM' },
            { value: 'source', label: 'By Source' },
            { value: 'medium', label: 'By Medium' },
            { value: 'campaign', label: 'By Campaign' },
            { value: 'date', label: 'By Date' },
          ],
        });
        filtersContainer.dataset.initialized = 'true';
        // Load button handler
        document.getElementById(containerId + '-load-btn').addEventListener('click', loadAnalyticsUtm);
        
        // Export button handler
        const exportBtn = document.getElementById(containerId + '-export-btn');
        if (exportBtn) {
          const newExportBtn = exportBtn.cloneNode(true);
          exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
          
          newExportBtn.addEventListener('click', () => {
            const content = document.getElementById(contentId);
            if (!content || !content.dataset.lastData) {
              showToast('No data to export', 'warning');
              return;
            }
            
            try {
              const data = JSON.parse(content.dataset.lastData);
              if (!data || !data.utm || data.utm.length === 0) {
                showToast('No data to export', 'warning');
                return;
              }
              
              const headers = ['Campaign', 'Source', 'Medium', 'Clicks', 'Unique Visitors'];
              const rows = data.utm.map(item => [
                item.utm_campaign || '(not set)',
                item.utm_source || '-',
                item.utm_medium || '-',
                item.clicks,
                item.unique_visitors
              ]);
              
              downloadCsv('analytics_utm.csv', headers, rows);
            } catch (e) {
              console.error('Export error:', e);
              showToast('Failed to export data', 'error');
            }
          });
        }
      }

      const content = document.getElementById(contentId);
      if (!content) return;

      content.innerHTML = '<div class="loading-spinner"></div> Loading UTM analytics...';

      try {
        const filters = getFilterValues(containerId);
        const params = buildQueryParams(filters);
        const data = await apiRequest('/analytics/breakdown/utm?' + params);

        if (!data.success || !data.data) {
          throw new Error(data.message || 'Failed to load UTM analytics');
        }

        // Store data for export
        content.dataset.lastData = JSON.stringify(data.data);

        const utm = data.data.utm || [];
        const totalClicks = data.data.total_clicks || 0;

        let html = '<div class="summary-cards">' +
          '<div class="summary-card">' +
          '<h3>Total Clicks</h3>' +
          '<div class="value">' + totalClicks.toLocaleString() + '</div>' +
          '</div>' +
          '<div class="summary-card">' +
          '<h3>UTM Campaigns</h3>' +
          '<div class="value">' + utm.length + '</div>' +
          '</div>' +
          '</div>';

        if (utm.length > 0) {
          const utmRows = utm.map(item => {
            const source = escapeHtml(item.utm_source || '-');
            const medium = escapeHtml(item.utm_medium || '-');
            const campaign = escapeHtml(item.utm_campaign || '-');
            const clicks = item.clicks.toLocaleString();
            const uniqueVisitors = (item.unique_visitors || 0).toLocaleString();
            const percent = totalClicks > 0 ? ((item.clicks / totalClicks) * 100).toFixed(2) : 0;
            return '<tr><td>' + source + '</td><td>' + medium + '</td><td>' + campaign + '</td><td>' + clicks + '</td><td>' + uniqueVisitors + '</td><td>' + percent + '%</td></tr>';
          }).join('');

          html += '<div class="data-table-container">' +
            '<h3>UTM Campaigns Breakdown</h3>' +
            '<table class="data-table">' +
            '<thead><tr><th>Source</th><th>Medium</th><th>Campaign</th><th>Clicks</th><th>Unique Visitors</th><th>% of Total</th></tr></thead>' +
            '<tbody>' + utmRows + '</tbody>' +
            '</table>' +
            '</div>';

          content.innerHTML = html;
        } else {
          content.innerHTML = html + '<p style="text-align: center; color: #666; padding: 2rem;">No UTM data available for the selected filters.</p>';
        }
      } catch (error) {
        content.innerHTML = '<p style="color: #dc3545;">Error loading UTM analytics: ' + escapeHtml(error.message) + '</p>';
        console.error('UTM analytics error:', error);
      }
    }

    // Custom Parameters breakdown
    async function loadAnalyticsCustomParams() {
      const containerId = 'analytics-custom-params-filters';
      const contentId = 'analytics-custom-params-content';
      
      const filtersContainer = document.getElementById(containerId);
      if (filtersContainer && !filtersContainer.dataset.initialized) {
        createAnalyticsFilters(containerId);
        filtersContainer.dataset.initialized = 'true';
        // Load button handler
        document.getElementById(containerId + '-load-btn').addEventListener('click', loadAnalyticsCustomParams);
        
        // Export button handler
        const exportBtn = document.getElementById(containerId + '-export-btn');
        if (exportBtn) {
          const newExportBtn = exportBtn.cloneNode(true);
          exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
          
          newExportBtn.addEventListener('click', () => {
            const content = document.getElementById(contentId);
            if (!content || !content.dataset.lastData) {
              showToast('No data to export', 'warning');
              return;
            }
            
            try {
              const data = JSON.parse(content.dataset.lastData);
              if (!data || !data.custom_params) {
                showToast('No data to export', 'warning');
                return;
              }
              
              const headers = ['Parameter', 'Value', 'Clicks', 'Unique Visitors'];
              const rows = [];
              
              Object.entries(data.custom_params).forEach(([paramName, paramData]) => {
                if (Array.isArray(paramData)) {
                  paramData.forEach(item => {
                    rows.push([
                      paramName,
                      item.param_value || '-',
                      item.clicks,
                      item.unique_visitors
                    ]);
                  });
                }
              });
              
              if (rows.length === 0) {
                showToast('No data to export', 'warning');
                return;
              }
              
              downloadCsv('analytics_custom_params.csv', headers, rows);
            } catch (e) {
              console.error('Export error:', e);
              showToast('Failed to export data', 'error');
            }
          });
        }
      }

      const content = document.getElementById(contentId);
      if (!content) return;

      content.innerHTML = '<div class="loading-spinner"></div> Loading custom parameters analytics...';

      try {
        const filters = getFilterValues(containerId);
        const params = buildQueryParams(filters);
        const data = await apiRequest('/analytics/breakdown/custom-params?' + params);

        if (!data.success || !data.data) {
          throw new Error(data.message || 'Failed to load custom parameters analytics');
        }

        // Store data for export
        content.dataset.lastData = JSON.stringify(data.data);

        const customParams = data.data.custom_params || {};
        const totalClicks = data.data.total_clicks || 0;

        let html = '<div class="summary-cards">' +
          '<div class="summary-card">' +
          '<h3>Total Clicks</h3>' +
          '<div class="value">' + totalClicks.toLocaleString() + '</div>' +
          '</div>' +
          '</div>' +
          '<div class="breakdown-tabs" id="custom-params-tabs">' +
          '<button class="breakdown-tab active" data-param="custom_param1">Custom Param 1</button>' +
          '<button class="breakdown-tab" data-param="custom_param2">Custom Param 2</button>' +
          '<button class="breakdown-tab" data-param="custom_param3">Custom Param 3</button>' +
          '</div>';

        ['custom_param1', 'custom_param2', 'custom_param3'].forEach((paramName, index) => {
          const paramData = customParams[paramName] || [];
          const isActive = index === 0;
          const displayStyle = isActive ? 'block' : 'none';
          const paramLabel = paramName.replace('custom_param', 'Custom Parameter ');

          let paramContent = '<div id="custom-params-' + paramName + '-content" class="custom-param-content" style="display: ' + displayStyle + ';">' +
            '<div class="data-table-container">' +
            '<h3>' + paramLabel + '</h3>';

          if (paramData.length > 0) {
            const paramRows = paramData.map(item => {
              const value = escapeHtml(item.param_value || '-');
              const clicks = item.clicks.toLocaleString();
              const uniqueVisitors = (item.unique_visitors || 0).toLocaleString();
              const percent = totalClicks > 0 ? ((item.clicks / totalClicks) * 100).toFixed(2) : 0;
              return '<tr><td>' + value + '</td><td>' + clicks + '</td><td>' + uniqueVisitors + '</td><td>' + percent + '%</td></tr>';
            }).join('');

            paramContent += '<table class="data-table">' +
              '<thead><tr><th>Value</th><th>Clicks</th><th>Unique Visitors</th><th>% of Total</th></tr></thead>' +
              '<tbody>' + paramRows + '</tbody>' +
              '</table>';
          } else {
            paramContent += '<p style="text-align: center; color: #666; padding: 2rem;">No data available for this parameter.</p>';
          }

          paramContent += '</div></div>';
          html += paramContent;
        });

        content.innerHTML = html;

        // Tab switching
        document.querySelectorAll('#custom-params-tabs .breakdown-tab').forEach(tab => {
          tab.addEventListener('click', () => {
            document.querySelectorAll('#custom-params-tabs .breakdown-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.custom-param-content').forEach(c => c.style.display = 'none');
            tab.classList.add('active');
            const param = tab.dataset.param;
            const contentDiv = document.getElementById('custom-params-' + param + '-content');
            if (contentDiv) contentDiv.style.display = 'block';
          });
        });
      } catch (error) {
        content.innerHTML = '<p style="color: #dc3545;">Error loading custom parameters analytics: ' + escapeHtml(error.message) + '</p>';
        console.error('Custom params analytics error:', error);
      }
    }

    // Operating Systems breakdown
    async function loadAnalyticsOS() {
      const containerId = 'analytics-os-filters';
      const contentId = 'analytics-os-content';
      
      const filtersContainer = document.getElementById(containerId);
      if (filtersContainer && !filtersContainer.dataset.initialized) {
        createAnalyticsFilters(containerId);
        filtersContainer.dataset.initialized = 'true';
        // Load button handler
        document.getElementById(containerId + '-load-btn').addEventListener('click', loadAnalyticsOS);
        
        // Export button handler
        const exportBtn = document.getElementById(containerId + '-export-btn');
        if (exportBtn) {
          const newExportBtn = exportBtn.cloneNode(true);
          exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
          
          newExportBtn.addEventListener('click', () => {
            const content = document.getElementById(contentId);
            if (!content || !content.dataset.lastData) {
              showToast('No data to export', 'warning');
              return;
            }
            
            try {
              const data = JSON.parse(content.dataset.lastData);
              if (!data || !data.os || data.os.length === 0) {
                showToast('No data to export', 'warning');
                return;
              }
              
              const headers = ['OS', 'Clicks', 'Unique Visitors'];
              const rows = data.os.map(item => [
                item.os || 'Unknown',
                item.clicks,
                item.unique_visitors
              ]);
              
              downloadCsv('analytics_os.csv', headers, rows);
            } catch (e) {
              console.error('Export error:', e);
              showToast('Failed to export data', 'error');
            }
          });
        }
      }

      const content = document.getElementById(contentId);
      if (!content) return;

      content.innerHTML = '<div class="loading-spinner"></div> Loading OS analytics...';

      try {
        const filters = getFilterValues(containerId);
        const params = buildQueryParams(filters);
        const data = await apiRequest('/analytics/breakdown/os?' + params);

        if (!data.success || !data.data) {
          throw new Error(data.message || 'Failed to load OS analytics');
        }

        // Store data for export
        content.dataset.lastData = JSON.stringify(data.data);

        const os = data.data.os || [];
        const totalClicks = data.data.total_clicks || 0;

        let html = '<div class="summary-cards">' +
          '<div class="summary-card">' +
          '<h3>Total Clicks</h3>' +
          '<div class="value">' + totalClicks.toLocaleString() + '</div>' +
          '</div>' +
          '<div class="summary-card">' +
          '<h3>Operating Systems</h3>' +
          '<div class="value">' + os.length + '</div>' +
          '</div>' +
          '</div>';

        if (os.length > 0) {
          const osRows = os.map(item => {
            const osName = escapeHtml(item.os || 'Unknown');
            const clicks = item.clicks.toLocaleString();
            const uniqueVisitors = (item.unique_visitors || 0).toLocaleString();
            const percent = totalClicks > 0 ? ((item.clicks / totalClicks) * 100).toFixed(2) : 0;
            return '<tr><td>' + osName + '</td><td>' + clicks + '</td><td>' + uniqueVisitors + '</td><td>' + percent + '%</td></tr>';
          }).join('');

          html += '<div class="chart-container">' +
            '<h3>OS Distribution</h3>' +
            '<div class="chart-wrapper">' +
            '<canvas id="os-chart"></canvas>' +
            '</div>' +
            '</div>' +
            '<div class="data-table-container">' +
            '<h3>Operating Systems Breakdown</h3>' +
            '<table class="data-table">' +
            '<thead><tr><th>Operating System</th><th>Clicks</th><th>Unique Visitors</th><th>% of Total</th></tr></thead>' +
            '<tbody>' + osRows + '</tbody>' +
            '</table>' +
            '</div>';

          content.innerHTML = html;

          const ctx = document.getElementById('os-chart');
          if (ctx && typeof Chart !== 'undefined') {
            new Chart(ctx, {
              type: 'pie',
              data: {
                labels: os.map(item => item.os || 'Unknown'),
                datasets: [{
                  data: os.map(item => item.clicks),
                  backgroundColor: [
                    'rgba(0, 123, 255, 0.8)',
                    'rgba(40, 167, 69, 0.8)',
                    'rgba(255, 193, 7, 0.8)',
                    'rgba(220, 53, 69, 0.8)',
                    'rgba(108, 117, 125, 0.8)',
                    'rgba(23, 162, 184, 0.8)',
                  ],
                }],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'right' },
                },
              },
            });
          }
        } else {
          content.innerHTML = html + '<p style="text-align: center; color: #666; padding: 2rem;">No OS data available for the selected filters.</p>';
        }
      } catch (error) {
        content.innerHTML = '<p style="color: #dc3545;">Error loading OS analytics: ' + escapeHtml(error.message) + '</p>';
        console.error('OS analytics error:', error);
      }
    }

    // Browsers breakdown
    async function loadAnalyticsBrowsers() {
      const containerId = 'analytics-browsers-filters';
      const contentId = 'analytics-browsers-content';
      
      const filtersContainer = document.getElementById(containerId);
      if (filtersContainer && !filtersContainer.dataset.initialized) {
        createAnalyticsFilters(containerId);
        filtersContainer.dataset.initialized = 'true';
        // Load button handler
        document.getElementById(containerId + '-load-btn').addEventListener('click', loadAnalyticsBrowsers);
        
        // Export button handler
        const exportBtn = document.getElementById(containerId + '-export-btn');
        if (exportBtn) {
          const newExportBtn = exportBtn.cloneNode(true);
          exportBtn.parentNode.replaceChild(newExportBtn, exportBtn);
          
          newExportBtn.addEventListener('click', () => {
            const content = document.getElementById(contentId);
            if (!content || !content.dataset.lastData) {
              showToast('No data to export', 'warning');
              return;
            }
            
            try {
              const data = JSON.parse(content.dataset.lastData);
              if (!data || !data.browsers || data.browsers.length === 0) {
                showToast('No data to export', 'warning');
                return;
              }
              
              const headers = ['Browser', 'Clicks', 'Unique Visitors'];
              const rows = data.browsers.map(item => [
                item.browser || 'Unknown',
                item.clicks,
                item.unique_visitors
              ]);
              
              downloadCsv('analytics_browsers.csv', headers, rows);
            } catch (e) {
              console.error('Export error:', e);
              showToast('Failed to export data', 'error');
            }
          });
        }
      }

      const content = document.getElementById(contentId);
      if (!content) return;

      content.innerHTML = '<div class="loading-spinner"></div> Loading browsers analytics...';

      try {
        const filters = getFilterValues(containerId);
        const params = buildQueryParams(filters);
        const data = await apiRequest('/analytics/breakdown/browsers?' + params);

        if (!data.success || !data.data) {
          throw new Error(data.message || 'Failed to load browsers analytics');
        }

        // Store data for export
        content.dataset.lastData = JSON.stringify(data.data);

        const browsers = data.data.browsers || [];
        const totalClicks = data.data.total_clicks || 0;

        let html = '<div class="summary-cards">' +
          '<div class="summary-card">' +
          '<h3>Total Clicks</h3>' +
          '<div class="value">' + totalClicks.toLocaleString() + '</div>' +
          '</div>' +
          '<div class="summary-card">' +
          '<h3>Browsers</h3>' +
          '<div class="value">' + browsers.length + '</div>' +
          '</div>' +
          '</div>';

        if (browsers.length > 0) {
          const browserRows = browsers.map(item => {
            const browserName = escapeHtml(item.browser || 'Unknown');
            const clicks = item.clicks.toLocaleString();
            const uniqueVisitors = (item.unique_visitors || 0).toLocaleString();
            const percent = totalClicks > 0 ? ((item.clicks / totalClicks) * 100).toFixed(2) : 0;
            return '<tr><td>' + browserName + '</td><td>' + clicks + '</td><td>' + uniqueVisitors + '</td><td>' + percent + '%</td></tr>';
          }).join('');

          html += '<div class="chart-container">' +
            '<h3>Browser Distribution</h3>' +
            '<div class="chart-wrapper">' +
            '<canvas id="browsers-chart"></canvas>' +
            '</div>' +
            '</div>' +
            '<div class="data-table-container">' +
            '<h3>Browsers Breakdown</h3>' +
            '<table class="data-table">' +
            '<thead><tr><th>Browser</th><th>Clicks</th><th>Unique Visitors</th><th>% of Total</th></tr></thead>' +
            '<tbody>' + browserRows + '</tbody>' +
            '</table>' +
            '</div>';

          content.innerHTML = html;

          const ctx = document.getElementById('browsers-chart');
          if (ctx && typeof Chart !== 'undefined') {
            new Chart(ctx, {
              type: 'doughnut',
              data: {
                labels: browsers.map(item => item.browser || 'Unknown'),
                datasets: [{
                  data: browsers.map(item => item.clicks),
                  backgroundColor: [
                    'rgba(0, 123, 255, 0.8)',
                    'rgba(40, 167, 69, 0.8)',
                    'rgba(255, 193, 7, 0.8)',
                    'rgba(220, 53, 69, 0.8)',
                    'rgba(108, 117, 125, 0.8)',
                    'rgba(23, 162, 184, 0.8)',
                    'rgba(255, 87, 34, 0.8)',
                  ],
                }],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'right' },
                },
              },
            });
          }
        } else {
          content.innerHTML = html + '<p style="text-align: center; color: #666; padding: 2rem;">No browsers data available for the selected filters.</p>';
        }
      } catch (error) {
        content.innerHTML = '<p style="color: #dc3545;">Error loading browsers analytics: ' + escapeHtml(error.message) + '</p>';
        console.error('Browsers analytics error:', error);
      }
    }
    
    // Settings page loaders - each page loads independently
    async function loadAccountInfoPage() {
      try {
        const user = await apiRequest('/auth/me');
        const userData = user.data || {};
        await loadAccountInfoSection(userData);
      } catch (error) {
        const content = document.getElementById('account-info-content');
        if (content) {
          content.innerHTML = '<p style="color: #dc3545;">Failed to load account information: ' + error.message + '</p>';
        }
      }
    }
    
    async function loadSecurityPage() {
      try {
        const user = await apiRequest('/auth/me');
        const userData = user.data || {};
        const isAdminOrOwner = userData.role === 'owner' || userData.role === 'admin';
        await loadSecuritySection(isAdminOrOwner);
      } catch (error) {
        const content = document.getElementById('security-content');
        if (content) {
          content.innerHTML = '<p style="color: #dc3545;">Failed to load security settings: ' + error.message + '</p>';
        }
      }
    }
    
    async function loadStatusCheckPage() {
      try {
        const user = await apiRequest('/auth/me');
        const userData = user.data || {};
        const isAdminOrOwner = userData.role === 'owner' || userData.role === 'admin';
        if (!isAdminOrOwner) {
          const content = document.getElementById('status-check-content');
          if (content) {
            content.innerHTML = '<p style="color: #dc3545;">Access denied. Admin or owner role required.</p>';
          }
          return;
        }
        await loadStatusCheckSection();
      } catch (error) {
        const content = document.getElementById('status-check-content');
        if (content) {
          content.innerHTML = '<p style="color: #dc3545;">Failed to load status check settings: ' + error.message + '</p>';
        }
      }
    }
    
    async function loadAnalyticsAggregationPage() {
      try {
        const user = await apiRequest('/auth/me');
        const userData = user.data || {};
        const isAdminOrOwner = userData.role === 'owner' || userData.role === 'admin';
        if (!isAdminOrOwner) {
          const content = document.getElementById('analytics-aggregation-content');
          if (content) {
            content.innerHTML = '<p style="color: #dc3545;">Access denied. Admin or owner role required.</p>';
          }
          return;
        }
        await loadAnalyticsAggregationSection();
      } catch (error) {
        const content = document.getElementById('analytics-aggregation-content');
        if (content) {
          content.innerHTML = '<p style="color: #dc3545;">Failed to load analytics aggregation settings: ' + error.message + '</p>';
        }
      }
    }
    
    async function loadUserManagementPage() {
      try {
        const user = await apiRequest('/auth/me');
        const userData = user.data || {};
        const isAdminOrOwner = userData.role === 'owner' || userData.role === 'admin';
        if (!isAdminOrOwner) {
          const content = document.getElementById('user-management-content');
          if (content) {
            content.innerHTML = '<p style="color: #dc3545;">Access denied. Admin or owner role required.</p>';
          }
          return;
        }
        await loadUserManagementSection();
      } catch (error) {
        const content = document.getElementById('user-management-content');
        if (content) {
          content.innerHTML = '<p style="color: #dc3545;">Failed to load user management: ' + error.message + '</p>';
        }
      }
    }
    
    async function loadAuditLogPage() {
      try {
        const user = await apiRequest('/auth/me');
        const userData = user.data || {};
        const isAdminOrOwner = userData.role === 'owner' || userData.role === 'admin';
        if (!isAdminOrOwner) {
          const content = document.getElementById('audit-log-content');
          if (content) {
            content.innerHTML = '<p style="color: #dc3545;">Access denied. Admin or owner role required.</p>';
          }
          return;
        }
        await loadAuditLogSection();
      } catch (error) {
        const content = document.getElementById('audit-log-content');
        if (content) {
          content.innerHTML = '<p style="color: #dc3545;">Failed to load audit logs: ' + error.message + '</p>';
        }
      }
    }
    
    // Initialize settings menu visibility based on user role
    async function initializeSettingsMenuVisibility() {
      try {
        const user = await apiRequest('/auth/me');
        const userData = user.data || {};
        const isAdminOrOwner = userData.role === 'owner' || userData.role === 'admin';
        
        // Show/hide analytics aggregation menu link (pages are controlled by CSS .page class)
        const analyticsLink = document.getElementById('settings-analytics-aggregation-link');
        if (analyticsLink) {
          analyticsLink.style.display = isAdminOrOwner ? 'block' : 'none';
        }
        
        // Show/hide user management menu link (pages are controlled by CSS .page class)
        const userManagementLink = document.getElementById('settings-user-management-link');
        if (userManagementLink) {
          userManagementLink.style.display = isAdminOrOwner ? 'block' : 'none';
        }
      } catch (error) {
        console.error('Failed to initialize settings menu visibility:', error);
      }
    }
    
    async function loadAccountInfoSection(userData) {
      const content = document.getElementById('account-info-content');
      if (!content) return;
      
      const html = '<div class="settings-card">' +
        '<div class="form-group" style="margin-top: 1.5rem;">' +
          '<label>Username</label>' +
          '<input type="text" value="' + (userData.username || userData.email || 'N/A') + '" disabled class="settings-input">' +
        '</div>' +
        '<div class="form-group" style="margin-top: 1rem;">' +
          '<label>Email</label>' +
          '<input type="email" value="' + (userData.email || 'N/A') + '" disabled class="settings-input">' +
        '</div>' +
        '<div class="form-group" style="margin-top: 1rem;">' +
          '<label>Role</label>' +
          '<input type="text" value="' + (userData.role || 'N/A') + '" disabled class="settings-input">' +
        '</div>' +
      '</div>';
      
      content.innerHTML = html;
    }
    
    async function loadSecuritySection(isAdminOrOwner) {
      const content = document.getElementById('security-content');
      if (!content) return;
      
      let html = '<div style="display: grid; gap: 2rem;">';
      
      // Password Change Section
      html += '<div class="settings-card">' +
        '<h3 style="margin-bottom: 1.5rem; color: var(--text-color);">Change Password</h3>' +
        '<form id="change-password-form" style="margin-top: 1.5rem;">' +
          '<div class="form-group">' +
            '<label for="current-password">Current Password</label>' +
            '<input type="password" id="current-password" required class="settings-input">' +
          '</div>' +
          '<div class="form-group" style="margin-top: 1rem;">' +
            '<label for="new-password">New Password</label>' +
            '<input type="password" id="new-password" required minlength="12" class="settings-input">' +
            '<small class="settings-helper-text">Password must be at least 12 characters with uppercase, lowercase, number, and special character</small>' +
          '</div>' +
          '<div class="form-group" style="margin-top: 1rem;">' +
            '<label for="confirm-password">Confirm New Password</label>' +
            '<input type="password" id="confirm-password" required class="settings-input">' +
          '</div>' +
          '<div id="password-change-error" style="color: var(--error-color); margin-top: 1rem; display: none;"></div>' +
          '<div id="password-change-success" style="color: var(--success-color); margin-top: 1rem; display: none;"></div>' +
          '<button type="submit" class="btn btn-primary" style="margin-top: 1rem;">Change Password</button>' +
        '</form>' +
      '</div>';
      
      // MFA Section (Admin/Owner only)
      if (isAdminOrOwner) {
        html += '<div class="settings-card">' +
          '<h3 style="margin-bottom: 1.5rem; color: var(--text-color);">Two-Factor Authentication (MFA)</h3>' +
          '<div id="mfa-status" style="margin-top: 1.5rem; color: var(--text-color);">Loading MFA status...</div>' +
          '<div id="mfa-setup-section" style="display: none; margin-top: 1.5rem;">' +
            '<div id="mfa-qr-code" style="text-align: center; margin: 1.5rem 0;"></div>' +
            '<div id="mfa-backup-codes" class="info-box" style="display: none;"></div>' +
            '<div class="form-group" style="margin-top: 1.5rem;">' +
              '<label for="mfa-verify-code">Enter MFA Code to Enable</label>' +
              '<input type="text" id="mfa-verify-code" maxlength="6" pattern="[0-9]{6}" placeholder="000000" class="settings-input">' +
            '</div>' +
            '<div id="mfa-setup-error" style="color: #dc3545; margin-top: 1rem; display: none;"></div>' +
            '<button id="mfa-enable-btn" class="btn btn-primary" style="margin-top: 1rem;">Enable MFA</button>' +
            '<button id="mfa-cancel-setup-btn" class="btn btn-secondary" style="margin-top: 1rem; margin-left: 0.5rem;">Cancel</button>' +
          '</div>' +
          '<div id="mfa-manage-section" style="display: none; margin-top: 1.5rem;">' +
            '<p style="color: #28a745; margin-bottom: 1rem;">✓ MFA is enabled for your account</p>' +
            '<button id="mfa-regenerate-backup-btn" class="btn btn-secondary" style="margin-right: 0.5rem;">Regenerate Backup Codes</button>' +
            '<button id="mfa-disable-btn" class="btn btn-danger">Disable MFA</button>' +
          '</div>' +
        '</div>';
      }
      
      html += '</div>';
      content.innerHTML = html;
      
      // Initialize password change form
      const changePwdForm = document.getElementById('change-password-form');
      if (changePwdForm) {
        changePwdForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const currentPwd = document.getElementById('current-password').value;
          const newPwd = document.getElementById('new-password').value;
          const confirmPwd = document.getElementById('confirm-password').value;
          const errorDiv = document.getElementById('password-change-error');
          const successDiv = document.getElementById('password-change-success');
          
          errorDiv.style.display = 'none';
          successDiv.style.display = 'none';
          
          if (newPwd !== confirmPwd) {
            errorDiv.textContent = 'New passwords do not match';
            errorDiv.style.display = 'block';
            return;
          }
          
          if (newPwd.length < 12) {
            errorDiv.textContent = 'Password must be at least 12 characters long';
            errorDiv.style.display = 'block';
            return;
          }
          
          try {
            const response = await apiRequest('/auth/change-password', {
              method: 'POST',
              body: JSON.stringify({
                current_password: currentPwd,
                new_password: newPwd
              })
            });
            
            successDiv.textContent = 'Password changed successfully!';
            successDiv.style.display = 'block';
            changePwdForm.reset();
          } catch (error) {
            errorDiv.textContent = error.message || 'Failed to change password';
            errorDiv.style.display = 'block';
          }
        });
      }
      
      // Initialize MFA section (admin/owner only)
      if (isAdminOrOwner) {
        await loadMFAStatus();
        initMFASection();
      }
    }
    
    // Status Check Configuration Section
    async function loadStatusCheckSection() {
      const content = document.getElementById('status-check-content');
      if (!content) return;
      
      try {
        const response = await apiRequest('/settings/status-check-frequency');
        const settings = response.data || {
          frequency: { value: 14, unit: 'days' },
          enabled: true,
          check_top_100_daily: false,
          batch_size: 100,
        };
        
        // Handle migration from old format
        let frequency = settings.frequency;
        if (typeof frequency === 'string') {
          if (frequency === '2_weeks') {
            frequency = { value: 2, unit: 'weeks' };
          } else if (frequency === '1_month') {
            frequency = { value: 30, unit: 'days' };
          } else {
            frequency = { value: 14, unit: 'days' };
          }
        }
        
        const batchSize = settings.batch_size || 100;
        const lastUpdated = settings.last_updated_at 
          ? new Date(settings.last_updated_at).toLocaleString() 
          : 'Never';
        
        // Calculate throughput (assuming cron runs every 6 hours = 4 times per day)
        const cronRunsPerDay = 4; // Current cron: "0 */6 * * *"
        const linksPerDay = batchSize * cronRunsPerDay;
        const linksPerWeek = linksPerDay * 7;
        
        let html = '<div style="display: grid; gap: 2rem;">';
        html += '<div style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px;">';
        html += '<h3 style="margin-bottom: 1rem;">Status Check Settings</h3>';
        html += '<div style="display: grid; gap: 1rem;">';
        
        // Enable checkbox
        html += '<div style="display: flex; align-items: center; gap: 0.5rem;">';
        html += '<input type="checkbox" id="status-check-enabled" ' + (settings.enabled ? 'checked' : '') + '>';
        html += '<label for="status-check-enabled" style="font-weight: 600;">Enable Status Checking</label>';
        html += '</div>';
        
        // Frequency selection - flexible input
        html += '<div class="form-group">';
        html += '<label for="status-check-frequency-value">Check Frequency:</label>';
        html += '<div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">';
        html += '<input type="number" id="status-check-frequency-value" min="1" max="365" value="' + frequency.value + '" style="width: 100px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">';
        html += '<select id="status-check-frequency-unit" style="padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">';
        html += '<option value="days" ' + (frequency.unit === 'days' ? 'selected' : '') + '>Days</option>';
        html += '<option value="weeks" ' + (frequency.unit === 'weeks' ? 'selected' : '') + '>Weeks</option>';
        html += '</select>';
        html += '</div>';
        html += '<small style="color: #666; display: block; margin-top: 0.25rem;">How often each link should be checked (1-365 days or weeks)</small>';
        html += '</div>';
        
        // Batch size input
        html += '<div class="form-group">';
        html += '<label for="status-check-batch-size">Links Per Cron Run:</label>';
        html += '<input type="number" id="status-check-batch-size" min="10" max="1000" value="' + batchSize + '" style="width: 150px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; margin-top: 0.5rem;">';
        html += '<small style="color: #666; display: block; margin-top: 0.25rem;">Number of links to check each time the cron job runs (10-1000). Recommended: 50-200</small>';
        html += '<div style="background: #fff3cd; border: 1px solid #ffc107; padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">';
        html += '<strong style="color: #856404; display: block; margin-bottom: 0.25rem;">⚠️ Cloudflare Workers Free Plan Warning:</strong>';
        html += '<div style="font-size: 0.85rem; color: #856404;">';
        html += 'The Free plan has a <strong>10ms CPU limit</strong> per invocation. Processing many links may exceed this limit.<br>';
        html += '<strong>Recommended for Free plan:</strong> 5-10 links per cron run. If you need higher throughput, run the cron more frequently (e.g., every hour) or upgrade to the Paid plan.<br>';
        html += 'If you see "CPU Limit Exceeded" errors in your logs, reduce this value.';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        // Throughput information
        html += '<div class="help-box">';
        html += '<strong style="display: block; margin-bottom: 0.5rem;">Current Throughput:</strong>';
        html += '<div style="display: grid; gap: 0.25rem; font-size: 0.9rem;">';
        html += '<div>Links checked per day: <strong>' + linksPerDay.toLocaleString() + '</strong></div>';
        html += '<div>Links checked per week: <strong>' + linksPerWeek.toLocaleString() + '</strong></div>';
        html += '</div>';
        html += '</div>';
        
        // Daily top 100 checkbox
        html += '<div style="display: flex; align-items: center; gap: 0.5rem;">';
        html += '<input type="checkbox" id="check-top-100-daily" ' + (settings.check_top_100_daily ? 'checked' : '') + '>';
        html += '<label for="check-top-100-daily" style="font-weight: 600; color: var(--text-color);">Check Top 100 Links Daily</label>';
        html += '</div>';
        html += '<small class="helper-text">The top 100 links by click count will be checked daily regardless of the frequency setting above.</small>';
        
        // Cron schedule information
        html += '<div class="warning-box" style="margin-top: 1rem;">';
        html += '<strong style="display: block; margin-bottom: 0.5rem;">Cron Schedule Configuration:</strong>';
        html += '<div style="font-size: 0.9rem; margin-bottom: 0.5rem;">';
        html += '<div>Current schedule: <span class="code-badge">0 */6 * * *</span> (every 6 hours)</div>';
        html += '</div>';
        html += '<div style="font-size: 0.85rem;">';
        html += '<strong>To change the cron schedule:</strong><br>';
        html += '<strong>Option 1: Via Cloudflare Dashboard</strong><br>';
        html += '1. Go to <a href="https://dash.cloudflare.com" target="_blank" style="color: #007bff;">Cloudflare Dashboard</a> → Workers & Pages<br>';
        html += '2. Select your Worker → Settings → Triggers<br>';
        html += '3. Under "Cron Triggers", click "Add Cron Trigger"<br>';
        html += '4. Enter your cron expression and save<br><br>';
        html += '<strong>Option 2: Via wrangler.toml</strong><br>';
        html += '1. Edit <code>wrangler.toml</code> in your project root<br>';
        html += '2. Modify the <code>[triggers]</code> section<br>';
        html += '3. Update the cron expression (e.g., <code>"0 */12 * * *"</code> for every 12 hours)<br>';
        html += '4. Redeploy your Worker<br><br>';
        html += '<strong>Common cron schedules:</strong><br>';
        html += '• Every hour: <code>"0 * * * *"</code><br>';
        html += '• Every 6 hours: <code>"0 */6 * * *"</code> (current)<br>';
        html += '• Every 12 hours: <code>"0 */12 * * *"</code><br>';
        html += '• Twice daily: <code>"0 0,12 * * *"</code><br>';
        html += '• Daily: <code>"0 0 * * *"</code>';
        html += '</div>';
        html += '</div>';
        
        html += '<div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">';
        html += '<small class="helper-text">Last updated: ' + lastUpdated + '</small>';
        html += '</div>';
        
        html += '<button id="save-status-check-settings" class="btn btn-primary" style="margin-top: 1rem;">Save Changes</button>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        content.innerHTML = html;
        
        // Attach save button handler
        const saveBtn = document.getElementById('save-status-check-settings');
        if (saveBtn) {
          saveBtn.addEventListener('click', async () => {
            const enabled = document.getElementById('status-check-enabled').checked;
            const frequencyValue = parseInt(document.getElementById('status-check-frequency-value').value);
            const frequencyUnit = document.getElementById('status-check-frequency-unit').value;
            const batchSize = parseInt(document.getElementById('status-check-batch-size').value);
            const checkTop100Daily = document.getElementById('check-top-100-daily').checked;
            
            // Validation
            if (frequencyValue < 1 || frequencyValue > 365) {
              showToast('Frequency value must be between 1 and 365', 'error');
              return;
            }
            if (batchSize < 10 || batchSize > 1000) {
              showToast('Batch size must be between 10 and 1000', 'error');
              return;
            }
            
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            
            try {
              await apiRequest('/settings/status-check-frequency', {
                method: 'PUT',
                body: JSON.stringify({
                  frequency: {
                    value: frequencyValue,
                    unit: frequencyUnit,
                  },
                  enabled,
                  check_top_100_daily: checkTop100Daily,
                  batch_size: batchSize,
                }),
              });
              showToast('Status check settings saved successfully', 'success');
              await loadStatusCheckSection(); // Reload to show updated timestamp
            } catch (error) {
              showToast('Failed to save settings: ' + (error.message || 'Unknown error'), 'error');
            } finally {
              saveBtn.disabled = false;
              saveBtn.textContent = 'Save Changes';
            }
          });
        }
      } catch (error) {
        content.innerHTML = '<p style="color: #dc3545;">Failed to load status check settings: ' + error.message + '</p>';
      }
    }
    
    // Analytics Aggregation section
    async function loadAnalyticsAggregationSection() {
      const content = document.getElementById('analytics-aggregation-content');
      if (!content) return;
      
      try {
        // Load aggregation enabled setting
        const aggregationResponse = await apiRequest('/settings/analytics-aggregation');
        const aggregationEnabled = aggregationResponse.data?.enabled ?? false;
        
        // Load thresholds setting
        const thresholdsResponse = await apiRequest('/settings/analytics-thresholds');
        const thresholds = thresholdsResponse.data || {
          threshold_days: 83, // Default: 83 days (7-day buffer)
        };
        
        // Support migration from old format
        const threshold = thresholds.threshold_days ?? 
          thresholds.aggregation_threshold_days ?? 
          thresholds.engine_threshold_days ?? 
          83; // Default: 83 days (7-day buffer)
        
        let html = '<div style="display: grid; gap: 2rem;">';
        html += '<div class="settings-card">';
        html += '<h3 style="margin-bottom: 1rem; color: var(--text-color);">Analytics Aggregation Settings</h3>';
        html += '<div style="display: grid; gap: 1rem;">';
        
        // Enable aggregation checkbox
        html += '<div style="display: flex; align-items: center; gap: 0.5rem;">';
        html += '<input type="checkbox" id="analytics-aggregation-enabled" ' + (aggregationEnabled ? 'checked' : '') + '>';
        html += '<label for="analytics-aggregation-enabled" style="font-weight: 600; color: var(--text-color);">Enable Analytics Aggregation</label>';
        html += '</div>';
        html += '<div class="help-box">';
        html += '<strong>What does this do?</strong>';
        html += '<div style="font-size: 0.9rem; line-height: 1.6;">';
        html += '<p><strong>When enabled:</strong> Analytics data is aggregated and stored in D1 for historical queries. The age threshold is configured below in "Data Source Threshold".</p>';
        html += '<p><strong>When disabled:</strong> Only Analytics Engine is used for queries (90-day retention limit).</p>';
        html += '</div>';
        html += '</div>';
        
        // CPU usage warning for Free plan
        html += '<div style="background: #fff3cd; border: 1px solid #ffc107; padding: 0.75rem; border-radius: 4px; margin-top: 0.5rem;">';
        html += '<strong style="color: #856404; display: block; margin-bottom: 0.25rem;">⚠️ Cloudflare Workers Free Plan Warning:</strong>';
        html += '<div style="font-size: 0.85rem; color: #856404; line-height: 1.6;">';
        html += 'The Free plan has a <strong>10ms CPU limit</strong> per invocation. The daily aggregation job processes one day of click data from <strong>X days ago</strong>, where X is your Data Source Threshold setting (configured below).<br><br>';
        html += '<strong>Example:</strong> With threshold = 83 days, the cron aggregates data from 83 days ago.<br><br>';
        html += '<strong>CPU Usage Estimates:</strong><br>';
        html += '• <strong>Low traffic</strong> (&lt;500 clicks/day): ~2-3ms CPU - ✅ Safe<br>';
        html += '• <strong>Medium traffic</strong> (500-1,000 clicks/day): ~5-8ms CPU - ⚠️ May work<br>';
        html += '• <strong>High traffic</strong> (&gt;1,000 clicks/day): ~10-60ms CPU - ❌ Will likely fail<br><br>';
        html += '<strong>Recommendation:</strong> If you have <strong>high-traffic links (&gt;1,000 clicks/day)</strong> and are on the Free plan, we recommend <strong>disabling aggregation</strong> and querying only from Analytics Engine (90-day retention). Alternatively, upgrade to the Paid plan for higher CPU limits.';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        
        // Thresholds configuration
        html += '<div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border-color);">';
        html += '<h4 style="margin-bottom: 1rem; color: var(--text-color);">Data Source Threshold</h4>';
        
        // Single threshold
        html += '<div class="form-group" style="margin-bottom: 1rem;">';
        html += '<label for="analytics-threshold">Data Source Threshold (days):</label>';
        html += '<input type="number" id="analytics-threshold" min="1" max="90" value="' + threshold + '" class="settings-input" style="width: 150px; margin-top: 0.5rem;">';
        html += '<small class="settings-helper-text">Data less than this many days old will be queried from Analytics Engine. Data this old or older will be queried from D1 (must be aggregated first). Maximum: 90 days (Analytics Engine retention limit). Recommended: 83 days (7-day safety buffer). Default: 83 days</small>';
        html += '</div>';
        
        // Calculate and show aggregation date
        const today = new Date();
        const aggregationDate = new Date(today);
        aggregationDate.setDate(aggregationDate.getDate() - threshold);
        const aggregationDateStr = aggregationDate.toISOString().split('T')[0];
        const bufferDays = 90 - threshold;
        html += '<div id="aggregation-schedule-info" class="help-box" style="margin-top: 1rem; background: #f0f9ff; border: 1px solid #bae6fd; padding: 0.75rem; border-radius: 0.5rem;">';
        html += '<strong style="display: block; margin-bottom: 0.5rem; color: #0369a1;">Aggregation Schedule:</strong>';
        html += '<p id="aggregation-schedule-text" style="font-size: 0.9rem; line-height: 1.6; margin: 0; color: #0c4a6e;">With threshold set to <strong>' + threshold + ' days</strong>, the daily aggregation job (runs at midnight UTC) will process data from <strong>' + aggregationDateStr + '</strong> (exactly ' + threshold + ' days ago). Each day, it aggregates one day of data that has reached the threshold age. <strong>Safety buffer: ' + bufferDays + ' days</strong> before data expires from Analytics Engine (90-day retention).</p>';
        html += '</div>';
        
        html += '<div class="warning-box" style="margin-top: 1rem;">';
        html += '<strong style="display: block; margin-bottom: 0.5rem;">Important Notes:</strong>';
        html += '<ul style="margin: 0; padding-left: 1.5rem; font-size: 0.9rem; line-height: 1.6;">';
        html += '<li>The daily aggregation job (runs at midnight UTC) processes one day of data from <strong>X days ago</strong>, where X is your configured threshold. Each day it processes a different calendar date (e.g., if X = 83: today processes Sept 24, tomorrow processes Sept 25, etc.).</li>';
        html += '<li>Cloudflare Analytics Engine only stores data for 90 days, so threshold cannot exceed 90 days</li>';
        html += '<li><strong>Recommended: 83 days (7-day safety buffer)</strong> - Provides buffer for failures, rate limits, and processing delays before data expires from Analytics Engine</li>';
        html += '<li>To query Analytics Engine directly, you need to configure <code>CLOUDFLARE_ACCOUNT_ID</code> and <code>CLOUDFLARE_API_TOKEN</code> environment variables</li>';
        html += '<li>When aggregation is disabled, only Analytics Engine data is available (90-day retention)</li>';
        html += '</ul>';
        html += '</div>';
        
        html += '</div>';
        html += '</div>';
        
        html += '<button id="save-analytics-aggregation-settings" class="btn btn-primary" style="margin-top: 1rem;">Save Changes</button>';
        html += '</div>';
        html += '</div>';
        
        content.innerHTML = html;
        
        // Update aggregation schedule when threshold changes
        const thresholdInput = document.getElementById('analytics-threshold');
        const scheduleText = document.getElementById('aggregation-schedule-text');
        if (thresholdInput && scheduleText) {
          thresholdInput.addEventListener('input', () => {
            const thresholdValue = parseInt(thresholdInput.value) || threshold;
            if (thresholdValue >= 1 && thresholdValue <= 90) {
              const today = new Date();
              const aggregationDate = new Date(today);
              aggregationDate.setDate(aggregationDate.getDate() - thresholdValue);
              const aggregationDateStr = aggregationDate.toISOString().split('T')[0];
              const bufferDays = 90 - thresholdValue;
              scheduleText.innerHTML = 'With threshold set to <strong>' + thresholdValue + ' days</strong>, data from <strong>' + aggregationDateStr + '</strong> and earlier will be aggregated to D1. The daily aggregation job runs at midnight UTC and processes data that is ' + thresholdValue + '+ days old. <strong>Safety buffer: ' + bufferDays + ' days</strong> before data expires from Analytics Engine (90-day retention).';
            }
          });
        }
        
        // Attach save button handler
        const saveBtn = document.getElementById('save-analytics-aggregation-settings');
        if (saveBtn) {
          saveBtn.addEventListener('click', async () => {
            const enabled = document.getElementById('analytics-aggregation-enabled').checked;
            const thresholdValue = parseInt(document.getElementById('analytics-threshold').value);
            
            // Validation
            if (thresholdValue < 1 || thresholdValue > 90) {
              showToast('Threshold must be between 1 and 90 days (Analytics Engine retention limit)', 'error');
              return;
            }
            
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            
            try {
              // Save aggregation enabled setting
              await apiRequest('/settings/analytics-aggregation', {
                method: 'PUT',
                body: JSON.stringify({ enabled }),
              });
              
              // Save thresholds setting
              await apiRequest('/settings/analytics-thresholds', {
                method: 'PUT',
                body: JSON.stringify({
                  threshold_days: thresholdValue,
                }),
              });
              
              showToast('Analytics aggregation settings saved successfully', 'success');
              await loadAnalyticsAggregationSection(); // Reload to show updated values
            } catch (error) {
              showToast('Failed to save settings: ' + (error.message || 'Unknown error'), 'error');
            } finally {
              saveBtn.disabled = false;
              saveBtn.textContent = 'Save Changes';
            }
          });
        }
      } catch (error) {
        content.innerHTML = '<p style="color: #dc3545;">Failed to load analytics aggregation settings: ' + error.message + '</p>';
      }
    }
    
    // User Management section
    async function loadUserManagementSection() {
      const content = document.getElementById('user-management-content');
      if (!content) return;
      
      try {
        // Load users list
        const users = await apiRequest('/users');
        const usersList = users.data || [];
        
        // Load domains for domain assignment
        const domains = await apiRequest('/domains');
        const domainsList = domains.data || [];
        
        let html = '<div style="display: grid; gap: 2rem;">';
        
        // Users list
        html += '<div class="settings-card">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">';
        html += '<h3 style="margin: 0; color: var(--text-color);">Users</h3>';
        html += '<button id="create-user-btn" class="btn btn-primary">+ Add User</button>';
        html += '</div>';
        
        if (usersList.length === 0) {
          html += '<p class="settings-helper-text">No users found.</p>';
        } else {
          html += '<div class="table-container">';
          html += '<table class="data-table" style="width: 100%;">';
          html += '<thead><tr>';
          html += '<th>Username</th>';
          html += '<th>Email</th>';
          html += '<th>Role</th>';
          html += '<th>Access</th>';
          html += '<th>Created</th>';
          html += '<th>Last Login</th>';
          html += '<th>Actions</th>';
          html += '</tr></thead>';
          html += '<tbody id="users-tbody">';
          
          usersList.forEach(user => {
            const accessText = user.global_access 
              ? 'All Domains' 
              : (user.domain_ids && user.domain_ids.length > 0 
                ? user.domain_ids.length + ' Domain(s)' 
                : 'No Access');
            const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';
            const lastLogin = user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never';
            const userIdEscaped = escapeAttr(user.id);
            const usernameEscaped = escapeHtml(user.username || user.email || 'N/A');
            const emailEscaped = escapeHtml(user.email || 'N/A');
            const roleEscaped = escapeHtml(user.role || 'N/A');
            
            html += '<tr>';
            html += '<td>' + usernameEscaped + '</td>';
            html += '<td>' + emailEscaped + '</td>';
            html += '<td><span class="status-badge" style="background: ' + (user.role === 'admin' || user.role === 'owner' ? '#007bff' : user.role === 'user' ? '#28a745' : '#ffc107') + '; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">' + roleEscaped + '</span></td>';
            html += '<td>' + escapeHtml(accessText) + '</td>';
            html += '<td>' + createdDate + '</td>';
            html += '<td>' + lastLogin + '</td>';
            html += '<td>';
            html += '<button class="btn btn-sm btn-primary" data-user-id="' + userIdEscaped + '" onclick="editUser(this.dataset.userId)" style="margin-right: 0.5rem;">Edit</button>';
            html += '<button class="btn btn-sm btn-secondary" data-user-id="' + userIdEscaped + '" onclick="deleteUser(this.dataset.userId)">Delete</button>';
            html += '</td>';
            html += '</tr>';
          });
          
          html += '</tbody></table>';
          html += '</div>';
        }
        
        html += '</div>';
        html += '</div>';
        
        content.innerHTML = html;
        
        // Attach event listeners
        const createUserBtn = document.getElementById('create-user-btn');
        if (createUserBtn) {
          createUserBtn.addEventListener('click', () => {
            showCreateUserModal(domainsList);
          });
        }
        
        // Attach edit/delete handlers
        document.querySelectorAll('[onclick*="editUser"]').forEach(btn => {
          const userId = btn.getAttribute('data-user-id');
          if (userId) {
            btn.addEventListener('click', () => editUser(userId));
          }
        });
        
        document.querySelectorAll('[onclick*="deleteUser"]').forEach(btn => {
          const userId = btn.getAttribute('data-user-id');
          if (userId) {
            btn.addEventListener('click', () => deleteUser(userId));
          }
        });
        
      } catch (error) {
        content.innerHTML = '<p style="color: #dc3545;">Failed to load users: ' + error.message + '</p>';
      }
    }
    
    // Show create user modal
    function showCreateUserModal(domainsList) {
      const modal = document.getElementById('user-modal');
      if (!modal) {
        // Create modal if it doesn't exist
        createUserModal(domainsList);
        return;
      }
      
      // Reset form
      const form = document.getElementById('user-form');
      const title = document.getElementById('user-modal-title');
      if (form) form.reset();
      if (title) title.textContent = 'Create User';
      
      // Reset domain access
      const globalAccessCheckbox = document.getElementById('user-global-access');
      const domainAccessGroup = document.getElementById('user-domain-access-group');
      if (globalAccessCheckbox) {
        globalAccessCheckbox.checked = false;
      }
      if (domainAccessGroup) {
        domainAccessGroup.style.display = 'block';
      }
      
      // Load domains
      loadDomainsForUserModal(domainsList);
      
      modal.classList.add('active');
    }
    
    // Create user modal HTML
    function createUserModal(domainsList) {
      const modal = document.createElement('div');
      modal.id = 'user-modal';
      modal.className = 'modal';
      modal.innerHTML = '<div class="modal-content" style="max-width: 600px; max-height: 90vh; overflow-y: auto;">' +
        '<span class="close" id="user-modal-close">&times;</span>' +
        '<h2 id="user-modal-title">Create User</h2>' +
        '<form id="user-form">' +
        '<div class="form-group">' +
        '<label for="user-username">Username *</label>' +
        '<input type="text" id="user-username" required pattern="[a-zA-Z0-9_-]+" minlength="3" maxlength="50" placeholder="username">' +
        '<small style="display: block; margin-top: 0.25rem; color: #666;">Letters, numbers, underscore, and hyphen only (3-50 characters)</small>' +
        '</div>' +
        '<div class="form-group">' +
        '<label for="user-email">Email (optional)</label>' +
        '<input type="email" id="user-email" placeholder="user@example.com">' +
        '</div>' +
        '<div class="form-group">' +
        '<label for="user-password">Password *</label>' +
        '<input type="password" id="user-password" required minlength="12" placeholder="Minimum 12 characters">' +
        '<small style="display: block; margin-top: 0.25rem; color: #666;">Must contain uppercase, lowercase, number, and special character</small>' +
        '</div>' +
        '<div class="form-group">' +
        '<label for="user-role">Role *</label>' +
        '<select id="user-role" required>' +
        '<option value="user">User</option>' +
        '<option value="analyst">Analyst</option>' +
        '<option value="admin">Admin</option>' +
        '</select>' +
        '<small style="display: block; margin-top: 0.25rem; color: #666;">Admin has full access. User can manage links. Analyst can only view analytics.</small>' +
        '</div>' +
        '<div class="form-group">' +
        '<label>' +
        '<input type="checkbox" id="user-global-access">' +
        'Global Access (Access to all domains)' +
        '</label>' +
        '<small style="display: block; margin-top: 0.25rem; color: #666;">If unchecked, select specific domains below</small>' +
        '</div>' +
        '<div class="form-group" id="user-domain-access-group">' +
        '<label for="user-domains">Domain Access</label>' +
        '<select id="user-domains" multiple style="height: 150px;">' +
        '</select>' +
        '<small style="display: block; margin-top: 0.25rem; color: #666;">Select one or more domains. Required if Global Access is disabled.</small>' +
        '</div>' +
        '<div id="user-form-error" style="color: #dc3545; margin-top: 1rem; display: none;"></div>' +
        '<div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">' +
        '<button type="submit" id="submit-user-btn" class="btn btn-primary">Create User</button>' +
        '<button type="button" id="cancel-user-btn" class="btn btn-secondary">Cancel</button>' +
        '</div>' +
        '</form>' +
        '</div>';
      document.body.appendChild(modal);
      
      // Setup event listeners
      const closeBtn = document.getElementById('user-modal-close');
      const cancelBtn = document.getElementById('cancel-user-btn');
      const form = document.getElementById('user-form');
      const globalAccessCheckbox = document.getElementById('user-global-access');
      const domainAccessGroup = document.getElementById('user-domain-access-group');
      
      closeBtn?.addEventListener('click', () => {
        modal.classList.remove('active');
      });
      
      cancelBtn?.addEventListener('click', () => {
        modal.classList.remove('active');
      });
      
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
      
      globalAccessCheckbox?.addEventListener('change', (e) => {
        if (domainAccessGroup) {
          domainAccessGroup.style.display = e.target.checked ? 'none' : 'block';
        }
      });
      
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleUserFormSubmit(domainsList);
      });
      
      // Load domains
      loadDomainsForUserModal(domainsList);
    }
    
    // Load domains for user modal
    function loadDomainsForUserModal(domainsList) {
      const select = document.getElementById('user-domains');
      if (!select) return;
      
      select.innerHTML = '';
      domainsList.forEach(domain => {
        const option = document.createElement('option');
        option.value = domain.id;
        option.textContent = domain.domain_name;
        select.appendChild(option);
      });
    }
    
    // Handle user form submit (create or update)
    async function handleUserFormSubmit(domainsList) {
      const errorDiv = document.getElementById('user-form-error');
      const submitBtn = document.getElementById('submit-user-btn');
      const title = document.getElementById('user-modal-title');
      const isEdit = title?.textContent === 'Edit User';
      const userId = submitBtn?.getAttribute('data-user-id');
      
      if (errorDiv) errorDiv.style.display = 'none';
      if (submitBtn) submitBtn.disabled = true;
      
      try {
        const username = document.getElementById('user-username')?.value.trim();
        const email = document.getElementById('user-email')?.value.trim();
        const password = document.getElementById('user-password')?.value;
        const role = document.getElementById('user-role')?.value;
        const globalAccess = document.getElementById('user-global-access')?.checked || false;
        const domainSelect = document.getElementById('user-domains');
        const selectedDomains = Array.from(domainSelect?.selectedOptions || [])
          .map(opt => opt.value)
          .filter(v => v !== '');
        
        // Validation
        if (!username || username.length < 3) {
          throw new Error('Username must be at least 3 characters');
        }
        
        if (isEdit) {
          // Update user
          if (!userId) throw new Error('User ID missing');
          
          const updateData = {
            username,
            role,
            global_access: globalAccess,
          };
          
          if (email) updateData.email = email;
          if (password && password.length > 0) {
            if (password.length < 12) {
              throw new Error('Password must be at least 12 characters');
            }
            updateData.password = password;
          }
          
          if (!globalAccess) {
            if (selectedDomains.length === 0) {
              throw new Error('Please select at least one domain or enable Global Access');
            }
            updateData.domain_ids = selectedDomains;
          } else {
            updateData.domain_ids = [];
          }
          
          await apiRequest('/users/' + userId, {
            method: 'PUT',
            body: JSON.stringify(updateData),
          });
          
          showToast('User updated successfully!', 'success');
        } else {
          // Create user
          if (!password || password.length < 12) {
            throw new Error('Password must be at least 12 characters');
          }
          
          if (!globalAccess && selectedDomains.length === 0) {
            throw new Error('Please select at least one domain or enable Global Access');
          }
          
          const createData = {
            username,
            password,
            role,
            global_access: globalAccess,
          };
          
          if (email) createData.email = email;
          if (!globalAccess) {
            createData.domain_ids = selectedDomains;
          }
          
          await apiRequest('/users', {
            method: 'POST',
            body: JSON.stringify(createData),
          });
          
          showToast('User created successfully!', 'success');
        }
        
        // Close modal and reload
        const modal = document.getElementById('user-modal');
        if (modal) modal.classList.remove('active');
        await loadUserManagementSection();
        
      } catch (error) {
        if (errorDiv) {
          errorDiv.textContent = error.message || 'Failed to save user';
          errorDiv.style.display = 'block';
        }
        showToast(error.message || 'Failed to save user', 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    }
    
    // Edit user
    async function editUser(userId) {
      try {
        const user = await apiRequest('/users/' + userId);
        const userData = user.data;
        
        // Load domains
        const domains = await apiRequest('/domains');
        const domainsList = domains.data || [];
        
        // Create modal if it doesn't exist
        const modal = document.getElementById('user-modal');
        if (!modal) {
          createUserModal(domainsList);
        }
        
        // Populate form
        const title = document.getElementById('user-modal-title');
        const usernameInput = document.getElementById('user-username');
        const emailInput = document.getElementById('user-email');
        const passwordInput = document.getElementById('user-password');
        const roleSelect = document.getElementById('user-role');
        const globalAccessCheckbox = document.getElementById('user-global-access');
        const domainSelect = document.getElementById('user-domains');
        const domainAccessGroup = document.getElementById('user-domain-access-group');
        const submitBtn = document.getElementById('submit-user-btn');
        
        if (title) title.textContent = 'Edit User';
        if (usernameInput) usernameInput.value = userData.username || '';
        if (emailInput) emailInput.value = userData.email || '';
        if (passwordInput) passwordInput.value = ''; // Don't show password
        if (passwordInput) passwordInput.placeholder = 'Leave empty to keep current password';
        if (roleSelect) roleSelect.value = userData.role || 'user';
        if (globalAccessCheckbox) globalAccessCheckbox.checked = userData.global_access || false;
        if (domainAccessGroup) {
          domainAccessGroup.style.display = globalAccessCheckbox?.checked ? 'none' : 'block';
        }
        
        // Load and select domains
        loadDomainsForUserModal(domainsList);
        if (domainSelect && userData.domain_ids) {
          Array.from(domainSelect.options).forEach(option => {
            option.selected = userData.domain_ids.includes(option.value);
          });
        }
        
        // Set user ID on submit button
        if (submitBtn) {
          submitBtn.setAttribute('data-user-id', userId);
          submitBtn.textContent = 'Update User';
        }
        
        // Show modal
        const modalElement = document.getElementById('user-modal');
        if (modalElement) modalElement.classList.add('active');
        
      } catch (error) {
        showToast('Failed to load user: ' + error.message, 'error');
      }
    }
    
    // Delete user
    async function deleteUser(userId) {
      if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
      }
      
      try {
        await apiRequest('/users/' + userId, { method: 'DELETE' });
        showToast('User deleted successfully!', 'success');
        await loadUserManagementSection();
      } catch (error) {
        showToast('Failed to delete user: ' + error.message, 'error');
      }
    }
    
    // Make functions globally available
    window.editUser = editUser;
    window.deleteUser = deleteUser;
    
    async function loadAuditLogSection() {
      const content = document.getElementById('audit-log-content');
      if (!content) return;
      
      const html = '<div class="settings-card">' +
        '<div style="margin-top: 1.5rem;">' +
          '<div style="display: flex; gap: 1rem; margin-bottom: 1rem; align-items: center; flex-wrap: wrap;">' +
            '<select id="audit-event-type" class="settings-input" style="width: auto;">' +
              '<option value="">All Events</option>' +
              '<option value="login_success">Login Success</option>' +
              '<option value="login_failure">Login Failure</option>' +
              '<option value="logout">Logout</option>' +
              '<option value="password_change">Password Change</option>' +
              '<option value="mfa_setup">MFA Setup</option>' +
              '<option value="mfa_enabled">MFA Enabled</option>' +
              '<option value="mfa_disabled">MFA Disabled</option>' +
              '<option value="mfa_verify_success">MFA Verify Success</option>' +
              '<option value="mfa_verify_failure">MFA Verify Failure</option>' +
              '<option value="token_refreshed">Token Refreshed</option>' +
              '<option value="user_created">User Created</option>' +
              '<option value="user_deleted">User Deleted</option>' +
            '</select>' +
            '<input type="number" id="audit-days" value="30" min="1" max="365" class="settings-input" style="width: 100px;" placeholder="Days">' +
            '<button id="load-audit-logs-btn" class="btn btn-primary">Load Logs</button>' +
          '</div>' +
          '<div class="pagination-controls-top" style="margin-bottom: 1rem;">' +
            '<div class="per-page-selector">' +
              '<label for="audit-per-page" style="font-size: 0.875rem; color: var(--secondary-color); margin: 0;">Items per page:</label>' +
              '<select id="audit-per-page" class="per-page-select">' +
                '<option value="10">10</option>' +
                '<option value="50" selected>50</option>' +
                '<option value="100">100</option>' +
              '</select>' +
            '</div>' +
            '<div class="pagination-info" id="audit-pagination-info"></div>' +
          '</div>' +
          '<div id="audit-logs-container" style="max-height: 500px; overflow-y: auto;"></div>' +
          '<div class="pagination-controls" id="audit-logs-pagination"></div>' +
        '</div>' +
      '</div>';
      
      content.innerHTML = html;
      
      // Initialize audit logs
      const loadAuditBtn = document.getElementById('load-audit-logs-btn');
      if (loadAuditBtn) {
        loadAuditBtn.addEventListener('click', () => {
          paginationState.auditLogs.page = 1;
          loadAuditLogs();
        });
      }
      
      // Handle per-page change
      const perPageSelect = document.getElementById('audit-per-page');
      if (perPageSelect) {
        perPageSelect.addEventListener('change', (e) => {
          const target = e.target;
          if (target && target instanceof HTMLSelectElement) {
            const newPerPage = parseInt(target.value);
            paginationState.auditLogs.perPage = newPerPage;
            paginationState.auditLogs.page = 1;
            loadAuditLogs();
          }
        });
        // Set initial value
        if (perPageSelect instanceof HTMLSelectElement) {
          perPageSelect.value = paginationState.auditLogs.perPage.toString();
        }
      }
      
      // Auto-reload when filters change
      const eventTypeSelect = document.getElementById('audit-event-type');
      const daysInput = document.getElementById('audit-days');
      if (eventTypeSelect) {
        eventTypeSelect.addEventListener('change', () => {
          paginationState.auditLogs.page = 1;
          loadAuditLogs();
        });
      }
      if (daysInput) {
        daysInput.addEventListener('change', () => {
          paginationState.auditLogs.page = 1;
          loadAuditLogs();
        });
      }
      
      // Load audit logs on page load
      loadAuditLogs();
    }
    
    // MFA Functions
    async function loadMFAStatus() {
      try {
        const mfaStatusDiv = document.getElementById('mfa-status');
        const mfaManageSection = document.getElementById('mfa-manage-section');
        if (!mfaStatusDiv) return;
        
        // Get user info which now includes mfa_enabled
        const user = await apiRequest('/auth/me');
        const mfaEnabled = user.data?.mfa_enabled || false;
        
        if (mfaEnabled) {
          // MFA is enabled, show manage section
          mfaStatusDiv.innerHTML = '<p style="color: #28a745;">✓ MFA is enabled for your account</p>';
          if (mfaManageSection) {
            mfaManageSection.style.display = 'block';
          }
        } else {
          // MFA is not enabled, show setup button
          mfaStatusDiv.innerHTML = '<button id="mfa-setup-btn" class="btn btn-primary">Setup MFA</button>';
          const setupBtn = document.getElementById('mfa-setup-btn');
          if (setupBtn) {
            setupBtn.addEventListener('click', startMFASetup);
          }
        }
      } catch (error) {
        console.error('Failed to load MFA status:', error);
        const mfaStatusDiv = document.getElementById('mfa-status');
        if (mfaStatusDiv) {
          mfaStatusDiv.innerHTML = '<button id="mfa-setup-btn" class="btn btn-primary">Setup MFA</button>';
          const setupBtn = document.getElementById('mfa-setup-btn');
          if (setupBtn) {
            setupBtn.addEventListener('click', startMFASetup);
          }
        }
      }
    }
    
    function initMFASection() {
      const setupBtn = document.getElementById('mfa-setup-btn');
      const cancelSetupBtn = document.getElementById('mfa-cancel-setup-btn');
      const enableBtn = document.getElementById('mfa-enable-btn');
      const disableBtn = document.getElementById('mfa-disable-btn');
      const regenerateBtn = document.getElementById('mfa-regenerate-backup-btn');
      
      // Setup MFA button (create if doesn't exist)
      const mfaStatusDiv = document.getElementById('mfa-status');
      if (mfaStatusDiv && !setupBtn) {
        mfaStatusDiv.innerHTML = '<button id="mfa-setup-btn" class="btn btn-primary">Setup MFA</button>';
        document.getElementById('mfa-setup-btn').addEventListener('click', startMFASetup);
      } else if (setupBtn) {
        setupBtn.addEventListener('click', startMFASetup);
      }
      
      if (cancelSetupBtn) {
        cancelSetupBtn.addEventListener('click', () => {
          document.getElementById('mfa-setup-section').style.display = 'none';
          document.getElementById('mfa-status').innerHTML = '<button id="mfa-setup-btn" class="btn btn-primary">Setup MFA</button>';
          document.getElementById('mfa-setup-btn').addEventListener('click', startMFASetup);
        });
      }
      
      if (enableBtn) {
        enableBtn.addEventListener('click', enableMFA);
      }
      
      if (disableBtn) {
        disableBtn.addEventListener('click', disableMFA);
      }
      
      if (regenerateBtn) {
        regenerateBtn.addEventListener('click', regenerateBackupCodes);
      }
    }
    
    async function startMFASetup() {
      try {
        const response = await apiRequest('/auth/mfa/setup', {
          method: 'POST',
          body: JSON.stringify({})
        });
        
        const data = response.data || {};
        const qrCodeUrl = data.qrCodeUrl;
        const backupCodes = data.backupCodes || [];
        
        // Show QR code
        const qrDiv = document.getElementById('mfa-qr-code');
        if (qrDiv && qrCodeUrl) {
          qrDiv.innerHTML = '<p>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):</p>' +
            '<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(qrCodeUrl) + '" alt="MFA QR Code" style="margin-top: 1rem; border: 1px solid #ddd; padding: 0.5rem; background: white;">' +
            '<p style="margin-top: 1rem; font-size: 0.875rem; color: #666;">Or enter this code manually: <code style="background: #f8f9fa; padding: 0.25rem 0.5rem; border-radius: 4px;">' + (data.secret || '') + '</code></p>';
        }
        
        // Show backup codes
        const backupDiv = document.getElementById('mfa-backup-codes');
        if (backupDiv && backupCodes.length > 0) {
          backupDiv.innerHTML = '<strong style="color: #dc3545;">⚠️ IMPORTANT: Save these backup codes securely!</strong><br>' +
            '<p style="font-size: 0.875rem; color: #666; margin-top: 0.5rem;">You can use these codes to access your account if you lose your authenticator device:</p>' +
            '<div style="margin-top: 0.5rem; font-family: monospace; background: #f8f9fa; padding: 1rem; border-radius: 4px;">' +
            backupCodes.map(code => '<code style="display: block; padding: 0.25rem; font-size: 1.1rem;">' + code + '</code>').join('') +
            '</div>';
          backupDiv.style.display = 'block';
        }
        
        document.getElementById('mfa-setup-section').style.display = 'block';
        document.getElementById('mfa-status').innerHTML = '<p style="color: #007bff;">MFA setup in progress. Scan the QR code and enter the 6-digit code to enable.</p>';
      } catch (error) {
        // Check if error is because MFA is already enabled
        if (error.message && error.message.includes('already enabled') || error.message.includes('already set')) {
          // MFA is already enabled, show manage section
          document.getElementById('mfa-manage-section').style.display = 'block';
          document.getElementById('mfa-status').innerHTML = '<p style="color: #28a745;">✓ MFA is enabled</p>';
        } else {
          showToast('Failed to start MFA setup: ' + error.message, 'error');
        }
      }
    }
    
    async function enableMFA() {
      const code = document.getElementById('mfa-verify-code').value;
      const errorDiv = document.getElementById('mfa-setup-error');
      
      if (!code || code.length !== 6) {
        errorDiv.textContent = 'Please enter a valid 6-digit MFA code';
        errorDiv.style.display = 'block';
        return;
      }
      
      try {
        await apiRequest('/auth/mfa/verify-setup', {
          method: 'POST',
          body: JSON.stringify({ code })
        });
        
        showToast('MFA enabled successfully!', 'success');
        document.getElementById('mfa-setup-section').style.display = 'none';
        document.getElementById('mfa-manage-section').style.display = 'block';
        document.getElementById('mfa-status').innerHTML = '<p style="color: #28a745;">✓ MFA is enabled</p>';
      } catch (error) {
        errorDiv.textContent = error.message || 'Failed to enable MFA';
        errorDiv.style.display = 'block';
      }
    }
    
    async function disableMFA() {
      if (!confirm('Are you sure you want to disable MFA? This will make your account less secure.')) {
        return;
      }
      
      try {
        await apiRequest('/auth/mfa/disable', {
          method: 'POST',
          body: JSON.stringify({})
        });
        
        showToast('MFA disabled successfully', 'success');
        document.getElementById('mfa-manage-section').style.display = 'none';
        document.getElementById('mfa-status').innerHTML = '<button id="mfa-setup-btn" class="btn btn-primary">Setup MFA</button>';
        document.getElementById('mfa-setup-btn').addEventListener('click', startMFASetup);
      } catch (error) {
        showToast('Failed to disable MFA: ' + error.message, 'error');
      }
    }
    
    async function regenerateBackupCodes() {
      const code = prompt('Enter your current MFA code to regenerate backup codes:');
      if (!code) return;
      
      try {
        const response = await apiRequest('/auth/mfa/regenerate-backup-codes', {
          method: 'POST',
          body: JSON.stringify({ mfa_code: code })
        });
        
        const backupCodes = response.data?.backupCodes || [];
        if (backupCodes.length > 0) {
          const codesText = backupCodes.join(String.fromCharCode(10));
          const message = 'New backup codes (save these securely):' + String.fromCharCode(10) + String.fromCharCode(10) + codesText;
          alert(message);
          showToast('Backup codes regenerated successfully', 'success');
        }
      } catch (error) {
        showToast('Failed to regenerate backup codes: ' + error.message, 'error');
      }
    }
    
    // Audit Logs Function
    async function loadAuditLogs(page) {
      try {
        if (page !== undefined) {
          paginationState.auditLogs.page = page;
        }
        
        const eventType = document.getElementById('audit-event-type')?.value || '';
        const days = document.getElementById('audit-days')?.value || '30';
        const container = document.getElementById('audit-logs-container');
        const paginationContainer = document.getElementById('audit-logs-pagination');
        const paginationInfo = document.getElementById('audit-pagination-info');
        if (!container) return;
        
        container.innerHTML = '<p>Loading audit logs...</p>';
        
        const state = paginationState.auditLogs;
        const limit = state.perPage;
        const offset = (state.page - 1) * limit;
        
        let url = '/auth/audit?limit=' + limit + '&offset=' + offset + '&days=' + days;
        if (eventType) {
          url += '&event_type=' + eventType;
        }
        
        const response = await apiRequest(url);
        const logs = response.data || [];
        const pagination = response.pagination || {};
        const total = pagination.total || 0;
        
        // Update pagination info
        if (paginationInfo) {
          const start = total === 0 ? 0 : offset + 1;
          const end = Math.min(offset + limit, total);
          const logText = total !== 1 ? 'logs' : 'log';
          paginationInfo.textContent = 'Showing ' + start + '-' + end + ' of ' + total + ' ' + logText;
        }
        
        if (logs.length === 0) {
          container.innerHTML = '<p>No audit logs found.</p>';
          if (paginationContainer) {
            paginationContainer.innerHTML = '';
          }
          return;
        }
        
        container.innerHTML = '<table style="width: 100%; border-collapse: collapse;">' +
          '<thead><tr style="background: #f8f9fa; border-bottom: 2px solid #ddd;">' +
          '<th style="padding: 0.75rem; text-align: left;">Date</th>' +
          '<th style="padding: 0.75rem; text-align: left;">Event</th>' +
          '<th style="padding: 0.75rem; text-align: left;">IP Address</th>' +
          '<th style="padding: 0.75rem; text-align: left;">User Agent</th>' +
          '</tr></thead><tbody>' +
          logs.map(log => {
            const date = new Date(log.created_at);
            return '<tr style="border-bottom: 1px solid #ddd;">' +
              '<td style="padding: 0.75rem;">' + date.toLocaleString() + '</td>' +
              '<td style="padding: 0.75rem;"><span class="status-badge status-' + log.event_type + '">' + log.event_type + '</span></td>' +
              '<td style="padding: 0.75rem;">' + (log.ip_address || 'N/A') + '</td>' +
              '<td style="padding: 0.75rem;" title="' + (log.user_agent || '') + '">' + 
                (log.user_agent ? (log.user_agent.length > 50 ? log.user_agent.substring(0, 50) + '...' : log.user_agent) : 'N/A') + 
              '</td>' +
              '</tr>';
          }).join('') +
          '</tbody></table>';
        
        // Render pagination
        if (paginationContainer && total > 0) {
          renderPagination('audit-logs-pagination', state, total, (newPage) => {
            loadAuditLogs(newPage);
          });
        } else if (paginationContainer) {
          paginationContainer.innerHTML = '';
        }
      } catch (error) {
        const container = document.getElementById('audit-logs-container');
        if (container) {
          container.innerHTML = '<p style="color: #dc3545;">Failed to load audit logs: ' + error.message + '</p>';
        }
        const paginationContainer = document.getElementById('audit-logs-pagination');
        if (paginationContainer) {
          paginationContainer.innerHTML = '';
        }
      }
    }
    
    // API Keys Management Functions
    async function loadApiKeys() {
      try {
        const response = await apiRequest('/api-keys');
        const apiKeys = response.data || [];
        const tbody = document.getElementById('api-keys-tbody');
        
        if (apiKeys.length === 0) {
          tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No API keys found. Create your first API key to get started.</td></tr>';
          return;
        }
        
        tbody.innerHTML = apiKeys.map(key => {
          const domains = key.domains?.map(d => d.domain_name).join(', ') || 'All Domains';
          const ipWhitelist = key.allow_all_ips ? 'All IPs' : (key.ip_whitelist?.join(', ') || 'None');
          const expires = key.expires_at ? new Date(key.expires_at).toLocaleString() : 'Never';
          const lastUsed = key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Never';
          const statusClass = key.status === 'active' ? 'status-active' : key.status === 'expired' ? 'status-expired' : 'status-archived';
          
          return '<tr>' +
            '<td>' + escapeHtml(key.name || '') + '</td>' +
            '<td><code>' + escapeHtml(key.key_prefix || '') + '****</code></td>' +
            '<td>' + escapeHtml(domains) + '</td>' +
            '<td>' + escapeHtml(ipWhitelist) + '</td>' +
            '<td>' + escapeHtml(expires) + '</td>' +
            '<td>' + escapeHtml(lastUsed) + '</td>' +
            '<td><span class="status-badge ' + statusClass + '">' + escapeHtml(key.status || '') + '</span></td>' +
            '<td>' +
              '<button class="btn btn-sm btn-secondary" data-action="revoke" data-key-id="' + escapeHtml(key.id) + '">Revoke</button>' +
              '<button class="btn btn-sm btn-secondary" data-action="delete" data-key-id="' + escapeHtml(key.id) + '" style="margin-left: 0.5rem;">Delete</button>' +
            '</td>' +
          '</tr>';
        }).join('');
        
        // Attach event listeners to buttons
        tbody.querySelectorAll('[data-action="revoke"]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const keyId = btn.getAttribute('data-key-id');
            if (keyId) {
              await revokeApiKey(keyId);
            }
          });
        });
        
        tbody.querySelectorAll('[data-action="delete"]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const keyId = btn.getAttribute('data-key-id');
            if (keyId) {
              await deleteApiKey(keyId);
            }
          });
        });
      } catch (error) {
        console.error('Failed to load API keys:', error);
        document.getElementById('api-keys-tbody').innerHTML = '<tr><td colspan="8">Error loading API keys.</td></tr>';
      }
    }
    
    function initApiKeyModal() {
      const modal = document.getElementById('api-key-modal');
      const createBtn = document.getElementById('create-api-key-btn');
      const closeBtn = modal.querySelector('.close');
      const form = document.getElementById('api-key-form');
      const title = document.getElementById('api-key-modal-title');
      
      // Load domains for select
      async function loadDomainsForApiKey() {
        try {
          const domains = await apiRequest('/domains');
          const select = document.getElementById('api-key-domains');
          select.innerHTML = '<option value="">All Domains</option>';
          domains.data?.forEach(domain => {
            const option = document.createElement('option');
            option.value = domain.id;
            option.textContent = domain.domain_name;
            select.appendChild(option);
          });
        } catch (error) {
          console.error('Failed to load domains:', error);
        }
      }
      
      // Toggle IP whitelist visibility
      document.getElementById('api-key-allow-all-ips')?.addEventListener('change', (e) => {
        const ipGroup = document.getElementById('api-key-ip-whitelist-group');
        ipGroup.style.display = e.target.checked ? 'none' : 'block';
      });
      
      // Toggle expiration visibility
      document.getElementById('api-key-never-expire')?.addEventListener('change', (e) => {
        const expiresGroup = document.getElementById('api-key-expires-group');
        expiresGroup.style.display = e.target.checked ? 'none' : 'block';
      });
      
      // Copy API key button
      document.getElementById('copy-api-key-btn')?.addEventListener('click', () => {
        const keyValue = document.getElementById('api-key-value').textContent;
        navigator.clipboard.writeText(keyValue).then(() => {
          showToast('API key copied to clipboard!', 'success');
        });
      });
      
      const resetModal = () => {
        form.reset();
        document.getElementById('api-key-display').style.display = 'none';
        document.getElementById('api-key-allow-all-ips').checked = true;
        document.getElementById('api-key-never-expire').checked = true;
        document.getElementById('api-key-ip-whitelist-group').style.display = 'none';
        document.getElementById('api-key-expires-group').style.display = 'none';
        title.textContent = 'Create API Key';
        const submitBtn = document.getElementById('submit-api-key-btn');
        submitBtn.textContent = 'Create API Key';
        submitBtn.disabled = false;
        submitBtn.onclick = null; // Clear any custom onclick handlers
      };
      
      createBtn?.addEventListener('click', async () => {
        resetModal();
        await loadDomainsForApiKey();
        modal.classList.add('active');
      });
      
      closeBtn?.addEventListener('click', () => {
        modal.classList.remove('active');
        resetModal();
      });
      
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
          resetModal();
        }
      });
      
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent any form submission bubbling
        
        const submitBtn = document.getElementById('submit-api-key-btn');
        const originalText = submitBtn.textContent;
        
        // Disable button and show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';
        
        // Ensure modal stays open during processing
        // Don't allow modal to close while processing
        
        try {
          // Frontend validation
          const nameInput = document.getElementById('api-key-name');
          const name = nameInput.value.trim();
          
          // Validate name
          if (!name || name.length === 0) {
            showToast('API key name is required', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            nameInput.focus();
            return;
          }
          
          if (name.length > 255) {
            showToast('API key name must be 255 characters or less', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            nameInput.focus();
            return;
          }
          
          const domainSelect = document.getElementById('api-key-domains');
          const selectedDomains = Array.from(domainSelect.selectedOptions)
            .map(opt => opt.value)
            .filter(v => v !== ''); // Remove "All Domains" option
          
          const allowAllIps = document.getElementById('api-key-allow-all-ips').checked;
          const ipWhitelistText = document.getElementById('api-key-ip-whitelist').value;
          const newlineChar = String.fromCharCode(10);
          const ipWhitelistRaw = allowAllIps ? [] : ipWhitelistText.split(newlineChar).map(ip => ip.trim()).filter(ip => ip);
          
          // Validate that if "Allow All IPs" is unchecked, at least one IP must be provided
          if (!allowAllIps && ipWhitelistRaw.length === 0) {
            showToast('Please provide at least one IP address in the whitelist, or check "Allow All IP Addresses"', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            document.getElementById('api-key-ip-whitelist').focus();
            return;
          }
          
          // Validate IP addresses if provided
          if (!allowAllIps && ipWhitelistRaw.length > 0) {
            const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
            const invalidIps = ipWhitelistRaw.filter(ip => !ipRegex.test(ip));
            if (invalidIps.length > 0) {
              showToast('Invalid IP address format: ' + invalidIps.join(', '), 'error');
              submitBtn.disabled = false;
              submitBtn.textContent = originalText;
              document.getElementById('api-key-ip-whitelist').focus();
              return;
            }
          }
          
          const neverExpire = document.getElementById('api-key-never-expire').checked;
          let expiresAt = null;
          
          // Validate expiration date if not "never expire"
          if (!neverExpire) {
            const expiresInput = document.getElementById('api-key-expires');
            const expiresValue = expiresInput.value;
            
            if (!expiresValue || expiresValue.trim() === '') {
              showToast('Please select an expiration date or check "Never Expire"', 'error');
              submitBtn.disabled = false;
              submitBtn.textContent = originalText;
              expiresInput.focus();
              return;
            }
            
            const expiresDate = new Date(expiresValue);
            const expiresTimestamp = expiresDate.getTime();
            
            // Check if date is valid
            if (isNaN(expiresTimestamp)) {
              showToast('Invalid expiration date format', 'error');
              submitBtn.disabled = false;
              submitBtn.textContent = originalText;
              expiresInput.focus();
              return;
            }
            
            // Check if date is in the future
            if (expiresTimestamp <= Date.now()) {
              showToast('Expiration date must be in the future', 'error');
              submitBtn.disabled = false;
              submitBtn.textContent = originalText;
              expiresInput.focus();
              return;
            }
            
            expiresAt = expiresTimestamp;
          }
          
          // Make API request
          const response = await apiRequest('/api-keys', {
            method: 'POST',
            body: JSON.stringify({
              name,
              domain_ids: selectedDomains.length > 0 ? selectedDomains : undefined,
              ip_whitelist: ipWhitelistRaw.length > 0 ? ipWhitelistRaw : undefined,
              allow_all_ips: allowAllIps,
              expires_at: expiresAt,
            }),
          });
          
          // Handle undefined response (token refresh failed, 401, etc.)
          if (!response) {
            showToast('Authentication failed. Please refresh the page and try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            // Modal stays open - don't close it
            return;
          }
          
          // Handle API error response
          if (!response.success) {
            const errorMessage = response.error?.message || response.error?.code || 'Failed to create API key';
            showToast(errorMessage, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            // Modal stays open - don't close it
            return;
          }
          
          // Handle missing data
          if (!response.data) {
            showToast('API key created but response data is missing. Please refresh the page.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            loadApiKeys(); // Refresh list anyway
            // Modal stays open - don't close it
            return;
          }
          
          // Handle missing api_key in response
          if (!response.data.api_key) {
            showToast('API key created but key value is missing. Please check the API keys list.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            loadApiKeys(); // Refresh list
            // Modal stays open - don't close it
            return;
          }
          
          // Success - show the API key
          document.getElementById('api-key-value').textContent = response.data.api_key;
          document.getElementById('api-key-display').style.display = 'block';
          submitBtn.textContent = 'Close';
          submitBtn.disabled = false;
          
          // Replace submit handler with close handler
          const originalOnClick = submitBtn.onclick;
          submitBtn.onclick = () => {
            modal.classList.remove('active');
            resetModal();
            loadApiKeys();
            submitBtn.onclick = originalOnClick; // Restore original handler
          };
          
          showToast('API key created successfully! Copy it now - it will not be shown again.', 'success');
          
        } catch (error) {
          // Comprehensive error handling - ensure we always show a message
          let errorMessage = 'Failed to create API key';
          
          if (error instanceof Error) {
            errorMessage = error.message || errorMessage;
          } else if (typeof error === 'string') {
            errorMessage = error;
          } else if (error && typeof error === 'object') {
            if ('message' in error) {
              errorMessage = String(error.message);
            } else if ('error' in error && typeof error.error === 'object' && error.error !== null && 'message' in error.error) {
              errorMessage = String(error.error.message);
            }
          }
          
          // Always show error message - never fail silently
          console.error('API key creation error:', error);
          showToast(errorMessage, 'error');
          
          // Reset button state
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
          
          // Ensure modal stays open so user can see the error and try again
          // Modal should NOT close on error
        }
      });
    }
    
    // API key action functions
    async function revokeApiKey(id) {
      if (!confirm('Are you sure you want to revoke this API key? It will no longer work.')) return;
      try {
        await apiRequest('/api-keys/' + id, { method: 'DELETE' });
        showToast('API key revoked', 'success');
        loadApiKeys();
      } catch (error) {
        showToast(error.message || 'Failed to revoke API key', 'error');
      }
    }
    
    async function deleteApiKey(id) {
      if (!confirm('Are you sure you want to permanently delete this API key? This action cannot be undone.')) return;
      try {
        await apiRequest('/api-keys/' + id + '?hard=true', { method: 'DELETE' });
        showToast('API key deleted', 'success');
        loadApiKeys();
      } catch (error) {
        showToast(error.message || 'Failed to delete API key', 'error');
      }
    }
    
    // Manual Integration - API Endpoint Configuration
    const apiEndpoints = [
      {
        id: 'list-links',
        name: 'List Links',
        method: 'GET',
        path: '/links',
        description: 'Retrieve a list of links with optional filtering and pagination.',
        pathParams: [],
        queryParams: [
          { name: 'domain_id', type: 'string', required: false, description: 'Filter by domain ID' },
          { name: 'status', type: 'string', required: false, description: 'Filter by status (active, expired, archived, deleted)' },
          { name: 'search', type: 'string', required: false, description: 'Search in slug, destination URL, or title' },
          { name: 'tag_id', type: 'string', required: false, description: 'Filter by tag ID' },
          { name: 'category_id', type: 'string', required: false, description: 'Filter by category ID' },
          { name: 'limit', type: 'number', required: false, description: 'Results per page (1-10000, default: 25)' },
          { name: 'offset', type: 'number', required: false, description: 'Pagination offset (default: 0)' },
          { name: 'include_redirects', type: 'boolean', required: false, description: 'Include geo and device redirects in response (default: false)' }
        ],
        bodyParams: null,
        fileUpload: false,
        exampleRequest: {
          query: '?domain_id=xxx&status=active&limit=25&offset=0'
        },
        exampleResponse: {
          success: true,
          data: [
            {
              id: 'link_xxx',
              domain_id: 'domain_xxx',
              slug: 'example',
              destination_url: 'https://example.com',
              title: 'Example Link',
              description: 'An example link',
              click_count: 42,
              status: 'active',
              created_at: 1234567890,
              tags: [],
              geo_redirects: [],
              device_redirects: []
            }
          ],
          pagination: {
            total: 100,
            limit: 25,
            offset: 0,
            hasMore: true
          }
        }
      },
      {
        id: 'get-link',
        name: 'Get Link by ID',
        method: 'GET',
        path: '/links/:id',
        description: 'Retrieve a single link by its ID.',
        pathParams: [
          { name: 'id', type: 'string', required: true, description: 'Link ID' }
        ],
        queryParams: [],
        bodyParams: null,
        fileUpload: false,
        exampleRequest: {
          path: '/links/link_xxx'
        },
        exampleResponse: {
          success: true,
          data: {
            id: 'link_xxx',
            domain_id: 'domain_xxx',
            slug: 'example',
            destination_url: 'https://example.com',
            title: 'Example Link',
            description: 'An example link',
            click_count: 42,
            status: 'active',
            created_at: 1234567890,
            tags: [],
            geo_redirects: [],
            device_redirects: []
          }
        }
      },
      {
        id: 'create-link',
        name: 'Create Link',
        method: 'POST',
        path: '/links',
        description: 'Create a new shortened link.',
        pathParams: [],
        queryParams: [],
        bodyParams: {
          domain_id: { type: 'string', required: true, description: 'Domain ID' },
          slug: { type: 'string', required: false, description: 'Custom slug (auto-generated if not provided)' },
          route: { type: 'string', required: false, description: 'Routing path (e.g., /go/*, /r/*)' },
          destination_url: { type: 'string', required: true, description: 'Destination URL' },
          title: { type: 'string', required: false, description: 'Link title (max 255 chars)' },
          description: { type: 'string', required: false, description: 'Link description (max 5000 chars)' },
          redirect_code: { type: 'number', required: false, description: 'HTTP redirect code (301-308, default: 301)' },
          tags: { type: 'array', required: false, description: 'Array of tag IDs (max 10)' },
          category_id: { type: 'string', required: false, description: 'Category ID' },
          expires_at: { type: 'number', required: false, description: 'Expiration timestamp (Unix)' },
          metadata: { type: 'object', required: false, description: 'Custom metadata object' },
          geo_redirects: { type: 'array', required: false, description: 'Array of geo redirects: [{country_code: string (2 chars), destination_url: string}] (max 10)' },
          device_redirects: { type: 'array', required: false, description: 'Array of device redirects: [{device_type: "desktop"|"mobile"|"tablet", destination_url: string}]' }
        },
        fileUpload: false,
        exampleRequest: {
          body: {
            domain_id: 'domain_xxx',
            destination_url: 'https://example.com',
            title: 'Example Link',
            slug: 'example',
            route: '/go/*',
            redirect_code: 301,
            geo_redirects: [
              { country_code: 'US', destination_url: 'https://example.com/us' }
            ],
            device_redirects: [
              { device_type: 'mobile', destination_url: 'https://example.com/mobile' }
            ]
          }
        },
        exampleResponse: {
          success: true,
          data: {
            id: 'link_xxx',
            domain_id: 'domain_xxx',
            slug: 'example',
            destination_url: 'https://example.com',
            title: 'Example Link',
            click_count: 0,
            status: 'active',
            created_at: 1234567890,
            tags: [],
            geo_redirects: [
              { country_code: 'US', destination_url: 'https://example.com/us' }
            ],
            device_redirects: [
              { device_type: 'mobile', destination_url: 'https://example.com/mobile' }
            ]
          }
        },
        responseCode: 201
      },
      {
        id: 'update-link',
        name: 'Update Link',
        method: 'PUT',
        path: '/links/:id',
        description: 'Update an existing link.',
        pathParams: [
          { name: 'id', type: 'string', required: true, description: 'Link ID' }
        ],
        queryParams: [],
        bodyParams: {
          destination_url: { type: 'string', required: false, description: 'Destination URL' },
          route: { type: 'string', required: false, description: 'Routing path (e.g., /go/*, /r/*)' },
          title: { type: 'string', required: false, description: 'Link title' },
          description: { type: 'string', required: false, description: 'Link description' },
          redirect_code: { type: 'number', required: false, description: 'HTTP redirect code' },
          tags: { type: 'array', required: false, description: 'Array of tag IDs' },
          category_id: { type: 'string', required: false, description: 'Category ID' },
          status: { type: 'string', required: false, description: 'Status (active, expired, archived, deleted)' },
          expires_at: { type: 'number', required: false, description: 'Expiration timestamp' },
          metadata: { type: 'object', required: false, description: 'Custom metadata' },
          geo_redirects: { type: 'array', required: false, description: 'Array of geo redirects: [{country_code: string, destination_url: string}] (empty array to clear)' },
          device_redirects: { type: 'array', required: false, description: 'Array of device redirects: [{device_type: "desktop"|"mobile"|"tablet", destination_url: string}] (empty array to clear)' }
        },
        fileUpload: false,
        exampleRequest: {
          path: '/links/link_xxx',
          body: {
            title: 'Updated Title',
            destination_url: 'https://newurl.com'
          }
        },
        exampleResponse: {
          success: true,
          data: {
            id: 'link_xxx',
            title: 'Updated Title',
            destination_url: 'https://newurl.com',
            geo_redirects: [],
            device_redirects: []
          }
        }
      },
      {
        id: 'delete-link',
        name: 'Delete Link',
        method: 'DELETE',
        path: '/links/:id',
        description: 'Delete a link (soft delete by default, or permanent delete with hard=true).',
        pathParams: [
          { name: 'id', type: 'string', required: true, description: 'Link ID' }
        ],
        queryParams: [
          { name: 'hard', type: 'string', required: false, description: 'Hard delete (true/false, default: false for soft delete)' }
        ],
        bodyParams: null,
        fileUpload: false,
        exampleRequest: {
          path: '/links/link_xxx'
        },
        exampleResponse: {
          success: true,
          message: 'Link deleted'
        }
      },
      {
        id: 'bulk-operations',
        name: 'Bulk Operations',
        method: 'POST',
        path: '/links/bulk',
        description: 'Perform bulk operations (update or delete) on multiple links.',
        pathParams: [],
        queryParams: [],
        bodyParams: {
          action: { type: 'string', required: true, description: 'Action to perform: "update" or "delete"' },
          link_ids: { type: 'array', required: true, description: 'Array of link IDs to operate on' },
          updates: { type: 'object', required: false, description: 'Update fields (only for "update" action). Can include: destination_url, title, description, status, tags, category_id, geo_redirects, device_redirects, etc.' }
        },
        fileUpload: false,
        exampleRequest: {
          body: {
            action: 'update',
            link_ids: ['link_xxx1', 'link_xxx2'],
            updates: {
              status: 'archived',
              tags: ['tag_xxx']
            }
          }
        },
        exampleResponse: {
          success: true,
          data: [
            { id: 'link_xxx1', success: true },
            { id: 'link_xxx2', success: true }
          ]
        }
      },
      {
        id: 'import-links',
        name: 'Import Links (CSV/TSV)',
        method: 'POST',
        path: '/links/import',
        description: 'Import links from a CSV or TSV file.',
        pathParams: [],
        queryParams: [],
        bodyParams: {
          file: { type: 'file', required: true, description: 'CSV/TSV file (max 5MB)' },
          domain_id: { type: 'string', required: true, description: 'Domain ID' },
          delimiter: { type: 'string', required: false, description: 'Field delimiter (auto-detect if not provided, default: ",")' },
          column_mapping: { type: 'object', required: true, description: 'Column mapping JSON object (maps CSV columns to link fields)' },
          slug_prefix_filter: { type: 'object', required: false, description: 'Slug prefix filter JSON object' }
        },
        fileUpload: true,
        exampleRequest: {
          body: 'multipart/form-data with file'
        },
        exampleResponse: {
          success: true,
          data: {
            success: 10,
            errors: 0,
            results: [
              { row: 1, success: true, slug: 'example1' },
              { row: 2, success: true, slug: 'example2' }
            ]
          }
        }
      },
      // Domains endpoints
      {
        id: 'list-domains',
        name: 'List Domains',
        method: 'GET',
        path: '/domains',
        description: 'Retrieve a list of domains.',
        pathParams: [],
        queryParams: [
          { name: 'account_id', type: 'string', required: false, description: 'Filter by Cloudflare account ID' }
        ],
        bodyParams: null,
        fileUpload: false,
        exampleRequest: {
          query: '?account_id=xxx'
        },
        exampleResponse: {
          success: true,
          data: [
            {
              id: 'domain_xxx',
              domain_name: 'example.com',
              routing_path: '/go/*',
              routes: ['/go/*'],
              default_redirect_code: 301,
              dashboard_access: false,
              status: 'active',
              created_at: 1234567890
            }
          ]
        }
      },
      {
        id: 'get-domain',
        name: 'Get Domain by ID',
        method: 'GET',
        path: '/domains/:id',
        description: 'Retrieve a single domain by its ID.',
        pathParams: [
          { name: 'id', type: 'string', required: true, description: 'Domain ID' }
        ],
        queryParams: [],
        bodyParams: null,
        fileUpload: false,
        exampleRequest: {
          path: '/domains/domain_xxx'
        },
        exampleResponse: {
          success: true,
          data: {
            id: 'domain_xxx',
            domain_name: 'example.com',
            routing_path: '/go/*',
            routes: ['/go/*'],
            default_redirect_code: 301,
            status: 'active',
            created_at: 1234567890
          }
        }
      },
      {
        id: 'create-domain',
        name: 'Create Domain',
        method: 'POST',
        path: '/domains',
        description: 'Create a new domain.',
        pathParams: [],
        queryParams: [],
        bodyParams: {
          cloudflare_account_id: { type: 'string', required: true, description: 'Cloudflare account ID' },
          domain_name: { type: 'string', required: true, description: 'Domain name (e.g., example.com)' },
          routes: { type: 'array', required: true, description: 'Array of routing paths (e.g., ["/go/*", "/r/*"]). At least one route is required.' },
          routing_path: { type: 'string', required: false, description: 'Legacy routing path (deprecated, use routes instead)' },
          default_redirect_code: { type: 'number', required: false, description: 'Default HTTP redirect code (301-308, default: 301)' },
          status: { type: 'string', required: false, description: 'Domain status (active, inactive, pending, default: active)' }
        },
        fileUpload: false,
        exampleRequest: {
          body: {
            cloudflare_account_id: 'account_xxx',
            domain_name: 'example.com',
            routes: ['/go/*'],
            default_redirect_code: 301
          }
        },
        exampleResponse: {
          success: true,
          data: {
            id: 'domain_xxx',
            domain_name: 'example.com',
            routing_path: '/go/*',
            routes: ['/go/*'],
            default_redirect_code: 301,
            status: 'active',
            created_at: 1234567890
          }
        },
        responseCode: 201
      },
      {
        id: 'update-domain',
        name: 'Update Domain',
        method: 'PUT',
        path: '/domains/:id',
        description: 'Update an existing domain.',
        pathParams: [
          { name: 'id', type: 'string', required: true, description: 'Domain ID' }
        ],
        queryParams: [],
        bodyParams: {
          domain_name: { type: 'string', required: false, description: 'Domain name' },
          routes: { type: 'array', required: false, description: 'Array of routing paths' },
          routing_path: { type: 'string', required: false, description: 'Legacy routing path (deprecated)' },
          default_redirect_code: { type: 'number', required: false, description: 'Default HTTP redirect code' },
          status: { type: 'string', required: false, description: 'Domain status' }
        },
        fileUpload: false,
        exampleRequest: {
          path: '/domains/domain_xxx',
          body: {
            routes: ['/go/*', '/r/*']
          }
        },
        exampleResponse: {
          success: true,
          data: {
            id: 'domain_xxx',
            routes: ['/go/*', '/r/*']
          }
        }
      },
      {
        id: 'delete-domain',
        name: 'Delete Domain',
        method: 'DELETE',
        path: '/domains/:id',
        description: 'Delete (deactivate) a domain.',
        pathParams: [
          { name: 'id', type: 'string', required: true, description: 'Domain ID' }
        ],
        queryParams: [
          { name: 'hard', type: 'string', required: false, description: 'Hard delete (true/false, default: false for soft delete)' }
        ],
        bodyParams: null,
        fileUpload: false,
        exampleRequest: {
          path: '/domains/domain_xxx'
        },
        exampleResponse: {
          success: true,
          message: 'Domain deactivated',
          data: { status: 'inactive' }
        }
      },
      // Tags endpoints
      {
        id: 'list-tags',
        name: 'List Tags',
        method: 'GET',
        path: '/tags',
        description: 'Retrieve a list of tags with optional filtering and pagination.',
        pathParams: [],
        queryParams: [
          { name: 'domain_id', type: 'string', required: false, description: 'Filter by domain ID' },
          { name: 'limit', type: 'number', required: false, description: 'Results per page (1-500, default: 25)' },
          { name: 'offset', type: 'number', required: false, description: 'Pagination offset (default: 0)' }
        ],
        bodyParams: null,
        fileUpload: false,
        exampleRequest: {
          query: '?domain_id=xxx&limit=25&offset=0'
        },
        exampleResponse: {
          success: true,
          data: [
            {
              id: 'tag_xxx',
              name: 'marketing',
              color: '#007bff',
              domain_id: 'domain_xxx',
              created_at: 1234567890
            }
          ],
          pagination: {
            total: 10,
            limit: 25,
            offset: 0,
            hasMore: false
          }
        }
      },
      {
        id: 'get-tag',
        name: 'Get Tag by ID',
        method: 'GET',
        path: '/tags/:id',
        description: 'Retrieve a single tag by its ID.',
        pathParams: [
          { name: 'id', type: 'string', required: true, description: 'Tag ID' }
        ],
        queryParams: [],
        bodyParams: null,
        fileUpload: false,
        exampleRequest: {
          path: '/tags/tag_xxx'
        },
        exampleResponse: {
          success: true,
          data: {
            id: 'tag_xxx',
            name: 'marketing',
            color: '#007bff',
            domain_id: 'domain_xxx',
            created_at: 1234567890
          }
        }
      },
      {
        id: 'create-tag',
        name: 'Create Tag',
        method: 'POST',
        path: '/tags',
        description: 'Create a new tag.',
        pathParams: [],
        queryParams: [],
        bodyParams: {
          name: { type: 'string', required: true, description: 'Tag name (max 50 chars)' },
          domain_id: { type: 'string', required: false, description: 'Domain ID (optional)' },
          color: { type: 'string', required: false, description: 'Hex color code (e.g., #007bff)' }
        },
        fileUpload: false,
        exampleRequest: {
          body: {
            name: 'marketing',
            color: '#007bff',
            domain_id: 'domain_xxx'
          }
        },
        exampleResponse: {
          success: true,
          data: {
            id: 'tag_xxx',
            name: 'marketing',
            color: '#007bff',
            domain_id: 'domain_xxx',
            created_at: 1234567890
          }
        },
        responseCode: 201
      },
      {
        id: 'update-tag',
        name: 'Update Tag',
        method: 'PUT',
        path: '/tags/:id',
        description: 'Update an existing tag.',
        pathParams: [
          { name: 'id', type: 'string', required: true, description: 'Tag ID' }
        ],
        queryParams: [],
        bodyParams: {
          name: { type: 'string', required: false, description: 'Tag name' },
          color: { type: 'string', required: false, description: 'Hex color code' }
        },
        fileUpload: false,
        exampleRequest: {
          path: '/tags/tag_xxx',
          body: {
            color: '#28a745'
          }
        },
        exampleResponse: {
          success: true,
          data: {
            id: 'tag_xxx',
            color: '#28a745'
          }
        }
      },
      {
        id: 'delete-tag',
        name: 'Delete Tag',
        method: 'DELETE',
        path: '/tags/:id',
        description: 'Delete a tag.',
        pathParams: [
          { name: 'id', type: 'string', required: true, description: 'Tag ID' }
        ],
        queryParams: [],
        bodyParams: null,
        fileUpload: false,
        exampleRequest: {
          path: '/tags/tag_xxx'
        },
        exampleResponse: {
          success: true,
          message: 'Tag deleted successfully'
        }
      },
      // Categories endpoints
      {
        id: 'list-categories',
        name: 'List Categories',
        method: 'GET',
        path: '/categories',
        description: 'Retrieve a list of categories with optional filtering and pagination.',
        pathParams: [],
        queryParams: [
          { name: 'domain_id', type: 'string', required: false, description: 'Filter by domain ID' },
          { name: 'limit', type: 'number', required: false, description: 'Results per page (1-500, default: 25)' },
          { name: 'offset', type: 'number', required: false, description: 'Pagination offset (default: 0)' }
        ],
        bodyParams: null,
        fileUpload: false,
        exampleRequest: {
          query: '?domain_id=xxx&limit=25&offset=0'
        },
        exampleResponse: {
          success: true,
          data: [
            {
              id: 'category_xxx',
              name: 'Blog',
              icon: '📝',
              domain_id: 'domain_xxx',
              created_at: 1234567890
            }
          ],
          pagination: {
            total: 5,
            limit: 25,
            offset: 0,
            hasMore: false
          }
        }
      },
      {
        id: 'get-category',
        name: 'Get Category by ID',
        method: 'GET',
        path: '/categories/:id',
        description: 'Retrieve a single category by its ID.',
        pathParams: [
          { name: 'id', type: 'string', required: true, description: 'Category ID' }
        ],
        queryParams: [],
        bodyParams: null,
        fileUpload: false,
        exampleRequest: {
          path: '/categories/category_xxx'
        },
        exampleResponse: {
          success: true,
          data: {
            id: 'category_xxx',
            name: 'Blog',
            icon: '📝',
            domain_id: 'domain_xxx',
            created_at: 1234567890
          }
        }
      },
      {
        id: 'create-category',
        name: 'Create Category',
        method: 'POST',
        path: '/categories',
        description: 'Create a new category.',
        pathParams: [],
        queryParams: [],
        bodyParams: {
          name: { type: 'string', required: true, description: 'Category name (max 50 chars)' },
          domain_id: { type: 'string', required: false, description: 'Domain ID (optional)' },
          icon: { type: 'string', required: false, description: 'Icon (max 50 chars)' }
        },
        fileUpload: false,
        exampleRequest: {
          body: {
            name: 'Blog',
            icon: '📝',
            domain_id: 'domain_xxx'
          }
        },
        exampleResponse: {
          success: true,
          data: {
            id: 'category_xxx',
            name: 'Blog',
            icon: '📝',
            domain_id: 'domain_xxx',
            created_at: 1234567890
          }
        },
        responseCode: 201
      },
      {
        id: 'update-category',
        name: 'Update Category',
        method: 'PUT',
        path: '/categories/:id',
        description: 'Update an existing category.',
        pathParams: [
          { name: 'id', type: 'string', required: true, description: 'Category ID' }
        ],
        queryParams: [],
        bodyParams: {
          name: { type: 'string', required: false, description: 'Category name' },
          icon: { type: 'string', required: false, description: 'Icon' }
        },
        fileUpload: false,
        exampleRequest: {
          path: '/categories/category_xxx',
          body: {
            icon: '📰'
          }
        },
        exampleResponse: {
          success: true,
          data: {
            id: 'category_xxx',
            icon: '📰'
          }
        }
      },
      {
        id: 'delete-category',
        name: 'Delete Category',
        method: 'DELETE',
        path: '/categories/:id',
        description: 'Delete a category.',
        pathParams: [
          { name: 'id', type: 'string', required: true, description: 'Category ID' }
        ],
        queryParams: [],
        bodyParams: null,
        fileUpload: false,
        exampleRequest: {
          path: '/categories/category_xxx'
        },
        exampleResponse: {
          success: true,
          message: 'Category deleted successfully'
        }
      },
      // Analytics endpoints
      {
        id: 'get-link-analytics',
        name: 'Get Link Analytics',
        method: 'GET',
        path: '/analytics/links/:id',
        description: 'Get analytics data for a specific link.',
        pathParams: [
          { name: 'id', type: 'string', required: true, description: 'Link ID' }
        ],
        queryParams: [
          { name: 'start_date', type: 'string', required: false, description: 'Start date (ISO format)' },
          { name: 'end_date', type: 'string', required: false, description: 'End date (ISO format)' },
          { name: 'group_by', type: 'string', required: false, description: 'Group by (day, week, month, default: day)' },
          { name: 'data_source', type: 'string', required: false, description: 'Data source (auto, analytics_engine, d1, default: auto)' }
        ],
        bodyParams: null,
        fileUpload: false,
        exampleRequest: {
          path: '/analytics/links/link_xxx'
        },
        exampleResponse: {
          success: true,
          data: {
            link_id: 'link_xxx',
            summary: {
              total_clicks: 42,
              unique_visitors: 30
            },
            time_series: [],
            geography: [],
            referrers: [],
            devices: []
          }
        }
      },
      {
        id: 'get-dashboard-analytics',
        name: 'Get Dashboard Analytics',
        method: 'GET',
        path: '/analytics/dashboard',
        description: 'Get dashboard analytics with optional filtering.',
        pathParams: [],
        queryParams: [
          { name: 'link_id', type: 'string', required: false, description: 'Filter by single link ID' },
          { name: 'link_ids', type: 'string', required: false, description: 'Filter by multiple link IDs (comma-separated)' },
          { name: 'domain_id', type: 'string', required: false, description: 'Filter by domain ID' },
          { name: 'domain_names', type: 'string', required: false, description: 'Filter by domain names (comma-separated)' },
          { name: 'start_date', type: 'string', required: false, description: 'Start date (ISO format)' },
          { name: 'end_date', type: 'string', required: false, description: 'End date (ISO format)' },
          { name: 'group_by', type: 'string', required: false, description: 'Group by (day, week, month, default: day)' },
          { name: 'data_source', type: 'string', required: false, description: 'Data source (auto, analytics_engine, d1, default: auto)' }
        ],
        bodyParams: null,
        fileUpload: false,
        exampleRequest: {
          query: '?domain_id=xxx&start_date=2024-01-01&end_date=2024-01-31&group_by=day'
        },
        exampleResponse: {
          success: true,
          data: {
            summary: {
              total_clicks: 1000,
              total_links: 50
            },
            time_series: [],
            top_links: [],
            geography: [],
            referrers: [],
            devices: []
          }
        }
      },
      {
        id: 'export-analytics',
        name: 'Export Analytics',
        method: 'GET',
        path: '/analytics/export',
        description: 'Export analytics data in JSON or CSV format.',
        pathParams: [],
        queryParams: [
          { name: 'link_id', type: 'string', required: true, description: 'Link ID' },
          { name: 'format', type: 'string', required: false, description: 'Export format (json, csv, default: json)' }
        ],
        bodyParams: null,
        fileUpload: false,
        exampleRequest: {
          query: '?link_id=link_xxx&format=csv'
        },
        exampleResponse: {
          success: true,
          data: {
            link_id: 'link_xxx',
            summary: {
              total_clicks: 42,
              unique_visitors: 30
            }
          }
        }
      },
      // Additional Link endpoints
      {
        id: 'get-links-grouped-by-destination',
        name: 'Get Links Grouped by Destination',
        method: 'GET',
        path: '/links/grouped-by-destination',
        description: 'Get links grouped by destination URL (useful for status monitoring).',
        pathParams: [],
        queryParams: [
          { name: 'domain_id', type: 'string', required: false, description: 'Filter by domain ID' },
          { name: 'status_code', type: 'number', required: false, description: 'Filter by status code (e.g., 200, 404, 500)' },
          { name: 'search', type: 'string', required: false, description: 'Search in destination URL' },
          { name: 'limit', type: 'number', required: false, description: 'Results per page (1-10000, default: 25)' },
          { name: 'offset', type: 'number', required: false, description: 'Pagination offset (default: 0)' }
        ],
        bodyParams: null,
        fileUpload: false,
        exampleRequest: {
          query: '?domain_id=xxx&status_code=404&limit=25&offset=0'
        },
        exampleResponse: {
          success: true,
          data: [
            {
              destination_url: 'https://example.com',
              slug_count: 3,
              status_code: 200,
              last_status_check_at: 1234567890,
              link_ids: ['link_xxx1', 'link_xxx2', 'link_xxx3']
            }
          ],
          pagination: {
            limit: 25,
            offset: 0,
            count: 1,
            total: 1,
            has_more: false
          }
        }
      },
      {
        id: 'get-links-by-destination',
        name: 'Get Links by Destination URL',
        method: 'GET',
        path: '/links/by-destination',
        description: 'Get all links that point to a specific destination URL.',
        pathParams: [],
        queryParams: [
          { name: 'destination_url', type: 'string', required: true, description: 'Destination URL to search for' },
          { name: 'limit', type: 'number', required: false, description: 'Results per page (1-10000, default: 25)' },
          { name: 'offset', type: 'number', required: false, description: 'Pagination offset (default: 0)' }
        ],
        bodyParams: null,
        fileUpload: false,
        exampleRequest: {
          query: '?destination_url=https://example.com&limit=25&offset=0'
        },
        exampleResponse: {
          success: true,
          data: [
            {
              id: 'link_xxx',
              domain_id: 'domain_xxx',
              domain_name: 'example.com',
              slug: 'example',
              destination_url: 'https://example.com',
              last_status_code: 200,
              last_status_check_at: 1234567890
            }
          ],
          pagination: {
            limit: 25,
            offset: 0,
            count: 1,
            total: 1
          }
        }
      },
      {
        id: 'get-links-by-status',
        name: 'Get Links by Status Code',
        method: 'GET',
        path: '/links/status/:statusCode',
        description: 'Get links filtered by HTTP status code.',
        pathParams: [
          { name: 'statusCode', type: 'number', required: true, description: 'HTTP status code (e.g., 200, 404, 500)' }
        ],
        queryParams: [
          { name: 'domain_id', type: 'string', required: false, description: 'Filter by domain ID' },
          { name: 'destination_url', type: 'string', required: false, description: 'Filter by destination URL' },
          { name: 'limit', type: 'number', required: false, description: 'Results per page (1-500, default: 25)' },
          { name: 'offset', type: 'number', required: false, description: 'Pagination offset (default: 0)' }
        ],
        bodyParams: null,
        fileUpload: false,
        exampleRequest: {
          path: '/links/status/404',
          query: '?domain_id=xxx&limit=25&offset=0'
        },
        exampleResponse: {
          success: true,
          data: [
            {
              id: 'link_xxx',
              destination_url: 'https://example.com',
              status_code: 404,
              last_status_check_at: 1234567890
            }
          ],
          pagination: {
            limit: 25,
            offset: 0,
            count: 1,
            total: 1,
            has_more: false
          },
          status_summary: {
            '200': 100,
            '404': 5,
            '500': 2,
            'timeout': 1,
            'unknown': 0
          }
        }
      },
      {
        id: 'check-link-status',
        name: 'Check Link Status',
        method: 'POST',
        path: '/links/check-status',
        description: 'Manually trigger status check for one or more links.',
        pathParams: [],
        queryParams: [],
        bodyParams: {
          link_ids: { type: 'array', required: false, description: 'Array of link IDs to check (if empty, checks all links)' }
        },
        fileUpload: false,
        exampleRequest: {
          body: {
            link_ids: ['link_xxx1', 'link_xxx2']
          }
        },
        exampleResponse: {
          success: true,
          data: {
            checked: 2,
            message: 'Status check completed'
          }
        }
      },
      // API Keys endpoints
      {
        id: 'list-api-keys',
        name: 'List API Keys',
        method: 'GET',
        path: '/api-keys',
        description: 'List all API keys (admin only).',
        pathParams: [],
        queryParams: [],
        bodyParams: null,
        fileUpload: false,
        exampleRequest: {
          query: ''
        },
        exampleResponse: {
          success: true,
          data: [
            {
              id: 'api_key_xxx',
              name: 'My API Key',
              key_prefix: 'sk_live_abc123...',
              domain_ids: ['domain_xxx'],
              domains: [{ id: 'domain_xxx', domain_name: 'example.com' }],
              ip_whitelist: ['192.168.1.1'],
              allow_all_ips: false,
              expires_at: null,
              last_used_at: 1234567890,
              created_at: 1234567890,
              status: 'active'
            }
          ]
        }
      },
      {
        id: 'get-api-key',
        name: 'Get API Key by ID',
        method: 'GET',
        path: '/api-keys/:id',
        description: 'Get a single API key by ID (admin only).',
        pathParams: [
          { name: 'id', type: 'string', required: true, description: 'API Key ID' }
        ],
        queryParams: [],
        bodyParams: null,
        fileUpload: false,
        exampleRequest: {
          path: '/api-keys/api_key_xxx'
        },
        exampleResponse: {
          success: true,
          data: {
            id: 'api_key_xxx',
            name: 'My API Key',
            key_prefix: 'sk_live_abc123...',
            domain_ids: ['domain_xxx'],
            domains: [{ id: 'domain_xxx', domain_name: 'example.com' }],
            ip_whitelist: ['192.168.1.1'],
            allow_all_ips: false,
            expires_at: null,
            last_used_at: 1234567890,
            created_at: 1234567890,
            status: 'active'
          }
        }
      },
      {
        id: 'create-api-key',
        name: 'Create API Key',
        method: 'POST',
        path: '/api-keys',
        description: 'Create a new API key (admin only).',
        pathParams: [],
        queryParams: [],
        bodyParams: {
          name: { type: 'string', required: true, description: 'API key name (max 255 chars)' },
          domain_ids: { type: 'array', required: false, description: 'Array of domain IDs to scope this key to (empty = all domains)' },
          ip_whitelist: { type: 'array', required: false, description: 'Array of IP addresses to whitelist' },
          allow_all_ips: { type: 'boolean', required: false, description: 'Allow all IP addresses (default: false)' },
          expires_at: { type: 'number', required: false, description: 'Expiration timestamp (Unix, null = never expires)' }
        },
        fileUpload: false,
        exampleRequest: {
          body: {
            name: 'My API Key',
            domain_ids: ['domain_xxx'],
            ip_whitelist: ['192.168.1.1'],
            allow_all_ips: false
          }
        },
        exampleResponse: {
          success: true,
          data: {
            id: 'api_key_xxx',
            name: 'My API Key',
            key_prefix: 'sk_live_abc123...',
            api_key: 'sk_live_abc123def456...',
            domain_ids: ['domain_xxx'],
            domains: [{ id: 'domain_xxx', domain_name: 'example.com' }],
            ip_whitelist: ['192.168.1.1'],
            allow_all_ips: false,
            expires_at: null,
            created_at: 1234567890,
            status: 'active'
          }
        },
        responseCode: 201
      },
      {
        id: 'update-api-key',
        name: 'Update API Key',
        method: 'PUT',
        path: '/api-keys/:id',
        description: 'Update an existing API key (admin only).',
        pathParams: [
          { name: 'id', type: 'string', required: true, description: 'API Key ID' }
        ],
        queryParams: [],
        bodyParams: {
          name: { type: 'string', required: false, description: 'API key name' },
          domain_ids: { type: 'array', required: false, description: 'Array of domain IDs' },
          ip_whitelist: { type: 'array', required: false, description: 'Array of IP addresses' },
          allow_all_ips: { type: 'boolean', required: false, description: 'Allow all IP addresses' },
          expires_at: { type: 'number', required: false, description: 'Expiration timestamp (null = never expires)' }
        },
        fileUpload: false,
        exampleRequest: {
          path: '/api-keys/api_key_xxx',
          body: {
            name: 'Updated API Key Name',
            allow_all_ips: true
          }
        },
        exampleResponse: {
          success: true,
          data: {
            id: 'api_key_xxx',
            name: 'Updated API Key Name',
            key_prefix: 'sk_live_abc123...',
            allow_all_ips: true
          }
        }
      },
      {
        id: 'delete-api-key',
        name: 'Delete/Revoke API Key',
        method: 'DELETE',
        path: '/api-keys/:id',
        description: 'Revoke or delete an API key (admin only).',
        pathParams: [
          { name: 'id', type: 'string', required: true, description: 'API Key ID' }
        ],
        queryParams: [
          { name: 'hard', type: 'string', required: false, description: 'Hard delete (true/false, default: false for revoke)' }
        ],
        bodyParams: null,
        fileUpload: false,
        exampleRequest: {
          path: '/api-keys/api_key_xxx'
        },
        exampleResponse: {
          success: true,
          message: 'API key revoked'
        }
      },
    ];
    
    // Manual Integration Functions
    let currentApiKey = null;
    let currentApiKeyInfo = null;
    let userApiKeys = [];
    
    async function loadManualIntegrationPage() {
      // Set base URL with full domain
      const baseUrl = window.location.origin + API_BASE;
      document.getElementById('api-base-url').textContent = baseUrl;
      
      // Ensure toggleEndpointDoc is available before rendering
      if (!window.toggleEndpointDoc) {
        window.toggleEndpointDoc = toggleEndpointDoc;
      }
      
      // Load API keys for selection
      await loadApiKeysForPlayground();
      
      // Render documentation
      renderApiDocumentation();
      
      // Attach event listeners for endpoint cards
      attachEndpointCardListeners();
      
      // Initialize playground
      initializePlayground();
      
      // Load domains for domain filtering
      await loadDomainsForPlayground();
      
      // Add event listeners for header buttons
      const tryPlaygroundBtn = document.getElementById('try-playground-btn');
      if (tryPlaygroundBtn) {
        tryPlaygroundBtn.addEventListener('click', () => {
          const playgroundSection = document.querySelector('#manual-integration-page > div:last-of-type');
          if (playgroundSection) {
            playgroundSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }
      
      const copyLlmTxtBtn = document.getElementById('copy-llm-txt-btn');
      if (copyLlmTxtBtn) {
        copyLlmTxtBtn.addEventListener('click', copyLlmTxt);
      }
      
      const copyOpenaiJsonBtn = document.getElementById('copy-openai-json-btn');
      if (copyOpenaiJsonBtn) {
        copyOpenaiJsonBtn.addEventListener('click', copyOpenaiJson);
      }
    }
    
    async function loadApiKeysForPlayground() {
      try {
        const response = await apiRequest('/api-keys');
        if (response && response.success && response.data) {
          userApiKeys = response.data.filter(key => key.status === 'active');
          const selectBtn = document.getElementById('select-api-key-btn');
          if (selectBtn && userApiKeys.length > 0) {
            selectBtn.disabled = false;
          }
        }
      } catch (error) {
        console.error('Failed to load API keys:', error);
      }
    }
    
    async function loadDomainsForPlayground() {
      try {
        const domains = await apiRequest('/domains');
        if (domains && domains.data) {
          window.playgroundDomains = domains.data;
        }
      } catch (error) {
        console.error('Failed to load domains:', error);
      }
    }
    
    // Note: escapeHtml is defined earlier in the script
    
    function renderApiDocumentation() {
      const container = document.getElementById('api-endpoints-docs');
      if (!container) return;
      
      // Group endpoints by their path prefix
      const groups = {};
      apiEndpoints.forEach(endpoint => {
        // Extract group name from path (e.g., '/links' -> 'links', '/analytics/links' -> 'analytics')
        const pathParts = endpoint.path.split('/').filter(p => p);
        const groupName = pathParts[0] || 'other';
        const displayName = groupName.charAt(0).toUpperCase() + groupName.slice(1).replace(/-/g, ' ');
        
        if (!groups[groupName]) {
          groups[groupName] = {
            name: displayName,
            endpoints: []
          };
        }
        groups[groupName].endpoints.push(endpoint);
      });
      
      // Sort groups by name
      const sortedGroups = Object.keys(groups).sort().map(key => ({
        key,
        ...groups[key]
      }));
      
      // @ts-ignore - Template literal HTML generation
      container.innerHTML = sortedGroups.map(group => {
        const groupId = 'group-' + escapeHtml(group.key);
        const groupNameEscaped = escapeHtml(group.name);
        
        // Render endpoints in this group
        const endpointsHtml = group.endpoints.map(endpoint => {
          const methodColor = {
            'GET': '#28a745',
            'POST': '#007bff',
            'PUT': '#ffc107',
            'DELETE': '#dc3545'
          }[endpoint.method] || '#6c757d';
          
          const requestBodyJson = JSON.stringify(endpoint.exampleRequest.body || {}, null, 2);
          const responseJson = JSON.stringify(endpoint.exampleResponse, null, 2);
          
          // Use JSON.stringify for proper JavaScript string escaping in onclick attributes
          // This handles all special characters correctly without manual escaping
          const endpointIdJs = JSON.stringify(String(endpoint.id));
          const endpointIdEscaped = escapeHtml(endpoint.id);
          
          return '<div class="api-doc-card">' +
              '<div class="endpoint-card-header api-doc-header" data-endpoint-id=' + endpointIdJs + '>' +
                '<span style="padding: 0.25rem 0.75rem; background: ' + escapeHtml(methodColor) + '; color: white; border-radius: 4px; font-weight: 600; font-size: 0.875rem;">' + escapeHtml(endpoint.method) + '</span>' +
                '<h3 style="margin: 0; flex: 1; color: var(--text-color);">' + escapeHtml(endpoint.name) + '</h3>' +
                '<span class="endpoint-toggle" id="toggle-' + escapeHtml(endpoint.id) + '" style="color: var(--text-color);">▶</span>' +
              '</div>' +
              '<p class="endpoint-card-description api-doc-description" data-endpoint-id=' + endpointIdJs + '>' + escapeHtml(endpoint.description) + '</p>' +
              '<div class="endpoint-details" id="details-' + escapeHtml(endpoint.id) + '" style="display: none;">' +
              '<div class="api-doc-code-block">' +
                '<code style="font-family: monospace; font-size: 0.9rem; color: var(--primary-color);">' + escapeHtml(endpoint.method) + ' ' + escapeHtml(API_BASE) + escapeHtml(endpoint.path) + '</code>' +
              '</div>' +
              (endpoint.pathParams.length > 0 ? '<div style="margin-bottom: 1rem;">' +
                '<h4 class="api-doc-subtitle">Path Parameters</h4>' +
                '<div style="overflow-x: auto;">' +
                '<table class="api-doc-table">' +
                  '<thead>' +
                    '<tr>' +
                      '<th class="api-doc-th">Name</th>' +
                      '<th class="api-doc-th">Type</th>' +
                      '<th class="api-doc-th">Required</th>' +
                      '<th class="api-doc-th">Description</th>' +
                    '</tr>' +
                  '</thead>' +
                  '<tbody>' +
                    endpoint.pathParams.map(p => '<tr>' +
                      '<td class="api-doc-td"><code>' + escapeHtml(p.name) + '</code></td>' +
                      '<td class="api-doc-td">' + escapeHtml(p.type) + '</td>' +
                      '<td class="api-doc-td">' + (p.required ? 'Yes' : 'No') + '</td>' +
                      '<td class="api-doc-td">' + escapeHtml(p.description) + '</td>' +
                    '</tr>').join('') +
                  '</tbody>' +
                '</table>' +
                '</div>' +
              '</div>' : '') +
              (endpoint.queryParams.length > 0 ? '<div style="margin-bottom: 1rem;">' +
                '<h4 class="api-doc-subtitle">Query Parameters</h4>' +
                '<div style="overflow-x: auto;">' +
                '<table class="api-doc-table">' +
                  '<thead>' +
                    '<tr>' +
                      '<th class="api-doc-th">Name</th>' +
                      '<th class="api-doc-th">Type</th>' +
                      '<th class="api-doc-th">Required</th>' +
                      '<th class="api-doc-th">Description</th>' +
                    '</tr>' +
                  '</thead>' +
                  '<tbody>' +
                    endpoint.queryParams.map(p => '<tr>' +
                      '<td class="api-doc-td"><code>' + escapeHtml(p.name) + '</code></td>' +
                      '<td class="api-doc-td">' + escapeHtml(p.type) + '</td>' +
                      '<td class="api-doc-td">' + (p.required ? 'Yes' : 'No') + '</td>' +
                      '<td class="api-doc-td">' + escapeHtml(p.description) + '</td>' +
                    '</tr>').join('') +
                  '</tbody>' +
                '</table>' +
                '</div>' +
              '</div>' : '') +
              (endpoint.bodyParams ? '<div style="margin-bottom: 1rem;">' +
                '<h4 class="api-doc-subtitle">Request Body</h4>' +
                '<div style="margin-bottom: 1rem; overflow-x: auto;">' +
                  '<table class="api-doc-table">' +
                    '<thead>' +
                      '<tr>' +
                        '<th class="api-doc-th">Name</th>' +
                        '<th class="api-doc-th">Type</th>' +
                        '<th class="api-doc-th">Required</th>' +
                        '<th class="api-doc-th">Description</th>' +
                      '</tr>' +
                    '</thead>' +
                    '<tbody>' +
                      Object.entries(endpoint.bodyParams).map(([name, param]) => {
                        const paramObj = typeof param === 'object' && param !== null ? param : { type: 'string', required: false, description: '' };
                        return '<tr>' +
                          '<td class="api-doc-td"><code>' + escapeHtml(name) + '</code></td>' +
                          '<td class="api-doc-td">' + escapeHtml(paramObj.type || 'string') + '</td>' +
                          '<td class="api-doc-td">' + (paramObj.required ? '<span style="color: var(--error-color); font-weight: 600;">Yes</span>' : 'No') + '</td>' +
                          '<td class="api-doc-td">' + escapeHtml(paramObj.description || '') + '</td>' +
                        '</tr>';
                      }).join('') +
                    '</tbody>' +
                  '</table>' +
                '</div>' +
                '<div class="api-doc-code-block" style="margin-bottom: 0.5rem;">' +
                  '<pre style="margin: 0; font-family: monospace; font-size: 0.875rem; white-space: pre-wrap;"><code>' + escapeHtml(requestBodyJson) + '</code></pre>' +
                '</div>' +
                '<button onclick="copyToClipboard(' + JSON.stringify(escapeHtml(endpoint.id) + '-request') + ')" class="btn btn-secondary btn-sm" style="margin-bottom: 1rem;">Copy Request Example</button>' +
                '<div id="' + escapeHtml(endpoint.id) + '-request" style="display: none;">' + escapeHtml(requestBodyJson) + '</div>' +
              '</div>' : '') +
              '<div style="margin-bottom: 1rem;">' +
                '<h4 class="api-doc-subtitle">Example Response</h4>' +
                '<div class="api-doc-code-block" style="margin-bottom: 0.5rem;">' +
                  '<pre style="margin: 0; font-family: monospace; font-size: 0.875rem; white-space: pre-wrap;"><code>' + escapeHtml(responseJson) + '</code></pre>' +
                '</div>' +
                '<button onclick="copyToClipboard(' + JSON.stringify(escapeHtml(endpoint.id) + '-response') + ')" class="btn btn-secondary btn-sm">Copy Response Example</button>' +
                '<div id="' + escapeHtml(endpoint.id) + '-response" style="display: none;">' + escapeHtml(responseJson) + '</div>' +
              '</div>' +
              '<div class="api-doc-warning-box">' +
                '<p class="api-doc-warning-title">Error Codes:</p>' +
                '<ul class="api-doc-warning-list">' +
                  '<li><strong>400:</strong> Bad Request - Invalid parameters</li>' +
                  '<li><strong>401:</strong> Unauthorized - Invalid or missing API key</li>' +
                  '<li><strong>403:</strong> Forbidden - Domain not allowed for this API key</li>' +
                  '<li><strong>404:</strong> Not Found - Resource not found</li>' +
                  '<li><strong>409:</strong> Conflict - Slug already exists</li>' +
                  '<li><strong>429:</strong> Too Many Requests - Rate limit exceeded</li>' +
                  '<li><strong>500:</strong> Internal Server Error</li>' +
                '</ul>' +
              '</div>' +
              '<div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">' +
                '<button class="btn btn-primary try-playground-btn" data-endpoint-id=' + endpointIdJs + ' style="width: 100%;">Try in Playground</button>' +
              '</div>' +
            '</div>' +
          '</div>';
        }).join('');
        
        // Return group with collapsible header
        return '<div style="margin-bottom: 2rem;">' +
          '<div class="api-group-header" data-group-id=' + JSON.stringify(group.key) + '>' +
            '<h2 class="api-group-title">' + groupNameEscaped + '</h2>' +
            '<div style="display: flex; align-items: center; gap: 0.5rem;">' +
              '<span class="api-group-count">' + group.endpoints.length + ' endpoint' + (group.endpoints.length !== 1 ? 's' : '') + '</span>' +
              '<span class="group-toggle" id="group-toggle-' + escapeHtml(group.key) + '" style="font-size: 1rem; transition: transform 0.2s; color: var(--text-color);">▶</span>' +
            '</div>' +
          '</div>' +
          '<div class="api-group-content" id="group-content-' + escapeHtml(group.key) + '" style="display: none;">' +
            endpointsHtml +
          '</div>' +
        '</div>';
      }).join('');
    }
    
    function toggleEndpointDoc(endpointId) {
      const details = document.getElementById('details-' + endpointId);
      const toggle = document.getElementById('toggle-' + endpointId);
      if (!details || !toggle) return;
      
      if (details.style.display === 'none' || details.style.display === '') {
        details.style.display = 'block';
        toggle.textContent = '▼';
      } else {
        details.style.display = 'none';
        toggle.textContent = '▶';
      }
    }
    
    function toggleApiGroup(groupKey) {
      const content = document.getElementById('group-content-' + groupKey);
      const toggle = document.getElementById('group-toggle-' + groupKey);
      if (!content || !toggle) return;
      
      if (content.style.display === 'none' || content.style.display === '') {
        content.style.display = 'block';
        toggle.textContent = '▼';
      } else {
        content.style.display = 'none';
        toggle.textContent = '▶';
      }
    }
    
    // Make functions available globally before rendering
    window.toggleEndpointDoc = toggleEndpointDoc;
    window.toggleApiGroup = toggleApiGroup;
    
    function attachEndpointCardListeners() {
      // Attach click and hover listeners to group headers
      document.querySelectorAll('.api-group-header').forEach(element => {
        const groupKey = element.getAttribute('data-group-id');
        if (groupKey) {
          // Remove quotes from JSON stringified value
          const cleanKey = groupKey.replace(/^"|"$/g, '');
          element.addEventListener('click', () => toggleApiGroup(cleanKey));
          element.addEventListener('mouseenter', function() {
            this.style.background = '#e9ecef';
          });
          element.addEventListener('mouseleave', function() {
            this.style.background = '#f8f9fa';
          });
        }
      });
      
      // Attach click and hover listeners to endpoint cards
      document.querySelectorAll('.endpoint-card-header, .endpoint-card-description').forEach(element => {
        const endpointId = element.getAttribute('data-endpoint-id');
        if (endpointId) {
          // Remove quotes from JSON stringified value
          const cleanId = endpointId.replace(/^"|"$/g, '');
          element.addEventListener('click', () => toggleEndpointDoc(cleanId));
          element.addEventListener('mouseenter', function() {
            this.style.background = '#f8f9fa';
          });
          element.addEventListener('mouseleave', function() {
            this.style.background = 'transparent';
          });
        }
      });
      
      // Attach click listeners to "Try in Playground" buttons
      document.querySelectorAll('.try-playground-btn').forEach(button => {
        const endpointId = button.getAttribute('data-endpoint-id');
        if (endpointId) {
          // Remove quotes from JSON stringified value
          const cleanId = endpointId.replace(/^"|"$/g, '');
          button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering card toggle
            loadEndpointIntoPlayground(cleanId);
          });
        }
      });
    }
    
    function loadEndpointIntoPlayground(endpointId) {
      // Find the endpoint
      const endpoint = apiEndpoints.find(ep => ep.id === endpointId);
      if (!endpoint) {
        showToast('Endpoint not found', 'error');
        return;
      }
      
      // Set the endpoint in the dropdown
      const endpointSelect = document.getElementById('playground-endpoint');
      if (endpointSelect) {
        endpointSelect.value = endpointId;
        updateEndpointForm(endpointId);
      }
      
      // Pre-fill example values if available
      if (endpoint.exampleRequest) {
        // Pre-fill path parameters
        if (endpoint.pathParams.length > 0 && endpoint.exampleRequest.path) {
          const pathParts = endpoint.exampleRequest.path.split('/');
          const pathTemplateParts = endpoint.path.split('/');
          endpoint.pathParams.forEach((param, index) => {
            const paramIndex = pathTemplateParts.findIndex(p => p === ':' + param.name);
            if (paramIndex >= 0 && pathParts[paramIndex]) {
              const input = document.getElementById('path-' + param.name);
              if (input) {
                input.value = pathParts[paramIndex];
              }
            }
          });
        }
        
        // Pre-fill query parameters
        if (endpoint.queryParams.length > 0 && endpoint.exampleRequest.query) {
          const queryString = endpoint.exampleRequest.query.startsWith('?') 
            ? endpoint.exampleRequest.query.substring(1) 
            : endpoint.exampleRequest.query;
          const params = new URLSearchParams(queryString);
          params.forEach((value, key) => {
            const input = document.getElementById('query-' + key);
            if (input) {
              input.value = value;
            }
          });
        }
        
        // Pre-fill body if available
        if (endpoint.exampleRequest.body) {
          const bodyEditor = document.getElementById('playground-body-editor');
          if (bodyEditor) {
            bodyEditor.value = JSON.stringify(endpoint.exampleRequest.body, null, 2);
          }
        }
      }
      
      // Update URL preview
      updateUrlPreview();
      
      // Scroll to playground section
      const playgroundSection = document.getElementById('playground-request-builder');
      if (playgroundSection) {
        playgroundSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Small delay to ensure form is fully rendered
        setTimeout(() => {
          playgroundSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
      
      showToast('Endpoint loaded into playground', 'success');
    }
    
    window.loadEndpointIntoPlayground = loadEndpointIntoPlayground;
    
    function initializePlayground() {
      // Populate endpoint selector
      const endpointSelect = document.getElementById('playground-endpoint');
      if (endpointSelect) {
        // @ts-ignore - Template literal HTML generation
        endpointSelect.innerHTML = '<option value="">-- Select an endpoint --</option>' +
          apiEndpoints.map(ep => '<option value="' + ep.id + '">' + ep.method + ' ' + ep.path + ' - ' + ep.name + '</option>').join('');
        
        endpointSelect.addEventListener('change', (e) => {
          updateEndpointForm(e.target.value);
        });
      }
      
      // API key input handler
      const apiKeyInput = document.getElementById('playground-api-key');
      if (apiKeyInput) {
        apiKeyInput.addEventListener('input', (e) => {
          currentApiKey = e.target.value.trim();
          validateApiKey();
          updateSendButton();
        });
      }
      
      // API key selection modal handlers (kept for potential future use, but button removed)
      const apiKeyModal = document.getElementById('api-key-selection-modal');
      const closeApiKeyModal = document.getElementById('close-api-key-modal');
      const cancelApiKeySelection = document.getElementById('cancel-api-key-selection');
      if (closeApiKeyModal) {
        closeApiKeyModal.addEventListener('click', () => {
          if (apiKeyModal) apiKeyModal.classList.remove('active');
        });
      }
      if (cancelApiKeySelection) {
        cancelApiKeySelection.addEventListener('click', () => {
          if (apiKeyModal) apiKeyModal.classList.remove('active');
        });
      }
      if (apiKeyModal) {
        apiKeyModal.addEventListener('click', (e) => {
          if (e.target === apiKeyModal) {
            apiKeyModal.classList.remove('active');
          }
        });
      }
      
      // API key search
      const apiKeySearch = document.getElementById('api-key-search');
      if (apiKeySearch) {
        apiKeySearch.addEventListener('input', (e) => {
          filterApiKeySelection(e.target.value);
        });
      }
      
      // Clear history button
      const clearHistoryBtn = document.getElementById('clear-history-btn');
      if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearRequestHistory);
      }
      
      // Load request history on page load
      loadRequestHistory();
      
      // Send button
      const sendBtn = document.getElementById('playground-send-btn');
      if (sendBtn) {
        sendBtn.addEventListener('click', sendPlaygroundRequest);
      }
      
      // Copy response button
      const copyBtn = document.getElementById('copy-response-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          const responseBody = document.getElementById('playground-response-body');
          if (responseBody) {
            copyToClipboard(responseBody.textContent);
            showToast('Response copied to clipboard', 'success');
          }
        });
      }
      
      // Copy cURL button
      const copyCurlBtn = document.getElementById('copy-curl-btn');
      if (copyCurlBtn) {
        copyCurlBtn.addEventListener('click', copyCurlRequest);
      }
    }
    
    async function validateApiKey() {
      const apiKeyInput = document.getElementById('playground-api-key');
      const infoDiv = document.getElementById('api-key-info');
      if (!apiKeyInput || !infoDiv) return;
      
      const key = apiKeyInput.value.trim();
      if (key && key.startsWith('sk_live_') && key.length > 20) {
        infoDiv.style.display = 'block';
        infoDiv.innerHTML = '<span style="color: #28a745;">✓ Valid API key format</span>';
        
        // Try to match API key with user's keys to get info
        const keyPrefix = key.substring(0, 16);
        const matchedKey = userApiKeys.find(k => k.key_prefix === keyPrefix);
        if (matchedKey) {
          currentApiKeyInfo = matchedKey;
          displayApiKeyInfo(matchedKey);
          updateDomainScopingWarning(matchedKey);
        } else {
          // Key entered manually - try to fetch info (but we can't verify the full key)
          currentApiKeyInfo = null;
          infoDiv.innerHTML += '<br><span style="color: #856404; font-size: 0.8rem;">⚠️ Key not found in your API keys list. Domain scoping may not work correctly.</span>';
          hideDomainScopingWarning();
        }
      } else if (key.length > 0) {
        infoDiv.style.display = 'block';
        infoDiv.innerHTML = '<span style="color: #dc3545;">✗ Invalid API key format (should start with sk_live_)</span>';
        currentApiKeyInfo = null;
        hideDomainScopingWarning();
      } else {
        infoDiv.style.display = 'none';
        currentApiKeyInfo = null;
        hideDomainScopingWarning();
      }
    }
    
    function displayApiKeyInfo(apiKeyInfo) {
      const infoDiv = document.getElementById('api-key-info');
      if (!infoDiv || !apiKeyInfo) return;
      
      const domains = apiKeyInfo.domain_ids && apiKeyInfo.domain_ids.length > 0
        ? (apiKeyInfo.domains && apiKeyInfo.domains.length > 0
            ? apiKeyInfo.domains.map(d => d.domain_name).join(', ')
            : apiKeyInfo.domain_ids.length + ' domain(s)')
        : 'All Domains';
      
      const expires = apiKeyInfo.expires_at
        ? new Date(apiKeyInfo.expires_at).toLocaleDateString()
        : 'Never';
      
      const ipWhitelist = apiKeyInfo.allow_all_ips
        ? 'All IPs'
        : (apiKeyInfo.ip_whitelist && apiKeyInfo.ip_whitelist.length > 0
            ? apiKeyInfo.ip_whitelist.join(', ')
            : 'None');
      
      infoDiv.style.display = 'block';
      infoDiv.innerHTML = '<div style="margin-top: 0.5rem; padding: 0.75rem; background: #f8f9fa; border-radius: 4px; font-size: 0.875rem;">' +
        '<div style="margin-bottom: 0.25rem;"><strong>Name:</strong> ' + (apiKeyInfo.name || 'Unnamed') + '</div>' +
        '<div style="margin-bottom: 0.25rem;"><strong>Domains:</strong> ' + domains + '</div>' +
        '<div style="margin-bottom: 0.25rem;"><strong>Expires:</strong> ' + expires + '</div>' +
        '<div><strong>IP Whitelist:</strong> ' + ipWhitelist + '</div>' +
        '</div>';
    }
    
    function updateDomainScopingWarning(apiKeyInfo) {
      const warningDiv = document.getElementById('domain-scoping-warning');
      const messageDiv = document.getElementById('domain-scoping-message');
      if (!warningDiv || !messageDiv) return;
      
      if (apiKeyInfo && apiKeyInfo.domain_ids && apiKeyInfo.domain_ids.length > 0) {
        const domainNames = apiKeyInfo.domains && apiKeyInfo.domains.length > 0
          ? apiKeyInfo.domains.map(d => d.domain_name).join(', ')
          : apiKeyInfo.domain_ids.length + ' domain(s)';
        messageDiv.textContent = 'This API key is scoped to specific domains. You can only access: ' + domainNames;
        warningDiv.style.display = 'block';
      } else {
        warningDiv.style.display = 'none';
      }
    }
    
    function hideDomainScopingWarning() {
      const warningDiv = document.getElementById('domain-scoping-warning');
      if (warningDiv) {
        warningDiv.style.display = 'none';
      }
    }
    
    function filterDomainsByApiKey(domains, apiKeyInfo) {
      if (!domains || !Array.isArray(domains)) return [];
      if (!apiKeyInfo) return domains;
      
      // If API key allows all domains or has no domain restrictions
      if (!apiKeyInfo.domain_ids || apiKeyInfo.domain_ids.length === 0) {
        return domains;
      }
      
      // Filter to only allowed domains
      return domains.filter(domain => apiKeyInfo.domain_ids.includes(domain.id));
    }
    
    function openApiKeySelectionModal() {
      const modal = document.getElementById('api-key-selection-modal');
      if (!modal) return;
      
      const tbody = document.getElementById('api-key-selection-tbody');
      if (!tbody) return;
      
      if (userApiKeys.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #666;">No active API keys found. Please create one first.</td></tr>';
        modal.classList.add('active');
        return;
      }
      
      // @ts-ignore - Template literal HTML generation
      tbody.innerHTML = userApiKeys.map(key => {
        const domains = key.domain_ids && key.domain_ids.length > 0
          ? (key.domains && key.domains.length > 0
              ? key.domains.map(d => d.domain_name).join(', ')
              : key.domain_ids.length + ' domain(s)')
          : 'All Domains';
        const expires = key.expires_at
          ? new Date(key.expires_at).toLocaleDateString()
          : 'Never';
        const statusClass = key.status === 'active' ? 'status-active' : 'status-expired';
        const keyIdJs = JSON.stringify(key.id);
        
        return '<tr class="api-key-row" data-key-id=' + keyIdJs + ' style="cursor: pointer;">' +
          '<td>' + escapeHtml(key.name || 'Unnamed') + '</td>' +
          '<td><code style="font-size: 0.875rem;">' + escapeHtml(key.key_prefix) + '...</code></td>' +
          '<td>' + escapeHtml(domains) + '</td>' +
          '<td>' + escapeHtml(expires) + '</td>' +
          '<td><span class="status-badge ' + statusClass + '">' + escapeHtml(key.status.toUpperCase()) + '</span></td>' +
          '<td><button class="btn btn-primary btn-sm select-api-key-btn" data-key-id=' + keyIdJs + '>Select</button></td>' +
          '</tr>';
      }).join('');
      
      // Attach event listeners to rows and buttons
      tbody.querySelectorAll('.api-key-row').forEach(row => {
        const keyId = row.getAttribute('data-key-id');
        if (keyId) {
          const cleanId = keyId.replace(/^"|"$/g, '');
          row.addEventListener('click', (e) => {
            // Don't trigger if clicking the button
            if (!e.target.closest('.select-api-key-btn')) {
              selectApiKeyFromModal(cleanId);
            }
          });
          row.addEventListener('mouseenter', function() {
            this.style.background = '#f8f9fa';
          });
          row.addEventListener('mouseleave', function() {
            this.style.background = '';
          });
        }
      });
      
      tbody.querySelectorAll('.select-api-key-btn').forEach(button => {
        const keyId = button.getAttribute('data-key-id');
        if (keyId) {
          const cleanId = keyId.replace(/^"|"$/g, '');
          button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent row click
            selectApiKeyFromModal(cleanId);
          });
        }
      });
      
      modal.classList.add('active');
    }
    
    function selectApiKeyFromModal(keyId) {
      const key = userApiKeys.find(k => k.id === keyId);
      if (!key) return;
      
      const apiKeyInput = document.getElementById('playground-api-key');
      if (apiKeyInput) {
        // Clear field - user needs to paste their saved full key
        apiKeyInput.value = '';
        apiKeyInput.placeholder = 'Paste your full API key (starts with ' + key.key_prefix.substring(0, 16) + '...)';
      }
      
      currentApiKeyInfo = key;
      displayApiKeyInfo(key);
      updateDomainScopingWarning(key);
      updateSendButton();
      
      // Update domain filters if endpoint is already selected
      const endpointSelect = document.getElementById('playground-endpoint');
      if (endpointSelect && endpointSelect.value) {
        updateEndpointForm(endpointSelect.value);
      }
      
      // Close modal
      const modal = document.getElementById('api-key-selection-modal');
      if (modal) modal.classList.remove('active');
    }
    
    window.selectApiKeyFromModal = selectApiKeyFromModal;
    
    function filterApiKeySelection(searchTerm) {
      const tbody = document.getElementById('api-key-selection-tbody');
      if (!tbody) return;
      
      const filtered = userApiKeys.filter(key => {
        const name = (key.name || '').toLowerCase();
        const prefix = (key.key_prefix || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        return name.includes(search) || prefix.includes(search);
      });
      
      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #666;">No API keys found matching "' + searchTerm + '"</td></tr>';
        return;
      }
      
      // @ts-ignore - Template literal HTML generation
      tbody.innerHTML = filtered.map(key => {
        const domains = key.domain_ids && key.domain_ids.length > 0
          ? (key.domains && key.domains.length > 0
              ? key.domains.map(d => d.domain_name).join(', ')
              : key.domain_ids.length + ' domain(s)')
          : 'All Domains';
        const expires = key.expires_at
          ? new Date(key.expires_at).toLocaleDateString()
          : 'Never';
        const statusClass = key.status === 'active' ? 'status-active' : 'status-expired';
        const keyIdJs = JSON.stringify(key.id);
        
        return '<tr class="api-key-row" data-key-id=' + keyIdJs + ' style="cursor: pointer;">' +
          '<td>' + escapeHtml(key.name || 'Unnamed') + '</td>' +
          '<td><code style="font-size: 0.875rem;">' + escapeHtml(key.key_prefix) + '...</code></td>' +
          '<td>' + escapeHtml(domains) + '</td>' +
          '<td>' + escapeHtml(expires) + '</td>' +
          '<td><span class="status-badge ' + statusClass + '">' + escapeHtml(key.status.toUpperCase()) + '</span></td>' +
          '<td><button class="btn btn-primary btn-sm select-api-key-btn" data-key-id=' + keyIdJs + '>Select</button></td>' +
          '</tr>';
      }).join('');
      
      // Attach event listeners to rows and buttons
      tbody.querySelectorAll('.api-key-row').forEach(row => {
        const keyId = row.getAttribute('data-key-id');
        if (keyId) {
          const cleanId = keyId.replace(/^"|"$/g, '');
          row.addEventListener('click', (e) => {
            // Don't trigger if clicking the button
            if (!e.target.closest('.select-api-key-btn')) {
              selectApiKeyFromModal(cleanId);
            }
          });
          row.addEventListener('mouseenter', function() {
            this.style.background = '#f8f9fa';
          });
          row.addEventListener('mouseleave', function() {
            this.style.background = '';
          });
        }
      });
      
      tbody.querySelectorAll('.select-api-key-btn').forEach(button => {
        const keyId = button.getAttribute('data-key-id');
        if (keyId) {
          const cleanId = keyId.replace(/^"|"$/g, '');
          button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent row click
            selectApiKeyFromModal(cleanId);
          });
        }
      });
    }
    
    function updateSendButton() {
      const sendBtn = document.getElementById('playground-send-btn');
      const endpointSelect = document.getElementById('playground-endpoint');
      const apiKeyInput = document.getElementById('playground-api-key');
      
      if (sendBtn && endpointSelect && apiKeyInput) {
        const hasEndpoint = endpointSelect.value.length > 0;
        const hasApiKey = apiKeyInput.value.trim().length > 0;
        sendBtn.disabled = !(hasEndpoint && hasApiKey);
      }
    }
    
    function updateEndpointForm(endpointId) {
      const endpoint = apiEndpoints.find(ep => ep.id === endpointId);
      if (!endpoint) {
        document.getElementById('playground-request-builder').style.display = 'none';
        return;
      }
      
      const builder = document.getElementById('playground-request-builder');
      builder.style.display = 'block';
      
      // Update method and URL preview
      document.getElementById('playground-method').textContent = endpoint.method;
      const methodColors = {
        'GET': '#28a745',
        'POST': '#007bff',
        'PUT': '#ffc107',
        'DELETE': '#dc3545'
      };
      document.getElementById('playground-method').style.background = methodColors[endpoint.method] || '#6c757d';
      
      updateUrlPreview(endpoint);
      
      // Path parameters
      const pathParamsDiv = document.getElementById('playground-path-params');
      if (endpoint.pathParams.length > 0) {
        pathParamsDiv.style.display = 'block';
        // @ts-ignore - Template literal HTML generation
        pathParamsDiv.innerHTML = '<label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: #666;">Path Parameters</label>' +
          endpoint.pathParams.map(param => {
            const required = param.required ? '<span style="color: #dc3545;">*</span>' : '';
            return '<div style="margin-bottom: 0.5rem;">' +
              '<label style="display: block; margin-bottom: 0.25rem; font-size: 0.875rem;">' +
              param.name + ' ' + required + '</label>' +
              '<input type="text" id="path-' + param.name + '" placeholder="' + param.description + '" ' +
              'style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" ' +
              'oninput="updateUrlPreview()">' +
              '</div>';
          }).join('');
      } else {
        pathParamsDiv.style.display = 'none';
      }
      
      // Query parameters
      const queryParamsDiv = document.getElementById('playground-query-params');
      if (endpoint.queryParams.length > 0) {
        queryParamsDiv.style.display = 'block';
        const availableDomains = window.playgroundDomains || [];
        const filteredDomains = filterDomainsByApiKey(availableDomains, currentApiKeyInfo);
        
        // @ts-ignore - Template literal HTML generation
        queryParamsDiv.innerHTML = '<label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: #666;">Query Parameters</label>' +
          endpoint.queryParams.map(param => {
            const required = param.required ? '<span style="color: #dc3545;">*</span>' : '';
            
            // Special handling for domain_id - use dropdown
            if (param.name === 'domain_id' && filteredDomains.length > 0) {
              const options = filteredDomains.map(d => 
                '<option value="' + d.id + '">' + d.domain_name + '</option>'
              ).join('');
              return '<div style="margin-bottom: 0.5rem;">' +
                '<label style="display: block; margin-bottom: 0.25rem; font-size: 0.875rem;">' +
                param.name + ' ' + required + '</label>' +
                '<select id="query-' + param.name + '" ' +
                'style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" ' +
                'onchange="updateUrlPreview()">' +
                '<option value="">-- Select Domain --</option>' +
                options +
                '</select>' +
                '</div>';
            }
            
            const inputType = param.type === 'number' ? 'number' : 'text';
            return '<div style="margin-bottom: 0.5rem;">' +
              '<label style="display: block; margin-bottom: 0.25rem; font-size: 0.875rem;">' +
              param.name + ' ' + required + '</label>' +
              '<input type="' + inputType + '" id="query-' + param.name + '" placeholder="' + param.description + '" ' +
              'style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" ' +
              'oninput="updateUrlPreview()">' +
              '</div>';
          }).join('');
      } else {
        queryParamsDiv.style.display = 'none';
      }
      
      // Add domain selector for body if needed
      if (endpoint.bodyParams) {
        const bodyDiv = document.getElementById('playground-request-body');
        const availableDomains = window.playgroundDomains || [];
        const filteredDomains = filterDomainsByApiKey(availableDomains, currentApiKeyInfo);
        
        // Remove existing domain selector if any
        const existingSelector = document.getElementById('body-domain-selector');
        if (existingSelector) {
          existingSelector.remove();
        }
        
        // Check if body has domain_id field
        const hasDomainId = endpoint.bodyParams && Object.keys(endpoint.bodyParams).includes('domain_id');
        if (hasDomainId && filteredDomains.length > 0) {
          const domainSelector = document.createElement('div');
          domainSelector.id = 'body-domain-selector';
          domainSelector.style.marginBottom = '0.5rem';
          domainSelector.innerHTML = '<label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: #666;">Domain <span style="color: #dc3545;">*</span></label>' +
            '<select id="body-domain-select" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" onchange="updateBodyDomainId()">' +
            '<option value="">-- Select Domain --</option>' +
            filteredDomains.map(d => '<option value="' + d.id + '">' + d.domain_name + '</option>').join('') +
            '</select>';
          bodyDiv.insertBefore(domainSelector, bodyDiv.firstChild);
        }
      }
      
      // Request body
      const bodyDiv = document.getElementById('playground-request-body');
      const bodyEditor = document.getElementById('playground-body-editor');
      if (endpoint.bodyParams) {
        bodyDiv.style.display = 'block';
        
        // Create individual input fields for body parameters
        let bodyFieldsContainer = document.getElementById('playground-body-fields');
        if (!bodyFieldsContainer) {
          // Create container if it doesn't exist
          const fieldsDiv = document.createElement('div');
          fieldsDiv.id = 'playground-body-fields';
          fieldsDiv.style.marginBottom = '1rem';
          // Insert before the JSON editor
          bodyDiv.insertBefore(fieldsDiv, bodyEditor);
          bodyFieldsContainer = fieldsDiv;
        }
        
        const fieldsContainer = document.getElementById('playground-body-fields');
        if (fieldsContainer) {
          // Convert bodyParams object to array
          const bodyParamsArray = Object.entries(endpoint.bodyParams).map(([name, param]) => ({
            name,
            ...(typeof param === 'object' && param !== null ? param : { type: 'string', required: false, description: '' })
          }));
          
          if (bodyParamsArray.length > 0) {
            fieldsContainer.style.display = 'block';
            fieldsContainer.innerHTML = '<label style="display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: #666; font-weight: 600;">Body Parameters</label>' +
              bodyParamsArray.map(param => {
                const required = param.required ? '<span style="color: #dc3545;">*</span>' : '';
                const inputId = 'body-field-' + param.name;
                
                let inputHtml = '';
                if (param.type === 'boolean') {
                  inputHtml = '<select id="' + inputId + '" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" onchange="updateBodyFromFields()">' +
                    '<option value="">-- Select --</option>' +
                    '<option value="true">true</option>' +
                    '<option value="false">false</option>' +
                    '</select>';
                } else if (param.type === 'number') {
                  inputHtml = '<input type="number" id="' + inputId + '" placeholder="' + (param.description || param.name) + '" ' +
                    'style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" ' +
                    'oninput="updateBodyFromFields()">';
                } else if (param.type === 'array') {
                  inputHtml = '<textarea id="' + inputId + '" placeholder="Enter JSON array, e.g., [&quot;item1&quot;, &quot;item2&quot;]" ' +
                    'style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; min-height: 60px; font-family: monospace; font-size: 0.875rem;" ' +
                    'oninput="updateBodyFromFields()"></textarea>' +
                    '<small style="display: block; margin-top: 0.25rem; color: #666; font-size: 0.75rem;">Enter a valid JSON array</small>';
                } else if (param.type === 'object') {
                  inputHtml = '<textarea id="' + inputId + '" placeholder="Enter JSON object, e.g., {&quot;key&quot;: &quot;value&quot;}" ' +
                    'style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; min-height: 80px; font-family: monospace; font-size: 0.875rem;" ' +
                    'oninput="updateBodyFromFields()"></textarea>' +
                    '<small style="display: block; margin-top: 0.25rem; color: #666; font-size: 0.75rem;">Enter a valid JSON object</small>';
                } else {
                  // String or default
                  const isUrl = param.name === 'destination_url' || param.name === 'url';
                  inputHtml = '<input type="' + (isUrl ? 'url' : 'text') + '" id="' + inputId + '" placeholder="' + (param.description || param.name) + '" ' +
                    'style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" ' +
                    'oninput="updateBodyFromFields()">';
                }
                
                return '<div style="margin-bottom: 0.75rem;">' +
                  '<label style="display: block; margin-bottom: 0.25rem; font-size: 0.875rem; font-weight: 500;">' +
                  param.name + ' ' + required +
                  (param.description ? ' <span style="color: #666; font-weight: normal;">(' + escapeHtml(param.description) + ')</span>' : '') +
                  '</label>' +
                  inputHtml +
                  '</div>';
              }).join('');
          } else {
            fieldsContainer.style.display = 'none';
          }
        }
        
        // Initialize body editor with example or empty
        if (endpoint.exampleRequest.body) {
          bodyEditor.value = JSON.stringify(endpoint.exampleRequest.body, null, 2);
          // Also populate individual fields from example
          updateBodyFieldsFromJson();
        } else {
          bodyEditor.value = '{}';
        }
        
        // Add event listener for JSON editor changes
        bodyEditor.addEventListener('input', () => {
          updateUrlPreview();
          updateBodyFieldsFromJson();
        });
      } else {
        bodyDiv.style.display = 'none';
        const fieldsContainer = document.getElementById('playground-body-fields');
        if (fieldsContainer) {
          fieldsContainer.style.display = 'none';
        }
      }
      
      // File upload
      const fileDiv = document.getElementById('playground-file-upload');
      if (endpoint.fileUpload) {
        fileDiv.style.display = 'block';
      } else {
        fileDiv.style.display = 'none';
      }
      
      updateSendButton();
    }
    
    window.updateUrlPreview = function() {
      const endpointSelect = document.getElementById('playground-endpoint');
      if (!endpointSelect || !endpointSelect.value) return;
      
      const endpoint = apiEndpoints.find(ep => ep.id === endpointSelect.value);
      if (!endpoint) return;
      
      let path = endpoint.path;
      
      // Replace path parameters
      endpoint.pathParams.forEach(param => {
        const input = document.getElementById('path-' + param.name);
        if (input && input.value) {
          path = path.replace(':' + param.name, input.value);
        }
      });
      
      // Build query string
      const queryParams = [];
      endpoint.queryParams.forEach(param => {
        const input = document.getElementById('query-' + param.name);
        if (input && input.value) {
          queryParams.push(param.name + '=' + encodeURIComponent(input.value));
        }
      });
      
      const queryString = queryParams.length > 0 ? '?' + queryParams.join('&') : '';
      const fullUrl = API_BASE + path + queryString;
      
      document.getElementById('playground-url').textContent = fullUrl;
    };
    
    async function sendPlaygroundRequest() {
      const endpointSelect = document.getElementById('playground-endpoint');
      const apiKeyInput = document.getElementById('playground-api-key');
      const sendBtn = document.getElementById('playground-send-btn');
      const sendText = document.getElementById('playground-send-text');
      const sendLoading = document.getElementById('playground-send-loading');
      const responseDiv = document.getElementById('playground-response');
      
      if (!endpointSelect || !apiKeyInput || !sendBtn) return;
      
      const endpointId = endpointSelect.value;
      const apiKey = apiKeyInput.value.trim();
      
      if (!endpointId || !apiKey) {
        showToast('Please select an endpoint and enter an API key', 'error');
        return;
      }
      
      const endpoint = apiEndpoints.find(ep => ep.id === endpointId);
      if (!endpoint) return;
      
      // Validate request before sending
      const validation = validateRequestBody(endpoint);
      if (!validation.valid) {
        showValidationErrors(validation.errors);
        return;
      }
      hideValidationErrors();
      
      // Disable button and show loading
      sendBtn.disabled = true;
      sendText.style.display = 'none';
      sendLoading.style.display = 'inline';
      
      try {
        // Build path
        let path = endpoint.path;
        endpoint.pathParams.forEach(param => {
          const input = document.getElementById('path-' + param.name);
          if (input && input.value) {
            path = path.replace(':' + param.name, input.value);
          }
        });
        
        // Build query string
        const queryParams = [];
        endpoint.queryParams.forEach(param => {
          const input = document.getElementById('query-' + param.name);
          if (input && input.value) {
            queryParams.push(param.name + '=' + encodeURIComponent(input.value));
          }
        });
        const queryString = queryParams.length > 0 ? '?' + queryParams.join('&') : '';
        
        // Build request options
        const options = {
          method: endpoint.method,
          headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json'
          }
        };
        
        // Add body for POST/PUT
        if (['POST', 'PUT'].includes(endpoint.method)) {
          if (endpoint.fileUpload) {
            // File upload - use FormData
            const fileInput = document.getElementById('playground-file-input');
            if (fileInput && fileInput.files && fileInput.files[0]) {
              const formData = new FormData();
              formData.append('file', fileInput.files[0]);
              options.body = formData;
              delete options.headers['Content-Type']; // Let browser set it
            } else {
              throw new Error('Please select a file to upload');
            }
          } else {
            // JSON body
            const bodyEditor = document.getElementById('playground-body-editor');
            const hasBodyParams = endpoint.bodyParams && Object.keys(endpoint.bodyParams).length > 0;
            
            if (bodyEditor) {
              const bodyText = bodyEditor.value.trim();
              
              // If endpoint has body params, always send body (even if empty object)
              if (hasBodyParams) {
                if (bodyText === '') {
                  options.body = JSON.stringify({});
                } else {
                  try {
                    const parsed = JSON.parse(bodyText);
                    options.body = JSON.stringify(parsed);
                  } catch (e) {
                    throw new Error('Invalid JSON in request body: ' + e.message);
                  }
                }
              } else if (bodyText !== '') {
                // Endpoint doesn't expect body params, but user provided one - send it
                try {
                  const parsed = JSON.parse(bodyText);
                  options.body = JSON.stringify(parsed);
                } catch (e) {
                  throw new Error('Invalid JSON in request body: ' + e.message);
                }
              }
              // If no body params expected and no body provided, don't send body
            }
          }
        }
        
        // Send request
        const response = await fetch(API_BASE + path + queryString, options);
        const responseText = await response.text();
        
        // Parse response
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText;
        }
        
        // Display response
        responseDiv.style.display = 'block';
        const statusSpan = document.getElementById('playground-status');
        const statusClass = response.ok ? 'status-active' : 'status-expired';
        statusSpan.textContent = response.status + ' ' + response.statusText;
        statusSpan.className = statusClass;
        statusSpan.style.background = response.ok ? '#d4edda' : '#f8d7da';
        statusSpan.style.color = response.ok ? '#155724' : '#721c24';
        
        const responseBody = document.getElementById('playground-response-body');
        if (typeof responseData === 'object') {
          const jsonStr = JSON.stringify(responseData, null, 2);
          responseBody.innerHTML = highlightJson(jsonStr);
        } else {
          // Escape HTML and preserve newlines
          const escaped = String(responseData)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\\n/g, '<br>');
          responseBody.innerHTML = escaped;
        }
        
        // Save to history
        const fullUrl = API_BASE + path + queryString;
        const bodyEditor = document.getElementById('playground-body-editor');
        const requestBody = bodyEditor && bodyEditor.value ? JSON.parse(bodyEditor.value) : null;
        saveRequestToHistory({
          endpoint: endpointId,
          method: endpoint.method,
          url: fullUrl,
          headers: { Authorization: 'Bearer ' + apiKey.substring(0, 20) + '...' },
          body: requestBody,
          response: { status: response.status, data: responseData }
        });
        
      } catch (error) {
        responseDiv.style.display = 'block';
        document.getElementById('playground-status').textContent = 'Error';
        document.getElementById('playground-status').style.background = '#f8d7da';
        document.getElementById('playground-status').style.color = '#721c24';
        document.getElementById('playground-response-body').textContent = 'Error: ' + error.message;
        showToast('Request failed: ' + error.message, 'error');
      } finally {
        sendBtn.disabled = false;
        sendText.style.display = 'inline';
        sendLoading.style.display = 'none';
        updateSendButton();
      }
    }
    
    window.updateBodyDomainId = function() {
      const domainSelect = document.getElementById('body-domain-select');
      const bodyEditor = document.getElementById('playground-body-editor');
      if (!domainSelect || !bodyEditor) return;
      
      const domainId = domainSelect.value;
      if (!domainId) return;
      
      try {
        const body = JSON.parse(bodyEditor.value || '{}');
        body.domain_id = domainId;
        bodyEditor.value = JSON.stringify(body, null, 2);
        updateBodyFieldsFromJson();
      } catch (e) {
        console.error('Failed to update body:', e);
      }
    };
    
    window.updateBodyFromFields = function() {
      const bodyEditor = document.getElementById('playground-body-editor');
      const endpointSelect = document.getElementById('playground-endpoint');
      if (!bodyEditor || !endpointSelect || !endpointSelect.value) return;
      
      const endpoint = apiEndpoints.find(ep => ep.id === endpointSelect.value);
      if (!endpoint || !endpoint.bodyParams) return;
      
      try {
        const body = {};
        const bodyParamsArray = Object.entries(endpoint.bodyParams).map(([name, param]) => ({
          name,
          ...(typeof param === 'object' && param !== null ? param : { type: 'string', required: false, description: '' })
        }));
        
        bodyParamsArray.forEach(param => {
          const input = document.getElementById('body-field-' + param.name);
          if (!input) return;
          
          const value = input.value.trim();
          if (value === '') {
            // Skip empty optional fields
            if (param.required) {
              body[param.name] = null;
            }
            return;
          }
          
          try {
            if (param.type === 'number') {
              const numValue = Number(value);
              if (!isNaN(numValue)) {
                body[param.name] = numValue;
              }
            } else if (param.type === 'boolean') {
              body[param.name] = value === 'true';
            } else if (param.type === 'array') {
              body[param.name] = JSON.parse(value);
            } else if (param.type === 'object') {
              body[param.name] = JSON.parse(value);
            } else {
              // String
              body[param.name] = value;
            }
          } catch (e) {
            // Invalid JSON for array/object, skip for now
            // DEBUG: console.warn('Failed to parse field', param.name, ':', e);
          }
        });
        
        bodyEditor.value = JSON.stringify(body, null, 2);
        updateUrlPreview();
      } catch (e) {
        console.error('Failed to update body from fields:', e);
      }
    };
    
    function updateBodyFieldsFromJson() {
      const bodyEditor = document.getElementById('playground-body-editor');
      const endpointSelect = document.getElementById('playground-endpoint');
      if (!bodyEditor || !endpointSelect || !endpointSelect.value) return;
      
      const endpoint = apiEndpoints.find(ep => ep.id === endpointSelect.value);
      if (!endpoint || !endpoint.bodyParams) return;
      
      try {
        const body = JSON.parse(bodyEditor.value || '{}');
        const bodyParamsArray = Object.entries(endpoint.bodyParams).map(([name, param]) => ({
          name,
          ...(typeof param === 'object' && param !== null ? param : { type: 'string', required: false, description: '' })
        }));
        
        bodyParamsArray.forEach(param => {
          const input = document.getElementById('body-field-' + param.name);
          if (!input) return;
          
          const value = body[param.name];
          if (value === undefined || value === null) {
            input.value = '';
            return;
          }
          
          if (param.type === 'array' || param.type === 'object') {
            input.value = JSON.stringify(value, null, 2);
          } else if (param.type === 'boolean') {
            input.value = String(value);
          } else {
            input.value = String(value);
          }
        });
      } catch (e) {
        // Invalid JSON, skip updating fields
        // DEBUG: console.warn('Failed to update fields from JSON:', e);
      }
    }
    
    function validateRequestBody(endpoint) {
      const errors = [];
      
      // Validate path parameters
      endpoint.pathParams.forEach(param => {
        if (param.required) {
          const input = document.getElementById('path-' + param.name);
          if (!input || !input.value.trim()) {
            errors.push({ field: param.name, message: 'Path parameter "' + param.name + '" is required' });
          } else if (param.name === 'id' && !isValidId(input.value.trim())) {
            errors.push({ field: param.name, message: 'Invalid ID format' });
          }
        }
      });
      
      // Validate query parameters
      endpoint.queryParams.forEach(param => {
        if (param.required) {
          const input = document.getElementById('query-' + param.name);
          if (!input || !input.value.trim()) {
            errors.push({ field: param.name, message: 'Query parameter "' + param.name + '" is required' });
          } else if (param.type === 'number' && isNaN(Number(input.value))) {
            errors.push({ field: param.name, message: 'Query parameter "' + param.name + '" must be a number' });
          }
        }
      });
      
      // Validate request body
      if (endpoint.bodyParams) {
        const bodyEditor = document.getElementById('playground-body-editor');
        
        // Convert bodyParams object to array of [name, param] entries
        const bodyParamsArray = Object.entries(endpoint.bodyParams).map(([name, param]) => ({
          name,
          ...param
        }));
        
        // Check if any body params are required
        const hasRequiredParams = bodyParamsArray.some(p => p.required);
        
        if (bodyEditor && bodyEditor.value && bodyEditor.value.trim()) {
          try {
            const body = JSON.parse(bodyEditor.value);
            
            bodyParamsArray.forEach(param => {
              if (param.required && (body[param.name] === undefined || body[param.name] === null || body[param.name] === '')) {
                errors.push({ field: param.name, message: 'Body field "' + param.name + '" is required' });
              } else if (body[param.name] !== undefined) {
                // Type validation
                if (param.type === 'string' && typeof body[param.name] !== 'string') {
                  errors.push({ field: param.name, message: 'Body field "' + param.name + '" must be a string' });
                } else if (param.type === 'number' && typeof body[param.name] !== 'number') {
                  errors.push({ field: param.name, message: 'Body field "' + param.name + '" must be a number' });
                } else if (param.type === 'boolean' && typeof body[param.name] !== 'boolean') {
                  errors.push({ field: param.name, message: 'Body field "' + param.name + '" must be a boolean' });
                } else if (param.type === 'array' && !Array.isArray(body[param.name])) {
                  errors.push({ field: param.name, message: 'Body field "' + param.name + '" must be an array' });
                } else if (param.type === 'object' && (typeof body[param.name] !== 'object' || Array.isArray(body[param.name]) || body[param.name] === null)) {
                  errors.push({ field: param.name, message: 'Body field "' + param.name + '" must be an object' });
                }
                
                // URL validation
                if (param.name === 'destination_url' || param.name === 'url') {
                  if (!validateUrl(body[param.name])) {
                    errors.push({ field: param.name, message: 'Invalid URL format for "' + param.name + '"' });
                  }
                }
              }
            });
          } catch (e) {
            errors.push({ field: 'body', message: 'Invalid JSON in request body: ' + e.message });
          }
        } else if (hasRequiredParams) {
          errors.push({ field: 'body', message: 'Request body is required for this endpoint' });
        }
      }
      
      return { valid: errors.length === 0, errors };
    }
    
    function isValidId(id) {
      // Basic ID validation - alphanumeric, hyphens, underscores
      return /^[a-zA-Z0-9_-]+$/.test(id);
    }
    
    function validateUrl(url) {
      if (typeof url !== 'string') return false;
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    }
    
    function showValidationErrors(errors) {
      const errorDiv = document.getElementById('request-validation-errors');
      const errorList = document.getElementById('validation-errors-list');
      if (!errorDiv || !errorList) return;
      
      errorList.innerHTML = errors.map(e => '<li>' + e.message + '</li>').join('');
      errorDiv.style.display = 'block';
    }
    
    function hideValidationErrors() {
      const errorDiv = document.getElementById('request-validation-errors');
      if (errorDiv) {
        errorDiv.style.display = 'none';
      }
    }
    
    function highlightJson(jsonStr) {
      // Simple JSON syntax highlighting using regex
      return jsonStr
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
          let cls = 'json-number';
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'json-key';
            } else {
              cls = 'json-string';
            }
          } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
          } else if (/null/.test(match)) {
            cls = 'json-null';
          }
          return '<span class="' + cls + '">' + match + '</span>';
        })
        .replace(/([{}[\],:])/g, '<span class="json-punctuation">$1</span>');
    }
    
    function saveRequestToHistory(requestData) {
      try {
        const history = JSON.parse(localStorage.getItem('api-playground-history') || '{"requests":[],"maxItems":50}');
        const historyItem = {
          id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          ...requestData
        };
        
        history.requests.unshift(historyItem);
        if (history.requests.length > history.maxItems) {
          history.requests = history.requests.slice(0, history.maxItems);
        }
        
        localStorage.setItem('api-playground-history', JSON.stringify(history));
        loadRequestHistory();
      } catch (e) {
        console.error('Failed to save request to history:', e);
      }
    }
    
    function loadRequestHistory() {
      const historyList = document.getElementById('request-history-list');
      if (!historyList) return;
      
      try {
        const history = JSON.parse(localStorage.getItem('api-playground-history') || '{"requests":[]}');
        
        if (history.requests.length === 0) {
          historyList.innerHTML = '<p style="color: #666; text-align: center; padding: 1rem;">No requests yet. Send a request to see history.</p>';
          return;
        }
        
        // @ts-ignore - Template literal HTML generation
        historyList.innerHTML = history.requests.map(item => {
          const time = new Date(item.timestamp);
          const timeStr = time.toLocaleString();
          const methodClass = item.method.toLowerCase();
          const endpointName = apiEndpoints.find(ep => ep.id === item.endpoint)?.name || item.endpoint;
          
          return '<div class="history-item" onclick="loadRequestFromHistory(' + JSON.stringify(item.id) + ')">' +
            '<div style="display: flex; align-items: center; margin-bottom: 0.25rem;">' +
            '<span class="history-method ' + methodClass + '">' + item.method + '</span>' +
            '<span style="font-weight: 600;">' + endpointName + '</span>' +
            '</div>' +
            '<div class="history-time">' + timeStr + '</div>' +
            '</div>';
        }).join('');
      } catch (e) {
        console.error('Failed to load request history:', e);
        historyList.innerHTML = '<p style="color: #dc3545; text-align: center; padding: 1rem;">Failed to load history</p>';
      }
    }
    
    window.loadRequestFromHistory = function(historyId) {
      try {
        const history = JSON.parse(localStorage.getItem('api-playground-history') || '{"requests":[]}');
        const item = history.requests.find(r => r.id === historyId);
        if (!item) return;
        
        // Set endpoint
        const endpointSelect = document.getElementById('playground-endpoint');
        if (endpointSelect) {
          endpointSelect.value = item.endpoint;
          updateEndpointForm(item.endpoint);
        }
        
        // Set API key (placeholder - user needs to enter it)
        const apiKeyInput = document.getElementById('playground-api-key');
        if (apiKeyInput && item.headers && item.headers.Authorization) {
          // Extract partial key from history
          const authHeader = item.headers.Authorization;
          if (authHeader.includes('Bearer')) {
            apiKeyInput.value = authHeader.replace('Bearer ', '');
          }
        }
        
        // Set path parameters
        const endpoint = apiEndpoints.find(ep => ep.id === item.endpoint);
        if (endpoint) {
          endpoint.pathParams.forEach(param => {
            const input = document.getElementById('path-' + param.name);
            if (input) {
              // Extract from URL
              const urlParts = item.url.split('/');
              const pathParts = endpoint.path.split('/');
              const paramIndex = pathParts.findIndex(p => p === ':' + param.name);
              if (paramIndex >= 0 && urlParts[paramIndex]) {
                input.value = urlParts[paramIndex];
              }
            }
          });
          
          // Set query parameters
          const url = new URL(item.url);
          endpoint.queryParams.forEach(param => {
            const input = document.getElementById('query-' + param.name);
            if (input && url.searchParams.has(param.name)) {
              input.value = url.searchParams.get(param.name);
            }
          });
          
          // Set body
          if (item.body) {
            const bodyEditor = document.getElementById('playground-body-editor');
            if (bodyEditor) {
              bodyEditor.value = JSON.stringify(item.body, null, 2);
            }
          }
        }
        
        updateUrlPreview();
        updateSendButton();
        showToast('Request loaded from history', 'success');
      } catch (e) {
        console.error('Failed to load request from history:', e);
        showToast('Failed to load request from history', 'error');
      }
    };
    
    function clearRequestHistory() {
      if (!confirm('Clear all request history?')) return;
      
      try {
        localStorage.setItem('api-playground-history', JSON.stringify({ requests: [], maxItems: 50 }));
        loadRequestHistory();
        showToast('History cleared', 'success');
      } catch (e) {
        console.error('Failed to clear history:', e);
        showToast('Failed to clear history', 'error');
      }
    }
    
    function generateLlmTxt() {
      const baseUrl = window.location.origin + API_BASE;
      
      let doc = '# OpenShort.link API Documentation\\n\\n';
      doc += '## Overview\\n\\n';
      doc += 'This API provides comprehensive link management functionality including link shortening, domain management, tags, categories, analytics, and API key management.\\n\\n';
      doc += '## Base Information\\n\\n';
      doc += '**Base URL:** ' + baseUrl + '\\n\\n';
      doc += '**API Version:** v1\\n\\n';
      doc += '## Authentication\\n\\n';
      doc += 'All API requests require authentication using an API key in the Authorization header.\\n\\n';
      const codeBlock = String.fromCharCode(96, 96, 96);
      doc += codeBlock + '\\n';
      doc += 'Authorization: Bearer <your_api_key>\\n';
      doc += codeBlock + '\\n\\n';
      doc += '### API Key Requirements\\n\\n';
      doc += '- API keys must be active and not expired\\n';
      doc += '- Your IP address must be whitelisted (if IP whitelist is enabled)\\n';
      doc += '- Domain scoping applies - you can only access domains assigned to your API key\\n';
      const backtick = String.fromCharCode(96);
      doc += '- API keys are prefixed with ' + backtick + 'sk_live_' + backtick + '\\n\\n';
      doc += '### Getting an API Key\\n\\n';
      doc += '1. Log in to the dashboard\\n';
      doc += '2. Navigate to Integrations > API Keys\\n';
      doc += '3. Create a new API key\\n';
      doc += '4. Copy the key immediately (it will not be shown again)\\n\\n';

      doc += '## Error Handling\\n\\n';
      doc += 'All errors follow a consistent format:\\n\\n';
      doc += codeBlock + 'json\\n';
      doc += JSON.stringify({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: [{ path: 'field_name', message: 'Error details' }]
        }
      }, null, 2) + '\\n';
      doc += codeBlock + '\\n\\n';
      doc += '### Common Error Codes\\n\\n';
      const backtick3 = String.fromCharCode(96);
      doc += '- ' + backtick3 + '400' + backtick3 + ': Bad Request - Invalid parameters or malformed request\\n';
      doc += '- ' + backtick3 + '401' + backtick3 + ': Unauthorized - Invalid or missing API key\\n';
      doc += '- ' + backtick3 + '403' + backtick3 + ': Forbidden - Domain not allowed for this API key or insufficient permissions\\n';
      doc += '- ' + backtick3 + '404' + backtick3 + ': Not Found - Resource not found\\n';
      doc += '- ' + backtick3 + '408' + backtick3 + ': Request Timeout - Query took too long to execute\\n';
      doc += '- ' + backtick3 + '409' + backtick3 + ': Conflict - Resource already exists (e.g., slug already in use)\\n';
      doc += '- ' + backtick3 + '429' + backtick3 + ': Too Many Requests - Rate limit exceeded (failed auth attempts)\\n';
      doc += '- ' + backtick3 + '500' + backtick3 + ': Internal Server Error - Server error\\n\\n';
      doc += '## Response Format\\n\\n';
      doc += 'All successful responses follow this format:\\n\\n';
      doc += codeBlock + 'json\\n';
      doc += JSON.stringify({
        success: true,
        data: {},
        pagination: {
          total: 0,
          limit: 25,
          offset: 0,
          hasMore: false
        }
      }, null, 2) + '\\n';
      doc += codeBlock + '\\n\\n';
      doc += '## Pagination\\n\\n';
      const backtick4 = String.fromCharCode(96);
      doc += 'List endpoints support pagination using ' + backtick4 + 'limit' + backtick4 + ' and ' + backtick4 + 'offset' + backtick4 + ' query parameters:\\n';
      doc += '- ' + backtick4 + 'limit' + backtick4 + ': Number of results per page (1-10000 for links, 1-500 for other resources, default: 25)\\n';
      doc += '- ' + backtick4 + 'offset' + backtick4 + ': Number of results to skip (default: 0)\\n\\n';
      doc += 'Pagination information is included in the response:\\n';
      doc += '- ' + backtick4 + 'total' + backtick4 + ': Total number of results\\n';
      doc += '- ' + backtick4 + 'limit' + backtick4 + ': Results per page\\n';
      doc += '- ' + backtick4 + 'offset' + backtick4 + ': Current offset\\n';
      doc += '- ' + backtick4 + 'hasMore' + backtick4 + ': Whether there are more results\\n\\n';
      doc += '## Endpoints\\n\\n';
      
      apiEndpoints.forEach(endpoint => {
        doc += '### ' + endpoint.method + ' ' + endpoint.path + ' - ' + endpoint.name + '\\n\\n';
        doc += endpoint.description + '\\n\\n';
        
        if (endpoint.pathParams.length > 0) {
          doc += '**Path Parameters:**\\n';
          endpoint.pathParams.forEach(param => {
            const backtick = String.fromCharCode(96);
            doc += '- ' + backtick + param.name + backtick + ' (' + param.type + ', ' + (param.required ? 'required' : 'optional') + '): ' + param.description + '\\n';
          });
          doc += '\\n';
        }
        
        if (endpoint.queryParams.length > 0) {
          doc += '**Query Parameters:**\\n';
          endpoint.queryParams.forEach(param => {
            const backtick = String.fromCharCode(96);
            doc += '- ' + backtick + param.name + backtick + ' (' + param.type + ', ' + (param.required ? 'required' : 'optional') + '): ' + param.description + '\\n';
          });
          doc += '\\n';
        }
        
        if (endpoint.bodyParams) {
          doc += '**Request Body:**\\n';
          Object.entries(endpoint.bodyParams).forEach(([name, param]) => {
            const paramObj = typeof param === 'object' && param !== null ? param : { type: 'string', required: false, description: '' };
            const backtick = String.fromCharCode(96);
            doc += '- ' + backtick + name + backtick + ' (' + (paramObj.type || 'string') + ', ' + (paramObj.required ? 'required' : 'optional') + '): ' + (paramObj.description || '') + '\\n';
          });
          doc += '\\n';
        }
        
        if (endpoint.exampleRequest) {
          const codeBlock = String.fromCharCode(96, 96, 96);
          doc += '**Example Request:**\\n';
          doc += codeBlock + '\\n';
          if (endpoint.exampleRequest.body) {
            doc += JSON.stringify(endpoint.exampleRequest.body, null, 2) + '\\n';
          } else if (endpoint.exampleRequest.query) {
            doc += baseUrl + endpoint.path + endpoint.exampleRequest.query + '\\n';
          } else if (endpoint.exampleRequest.path) {
            doc += baseUrl + endpoint.exampleRequest.path + '\\n';
          }
          doc += codeBlock + '\\n\\n';
        }
        
        if (endpoint.exampleResponse) {
          const codeBlock = String.fromCharCode(96, 96, 96);
          doc += '**Example Response:**\\n';
          doc += codeBlock + 'json\\n';
          doc += JSON.stringify(endpoint.exampleResponse, null, 2) + '\\n';
          doc += codeBlock + '\\n\\n';
        }
        
        // Add response code information
        const successCode = endpoint.responseCode || (endpoint.method === 'POST' ? 201 : 200);
        const backtick5 = String.fromCharCode(96);
        doc += '**Response Code:**\\n';
        doc += '- ' + backtick5 + successCode + backtick5 + ': ' + (successCode === 201 ? 'Created - Resource created successfully' : 'OK - Successful response') + '\\n\\n';
        doc += '**Possible Errors:**\\n';
        doc += '- ' + backtick5 + '400' + backtick5 + ': Bad Request - Invalid parameters\\n';
        doc += '- ' + backtick5 + '401' + backtick5 + ': Unauthorized - Invalid or missing API key\\n';
        doc += '- ' + backtick5 + '403' + backtick5 + ': Forbidden - Domain not allowed for this API key\\n';
        doc += '- ' + backtick5 + '404' + backtick5 + ': Not Found - Resource not found\\n';
        if (['POST', 'PUT'].includes(endpoint.method)) {
          doc += '- ' + backtick5 + '409' + backtick5 + ': Conflict - Resource already exists\\n';
        }
        doc += '- ' + backtick5 + '429' + backtick5 + ': Too Many Requests - Rate limit exceeded\\n';
        doc += '- ' + backtick5 + '500' + backtick5 + ': Internal Server Error\\n\\n';
        
        doc += '---\\n\\n';
      });
      
      // Add additional sections
      doc += '## Best Practices\\n\\n';
      doc += '1. **Store API keys securely** - Never commit API keys to version control\\n';
      doc += '2. **Use domain scoping** - Limit API keys to specific domains when possible\\n';
      doc += '3. **Implement retry logic** - Handle rate limits and temporary errors gracefully\\n';
      doc += '4. **Validate inputs** - Validate all inputs before sending requests\\n';
      doc += '5. **Handle pagination** - Use pagination for large result sets\\n';
      doc += '6. **Monitor rate limits** - Check rate limit headers to avoid hitting limits\\n';
      doc += '7. **Use appropriate HTTP methods** - GET for retrieval, POST for creation, PUT for updates, DELETE for deletion\\n\\n';
      doc += '## Examples\\n\\n';
      doc += '### Creating a Link\\n\\n';
      doc += codeBlock + 'bash\\n';
      doc += 'curl -X POST ' + baseUrl + '/links \\\\n';
      doc += '  -H "Authorization: Bearer YOUR_API_KEY" \\\\n';
      doc += '  -H "Content-Type: application/json" \\\\n';
      doc += '  -d \\'{"domain_id": "domain_xxx", "destination_url": "https://example.com", "slug": "example"}\\'\\n';
      doc += codeBlock + '\\n\\n';
      doc += '### Listing Links with Filters\\n\\n';
      doc += codeBlock + 'bash\\n';
      doc += 'curl -X GET "' + baseUrl + '/links?domain_id=domain_xxx&status=active&limit=25" \\\\n';
      doc += '  -H "Authorization: Bearer YOUR_API_KEY"\\n';
      doc += codeBlock + '\\n\\n';
      doc += '### Getting Link Analytics\\n\\n';
      doc += codeBlock + 'bash\\n';
      doc += 'curl -X GET ' + baseUrl + '/analytics/links/link_xxx \\\\n';
      doc += '  -H "Authorization: Bearer YOUR_API_KEY"\\n';
      doc += codeBlock + '\\n\\n';
      doc += '## Support\\n\\n';
      doc += 'For issues, questions, or feature requests, please refer to the project documentation or contact support.\\n\\n';
      
      return doc;
    }
    
    function generateOpenaiJson() {
      const baseUrl = window.location.origin + API_BASE;
      
      // Build OpenAPI 3.0 spec
      const openapi = {
        openapi: '3.0.3',
        info: {
          title: 'OpenShort.link API',
          description: 'API for managing shortened links, domains, tags, categories, analytics, and API keys.',
          version: '1.0.0',
          contact: {
            name: 'API Support'
          }
        },
        servers: [
          {
            url: baseUrl,
            description: 'Production server'
          }
        ],
        components: {
          securitySchemes: {
            BearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'API Key',
              description: 'API key authentication. Format: Bearer <your_api_key>'
            }
          },
          schemas: {}
        },
        security: [
          {
            BearerAuth: []
          }
        ],
        paths: {}
      };
      
      // Group endpoints by path
      const pathsMap = {};
      
      apiEndpoints.forEach(endpoint => {
        // Convert path template to OpenAPI path
        let openapiPath = endpoint.path;
        endpoint.pathParams.forEach(param => {
          openapiPath = openapiPath.replace(':' + param.name, '{' + param.name + '}');
        });
        
        if (!pathsMap[openapiPath]) {
          pathsMap[openapiPath] = {};
        }
        
        const method = endpoint.method.toLowerCase();
        // Determine success response code (201 for POST creation, 200 for others)
        const successCode = endpoint.responseCode || (method === 'post' ? '201' : '200');
        const operation = {
          summary: endpoint.name,
          description: endpoint.description,
          operationId: endpoint.id.replace(/-/g, '_'),
          tags: [endpoint.path.split('/')[1] || 'default'],
          parameters: [],
          responses: {
            [successCode]: {
              description: method === 'post' ? 'Resource created successfully' : 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    example: endpoint.exampleResponse || {}
                  },
                  example: endpoint.exampleResponse || {}
                }
              }
            },
            '400': {
              description: 'Bad Request - Invalid parameters'
            },
            '401': {
              description: 'Unauthorized - Invalid or missing API key'
            },
            '403': {
              description: 'Forbidden - Domain not allowed for this API key'
            },
            '404': {
              description: 'Not Found - Resource not found'
            },
            '408': {
              description: 'Request Timeout - Query took too long to execute'
            },
            '409': {
              description: 'Conflict - Resource already exists'
            },
            '429': {
              description: 'Too Many Requests - Rate limit exceeded'
            },
            '500': {
              description: 'Internal Server Error'
            }
          }
        };
        
        // Add path parameters
        endpoint.pathParams.forEach(param => {
          operation.parameters.push({
            name: param.name,
            in: 'path',
            required: param.required,
            description: param.description,
            schema: {
              type: param.type === 'number' ? 'integer' : param.type === 'boolean' ? 'boolean' : 'string'
            }
          });
        });
        
        // Add query parameters
        endpoint.queryParams.forEach(param => {
          operation.parameters.push({
            name: param.name,
            in: 'query',
            required: param.required || false,
            description: param.description,
            schema: {
              type: param.type === 'number' ? 'integer' : param.type === 'boolean' ? 'boolean' : 'string'
            }
          });
        });
        
        // Add request body for POST/PUT
        if (['post', 'put', 'patch'].includes(method) && endpoint.bodyParams) {
          const bodyProperties = {};
          const bodyRequired = [];
          
          Object.entries(endpoint.bodyParams).forEach(([name, param]) => {
            const paramObj = typeof param === 'object' && param !== null ? param : { type: 'string', required: false, description: '' };
            const paramType = paramObj.type || 'string';
            
            let schema = {};
            if (paramType === 'number') {
              schema = { type: 'number' };
            } else if (paramType === 'boolean') {
              schema = { type: 'boolean' };
            } else if (paramType === 'array') {
              schema = { type: 'array', items: { type: 'string' } };
            } else if (paramType === 'object') {
              schema = { type: 'object', additionalProperties: true };
            } else if (paramType === 'file') {
              schema = { type: 'string', format: 'binary' };
            } else {
              schema = { type: 'string' };
            }
            
            bodyProperties[name] = {
              ...schema,
              description: paramObj.description || ''
            };
            
            if (paramObj.required) {
              bodyRequired.push(name);
            }
          });
          
          // Use multipart/form-data for file uploads
          const contentType = endpoint.fileUpload ? 'multipart/form-data' : 'application/json';
          
          operation.requestBody = {
            required: bodyRequired.length > 0,
            content: {
              [contentType]: {
                schema: {
                  type: 'object',
                  properties: bodyProperties,
                  required: bodyRequired.length > 0 ? bodyRequired : undefined
                },
                example: endpoint.fileUpload ? undefined : (endpoint.exampleRequest?.body || {})
              }
            }
          };
        }
        
        pathsMap[openapiPath][method] = operation;
      });
      
      openapi.paths = pathsMap;
      
      return JSON.stringify(openapi, null, 2);
    }
    
    function copyCurlRequest() {
      const endpointSelect = document.getElementById('playground-endpoint');
      const apiKeyInput = document.getElementById('playground-api-key');
      
      if (!endpointSelect || !endpointSelect.value || !apiKeyInput || !apiKeyInput.value.trim()) {
        showToast('Please select an endpoint and enter an API key first', 'error');
        return;
      }
      
      const endpoint = apiEndpoints.find(ep => ep.id === endpointSelect.value);
      if (!endpoint) return;
      
      // Build path
      let path = endpoint.path;
      endpoint.pathParams.forEach(param => {
        const input = document.getElementById('path-' + param.name);
        if (input && input.value) {
          path = path.replace(':' + param.name, input.value);
        }
      });
      
      // Build query string
      const queryParams = [];
      endpoint.queryParams.forEach(param => {
        const input = document.getElementById('query-' + param.name);
        if (input && input.value) {
          queryParams.push(param.name + '=' + encodeURIComponent(input.value));
        }
      });
      const queryString = queryParams.length > 0 ? '?' + queryParams.join('&') : '';
      
      // Build full URL
      const fullUrl = window.location.origin + API_BASE + path + queryString;
      const apiKey = apiKeyInput.value.trim();
      
      // Build curl command
      let curlCmd = 'curl -X ' + endpoint.method + ' \\\\n';
      curlCmd += '  "' + fullUrl + '" \\\\n';
      curlCmd += '  -H "Authorization: Bearer ' + apiKey + '" \\\\n';
      
      if (['POST', 'PUT'].includes(endpoint.method)) {
        const bodyEditor = document.getElementById('playground-body-editor');
        if (bodyEditor && bodyEditor.value && bodyEditor.value.trim()) {
          try {
            const body = JSON.parse(bodyEditor.value);
            curlCmd += '  -H "Content-Type: application/json" \\\\n';
            curlCmd += '  -d \\'' + JSON.stringify(body) + '\\'';
          } catch (e) {
            curlCmd += '  -H "Content-Type: application/json" \\\\n';
            curlCmd += '  -d \\'' + bodyEditor.value.replace(/'/g, "\\'\\\\'\\'") + '\\'';
          }
        } else if (endpoint.fileUpload) {
          const fileInput = document.getElementById('playground-file-input');
          if (fileInput && fileInput.files && fileInput.files[0]) {
            curlCmd += '  -F "file=@' + fileInput.files[0].name + '"';
          }
        }
      }
      
      copyToClipboard(curlCmd);
      showToast('cURL command copied to clipboard', 'success');
    }
    
    function copyLlmTxt() {
      const llmTxt = generateLlmTxt();
      copyToClipboard(llmTxt);
      showToast('LLM.txt documentation copied to clipboard', 'success');
    }
    
    function copyOpenaiJson() {
      const openaiJson = generateOpenaiJson();
      copyToClipboard(openaiJson);
      showToast('openai.json copied to clipboard', 'success');
    }
    
    function copyToClipboard(text) {
      // First check if 'text' is an element ID (for API docs copy buttons)
      const element = document.getElementById(text);
      if (element) {
        navigator.clipboard.writeText(element.textContent).then(() => {
          showToast('Copied to clipboard', 'success');
        });
      } else if (typeof text === 'string') {
        // Otherwise treat as literal text to copy
        navigator.clipboard.writeText(text).then(() => {
          showToast('Copied to clipboard', 'success');
        });
      }
    }
    
    window.copyToClipboard = copyToClipboard;
    
    
    // ============================================================================
    // END ANALYTICS SERVICE
    // ============================================================================
    
    // ============================================================================
    // STATUS MONITOR SERVICE - Link Health Monitoring
    // ============================================================================
    // This section contains link status monitoring and health check functions
    // ============================================================================
    
    let statusMonitorState = {
      currentPage: 1,
      perPage: 25,
      statusFilter: '',
      domainFilter: '',
      searchFilter: '',
      selectedLinks: new Set(),
    };
    
    async function loadStatusMonitor() {
      await loadStatusSummary();
      await loadStatusLinks();
      loadDomainsForStatusFilter();
      
      // Attach event listeners
      const statusFilter = document.getElementById('status-filter');
      const domainFilter = document.getElementById('status-domain-filter');
      const searchInput = document.getElementById('status-search');
      const perPageSelect = document.getElementById('status-per-page');
      const recheckBtn = document.getElementById('recheck-status-btn');
      
      if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
          // Set filter to empty string for "All Status Codes", otherwise use the selected value
          statusMonitorState.statusFilter = e.target.value || '';
          statusMonitorState.currentPage = 1;
          loadStatusLinks();
        });
      }
      
      if (domainFilter) {
        domainFilter.addEventListener('change', (e) => {
          statusMonitorState.domainFilter = e.target.value;
          statusMonitorState.currentPage = 1;
          loadStatusLinks();
        });
      }
      
      if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
          clearTimeout(searchTimeout);
          searchTimeout = setTimeout(() => {
            statusMonitorState.searchFilter = e.target.value;
            statusMonitorState.currentPage = 1;
            loadStatusLinks();
          }, 500);
        });
      }
      
      if (perPageSelect) {
        perPageSelect.addEventListener('change', (e) => {
          statusMonitorState.perPage = parseInt(e.target.value);
          statusMonitorState.currentPage = 1;
          loadStatusLinks();
        });
      }
      
      if (recheckBtn) {
        recheckBtn.addEventListener('click', async () => {
          const selected = Array.from(statusMonitorState.selectedLinks);
          if (selected.length === 0) {
            showToast('Please select links to recheck', 'error');
            return;
          }
          await recheckLinks(selected);
        });
      }
    }
    
    async function loadStatusSummary() {
      try {
        // Get summary from all status codes
        const summary = {};
        const statusCodes = [200, 301, 302, 404, 500];
        
        for (const code of statusCodes) {
          try {
            const response = await apiRequest('/links/status/' + code + '?limit=1');
            if (response.status_summary) {
              Object.assign(summary, response.status_summary);
            }
          } catch (e) {
            // Ignore errors for individual status codes
          }
        }
        
        // Update summary cards
        document.getElementById('status-count-200').textContent = summary['200'] || 0;
        document.getElementById('status-count-404').textContent = summary['404'] || 0;
        document.getElementById('status-count-500').textContent = summary['500'] || 0;
        // Note: timeout/unknown status cards removed from UI, no need to update them
      } catch (error) {
        console.error('Failed to load status summary:', error);
      }
    }
    
    async function loadStatusLinks() {
      const listDiv = document.getElementById('status-links-list');
      if (!listDiv) return;
      
      listDiv.innerHTML = '<p>Loading...</p>';
      
      try {
        // Use the new grouped-by-destination endpoint
        let url = '/links/grouped-by-destination?limit=' + statusMonitorState.perPage + '&offset=' + ((statusMonitorState.currentPage - 1) * statusMonitorState.perPage);
        if (statusMonitorState.domainFilter) url += '&domain_id=' + statusMonitorState.domainFilter;
        if (statusMonitorState.statusFilter) {
          const statusCode = statusMonitorState.statusFilter === 'timeout' || statusMonitorState.statusFilter === 'unknown' 
            ? null 
            : parseInt(statusMonitorState.statusFilter);
          if (statusCode) {
            url += '&status_code=' + statusCode;
          }
        }
        if (statusMonitorState.searchFilter) url += '&search=' + encodeURIComponent(statusMonitorState.searchFilter);
        
        const response = await apiRequest(url);
        const destinations = response.data || [];
        const pagination = response.pagination || {};
        
        // DEBUG: console.log('Status monitor response:', { destinations, pagination, response });
        
        if (destinations.length === 0) {
          listDiv.innerHTML = '<p style="text-align: center; padding: 2rem;">No destination URLs found. ' + (pagination.total > 0 ? 'Try adjusting your filters.' : 'Create some links first.') + '</p>';
          updateStatusPagination(pagination);
          return;
        }
        
        let html = '<table style="width: 100%; border-collapse: collapse; table-layout: fixed;"><thead><tr>';
        html += '<th class="resizable-column" data-column="statusDestination" style="width: var(--col-status-destination-width, 400px); position: relative; min-width: 200px; max-width: 800px; padding: 0.75rem; text-align: left; border-bottom: 2px solid #ddd;">Destination URL<div class="resize-handle" data-column="statusDestination"></div></th>';
        html += '<th style="width: 100px; padding: 0.75rem; text-align: left; border-bottom: 2px solid #ddd;">Slug Count</th>';
        html += '<th style="width: 100px; padding: 0.75rem; text-align: left; border-bottom: 2px solid #ddd;">Status Code</th>';
        html += '<th style="width: 160px; padding: 0.75rem; text-align: left; border-bottom: 2px solid #ddd;">Last Checked</th>';
        html += '<th style="width: 150px; padding: 0.75rem; text-align: left; border-bottom: 2px solid #ddd;">Actions</th>';
        html += '</tr></thead><tbody>';
        
        destinations.forEach(dest => {
          const statusCode = dest.status_code || 'Never';
          const lastChecked = dest.last_status_check_at 
            ? new Date(dest.last_status_check_at).toLocaleString() 
            : 'Never';
          const statusColor = statusCode === 200 ? '#28a745' : statusCode === 404 ? '#dc3545' : statusCode === 500 ? '#ffc107' : '#6c757d';
          
          html += '<tr>';
          html += '<td style="width: var(--col-status-destination-width, 400px); max-width: var(--col-status-destination-width, 400px); padding: 0.75rem; border-bottom: 1px solid #eee;">';
          html += '<a href="' + escapeHtml(dest.destination_url) + '" target="_blank" style="color: #007bff; text-decoration: none; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="' + escapeAttr(dest.destination_url) + '">' + escapeHtml(dest.destination_url) + '</a>';
          html += '</td>';
          html += '<td style="padding: 0.75rem; border-bottom: 1px solid #eee;">';
          html += '<span style="background: #e9ecef; color: #495057; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem; font-weight: 500;">' + dest.slug_count + ' slug' + (dest.slug_count !== 1 ? 's' : '') + '</span>';
          html += '</td>';
          html += '<td style="padding: 0.75rem; border-bottom: 1px solid #eee;">';
          html += '<span style="background: ' + statusColor + '; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem;">' + statusCode + '</span>';
          html += '</td>';
          html += '<td style="padding: 0.75rem; border-bottom: 1px solid #eee;">' + lastChecked + '</td>';
          html += '<td style="padding: 0.75rem; border-bottom: 1px solid #eee;">';
          html += '<div style="display: flex; gap: 0.5rem;">';
          html += '<button class="btn btn-sm btn-secondary view-slugs-btn" data-destination-url="' + escapeAttr(dest.destination_url) + '">View Slugs</button>';
          html += '<button class="btn btn-sm btn-primary edit-destination-btn" data-destination-url="' + escapeAttr(dest.destination_url) + '" data-link-ids="' + escapeAttr(dest.link_ids.join(',')) + '">Edit</button>';
          html += '</div>';
          html += '</td>';
          html += '</tr>';
        });
        
        html += '</tbody></table>';
        listDiv.innerHTML = html;
        
        // Attach event listeners for "View Slugs" buttons
        const viewSlugsButtons = document.querySelectorAll('.view-slugs-btn');
        viewSlugsButtons.forEach(btn => {
          btn.addEventListener('click', () => {
            const destinationUrl = btn.getAttribute('data-destination-url');
            if (destinationUrl) {
              viewSlugsForDestination(destinationUrl);
            }
          });
        });
        
        // Attach event listeners for "Edit" buttons (bulk edit)
        const editDestinationButtons = document.querySelectorAll('.edit-destination-btn');
        editDestinationButtons.forEach(btn => {
          btn.addEventListener('click', () => {
            const destinationUrl = btn.getAttribute('data-destination-url');
            const linkIds = btn.getAttribute('data-link-ids');
            if (destinationUrl && linkIds) {
              editLinkDestinationBulk(destinationUrl, linkIds.split(','));
            }
          });
        });
        
        updateStatusPagination(pagination);
      } catch (error) {
        console.error('Error loading status links:', error);
        const errorMessage = error.message || 'Unknown error';
        listDiv.innerHTML = '<p style="color: #dc3545;">Failed to load links: ' + escapeHtml(errorMessage) + '</p>';
        // Show error details in console for debugging
        if (error.response) {
          console.error('API Error Response:', error.response);
        }
      }
    }
    
    function updateStatusPagination(pagination) {
      const infoDiv = document.getElementById('status-pagination-info');
      
      if (infoDiv) {
        infoDiv.textContent = 'Showing ' + (pagination.count || 0) + ' of ' + (pagination.total || 0) + ' destination URLs';
      }
      
      // Use the extracted renderPagination function
      // Create a wrapper object that maps currentPage to page (expected by renderPagination)
      if (pagination.total > 0) {
        const stateWrapper = {
          page: statusMonitorState.currentPage,
          perPage: statusMonitorState.perPage
        };
        
        renderPagination(
          'status-pagination',
          stateWrapper,
          pagination.total,
          (page) => {
            statusMonitorState.currentPage = page;
            loadStatusLinks();
          }
        );
      } else {
        const controlsDiv = document.getElementById('status-pagination');
        if (controlsDiv) {
          controlsDiv.innerHTML = '';
        }
      }
    }
    
    function updateBulkActionButtons() {
      // Note: Bulk recheck is not available when viewing grouped destinations
      // Individual link recheck would require showing individual slugs
      const recheckBtn = document.getElementById('recheck-status-btn');
      if (recheckBtn) {
        recheckBtn.style.display = 'none';
      }
    }
    
    function filterByStatus(status) {
      const statusFilter = document.getElementById('status-filter');
      if (statusFilter) {
        // Convert status to string to match dropdown option values
        const statusValue = status === null || status === '' ? '' : String(status);
        statusFilter.value = statusValue;
        statusMonitorState.statusFilter = statusValue;
        statusMonitorState.currentPage = 1;
        loadStatusLinks();
      }
    }
    
    async function loadDomainsForStatusFilter() {
      const domainFilter = document.getElementById('status-domain-filter');
      if (!domainFilter) return;
      
      try {
        const response = await apiRequest('/domains');
        const domains = response.data || [];
        
        domainFilter.innerHTML = '<option value="">All Domains</option>';
        domains.forEach(domain => {
          const option = document.createElement('option');
          option.value = domain.id;
          option.textContent = domain.domain_name;
          domainFilter.appendChild(option);
        });
      } catch (error) {
        console.error('Failed to load domains:', error);
      }
    }
    
    async function recheckLinks(linkIds) {
      try {
        showToast('Rechecking ' + linkIds.length + ' links...', 'info');
        const response = await apiRequest('/links/check-status', {
          method: 'POST',
          body: JSON.stringify({ link_ids: linkIds }),
        });
        
        showToast('Recheck completed: ' + response.data.checked + ' links checked', 'success');
        statusMonitorState.selectedLinks.clear();
        await loadStatusSummary();
        await loadStatusLinks();
      } catch (error) {
        showToast('Failed to recheck links: ' + error.message, 'error');
      }
    }
    
    async function viewSlugsForDestination(destinationUrl) {
      // Navigate to the links-by-destination page instead of showing modal
      window.location.hash = 'links-by-destination?destination_url=' + encodeURIComponent(destinationUrl);
      showPage('links-by-destination');
    }
    
    let linksByDestinationState = {
      currentPage: 1,
      perPage: 25,
      destinationUrl: '',
    };
    
    async function showLinksByDestinationPage(destinationUrl) {
      linksByDestinationState.destinationUrl = destinationUrl;
      linksByDestinationState.currentPage = 1;
      
      const displayDiv = document.getElementById('destination-url-display');
      if (displayDiv) {
        displayDiv.innerHTML = '<strong>Destination URL:</strong> ' + escapeHtml(destinationUrl);
      }
      
      // Attach event listener for Back to Link Monitor button (CSP-compliant)
      const backBtn = document.getElementById('back-to-link-monitor-btn');
      if (backBtn) {
        // Remove existing listener if any to prevent duplicates
        backBtn.replaceWith(backBtn.cloneNode(true));
        const newBackBtn = document.getElementById('back-to-link-monitor-btn');
        newBackBtn.addEventListener('click', () => {
          showPage('status-monitor');
        });
      }
      
      await loadLinksByDestination();
    }
    
    async function loadLinksByDestination() {
      const listDiv = document.getElementById('links-by-destination-list');
      if (!listDiv || !linksByDestinationState.destinationUrl) return;
      
      listDiv.innerHTML = '<p>Loading...</p>';
      
      try {
        const response = await apiRequest('/links/by-destination?destination_url=' + encodeURIComponent(linksByDestinationState.destinationUrl) + '&limit=' + linksByDestinationState.perPage + '&offset=' + ((linksByDestinationState.currentPage - 1) * linksByDestinationState.perPage));
        const links = response.data || [];
        const pagination = response.pagination || {};
        
        if (links.length === 0) {
          listDiv.innerHTML = '<p style="text-align: center; padding: 2rem;">No links found for this destination URL.</p>';
          updateLinksByDestinationPagination(pagination);
          return;
        }
        
        let html = '<table style="width: 100%; border-collapse: collapse;"><thead><tr>';
        html += '<th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #ddd;">Domain</th>';
        html += '<th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #ddd;">Route</th>';
        html += '<th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #ddd;">Slug</th>';
        html += '<th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #ddd;">Status Code</th>';
        html += '<th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #ddd;">Last Checked</th>';
        html += '<th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid #ddd;">Actions</th>';
        html += '</tr></thead><tbody>';
        
        links.forEach(link => {
          const statusCode = link.last_status_code || 'Never';
          const lastChecked = link.last_status_check_at 
            ? new Date(link.last_status_check_at).toLocaleString() 
            : 'Never';
          const statusColor = statusCode === 200 ? '#28a745' : statusCode === 404 ? '#dc3545' : statusCode === 500 ? '#ffc107' : '#6c757d';
          
          let route = '';
          try {
            if (link.metadata) {
              const meta = JSON.parse(link.metadata);
              route = meta.route || '';
            }
          } catch (e) {}

          html += '<tr>';
          html += '<td style="padding: 0.75rem; border-bottom: 1px solid #eee;">' + escapeHtml(link.domain_name || '') + '</td>';
          html += '<td style="padding: 0.75rem; border-bottom: 1px solid #eee;"><code>' + escapeHtml(route) + '</code></td>';
          html += '<td style="padding: 0.75rem; border-bottom: 1px solid #eee;"><code>' + escapeHtml(link.slug || '') + '</code></td>';
          html += '<td style="padding: 0.75rem; border-bottom: 1px solid #eee;">';
          html += '<span style="background: ' + statusColor + '; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem;">' + statusCode + '</span>';
          html += '</td>';
          html += '<td style="padding: 0.75rem; border-bottom: 1px solid #eee;">' + lastChecked + '</td>';
          html += '<td style="padding: 0.75rem; border-bottom: 1px solid #eee;">';
          html += '<button class="btn btn-sm btn-primary edit-link-btn" data-link-id="' + escapeAttr(link.id) + '">Edit Link</button>';
          html += '</td>';
          html += '</tr>';
        });
        
        html += '</tbody></table>';
        listDiv.innerHTML = html;
        
        // Attach event listeners for Edit Link buttons (CSP-compliant)
        const editLinkButtons = document.querySelectorAll('.edit-link-btn');
        editLinkButtons.forEach(btn => {
          btn.addEventListener('click', () => {
            const linkId = btn.getAttribute('data-link-id');
            if (linkId) {
              editLink(linkId);
            }
          });
        });
        
        updateLinksByDestinationPagination(pagination);
      } catch (error) {
        listDiv.innerHTML = '<p style="color: #dc3545;">Failed to load links: ' + error.message + '</p>';
      }
    }
    
    function updateLinksByDestinationPagination(pagination) {
      const controlsDiv = document.getElementById('links-by-destination-pagination');
      
      if (controlsDiv && pagination.total > 0) {
        const totalPages = Math.ceil(pagination.total / linksByDestinationState.perPage);
        let html = '<div class="pagination-buttons">';
        
        // Previous button
        html += '<button class="pagination-btn" ' + (linksByDestinationState.currentPage === 1 ? 'disabled' : '') + ' onclick="linksByDestinationState.currentPage--; loadLinksByDestination();">Previous</button>';
        
        // Page numbers
        for (let i = 1; i <= Math.min(totalPages, 10); i++) {
          html += '<button class="pagination-btn ' + (i === linksByDestinationState.currentPage ? 'active' : '') + '" onclick="linksByDestinationState.currentPage = ' + i + '; loadLinksByDestination();">' + i + '</button>';
        }
        
        // Next button
        html += '<button class="pagination-btn" ' + (linksByDestinationState.currentPage >= totalPages ? 'disabled' : '') + ' onclick="linksByDestinationState.currentPage++; loadLinksByDestination();">Next</button>';
        html += '</div>';
        controlsDiv.innerHTML = html;
      } else if (controlsDiv) {
        controlsDiv.innerHTML = '';
      }
    }
    
    async function editLinkDestinationBulk(currentDestinationUrl, linkIds) {
      try {
        // Show modal for bulk editing destination URL
        let html = '<div class="modal active" id="bulk-edit-destination-modal">';
        html += '<div class="modal-content" style="max-width: 600px;">';
        html += '<span class="close" id="close-bulk-edit-modal">&times;</span>';
        html += '<h2>Bulk Edit Destination URL</h2>';
        html += '<p style="margin-bottom: 1rem; color: #666;">Update destination URL for <strong>' + linkIds.length + '</strong> link' + (linkIds.length !== 1 ? 's' : '') + '</p>';
        html += '<div style="margin-bottom: 1rem;">';
        html += '<label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Current Destination URL:</label>';
        html += '<input type="text" id="bulk-edit-current-url" value="' + escapeAttr(currentDestinationUrl) + '" readonly style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5;">';
        html += '</div>';
        html += '<div style="margin-bottom: 1rem;">';
        html += '<label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">New Destination URL:</label>';
        html += '<input type="url" id="bulk-edit-new-url" placeholder="https://example.com/new-page" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">';
        html += '</div>';
        html += '<div style="display: flex; gap: 0.5rem; justify-content: flex-end;">';
        html += '<button class="btn btn-secondary" id="cancel-bulk-edit-btn">Cancel</button>';
        html += '<button class="btn btn-primary" id="save-bulk-edit-btn">Update ' + linkIds.length + ' Link' + (linkIds.length !== 1 ? 's' : '') + '</button>';
        html += '</div>';
        html += '</div></div>';
        
        // Remove existing modal if any
        const existing = document.getElementById('bulk-edit-destination-modal');
        if (existing) existing.remove();
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', html);
        
        // Attach event listeners
        const closeBtn = document.getElementById('close-bulk-edit-modal');
        const cancelBtn = document.getElementById('cancel-bulk-edit-btn');
        const saveBtn = document.getElementById('save-bulk-edit-btn');
        const modal = document.getElementById('bulk-edit-destination-modal');
        
        const closeModal = () => {
          if (modal) modal.remove();
        };
        
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        
        if (modal) {
          modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
          });
        }
        
        if (saveBtn) {
          saveBtn.addEventListener('click', async () => {
            const newUrl = document.getElementById('bulk-edit-new-url').value.trim();
            if (!newUrl) {
              showToast('Please enter a new destination URL', 'error');
              return;
            }
            
            // Validate URL format
            try {
              new URL(newUrl);
            } catch (e) {
              showToast('Invalid URL format', 'error');
              return;
            }
            
            // Disable button and show loading
            saveBtn.disabled = true;
            saveBtn.textContent = 'Updating...';
            
            try {
              // Update all links
              let successCount = 0;
              let errorCount = 0;
              
              for (const linkId of linkIds) {
                try {
                  await apiRequest('/links/' + linkId, {
                    method: 'PUT',
                    body: JSON.stringify({ destination_url: newUrl }),
                  });
                  successCount++;
                } catch (error) {
                  console.error('Failed to update link ' + linkId + ':', error);
                  errorCount++;
                }
              }
              
              closeModal();
              
              if (errorCount === 0) {
                showToast('Successfully updated ' + successCount + ' link' + (successCount !== 1 ? 's' : ''), 'success');
              } else {
                showToast('Updated ' + successCount + ' link' + (successCount !== 1 ? 's' : '') + ', ' + errorCount + ' failed', 'error');
              }
              
              // Refresh the status monitor
              await loadStatusLinks();
            } catch (error) {
              showToast('Failed to update links: ' + error.message, 'error');
              saveBtn.disabled = false;
              saveBtn.textContent = 'Update ' + linkIds.length + ' Link' + (linkIds.length !== 1 ? 's' : '');
            }
          });
        }
      } catch (error) {
        showToast('Failed to open bulk edit modal: ' + error.message, 'error');
      }
    }
    
    
    // Make functions globally available
    window.filterByStatus = filterByStatus;
    window.viewSlugsForDestination = viewSlugsForDestination;
    window.loadLinksByDestination = loadLinksByDestination;
    window.editLinkDestinationBulk = editLinkDestinationBulk;
    
    // Initialize immediately when script loads (don't wait for DOMContentLoaded)
    // DEBUG: console.log('Dashboard script loaded');
    
    // Make sure functions are available immediately (before DOMContentLoaded)
    window.showPage = showPage;
    window.initNavigation = initNavigation;
    window.editLink = editLink;
    window.deleteLink = deleteLink;
    window.deleteTagGlobal = deleteTag;
    window.deleteCategoryGlobal = deleteCategory;
    window.toggleDomainStatus = toggleDomainStatus;
    window.editDomain = editDomain;
    
    document.addEventListener('DOMContentLoaded', async () => {
      // Initialize settings menu visibility based on user role
      await initializeSettingsMenuVisibility();
      // DEBUG: console.log('DOM Content Loaded - starting initialization');
      
      // Initialize navigation immediately
      try {
        initNavigation();
        // DEBUG: console.log('Navigation initialized');
      } catch (error) {
        console.error('Navigation init error:', error);
      }
      
      // Initialize sidebar toggle
      try {
        initSidebarToggle();
        // DEBUG: console.log('Sidebar toggle initialized');
      } catch (error) {
        console.error('Sidebar toggle init error:', error);
      }
      
      // Check auth
      try {
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) {
          // DEBUG: console.log('Not authenticated, redirecting...');
          return; // Will redirect in checkAuth
        }
        // DEBUG: console.log('Authentication successful');
        
        // Update UI visibility based on user role
        await updateUIVisibilityByRole();
      } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/dashboard/login';
        return;
      }
      
      // Initialize all components
      initCreateLinkModal();
      initApiKeyModal();
      initAddDomainModal();
      initSearchFilter();
      loadDomainSelector();
      
      // Analytics Overview button handlers
      const analyticsApplyBtn = document.getElementById('analytics-apply-btn');
      if (analyticsApplyBtn) {
        analyticsApplyBtn.addEventListener('click', loadAnalytics);
      }
      
      // Analytics quick range buttons
      document.querySelectorAll('#analytics-page .quick-ranges button').forEach(btn => {
        btn.addEventListener('click', function() {
          const range = this.dataset.range;
          const endDate = new Date();
          let startDate = new Date();
          
          if (range === '7d') {
            startDate.setDate(endDate.getDate() - 7);
          } else if (range === '30d') {
            startDate.setDate(endDate.getDate() - 30);
          } else if (range === '90d') {
            startDate.setDate(endDate.getDate() - 90);
          } else if (range === 'all') {
            startDate = new Date('2020-01-01');
          }
          
          document.getElementById('analytics-start-date').value = startDate.toISOString().slice(0, 10);
          document.getElementById('analytics-end-date').value = endDate.toISOString().slice(0, 10);
          loadAnalytics();
        });
      });
      
      // Analytics export button
      const analyticsExportBtn = document.getElementById('analytics-export-btn');
      if (analyticsExportBtn) {
        analyticsExportBtn.addEventListener('click', exportOverallAnalytics);
      }
      
      // Initialize analytics filter dropdowns
      initAnalyticsFilters();
      
      // Set default date range for analytics (last 30 days)
      const analyticsStartDate = document.getElementById('analytics-start-date');
      const analyticsEndDate = document.getElementById('analytics-end-date');
      if (analyticsStartDate && !analyticsStartDate.value) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        analyticsStartDate.value = startDate.toISOString().slice(0, 10);
      }
      if (analyticsEndDate && !analyticsEndDate.value) {
        analyticsEndDate.value = new Date().toISOString().slice(0, 10);
      }
      
      // Export button handler
      const exportLinksBtn = document.getElementById('export-links-btn');
      if (exportLinksBtn) {
        exportLinksBtn.addEventListener('click', exportLinks);
      }
      
      // Initialize CSV import modal
      initCSVImportModal();
      
      // Logout button handler (also handle via addEventListener for consistency)
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
      }
      
      // Initialize tags and categories
      initTagsInput();
      initTagsCategoriesModals();
      
      // Load tags and categories when domain changes
      const domainSelector = document.getElementById('domain-selector');
      if (domainSelector) {
        domainSelector.addEventListener('change', () => {
          loadTags();
          loadCategories();
        });
      }
      
      // Load tags and categories on page load
      loadTags();
      loadCategories();
      loadAllTagsForFilter(); // Load all tags for filter dropdown
      
      // Don't override hash-based routing - initNavigation already handles initial page load
      // showPage('dashboard'); // Removed - let hash routing handle it
    });
    
    // Export links function
    async function exportLinks() {
      try {
        showToast('Preparing export...', 'info');
        // Fetch all links with redirects included
        const response = await apiRequest('/links?limit=10000&include_redirects=true');
        const links = response.data || [];
        
        if (links.length === 0) {
          showToast('No links to export', 'error');
          return;
        }
        
        // 1. Collect all unique country codes from all links to build dynamic headers
        const countryCodesSet = new Set();
        links.forEach(function(link) {
          if (link.geo_redirects && Array.isArray(link.geo_redirects)) {
            link.geo_redirects.forEach(function(geo) {
              if (geo.country_code) countryCodesSet.add(geo.country_code);
            });
          }
        });
        const countryCodes = Array.from(countryCodesSet).sort();

        // 2. Create CSV Headers
        const fixedHeaders = [
          'Slug', 'Destination URL', 'Title', 'Description', 'Clicks', 'Status', 'Created', 'Redirect Code',
          'Route', 'Tags', 'Category', 
          'Mobile Redirect', 'Desktop Redirect', 'Tablet Redirect'
        ];
        
        const geoHeaders = countryCodes.map(function(code) { return 'Geo: ' + code; });
        const headers = fixedHeaders.concat(geoHeaders);

        // 3. Map Data Rows
        const rows = links.map(function(link) {
          // Helper to get device redirect URL
          function getDeviceUrl(type) {
            if (!link.device_redirects || !Array.isArray(link.device_redirects)) return '';
            const r = link.device_redirects.find(function(d) { return d.device_type === type; });
            return r ? r.destination_url : '';
          }

          // Helper to get geo redirect URL
          function getGeoUrl(code) {
            if (!link.geo_redirects || !Array.isArray(link.geo_redirects)) return '';
            const r = link.geo_redirects.find(function(g) { return g.country_code === code; });
            return r ? r.destination_url : '';
          }

          // Parse Route from metadata
          let route = '';
          if (link.metadata) {
            try {
              const meta = typeof link.metadata === 'string' ? JSON.parse(link.metadata) : link.metadata;
              if (meta && meta.route) route = meta.route;
            } catch (e) {}
          }

          // Tags (join names)
          const tags = (link.tags || []).map(function(t) { return t.name; }).join(', ');
          
          // Category
          const category = link.category ? link.category.name : '';

          const fixedData = [
            link.slug || '',
            link.destination_url || '',
            link.title || '',
            link.description || '',
            link.click_count || 0,
            link.status || '',
            new Date(link.created_at).toLocaleString(),
            link.redirect_code || 301,
            
            route,
            tags,
            category,
            
            getDeviceUrl('mobile'),
            getDeviceUrl('desktop'),
            getDeviceUrl('tablet'),
          ];

          const geoData = countryCodes.map(function(code) { return getGeoUrl(code); });

          return fixedData.concat(geoData);
        });
        
        // 4. Generate CSV String
        const csvContent = [
          headers.join(',')
        ].concat(rows.map(function(row) {
            return row.map(function(cell) {
              const cellStr = String(cell);
              let escaped = '';
              for (let i = 0; i < cellStr.length; i++) {
                if (cellStr.charCodeAt(i) === 34) {
                  escaped += String.fromCharCode(34) + String.fromCharCode(34);
                } else {
                  escaped += cellStr[i];
                }
              }
              return String.fromCharCode(34) + escaped + String.fromCharCode(34);
            }).join(',');
          })
        ).join(String.fromCharCode(10));
        
        // Create download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        const dateStr = new Date().toISOString().split('T')[0];
        link.setAttribute('download', 'links-export-' + dateStr + '.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Links exported successfully!', 'success');
      } catch (error) {
        showToast('Failed to export links: ' + error.message, 'error');
      }
    }
    // Expose to window for HTML access
    window.exportLinks = exportLinks;
    
    // CSV Import functionality
    let csvData = { headers: [], rows: [] };
    let columnMapping = {};
    let slugPrefixFilter = {}; // Store prefix filters per CSV column
    let currentDelimiter = ',';
    
    // Auto-detect delimiter from first line
    function detectDelimiter(firstLine) {
      const delimiters = [',', '\t', ';', '|'];
      let maxCount = 0;
      let detectedDelimiter = ',';
      
      for (const delim of delimiters) {
        // Count occurrences (but not inside quotes)
        let count = 0;
        let inQuotes = false;
        for (let i = 0; i < firstLine.length; i++) {
          if (firstLine[i] === '"') {
            inQuotes = !inQuotes;
          } else if (firstLine[i] === delim && !inQuotes) {
            count++;
          }
        }
        if (count > maxCount) {
          maxCount = count;
          detectedDelimiter = delim;
        }
      }
      
      return detectedDelimiter;
    }
    
    // Parse CSV line (handles quoted fields and custom delimiter)
    function parseCSVLine(line, delimiter) {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote
            current += '"';
            i++; // Skip next quote
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          // Field separator
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      
      // Add last field
      result.push(current);
      
      return result;
    }
    
    // Parse CSV file
    function parseCSV(csvText, delimiter) {
      // Handle both line ending types
      const lineEndingRegex = new RegExp('\\r?\\n');
      const lines = csvText.split(lineEndingRegex).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        throw new Error('File must have at least a header row and one data row');
      }
      
      // Auto-detect delimiter if needed
      let actualDelimiter = delimiter;
      if (delimiter === 'auto' || !delimiter) {
        actualDelimiter = detectDelimiter(lines[0]);
      }
      currentDelimiter = actualDelimiter;
      
      const headers = parseCSVLine(lines[0], actualDelimiter);
      const rows = [];
      
      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i], actualDelimiter);
        if (row.length > 0) {
          rows.push(row);
        }
      }
      
      return { headers, rows, delimiter: actualDelimiter };
    }
    
    // Country detection helper functions (frontend version)
    function detectCountryCodeFrontend(header) {
      const countryMappings = {
        'us': 'US', 'gb': 'GB', 'ca': 'CA', 'au': 'AU', 'de': 'DE', 'fr': 'FR', 'it': 'IT', 'es': 'ES',
        'jp': 'JP', 'cn': 'CN', 'in': 'IN', 'br': 'BR', 'mx': 'MX', 'nl': 'NL', 'se': 'SE', 'no': 'NO',
        'dk': 'DK', 'fi': 'FI', 'pl': 'PL', 'ru': 'RU', 'kr': 'KR', 'tr': 'TR', 'sa': 'SA', 'ae': 'AE',
        'il': 'IL', 'eg': 'EG', 'za': 'ZA', 'nz': 'NZ', 'sg': 'SG', 'hk': 'HK', 'my': 'MY', 'th': 'TH',
        'id': 'ID', 'ph': 'PH', 'vn': 'VN', 'ar': 'AR', 'cl': 'CL', 'co': 'CO', 've': 'VE', 'pe': 'PE',
        'at': 'AT', 'be': 'BE', 'ch': 'CH', 'cz': 'CZ', 'gr': 'GR', 'ie': 'IE', 'pt': 'PT',
        'usa': 'US', 'uk': 'GB', 'britain': 'GB', 'england': 'GB', 'deutschland': 'DE', 'korea': 'KR',
        'united states': 'US', 'united kingdom': 'GB', 'canada': 'CA', 'australia': 'AU', 'germany': 'DE',
        'france': 'FR', 'italy': 'IT', 'spain': 'ES', 'japan': 'JP', 'china': 'CN', 'india': 'IN',
        'brazil': 'BR', 'mexico': 'MX', 'netherlands': 'NL', 'sweden': 'SE', 'norway': 'NO', 'denmark': 'DK',
        'finland': 'FI', 'poland': 'PL', 'russia': 'RU', 'south korea': 'KR', 'turkey': 'TR',
        'saudi arabia': 'SA', 'united arab emirates': 'AE', 'israel': 'IL', 'egypt': 'EG',
        'south africa': 'ZA', 'new zealand': 'NZ', 'singapore': 'SG', 'hong kong': 'HK',
        'malaysia': 'MY', 'thailand': 'TH', 'indonesia': 'ID', 'philippines': 'PH', 'vietnam': 'VN',
        'argentina': 'AR', 'chile': 'CL', 'colombia': 'CO', 'venezuela': 'VE', 'peru': 'PE',
        'austria': 'AT', 'belgium': 'BE', 'switzerland': 'CH', 'czech republic': 'CZ',
        'greece': 'GR', 'ireland': 'IE', 'portugal': 'PT',
        'united_states': 'US', 'united_kingdom': 'GB', 'south_korea': 'KR', 'new_zealand': 'NZ',
        'saudi_arabia': 'SA', 'united_arab_emirates': 'AE', 'south_africa': 'ZA', 'hong_kong': 'HK',
        'czech_republic': 'CZ', 'united-states': 'US', 'united-kingdom': 'GB', 'south-korea': 'KR',
        'new-zealand': 'NZ', 'saudi-arabia': 'SA', 'united-arab-emirates': 'AE', 'south-africa': 'ZA',
        'hong-kong': 'HK', 'czech-republic': 'CZ', 'unitedstates': 'US', 'unitedkingdom': 'GB',
        'southkorea': 'KR', 'newzealand': 'NZ', 'saudiarabia': 'SA', 'unitedarabemirates': 'AE',
        'southafrica': 'ZA', 'hongkong': 'HK', 'czechrepublic': 'CZ',
      };
      
      const original = header.trim();
      let clean = original.toLowerCase();
      
      const suffixes = [' url', ' link', ' page', '_url', '_link', '_page', '-url', '-link', '-page', 'url', 'link', 'page'];
      
      let withoutSuffix = clean;
      for (const suffix of suffixes) {
        if (clean.endsWith(suffix)) {
          withoutSuffix = clean.slice(0, -suffix.length).trim();
          withoutSuffix = withoutSuffix.replace(/[_-]+$/, '');
          break;
        }
      }
      
      if (countryMappings[withoutSuffix]) return countryMappings[withoutSuffix];
      
      const withUnderscores = withoutSuffix.replace(/\s+/g, '_');
      if (countryMappings[withUnderscores]) return countryMappings[withUnderscores];
      
      const withHyphens = withoutSuffix.replace(/\s+/g, '-');
      if (countryMappings[withHyphens]) return countryMappings[withHyphens];
      
      const normalized = withoutSuffix.replace(/[\s_-]/g, '');
      if (countryMappings[normalized]) return countryMappings[normalized];
      
      if (withoutSuffix.length === 2) {
        const upperCode = withoutSuffix.toUpperCase();
        if (countryMappings[withoutSuffix]) return upperCode;
      }
      
      return null;
    }
    
    function getCountryNameFrontend(countryCode) {
      const names = {
        'US': 'United States', 'GB': 'United Kingdom', 'CA': 'Canada', 'AU': 'Australia',
        'DE': 'Germany', 'FR': 'France', 'IT': 'Italy', 'ES': 'Spain', 'JP': 'Japan',
        'CN': 'China', 'IN': 'India', 'BR': 'Brazil', 'MX': 'Mexico', 'NL': 'Netherlands',
        'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark', 'FI': 'Finland', 'PL': 'Poland',
        'RU': 'Russia', 'KR': 'South Korea', 'TR': 'Turkey', 'SA': 'Saudi Arabia',
        'AE': 'United Arab Emirates', 'IL': 'Israel', 'EG': 'Egypt', 'ZA': 'South Africa',
        'NZ': 'New Zealand', 'SG': 'Singapore', 'HK': 'Hong Kong', 'MY': 'Malaysia',
        'TH': 'Thailand', 'ID': 'Indonesia', 'PH': 'Philippines', 'VN': 'Vietnam',
        'AR': 'Argentina', 'CL': 'Chile', 'CO': 'Colombia', 'VE': 'Venezuela', 'PE': 'Peru',
        'AT': 'Austria', 'BE': 'Belgium', 'CH': 'Switzerland', 'CZ': 'Czech Republic',
        'GR': 'Greece', 'IE': 'Ireland', 'PT': 'Portugal',
      };
      return names[countryCode] || countryCode;
    }
    
    // Generate column mapping UI
    function generateColumnMapping(csvHeaders) {
      const container = document.getElementById('column-mapping-container');
      container.innerHTML = '';
      
      const linkFields = [
        { value: 'destination_url', label: 'Destination URL', required: true },
        { value: 'slug', label: 'Slug (optional)', required: false },
        { value: 'title', label: 'Title (optional)', required: false },
        { value: 'description', label: 'Description (optional)', required: false },
        { value: 'redirect_code', label: 'Redirect Code (optional)', required: false },
        { value: 'category_id', label: 'Category ID (optional)', required: false },
        { value: 'tags', label: 'Tags (optional, comma-separated)', required: false },
        { value: 'route', label: 'Route (optional)', required: false },
        { value: 'device_redirect:mobile', label: '📱 Mobile Redirect', required: false },
        { value: 'device_redirect:desktop', label: '💻 Desktop Redirect', required: false },
        { value: 'device_redirect:tablet', label: '📲 Tablet Redirect', required: false },
      ];
      
      // Auto-detect geo and device redirect columns
      const geoColumns = [];
      const deviceColumns = [];
      const validDeviceTypes = ['desktop', 'mobile', 'tablet'];
      const deviceSuffixes = [' url', ' link', ' page', '_url', '_link', '_page', '-url', '-link', '-page', 'url', 'link', 'page'];
      
      csvHeaders.forEach(header => {
        const original = header.trim();
        const cleanHeader = original.toLowerCase();
        
        // Try to detect country using comprehensive detection
        const countryCode = detectCountryCodeFrontend(original);
        if (countryCode) {
          geoColumns.push({ header, countryCode, countryName: getCountryNameFrontend(countryCode) });
          return; // Skip device detection if country detected
        }
        
        // Check for device pattern with various suffixes
        let withoutSuffix = cleanHeader;
        for (const suffix of deviceSuffixes) {
          if (cleanHeader.endsWith(suffix)) {
            withoutSuffix = cleanHeader.slice(0, -suffix.length).trim();
            withoutSuffix = withoutSuffix.replace(/[_-]+$/, ''); // Remove trailing separators
            break;
          }
        }
        
        // Check if it matches a device type
        if (validDeviceTypes.includes(withoutSuffix)) {
          deviceColumns.push({ header, device: withoutSuffix });
        }
      });
      
      // Show summary of detected redirects
      if (geoColumns.length > 0 || deviceColumns.length > 0) {
        const summaryDiv = document.createElement('div');
        summaryDiv.style.cssText = 'grid-column: 1 / -1; background: #e3f2fd; padding: 1rem; border-radius: 4px; margin-bottom: 1rem; border-left: 4px solid #2196f3;';
        
        let summaryHtml = '<strong style="color: #1565c0;">🌍 Auto-detected Redirect Columns:</strong><br>';
        
        if (geoColumns.length > 0) {
          summaryHtml += '<span style="color: #424242; margin-left: 1.5rem;">• Geo redirects:</span><br>';
          geoColumns.forEach(g => {
            summaryHtml += '<span style="color: #666; margin-left: 3rem; font-size: 0.9rem;">- "' + escapeHtml(g.header) + '" → ' + g.countryName + ' (' + g.countryCode + ')</span><br>';
          });
        }
        
        if (deviceColumns.length > 0) {
          summaryHtml += '<span style="color: #424242; margin-left: 1.5rem;">• Device redirects:</span><br>';
          deviceColumns.forEach(d => {
            summaryHtml += '<span style="color: #666; margin-left: 3rem; font-size: 0.9rem;">- "' + escapeHtml(d.header) + '" → ' + d.device.charAt(0).toUpperCase() + d.device.slice(1) + '</span><br>';
          });
        }
        
        summaryHtml += '<small style="color: #666; margin-left: 1.5rem; display: block; margin-top: 0.5rem;">These will be automatically imported. No mapping needed!</small>';
        summaryDiv.innerHTML = summaryHtml;
        container.appendChild(summaryDiv);
      }
      
      // Create mapping for each CSV column (excluding auto-detected redirect columns)
      csvHeaders.forEach(csvHeader => {
        const cleanHeader = csvHeader.trim().toLowerCase();
        
        // Skip auto-detected redirect columns
        const isGeoColumn = geoColumns.some(g => g.header === csvHeader);
        const isDeviceColumn = deviceColumns.some(d => d.header === csvHeader);
        
        if (isGeoColumn || isDeviceColumn) {
          return; // Skip this column, it's auto-detected
        }
        
        const mappingDiv = document.createElement('div');
        mappingDiv.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem;';
        
        const csvLabel = document.createElement('label');
        csvLabel.textContent = 'CSV Column: ' + csvHeader;
        csvLabel.style.fontWeight = '500';
        mappingDiv.appendChild(csvLabel);
        
        const select = document.createElement('select');
        select.className = 'form-group';
        select.id = 'mapping-' + escapeAttr(csvHeader);
        select.innerHTML = '<option value="">-- Not mapped --</option>';
        linkFields.forEach(field => {
          const option = document.createElement('option');
          option.value = field.value;
          option.textContent = field.label + (field.required ? ' *' : '');
          select.appendChild(option);
        });
        mappingDiv.appendChild(select);
        
        // Add prefix filter input for slug field
        const prefixDiv = document.createElement('div');
        prefixDiv.id = 'prefix-' + escapeAttr(csvHeader);
        prefixDiv.style.cssText = 'display: none; margin-top: 0.25rem;';
        const prefixLabel = document.createElement('label');
        prefixLabel.textContent = 'Slug Prefix Filter (e.g., "go/")';
        prefixLabel.style.fontSize = '0.875rem';
        prefixLabel.style.color = '#666';
        prefixDiv.appendChild(prefixLabel);
        const prefixInput = document.createElement('input');
        prefixInput.type = 'text';
        prefixInput.placeholder = 'Enter prefix (e.g., go/)';
        prefixInput.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.875rem; margin-top: 0.25rem;';
        prefixInput.id = 'prefix-input-' + escapeAttr(csvHeader);
        prefixInput.addEventListener('input', () => {
          updateColumnMapping();
          if (csvData) {
            generatePreview(csvData);
          }
        });
        prefixDiv.appendChild(prefixInput);
        mappingDiv.appendChild(prefixDiv);
        
        // Show/hide prefix input when slug is selected
        select.addEventListener('change', () => {
          if (select.value === 'slug') {
            prefixDiv.style.display = 'block';
          } else {
            prefixDiv.style.display = 'none';
            prefixInput.value = '';
          }
          updateColumnMapping();
          if (csvData) {
            generatePreview(csvData);
          }
        });
        
        container.appendChild(mappingDiv);
      });
    }
    
    // Generate CSV preview
    function generatePreview(csvData) {
      const previewContainer = document.getElementById('csv-preview-table');
      const previewRows = csvData.rows.slice(0, 5); // First 5 rows
      
      // Update column mapping to get current mappings
      updateColumnMapping();
      
      // Auto-detect redirect columns using comprehensive detection
      const validDeviceTypes = ['desktop', 'mobile', 'tablet'];
      const deviceSuffixes = [' url', ' link', ' page', '_url', '_link', '_page', '-url', '-link', '-page', 'url', 'link', 'page'];
      
      let html = '<table style="width: 100%; border-collapse: collapse; font-size: 0.875rem;">';
      html += '<thead><tr>';
      csvData.headers.forEach(header => {
        const cleanHeader = header.trim().toLowerCase();
        const isSlugMapped = columnMapping[header] === 'slug';
        const hasPrefixFilter = isSlugMapped && slugPrefixFilter[header];
        
        // Check if it's a geo or device redirect column using comprehensive detection
        const countryCode = detectCountryCodeFrontend(header);
        const isGeoColumn = !!countryCode;
        
        let isDeviceColumn = false;
        let withoutSuffix = cleanHeader;
        for (const suffix of deviceSuffixes) {
          if (cleanHeader.endsWith(suffix)) {
            withoutSuffix = cleanHeader.slice(0, -suffix.length).trim();
            withoutSuffix = withoutSuffix.replace(/[_-]+$/, '');
            break;
          }
        }
        if (validDeviceTypes.includes(withoutSuffix)) {
          isDeviceColumn = true;
        }
        
        let headerText = header;
        let bgColor = '#f8f9fa';
        
        if (hasPrefixFilter) {
          headerText += ' <span style="color: #007bff; font-size: 0.75rem;">(extracted)</span>';
        } else if (isGeoColumn) {
          const countryName = getCountryNameFrontend(countryCode);
          headerText += ' <span style="color: #2e7d32; font-size: 0.75rem;">🌍 ' + countryName + '</span>';
          bgColor = '#e8f5e9';
        } else if (isDeviceColumn) {
          headerText += ' <span style="color: #1565c0; font-size: 0.75rem;">📱 ' + withoutSuffix.charAt(0).toUpperCase() + withoutSuffix.slice(1) + '</span>';
          bgColor = '#e3f2fd';
        }
        
        html += '<th style="padding: 0.5rem; border: 1px solid #ddd; background: ' + bgColor + '; text-align: left;">' + headerText + '</th>';
      });
      html += '</tr></thead><tbody>';
      
      previewRows.forEach(row => {
        html += '<tr>';
        csvData.headers.forEach((header, index) => {
          let displayValue = row[index] || '';
          
          // Apply slug extraction if this column is mapped to slug and has prefix filter
          if (columnMapping[header] === 'slug' && slugPrefixFilter[header]) {
            const extracted = extractSlugFromValue(displayValue, slugPrefixFilter[header]);
            if (extracted !== displayValue) {
              // Show original with extracted value below
              displayValue = '<div><span style="color: #666; font-size: 0.75rem; text-decoration: line-through;">' + escapeHtml(displayValue) + '</span><br><span style="color: #007bff; font-weight: 600;">' + escapeHtml(extracted) + '</span></div>';
            } else {
              displayValue = escapeHtml(displayValue);
            }
          } else {
            displayValue = escapeHtml(displayValue);
          }
          
          html += '<td style="padding: 0.5rem; border: 1px solid #ddd;">' + displayValue + '</td>';
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
      
      if (csvData.rows.length > 5) {
        html += '<p style="margin-top: 0.5rem; color: #666; font-size: 0.875rem;">... and ' + (csvData.rows.length - 5) + ' more rows</p>';
      }
      
      previewContainer.innerHTML = html;
    }
    
    // Update column mapping object
    function updateColumnMapping() {
      columnMapping = {};
      slugPrefixFilter = {};
      csvData.headers.forEach(csvHeader => {
        const select = document.getElementById('mapping-' + escapeAttr(csvHeader));
        if (select && select.value) {
          columnMapping[csvHeader] = select.value;
          
          // Store prefix filter if slug is mapped
          if (select.value === 'slug') {
            const prefixInput = document.getElementById('prefix-input-' + escapeAttr(csvHeader));
            if (prefixInput && prefixInput.value.trim()) {
              slugPrefixFilter[csvHeader] = prefixInput.value.trim();
            }
          }
        }
      });
    }
    
    // Extract slug from value using prefix filter
    function extractSlugFromValue(value, prefix) {
      if (!value || !prefix) return value;
      
      // Remove trailing slash from prefix if present
      const cleanPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
      const prefixWithSlash = cleanPrefix + '/';
      
      // Escape regex special characters in prefix (escape backslash and special chars)
      let escapedPrefix = '';
      const backslashCode = 92; // ASCII code for backslash
      for (let i = 0; i < cleanPrefix.length; i++) {
        const char = cleanPrefix[i];
        const charCode = char.charCodeAt(0);
        if (char === '.' || char === '*' || char === '+' || char === '?' || char === '^' || char === '$' || char === '{' || char === '}' || char === '(' || char === ')' || char === '|' || char === '[' || char === ']' || charCode === backslashCode) {
          escapedPrefix += '\\\\' + char;
        } else {
          escapedPrefix += char;
        }
      }
      
      // Find prefix in ORIGINAL string using case-insensitive regex
      const regex = new RegExp(escapedPrefix + '/', 'i');
      const match = regex.exec(value);
      
      if (match && match.index !== undefined) {
        // Extract from original string at the correct position
        const afterPrefix = value.substring(match.index + prefixWithSlash.length);
        const extracted = afterPrefix.split('/')[0].trim();
        return extracted || value; // Return extracted, or original if somehow empty
      }
      
      // Try without trailing slash if prefix with slash not found
      const regexWithoutSlash = new RegExp(escapedPrefix, 'i');
      const matchWithoutSlash = regexWithoutSlash.exec(value);
      
      if (matchWithoutSlash && matchWithoutSlash.index !== undefined) {
        const afterPrefix = value.substring(matchWithoutSlash.index + cleanPrefix.length);
        const extracted = afterPrefix.startsWith('/') 
          ? afterPrefix.substring(1).split('/')[0].trim()
          : afterPrefix.split('/')[0].trim();
        return extracted || value;
      }
      
      return value; // Return original if prefix not found
    }
    
    // Initialize CSV import modal
    function initCSVImportModal() {
      const modal = document.getElementById('import-csv-modal');
      const importBtn = document.getElementById('import-links-btn');
      const closeBtn = modal.querySelector('.close');
      const cancelBtn = document.getElementById('import-csv-cancel-btn');
      const fileInput = document.getElementById('csv-file');
      const submitBtn = document.getElementById('import-csv-submit-btn');
      
      // Open modal
      importBtn?.addEventListener('click', async () => {
        modal.classList.add('active');
        await loadDomainsForImport();
        // Reset form
        document.getElementById('csv-file').value = '';
        document.getElementById('import-domain').value = '';
        document.getElementById('csv-delimiter').value = 'auto';
        document.getElementById('csv-delimiter-custom').value = '';
        document.getElementById('csv-delimiter-custom').style.display = 'none';
        document.getElementById('csv-preview-section').style.display = 'none';
        document.getElementById('import-csv-submit-btn').style.display = 'none';
        document.getElementById('import-results').style.display = 'none';
        csvData = { headers: [], rows: [] };
        columnMapping = {};
        slugPrefixFilter = {};
        currentDelimiter = ',';
      });
      
      // Close modal
      closeBtn?.addEventListener('click', () => {
        modal.classList.remove('active');
      });
      
      cancelBtn?.addEventListener('click', () => {
        modal.classList.remove('active');
      });
      
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
      
      // Handle delimiter change
      const delimiterSelect = document.getElementById('csv-delimiter');
      const customDelimiterInput = document.getElementById('csv-delimiter-custom');
      
      delimiterSelect?.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
          customDelimiterInput.style.display = 'block';
        } else {
          customDelimiterInput.style.display = 'none';
        }
        // Re-parse if file is already loaded
        if (fileInput.files && fileInput.files[0]) {
          fileInput.dispatchEvent(new Event('change'));
        }
      });
      
      // Handle file selection
      fileInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          showToast('File too large. Maximum size is 5MB.', 'error');
          fileInput.value = ''; // Clear input
          return;
        }
        
        try {
          const text = await file.text();
          
          // Get selected delimiter
          let delimiter = delimiterSelect.value;
          if (delimiter === 'custom') {
            delimiter = customDelimiterInput.value;
            if (!delimiter) {
              showToast('Please enter a custom delimiter', 'error');
              return;
            }
          } else if (delimiter === '\\t') {
            delimiter = '\t';
          }
          
          csvData = parseCSV(text, delimiter);
          
          // Update delimiter selector to show detected delimiter
          if (delimiter === 'auto' && csvData.delimiter) {
            const detectedValue = csvData.delimiter === '\t' ? '\\t' : csvData.delimiter;
            const option = Array.from(delimiterSelect.options).find(opt => opt.value === detectedValue || opt.value === csvData.delimiter);
            if (option) {
              delimiterSelect.value = option.value;
            }
          }
          
          // Generate mapping UI
          generateColumnMapping(csvData.headers);
          
          // Generate preview
          generatePreview(csvData);
          
          // Show preview section
          document.getElementById('csv-preview-section').style.display = 'block';
          document.getElementById('import-csv-submit-btn').style.display = 'block';
          
          // Update mapping when selects change
          csvData.headers.forEach(csvHeader => {
            const select = document.getElementById('mapping-' + escapeAttr(csvHeader));
            if (select) {
              select.addEventListener('change', () => {
                updateColumnMapping();
                generatePreview(csvData);
              });
            }
          });
          
          // Initial mapping update
          updateColumnMapping();
        } catch (error) {
          showToast('Failed to parse file: ' + error.message, 'error');
        }
      });
      
      // Submit import
      submitBtn?.addEventListener('click', async () => {
        const domainId = document.getElementById('import-domain').value;
        if (!domainId) {
          showToast('Please select a domain', 'error');
          return;
        }
        
        updateColumnMapping();
        
        // Check if destination_url is mapped (required)
        const hasDestinationUrl = Object.values(columnMapping).includes('destination_url');
        if (!hasDestinationUrl) {
          showToast('Destination URL must be mapped from a CSV column', 'error');
          return;
        }
        
        try {
          setLoading('import-csv-form', true);
          submitBtn.disabled = true;
          
          // Get delimiter
          let delimiter = delimiterSelect.value;
          if (delimiter === 'custom') {
            delimiter = customDelimiterInput.value;
          } else if (delimiter === 'auto') {
            delimiter = currentDelimiter || ',';
          } else if (delimiter === '\\t') {
            delimiter = '\t';
          }
          
          // Show progress modal
          const progressModal = document.getElementById('import-progress-modal');
          const progressBar = document.getElementById('progress-bar');
          const progressText = document.getElementById('progress-text');
          const progressPercent = document.getElementById('progress-percent');
          const progressComplete = document.getElementById('progress-complete');
          
          progressModal.classList.add('active');
          progressBar.style.width = '0%';
          progressBar.style.background = '#007bff';
          progressPercent.textContent = '0%';
          progressText.textContent = 'Preparing import...';
          progressComplete.style.display = 'none';
          document.getElementById('progress-ok-btn').textContent = 'OK';
          
          // Chunking configuration
          const CHUNK_SIZE = 100; // Rows per chunk
          const totalRows = csvData.rows.length;
          const totalChunks = Math.ceil(totalRows / CHUNK_SIZE);
          
          let successCount = 0;
          let errorCount = 0;
          let processedRows = 0;
          const allResults = [];
          
          const token = getAuthToken();
          
          // Process chunks sequentially
          for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const startRow = chunkIndex * CHUNK_SIZE;
            const endRow = Math.min(startRow + CHUNK_SIZE, totalRows);
            const chunkRows = csvData.rows.slice(startRow, endRow);
            
            // Create CSV string for this chunk (header + rows)
            // We need to reconstruct a valid CSV file for each chunk
            const headerLine = csvData.headers.join(delimiter);
            const chunkLines = chunkRows.map(row => {
              // Simple CSV escaping if needed (basic implementation)
              return row.map(cell => {
                const q = String.fromCharCode(34);
                const newline = String.fromCharCode(10);
                if (cell.includes(delimiter) || cell.includes(q) || cell.includes(newline)) {
                  return q + cell.split(q).join(q + q) + q;
                }
                return cell;
              }).join(delimiter);
            });

const chunkCsvContent = [headerLine, ...chunkLines].join(String.fromCharCode(10));
const chunkFile = new File([chunkCsvContent], 'chunk_' + chunkIndex + '.csv', { type: 'text/csv' });

// Update progress
progressText.textContent = 'Processing chunk ' + (chunkIndex + 1) + ' of ' + totalChunks + '...';

// Create FormData for this chunk
const formData = new FormData();
formData.append('file', chunkFile);
formData.append('domain_id', domainId);
formData.append('column_mapping', JSON.stringify(columnMapping));
formData.append('slug_prefix_filter', JSON.stringify(slugPrefixFilter));
formData.append('delimiter', delimiter);

try {
  const response = await fetch(API_BASE + '/links/import', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
    },
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Chunk ' + (chunkIndex + 1) + ' failed');
  }

  const result = await response.json();
  successCount += result.data.success || 0;
  errorCount += result.data.errors || 0;
  if (result.data.results) {
    allResults.push(...result.data.results);
  }

} catch (error) {
  console.error('Error processing chunk ' + chunkIndex + ': ', error);
  errorCount += chunkRows.length; // Assume all failed in this chunk
  allResults.push({ success: false, error: error.message, chunk: chunkIndex });
}

// Update progress bar
processedRows = endRow;
const progress = (processedRows / totalRows) * 100;
progressBar.style.width = progress + '%';
progressPercent.textContent = Math.round(progress) + '%';
          }

// Finalize
progressBar.style.width = '100%';
progressPercent.textContent = '100%';

const total = totalRows;

// Update progress text based on results
if (errorCount === 0) {
  progressText.textContent = 'Import completed successfully! ' + successCount + ' link(s) imported.';
  progressBar.classList.add('success');
} else if (successCount === 0) {
  progressText.textContent = 'Import failed. All ' + errorCount + ' row(s) had errors.';
  progressBar.classList.add('error');
} else {
  progressText.textContent = 'Import completed with some errors.';
  progressBar.classList.add('warning');
}

// Show summary
const importSummary = document.getElementById('import-summary');
const successCountEl = document.getElementById('success-count');
const errorCountEl = document.getElementById('error-count');
const errorDetailsSection = document.getElementById('error-details-section');
const errorList = document.getElementById('error-list');

importSummary.style.display = 'block';
successCountEl.textContent = successCount;
errorCountEl.textContent = errorCount;

// Show error details if there are errors
if (errorCount > 0) {
  errorDetailsSection.style.display = 'block';
  
  // Populate error list
  const errorItems = allResults.filter(r => !r.success);
  let errorHtml = '';
  errorItems.forEach((item, index) => {
    const rowNum = item.row || (item.chunk !== undefined ? 'Chunk ' + (item.chunk + 1) : 'Unknown');
    const errorMsg = item.error || 'Unknown error';
    errorHtml += '<div class="error-item">';
    errorHtml += '<div class="error-row">Row ' + rowNum + '</div>';
    errorHtml += '<div class="error-message">' + escapeHtml(errorMsg) + '</div>';
    errorHtml += '</div>';
  });
  errorList.innerHTML = errorHtml;
  
  // Show error list by default
  errorList.style.display = 'block';
  
  // Add toggle functionality for error details
  const errorToggle = document.getElementById('error-details-toggle');
  const errorToggleIcon = errorToggle.querySelector('.error-toggle');
  errorToggleIcon.classList.add('expanded'); // Start expanded
  errorToggle.onclick = () => {
    if (errorList.style.display === 'none') {
      errorList.style.display = 'block';
      errorToggleIcon.classList.add('expanded');
    } else {
      errorList.style.display = 'none';
      errorToggleIcon.classList.remove('expanded');
    }
  };
  
  // Show download errors button
  const downloadErrorsBtn = document.getElementById('download-errors-btn');
  downloadErrorsBtn.style.display = 'block';
  downloadErrorsBtn.onclick = () => {
    // Create CSV content for error report
    const nl = String.fromCharCode(10);
    let csvContent = 'Row,Error' + nl;
    errorItems.forEach(item => {
      const rowNum = item.row || (item.chunk !== undefined ? 'Chunk ' + (item.chunk + 1) : 'Unknown');
      const errorMsg = (item.error || 'Unknown error').replace(/"/g, '""'); // Escape quotes
      csvContent += '"' + rowNum + '","' + errorMsg + '"' + nl;
    });
    
    // Download as CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-errors-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Error report downloaded', 'success');
  };
}

// Show OK button
progressComplete.style.display = 'block';

// Handle OK button click
document.getElementById('progress-ok-btn').onclick = () => {
  progressModal.classList.remove('active');
  modal.classList.remove('active');

  // Reset progress bar
  progressBar.style.width = '0%';
  progressBar.classList.remove('success', 'warning', 'error');
  importSummary.style.display = 'none';
  errorDetailsSection.style.display = 'none';
  errorList.style.display = 'none';

  // Reload links
  loadLinks();

  // Show toast
  if (successCount > 0) {
    showToast('Successfully imported ' + successCount + ' link(s)', 'success');
  }
};
        } catch (error) {
  // Show error in progress modal
  const progressModal = document.getElementById('import-progress-modal');
  const progressText = document.getElementById('progress-text');
  const progressComplete = document.getElementById('progress-complete');
  const progressBar = document.getElementById('progress-bar');

  progressBar.style.background = '#dc3545';
  progressText.textContent = 'Import failed: ' + error.message;
  progressComplete.style.display = 'block';

  // Update OK button to close modals
  const okBtn = document.getElementById('progress-ok-btn');
  okBtn.textContent = 'Close';
  okBtn.onclick = () => {
    progressModal.classList.remove('active');
    modal.classList.remove('active');
    showToast('Failed to import CSV: ' + error.message, 'error');
  };
} finally {
  setLoading('import-csv-form', false);
  submitBtn.disabled = false;
}
      });
    }

// Load domains for import selector
async function loadDomainsForImport() {
  try {
    const domains = await apiRequest('/domains');
    const select = document.getElementById('import-domain');
    select.innerHTML = '<option value="">Select Domain</option>';
    domains.data?.forEach(domain => {
      const option = document.createElement('option');
      option.value = domain.id;
      option.textContent = domain.domain_name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Failed to load domains:', error);
  }
}

// Helper function to construct short URL
function constructShortUrl(domain, slug, route) {
  if (!domain || !slug) return '';
  
  // Construct URL based on route
  let urlPath = '/' + slug;
  if (route && route.includes('*')) {
    urlPath = route.replace('*', slug);
    // Ensure it starts with /
    if (!urlPath.startsWith('/')) urlPath = '/' + urlPath;
  } else if (route) {
    // If route doesn't have wildcard, append slug
    // Usually route is like /go/* or /s/*
    // If it's just /go, we append /slug
    urlPath = route.endsWith('/') ? route + slug : route + '/' + slug;
    if (!urlPath.startsWith('/')) urlPath = '/' + urlPath;
  }
  
  return 'https://' + domain + urlPath;
}

// QR Code Generation
function showQRCode(dataset) {
  const domain = dataset.domain;
  const slug = dataset.slug;
  const route = dataset.route;

  if (!domain || !slug) {
    showToast('Invalid link data', 'error');
    return;
  }

  const shortUrl = constructShortUrl(domain, slug, route);

  // Create modal
  const modalHtml = 
    '<div class="modal active" id="qr-modal">' +
    '  <div class="modal-content" style="max-width: 400px;">' +
    '    <span class="close" id="qr-modal-close">&times;</span>' +
    '    <h2>QR Code</h2>' +
    '    <p style="margin-bottom: 1rem; word-break: break-all;">' + escapeHtml(shortUrl) + '</p>' +
    '    <div id="qrcode" style="display: flex; justify-content: center; margin: 1.5rem 0;"></div>' +
    '    <div style="display: flex; gap: 0.5rem; justify-content: center;">' +
    '      <button id="download-qr-btn" class="btn btn-primary">Download QR Code</button>' +
    '      <button id="close-qr-btn" class="btn btn-secondary">Close</button>' +
    '    </div>' +
    '  </div>' +
    '</div>';

  // Remove existing modal if any
  const existing = document.getElementById('qr-modal');
  if (existing) existing.remove();

  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Generate QR code using qrcodejs library
  const qrcodeContainer = document.getElementById('qrcode');
  if (qrcodeContainer && typeof QRCode !== 'undefined') {
    new QRCode(qrcodeContainer, {
      text: shortUrl,
      width: 256,
      height: 256,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  } else {
    showToast('QR Code library not loaded', 'error');
    return;
  }

  // Add event listeners
  const modal = document.getElementById('qr-modal');
  const closeBtn = document.getElementById('qr-modal-close');
  const closeQrBtn = document.getElementById('close-qr-btn');
  const downloadBtn = document.getElementById('download-qr-btn');

  const closeModal = () => {
    if (modal) modal.remove();
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (closeQrBtn) closeQrBtn.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      // Get the canvas element generated by QRCode library
      const canvas = qrcodeContainer.querySelector('canvas');
      if (canvas) {
        // Convert canvas to blob and download
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'qr-' + slug + '.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast('QR Code downloaded', 'success');
        });
      } else {
        showToast('Failed to download QR Code', 'error');
      }
    });
  }
}

// Make showQRCode globally accessible for onclick handlers
window.showQRCode = showQRCode;

// Dark Mode Logic
const themeToggle = document.getElementById('theme-toggle');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

function setTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.textContent = '☀️';
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.classList.remove('dark-mode');
    themeToggle.textContent = '🌙';
    localStorage.setItem('theme', 'light');
  }
}

// Initialize theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  setTheme(savedTheme);
} else if (prefersDarkScheme.matches) {
  setTheme('dark');
}

themeToggle.addEventListener('click', () => {
  const isDark = document.body.classList.contains('dark-mode');
  setTheme(isDark ? 'light' : 'dark');
});

// ===== LINK ANALYTICS FUNCTIONS =====
let currentLinkAnalyticsId = null;
let currentAnalyticsData = null;
let linkAnalyticsChart = null;

async function showLinkAnalytics(linkId, linkData) {
  currentLinkAnalyticsId = linkId;
  currentAnalyticsData = null;
  showPage('link-analytics');
  
  // Display the short URL - fetch from API if not provided
  const urlEl = document.getElementById('link-analytics-url');
  if (urlEl) {
    if (linkData && linkData.domain && linkData.slug) {
      const shortUrl = 'https://' + linkData.domain + '/' + linkData.slug;
      urlEl.innerHTML = '<a href="' + shortUrl + '" target="_blank" style="color: var(--primary-color); text-decoration: none;">' + shortUrl + '</a>';
    } else {
      // Fetch link details from API
      try {
        const response = await apiRequest('/links/' + linkId);
        if (response.success && response.data) {
          const domain = response.data.domain_name || response.data.domain || '';
          const slug = response.data.slug || '';
          if (domain && slug) {
            const shortUrl = 'https://' + domain + '/' + slug;
            urlEl.innerHTML = '<a href="' + shortUrl + '" target="_blank" style="color: var(--primary-color); text-decoration: none;">' + shortUrl + '</a>';
          }
        }
      } catch (error) {
        console.error('[showLinkAnalytics] Failed to fetch link details:', error);
      }
    }
  }
  
  // Set default date range (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const startInput = document.getElementById('link-analytics-start-date');
  const endInput = document.getElementById('link-analytics-end-date');
  
  if (startInput) startInput.value = startDate.toISOString().split('T')[0];
  if (endInput) endInput.value = endDate.toISOString().split('T')[0];
  
  // Initial load
  fetchLinkAnalyticsData(linkId);
}
window.showLinkAnalytics = showLinkAnalytics;

function setLinkAnalyticsRange(range) {
  const end = new Date();
  const start = new Date();
  
  if (range === 'all') {
    start.setFullYear(2000, 0, 1);
  } else {
    const days = typeof range === 'string' ? parseInt(range.replace('d', ''), 10) : range;
    if (!isNaN(days)) {
      start.setDate(start.getDate() - days);
    }
  }
  
  const startInput = document.getElementById('link-analytics-start-date');
  const endInput = document.getElementById('link-analytics-end-date');
  
  if (startInput) startInput.value = start.toISOString().split('T')[0];
  if (endInput) endInput.value = end.toISOString().split('T')[0];
  
  if (currentLinkAnalyticsId) {
    fetchLinkAnalyticsData(currentLinkAnalyticsId);
  }
}
window.setLinkAnalyticsRange = setLinkAnalyticsRange;

// Apply button handler
const applyBtn = document.getElementById('link-analytics-apply-btn');
if (applyBtn) {
  applyBtn.addEventListener('click', function() {
    if (currentLinkAnalyticsId) {
      fetchLinkAnalyticsData(currentLinkAnalyticsId);
    }
  });
}

// Export button handler
const exportBtn = document.getElementById('link-analytics-export-btn');
if (exportBtn) {
  exportBtn.addEventListener('click', function() {
    if (!currentAnalyticsData || !currentAnalyticsData.time_series) {
      showToast('No data to export', 'warning');
      return;
    }
    
    const timeSeries = currentAnalyticsData.time_series;
    if (timeSeries.length === 0) {
      showToast('No data to export', 'warning');
      return;
    }
    
    // CSV Header
    let csvContent = 'Date,Clicks,Unique Visitors' + String.fromCharCode(10);
    
    // CSV Rows
    timeSeries.forEach(function(row) {
      csvContent += row.date + ',' + row.clicks + ',' + row.unique_visitors + String.fromCharCode(10);
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const startDate = document.getElementById('link-analytics-start-date')?.value || 'start';
    const endDate = document.getElementById('link-analytics-end-date')?.value || 'end';
    
    link.setAttribute('download', 'analytics-' + currentLinkAnalyticsId + '-' + startDate + '-' + endDate + '.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

// Back button handler
const backBtn = document.getElementById('link-analytics-back-btn');
if (backBtn) {
  backBtn.addEventListener('click', function() {
    showPage('dashboard');
  });
}

// Quick range buttons handler (only for link-analytics page)
document.addEventListener('click', function(e) {
  const target = e.target;
  // Only handle if we're on link-analytics page to prevent cross-page pollution
  const linkAnalyticsPage = document.getElementById('link-analytics-page');
  if (linkAnalyticsPage && linkAnalyticsPage.classList.contains('active')) {
    if (target && target.closest('.quick-ranges')) {
      const rangeBtn = target.closest('button[data-range]');
      if (rangeBtn && rangeBtn.dataset.range) {
        setLinkAnalyticsRange(rangeBtn.dataset.range);
      }
    }
  }
});


async function fetchLinkAnalyticsData(linkId) {
  const startInput = document.getElementById('link-analytics-start-date');
  const endInput = document.getElementById('link-analytics-end-date');
  
  if (!startInput || !endInput) return;
  
  let startDate = startInput.value;
  let endDate = endInput.value;
  
  // Get breakdown value
  const breakdownValue = document.getElementById('link-analytics-breakdown')?.value || 'day';
  
  // Ensure dates are set (default to last 30 days if not set)
  if (!startDate || !endDate) {
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    if (!startDate) startDate = defaultStartDate.toISOString().slice(0, 10);
    if (!endDate) endDate = defaultEndDate.toISOString().slice(0, 10);
  }
  
  // Show loading state
  const container = document.getElementById('link-analytics-content');
  if (container) container.innerHTML = '<div class="loading-spinner"></div> Loading data...';

  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append('start_date', startDate);
    params.append('end_date', endDate);
    params.append('group_by', breakdownValue);
    
    const response = await apiRequest('/analytics/links/' + linkId + '?' + params.toString());
    currentAnalyticsData = response.data;
    
    // DEBUG: Debug logging
    // console.log('[LINK ANALYTICS] Received data:', currentAnalyticsData);
    // console.log('[LINK ANALYTICS] Devices data:', currentAnalyticsData.devices);
    // console.log('[LINK ANALYTICS] Device types:', currentAnalyticsData.devices?.types);
    // console.log('[LINK ANALYTICS] Browsers:', currentAnalyticsData.devices?.browsers);
    // console.log('[LINK ANALYTICS] OS:', currentAnalyticsData.devices?.os);
    
    // renderLinkAnalyticsSummary(currentAnalyticsData); // Removed as summary is now rendered in grid
    // renderLinkAnalyticsChart(currentAnalyticsData); // Removed as chart is now rendered in grid
    
    // Render all sections in Grid Layout
    if (container) {
      container.innerHTML = '';
      
      // 1. Key Metrics Row (4 Cards)
      const metricsRow = document.createElement('div');
      metricsRow.className = 'analytics-grid';
      metricsRow.innerHTML = [
        '<div class="analytics-card col-span-3">',
          '<h3><i class="fas fa-mouse-pointer"></i> Total Clicks</h3>',
          '<div class="metric-value" id="grid-total-clicks">-</div>',
          '<div class="metric-sub">All time clicks</div>',
        '</div>',
        '<div class="analytics-card col-span-3">',
          '<h3><i class="fas fa-users"></i> Unique Visitors</h3>',
          '<div class="metric-value" id="grid-unique-visitors">-</div>',
          '<div class="metric-sub">Distinct IPs</div>',
        '</div>',
        '<div class="analytics-card col-span-3">',
          '<h3><i class="fas fa-chart-line"></i> Avg / Day</h3>',
          '<div class="metric-value" id="grid-avg-daily">-</div>',
          '<div class="metric-sub">Daily average</div>',
        '</div>',
        '<div class="analytics-card col-span-3">',
          '<h3><i class="fas fa-clock"></i> Last Clicked</h3>',
          '<div class="metric-value" style="font-size: 1.5rem;" id="grid-last-click">-</div>',
          '<div class="metric-sub">Time ago</div>',
        '</div>'
      ].join('');
      container.appendChild(metricsRow);
      
      if (currentAnalyticsData.summary) {
        document.getElementById('grid-total-clicks').textContent = (currentAnalyticsData.summary.total_clicks || 0).toLocaleString();
        document.getElementById('grid-unique-visitors').textContent = (currentAnalyticsData.summary.unique_visitors || 0).toLocaleString();
        document.getElementById('grid-avg-daily').textContent = (currentAnalyticsData.summary.avg_clicks_per_day || 0).toLocaleString();
        document.getElementById('grid-last-click').textContent = currentAnalyticsData.summary.last_clicked || '-';
      }

      // 2. Main Chart Row
      const chartRow = document.createElement('div');
      chartRow.className = 'analytics-grid';
      // Use the breakdown value captured at the start of the function (before container was cleared)
      const existingBreakdown = breakdownValue || 'day';
      const breakdownLabels = {
        day: 'Daily Clicks',
        week: 'Weekly Clicks',
        month: 'Monthly Clicks'
      };
      chartRow.innerHTML = [
        '<div class="analytics-card col-span-12">',
          '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">',
            '<h3 style="margin: 0;">' + (breakdownLabels[existingBreakdown] || 'Daily Clicks') + '</h3>',
            '<select id="link-analytics-breakdown" style="padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; background: var(--card-bg); color: var(--text-color); cursor: pointer;">',
              '<option value="day"' + (existingBreakdown === 'day' ? ' selected' : '') + '>By Day</option>',
              '<option value="week"' + (existingBreakdown === 'week' ? ' selected' : '') + '>By Week</option>',
              '<option value="month"' + (existingBreakdown === 'month' ? ' selected' : '') + '>By Month</option>',
            '</select>',
          '</div>',
          '<div class="chart-container">',
            '<canvas id="analytics-main-chart"></canvas>',
          '</div>',
        '</div>'
      ].join('');
      container.appendChild(chartRow);
      
      // Add event listener for breakdown change
      const breakdownSelect = document.getElementById('link-analytics-breakdown');
      if (breakdownSelect) {
        breakdownSelect.addEventListener('change', (e) => {
          if (currentLinkAnalyticsId) {
            // The value is already updated in the DOM when change event fires
            fetchLinkAnalyticsData(currentLinkAnalyticsId);
          }
        });
      }
      
      renderLinkAnalyticsChart(currentAnalyticsData, 'analytics-main-chart', existingBreakdown);

      // 3. Tech & Geo Row (3 Columns)
      const techGeoRow = document.createElement('div');
      techGeoRow.className = 'analytics-grid';
      
      const deviceCard = document.createElement('div');
      deviceCard.className = 'analytics-card col-span-4';
      deviceCard.innerHTML = '<h3>💻 Device Types</h3><div class="donut-wrapper"><canvas id="grid-device-chart"></canvas></div>';
      techGeoRow.appendChild(deviceCard);
      
      const osCard = document.createElement('div');
      osCard.className = 'analytics-card col-span-4';
      osCard.innerHTML = '<h3>🖥️ Operating Systems</h3><div class="donut-wrapper"><canvas id="grid-os-chart"></canvas></div>';
      techGeoRow.appendChild(osCard);
      
      const geoCard = document.createElement('div');
      geoCard.className = 'analytics-card col-span-4';
      geoCard.innerHTML = '<h3>🌍 Top Locations</h3><div id="grid-geo-list"></div>';
      techGeoRow.appendChild(geoCard);
      
      container.appendChild(techGeoRow);
      
      renderDeviceDonut(currentAnalyticsData, 'grid-device-chart');
      renderOSDonut(currentAnalyticsData, 'grid-os-chart');
      renderTopLocations(currentAnalyticsData, 'grid-geo-list');

      // 4. Traffic Sources Row (2 Columns)
      const sourcesRow = document.createElement('div');
      sourcesRow.className = 'analytics-grid';
      
      const refCard = document.createElement('div');
      refCard.className = 'analytics-card col-span-6';
      refCard.innerHTML = '<h3>🔗 Top Referrers</h3><div id="grid-ref-list"></div>';
      sourcesRow.appendChild(refCard);
      
      const utmCard = document.createElement('div');
      utmCard.className = 'analytics-card col-span-6';
      utmCard.innerHTML = '<h3>🎯 Top UTM Campaigns</h3><div id="grid-utm-list"></div>';
      sourcesRow.appendChild(utmCard);
      
      container.appendChild(sourcesRow);
      
      renderTopReferrers(currentAnalyticsData, 'grid-ref-list');
      renderTopUTM(currentAnalyticsData, 'grid-utm-list');

      // 5. Detailed Tables Section
      const detailsSection = document.createElement('div');
      detailsSection.className = 'analytics-section';
      detailsSection.innerHTML = '<h2 style="margin: 2rem 0 1rem;">📊 Detailed Breakdown</h2>';
      container.appendChild(detailsSection);
      
      const tablesGrid = document.createElement('div');
      tablesGrid.className = 'analytics-grid';
      
      const fullGeoCard = document.createElement('div');
      fullGeoCard.className = 'analytics-card col-span-12';
      fullGeoCard.innerHTML = '<h3>Geographic Data</h3>';
      renderLinkAnalyticsGeo(fullGeoCard, currentAnalyticsData);
      tablesGrid.appendChild(fullGeoCard);
      
      const fullRefCard = document.createElement('div');
      fullRefCard.className = 'analytics-card col-span-12';
      fullRefCard.innerHTML = '<h3>Referrer Data</h3>';
      renderLinkAnalyticsReferrers(fullRefCard, currentAnalyticsData);
      tablesGrid.appendChild(fullRefCard);

      const fullUtmCard = document.createElement('div');
      fullUtmCard.className = 'analytics-card col-span-12';
      fullUtmCard.innerHTML = '<h3>UTM Data</h3>';
      renderLinkAnalyticsUTM(fullUtmCard, currentAnalyticsData);
      tablesGrid.appendChild(fullUtmCard);
      
      container.appendChild(tablesGrid);
    }
  } catch (error) {
    console.error('Failed to load analytics:', error);
    showToast('Failed to load analytics data', 'error');
    if (container) container.innerHTML = '<p class="text-error">Failed to load data.</p>';
  }
}

// Helper function to aggregate time series by breakdown period (global scope for use by both overall and link analytics)
function aggregateTimeSeries(timeSeries, breakdown) {
  if (breakdown === 'day') {
    return timeSeries; // No aggregation needed
  }
  
  const aggregated = new Map();
  
  for (const point of timeSeries) {
    const date = new Date(point.date);
    let key;
    let label;
    
    if (breakdown === 'week') {
      // Get week start (Monday)
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      const weekStart = new Date(date);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);
      key = weekStart.toISOString().slice(0, 10);
      label = 'Week of ' + weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (breakdown === 'month') {
      key = date.toISOString().slice(0, 7); // YYYY-MM
      label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      key = point.date;
      label = point.date;
    }
    
    const existing = aggregated.get(key);
    if (existing) {
      existing.clicks += point.clicks || 0;
      existing.unique_visitors += point.unique_visitors || 0;
    } else {
      aggregated.set(key, {
        date: key,
        label: label,
        clicks: point.clicks || 0,
        unique_visitors: point.unique_visitors || 0
      });
    }
  }
  
  return Array.from(aggregated.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function renderLinkAnalyticsSummary(data) {
  if (!data || !data.summary) return;
  
  const totalClicksEl = document.getElementById('link-analytics-total-clicks');
  const uniqueVisitorsEl = document.getElementById('link-analytics-unique-visitors');
  const avgDailyEl = document.getElementById('link-analytics-avg-daily');
  const lastClickEl = document.getElementById('link-analytics-last-click');

  if (totalClicksEl) totalClicksEl.textContent = (data.summary.total_clicks || 0).toLocaleString();
  if (uniqueVisitorsEl) uniqueVisitorsEl.textContent = (data.summary.unique_visitors || 0).toLocaleString();
  if (avgDailyEl) avgDailyEl.textContent = (data.summary.avg_clicks_per_day || 0).toLocaleString();
  if (lastClickEl) lastClickEl.textContent = data.summary.last_clicked || '-';
}

function renderLinkAnalyticsChart(data, canvasId, breakdown = 'day') {
  const timeSeries = data?.time_series || [];
  const ctx = document.getElementById(canvasId || 'link-analytics-chart');
  if (!ctx) {
    console.error('[RENDER LINK CHART] Canvas element not found:', canvasId || 'link-analytics-chart');
    return;
  }
  
  // Destroy existing chart if it exists
  if (ctx.chart) {
    ctx.chart.destroy();
  }
  
  // Aggregate data based on breakdown (same as overview chart)
  const aggregated = aggregateTimeSeries(timeSeries, breakdown);
  
  const labels = aggregated.map(d => d.label || d.date);
  const clicksData = aggregated.map(d => d.clicks || 0);
  const visitorsData = aggregated.map(d => d.unique_visitors || 0);
  
  // Show canvas if it was hidden
  ctx.style.display = 'block';
  const noDataMsg = ctx.parentElement?.querySelector('.no-data-message');
  if (noDataMsg) {
    noDataMsg.remove();
  }
  
  // If no data, show message
  if (aggregated.length === 0 || (clicksData.every(v => v === 0) && visitorsData.every(v => v === 0))) {
    // DEBUG: console.warn('[RENDER LINK CHART] No data to display');
    const chartContainer = ctx.parentElement;
    if (chartContainer && !chartContainer.querySelector('.no-data-message')) {
      const noDataMsg = document.createElement('div');
      noDataMsg.className = 'no-data-message';
      noDataMsg.style.cssText = 'text-align: center; padding: 3rem; color: var(--secondary-color);';
      noDataMsg.innerHTML = '<p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No analytics data available</p><p style="font-size: 0.9rem;">Try adjusting your date range.</p>';
      chartContainer.appendChild(noDataMsg);
      ctx.style.display = 'none';
    }
    return;
  }
  
  linkAnalyticsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Clicks',
          data: clicksData,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Unique Visitors',
          data: visitorsData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

function renderTable(container, title, headers, rows) {
  const section = document.createElement('div');
  section.className = 'mb-4';
  section.innerHTML = '<h3>' + title + '</h3>';

  const tableContainer = document.createElement('div');
  tableContainer.className = 'data-table-container';

  const table = document.createElement('table');
  table.className = 'data-table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headers.forEach(function(h) {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  if (rows.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = headers.length;
    td.textContent = 'No data available';
    td.style.textAlign = 'center';
    td.style.padding = '2rem';
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    rows.forEach(function(row) {
      const tr = document.createElement('tr');
      row.forEach(function(cell) {
        const td = document.createElement('td');
        td.textContent = cell.toString();
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }
  table.appendChild(tbody);
  tableContainer.appendChild(table);
  section.appendChild(tableContainer);
  container.appendChild(section);
}

function renderLinkAnalyticsGeo(container, data) {
  const geoData = data.geography || [];
  const rows = geoData.map(function(item) {
    return [
      item.country || 'Unknown',
      item.city || '-',
      item.clicks.toLocaleString(),
      item.unique_visitors.toLocaleString()
    ];
  });
  renderTable(container, 'Geographic Breakdown', ['Country', 'City', 'Clicks', 'Unique Visitors'], rows);
}

function renderLinkAnalyticsDevices(container, data) {
  // DEBUG: console.log('[RENDER DEVICES] Called with data:', data);
  const devices = data.devices || {};
  // DEBUG: console.log('[RENDER DEVICES] Devices object:', devices);
  const deviceTypes = devices.types || [];
  // DEBUG: console.log('[RENDER DEVICES] Device types array:', deviceTypes);

  // Add pie chart for device types distribution
  if (deviceTypes.length > 0) {
    // DEBUG: console.log('[RENDER DEVICES] Creating pie chart for', deviceTypes.length, 'device types');
    const chartSection = document.createElement('div');
    chartSection.className = 'mb-4';
    chartSection.innerHTML = '<h3>Device Type Distribution</h3>';
    
    const chartWrapper = document.createElement('div');
    chartWrapper.style.position = 'relative';
    chartWrapper.style.height = '300px';
    chartWrapper.style.marginBottom = '2rem';
    
    const canvas = document.createElement('canvas');
    canvas.id = 'device-pie-chart';
    chartWrapper.appendChild(canvas);
    chartSection.appendChild(chartWrapper);
    container.appendChild(chartSection);
    
    // Create pie chart
    const labels = deviceTypes.map(function(item) { return item.device_type || 'Unknown'; });
    const dataValues = deviceTypes.map(function(item) { return item.clicks; });
    const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    
    // DEBUG: console.log('[RENDER DEVICES] Chart data:', { labels: labels, values: dataValues });
    
    try {
      new Chart(canvas, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: dataValues,
            backgroundColor: colors.slice(0, labels.length)
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right'
            }
          }
        }
      });
      // DEBUG: console.log('[RENDER DEVICES] Pie chart created successfully');
    } catch (error) {
      console.error('[RENDER DEVICES] Error creating pie chart:', error);
    }
  } else {
    // DEBUG: console.log('[RENDER DEVICES] No device types data, skipping pie chart');
  }

  // Device Types Table
  const typeRows = deviceTypes.map(function(item) {
    return [
      item.device_type || 'Unknown',
      item.clicks.toLocaleString(),
      item.unique_visitors.toLocaleString()
    ];
  });
  renderTable(container, 'Device Types Details', ['Device Type', 'Clicks', 'Unique Visitors'], typeRows);

  // Browsers
  const browserRows = (devices.browsers || []).map(function(item) {
    return [
      item.browser || 'Unknown',
      item.clicks.toLocaleString(),
      item.unique_visitors.toLocaleString()
    ];
  });
  renderTable(container, 'Browsers', ['Browser', 'Clicks', 'Unique Visitors'], browserRows);

  // OS
  const osRows = (devices.os || []).map(function(item) {
    return [
      item.os || 'Unknown',
      item.clicks.toLocaleString(),
      item.unique_visitors.toLocaleString()
    ];
  });
  renderTable(container, 'Operating Systems', ['OS', 'Clicks', 'Unique Visitors'], osRows);
}

function renderLinkAnalyticsReferrers(container, data) {
  const referrers = data.referrers || [];
  const rows = referrers.map(function(item) {
    return [
      item.referrer_domain || 'Direct / None',
      item.category || 'Unknown',
      item.clicks.toLocaleString(),
      item.unique_visitors.toLocaleString()
    ];
  });
  renderTable(container, 'Top Referrers', ['Domain', 'Category', 'Clicks', 'Unique Visitors'], rows);
}

function renderLinkAnalyticsUTM(container, data) {
  const utm = data.utm || {};

  // Sources
  const sourceRows = (utm.sources || []).map(function(item) {
    return [
      item.utm_source || 'None',
      item.clicks.toLocaleString(),
      item.unique_visitors.toLocaleString()
    ];
  });
  renderTable(container, 'UTM Sources', ['Source', 'Clicks', 'Unique Visitors'], sourceRows);

  // Mediums
  const mediumRows = (utm.mediums || []).map(function(item) {
    return [
      item.utm_medium || 'None',
      item.clicks.toLocaleString(),
      item.unique_visitors.toLocaleString()
    ];
  });
  renderTable(container, 'UTM Mediums', ['Medium', 'Clicks', 'Unique Visitors'], mediumRows);

  // Campaigns
  const campaignRows = (utm.campaigns || []).map(function(item) {
    return [
      item.utm_campaign || 'None',
      item.clicks.toLocaleString(),
      item.unique_visitors.toLocaleString()
    ];
  });
  renderTable(container, 'UTM Campaigns', ['Campaign', 'Clicks', 'Unique Visitors'], campaignRows);
}

// New render functions for additional tabs
function renderLinkAnalyticsBrowsers(container, data) {
  const devices = data.devices || {};
  const browserRows = (devices.browsers || []).map(function(item) {
    return [
      item.browser || 'Unknown',
      item.clicks.toLocaleString(),
      item.unique_visitors.toLocaleString()
    ];
  });
  renderTable(container, 'Browser Distribution', ['Browser', 'Clicks', 'Unique Visitors'], browserRows);
}

function renderLinkAnalyticsOS(container, data) {
  const devices = data.devices || {};
  const osData = devices.os || [];
  
  // Add pie chart for OS distribution
  if (osData.length > 0) {
    const chartSection = document.createElement('div');
    chartSection.className = 'mb-4';
    chartSection.innerHTML = '<h3>Operating System Distribution</h3>';
    
    const chartWrapper = document.createElement('div');
    chartWrapper.style.position = 'relative';
    chartWrapper.style.height = '300px';
    chartWrapper.style.marginBottom = '2rem';
    
    const canvas = document.createElement('canvas');
    canvas.id = 'os-pie-chart';
    chartWrapper.appendChild(canvas);
    chartSection.appendChild(chartWrapper);
    container.appendChild(chartSection);
    
    // Create pie chart
    const labels = osData.map(function(item) { return item.os || 'Unknown'; });
    const dataValues = osData.map(function(item) { return item.clicks; });
    const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    
    new Chart(canvas, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: dataValues,
          backgroundColor: colors.slice(0, labels.length)
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });
  }
  
  // Add table
  const osRows = osData.map(function(item) {
    return [
      item.os || 'Unknown',
      item.clicks.toLocaleString(),
      item.unique_visitors.toLocaleString()
    ];
  });
  renderTable(container, 'Operating Systems Details', ['OS', 'Clicks', 'Unique Visitors'], osRows);
}

function renderLinkAnalyticsCustomParams(container, data) {
  container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;"><h3>Custom Parameters</h3><p>Custom parameter tracking is coming soon.</p><p>This feature will allow you to track custom query parameters and their values.</p></div>';
}




// Helper functions for Grid Layout
function renderDeviceDonut(data, canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !data.devices || !data.devices.types) return;
  
  const types = data.devices.types;
  const labels = types.map(d => d.device_type || 'Unknown');
  const values = types.map(d => d.clicks);
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10 } }
      },
      cutout: '70%'
    }
  });
}

function renderOSDonut(data, canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !data.devices || !data.devices.os) return;
  
  const os = data.devices.os;
  const topOS = os.slice(0, 5);
  const labels = topOS.map(d => d.os || 'Unknown');
  const values = topOS.map(d => d.clicks);
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10 } }
      },
      cutout: '70%'
    }
  });
}

function renderTopLocations(data, containerId) {
  // DEBUG: console.log('[renderTopLocations] Called with data:', data);
  // DEBUG: console.log('[renderTopLocations] Data keys:', Object.keys(data || {}));
  // DEBUG: console.log('[renderTopLocations] Geography data:', data?.geography);
  
  const container = document.getElementById(containerId);
  if (!container) {
    // DEBUG: console.log('[renderTopLocations] Container not found:', containerId);
    return;
  }
  
  if (!data.geography) {
    // DEBUG: console.log('[renderTopLocations] No geography data available');
    container.innerHTML = '<p class="text-muted">No geographic data available</p>';
    return;
  }
  
  const topGeo = data.geography.slice(0, 5);
  // DEBUG: console.log('[renderTopLocations] Top 5 locations:', topGeo);
  
  if (topGeo.length === 0) {
    container.innerHTML = '<p class="text-muted">No data available</p>';
    return;
  }
  
  const html = topGeo.map(item => [
    '<div class="list-item">',
      '<span class="list-item-label">',
        (item.country || 'Unknown'),
        (item.city ? '<span style="color:var(--secondary-color);font-size:0.8em">(' + item.city + ')</span>' : ''),
      '</span>',
      '<span class="list-item-value">' + item.clicks.toLocaleString() + '</span>',
    '</div>'
  ].join('')).join('');
  
  container.innerHTML = html;
}

function renderTopReferrers(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !data.referrers) return;
  
  const topRefs = data.referrers.slice(0, 5);
  
  if (topRefs.length === 0) {
    container.innerHTML = '<p class="text-muted">No data available</p>';
    return;
  }
  
  const html = topRefs.map(item => [
    '<div class="list-item">',
      '<span class="list-item-label">' + (item.referer || 'Direct / None') + '</span>',
      '<span class="list-item-value">' + item.clicks.toLocaleString() + '</span>',
    '</div>'
  ].join('')).join('');
  
  container.innerHTML = html;
}

function renderTopUTM(data, containerId) {
  const container = document.getElementById(containerId);
  if (!container || !data.utm || !data.utm.campaigns) return;
  
  const topCampaigns = data.utm.campaigns.slice(0, 5);
  
  if (topCampaigns.length === 0) {
    container.innerHTML = '<p class="text-muted">No data available</p>';
    return;
  }
  
  const html = topCampaigns.map(item => [
    '<div class="list-item">',
      '<span class="list-item-label">' + (item.utm_campaign || '(not set)') + '</span>',
      '<span class="list-item-value">' + item.clicks.toLocaleString() + '</span>',
    '</div>'
  ].join('')).join('');
  
  container.innerHTML = html;
}

// Pagination State for Analytics Tables
const analyticsPaginationState = {};

function renderPaginatedTable(container, title, headers, data, tableId, pageSize = 10) {
  if (!analyticsPaginationState[tableId]) {
    analyticsPaginationState[tableId] = 1;
  }
  
  const currentPage = analyticsPaginationState[tableId];
  const totalPages = Math.ceil(data.length / pageSize);
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageData = data.slice(start, end);
  
  const htmlParts = ['<div class="table-container">'];
  htmlParts.push('<table class="data-table"><thead><tr>');
  headers.forEach(h => htmlParts.push('<th>' + h + '</th>'));
  htmlParts.push('</tr></thead><tbody>');

  if (pageData.length === 0) {
    htmlParts.push('<tr><td colspan="' + headers.length + '" style="text-align:center;padding:2rem;">No data available</td></tr>');
  } else {
    pageData.forEach(row => {
      htmlParts.push('<tr>');
      row.forEach(cell => htmlParts.push('<td>' + cell + '</td>'));
      htmlParts.push('</tr>');
    });
  }

  htmlParts.push('</tbody></table></div>');

  // Pagination Controls
  if (totalPages > 1) {
    htmlParts.push([
      '<div class="pagination-controls">',
        '<button class="btn btn-secondary btn-sm" onclick="changePage(&apos;' + tableId + '&apos;, -1)" ' + (currentPage === 1 ? 'disabled' : '') + '>Previous</button>',
        '<span class="pagination-info">Page ' + currentPage + ' of ' + totalPages + '</span>',
        '<button class="btn btn-secondary btn-sm" onclick="changePage(&apos;' + tableId + '&apos;, 1)" ' + (currentPage === totalPages ? 'disabled' : '') + '>Next</button>',
      '</div>'
    ].join(''));
  }

  container.innerHTML = htmlParts.join('');

  // Store data for re-rendering
  window['data_' + tableId] = { container, title, headers, data, pageSize };
}

window.changePage = function (tableId, delta) {
  if (!analyticsPaginationState[tableId]) return;
  analyticsPaginationState[tableId] += delta;

  const stored = window['data_' + tableId];
  if (stored) {
    renderPaginatedTable(stored.container, stored.title, stored.headers, stored.data, tableId, stored.pageSize);
  }
};

// Override existing render functions to use pagination
const originalRenderGeo = renderLinkAnalyticsGeo;
renderLinkAnalyticsGeo = function (container, data) {
  if (!data.geography || data.geography.length === 0) {
    container.innerHTML = '<p class="text-muted">No geographic data available</p>';
    return;
  }
  const rows = data.geography.map(item => [
    item.country || 'Unknown',
    item.city || '-',
    item.clicks.toLocaleString(),
    item.unique_visitors.toLocaleString()
  ]);
  renderPaginatedTable(container, 'Geographic Data', ['Country', 'City', 'Clicks', 'Unique Visitors'], rows, 'geo_table');
};

const originalRenderReferrers = renderLinkAnalyticsReferrers;
renderLinkAnalyticsReferrers = function (container, data) {
  if (!data.referrers || data.referrers.length === 0) {
    container.innerHTML = '<p class="text-muted">No referrer data available</p>';
    return;
  }
  const rows = data.referrers.map(item => [
    item.referer || 'Direct / None',
    item.clicks.toLocaleString(),
    item.unique_visitors.toLocaleString()
  ]);
  renderPaginatedTable(container, 'Referrer Data', ['Referrer', 'Clicks', 'Unique Visitors'], rows, 'ref_table');
};

const originalRenderUTM = renderLinkAnalyticsUTM;
renderLinkAnalyticsUTM = function (container, data) {
  if (!data.utm || !data.utm.campaigns) {
    container.innerHTML = '<p class="text-muted">No UTM data available</p>';
    return;
  }

  // Combine all UTM data for now or just show campaigns
  // Let's show Campaigns as the main table
  const rows = data.utm.campaigns.map(item => [
    item.utm_campaign || '(not set)',
    item.source || '-',
    item.medium || '-',
    item.clicks.toLocaleString()
  ]);
  renderPaginatedTable(container, 'UTM Campaigns', ['Campaign', 'Source', 'Medium', 'Clicks'], rows, 'utm_table');
};

// Event Listeners for Status Filters
document.querySelectorAll('.status-filter-card').forEach(card => {
  card.addEventListener('click', function() {
    const status = this.getAttribute('data-status');
    if (status) {
      filterByStatus(status);
    }
  });
});

// Settings sections are now separate pages, so no toggle handlers needed

// ============================================================================
// END OF DASHBOARD APPLICATION
// ============================================================================
// All services, components, and controllers are defined above.
// The dashboard is now fully organized into logical sections:
// - Link Service: Link management (CRUD operations)
// - Domain Service: Custom domain management
// - Analytics Service: Analytics and reporting
// - Status Monitor Service: Link health monitoring
// - UI Components & Helpers: Reusable UI functions
// - Page Controllers: Navigation and page management
// ============================================================================


// CSV Export Utility
function downloadCsv(filename, headers, rows) {
  const nl = String.fromCharCode(10);
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      if (cell === null || cell === undefined) return '';
      const stringCell = String(cell);
      // Escape quotes and wrap in quotes if contains comma or quote
      if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes(nl)) {
        return '"' + stringCell.replace(/"/g, '""') + '"';
      }
      return stringCell;
    }).join(','))
  ].join(nl);

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// ============================================================================
// RESIZABLE TABLE COLUMNS
// ============================================================================

// Column resize functionality
(function initColumnResize() {
  const COLUMN_WIDTHS_KEY = 'linkTableColumnWidths';
  
  // Load saved column widths from localStorage
  function loadColumnWidths() {
    try {
      const saved = localStorage.getItem(COLUMN_WIDTHS_KEY);
      if (saved) {
        const widths = JSON.parse(saved);
        if (widths.shortUrl) {
          document.documentElement.style.setProperty('--col-short-url-width', widths.shortUrl + 'px');
        }
        if (widths.destination) {
          document.documentElement.style.setProperty('--col-destination-width', widths.destination + 'px');
        }
        if (widths.statusDestination) {
          document.documentElement.style.setProperty('--col-status-destination-width', widths.statusDestination + 'px');
        }
      }
    } catch (e) {
      console.error('Failed to load column widths:', e);
    }
  }
  
  // Save column widths to localStorage
  function saveColumnWidths() {
    try {
      const shortUrlWidth = getComputedStyle(document.documentElement).getPropertyValue('--col-short-url-width');
      const destinationWidth = getComputedStyle(document.documentElement).getPropertyValue('--col-destination-width');
      const statusDestinationWidth = getComputedStyle(document.documentElement).getPropertyValue('--col-status-destination-width');
      
      const widths = {
        shortUrl: parseInt(shortUrlWidth) || 300,
        destination: parseInt(destinationWidth) || 400,
        statusDestination: parseInt(statusDestinationWidth) || 400
      };
      
      localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(widths));
    } catch (e) {
      console.error('Failed to save column widths:', e);
    }
  }
  
  // Reset column widths to defaults
  window.resetColumnWidths = function() {
    try {
      localStorage.removeItem(COLUMN_WIDTHS_KEY);
      document.documentElement.style.setProperty('--col-short-url-width', '300px');
      document.documentElement.style.setProperty('--col-destination-width', '400px');
      document.documentElement.style.setProperty('--col-status-destination-width', '400px');
      showToast('Column widths reset to default', 'success');
    } catch (e) {
      console.error('Failed to reset column widths:', e);
      showToast('Failed to reset column widths', 'error');
    }
  };
  
  // Initialize resize handles
  function initResizeHandles() {
    let isResizing = false;
    let currentColumn = null;
    let startX = 0;
    let startWidth = 0;
    
    // Add CSS for resize handles
    const style = document.createElement('style');
    style.textContent = 
      '.resize-handle {' +
      '  position: absolute;' +
      '  right: 0;' +
      '  top: 0;' +
      '  bottom: 0;' +
      '  width: 5px;' +
      '  cursor: col-resize;' +
      '  user-select: none;' +
      '  background: rgba(0, 123, 255, 0.15);' +
      '  border-right: 1px solid rgba(0, 123, 255, 0.3);' +
      '  transition: background 0.2s;' +
      '}' +
      '.resize-handle:hover {' +
      '  background: rgba(0, 123, 255, 0.3);' +
      '  border-right: 2px solid rgba(0, 123, 255, 0.6);' +
      '}' +
      '.resize-handle.resizing {' +
      '  background: rgba(0, 123, 255, 0.5);' +
      '  border-right: 2px solid rgba(0, 123, 255, 0.8);' +
      '}' +
      '.resizable-column {' +
      '  user-select: none;' +
      '}' +
      'body.resizing-column {' +
      '  cursor: col-resize !important;' +
      '  user-select: none !important;' +
      '}' +
      'body.resizing-column * {' +
      '  cursor: col-resize !important;' +
      '  user-select: none !important;' +
      '}';
    document.head.appendChild(style);
    
    // Handle mousedown on resize handle
    document.addEventListener('mousedown', function(e) {
      const handle = e.target.closest('.resize-handle');
      if (!handle) return;
      
      e.preventDefault();
      isResizing = true;
      currentColumn = handle.dataset.column;
      startX = e.pageX;
      
      const th = handle.closest('th');
      startWidth = th.offsetWidth;
      
      handle.classList.add('resizing');
      document.body.classList.add('resizing-column');
    });
    
    // Handle mousemove
    document.addEventListener('mousemove', function(e) {
      if (!isResizing) return;
      
      e.preventDefault();
      const diff = e.pageX - startX;
      let newWidth = startWidth + diff;
      
      // Get min and max from the th element
      const th = document.querySelector('th[data-column="' + currentColumn + '"]');
      const minWidth = parseInt(getComputedStyle(th).minWidth) || 100;
      const maxWidth = parseInt(getComputedStyle(th).maxWidth) || 1000;
      
      // Clamp width
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      
      // Update CSS variable
      if (currentColumn === 'shortUrl') {
        document.documentElement.style.setProperty('--col-short-url-width', newWidth + 'px');
      } else if (currentColumn === 'destination') {
        document.documentElement.style.setProperty('--col-destination-width', newWidth + 'px');
      } else if (currentColumn === 'statusDestination') {
        document.documentElement.style.setProperty('--col-status-destination-width', newWidth + 'px');
      }
    });
    
    // Handle mouseup
    document.addEventListener('mouseup', function(e) {
      if (!isResizing) return;
      
      isResizing = false;
      
      // Remove resizing classes
      document.querySelectorAll('.resize-handle.resizing').forEach(handle => {
        handle.classList.remove('resizing');
      });
      document.body.classList.remove('resizing-column');
      
      // Save to localStorage
      saveColumnWidths();
      
      currentColumn = null;
    });
  }
  
  // Load saved widths on page load
  loadColumnWidths();
  
  // Initialize resize handles
  initResizeHandles();
})();

</script>
  </body>
  </html>`;
}

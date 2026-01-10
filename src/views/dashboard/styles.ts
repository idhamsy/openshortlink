/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Dashboard CSS styles exported as a TypeScript string
// This allows Cloudflare Workers to serve the CSS without complex build configuration

export const dashboardCss = `
/* Analytics Grid Layout */
.analytics-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.analytics-card {
  background: var(--card-bg);
  border-radius: 16px;
  border: none;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  display: flex;
  flex-direction: column;
}

.analytics-card h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: 0.9;
}

/* Grid Spans */
.col-span-12 { grid-column: span 12; }
.col-span-8 { grid-column: span 8; }
.col-span-6 { grid-column: span 6; }
.col-span-4 { grid-column: span 4; }
.col-span-3 { grid-column: span 3; }

/* Specific Section Styles */
.metric-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--primary-color);
  margin-top: auto;
}

.metric-sub {
  font-size: 0.875rem;
  color: var(--secondary-color);
  margin-top: 0.5rem;
}

.chart-wrapper-large {
  height: 350px;
  width: 100%;
  position: relative;
}

.donut-wrapper {
  height: 250px;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
}

.list-item:last-child { border-bottom: none; }

.list-item-label { font-weight: 500; }
.list-item-value { font-weight: 600; color: var(--primary-color); }

/* Responsive Breakpoints */
@media (max-width: 1024px) {
  .col-span-4 { grid-column: span 6; }
  .col-span-3 { grid-column: span 6; }
}

@media (max-width: 768px) {
  .col-span-8, .col-span-6, .col-span-4, .col-span-3 { grid-column: span 12; }
  .analytics-grid { gap: 1rem; }
}

/* Pagination Styles */
.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.pagination-info {
  font-size: 0.875rem;
  color: var(--secondary-color);
}
:root {
  --bg-color: #f8fafc;
  --text-color: #334155;
  --card-bg: #ffffff;
  --border-color: #e2e8f0;
  --sidebar-bg: #0f172a;
  --navbar-bg: #ffffff;
  --primary-color: #6366f1;
  --secondary-color: #64748b;
  --hover-bg: #f1f5f9;
  --input-bg: #f1f5f9;
  --input-border: #cbd5e1;
  --modal-bg: #ffffff;
  --table-header-bg: #f8fafc;
  --table-row-hover: #f8fafc;
  --success-color: #10b981;
  --error-color: #f43f5e;
  --sidebar-text: #e2e8f0;
  --sidebar-hover: #1e293b;
  --sidebar-active: #6366f1;
}

.dark-mode {
  --bg-color: #0f172a;
  --text-color: #f1f5f9;
  --card-bg: #1e293b;
  --border-color: #334155;
  --sidebar-bg: #020617;
  --navbar-bg: #1e293b;
  --primary-color: #818cf8;
  --secondary-color: #94a3b8;
  --hover-bg: #334155;
  --input-bg: #0f172a;
  --input-border: #475569;
  --modal-bg: #1e293b;
  --table-header-bg: #1e293b;
  --table-row-hover: #334155;
  --success-color: #34d399;
  --error-color: #fb7185;
  --sidebar-text: #cbd5e1;
  --sidebar-hover: #334155;
  --sidebar-active: #818cf8;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background: var(--bg-color); color: var(--text-color); transition: background 0.3s, color 0.3s; }
.navbar { background: var(--navbar-bg); border-bottom: 1px solid var(--border-color); padding: 0 2rem; display: flex; justify-content: space-between; align-items: flex-start; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1); line-height: 0; }
.nav-brand { font-size: 1.5rem; font-weight: 600; color: var(--text-color); display: flex; align-items: center; line-height: 0; padding: 0; margin: 0; }
.nav-brand img { display: block; margin: 0; padding: 0; vertical-align: top; }
.nav-brand a { padding: 0; margin: 0; display: flex; align-items: center; line-height: 0; }
.nav-items { display: flex; gap: 1rem; align-items: center; align-self: center; }
.nav-brand { align-self: flex-start; }
.domain-selector { padding: 0.5rem 1rem; border: 1px solid var(--input-border); border-radius: 6px; background: var(--input-bg); color: var(--text-color); }
.container { display: flex; height: calc(100vh - 60px); }
.sidebar { width: 250px; background: var(--sidebar-bg); border-right: 1px solid var(--border-color); padding: 1rem; transition: width 0.3s ease, transform 0.3s ease; position: relative; overflow: hidden; }
.sidebar.collapsed { width: 0; padding: 0; overflow: hidden; transform: translateX(-100%); }
.sidebar-toggle { position: fixed; top: 50%; transform: translateY(-50%); left: 250px; width: auto; height: auto; min-width: 30px; min-height: 100px; background: var(--primary-color); color: white; border: none; border-radius: 0 8px 8px 0; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold; z-index: 1000; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); transition: all 0.2s, left 0.3s ease; writing-mode: vertical-rl; text-orientation: mixed; padding: 0.5rem 0.25rem; }
.sidebar-toggle:hover { background: #4f46e5; transform: translateY(-50%) scale(1.05); }
.sidebar.collapsed + .main-content { margin-left: 0; }
.sidebar-nav { display: flex; flex-direction: column; gap: 0.5rem; }
.nav-link { padding: 0.75rem 1rem; text-decoration: none; color: var(--sidebar-text); border-radius: 8px; transition: all 0.2s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; justify-content: space-between; font-weight: 500; }
.nav-link:hover { background: var(--sidebar-hover); }
.nav-link.active { background: var(--sidebar-active); color: white; box-shadow: 0 0 20px rgba(99, 102, 241, 0.4); }
.nav-submenu { display: none; flex-direction: column; padding-left: 1rem; margin-top: 0.25rem; }
.nav-submenu.expanded { display: flex; }
.nav-submenu-link { padding: 0.5rem 1rem; text-decoration: none; color: var(--sidebar-text); opacity: 0.8; border-radius: 6px; transition: all 0.2s; font-size: 0.9rem; }
.nav-submenu-link:hover { background: var(--sidebar-hover); opacity: 1; }
.nav-submenu-link.active { background: rgba(99, 102, 241, 0.2); color: var(--primary-color); font-weight: 600; opacity: 1; }
.nav-link-toggle { margin-left: auto; font-size: 0.75rem; transition: transform 0.2s; }
.nav-link.expanded .nav-link-toggle { transform: rotate(90deg); }
.settings-section { margin-bottom: 2rem; scroll-margin-top: 80px; }
.settings-section-header { cursor: pointer; padding: 1rem; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.settings-section-header:hover { background: var(--hover-bg); }
.settings-section-header h2 { margin: 0; font-size: 1.25rem; color: var(--text-color); }
.settings-section-toggle { font-size: 1.25rem; transition: transform 0.2s; }
.settings-section.expanded .settings-section-toggle { transform: rotate(90deg); }
.settings-section-content { display: none; }
.settings-section.expanded .settings-section-content { display: block; }
.main-content { flex: 1; padding: 2rem; overflow-y: auto; }
.page { display: none; }
.page.active { display: block; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
.stat-card { background: var(--card-bg); padding: 1.5rem; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: none; }
.stat-card h3 { font-size: 0.875rem; color: var(--text-color); opacity: 0.6; margin-bottom: 0.5rem; font-weight: 500; }
.stat-card p { font-size: 2rem; font-weight: 700; color: var(--text-color); }
.btn { padding: 0.625rem 1.25rem; border: none; border-radius: 8px; cursor: pointer; font-size: 0.875rem; transition: all 0.2s; font-weight: 500; min-height: 44px; }
.btn-primary { background: var(--primary-color); color: white; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
.btn-primary:hover { background: #4f46e5; transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
.btn-secondary { background: var(--secondary-color); color: white; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
.btn-secondary:hover { background: #475569; transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
.filters { display: flex; gap: 1rem; margin-bottom: 1rem; }
.search-input { flex: 1; padding: 0.625rem; border: 1px solid var(--input-border); border-radius: 8px; background: var(--input-bg); color: var(--text-color); transition: all 0.2s; }
.search-input:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
.filter-select { padding: 0.625rem; border: 1px solid var(--input-border); border-radius: 8px; background: var(--input-bg); color: var(--text-color); transition: all 0.2s; }
.filter-select:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
.table-container { background: var(--card-bg); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: none; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.data-table { width: 100%; border-collapse: collapse; color: var(--text-color); min-width: 800px; }
.data-table th { background: var(--table-header-bg); padding: 1rem 1.25rem; text-align: left; font-weight: 600; border-bottom: 1px solid var(--border-color); color: var(--text-color); font-size: 0.875rem; }
.data-table td { padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); }
.data-table tr:hover { background: var(--table-row-hover); }
.data-table tr:last-child td { border-bottom: none; }
.modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); }
.modal.active { display: flex; align-items: center; justify-content: center; }
.modal-content { background: var(--modal-bg); padding: 2rem; border-radius: 16px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto; border: none; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1); color: var(--text-color); }
.close { float: right; font-size: 2rem; cursor: pointer; color: var(--text-color); transition: color 0.2s; }
.close:hover { color: var(--primary-color); }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: var(--text-color); font-size: 0.875rem; }
.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 0.625rem; border: 1px solid var(--input-border); border-radius: 8px; font-size: 1rem; background: var(--input-bg); color: var(--text-color); transition: all 0.2s; }
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
.form-group textarea { resize: vertical; min-height: 100px; }
.status-badge { padding: 0.25rem 0.625rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
.status-badge.status-active { background: #d1fae5; color: #065f46; }
.status-badge.status-expired { background: #fef3c7; color: #92400e; }
.status-badge.status-archived { background: #dbeafe; color: #1e40af; }
.status-badge.status-deleted { background: #ffe4e6; color: #9f1239; }
.btn-sm { padding: 0.375rem 0.75rem; font-size: 0.75rem; min-height: auto; }

/* Validation badges */
.validation-badge { padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.875rem; font-weight: 600; display: inline-block; cursor: help; }
.validation-badge.badge-success { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
.validation-badge.badge-error { background: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; }
.validation-badge.badge-secondary { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

/* Generic badges */
.badge { padding: 0.25rem 0.625rem; border-radius: 6px; font-size: 0.75rem; font-weight: 500; display: inline-block; }
.badge.badge-success { background: #d1fae5; color: #065f46; }
.badge.badge-secondary { background: #f1f5f9; color: #475569; }

/* Checkbox label styling */
.checkbox-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; color: var(--text-color); }
.checkbox-label input[type="checkbox"] { width: auto; cursor: pointer; }
@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.date-input { padding: 0.625rem; border: 1px solid var(--input-border); border-radius: 8px; margin-right: 1rem; background: var(--input-bg); color: var(--text-color); transition: all 0.2s; }
.date-input:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
.analytics-filters { display: flex; gap: 1rem; margin-bottom: 2rem; align-items: center; }
.analytics-breakdown-filters { background: var(--card-bg); padding: 1.5rem; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); margin-bottom: 2rem; border: none; }
.filter-row { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: flex-end; }
.filter-group { display: flex; flex-direction: column; gap: 0.5rem; min-width: 200px; }
.filter-group label { font-size: 0.875rem; font-weight: 600; color: var(--text-color); opacity: 0.8; }
.filter-group input, .filter-group select { padding: 0.625rem; border: 1px solid var(--input-border); border-radius: 8px; background: var(--input-bg); color: var(--text-color); transition: all 0.2s; }
.filter-group input:focus, .filter-group select:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
.filter-group input[type="text"] { width: 100%; }
.filter-actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
.chart-container { background: var(--card-bg); padding: 1.5rem; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); margin-bottom: 2rem; border: none; }
.chart-container h3 { margin-bottom: 1rem; color: var(--text-color); font-weight: 600; }
.chart-wrapper { position: relative; height: 400px; margin-bottom: 1rem; }
.data-table-container { background: var(--card-bg); padding: 1.5rem; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); overflow-x: auto; border: none; }
.summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
.summary-card { background: var(--card-bg); padding: 1.5rem; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: none; }
.summary-card h3 { font-size: 0.875rem; color: var(--text-color); opacity: 0.6; margin-bottom: 0.5rem; font-weight: 500; }
.summary-card .value { font-size: 2rem; font-weight: 700; color: var(--text-color); }
.summary-card .subtitle { font-size: 0.75rem; color: var(--text-color); opacity: 0.6; margin-top: 0.25rem; }
.breakdown-tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; border-bottom: 2px solid var(--border-color); }
.breakdown-tab { padding: 0.75rem 1.5rem; background: transparent; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-size: 0.875rem; color: var(--text-color); opacity: 0.7; transition: all 0.2s; }
.breakdown-tab:hover { color: var(--primary-color); opacity: 1; }
.breakdown-tab.active { color: var(--primary-color); border-bottom-color: var(--primary-color); font-weight: 600; opacity: 1; }
.loading-spinner { display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; }
.pagination-controls-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 0.75rem; background: var(--card-bg); border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: 1px solid var(--border-color); }
.per-page-selector { display: flex; align-items: center; gap: 0.5rem; }
.per-page-selector label { font-size: 0.875rem; color: var(--text-color); margin: 0; }
.per-page-select { padding: 0.5rem; border: 1px solid var(--input-border); border-radius: 4px; font-size: 0.875rem; background: var(--input-bg); color: var(--text-color); }
.pagination-info { font-size: 0.875rem; color: var(--text-color); opacity: 0.8; }
.pagination-controls { margin-top: 1rem; display: flex; justify-content: center; align-items: center; }
.pagination-buttons { display: flex; gap: 0.5rem; align-items: center; }
.pagination-btn { padding: 0.5rem 0.75rem; border: 1px solid var(--input-border); border-radius: 4px; background: var(--card-bg); color: var(--text-color); cursor: pointer; font-size: 0.875rem; transition: all 0.2s; min-width: 40px; }
.pagination-btn:hover:not(:disabled) { background: var(--hover-bg); border-color: var(--primary-color); }
.pagination-btn.active { background: var(--primary-color); color: white; border-color: var(--primary-color); }
.pagination-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pagination-ellipsis { padding: 0.5rem; color: var(--text-color); }
/* JSON Syntax Highlighting */
.json-key { color: #005cc5; font-weight: 600; }
.json-string { color: #032f62; }
.json-number { color: #005cc5; }
.json-boolean { color: #d73a49; }
.json-null { color: #6a737d; }
.json-punctuation { color: #6a737d; }
.dark-mode .json-key { color: #79c0ff; }
.dark-mode .json-string { color: #a5d6ff; }
.dark-mode .json-number { color: #79c0ff; }
.dark-mode .json-boolean { color: #ff7b72; }
.dark-mode .json-null { color: #8b949e; }
.dark-mode .json-punctuation { color: #8b949e; }
.history-item { padding: 0.75rem; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.2s; }
.history-item:hover { background: var(--hover-bg); }
.history-item:last-child { border-bottom: none; }
.history-method { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; margin-right: 0.5rem; }
.history-method.get { background: #28a745; color: white; }
.history-method.post { background: #007bff; color: white; }
.history-method.put { background: #ffc107; color: #333; }
.history-method.delete { background: #dc3545; color: white; }
.history-time { color: var(--text-color); opacity: 0.7; font-size: 0.875rem; }

/* Import Progress Modal Styles */
.progress-container { background: #f0f0f0; border-radius: 8px; height: 30px; margin: 1.5rem 0; position: relative; overflow: hidden; }
.dark-mode .progress-container { background: #2c2c2c; }
.progress-bar { height: 100%; background: #007bff; transition: width 0.3s ease, background 0.3s ease; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.progress-bar.success { background: #28a745; }
.progress-bar.warning { background: #ffc107; }
.progress-bar.error { background: #dc3545; }
.progress-percent { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-weight: 600; font-size: 0.875rem; color: var(--text-color); z-index: 1; }
.progress-text { text-align: center; color: var(--text-color); margin: 1rem 0; font-size: 0.95rem; }
.import-summary { margin-top: 1.5rem; padding: 1rem; background: var(--card-bg); border-radius: 8px; border: 1px solid var(--border-color); }
.summary-stats { display: flex; gap: 1.5rem; justify-content: center; margin-bottom: 1rem; flex-wrap: wrap; }
.stat-success, .stat-error { padding: 0.75rem 1.5rem; border-radius: 6px; font-weight: 600; font-size: 1rem; }
.stat-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
.stat-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
.dark-mode .stat-success { background: #1e4620; color: #a3d9a5; border-color: #2d5a2e; }
.dark-mode .stat-error { background: #4a1c1c; color: #f5a3a3; border-color: #6b2929; }
.error-details { margin-top: 1rem; }
.error-details h3 { font-size: 1rem; margin-bottom: 0.75rem; color: var(--text-color); cursor: pointer; display: flex; align-items: center; gap: 0.5rem; }
.error-details h3:hover { color: var(--primary-color); }
.error-toggle { font-size: 0.75rem; transition: transform 0.2s; }
.error-toggle.expanded { transform: rotate(90deg); }
.error-list { max-height: 300px; overflow-y: auto; background: var(--input-bg); border: 1px solid var(--border-color); border-radius: 4px; padding: 0.5rem; }
.error-item { padding: 0.75rem; border-bottom: 1px solid var(--border-color); font-size: 0.875rem; }
.error-item:last-child { border-bottom: none; }
.error-row { font-weight: 600; color: #dc3545; margin-bottom: 0.25rem; }
.dark-mode .error-row { color: #f5a3a3; }
.error-message { color: var(--text-color); opacity: 0.8; }
.progress-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1.5rem; }

/* Code and Pre Blocks */
code { font-family: 'Menlo', 'Monaco', 'Courier New', monospace; font-size: 0.875rem; padding: 0.2rem 0.4rem; background: var(--input-bg); border-radius: 4px; color: var(--primary-color); }
pre { background: var(--input-bg); padding: 1rem; border-radius: 8px; overflow-x: auto; border: 1px solid var(--border-color); color: var(--text-color); }
.dark-mode code { color: #a5d6ff; }

/* Info and Warning Boxes */
.info-box { background: #e0f2fe; border: 1px solid #bae6fd; color: #0369a1; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
.warning-box { background: #fef3c7; border: 1px solid #fde68a; color: #92400e; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
.dark-mode .info-box { background: #0c4a6e; border-color: #075985; color: #e0f2fe; }
.dark-mode .warning-box { background: #78350f; border-color: #92400e; color: #fef3c7; }

/* API Key Display */
.api-key-box { margin: 1rem 0; padding: 1rem; background: var(--input-bg); border-radius: 8px; border: 1px solid var(--border-color); }
.api-key-label { margin: 0 0 0.5rem 0; font-weight: 600; color: var(--text-color); }
.api-key-code { flex: 1; padding: 0.625rem; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 6px; font-family: monospace; word-break: break-all; display: block; color: var(--primary-color); }
.api-key-warning { margin: 0.5rem 0 0 0; font-size: 0.875rem; color: var(--error-color); }

/* Settings Components */
.settings-card { background: var(--card-bg); padding: 2rem; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); margin-bottom: 2rem; }
.settings-input { width: 100%; padding: 0.75rem; border: 1px solid var(--input-border); border-radius: 8px; background: var(--input-bg); color: var(--text-color); transition: all 0.2s; }
.settings-input:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
.settings-input:disabled { opacity: 0.7; cursor: not-allowed; background: var(--hover-bg); }
.settings-helper-text { color: var(--secondary-color); font-size: 0.875rem; display: block; margin-top: 0.5rem; }

/* API Documentation Components */
.api-doc-card { background: var(--card-bg); padding: 1.5rem; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); margin-bottom: 1.5rem; }
.api-doc-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; cursor: pointer; padding: 0.5rem; margin: -0.5rem -0.5rem 0.5rem -0.5rem; border-radius: 4px; transition: background 0.2s; }
.api-doc-header:hover { background: var(--hover-bg); }
.api-doc-description { color: var(--secondary-color); margin-bottom: 1rem; cursor: pointer; padding: 0.5rem; margin: -0.5rem; border-radius: 4px; transition: background 0.2s; }
.api-doc-description:hover { background: var(--hover-bg); }
.api-doc-code-block { background: var(--input-bg); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px solid var(--border-color); }
.api-doc-table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
.api-doc-th { padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color); background: var(--table-header-bg); color: var(--text-color); font-weight: 600; }
.api-doc-td { padding: 0.75rem; border-bottom: 1px solid var(--border-color); color: var(--text-color); }
.api-doc-subtitle { margin-bottom: 0.5rem; font-size: 1rem; color: var(--text-color); font-weight: 600; }
.api-doc-warning-box { background: #fff3cd; padding: 1rem; border-radius: 4px; border-left: 4px solid #ffc107; margin-top: 1rem; }
.api-doc-warning-title { margin: 0; color: #856404; font-size: 0.875rem; font-weight: 600; }
.api-doc-warning-list { margin: 0.5rem 0 0 1.5rem; color: #856404; font-size: 0.875rem; }
.dark-mode .api-doc-warning-box { background: #4a3e10; border-color: #d9a406; }
.dark-mode .api-doc-warning-title { color: #ffeeba; }
.dark-mode .api-doc-warning-list { color: #ffeeba; }
.api-group-header { background: var(--card-bg); padding: 1rem 1.5rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; transition: background 0.2s; border: 1px solid var(--border-color); }
.api-group-header:hover { background: var(--hover-bg); }
.api-group-title { margin: 0; font-size: 1.25rem; color: var(--text-color); font-weight: 600; }
.api-group-count { color: var(--secondary-color); font-size: 0.875rem; }

/* Help Box */
.help-box { background: #e7f3ff; padding: 1rem; border-radius: 4px; border-left: 4px solid #0066cc; margin-top: 0.5rem; }
.help-box strong { display: block; margin-bottom: 0.5rem; color: #004085; }
.help-box p { margin: 0 0 0.5rem 0; color: #004085; }
.help-box p:last-child { margin: 0; }
.dark-mode .help-box { background: #08335e; border-color: #004085; }
.dark-mode .help-box strong, .dark-mode .help-box p { color: #cce5ff; }

/* Domain, Tag, Category Components */
.domain-card { background: var(--card-bg); padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 1rem; }
.tag-item, .category-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--input-bg); border-radius: 4px; margin-bottom: 0.5rem; border: 1px solid var(--border-color); }
.tag-item-edit, .category-item-edit { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--warning-bg); border-radius: 4px; margin-bottom: 0.5rem; border: 1px solid var(--warning-border); }
.code-badge { background: var(--input-bg); padding: 0.25rem 0.5rem; border-radius: 4px; margin-right: 0.5rem; font-family: monospace; color: var(--text-color); border: 1px solid var(--border-color); }
.dashboard-card { background: var(--card-bg); padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.helper-text { color: var(--secondary-color); font-size: 0.875rem; }
.warning-text { color: var(--error-color); }

/* Dark Mode Overrides for specific components */
.dark-mode .tag-item-edit, .dark-mode .category-item-edit { background: #4a3e10; border-color: #d9a406; }

/* Playground Components */
.playground-preview { background: var(--input-bg); padding: 1rem; border-radius: 4px; border: 1px solid var(--border-color); }
.playground-response-container { background: var(--input-bg); padding: 1rem; border-radius: 4px; border: 1px solid var(--border-color); }
.playground-response-body { background: var(--card-bg); padding: 1rem; border-radius: 4px; max-height: 500px; overflow-y: auto; font-family: monospace; font-size: 0.875rem; white-space: pre-wrap; word-break: break-word; line-height: 1.5; color: var(--text-color); border: 1px solid var(--border-color); }
.playground-history { margin-top: 2rem; background: var(--card-bg); padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
`;

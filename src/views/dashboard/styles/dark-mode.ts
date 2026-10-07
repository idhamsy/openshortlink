/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

export const darkModeCss = `/* Dark Mode Overrides */
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
  --warning-bg: #4a3e10;
  --warning-border: #d9a406;
  /* Dark variants of the inline callout backgrounds (light values in base.css) */
  --info-bg: #0c4a6e;
  --success-bg: #14432a;
  /* Light text/heading accents for callouts in dark mode */
  --info-text: #bae6fd;
  --warning-text: #fde68a;
  --success-text: #86efac;
}

.dark-mode .json-key { color: #79c0ff; }
.dark-mode .json-string { color: #a5d6ff; }
.dark-mode .json-number { color: #79c0ff; }
.dark-mode .json-boolean { color: #ff7b72; }
.dark-mode .json-null { color: #8b949e; }
.dark-mode .json-punctuation { color: #8b949e; }

.dark-mode .progress-container { background: #2c2c2c; }
.dark-mode .stat-success { background: #1e4620; color: #a3d9a5; border-color: #2d5a2e; }
.dark-mode .stat-error { background: #4a1c1c; color: #f5a3a3; border-color: #6b2929; }
.dark-mode .error-row { color: #f5a3a3; }
.dark-mode code { color: #a5d6ff; }

.dark-mode .info-box { background: #0c4a6e; border-color: #075985; color: #e0f2fe; }
.dark-mode .warning-box { background: #78350f; border-color: #92400e; color: #fef3c7; }

.dark-mode .api-doc-warning-box { background: #4a3e10; border-color: #d9a406; }
.dark-mode .api-doc-warning-title { color: #ffeeba; }
.dark-mode .api-doc-warning-list { color: #ffeeba; }

.dark-mode .help-box { background: #08335e; border-color: #004085; }
.dark-mode .help-box strong, .dark-mode .help-box p { color: #cce5ff; }

.dark-mode .tag-item-edit, .dark-mode .category-item-edit { background: #4a3e10; border-color: #d9a406; }

/* Status/validation/generic badges: darker backgrounds with legible text on dark cards */
.dark-mode .status-badge.status-active { background: #14432a; color: #86efac; }
.dark-mode .status-badge.status-expired { background: #78350f; color: #fde68a; }
.dark-mode .status-badge.status-archived { background: #1e3a5f; color: #93c5fd; }
.dark-mode .status-badge.status-deleted { background: #4a1c1c; color: #fca5a5; }

.dark-mode .validation-badge.badge-success { background: #14432a; color: #86efac; border-color: #2d5a2e; }
.dark-mode .validation-badge.badge-error { background: #4a1c1c; color: #fca5a5; border-color: #6b2929; }
.dark-mode .validation-badge.badge-secondary { background: #334155; color: #cbd5e1; border-color: #475569; }

.dark-mode .badge.badge-success { background: #14432a; color: #86efac; }
.dark-mode .badge.badge-secondary { background: #334155; color: #cbd5e1; }
`;

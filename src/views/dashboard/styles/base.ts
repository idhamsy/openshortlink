/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

export const baseCss = `/* Root Variables */
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
  --warning-bg: #fff3cd;
  --warning-border: #ffeeba;
}

/* Reset & Base */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
  background: var(--bg-color); 
  color: var(--text-color); 
  transition: background 0.3s, color 0.3s; 
}

/* Layout Grid */
.analytics-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}

/* Grid Spans */
.col-span-12 { grid-column: span 12; }
.col-span-8 { grid-column: span 8; }
.col-span-6 { grid-column: span 6; }
.col-span-4 { grid-column: span 4; }
.col-span-3 { grid-column: span 3; }

/* Responsive Breakpoints */
@media (max-width: 1024px) {
  .col-span-4 { grid-column: span 6; }
  .col-span-3 { grid-column: span 6; }
}

@media (max-width: 768px) {
  .col-span-8, .col-span-6, .col-span-4, .col-span-3 { grid-column: span 12; }
  .analytics-grid { gap: 1rem; }
}

/* Navbar */
.navbar { 
  background: var(--navbar-bg); 
  border-bottom: 1px solid var(--border-color); 
  padding: 0 2rem; 
  display: flex; 
  justify-content: space-between; 
  align-items: flex-start; 
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1); 
  line-height: 0;
}
.nav-brand { 
  font-size: 1.5rem; 
  font-weight: 600; 
  color: var(--text-color); 
  display: flex; 
  align-items: center; 
  line-height: 0; 
  padding: 0;
  margin: 0;
}
.nav-brand img { 
  display: block; 
  margin: 0;
  padding: 0;
  vertical-align: top;
}
.nav-brand a {
  padding: 0;
  margin: 0;
  display: flex;
  align-items: center;
  line-height: 0;
}
.nav-items { display: flex; gap: 1rem; align-items: center; align-self: center; }
.nav-brand { align-self: flex-start; }
.domain-selector { 
  padding: 0.5rem 1rem; 
  border: 1px solid var(--input-border); 
  border-radius: 6px; 
  background: var(--input-bg); 
  color: var(--text-color); 
}

/* Container & Sidebar */
.container { display: flex; height: calc(100vh - 60px); }
.sidebar { 
  width: 250px; 
  background: var(--sidebar-bg); 
  border-right: 1px solid var(--border-color); 
  padding: 1rem; 
  transition: width 0.3s ease, transform 0.3s ease; 
  position: relative; 
  overflow: hidden; 
}
.sidebar.collapsed { width: 0; padding: 0; overflow: hidden; transform: translateX(-100%); }
.sidebar-toggle { 
  position: fixed; 
  top: 50%; 
  transform: translateY(-50%); 
  left: 250px; 
  width: auto; 
  height: auto; 
  min-width: 30px; 
  min-height: 100px; 
  background: var(--primary-color); 
  color: white; 
  border: none; 
  border-radius: 0 8px 8px 0; 
  cursor: pointer; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-size: 0.75rem; 
  font-weight: bold; 
  z-index: 1000; 
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); 
  transition: all 0.2s, left 0.3s ease; 
  writing-mode: vertical-rl; 
  text-orientation: mixed; 
  padding: 0.5rem 0.25rem; 
}
.sidebar-toggle:hover { background: #4f46e5; transform: translateY(-50%) scale(1.05); }
.sidebar.collapsed + .main-content { margin-left: 0; }

/* Sidebar Nav */
.sidebar-nav { display: flex; flex-direction: column; gap: 0.5rem; }
.nav-link { 
  padding: 0.75rem 1rem; 
  text-decoration: none; 
  color: var(--sidebar-text); 
  border-radius: 8px; 
  transition: all 0.2s; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  font-weight: 500; 
}
.nav-link:hover { background: var(--sidebar-hover); }
.nav-link.active { background: var(--sidebar-active); color: white; box-shadow: 0 0 20px rgba(99, 102, 241, 0.4); }
.nav-submenu { display: none; flex-direction: column; padding-left: 1rem; margin-top: 0.25rem; }
.nav-submenu.expanded { display: flex; }
.nav-submenu-link { 
  padding: 0.5rem 1rem; 
  text-decoration: none; 
  color: var(--sidebar-text); 
  opacity: 0.8; 
  border-radius: 6px; 
  transition: all 0.2s; 
  font-size: 0.9rem; 
}
.nav-submenu-link:hover { background: var(--sidebar-hover); opacity: 1; }
.nav-submenu-link.active { background: rgba(99, 102, 241, 0.2); color: var(--primary-color); font-weight: 600; opacity: 1; }
.nav-link-toggle { margin-left: auto; font-size: 0.75rem; transition: transform 0.2s; }
.nav-link.expanded .nav-link-toggle { transform: rotate(90deg); }

/* Main Content */
.main-content { flex: 1; padding: 0.25rem 2rem 2rem 2rem; overflow-y: auto; }
.page { display: none; }
.page.active { display: block; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }

/* Settings Sections */
.settings-section { margin-bottom: 2rem; scroll-margin-top: 80px; }
.settings-section-header { 
  cursor: pointer; 
  padding: 1rem; 
  background: var(--card-bg); 
  border: 1px solid var(--border-color); 
  border-radius: 8px; 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  margin-bottom: 1rem; 
}
.settings-section-header:hover { background: var(--hover-bg); }
.settings-section-header h2 { margin: 0; font-size: 1.25rem; color: var(--text-color); }
.settings-section-toggle { font-size: 1.25rem; transition: transform 0.2s; }
.settings-section.expanded .settings-section-toggle { transform: rotate(90deg); }
.settings-section-content { display: none; }
.settings-section.expanded .settings-section-content { display: block; }
`;

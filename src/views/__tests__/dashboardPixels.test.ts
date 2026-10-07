/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, it, expect } from 'vitest';
import { dashboardHtml } from '../dashboard';
import { componentsCss } from '../dashboard/styles/components';

// dashboard.ts is one template literal: checking the RENDERED page catches escapes the
// template ate (see the backslash trap), which reading the source would not.
describe('dashboard pixel tracking UI (rendered)', () => {
  const html = String(dashboardHtml('csrf', 'nonce'));

  it('renders the library picker instead of free-text pixel rows', () => {
    expect(html).toContain('id="link-pixel-picker"');
    expect(html).toContain('id="link-pixel-count"');
    for (const gone of ['id="pixel-enabled"', 'id="add-pixel"', 'id="pixel-list"', 'remove-pixel']) {
      expect(html).not.toContain(gone);
    }
  });

  it('sends pixel_ids only when the picker loaded (never wipes pixels on a failed load)', () => {
    expect(html.match(/if \(linkPixelPickerLoaded\) formData\.pixel_ids = getSelectedPixelIds\(\);/g)).toHaveLength(2);
    expect(html).toContain('loadLinkPixelPicker(link.data.domain_id, (link.data.pixels || []).map(p => p.id), false);');
    expect(html).toContain("loadLinkPixelPicker(document.getElementById('link-domain').value, null, true);");
  });

  it('warns about browser-cached permanent redirects and same-origin third-party scripts', () => {
    expect(html).toContain('id="pixel-redirect-warning"');
    expect(html).toContain('301/308');
    expect(html).toContain('id="pixel-origin-warning"');
    expect(html).toContain('separate domain');
  });

  it('renders the Pixels page, nav item and pixel modal', () => {
    for (const id of ['pixels-page', 'pixels-list', 'add-pixel-btn', 'pixel-modal', 'pixel-form', 'pixel-form-type', 'pixel-form-pixel-id', 'pixel-form-hint', 'pixel-form-default']) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain('data-page="pixels"');
    expect(html).toContain("else if (pageName === 'pixels') loadPixelsPage();");
  });

  it('embeds the shared platform rules (Google split) as JSON', () => {
    expect(html).toMatch(/const PIXEL_RULES = \{"facebook":/);
    expect(html).toContain('"google_ads":');
    expect(html).toContain('"ga4":');
    expect(html).toContain('"pattern":"^AW-[0-9]{6,15}$"');
  });

  it('pixel checkboxes use the shared checkbox-label layout (checkbox beside its text)', () => {
    expect(html).toContain('<label class="checkbox-label"><input type="checkbox" id="pixel-form-default">');
    expect(html).toContain("label.className = 'checkbox-label';");
  });

  it('defines the red danger button style used by Delete / Disable MFA', () => {
    // Assert against the stylesheet the dashboard actually loads (/dashboard/static/components.css,
    // served from styles/components.ts via src/api/static.ts).
    expect(componentsCss).toMatch(/[.]btn-danger [{][^}]*background: #dc3545/);
    expect(componentsCss).toMatch(/[.]btn-danger:hover [{]/);
    // .form-group label is display:block; the checkbox-label row must stay flex inside forms.
    expect(componentsCss).toContain('.form-group label.checkbox-label { display: flex; }');
  });

  it('domain selector change handler is assigned once, not stacked on every refresh', () => {
    const fn = html.slice(html.indexOf('async function loadDomainSelector()'), html.indexOf('// Event delegation handler for domain buttons'));
    expect(fn).not.toContain("selector.addEventListener('change'");
    expect(fn).toContain('selector.onchange =');
  });

  it('every toggle checkbox label uses the checkbox-label layout (checkbox beside its text)', () => {
    // A bare <label> inside .form-group is display:block and its input is width:100%,
    // which stacks the checkbox centered above the text.
    const bare = html.match(/<label>\s*<input type="checkbox"[^>]*>/g) || [];
    expect(bare).toEqual([]);
    for (const id of ['geo-redirect-enabled', 'device-redirect-enabled', 'city-redirect-enabled', 'os-redirect-enabled',
      'og-meta-enabled', 'api-key-allow-all-ips', 'api-key-never-expire']) {
      expect(html).toMatch(new RegExp('<label class="checkbox-label">\\s*<input type="checkbox" id="' + id + '"'));
    }
  });

  it('every destructive action button (delete / revoke) is styled red', () => {
    const re = /<button[^>]*class="([^"]*)"[^>]*data-action="(delete|delete-tag|delete-category|delete-user|revoke)"/g;
    const found = [...html.matchAll(re)].map((m) => ({ action: m[2], cls: m[1] }));
    // links, pixels, tags, categories, users, API-key revoke + delete
    expect(found.length).toBeGreaterThanOrEqual(7);
    expect(found.filter((b) => !b.cls.split(' ').includes('btn-danger'))).toEqual([]);
  });

  it('every inline script still parses', () => {
    const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) expect(() => new Function(b)).not.toThrow();
  });
});

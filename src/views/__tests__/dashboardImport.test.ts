/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, it, expect } from 'vitest';
import { dashboardHtml } from '../dashboard';

describe('dashboard CSV import dialog (rendered)', () => {
  const html = String(dashboardHtml('csrf', 'nonce'));

  it('renders the on_existing select with skip selected and the blank-cell hint', () => {
    expect(html).toContain('id="import-on-existing"');
    expect(html).toContain('<option value="skip" selected>');
    expect(html).toContain('<option value="error">');
    expect(html).toContain('<option value="update">');
    expect(html).toContain('If a slug already exists');
    expect(html).toContain('Blank cells leave a field unchanged.');
  });

  it('sends on_existing per chunk and no longer sends slug_prefix_filter', () => {
    expect(html).toContain("formData.append('on_existing', ");
    expect(html).toContain("document.getElementById('import-on-existing')");
    expect(html).not.toContain("formData.append('slug_prefix_filter'");
  });

  it('renders created/updated/skipped/errors summary elements', () => {
    for (const id of ['created-count', 'updated-count', 'skipped-count', 'error-count']) {
      expect(html).toContain('id="' + id + '"');
    }
    expect(html).not.toContain('id="success-count"');
  });

  it('computes true row numbers across chunks with ?? (not ||)', () => {
    expect(html).toContain('chunkIndex * CHUNK_SIZE + item.row + 1');
    expect(html).not.toContain('item.row ||');
    expect(html).toContain('item.rowNum ??');
  });

  it('applies the slug prefix extraction to chunk rows, matching the preview', () => {
    expect(html).toContain('function prepareImportCell(header, cell)');
    expect(html).toContain("columnMapping[header] === 'slug' && slugPrefixFilter[header]");
    expect(html).toContain('prepareImportCell(csvData.headers[cellIndex], rawCell)');
  });

  it('every inline script still parses', () => {
    const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script[^>]*>/gi)].map(m => m[1]).filter(s => s.trim());
    expect(scripts.length).toBeGreaterThan(0);
    for (const s of scripts) expect(() => new Function(s)).not.toThrow();
  });
});

describe('in-app API docs for bulk and import (rendered)', () => {
  const html = String(dashboardHtml('csrf', 'nonce'));
  const start = html.indexOf("id: 'bulk-operations'");
  const end = html.indexOf('// Domains endpoints');
  const docs = html.slice(start, end);

  it('documents the bulk items format, the 100 cap and on_existing', () => {
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(docs).toContain('items: {');
    expect(docs).toContain('max 100');
    expect(docs).toContain('on_existing: {');
  });

  it('no longer documents slug_prefix_filter and uses 0-based rows', () => {
    expect(docs).not.toContain('slug_prefix_filter');
    expect(docs).toContain("row: 0, success: true, action: 'created'");
  });
});

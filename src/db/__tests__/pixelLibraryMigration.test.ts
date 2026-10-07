/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { describe, it, expect } from 'vitest';
import { createTestD1, seedDomain, seedLink } from '../../test-utils/sqliteD1';

function addPixel(raw: ReturnType<typeof createTestD1>['raw'], id: string, domainId: string, name: string, type = 'facebook', pid = '1234567890') {
  raw.prepare(`INSERT INTO pixel_library (id, domain_id, name, pixel_type, pixel_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, 1)`).run(id, domainId, name, type, pid);
}

describe('migration 0023 pixel library', () => {
  it('rejects duplicate (type, id) and duplicate name within a domain, allows them across domains', () => {
    const { raw } = createTestD1();
    seedDomain(raw, 'd1', 'a.test');
    seedDomain(raw, 'd2', 'b.test');
    addPixel(raw, 'p1', 'd1', 'Main');
    expect(() => addPixel(raw, 'p2', 'd1', 'Other')).toThrow(/UNIQUE/);
    expect(() => addPixel(raw, 'p3', 'd1', 'Main', 'ga4', 'G-ABCD')).toThrow(/UNIQUE/);
    expect(() => addPixel(raw, 'p4', 'd2', 'Main')).not.toThrow();
  });

  it('rejects unknown pixel types', () => {
    const { raw } = createTestD1();
    seedDomain(raw, 'd1', 'a.test');
    expect(() => addPixel(raw, 'p1', 'd1', 'X', 'google', 'AW-1')).toThrow(/CHECK/);
  });

  it('cascades: deleting a library pixel or a link removes the attachment', () => {
    const { raw } = createTestD1();
    seedDomain(raw, 'd1', 'a.test');
    seedLink(raw, 'l1', 'd1', 's1');
    seedLink(raw, 'l2', 'd1', 's2');
    addPixel(raw, 'p1', 'd1', 'Main');
    raw.prepare('INSERT INTO link_pixels VALUES (?, ?, 1)').run('l1', 'p1');
    raw.prepare('INSERT INTO link_pixels VALUES (?, ?, 1)').run('l2', 'p1');
    raw.prepare('DELETE FROM links WHERE id = ?').run('l1');
    expect(raw.prepare('SELECT COUNT(*) AS n FROM link_pixels').get()!.n).toBe(1);
    raw.prepare('DELETE FROM pixel_library WHERE id = ?').run('p1');
    expect(raw.prepare('SELECT COUNT(*) AS n FROM link_pixels').get()!.n).toBe(0);
  });

  it('keeps the pixel when its creator is deleted (created_by set to NULL)', () => {
    const { raw } = createTestD1();
    seedDomain(raw, 'd1', 'a.test');
    raw.exec("INSERT INTO users (id, username, role) VALUES ('u1', 'creator', 'user')");
    addPixel(raw, 'p1', 'd1', 'Main');
    raw.prepare('UPDATE pixel_library SET created_by = ? WHERE id = ?').run('u1', 'p1');
    raw.prepare('DELETE FROM users WHERE id = ?').run('u1');
    const row = raw.prepare('SELECT id, created_by FROM pixel_library WHERE id = ?').get('p1');
    expect(row).toBeTruthy();
    expect(row!.created_by).toBeNull();
  });
});

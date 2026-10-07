/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Unit tests for the CSV state-machine parser used by the bulk import endpoint (F7).

import { describe, it, expect } from 'vitest';
import { parseCSV } from '../import';

describe('parseCSV', () => {
  it('lower-cases mixed-case headers so auto-detect lookups match', () => {
    const rows = parseCSV('URL,Slug,Title\nhttp://a.com,abc,Hello', ',');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ url: 'http://a.com', slug: 'abc', title: 'Hello' });
  });

  it('keeps quoted fields that contain newlines intact', () => {
    const csv = 'url,title\n"http://a.com","line1\nline2"';
    const rows = parseCSV(csv, ',');
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('line1\nline2');
    expect(rows[0].url).toBe('http://a.com');
  });

  it('un-escapes doubled quotes to a single quote', () => {
    const csv = 'url,title\nhttp://a.com,"He said ""hi"""';
    const rows = parseCSV(csv, ',');
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('He said "hi"');
  });

  it('keeps a delimiter inside a quoted field', () => {
    const rows = parseCSV('url,title\nhttp://a.com,"a,b,c"', ',');
    expect(rows[0].title).toBe('a,b,c');
  });

  it('keeps a "0" cell (truthy string, not dropped)', () => {
    const rows = parseCSV('url,count\nhttp://a.com,0', ',');
    expect(rows[0].count).toBe('0');
  });

  it('handles CRLF line endings and a trailing newline', () => {
    const rows = parseCSV('url,slug\r\nhttp://a.com,one\r\nhttp://b.com,two\r\n', ',');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ url: 'http://a.com', slug: 'one' });
    expect(rows[1]).toEqual({ url: 'http://b.com', slug: 'two' });
  });

  it('skips blank lines between rows', () => {
    const rows = parseCSV('url,slug\nhttp://a.com,one\n\nhttp://b.com,two', ',');
    expect(rows).toHaveLength(2);
    expect(rows[1].slug).toBe('two');
  });

  it('supports a custom delimiter', () => {
    const rows = parseCSV('url;slug\nhttp://a.com;one', ';');
    expect(rows[0]).toEqual({ url: 'http://a.com', slug: 'one' });
  });

  it('returns [] when only a header row is present', () => {
    expect(parseCSV('url,slug\n', ',')).toEqual([]);
    expect(parseCSV('url,slug', ',')).toEqual([]);
  });
});

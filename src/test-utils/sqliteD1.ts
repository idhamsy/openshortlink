/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Test-only: a D1-compatible wrapper over Node's built-in SQLite so DB code can be
// tested against real SQL (constraints, joins, FK cascades) without a new dependency.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { Env } from '../types';

// Loaded via require so Vite's import analysis doesn't try to bundle node:sqlite.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');

export interface SqliteDb {
  exec(sql: string): void;
  prepare(sql: string): {
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
    run(...params: unknown[]): { changes: number | bigint };
  };
}

// Minimal subset of the real tables that pixel code touches.
const BASE_SCHEMA = `
CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT, role TEXT);
CREATE TABLE domains (
  id TEXT PRIMARY KEY, domain_name TEXT NOT NULL UNIQUE,
  routing_path TEXT NOT NULL DEFAULT '/*', status TEXT DEFAULT 'active'
);
CREATE TABLE links (
  id TEXT PRIMARY KEY, domain_id TEXT NOT NULL REFERENCES domains(id),
  slug TEXT NOT NULL, destination_url TEXT NOT NULL DEFAULT 'https://example.com',
  status TEXT DEFAULT 'active', UNIQUE(domain_id, slug)
);
`;

function toSqlite(v: unknown): unknown {
  if (v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v;
}

export interface CallCounter { count: number; reset(): void }

export function newCallCounter(): CallCounter {
  const c: CallCounter = { count: 0, reset() { c.count = 0; } };
  return c;
}

class Stmt {
  constructor(private db: SqliteDb, readonly sql: string, private params: unknown[] = [], private counter?: CallCounter) {}
  bind(...params: unknown[]) { return new Stmt(this.db, this.sql, params.map(toSqlite), this.counter); }
  async first<T>(col?: string): Promise<T | null> {
    if (this.counter) this.counter.count++;
    const row = this.db.prepare(this.sql).get(...this.params);
    if (!row) return null;
    return (col ? row[col] : row) as T;
  }
  async all<T>(): Promise<{ results: T[] }> {
    if (this.counter) this.counter.count++;
    return { results: this.db.prepare(this.sql).all(...this.params) as T[] };
  }
  async run() {
    if (this.counter) this.counter.count++;
    const r = this.db.prepare(this.sql).run(...this.params);
    return { success: true, meta: { changes: Number(r.changes) } };
  }
  /** batch() helper: runs the statement, returning rows if it has RETURNING. */
  exec() {
    return /\bRETURNING\b/i.test(this.sql) || /^\s*SELECT/i.test(this.sql)
      ? { results: this.db.prepare(this.sql).all(...this.params) }
      : { results: [], meta: { changes: Number(this.db.prepare(this.sql).run(...this.params).changes) } };
  }
}

export function openSqlite(): SqliteDb {
  return new DatabaseSync(':memory:');
}

/** Wrap a node:sqlite database in the D1 subset used by the app. Optionally counts calls. */
export function wrapD1(raw: SqliteDb, counter?: CallCounter) {
  return {
    prepare: (sql: string) => new Stmt(raw, sql, [], counter),
    // D1 batches are atomic: run in one transaction, roll back on any failure.
    batch: async (stmts: Stmt[]) => {
      if (counter) counter.count++;
      raw.exec('BEGIN');
      try {
        const out = stmts.map((s) => s.exec());
        raw.exec('COMMIT');
        return out;
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
}

export function createTestD1(): { env: Env; raw: SqliteDb } {
  const raw: SqliteDb = openSqlite();
  raw.exec('PRAGMA foreign_keys = ON;');
  raw.exec(BASE_SCHEMA);
  raw.exec(readFileSync(join(process.cwd(), 'migrations/0023_add_pixel_library.sql'), 'utf8'));
  return { env: { DB: wrapD1(raw) } as unknown as Env, raw };
}

export function seedDomain(raw: SqliteDb, id: string, name: string): void {
  raw.prepare('INSERT INTO domains (id, domain_name) VALUES (?, ?)').run(id, name);
}

export function seedLink(raw: SqliteDb, id: string, domainId: string, slug: string, status = 'active'): void {
  raw.prepare('INSERT INTO links (id, domain_id, slug, status) VALUES (?, ?, ?, ?)').run(id, domainId, slug, status);
}

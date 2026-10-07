// Test-only: full-schema (all migrations) SQLite D1 env with a call counter and a Map-backed KV.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Env } from '../types';
import { newCallCounter, openSqlite, wrapD1, type CallCounter, type SqliteDb } from './sqliteD1';

export type { SqliteDb };

export function createFullTestEnv(): { env: Env; raw: SqliteDb; calls: CallCounter; kv: Map<string, string> } {
  const raw = openSqlite();
  raw.exec('PRAGMA foreign_keys = ON;');
  const dir = join(process.cwd(), 'migrations');
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) {
    raw.exec(readFileSync(join(dir, f), 'utf8'));
  }
  const calls = newCallCounter();
  const kv = new Map<string, string>();
  const CACHE = {
    get: async (key: string, opts?: { type?: string } | string) => {
      calls.count++;
      const v = kv.get(key);
      if (v === undefined) return null;
      const type = typeof opts === 'string' ? opts : opts?.type;
      return type === 'json' ? JSON.parse(v) : v;
    },
    put: async (key: string, value: string) => { calls.count++; kv.set(key, value); },
    delete: async (key: string) => { calls.count++; kv.delete(key); },
  };
  return { env: { DB: wrapD1(raw, calls), CACHE } as unknown as Env, raw, calls, kv };
}

/** Seeds a domain directly (not counted). routing_path = routes[0]; routes stored in settings JSON. */
export function seedDomainRow(raw: SqliteDb, d: { id: string; domain_name: string; routes?: string[] }): void {
  const routes = d.routes && d.routes.length ? d.routes : ['/go/*'];
  const now = Date.now();
  raw.prepare(
    `INSERT INTO domains (id, cloudflare_account_id, domain_name, normalized_domain_name, routing_path, settings, created_at, updated_at)
     VALUES (?, 'test-account', ?, ?, ?, ?, ?, ?)`
  ).run(d.id, d.domain_name, d.domain_name.toLowerCase(), routes[0], JSON.stringify({ routes }), now, now);
}

export function seedUser(raw: SqliteDb, u: { id: string; role: string }): void {
  const now = Date.now();
  raw.prepare(
    `INSERT INTO users (id, email, username, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(u.id, `${u.id}@test.local`, u.id, u.role, now, now);
}

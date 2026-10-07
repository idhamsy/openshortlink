/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

// Regression: a non-admin user must not mutate links of a domain they cannot access
// via the bulk or CSV-import routes (single-item routes enforce this via requireLinkAccess).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const state: { user: any; apiKey: any } = { user: undefined, apiKey: undefined };

vi.mock('../../middleware/auth', () => {
  const setActor = async (c: any, next: any) => {
    if (state.user) c.set('user', state.user);
    if (state.apiKey) c.set('apiKey', state.apiKey);
    await next();
  };
  return { authMiddleware: setActor, authOrApiKeyMiddleware: setActor };
});

vi.mock('../../middleware/authorization', () => ({
  requirePermission: () => async (_c: any, next: any) => next(),
  requireLinkAccess: () => async (_c: any, next: any) => next(),
}));

const foreignLink = { id: 'link-b', domain_id: 'dom-b', slug: 'victim', destination_url: 'https://b.example', status: 'active' };

vi.mock('../../db/links', async (orig) => ({
  ...(await orig<any>()),
  getLinkById: vi.fn(async (_env: any, id: string) => (id === foreignLink.id ? foreignLink : null)),
  updateLink: vi.fn(),
  deleteLink: vi.fn(),
  createLink: vi.fn(),
  checkSlugExists: vi.fn(async () => false),
}));

vi.mock('../../db/domains', async (orig) => ({
  ...(await orig<any>()),
  getDomainById: vi.fn(async (_env: any, id: string) => ({
    id, domain_name: `${id}.example`, status: 'active', routes: ['/go/*'], routing_path: '/go/*',
  })),
}));

vi.mock('../../utils/permissions', async (orig) => ({
  ...(await orig<any>()),
  // The attacker only has access to dom-a.
  canAccessDomain: vi.fn(async (_env: any, user: any, domainId: string) =>
    user.role === 'admin' || domainId === 'dom-a'),
}));

vi.mock('../../services/cache', async (orig) => ({
  ...(await orig<any>()),
  deleteCachedLink: vi.fn(),
  setCachedLink: vi.fn(),
}));

import { linksRouter } from '../links';
import { importRouter } from '../import';
import { updateLink, deleteLink, createLink } from '../../db/links';
import { deleteCachedLink, setCachedLink } from '../../services/cache';

const attacker = { id: 'u-a', role: 'user', global_access: 0 };
const env = {} as any;

function app() {
  const a = new Hono();
  a.route('/links/import', importRouter);
  a.route('/links', linksRouter);
  a.onError((err: any, c) => c.json({ error: err.message }, err.status || 500));
  return a;
}

function bulk(body: unknown) {
  return app().request('/links/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, env);
}

function importCsv(domainId: string) {
  const fd = new FormData();
  fd.append('file', new File(['destination_url,slug\nhttps://evil.example,victim\n'], 'x.csv', { type: 'text/csv' }));
  fd.append('domain_id', domainId);
  fd.append('column_mapping', JSON.stringify({ destination_url: 'destination_url', slug: 'slug' }));
  return app().request('/links/import', { method: 'POST', body: fd }, env);
}

beforeEach(() => {
  vi.clearAllMocks();
  state.user = attacker;
  state.apiKey = undefined;
});

describe('cross-domain access: bulk', () => {
  it('session user cannot update a link on a domain they cannot access', async () => {
    const res = await bulk({ action: 'update', link_ids: ['link-b'], updates: { destination_url: 'https://evil.example' } });
    const json: any = await res.json();
    expect(json.data[0]).toMatchObject({ id: 'link-b', success: false });
    expect(updateLink).not.toHaveBeenCalled();
    expect(deleteCachedLink).not.toHaveBeenCalled();
    expect(setCachedLink).not.toHaveBeenCalled();
  });

  it('session user cannot delete a link on a domain they cannot access', async () => {
    const res = await bulk({ action: 'delete', link_ids: ['link-b'] });
    const json: any = await res.json();
    expect(json.data[0]).toMatchObject({ id: 'link-b', success: false });
    expect(deleteLink).not.toHaveBeenCalled();
  });

  it('scoped API key cannot touch a link outside its domains', async () => {
    state.user = undefined;
    state.apiKey = { domain_ids: ['dom-a'] };
    const res = await bulk({ action: 'delete', link_ids: ['link-b'] });
    const json: any = await res.json();
    expect(json.data[0]).toMatchObject({ id: 'link-b', success: false });
    expect(deleteLink).not.toHaveBeenCalled();
  });

  it('admin can still delete', async () => {
    state.user = { ...attacker, role: 'admin' };
    const res = await bulk({ action: 'delete', link_ids: ['link-b'] });
    const json: any = await res.json();
    expect(json.data[0]).toMatchObject({ id: 'link-b', success: true });
    expect(deleteLink).toHaveBeenCalledTimes(1);
  });
});

describe('cross-domain access: CSV import', () => {
  it('session user gets 403 importing into a domain they cannot access', async () => {
    const res = await importCsv('dom-b');
    expect(res.status).toBe(403);
    expect(createLink).not.toHaveBeenCalled();
    expect(setCachedLink).not.toHaveBeenCalled();
  });

  it('scoped API key gets 403 importing outside its domains', async () => {
    state.user = undefined;
    state.apiKey = { domain_ids: ['dom-a'] };
    const res = await importCsv('dom-b');
    expect(res.status).toBe(403);
    expect(createLink).not.toHaveBeenCalled();
  });

  it('access to the domain passes the check', async () => {
    const res = await importCsv('dom-a');
    expect(res.status).not.toBe(403);
  });
});

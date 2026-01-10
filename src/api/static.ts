/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { Hono } from 'hono';
import { baseCss } from '../views/dashboard/styles/base';
import { darkModeCss } from '../views/dashboard/styles/dark-mode';
import { componentsCss } from '../views/dashboard/styles/components';
import { apiClientJs } from '../views/dashboard/utils/api-client';
import { toastJs } from '../views/dashboard/utils/toast';
import { paginationJs } from '../views/dashboard/utils/pagination';

const app = new Hono();

// Static assets are now mounted at /dashboard/static
// So routes here are relative: /base.css -> /dashboard/static/base.css
app.get('/base.css', (c) => {
    c.header('Content-Type', 'text/css');
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    return c.body(baseCss);
});

app.get('/dark-mode.css', (c) => {
    c.header('Content-Type', 'text/css');
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    return c.body(darkModeCss);
});

app.get('/components.css', (c) => {
    c.header('Content-Type', 'text/css');
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    return c.body(componentsCss);
});

app.get('/utils/api-client.js', (c) => {
    c.header('Content-Type', 'application/javascript');
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    return c.body(apiClientJs);
});

app.get('/utils/toast.js', (c) => {
    c.header('Content-Type', 'application/javascript');
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    return c.body(toastJs);
});

app.get('/utils/pagination.js', (c) => {
    c.header('Content-Type', 'application/javascript');
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    return c.body(paginationJs);
});

export const staticRouter = app;

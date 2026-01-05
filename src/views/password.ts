/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the Common Public Attribution License Version 1.0 (CPAL-1.0)
 * See LICENSE file or https://opensource.org/license/cpal-1-0
 */

import { html, raw } from '../utils/html';
import { LOGO_DATA_URI } from '../utils/logo';

export const passwordHtml = (csrfToken: string, nonce: string, error?: string) => html`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Protected Link - OpenShort.link</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .auth-container { background: white; padding: 2.5rem; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); width: 100%; max-width: 420px; text-align: center; }
    h1 { margin-bottom: 1.5rem; text-align: center; color: #334155; font-weight: 600; font-size: 1.5rem; }
    p { margin-bottom: 1.5rem; color: #64748b; }
    .form-group { margin-bottom: 1rem; text-align: left; }
    .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #334155; font-size: 0.875rem; }
    .form-group input { width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; background: #f1f5f9; color: #334155; transition: all 0.2s; }
    .form-group input:focus { outline: none; border-color: #6366f1; background: white; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
    .btn { width: 100%; padding: 0.75rem; background: #6366f1; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; margin-top: 1rem; font-weight: 500; transition: all 0.2s; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
    .btn:hover { background: #4f46e5; transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    .error { color: #f43f5e; margin-bottom: 1rem; font-size: 0.875rem; background: #ffe4e6; padding: 0.75rem; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="auth-container">
    <div style="margin-bottom: 2rem;">
      <a href="https://openshort.link/" target="_blank" rel="noopener" style="text-decoration: none; color: inherit; display: flex; align-items: center; justify-content: center;">
        <img src="${raw(LOGO_DATA_URI)}" alt="OpenShort.link" style="height: 120px; width: auto;" />
      </a>
    </div>
    <h1>Password Protected</h1>
    <p>This link is password protected. Please enter the password to continue.</p>

    ${error ? html`<div class="error">${error}</div>` : ''}

    <form method="POST">
      <input type="hidden" name="_csrf" value="${csrfToken}">
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required autofocus placeholder="Enter password...">
      </div>
      <button type="submit" class="btn">Unlock Link</button>
    </form>
  </div>
</body>
</html>`;

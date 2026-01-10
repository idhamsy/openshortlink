/**
 * Copyright (c) 2025 OpenShort.link Contributors
 *
 * Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0)
 * See LICENSE file or https://www.gnu.org/licenses/agpl-3.0.txt
 */

import { html, raw } from '../utils/html';
import { LOGO_DATA_URI } from '../utils/logo';

export const loginHtml = (csrfToken: string, nonce: string) => html`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - OpenShort.link</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .login-container { background: white; padding: 2.5rem; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); width: 100%; max-width: 420px; }
    h1 { margin-bottom: 1.5rem; text-align: center; color: #334155; font-weight: 600; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #334155; font-size: 0.875rem; }
    .form-group input { width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; background: #f1f5f9; color: #334155; transition: all 0.2s; }
    .form-group input:focus { outline: none; border-color: #6366f1; background: white; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
    .btn { width: 100%; padding: 0.75rem; background: #6366f1; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; margin-top: 1rem; font-weight: 500; transition: all 0.2s; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
    .btn:hover { background: #4f46e5; transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .error { color: #f43f5e; margin-top: 0.5rem; font-size: 0.875rem; background: #ffe4e6; padding: 0.75rem; border-radius: 8px; }
    .register-link { text-align: center; margin-top: 1.5rem; }
    .register-link a { color: #6366f1; text-decoration: none; font-weight: 500; }
    .register-link a:hover { color: #4f46e5; }
  </style>
</head>
<body>
  <div class="login-container">
    <h1><a href="https://openshort.link/" target="_blank" rel="noopener" style="text-decoration: none; color: inherit; display: flex; align-items: center; justify-content: center; gap: 0.5rem;"><img src="${raw(LOGO_DATA_URI)}" alt="OpenShort.link" style="height: 160px; width: auto;" /></a></h1>
    <form id="login-form">
      <input type="hidden" id="csrf-token" name="_csrf" value="${csrfToken}">
      <div class="form-group">
        <label for="username">Username or Email</label>
        <input type="text" id="username" required autocomplete="username">
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" required autocomplete="current-password">
      </div>
      <div id="mfa-section" style="display: none;">
        <div class="form-group">
          <label for="mfa-code">MFA Code (6 digits)</label>
          <input type="text" id="mfa-code" maxlength="6" pattern="[0-9]{6}" placeholder="000000">
        </div>
        <div class="form-group">
          <label for="backup-code">Or Backup Code (8 digits)</label>
          <input type="text" id="backup-code" maxlength="8" pattern="[0-9]{8}" placeholder="00000000">
        </div>
      </div>
      <div id="error-message" class="error" style="display: none;"></div>
      <button type="submit" class="btn" id="login-btn">Login</button>
    </form>
    <div class="register-link">
      <a href="/dashboard/setup">First time? Setup Account</a>
    </div>
  </div>
  <script nonce="${raw(nonce)}">
    // DEBUG: console.log('Login script loaded, nonce applied');
    let mfaToken = null;
    let isMfaStep = false;
    
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const mfaCode = document.getElementById('mfa-code').value;
      const backupCode = document.getElementById('backup-code').value;
      const errorDiv = document.getElementById('error-message');
      const mfaSection = document.getElementById('mfa-section');
      const loginBtn = document.getElementById('login-btn');
      const usernameInput = document.getElementById('username');
      const passwordInput = document.getElementById('password');
      const csrfToken = document.getElementById('csrf-token').value;
      
      // Disable form during request
      loginBtn.disabled = true;
      errorDiv.style.display = 'none';
      
      try {
        let response, data;
        
        if (isMfaStep && mfaToken) {
          // MFA verification step
          if (!mfaCode && !backupCode) {
            errorDiv.textContent = 'Please enter MFA code or backup code';
            errorDiv.style.display = 'block';
            loginBtn.disabled = false;
            return;
          }
          
          response = await fetch('/dashboard/api/v1/auth/mfa/verify', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
            credentials: 'include',
            body: JSON.stringify({ 
              mfa_token: mfaToken,
              code: mfaCode || undefined,
              backup_code: backupCode || undefined,
            }),
          });
          
          data = await response.json();
        } else {
          // Initial login step
          response = await fetch('/dashboard/api/v1/auth/login', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify({ username, password }),
        });
        
          data = await response.json();
          
          // Check if MFA is required
          if (data.requires_mfa && data.mfa_token) {
            mfaToken = data.mfa_token;
            isMfaStep = true;
            
            // Show MFA section, hide username/password
            mfaSection.style.display = 'block';
            usernameInput.disabled = true;
            passwordInput.disabled = true;
            loginBtn.textContent = 'Verify MFA';
            loginBtn.disabled = false;
            
            // Clear error
            errorDiv.style.display = 'none';
            return;
          }
        }
        
        if (!response.ok) {
          errorDiv.textContent = data.error?.message || 'Login failed';
          errorDiv.style.display = 'block';
          loginBtn.disabled = false;
          
          // Reset MFA if error
          if (isMfaStep) {
            mfaSection.style.display = 'none';
            usernameInput.disabled = false;
            passwordInput.disabled = false;
            loginBtn.textContent = 'Login';
            isMfaStep = false;
            mfaToken = null;
            document.getElementById('mfa-code').value = '';
            document.getElementById('backup-code').value = '';
          }
          return;
        }
        
        // Store token in localStorage as backup
        if (data.data?.token) {
          localStorage.setItem('auth_token', data.data.token);
        }
        
        // Redirect to dashboard
        window.location.href = '/dashboard';
      } catch (error) {
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.display = 'block';
        loginBtn.disabled = false;
        
        // Reset MFA if error
        if (isMfaStep) {
          mfaSection.style.display = 'none';
          usernameInput.disabled = false;
          passwordInput.disabled = false;
          loginBtn.textContent = 'Login';
          isMfaStep = false;
          mfaToken = null;
          document.getElementById('mfa-code').value = '';
          document.getElementById('backup-code').value = '';
        }
      }
    });
  </script>
</body>
</html>`;

export const setupErrorHtml = html`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Setup - OpenShort.link</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .error-container { background: white; padding: 2.5rem; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); width: 100%; max-width: 500px; text-align: center; }
    h1 { margin-bottom: 1rem; color: #f43f5e; font-weight: 600; }
    p { color: #64748b; margin-bottom: 1rem; line-height: 1.6; }
    code { background: #f1f5f9; padding: 0.375rem 0.625rem; border-radius: 6px; font-family: 'Courier New', monospace; color: #334155; }
    a { color: #6366f1; text-decoration: none; font-weight: 500; }
    a:hover { color: #4f46e5; }
  </style>
</head>
<body>
  <div class="error-container">
    <h1>⚠️ Setup Not Configured</h1>
    <p>SETUP_TOKEN is not configured in the environment variables.</p>
    <p>Please set <code>SETUP_TOKEN</code> in your <code>wrangler.toml</code> or Cloudflare dashboard.</p>
    <p><a href="/dashboard/login">Go to Login</a></p>
  </div>
</body>
</html>`;

export const setupHtml = (csrfToken: string, nonce: string) => html`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Setup First User - OpenShort.link</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .setup-container { background: white; padding: 2.5rem; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); width: 100%; max-width: 420px; }
    h1 { margin-bottom: 1.5rem; text-align: center; color: #334155; font-weight: 600; }
    .info-box { background: #dbeafe; border: 1px solid #93c5fd; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 0.875rem; color: #1e40af; line-height: 1.5; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #334155; font-size: 0.875rem; }
    .form-group input { width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; background: #f1f5f9; color: #334155; transition: all 0.2s; }
    .form-group input:focus { outline: none; border-color: #6366f1; background: white; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
    .btn { width: 100%; padding: 0.75rem; background: #6366f1; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; margin-top: 1rem; font-weight: 500; transition: all 0.2s; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
    .btn:hover { background: #4f46e5; transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    .error { color: #f43f5e; margin-top: 0.5rem; font-size: 0.875rem; background: #ffe4e6; padding: 0.75rem; border-radius: 8px; }
    small { color: #64748b; font-size: 0.875rem; }
    a { color: #6366f1; text-decoration: none; font-weight: 500; }
    a:hover { color: #4f46e5; }
  </style>
</head>
<body>
  <div class="setup-container">
    <h1>🔗 Setup First User</h1>
    <div class="info-box">
      <strong>⚠️ Security Notice:</strong> This is a one-time setup. You need your SETUP_TOKEN to create the first user account.
    </div>
    <form id="setup-form">
      <input type="hidden" id="csrf-token" name="_csrf" value="${csrfToken}">
      <div class="form-group">
        <label for="setup-token">Setup Token</label>
        <input type="password" id="setup-token" required placeholder="Enter your SETUP_TOKEN">
        <small>Found in your environment variables (wrangler.toml or Cloudflare dashboard)</small>
      </div>
      <div class="form-group">
        <label for="username">Username</label>
        <input type="text" id="username" required autocomplete="username" pattern="[a-zA-Z0-9_-]+" minlength="3" maxlength="50">
        <small>Letters, numbers, underscore, and hyphen only</small>
      </div>
      <div class="form-group">
        <label for="email">Email (optional)</label>
        <input type="email" id="email" autocomplete="email">
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" required autocomplete="new-password" minlength="12">
        <small>Minimum 12 characters with uppercase, lowercase, number, and special character</small>
      </div>
      <div id="error-message" class="error" style="display: none;"></div>
      <button type="submit" class="btn">Create Owner Account</button>
    </form>
    <div style="text-align: center; margin-top: 1rem;">
      <a href="/dashboard/login" style="color: #007bff; text-decoration: none;">Already have an account? Login</a>
    </div>
  </div>
  <script nonce="${raw(nonce)}">
    document.getElementById('setup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const setupToken = document.getElementById('setup-token').value;
      const username = document.getElementById('username').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const errorDiv = document.getElementById('error-message');
      const csrfToken = document.getElementById('csrf-token').value;
      
      // Client-side password validation matching backend requirements
      if (password.length < 12) {
        errorDiv.textContent = 'Password must be at least 12 characters long';
        errorDiv.style.display = 'block';
        return;
      }
      if (!/[A-Z]/.test(password)) {
        errorDiv.textContent = 'Password must contain at least one uppercase letter';
        errorDiv.style.display = 'block';
        return;
      }
      if (!/[a-z]/.test(password)) {
        errorDiv.textContent = 'Password must contain at least one lowercase letter';
        errorDiv.style.display = 'block';
        return;
      }
      if (!/[0-9]/.test(password)) {
        errorDiv.textContent = 'Password must contain at least one number';
        errorDiv.style.display = 'block';
        return;
      }
      if (!/[!@#$%^&*()_+\\-=\\[\\]{};\\':"\\\\|,.<>\\/?]/.test(password)) {
        errorDiv.textContent = 'Password must contain at least one special character (!@#$%^&*()_+-=[]{};\\':"\\\\|,.<>/? etc.)';
        errorDiv.style.display = 'block';
        return;
      }
      
      try {
        const response = await fetch('/dashboard/api/v1/auth/register', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({ 
            username, 
            email: email || undefined, 
            password,
            setup_token: setupToken
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          errorDiv.textContent = data.error?.message || 'Setup failed';
          errorDiv.style.display = 'block';
          return;
        }
        
        // Store token in localStorage as backup
        if (data.data?.token) {
          localStorage.setItem('auth_token', data.data.token);
        }
        
        // Redirect to dashboard
        window.location.href = '/dashboard';
      } catch (error) {
        errorDiv.textContent = 'Network error. Please try again.';
        errorDiv.style.display = 'block';
      }
    });
  </script>
</body>
</html>`;

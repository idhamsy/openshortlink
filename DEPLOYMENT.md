# Deployment Guide

This guide explains how to **manually deploy** the Link Shortener & Tracker to Cloudflare Workers using the terminal.

> **Tip**: For a faster, automated setup, use the **[One-Click Deployment](README.md#one-click-deployment)** method described in the README.

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
- Node.js 18+ installed

## Initial Setup

### 1. Authenticate with Cloudflare

```bash
wrangler login
```

### 2. Create Required Resources

#### D1 Database

```bash
wrangler d1 create openshortlink-db
```

Copy the `database_id` from the output and save it for later.

#### KV Namespace

```bash
# Production namespace
wrangler kv:namespace create CACHE

# Preview namespace (for wrangler dev)
wrangler kv:namespace create CACHE --preview
```

Copy both the `id` (production) and `preview_id` from the output.

#### Analytics Engine

Analytics Engine is automatically available in your Cloudflare account. No setup needed.

### 3. Configure Environment Variables

#### For Local Development

1. Copy the example file:
   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. Fill in your actual values in `.dev.vars`:
   ```bash
   DATABASE_ID=your-database-id-from-step-2
   KV_NAMESPACE_ID=your-kv-namespace-id
   KV_PREVIEW_ID=your-kv-preview-id
   CLOUDFLARE_ACCOUNT_ID=your-account-id
   CLOUDFLARE_API_TOKEN=your-api-token
   ```
   
   For `SETUP_TOKEN`, choose based on your security needs:
   
   **🔐 Production (Most Secure - Recommended):**
   ```bash
   SETUP_TOKEN=$(openssl rand -hex 32)
   ```
   
   **🛡️ Personal Use (Good Security):**
   Use a strong password (min 20 chars, mix of uppercase, lowercase, numbers, special chars)
   ```bash
   SETUP_TOKEN=MyVeryStr0ng!P@ssw0rd#2024$Secure
   ```
   
   **🔧 Testing/Development (Basic Security):**
   ```bash
   SETUP_TOKEN=$(uuidgen)
   # Or visit: https://www.uuidgenerator.net/
   ```

   **Note**: `.dev.vars` is gitignored and only used for local development.

#### For Production Deployment

Update `wrangler.toml` with your resource IDs:

```toml
[[d1_databases]]
binding = "DB"
database_name = "openshortlink-db"
database_id = "your-database-id-from-step-2"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
preview_id = "your-kv-preview-id"
```

Then set secrets for sensitive values:

```bash
# Generate and set setup token
wrangler secret put SETUP_TOKEN
# When prompted, paste a secure token. Choose based on your needs:
#   🔐 Production: openssl rand -hex 32
#   🛡️ Personal Use: Strong password (20+ chars)
#   🔧 Testing: uuidgen

# Set Cloudflare account ID
wrangler secret put CLOUDFLARE_ACCOUNT_ID
# Paste your account ID

# Set Cloudflare API token (if using Analytics Engine SQL API)
wrangler secret put CLOUDFLARE_API_TOKEN
# Paste your API token (needs "Account Analytics Read" permission)
```

**Important**: Secrets are encrypted and stored securely by Cloudflare. They persist across deployments.

### 4. Update wrangler.toml

Edit `wrangler.toml` and configure:

1. **Worker name**: Change if needed
2. **D1 database_id**: Update the `database_id` with your ID from step 2
3. **KV namespace IDs**: Update `id` and `preview_id` with your IDs from step 2
4. **Routes**: (Optional) Add your custom domains

Example configuration to add for routes:
```toml
# ... existing config ...

# Routes configuration
routes = [
	{ pattern = "short.example.com/*", zone_name = "example.com" },
	{ pattern = "go.example.com/*", zone_name = "example.com" }
]
```

## Deployment

### Local Development

```bash
# Install dependencies
npm install

# Run locally with hot reload
npm run dev
```

Access at: `http://localhost:8787`

### Deploy to Production

```bash
# Deploy to Cloudflare Workers
npm run deploy
```

Or using wrangler directly:
```bash
wrangler deploy
```

### First-Time Setup

After deployment, visit your worker URL to complete the initial setup:

1. Navigate to `https://your-worker.workers.dev/dashboard/setup`
2. Enter the `SETUP_TOKEN` you generated
3. Create your first admin user

## Environment Variables Reference

### Required for wrangler.toml

| Variable | Description | How to Get |
|----------|-------------|------------|
| `database_id` | D1 Database ID | `wrangler d1 create openshortlink-db` |
| `id` (KV) | KV Namespace ID | `wrangler kv:namespace create CACHE` |
| `preview_id` (KV) | KV Preview ID | `wrangler kv:namespace create CACHE --preview` |

### Required Secrets (Production)

| Secret | Description | How to Set |
|--------|-------------|------------|
| `SETUP_TOKEN` | Initial setup token. **Keep it after setup:** since v0.10.1 it also encrypts users' MFA secrets (see below) | `wrangler secret put SETUP_TOKEN` |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID | `wrangler secret put CLOUDFLARE_ACCOUNT_ID` |
| `CLOUDFLARE_API_TOKEN` | API token for Analytics Engine | `wrangler secret put CLOUDFLARE_API_TOKEN` |


## Updating Secrets

To update a secret:

```bash
wrangler secret put SECRET_NAME
```

To list all secrets (names only, not values):

```bash
wrangler secret list
```

To delete a secret:

```bash
wrangler secret delete SECRET_NAME
```

## Troubleshooting

### "Database not found" error

Make sure the `database_id` in `wrangler.toml` matches the ID from `wrangler d1 list`.

### "KV namespace not found" error

Make sure the `id` in `wrangler.toml` matches the ID from `wrangler kv:namespace list`.

### "Setup token invalid" error

The `SETUP_TOKEN` secret must match the token you're entering in the setup page. Regenerate if needed (before any user has enabled MFA — see the warning below):

```bash
# Choose your security level:

# Production (Most Secure):
openssl rand -hex 32

# Personal Use:
# Use a strong password (20+ chars)

# Testing:
uuidgen

# Then set it:
wrangler secret put SETUP_TOKEN
```

### Local development not working

Make sure `.dev.vars` exists and contains all required values. Copy from `.dev.vars.example` if needed.

## CI/CD Integration

For automated deployments, you'll need:

1. **Cloudflare API Token** with "Workers Scripts Edit" permission
2. **Account ID** from your Cloudflare dashboard

Set these as secrets in your CI/CD platform:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Example GitHub Actions workflow:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### `SETUP_TOKEN` also protects MFA secrets (since v0.10.1)

When `SETUP_TOKEN` is set, each user's MFA (TOTP) secret is stored encrypted with it.
**Do not delete or change `SETUP_TOKEN` after users have enabled MFA.** If you do, those
users' authenticator codes stop working (login answers with "Your MFA secret can no longer be
read"). To recover:

- The user signs in with one of their **backup codes** (these keep working), then disables
  and re-enables MFA in Settings; or
- An admin opens **Users → Reset MFA** for that user (an owner's MFA can only be reset by
  another owner); the user signs in with their password and enrols MFA again.

If the only owner is locked out, clear their MFA directly in D1:

```bash
wrangler d1 execute <your-db-name> --remote --command \
  "UPDATE users SET mfa_enabled = 0, mfa_secret = NULL, mfa_backup_codes = NULL WHERE username = '<owner-username>'"
```

## Security Best Practices

1. **Never commit `.dev.vars`** - It's gitignored by default
2. **Rotate secrets regularly** - Use `wrangler secret put` to update (except `SETUP_TOKEN` once users have MFA — see above)
3. **Use strong SETUP_TOKEN** - Generate with `openssl rand -hex 32`
4. **Limit API token permissions** - Only grant what's needed
5. **Use custom domains** - Configure routes in `wrangler.toml` for production use

### Cloudflare WAF Rules (Recommended)

For additional security, configure Cloudflare WAF (Web Application Firewall) rules to protect your dashboard and API endpoints:

> **Note**: You can create separate rules for `/dashboard` and `/api` with different restrictions based on your needs. The examples below apply to both endpoints.

#### IP Restriction
Restrict access to trusted IP addresses:
1. Go to **Cloudflare Dashboard** → **Security** → **WAF** → **Custom Rules**
2. Create a new rule:
   - **Rule name**: "Dashboard/API IP Restriction"
   - **If**: `(http.request.uri.path starts with "/dashboard" or http.request.uri.path starts with "/api") and ip.src not in {1.2.3.4 5.6.7.8}`
   - **Then**: Block

#### Geographic Restrictions
Block access from countries outside your allowed list:
1. Create a new rule:
   - **Rule name**: "Dashboard Geo-Blocking"
   - **If**: `(http.request.uri.path starts with "/dashboard" or http.request.uri.path starts with "/api") and ip.geoip.country not in {"US" "GB" "AU"}`
   - **Then**: Block

#### Additional Rate Limiting
Enhance rate limiting beyond application-level protection:
1. Go to **Security** → **WAF** → **Rate Limiting Rules**
2. Create a rule:
   - **Rule name**: "Dashboard Rate Limit"
   - **If**: `http.request.uri.path starts with "/dashboard" or http.request.uri.path starts with "/api"`
   - **Requests**: 100 requests per 10 minutes
   - **Then**: Block for 1 hour

> **Note**: These Cloudflare rules work at the edge before requests reach your Worker, providing an additional security layer.

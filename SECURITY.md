# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of OpenShort.link seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Email**: [contact@openshort.link](mailto:contact@openshort.link)

**Please include:**
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Suggested fix (if you have one)
- Your name/handle for credit (optional)

### What to Expect

- **Initial Response**: Within 48-72 hours
- **Status Update**: We'll keep you informed of our progress
- **Resolution Timeline**: We aim to address critical issues within 7 days
- **Public Disclosure**: After a fix is deployed, we'll coordinate disclosure timing with you

### Recognition

Security researchers who responsibly disclose vulnerabilities will be:
- Publicly credited in our release notes (unless you prefer to remain anonymous)
- Listed in our security acknowledgments
- Given a contributor badge on GitHub

We appreciate your efforts to improve the security of OpenShort.link and the broader community.

## Security Features

OpenShort.link implements multiple layers of security to protect your data and infrastructure:

### Authentication & Access Control

- **Multi-Factor Authentication (MFA)**: TOTP-based two-factor authentication for enhanced account security
- **Role-Based Access Control (RBAC)**: Four permission levels (owner, admin, user, analyst) with granular access controls
- **No Public Registration**: Only administrators can create new user accounts
- **Session Management**: Secure, HttpOnly cookies with SameSite protection and 7-day expiration
- **Password Security**: PBKDF2 hashing with 100,000 iterations and SHA-256

### API Security

- **API Key Authentication**: Secure token-based authentication for programmatic access
- **Domain Scoping**: Restrict API keys to specific domains
- **IP Whitelisting**: Limit API access to trusted IP addresses
- **Rate Limiting**: Protection against brute-force attacks and API abuse

### Rate Limiting

Application-level rate limiting protects against abuse:
- **Login Attempts**: 5 failed attempts per 2 hours (configurable for testing environments)
- **API Endpoints**: Configurable rate limits per endpoint
- **Registration**: 3 new user registrations per hour

### Infrastructure Security

Built on Cloudflare's secure infrastructure:
- **Edge Computing**: All requests processed at Cloudflare's global edge network
- **DDoS Protection**: Automatic protection against distributed denial-of-service attacks
- **SSL/TLS**: All traffic encrypted in transit
- **Serverless Architecture**: No servers to patch or maintain

### Recommended Additional Security

For production deployments, we recommend configuring Cloudflare WAF (Web Application Firewall) rules:

#### IP Restriction
Limit dashboard and API access to trusted IP addresses:
```text
Rule: (http.request.uri.path starts with "/dashboard" or http.request.uri.path starts with "/api") 
      and ip.src not in {your.trusted.ip.address}
Action: Block
```

#### Geographic Restrictions
Block access from unauthorized countries:
```text
Rule: (http.request.uri.path starts with "/dashboard" or http.request.uri.path starts with "/api") 
      and ip.geoip.country not in {"US" "GB" "AU"}
Action: Block
```

#### Enhanced Rate Limiting
Add edge-level rate limiting:
```text
Rule: http.request.uri.path starts with "/dashboard" or http.request.uri.path starts with "/api"
Limit: 100 requests per 10 minutes
Action: Block for 1 hour
```

See the [README.md](README.md#security) for detailed configuration instructions.

## Security Update Policy

- **Critical vulnerabilities**: Patched and released as soon as possible (target: within 7 days)
- **High severity**: Released within 30 days
- **Medium/Low severity**: Included in the next scheduled release

Security updates are announced via:
- GitHub Security Advisories
- Release notes
- Project discussions

## Security Best Practices for Deployments

When deploying OpenShort.link, follow these best practices:

1. **Use Strong Secrets**
   - Generate `SETUP_TOKEN` with `openssl rand -hex 32`
   - Never commit secrets to version control
   - Rotate API tokens regularly

2. **Enable MFA**
   - Require MFA for all administrator accounts
   - Use authenticator apps (not SMS)

3. **Configure Cloudflare WAF**
   - Implement IP restrictions for dashboard access
   - Enable rate limiting at the edge
   - Monitor security events regularly

4. **Regular Updates**
   - Keep your deployment up to date with the latest releases
   - Subscribe to security advisories
   - Test updates in a staging environment first

5. **Monitor Access Logs**
   - Review Cloudflare Analytics for suspicious activity
   - Set up alerts for unusual traffic patterns
   - Audit user access regularly

6. **Principle of Least Privilege**
   - Grant users the minimum required permissions
   - Regularly audit user roles and access
   - Revoke access for inactive user accounts

7. **Trust and Access Control**
   - Only grant user accounts to trusted individuals
   - Verify identity before creating admin or owner accounts
   - Limit API key distribution to authorized personnel only
   - Treat API keys like passwords - never share publicly
   - Revoke access immediately when team members leave

## Scope

This security policy applies to:
- The OpenShort.link application code
- Official deployment methods and documentation
- Dependencies managed in package.json

**Out of Scope:**
- Third-party Cloudflare infrastructure (report to Cloudflare directly)
- User-specific configurations and customizations
- Social engineering attacks

## Contact

For security-related questions or concerns:
- **Email**: [contact@openshort.link](mailto:contact@openshort.link)
- **GitHub Issues**: For non-sensitive security discussions
- **GitHub Security Advisories**: For coordinated vulnerability disclosure

---

**Thank you for helping keep OpenShort.link and our community safe!**

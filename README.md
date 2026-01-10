# OpenShort.link - The All-in-One Open Source Serverless URL Link Shortener. 100% on Cloudflare + 1 Click Install

<div align="center">

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
![Serverless](https://img.shields.io/badge/Serverless-FD5750?logo=serverless&logoColor=white)

![Easy Setup](https://img.shields.io/badge/Setup-Easy-brightgreen?logo=rocket)
![Beginner Friendly](https://img.shields.io/badge/Beginner-Friendly-green?logo=checkmarx)
![Free Tier Available](https://img.shields.io/badge/Free_Tier-Available-success?logo=cloudflare)
![Perfect for Small Business](https://img.shields.io/badge/Perfect_for-Small_Business-blue)

![GitHub stars](https://img.shields.io/github/stars/idhamsy/openshortlink?style=social)
![GitHub forks](https://img.shields.io/github/forks/idhamsy/openshortlink?style=social)

</div>

**The Open-Source, Serverless Link Shortener Built for Everyone.**

OpenShort.link is an open-source link shortener deployable with a one-click install on Cloudflare, featuring full functionality and working on your existing domain with Cloudflare routing. Whether you're a blogger, marketer, e-commerce business, or brand, OpenShort.link gives you the tools to shorten links, track clicks, and route users intelligently based on location or device—all from your own custom domain.

Deploy with a single click and manage your links across multiple domains with comprehensive analytics, team collaboration, and powerful automation.

<div align="center">

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/idhamsy/openshortlink)

</div>

## ✨ Features

### 🚀 Core Features

- **Fast Redirects**: 100% on Cloudflare edge using Workers & KV for lightning-fast performance
- **Custom Domains**: Connect your own domain for branded short links
- **Custom Slugs**: Create memorable, branded short URLs
- **Multi-Domain Support**: Manage links across multiple domains from one account
- **Automatic URL Checker**: Monitors destination URL status to prevent dead links

### 🎯 Advanced Redirects

- **Geo-Targeting**: Route users to different URLs based on their country (up to 10 countries per link)
- **Device-Based Routing**: Target users with precision based on device type (desktop, mobile, tablet)
- **Custom Redirect Codes**: Choose from 301, 302, 307, or 308 HTTP redirect codes

### 📊 Full Analytics

Powered by Cloudflare Analytics Engine, track everything:

- **Real-time Click Tracking**: Monitor link performance as it happens
- **Geographic Data**: See where your visitors are coming from
- **Device & Browser Analytics**: Desktop, mobile, tablet breakdown plus OS and browser stats
- **Referrer Tracking**: Identify your top traffic sources
- **UTM Campaign Tracking**: Track marketing campaigns with UTM parameters
- **Custom Parameters**: Monitor custom URL parameters for advanced tracking

### 🏷️ Organization & Management

- **Tags & Categories**: Organize links with colored tags and categories for easy management
- **Search & Filtering**: Quickly find links by slug, URL, title, tags, or categories
- **Bulk Operations**: Update multiple links at once
- **Import/Export Data**: Seamlessly migrate your data in and out with CSV support
- **Column Mapping**: Smart CSV import with automatic column detection

### 📱 QR Code Generation

- **Built-in QR Codes**: Generate QR codes for any link instantly
- **QR Code Tracking**: Track offline engagement with dynamic QR codes
- **Downloadable**: Save QR codes for print materials and marketing

### 🔐 Security & Access Control

- **Multi-Factor Authentication (MFA)**: Secure accounts with TOTP-based 2FA
- **Role-Based Access Control**: Owner, Admin, Editor, and Viewer roles
- **API Keys**: Generate secure API keys for programmatic access
- **Session Management**: Secure sessions with HttpOnly, Secure, SameSite cookies
- **Password Security**: PBKDF2 hashing with 100,000 iterations and SHA-256
- **Rate Limiting**: Protection against brute force attacks

### 👥 Team Collaboration

- **Multi-User Support**: Collaborate with your team using different roles
- **User Management**: Admins can create and manage team members
- **Permission Levels**: Granular control over who can create, edit, or view links

### 🔌 Developer Features

- **RESTful API**: Full API access for automation and integration
- **API Documentation**: Comprehensive API docs with examples
- **TypeScript**: Fully typed codebase for reliability

## 🎯 Built for Every Need

- **📝 Blog**: Cloak links and track external link performance
- **📱 Social Media**: Shorten links and track click performance for posts or partnerships
- **🛍️ E-commerce**: Shorten product links and gain insights into customer engagement
- **💰 Affiliate Marketing**: Track and optimize campaigns with detailed link analytics
- **🏢 Brand**: Build brand recognition with custom short links
- **🌐 Any Use Case**: Shorten links, track clicks, and smart route by location or device

## 🛠️ Tech Stack

- **Cloudflare Workers**: Serverless runtime for global edge computing
- **Cloudflare D1**: SQL database for reliable data storage
- **Cloudflare KV**: High-speed caching for fast redirects
- **Cloudflare Analytics Engine**: Real-time click tracking and analytics
- **Hono**: Lightweight, fast web framework
- **TypeScript**: Type-safe development

## 🚀 Quick Start

### Prerequisites

- Cloudflare account (free tier works!)
- Node.js 18+ and npm (for local development)
- Wrangler CLI: `npm install -g wrangler`

### 📦 One-Click Deployment

The easiest way to get started. This defaults to a completely automated setup.

1.  **Click the Deploy Button** at the top of this page or visit [OpenShort.link](https://openshort.link)

    <div align="center">
    
    [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/idhamsy/openshortlink)
    
    </div>

2.  **Follow the Automated Setup**:
    -   You will be guided to authorize Cloudflare Workers.
    -   The system will **automatically fork** this repository to your GitHub account.
    -   It will **automatically create** the required D1 database (`openshortlink-db`) and KV namespace (`CACHE`).
    -   **Database migrations are applied automatically** during deployment.
    -   **Enter Secrets**: You will be prompted to enter values for:
        -   `SETUP_TOKEN`: Choose based on your security needs:
            -   **🔐 Production (Most Secure)**: Generate with `openssl rand -hex 32`
            -   **🛡️ Personal Use**: Use a strong password (20+ chars, mixed case, numbers, special chars)
            -   **🔧 Testing**: Generate UUID with `uuidgen` or visit [uuidgenerator.net](https://www.uuidgenerator.net/)
        -   `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID.
        -   `CLOUDFLARE_API_TOKEN`: An API Token with "Account Analytics Read" permission.

3.  **Configure Worker Routes**:
    -   After deployment, go to the **Cloudflare Dashboard** → **Workers & Pages** → Your Worker → **Settings** → **Triggers**.
    -   Add routes for your custom domain:
        -   `yourdomain.com/dashboard/*`
        -   `yourdomain.com/go/*`
    
    *Note: Ensure these routes do not clash with existing paths on your website.*

4.  **Create Your First User**:
    -   Navigate to `https://your-worker.workers.dev/dashboard/setup`
    -   Enter your `SETUP_TOKEN`.
    -   Fill in username, email, and password.

That's it! Your link shortener is fully deployed and ready.

### 🔧 Manual Deployment

For more control over the deployment process, including local development setup, custom configurations, and CI/CD integration, please refer to the detailed [**Deployment Guide**](DEPLOYMENT.md).





## 🔐 Security

### Application Security Features

-   **No Public Registration**: Only admins can create new users
-   **MFA Support**: Enable two-factor authentication for added security
-   **API Keys**: Generate secure keys for API access
-   **Session Tokens**: Secure, HttpOnly cookies with 7-day expiration
-   **Rate Limiting**: 5 login attempts per minute, 3 registrations per hour
-   **Role-Based Access Control**: Owner, Admin, Editor, and Viewer roles with granular permissions

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

## 📖 API Documentation

For detailed API documentation, including request/response examples and OpenAPI specifications, please visit your installation's dashboard and navigate to `Integration` -> `Manual Integration`.

## 🐛 Reporting Issues

Found a bug or have a feature request? We'd love to hear from you!

 **Go to [GitHub Issues](https://github.com/idhamsy/openshortlink/issues)**


### Feature Requests

Have an idea for a new feature? We welcome suggestions!

1.  **Check the roadmap**: See if it's already planned
2.  **Open a feature request**: Use the feature request template
3.  **Describe the use case**: Explain why this feature would be valuable
4.  **Provide examples**: Show how it would work

### Getting Help

-   **Documentation**: Visit [OpenShort.link/docs](https://openshort.link/docs) for detailed guides
-   **Discussions**: Use [GitHub Discussions](https://github.com/idhamsy/openshortlink/discussions) for questions


## 📄 License

Licensed under the GNU Affero General Public License Version 3 (AGPL-3.0) - see [LICENSE](./LICENSE) file for details.

AGPLv3 is a strong copyleft license. If you run a modified version of this software over a network, you must make the source code available to users of that service.

See [NOTICE](./NOTICE) for third-party license information.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and code of conduct.

1.  Fork the repository
2.  Create a feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

## 🌟 Support the Project

If you find OpenShort.link useful, please consider:

-   💰 Sponsor our project, contact us for details
-   ⭐ Starring the repository
-   🐛 Reporting bugs and requesting features
-   📖 Contributing to documentation
-   💻 Submitting pull requests
-   📢 Sharing with others

## 🔗 Links

-   **Website**: [https://openshort.link](https://openshort.link)
-   **Documentation**: [OpenShort.link/docs](https://openshort.link/docs)
-   **GitHub**: [Repository](https://github.com/idhamsy/openshortlink)
-   **Issues**: [Report a Bug](https://github.com/idhamsy/openshortlink/issues)
-   **Discussions**: [Community Forum](https://github.com/idhamsy/openshortlink/discussions)

---

**Built with ❤️ using Cloudflare Workers**

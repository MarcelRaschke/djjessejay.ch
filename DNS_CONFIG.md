# DNS Configuration for djjessejay.ch

This document contains the authoritative DNS zone configuration for the djjessejay.ch domain, configured for GitHub Pages deployment with Cloudflare DNS.

## Domain Overview

- **Domain**: djjessejay.ch
- **DNS Provider**: Cloudflare
- **Hosting**: GitHub Pages
- **Last Updated**: 17.07.2026

## Important Notes

1. **GitHub Pages with Custom Apex Domain**: When using a custom apex domain (root domain) with GitHub Pages, you MUST use A records pointing to GitHub's IP addresses. You cannot use a CNAME record for the apex domain.

2. **CNAME File**: The repository should NOT contain a CNAME file when using an apex domain. The CNAME file is only used when deploying to a subdomain (e.g., username.github.io).

3. **HTTPS**: GitHub Pages automatically provisions and renews TLS certificates for custom domains. Ensure "Enforce HTTPS" is enabled in your GitHub Pages settings.

---

## DNS Zone Records

### SOA Record (Start of Authority)

```
djjessejay.ch. 3600 IN SOA aarav.ns.cloudflare.com. dns.cloudflare.com. 2053592236 10000 2400 604800 3600
```

- **Primary Name Server**: aarav.ns.cloudflare.com.
- **Responsible Email**: dns.cloudflare.com. (admin contact)
- **Serial Number**: 2053592236 (timestamp: 2026-07-17)
- **Refresh**: 10000 seconds (2 hours 46 minutes)
- **Retry**: 2400 seconds (40 minutes)
- **Expire**: 604800 seconds (7 days)
- **Minimum TTL**: 3600 seconds (1 hour)

### NS Records (Name Servers)

```
djjessejay.ch. 86400 IN NS aarav.ns.cloudflare.com.
djjessejay.ch. 86400 IN NS rosalyn.ns.cloudflare.com.
```

Both name servers must be configured in your domain registrar's settings to point to Cloudflare.

### A Records (Address Records for Apex Domain)

These A records point the root domain to GitHub Pages' IP addresses:

```
djjessejay.ch. 3600 IN A 185.199.108.153
djjessejay.ch. 3600 IN A 185.199.109.153
djjessejay.ch. 3600 IN A 185.199.110.153
djjessejay.ch. 3600 IN A 185.199.111.153
```

**Note**: All four IP addresses are required for proper GitHub Pages functionality and redundancy.

### CNAME Record (Subdomain)

The www subdomain points to the apex domain:

```
www.djjessejay.ch. 3600 IN CNAME djjessejay.ch.
```

This ensures that visitors accessing `www.djjessejay.ch` are served the same content as `djjessejay.ch`.

### TXT Record (GitHub Pages Verification)

```
_github-pages-challenge-marcelraschke.djjessejay.ch. 3600 IN TXT "60e5f988c1da04523b99e4208c1726"
```

This TXT record is required for GitHub Pages to verify domain ownership. The challenge token is unique to this domain and repository.

---

## GitHub Pages Configuration

### Repository Settings

1. Navigate to: **Settings → Pages**
2. **Source**: Deploy from branch `main` / `root` folder
3. **Custom domain**: `djjessejay.ch`
4. **Enforce HTTPS**: ✅ Enabled (recommended)

### Verification Steps

1. Add the DNS records above to your Cloudflare DNS settings
2. Wait for DNS propagation (typically 1-4 hours with Cloudflare)
3. In GitHub Pages settings, enter `djjessejay.ch` as the custom domain
4. GitHub will automatically verify the domain using the TXT record
5. Once verified, HTTPS certificate will be provisioned automatically

---

## Cloudflare Configuration

### DNS Settings

1. Log in to Cloudflare dashboard
2. Select the `djjessejay.ch` domain
3. Navigate to **DNS → Records**
4. Add all records from the zone file above
5. Ensure the Cloudflare proxy (orange cloud icon) is **disabled** for all GitHub Pages records (DNS only)

### SSL/TLS Settings

- **SSL/TLS encryption mode**: Full (Strict)
- **Always Use HTTPS**: On
- **HTTP/2**: On
- **HTTP/3 (QUIC)**: On
- **TLS 1.3**: Enabled

### Caching Settings

- **Caching Level**: Standard
- **Browser Cache TTL**: 1 year (recommended for static assets)

---

## Troubleshooting

### DNS Not Propagating

- Check DNS propagation status using: [https://dnschecker.org/](https://dnschecker.org/)
- Verify all records are correctly entered in Cloudflare
- Ensure name servers at registrar point to Cloudflare

### GitHub Pages Not Loading

1. Verify all four A records are present
2. Check that the CNAME file has been removed from the repository
3. Ensure custom domain is correctly set in GitHub Pages settings
4. Wait up to 24 hours for GitHub to provision the SSL certificate

### Mixed Content Warnings

- Ensure all links in your HTML use HTTPS
- Check that no resources are loaded over HTTP
- Use protocol-relative URLs (//example.com) or absolute HTTPS URLs

### SSL Certificate Issues

- GitHub Pages automatically provisions Let's Encrypt certificates
- If certificate provisioning fails, remove and re-add the custom domain
- Ensure DNS records are correct before adding the custom domain

---

## Testing Your Configuration

### Verify DNS Records

```bash
# Check A records
dig djjessejay.ch A +short

# Check CNAME record
dig www.djjessejay.ch CNAME +short

# Check TXT record
dig _github-pages-challenge-marcelraschke.djjessejay.ch TXT +short

# Check NS records
dig djjessejay.ch NS +short
```

### Expected Results

```
# A records should return:
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153

# CNAME should return:
djjessejay.ch.

# TXT should return:
"60e5f988c1da04523b99e4208c1726"

# NS should return:
aarav.ns.cloudflare.com.
rosalyn.ns.cloudflare.com.
```

---

## References

- [GitHub Pages Custom Domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [Cloudflare DNS Documentation](https://developers.cloudflare.com/dns/)
- [GitHub Pages A Records](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-an-apex-domain)

---

*This file was generated on 2026-07-17 and should be updated whenever DNS changes are made.*

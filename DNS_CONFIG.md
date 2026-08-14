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


---

## Live drift audit (2026-08-14)

A live verification against the documented target state revealed significant drift.
Live DNS was resolved via DNS-over-HTTPS (Cloudflare `1.1.1.1` and Google
`dns.google`, cross-checked) and the GitHub Pages API (`gh api
repos/MarcelRaschke/djjessejay.ch/pages`). The certificate presented on `:443`
was inspected with `openssl s_client`.

The result is authoritative: **the domain is no longer delegated to Cloudflare,
the A records no longer point at GitHub Pages, the GitHub Pages custom domain is
not set, and the active TLS certificate is expired and belongs to a different
domain (`mibraflex.de`).** There is therefore no `djjessejay.ch` certificate to
renew — the underlying DNS delegation is wrong.

### Soll/Ist comparison

| Record / Setting | Documented target (`Soll`) | Live state (`Ist`) | Status |
|---|---|---|---|
| Authoritative NS | `aarav.ns.cloudflare.com.`, `rosalyn.ns.cloudflare.com.` | `ns1.hosttech.ch.`, `ns2.hosttech.ch.`, `ns3.hosttech.ch.` | **DRIFT** |
| SOA mname | `aarav.ns.cloudflare.com.` | `ns1.hosttech.ch.` | **DRIFT** |
| SOA rname | `dns.cloudflare.com.` | `dns.hosttech.eu.` | **DRIFT** |
| SOA serial | `2053592236` | `2026040135` | **DRIFT** |
| Apex A records | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` | `185.101.158.113` (single record) | **DRIFT** |
| Apex AAAA record | not documented | `2001:1680:101:8bd::1` (hosttech) | undocumented / hosttech |
| `www` CNAME | `www.djjessejay.ch. -> djjessejay.ch.` | no CNAME; `www` resolves to `185.101.158.113` via A | **DRIFT** |
| `_github-pages-challenge-marcelraschke` TXT | `"60e5f988c1da04523b99e4208c1726"` | not present (resolves to hosttech apex via wildcard, no TXT) | **DRIFT / missing** |
| Apex TXT (SPF) | not documented | `"v=spf1 +mx +a include:_spf.mail.hostserv.eu ~all"` | undocumented / hosttech |
| GitHub Pages `cname` | `djjessejay.ch` | `null` (not configured; only `marcelraschke.github.io` active) | **DRIFT** |
| GitHub Pages `https_enforced` | `true` | `true` (on the default `github.io` domain) | OK (but irrelevant while `cname` is null) |
| TLS certificate on `djjessejay.ch:443` | Let's Encrypt for `djjessejay.ch` | Let's Encrypt `R3` for `mibraflex.de`, expired `2021-04-02` | **DRIFT / expired** |

### Interpretation

The registrar has been re-delegated from Cloudflare to hosttech. The hosttech
zone points the apex (and `www`, and the challenge subdomain) at
`185.101.158.113`, which serves an expired Let's Encrypt certificate for
`mibraflex.de`. Because GitHub Pages has no custom domain configured
(`cname: null`), GitHub is not terminating TLS for `djjessejay.ch` at all — the
site is reachable only via `https://marcelraschke.github.io/djjessejay.ch/`.

This is not a certificate-renewal task. It is a DNS delegation + GitHub Pages
configuration drift that must be corrected before any `djjessejay.ch` TLS
certificate can exist.

### Corrective steps (owner action; not repo-editable)

These require access to the domain registrar, the active DNS provider
(hosttech), and GitHub repository settings — none of which can be performed from
this repository.

1. Re-delegate the domain back to Cloudflare (or keep hosttech and recreate the
   GitHub Pages records there). NS must match `aarav.ns.cloudflare.com.` /
   `rosalyn.ns.cloudflare.com.`.
2. Set apex A records to the four GitHub Pages IPs:
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
3. Set `www.djjessejay.ch.` CNAME -> `djjessejay.ch.` (not an A record).
4. Restore the verification TXT:
   `_github-pages-challenge-marcelraschke.djjessejay.ch. TXT "60e5f988c1da04523b99e4208c1726"`.
5. Ensure the Cloudflare proxy (orange cloud) is **off** (DNS only) for all
   GitHub Pages records, and SSL/TLS mode is `Full (Strict)`.
6. In GitHub -> Settings -> Pages, set the custom domain to `djjessejay.ch`
   (currently `null`) and enable Enforce HTTPS.
7. Wait for DNS propagation and automatic Let's Encrypt provisioning (minutes to
   ~24 h), then verify the certificate subject equals `djjessejay.ch`.

### Live verification commands

```bash
# Authoritative state (replace @1.1.1.1 with the authoritative NS once known)
dig djjessejay.ch NS +short
dig djjessejay.ch A +short
dig www.djjessejay.ch CNAME +short
dig _github-pages-challenge-marcelraschke.djjessejay.ch TXT +short

# GitHub Pages configuration
gh api repos/MarcelRaschke/djjessejay.ch/pages | jq '{status, cname, https_enforced}'

# Active TLS certificate (subject must be djjessejay.ch, issuer Let's Encrypt)
echo | openssl s_client -connect djjessejay.ch:443 -servername djjessejay.ch 2>/dev/null \
  | openssl x509 -noout -issuer -subject -dates -ext subjectAltName
```

*Audit performed 2026-08-14 via DoH (1.1.1.1, dns.google) and the GitHub Pages API.*

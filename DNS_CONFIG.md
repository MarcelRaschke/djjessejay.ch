# DNS Configuration for djjessejay.ch

This document contains the authoritative DNS zone configuration for the djjessejay.ch domain, configured for **Cloudflare Proxy with custom server** (IPv4 + IPv6 support).

## Domain Overview

- **Domain**: djjessejay.ch
- **DNS Provider**: Cloudflare
- **Hosting**: Custom Server (IPv4: `185.101.158.113`, IPv6: `2001:1680:101:8bd::1`)
- **CDN/Proxy**: Cloudflare (DDoS protection, caching, SSL termination)
- **Last Updated**: 08.08.2025

## Important Notes

1. **Cloudflare Proxy**: The A record (IPv4) is **proxied** (orange cloud) for DDoS protection, caching, and SSL termination. The AAAA record (IPv6) must remain **DNS only** (gray cloud) due to Cloudflare limitations.

2. **IPv6 Support**: Cloudflare automatically routes IPv6 traffic through its own IPv6 network when the A record is proxied, even if the AAAA record is DNS only. Visitors on IPv6 will still benefit from Cloudflare's infrastructure.

3. **SSL**: Cloudflare Universal SSL is used for all proxied records (automatically provisioned).

4. **GitHub Pages**: **Disabled** for this domain. Static files are served directly from the custom server.

---

## DNS Zone Records

### SOA Record (Start of Authority)

```
djjessejay.ch. 3600 IN SOA aarav.ns.cloudflare.com. dns.cloudflare.com. 2053592237 10000 2400 604800 3600
```

- **Primary Name Server**: aarav.ns.cloudflare.com.
- **Responsible Email**: dns.cloudflare.com. (admin contact)
- **Serial Number**: 2053592237 (timestamp: 2025-08-08)
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

### A Record (Address Record for Apex Domain, IPv4)

This A record points the root domain to the custom server's IPv4 address. It is **proxied** through Cloudflare (orange cloud):

```
djjessejay.ch. 3600 IN A 185.101.158.113   ; Proxied (orange cloud)
```

**Note**: Only the single server IPv4 address is required. Cloudflare proxying provides DDoS protection, caching, and SSL termination. The origin server must accept traffic from [Cloudflare's IP ranges](https://www.cloudflare.com/ips/).

### AAAA Record (Address Record for Apex Domain, IPv6)

This AAAA record points the root domain to the custom server's IPv6 address. It must remain **DNS only** (gray cloud) due to Cloudflare limitations on proxied AAAA records at the apex:

```
djjessejay.ch. 3600 IN AAAA 2001:1680:101:8bd::1   ; DNS only (gray cloud)
```

**Note**: Because the A record is proxied, Cloudflare automatically serves IPv6 visitors through its own IPv6 network. The DNS-only AAAA record ensures direct IPv6 reachability to the origin as a fallback.

### CNAME Record (Subdomain)

The www subdomain points to the apex domain (proxied):

```
www.djjessejay.ch. 3600 IN CNAME djjessejay.ch.   ; Proxied (orange cloud)
```

This ensures that visitors accessing `www.djjessejay.ch` are served the same content as `djjessejay.ch`, with Cloudflare protection applied.

---

## Server Configuration

### Origin Server (Custom Server)

The origin server hosts the static files for djjessejay.ch and must be reachable on both IPv4 (`185.101.158.113`) and IPv6 (`2001:1680:101:8bd::1`).

- **Web server**: nginx or equivalent serving the static site from the deployment root
- **TLS**: A valid certificate is required for Cloudflare's **Full (Strict)** SSL mode. Use Let's Encrypt (or an equivalent CA) for the origin certificate, covering both `djjessejay.ch` and `www.djjessejay.ch`.
- **Firewall**: Restrict HTTP/HTTPS inbound to Cloudflare's IP ranges (IPv4 and IPv6) plus your own administrative access. Direct origin access by other clients should be blocked.
- **Deploy**: See `deploy.sh` for the deployment workflow to this server.

### Verification Steps

1. Add the DNS records above to your Cloudflare DNS settings
2. Ensure the A record is **proxied** (orange cloud) and the AAAA record is **DNS only** (gray cloud)
3. Wait for DNS propagation (typically 1–4 hours with Cloudflare)
4. Confirm the origin server is serving the site over HTTPS with a valid certificate
5. Verify `https://djjessejay.ch` loads through Cloudflare and the SSL/TLS mode is **Full (Strict)**

---

## Cloudflare Configuration

### DNS Settings

1. Log in to Cloudflare dashboard
2. Select the `djjessejay.ch` domain
3. Navigate to **DNS → Records**
4. Add all records from the zone file above
5. Set the A record proxy to **Proxied** (orange cloud)
6. Set the AAAA record proxy to **DNS only** (gray cloud)

### SSL/TLS Settings

- **SSL/TLS encryption mode**: Full (Strict)
- **Always Use HTTPS**: On
- **HTTP/2**: On
- **HTTP/3 (QUIC)**: On
- **TLS 1.3**: Enabled
- **Minimum TLS Version**: 1.2

### Caching Settings

- **Caching Level**: Standard
- **Browser Cache TTL**: 1 year (recommended for static assets)
- **Always Online**: On (serves cached content if the origin is unreachable)

### Origin Server (for Full Strict SSL)

- Install a valid origin certificate (e.g., Let's Encrypt) covering `djjessejay.ch` and `www.djjessejay.ch`
- Alternatively, use a Cloudflare Origin CA certificate (valid only for Cloudflare-proxied traffic)

---

## Troubleshooting

### DNS Not Propagating

- Check DNS propagation status using: [https://dnschecker.org/](https://dnschecker.org/)
- Verify all records are correctly entered in Cloudflare
- Ensure name servers at registrar point to Cloudflare

### Site Not Loading Through Cloudflare

1. Confirm the A record is **proxied** (orange cloud) in Cloudflare
2. Verify the origin server is reachable on `185.101.158.113` (IPv4) and `2001:1680:101:8bd::1` (IPv6)
3. Check the origin firewall allows Cloudflare's IP ranges
4. Confirm the origin TLS certificate is valid (required for Full Strict SSL)
5. Review Cloudflare analytics for error responses (5xx) from the origin

### Mixed Content Warnings

- Ensure all links in your HTML use HTTPS
- Check that no resources are loaded over HTTP
- Use protocol-relative URLs (`//example.com`) or absolute HTTPS URLs

### SSL Certificate Issues

- Cloudflare Universal SSL is provisioned automatically for proxied records
- If the origin certificate is invalid, Cloudflare will return a 525/526 error — renew the origin certificate
- For Full (Strict) SSL, the origin certificate must be issued by a recognized CA or Cloudflare Origin CA

### IPv6 Connectivity Issues

- Confirm the AAAA record (`2001:1680:101:8bd::1`) is present and **DNS only**
- IPv6 visitors are primarily served by Cloudflare's IPv6 network when the A record is proxied
- If direct IPv6 origin access fails, verify the origin server listens on IPv6 and the firewall permits it

---

## Testing Your Configuration

### Verify DNS Records

```bash
# Check A record (proxied — returns Cloudflare IPs)
dig djjessejay.ch A +short

# Check AAAA record (DNS only — returns origin IPv6)
dig djjessejay.ch AAAA +short

# Check CNAME record
dig www.djjessejay.ch CNAME +short

# Check NS records
dig djjessejay.ch NS +short
```

### Expected Results

```
# A record (proxied) returns Cloudflare IPv4 ranges, e.g.:
104.21.x.x
172.67.x.x

# AAAA record (DNS only) returns the origin IPv6:
2001:1680:101:8bd::1

# CNAME should return:
djjessejay.ch.

# NS should return:
aarav.ns.cloudflare.com.
rosalyn.ns.cloudflare.com.
```

### Verify Origin Reachability

```bash
# Direct IPv4 origin (bypass Cloudflare)
curl -k --resolve djjessejay.ch:443:185.101.158.113 https://djjessejay.ch/

# Direct IPv6 origin (bypass Cloudflare)
curl -k --resolve djjessejay.ch:443:[2001:1680:101:8bd::1] https://djjessejay.ch/
```

### Verify Cloudflare Proxying

```bash
# Should return Cloudflare headers (cf-ray, server: cloudflare)
curl -I https://djjessejay.ch/
```

---

## References

- [Cloudflare DNS Documentation](https://developers.cloudflare.com/dns/)
- [Cloudflare Proxy / Orange Cloud](https://developers.cloudflare.com/fundamentals/get-started/concepts/proxy/)
- [Cloudflare SSL/TLS Modes](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/)
- [Cloudflare IP Ranges](https://www.cloudflare.com/ips/)
- [Let's Encrypt](https://letsencrypt.org/)

---

*This file was generated on 2025-08-08 and should be updated whenever DNS changes are made.*

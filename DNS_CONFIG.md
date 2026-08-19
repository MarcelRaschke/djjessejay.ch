# DNS and Cloudflare migration runbook for djjessejay.ch

This document separates the **observed production state** from the intended
Cloudflare target. It is a migration runbook, not a claim that Cloudflare is
already authoritative.

Last verified: **2026-08-19 UTC**

## 1. Observed public baseline

The following records were queried through Cloudflare's public DNS-over-HTTPS
resolver with DNSSEC enabled.

| Record | Observed value | Interpretation |
|---|---|---|
| NS | `ns1.hosttech.ch`, `ns2.hosttech.ch`, `ns3.hosttech.ch` | Hosttech is authoritative; Cloudflare DNS is not active. |
| SOA | `ns1.hosttech.ch. dns.hosttech.eu. 2026040137 ...` | Hosttech owns the live zone serial. |
| A `@` | `185.101.158.113` | Visitors reach the origin directly. |
| AAAA `@` | `2001:1680:101:8bd::1` | IPv6 reaches the origin directly. |
| A/AAAA `*` | Same origin addresses | A signed wildcard exposes the origin for arbitrary subdomains. |
| `www` | Resolves through the wildcard; no CNAME was returned | It is not an explicit Cloudflare-proxied alias. |
| MX | priority 10: `mail1.hosttech.eu`, `mail2.hosttech.eu` | Inbound mail is handled by Hosttech. |
| TXT `@` | `v=spf1 +mx +a include:_spf.mail.hostserv.eu ~all` | SPF currently authorizes Hosttech plus the web-origin addresses. |
| TXT `_dmarc` | `v=DMARC1; p=reject; pct=100` | DMARC enforcement is active, without an aggregate report address. |
| DS | key tag `20485`, algorithm `8`, digest type `2` | DNSSEC is active at the parent. |
| CAA | none | Certificate issuance is not restricted by CAA. |
| TXT `_mta-sts` | none | MTA-STS policy discovery is not active. |
| TXT `_smtp._tls` | none | SMTP TLS reporting is not active. |

### Consequences

- Cloudflare proxying, CDN caching, zone WAF rules and Cloudflare DNS analytics
  do **not** currently protect the production hostname.
- The old values `aarav.ns.cloudflare.com` and
  `rosalyn.ns.cloudflare.com` must not be copied into the registrar. A
  Cloudflare zone must be created first, and only the nameservers assigned to
  that exact zone may be used.
- The wildcard A/AAAA records make every undeclared subdomain resolve to the
  origin. Do not recreate this wildcard in Cloudflare without an explicit
  subdomain inventory and a documented need.
- Changing nameservers while the current DS record is still cached can break
  DNSSEC validation and make the domain return `SERVFAIL`.

## 2. Target architecture

Production remains on the Hosttech origin during the first migration stage.

```text
Visitor -> Cloudflare proxy -> Hosttech HTTPS origin
Mail    -> Hosttech MX (unchanged during DNS migration)
PGP     -> Cloudflare Worker preview -> custom domain after validation
```

The website and mail migrations are deliberately separated. This keeps a web
proxy change from becoming an email outage.

## 3. Cloudflare zone staging

Create the Cloudflare zone before touching the registrar. Import the complete
Hosttech zone and then reconcile it against this minimum set.

| Type | Name | Target | Proxy | Migration rule |
|---|---|---|---|---|
| A | `@` | `185.101.158.113` | Proxied | Enable only after the origin passes Full (strict) TLS. |
| AAAA | `@` | `2001:1680:101:8bd::1` | Proxied | Cloudflare supports proxying web AAAA records. |
| CNAME | `www` | `djjessejay.ch` | Proxied | Replace reliance on the wildcard with an explicit record. |
| MX | `@` | `mail1.hosttech.eu` (10) | DNS only | Preserve during the DNS-provider migration. |
| MX | `@` | `mail2.hosttech.eu` (10) | DNS only | Preserve during the DNS-provider migration. |
| TXT | `@` | Current Hosttech SPF value | DNS only | Do not change until outbound mail alignment is verified. |
| TXT | `_dmarc` | Current DMARC value | DNS only | Preserve enforcement during the initial migration. |
| A/AAAA | `*` | none by default | — | Do not recreate without an approved inventory. |

Before cutover, also export and compare all SRV, DKIM, verification, ACME,
autoconfig and other provider-specific records from Hosttech. A resolver lookup
cannot prove that every low-traffic record has been discovered.

## 4. DNSSEC-safe nameserver migration

The current zone is signed. Use one of these paths.

### Preferred: multi-signer migration

Use this only if Hosttech supports importing an external ZSK and exporting its
current ZSK.

1. Add the zone and all records to Cloudflare.
2. Enable the Cloudflare multi-signer migration flow.
3. Cross-import the Hosttech and Cloudflare ZSKs.
4. Verify both providers publish the combined DNSKEY set.
5. Add the Cloudflare DS record and assigned nameservers at the registrar.
6. Remove the old Hosttech DS and nameservers only after validation succeeds.
7. Wait at least 1.5 times the old DS TTL before removing the old ZSK.

### Fallback: temporary unsigned migration

1. Remove or disable the current Hosttech DS record at the registrar.
2. Wait for the full parent DS TTL to expire and verify that no DS is returned.
3. Change the registrar to the exact Cloudflare-assigned nameservers.
4. Wait for the old NS TTL to expire and verify Cloudflare is authoritative.
5. Enable DNSSEC in Cloudflare and confirm the new DS is published.
6. Verify A, AAAA, MX, TXT, DMARC and DNSSEC from independent resolvers.

Never switch nameservers first and “fix DNSSEC later.”

## 5. SSL/TLS and origin controls

Set these only after the origin presents a complete, trusted certificate chain
for both `djjessejay.ch` and `www.djjessejay.ch`.

- SSL/TLS encryption mode: **Full (strict)**
- Always Use HTTPS: **On**
- Minimum TLS version: **1.2**
- TLS 1.3: **On**
- HTTP/2 and HTTP/3: **On**
- Authenticated Origin Pulls: stage and test before enforcing
- Origin firewall: allow ports 80/443 only from current Cloudflare IP ranges
  after proxy cutover; keep a separately scoped administrative path
- HSTS: enable only after every required subdomain is HTTPS-clean; add
  `includeSubDomains` and `preload` only after an explicit inventory

Do not use Flexible SSL. Do not enable HSTS preload as a connectivity test.

## 6. WAF and rate limits

Apply zone rules only after traffic is actually proxied.

1. Enable the Cloudflare managed ruleset appropriate to the account plan.
2. Add a rate-limiting rule for
   `POST /api/contact`, keyed by source IP. Start in log/challenge mode and
   tune the threshold from real traffic before blocking.
3. Add a method rule for the PGP custom hostname that permits only `GET` and
   `HEAD`.
4. Keep the PGP Worker's native `PUBLIC_RATE_LIMITER` binding at 60 requests
   per minute per client key.
5. Review false positives before raising sensitivity or enabling broad bot
   challenges.

API Shield becomes useful when the public API has a stable schema,
authentication model and endpoint inventory. It should not be enabled as a
substitute for defining those boundaries.

## 7. Email decision

The two mail paths are mutually exclusive at the apex.

### A. Preserve Hosttech mail (safe default)

Keep the two Hosttech MX records, current SPF and DMARC. Verify the actual DKIM
selector from a recently delivered message before changing any mail record.

### B. Move inbound mail to Cloudflare Email Routing

Do this as a separate change window:

1. Create and verify every destination address in Cloudflare.
2. Reproduce all required custom addresses and routing rules.
3. Replace the Hosttech MX/SPF records only with the exact values generated by
   the Cloudflare dashboard.
4. Send inbound tests to every address and verify forwarding.
5. Configure a separate outbound provider and DKIM alignment; Email Routing is
   not a general outbound SMTP service.
6. Keep `p=reject` only when SPF/DKIM alignment is proven for every legitimate
   sender.

Never publish Hosttech and Cloudflare routing MX sets together as a trial.

## 8. Pages, Workers and storage

- Use a `*.pages.dev` or Workers Static Assets deployment as a preview first.
- Do not map the production custom domain until the current Express contact API
  has a tested replacement or remains deliberately routed to the origin.
- Deploy `workers/pgp-directory` to `workers.dev` first, set only the public
  PGP key as a Worker secret, validate rollback, and then add a custom domain.
- Provision storage only with a named consumer and retention model:
  - D1: structured contact/audit records only after privacy and deletion rules
    are defined.
  - KV: non-secret edge configuration or cache metadata.
  - R2: media/provenance objects with private-by-default access.
- Do not create unused D1, KV or R2 resources merely to satisfy an inventory
  checkbox.

## 9. Verification

Run the repository verifier before and after each stage:

```bash
./verify_dns.sh current

# After Cloudflare cutover, pass the exact assigned nameservers:
CLOUDFLARE_NAMESERVERS="name1.ns.cloudflare.com name2.ns.cloudflare.com" \
  ./verify_dns.sh cloudflare
```

The cutover is complete only when:

- the parent delegates exclusively to the assigned Cloudflare nameservers;
- DNSSEC validates with the new Cloudflare chain;
- apex and `www` return Cloudflare anycast addresses, not origin addresses;
- HTTPS succeeds in Full (strict) mode;
- Hosttech mail still receives mail, or the separately approved Email Routing
  migration has passed end-to-end tests;
- the origin rejects untrusted direct web traffic after the rollback window.

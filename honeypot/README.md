# Honeypot System — djjessejay.ch

Low-interaction honeypot for detecting and logging reconnaissance attacks against the backend.

## Overview

This honeypot creates fake endpoints that legitimate traffic should never hit. When probed, it:
- **Logs** request metadata (IP, User-Agent, path, payload size)
- **Analyzes** patterns for suspicious behavior
- **Alerts** on threshold violations (scanning patterns, oversized payloads)
- **Responds** with plausible-but-fake data to deceive bots

> **Reach:** in production the Cloudflare Worker forwards only `/api` and `/api/*` to this
> server; every other path goes to GitHub Pages. Through `https://djjessejay.ch` the
> decoys that can fire are therefore the `/api/*` ones (`/api/users`, `/api/admin`,
> `/api/v1/users`, `/api/v2/users`, `/api/graphql`). Root-level decoys such as `/wp-admin`
> only fire for requests that reach the Express origin directly.

## Features

### Fake Endpoints

The honeypot intercepts ~30 common reconnaissance paths:
- CMS (WordPress, admin panels): `/wp-admin`, `/administrator`, `/admin`
- Configuration/backups: `/.env`, `/config.php`, `/backup.sql`, `/.git`
- API endpoints: `/api/users`, `/graphql`, `/xmlrpc.php`
- Shells/uploads: `/shell.php`, `/upload.php`
- Debug info: `/phpinfo.php`, `/debug`

See `honeypot-config.js` for complete list.

### Logging

All honeypot hits are logged to `honeypot/.logs/honeypot.jsonl` (JSONL format):

```json
{
  "timestamp": "2026-09-27T14:30:22.123Z",
  "ip": "203.0.113.42",
  "forwardedFor": null,
  "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
  "path": "/wp-admin",
  "method": "GET",
  "query": null,
  "payloadSize": 0,
  "headers": {
    "referer": null,
    "accept": "*/*",
    "accept-language": null
  }
}
```

### Alert Triggers

Alerts fire on:
1. **Scanning behavior**: same IP requests 10+ distinct decoy paths within 1 minute. Paths are
   compared case-sensitively and in full, so `/api/users/1` ... `/api/users/10` counts as ten
2. **Oversized payload**: `Content-Length` > 5000 bytes on a decoy request

At most one alert per IP every 10 minutes (`alerts.cooldownMs`). Alerts are only sent
when `HONEYPOT_ALERTS=true`; hits are logged regardless.

## Configuration

Provide these variables to the Node process. `server.js` does not load a `.env` file, so
use whatever already supplies `SMTP_*` / `RECAPTCHA_*` (Plesk app settings, systemd
`EnvironmentFile=`, PM2 ecosystem file, or `node --env-file=.env server.js`):

```bash
# Enable honeypot alerts (email + webhook)
HONEYPOT_ALERTS=true

# Monitoring dashboard auth token
HONEYPOT_MONITOR_TOKEN=your_secret_token_here

# Email alerts (requires SMTP config)
HONEYPOT_ALERT_EMAIL=security@djjessejay.ch

# Webhook alerts (optional)
HONEYPOT_WEBHOOK_URL=https://your-webhook-service.com/alerts

# Log file (optional; default: honeypot/.logs/honeypot.jsonl next to this code).
# Keep it outside the repo root or in a dot-directory (see Security Notes).
# HONEYPOT_LOG_FILE=/var/log/djjessejay/honeypot.jsonl

# SMTP configuration (for email alerts)
SMTP_HOST=mail.example.com
SMTP_PORT=587
SMTP_USER=noreply@djjessejay.ch
SMTP_PASS=your_smtp_password
SMTP_SECURE=false
```

## API

Authenticate with the `x-honeypot-token` header (preferred, since query strings end up in
access logs) or `?token=`. `Authorization: Bearer` is **not** supported. The endpoints
return 401 unless `HONEYPOT_MONITOR_TOKEN` is set on the server.

### View Recent Hits

```bash
curl -H "x-honeypot-token: YOUR_TOKEN" "http://localhost:3000/api/honeypot/hits?minutes=60"
```

Response:
```json
{
  "stats": {
    "totalHits": 127,
    "timeWindow": "60m",
    "uniqueIPs": 8,
    "uniquePaths": 15,
    "methods": {"GET": 120, "POST": 7},
    "topIPs": [
      {"ip": "203.0.113.42", "count": 45},
      {"ip": "198.51.100.15", "count": 28}
    ],
    "topPaths": [
      {"path": "/wp-admin", "count": 35},
      {"path": "/.env", "count": 22}
    ]
  },
  "recentHits": [...]
}
```

### Export Logs as CSV

```bash
curl -H "x-honeypot-token: YOUR_TOKEN" \
  "http://localhost:3000/api/honeypot/export?minutes=1440" -o honeypot-export.csv
```

## Integration with Express

The honeypot middleware is integrated in `server.js`:

1. **Early middleware** — runs before the body parsers, CORS and the `/api` rate limiter and
   answers decoy paths itself. It never reads the request body; payload size comes from the
   `Content-Length` header.
2. **Monitoring router** — `/api/honeypot/hits` and `/api/honeypot/export`
3. **Log location** — the default log directory is `honeypot/.logs/`, a dot-directory, so
   the existing `express.static(__dirname, { dotfiles: 'ignore' })` never serves it.

No changes needed to existing routes (`/api/contact`, `/api/ai/generate`, etc.). The
honeypot fails open: if the log cannot be written it reports the error (at most once a
minute) and keeps answering.

## Threat Intelligence

### Common Patterns

- **WordPress scanners**: High volume to `/wp-admin`, `/wp-json`, `/xmlrpc.php`
- **Config probing**: Single requests to `/.env`, `/config.php`, `/backup`
- **API enumeration**: Sequential requests to `/api/v1/users`, `/api/v2/users`, `/graphql`
- **Shell uploads**: POST to `/upload.php`, `/shell.php`, `/admin.php`

### Analysis

Run periodic analysis on `honeypot/.logs/honeypot.jsonl`:

```bash
# Count hits by IP
jq -r '.ip' honeypot/.logs/honeypot.jsonl | sort | uniq -c | sort -rn

# Count hits by path
jq -r '.path' honeypot/.logs/honeypot.jsonl | sort | uniq -c | sort -rn

# Find probing patterns (multiple paths from same IP)
jq -s 'group_by(.ip) | map(select(length > 5) | {ip: .[0].ip, paths: (map(.path) | unique | length)})' honeypot/.logs/honeypot.jsonl
```

## Response Strategy

Different endpoint types return different fake responses:

| Category | Status | Response |
|----------|--------|----------|
| Default | 404 | `{"error": "Not Found"}` |
| Path contains `wp-` or `admin` | 401 | `{"error": "Unauthorized"}` |
| Path contains `api` | 403 | `{"error": "Forbidden"}` |

Matching is by case-insensitive path prefix; the first matching category above (admin, then
API) wins over the default.

## Performance

- **Overhead on normal traffic**: one prefix scan over the decoy list per request
- **Async I/O**: log appends and email/webhook alerts do not block the event loop
- **Memory**: per-IP tracking holds at most 10 fixed-size path fingerprints for at most 10,000
  IPs (a few MB worst case); it is pruned when full
- **Disk**: roughly 0.3-1KB per hit, more when a request carries a long query string (`query` is
  logged unclipped); the log is never rotated automatically

## Upgrading from the earlier `honeypot/logs/` default

Versions before this change wrote to `honeypot/logs/honeypot.jsonl`. That directory is inside the
statically served repo root, so an old log file stays downloadable after you pull the new code
(the server prints a `[HONEYPOT] legacy log ...` warning at startup if it exists). Move it out of
the repo, or delete it, when you deploy:

```bash
mv honeypot/logs/honeypot.jsonl /root/honeypot-legacy.jsonl && rmdir honeypot/logs   # or rm -rf honeypot/logs
```

The old default was relative to the process working directory, so also check any other directory
the app was started from for a stray `honeypot/logs/`.

## Security Notes

1. **Token protection**: Monitoring endpoints require `HONEYPOT_MONITOR_TOKEN`
2. **Personal data**: logs contain IP addresses, user-agents and full query strings (attacker
   supplied, may contain credentials). Restrict access and set a retention period.
3. **Client IP behind Cloudflare**: `server.js` does not set `trust proxy`, so `ip` is the
   socket peer address (a Cloudflare edge address for Worker-proxied traffic), and
   per-IP alert grouping is only as good as that address. `forwardedFor` records
   `CF-Connecting-IP` / `X-Forwarded-For` as sent and is **not verified**. Setting
   `trust proxy` correctly is a deployment decision that also affects the rate limiters.
4. **Log rotation**: rotate `honeypot.jsonl` externally (logrotate); it is read whole by the
   monitor endpoints, so keep it small.
5. **No rate limit on decoys**: the honeypot runs before the `/api` rate limiter, so decoy
   requests are not throttled by the app. Rely on Cloudflare rate limiting.
6. **Static serving**: `server.js` serves the repo root as static files. The default log
   directory is a dot-directory, which `dotfiles: 'ignore'` hides (including against
   `%`-encoded, `//` and `/./` path tricks). If you set `HONEYPOT_LOG_FILE`, keep it outside
   the repo root or inside a dot-directory.
7. **Git**: `honeypot/.logs/` is gitignored; never commit log files.

## Troubleshooting

### Honeypot not catching requests

- Hits are always logged; `HONEYPOT_ALERTS` only controls alerts
- Check the log file exists and is writable by the user running Node (write failures appear
  in the server output as `[HONEYPOT] log write failed`)
- Confirm the path matches a prefix in `honeypot-config.js`
- Remember that through the public domain only `/api/*` reaches this server
- Test locally with: `curl -i http://localhost:3000/api/users` (expect 403)

### Alerts not sending

- Check SMTP configuration (`HONEYPOT_ALERT_EMAIL` set)
- Verify the variable is set in the *process* environment (not just a `.env` file)
- Both `HONEYPOT_ALERT_EMAIL` and `SMTP_HOST` are required for email; the webhook only needs
  `HONEYPOT_WEBHOOK_URL`
- Alerts are rate limited to one per IP per 10 minutes
- Test SMTP connection: `telnet your-smtp-host 587`
- Check logs for error messages

### Performance issues

- Use a webhook instead of email if alert volume is a problem
- Adjust `alertThresholds` / `cooldownMs` in `honeypot-config.js` if too noisy
- Rotate the log file to prevent unbounded growth

## Future Enhancements

- [ ] Geolocation tracking (GeoIP)
- [ ] Blacklist integration (abuse.ch, AbuseIPDB)
- [ ] Graphical dashboard
- [ ] Machine learning for anomaly detection
- [ ] Slack integration for alerts

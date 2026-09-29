# Honeypot System — djjessejay.ch

Low-interaction honeypot for detecting and logging reconnaissance attacks against the backend.

## Overview

This honeypot creates fake endpoints that legitimate traffic should never hit. When probed, it:
- **Logs** request metadata (IP, User-Agent, path, payload size)
- **Analyzes** patterns for suspicious behavior
- **Alerts** on threshold violations (scanning patterns, oversized payloads)
- **Responds** with plausible-but-fake data to deceive bots

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

All honeypot hits logged to `honeypot/logs/honeypot.jsonl` (JSONL format):

```json
{
  "timestamp": "2026-09-27T14:30:22.123Z",
  "ip": "203.0.113.42",
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
1. **Scanning behavior**: Same IP probes 10+ fake endpoints in 1 minute
2. **Oversized payload**: POST/PUT > 5KB
3. **Rate threshold**: 5+ hits per minute (configurable)

## Configuration

Set environment variables in `.env`:

```bash
# Enable honeypot alerts (email + webhook)
HONEYPOT_ALERTS=true

# Monitoring dashboard auth token
HONEYPOT_MONITOR_TOKEN=your_secret_token_here

# Email alerts (requires SMTP config)
HONEYPOT_ALERT_EMAIL=security@djjessejay.ch

# Webhook alerts (optional)
HONEYPOT_WEBHOOK_URL=https://your-webhook-service.com/alerts

# SMTP configuration (for email alerts)
SMTP_HOST=mail.example.com
SMTP_PORT=587
SMTP_USER=noreply@djjessejay.ch
SMTP_PASS=your_smtp_password
SMTP_SECURE=false
```

## API

### View Recent Hits

```bash
curl "http://localhost:3000/api/honeypot/hits?token=YOUR_TOKEN&minutes=60"
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
curl "http://localhost:3000/api/honeypot/export?token=YOUR_TOKEN&minutes=1440" \
  -o honeypot-export.csv
```

## Integration with Express

The honeypot middleware is integrated in `server.js`:

1. **Raw body capture** — logs POST/PUT payload sizes
2. **Early middleware** — intercepts fake endpoints before other routes
3. **Monitoring router** — `/api/honeypot/hits` and `/api/honeypot/export`

No changes needed to existing routes (`/api/contact`, `/api/ai/generate`, etc.).

## Threat Intelligence

### Common Patterns

- **WordPress scanners**: High volume to `/wp-admin`, `/wp-json`, `/xmlrpc.php`
- **Config probing**: Single requests to `/.env`, `/config.php`, `/backup`
- **API enumeration**: Sequential requests to `/api/v1/users`, `/api/v2/users`, `/graphql`
- **Shell uploads**: POST to `/upload.php`, `/shell.php`, `/admin.php`

### Analysis

Run periodic analysis on `honeypot/logs/honeypot.jsonl`:

```bash
# Count hits by IP
jq -r '.ip' honeypot/logs/honeypot.jsonl | sort | uniq -c | sort -rn

# Count hits by path
jq -r '.path' honeypot/logs/honeypot.jsonl | sort | uniq -c | sort -rn

# Find probing patterns (multiple paths from same IP)
jq -s 'group_by(.ip) | map(select(length > 5) | {ip: .[0].ip, paths: (map(.path) | unique | length)})' honeypot/logs/honeypot.jsonl
```

## Response Strategy

Different endpoint types return different fake responses:

| Category | Status | Response |
|----------|--------|----------|
| Default | 404 | `{"error": "Not Found"}` |
| WordPress | 401 | `{"error": "Unauthorized"}` |
| Admin | 401 | `{"error": "Unauthorized"}` |
| API | 403 | `{"error": "Forbidden"}` |

This minimizes attacker confidence while avoiding 404 which hints "nothing here."

## Performance

- **Minimal overhead**: Single regex test per request
- **Async alerts**: Non-blocking email/webhook
- **Memory**: IP tracking resets every 60 seconds
- **Disk**: ~1KB per hit, ~50MB/month @ 100 hits/day

## Security Notes

1. **Token protection**: Monitoring endpoints require `HONEYPOT_MONITOR_TOKEN`
2. **No PII**: Only logs IPs and request metadata (no user sessions/cookies)
3. **Log rotation**: Implement external log rotation (logrotate, ELK stack)
4. **Firewall integration**: Consider feeding logs to Fail2Ban or similar

## Troubleshooting

### Honeypot not catching requests

- Verify `HONEYPOT_ALERTS=true` in `.env`
- Check `honeypot/logs/honeypot.jsonl` exists and is writable
- Confirm fake endpoint path in `honeypot-config.js`
- Test with: `curl http://localhost:3000/wp-admin`

### Alerts not sending

- Check SMTP configuration (`HONEYPOT_ALERT_EMAIL` set)
- Verify `HONEYPOT_ALERTS=true`
- Test SMTP connection: `telnet your-smtp-host 587`
- Check logs for error messages

### Performance issues

- Disable email alerts, use webhook only
- Reduce alert thresholds if too noisy
- Implement log rotation to prevent unbounded file growth

## Future Enhancements

- [ ] Geolocation tracking (GeoIP)
- [ ] Blacklist integration (abuse.ch, AbuseIPDB)
- [ ] Graphical dashboard
- [ ] Machine learning for anomaly detection
- [ ] Slack integration for alerts

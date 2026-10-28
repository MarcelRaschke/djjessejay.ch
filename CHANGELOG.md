# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed
- Bot-Schutz des Kontaktformulars von Google reCAPTCHA v3 auf Cloudflare Turnstile umgestellt (`lib/turnstile.js`, `TURNSTILE_SECRET_KEY`, Repository-Variable `TURNSTILE_SITE_KEY`). Prüfung fail closed inklusive Hostname und Action; keine Google-Cookies mehr.
- `/api/contact` schreibt Name und E-Mail nicht mehr ins Erfolgs-Log.

### Fixed
- CSP von `index-legacy.html` erlaubt `connect-src 'self'`; der Formular-Versand an `/api/contact` war bisher vom Browser blockiert.

### Removed
- `scripts/replace-recaptcha-key.mjs`, ersetzt durch `scripts/inject-site-keys.mjs`.

### Added
- Pull request template
- CI workflow for Python 3.13 and Node 24
- Feature request issue template update
- Server-side AI proxy endpoint `/api/ai/generate` that holds the Anthropic API key only in the server environment and forwards to Anthropic with server-owned system instructions keyed by feature id.
- Cloudflare Worker routes `/api/*` (GET/HEAD/POST) to the Express backend origin (`API_ORIGIN_HOST`), keeping static-site POST rejection intact for all other paths.
- GitHub Pages build injects the reCAPTCHA site key into `index.html` when the `RECAPTCHA_SITE_KEY` repository variable is set.

### Security
- Removed client-side transmission of an Anthropic API key on the primary path; the browser now calls the own `/api/ai/generate` proxy. A direct browser-to-Anthropic call remains only as a fallback when the proxy reports HTTP 503 and a client-side key is present (e.g. local development).
- System prompts are server-authoritative; clients send only a feature id and user input, preventing system-role prompt injection from the client.
- Added stricter rate limiting for the AI proxy endpoint.
- reCAPTCHA key injection now replaces only the canonical `YOUR_RECAPTCHA_SITE_KEY` placeholder (no partial substring replacement of the JS constant name).

### Changed
- Pull request template now asks for a changelog entry.
- Live-site smoke test now also rejects disallowed methods (DELETE) on `/api/*`.
- `.gitignore` excludes Python bytecode (`__pycache__/`, `*.pyc`).

# CLAUDE.md — AI Assistant Guide for djjessejay.ch

## Project Overview

Personal website of **DJ Jesse Jay** (Michael Fellner), a DJ from Zürich,
Switzerland, active since 1997. Known for the radio show "Blue Dimension"
(formerly "Galaxy Space Night") on Radio LoRa — progressive, house, techno,
and deep house.

The site started as a purely static page and now has **two parts**:

1. **Static frontend** — `index.html` (modern, Tailwind-based) with
   browser-side AI features that call the Claude API directly.
2. **Node/Express backend** — `server.js`, which serves the static files and
   exposes a reCAPTCHA-protected `/api/contact` endpoint that sends email via
   SMTP.

> The frontend can be hosted on GitHub Pages, but the **Express backend
> (`server.js`) cannot run on Pages** — it needs a Node host (or serverless
> function). The contact form only works where `server.js` is running.

---

## Tech Stack

| Layer        | Technology                                                        |
|--------------|-------------------------------------------------------------------|
| HTML         | Vanilla HTML5, `lang="de"` (German)                               |
| CSS          | Tailwind CSS (local build via `@tailwindcss/cli`) + `jessejay.css` (legacy) |
| Frontend JS  | Vanilla JS — `index.html` inline scripts + `scripts.js`           |
| Backend      | Node.js ≥ 24, Express 5 (`server.js`)                             |
| Email        | nodemailer (SMTP)                                                 |
| Bot defense  | Google reCAPTCHA v3 (client `grecaptcha.execute` + server `siteverify`) |
| AI features  | Claude API (`api.anthropic.com/v1/messages`, model `claude-sonnet-4-6`) |
| Build        | webpack + Babel (`src/index.js` → `dist/bundle.js`)               |
| Deployment   | GitHub Actions (`static.yml` → GitHub Pages for the static files) |
| CI / Security| CodeQL, Dependency Review, DCO, branch rulesets on `main`         |

---

## Repository Structure

```
djjessejay.ch/
├── index.html              # PRIMARY page — Tailwind UI, Claude AI features, contact form
├── home.html / home.htm    # Legacy HTML versions
├── jessejay.css            # Legacy base stylesheet
├── scripts.js              # Legacy vanilla JS (audio players, gallery)
│
├── server.js               # Express backend: static serving + POST /api/contact
├── package.json            # Scripts + deps (express, nodemailer; webpack/tailwind dev)
├── webpack.config.js       # Build config (entry: src/index.js)
├── tailwind.config.js      # Tailwind config
├── src/index.js            # Webpack entry point
│
├── .claude/
│   ├── skills/             # Project skills (debug, security-audit, pr-review, …)
│   └── settings.local.json # Local env (GITIGNORED — holds secrets like GH_TOKEN)
│
├── *.sql / *.xml           # Historical phpMyAdmin/MariaDB archives (NOT a live DB)
├── web_scraper/            # Standalone Python utility (not site-integrated)
├── *.swf / *.gif / *.mov   # Legacy Flash-era + media assets (read-only artifacts)
│
└── .github/workflows/      # static.yml (deploy), codeql.yml, dependency-review.yml,
                            # auto-pr.yml, greetings.yml, stale.yml, … (+ template noise)
```

---

## How the AI Features Work (`index.html`)

- `callClaudeAPI(prompt, systemInstruction)` POSTs to
  `https://api.anthropic.com/v1/messages` with model `claude-sonnet-4-6`.
- Requests are made **directly from the browser**, using the header
  `anthropic-dangerous-direct-browser-access: true`.
  **This is a deliberate design decision** for this static-first site — do not
  "fix" it by routing through a backend unless explicitly asked.
- `const apiKey = "";` in `index.html` is **intentionally empty** — the key is
  injected by the hosting environment, never committed. Do not hardcode a key.
- A `Content-Security-Policy` meta tag restricts `connect-src` to
  `api.anthropic.com` and the reCAPTCHA endpoints — keep it in sync if you add
  external calls.

## How the Contact Form Works

1. Browser runs `grecaptcha.execute(SITE_KEY, { action: 'contact' })` (v3) and
   attaches the token as `g-recaptcha-response`.
2. `POST /api/contact` (in `server.js`) validates fields, then verifies the
   token server-side via `https://www.google.com/recaptcha/api/siteverify`.
3. Requests with `score < RECAPTCHA_SCORE_THRESHOLD` (default `0.5`) are
   rejected with `403`.
4. On success, nodemailer sends the message via SMTP. If SMTP env vars are
   absent, the submission is logged instead of emailed (no hard failure).

### Required environment variables (backend)

| Variable                    | Purpose                                  |
|-----------------------------|------------------------------------------|
| `RECAPTCHA_SECRET_KEY`      | reCAPTCHA v3 server-side secret          |
| `RECAPTCHA_SCORE_THRESHOLD` | Min. score to accept (default `0.5`)     |
| `SMTP_HOST` / `SMTP_PORT`   | SMTP server (port default `587`)         |
| `SMTP_SECURE`               | `"true"` for TLS                         |
| `SMTP_USER` / `SMTP_PASS`   | SMTP credentials                         |
| `CONTACT_EMAIL_TO`          | Recipient address for contact messages   |

> **Placeholder to replace:** `YOUR_RECAPTCHA_SITE_KEY` appears twice in
> `index.html` (the `api.js?render=` script tag and the `RECAPTCHA_SITE_KEY`
> constant). Both need the real v3 site key.

---

## Development Workflow

```bash
npm install              # install deps (uses package-lock.json + overrides)
npm start                # run the Express backend (node server.js) on :3000
npm run dev              # webpack watch build (frontend bundle)
npm run build            # production webpack build → dist/bundle.js
npm run build:css        # build Tailwind → tailwind.css
npm audit                # must report 0 vulnerabilities
```

Serving the static page without the backend (no contact form):

```bash
python -m http.server 8000   # then open http://localhost:8000
```

### Dependency security

`package.json` uses an `overrides` block to pin patched transitive versions
(`http-proxy-middleware`, `uuid`) that webpack-dev-server would otherwise pull
in vulnerable. Keep `npm audit` at **0 vulnerabilities**; prefer fixing via
`overrides` for dev-only transitive issues rather than downgrading.

### Branch strategy & merge requirements

- **`main`** — production; `static.yml` deploys the static files to GitHub Pages.
- **Feature branches** — `claude/<description>-<id>`.
- `main` has rulesets: **`required_signatures`** and **`required_linear_history`**,
  and a **DCO** check — every commit needs a `Signed-off-by:` trailer
  (`git commit -s` / `git rebase --signoff`).
- API merges are blocked by the environment's egress proxy; merge PRs through
  the GitHub web UI (which also signs the merge commit).

---

## Important Context for AI Assistants

1. **Two deployment targets** — static frontend (Pages) + Node backend
   (separate host). Don't assume "purely static."
2. **Browser-side Claude calls are intentional** — `apiKey = ""` is filled by
   the environment, and `anthropic-dangerous-direct-browser-access: true` is a
   conscious choice. Leave both unless asked otherwise.
3. **Never commit secrets** — `.claude/settings.local.json`, `.env`, API keys,
   PATs, and SMTP creds stay out of git (already gitignored).
4. **SQL/XML files are historical archives**, not a live database — don't wire
   them up or edit data without being asked.
5. **Legacy assets** (`.swf`, Flash-era `.gif`, `.mov`) are read-only artifacts.
6. **Keep CSP in sync** — adding an external script/endpoint means updating the
   `Content-Security-Policy` meta tag in `index.html`.
7. **Many workflow files are GitHub template noise** (`hugo.yml`, `jekyll*.yml`,
   `nextjs.yml`, `webpack.yml`, …) and are not part of this project's pipeline.
   The real ones: `static.yml`, `codeql.yml`, `dependency-review.yml`,
   `auto-pr.yml`.

---

## Contact & Credits

- DJ: Michael Fellner (DJ Jesse Jay)
- Radio: [Radio LoRa](https://www.lora.ch), show "Blue Dimension"
- SoundCloud: [soundcloud.com/jessejay](https://soundcloud.com/jessejay)
- Programming credits: Marcin Kolonko, Marcel Raschke

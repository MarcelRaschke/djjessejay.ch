# CLAUDE.md — AI Assistant Guide for djjessejay.ch

## Project Overview

This is the personal website of **DJ Jesse Jay** (Michael Fellner), a professional DJ from Zürich, Switzerland active since 1997. He is known for his radio show "Blue Dimension" (formerly "Galaxy Space Night") on Radio LoRa, playing progressive, house, techno, and deep house music.

The site is a **static website** deployed via GitHub Pages. There is no build step, no package manager, and no framework — just HTML, CSS, and vanilla JavaScript.

---

## Repository Structure

```
djjessejay.ch/
├── index.html              # Main page (primary entry point, modern Tailwind-based design)
├── home.html               # Alternate/legacy HTML version
├── home.htm                # Older legacy version
├── jessejay.css            # Base stylesheet (used by legacy pages)
├── scripts.js              # Vanilla JS: audio players, contact form, gallery init
├── robots.txt              # Search engine directives
├── favicon.ico             # Site favicon
├── renovate.json           # Renovate bot config (extends recommended preset)
│
├── img_contact_sound.svg   # SVG asset
├── spacer.svg              # SVG spacer asset
├── DJPult.gif              # Animated GIF of DJ equipment
├── get_flashplayer_88_31.gif # Legacy Flash-era asset (no longer functional)
├── michi.swf               # Legacy Flash file (no longer functional)
├── JesseJayBanner.mov      # Video asset
├── RadioStudio.mov         # Video asset
│
├── biography.sql           # MariaDB dump: biography table
├── biography.xml           # phpMyAdmin XML export: biography data
├── events.sql              # MariaDB dump: events table
├── evenTable.xml           # phpMyAdmin XML export: events data
├── guestbook.sql           # MariaDB dump: guestbook table
├── imageTable.sql          # MariaDB dump: image table
├── links.sql               # MariaDB dump: links table
├── news.sql                # MariaDB dump: news table
├── soundTable.sql          # MariaDB dump: sound/track table
│
├── web_scraper/            # Utility Python scraper (standalone, not site-integrated)
│   ├── scraper.py          # Fetches and parses page titles using requests + BeautifulSoup
│   └── requirements.txt   # Python deps: requests, beautifulsoup4
│
├── .github/
│   ├── copilot-instructions.md     # GitHub Copilot instructions file (currently empty)
│   ├── renovate.json / dependab*.yml  # Various dependency update configs
│   ├── ISSUE_TEMPLATE/             # Bug report, feature request, custom templates
│   └── workflows/
│       ├── static.yml              # PRIMARY: Deploys to GitHub Pages on push to main
│       ├── codeql.yml              # Security scanning for JavaScript
│       ├── dependency-review.yml   # Reviews deps in PRs
│       ├── ethicalcheck.yml        # Ethical checks workflow
│       ├── greetings.yml           # Auto-greets new contributors
│       ├── stale.yml               # Marks stale issues/PRs
│       ├── label.yml               # Auto-labeling
│       └── ...                     # Many other workflow files (experimental/unused)
│
├── README.md               # Development setup guide (Flask/Node.js backend options)
├── SECURITY.md             # Security policy (template, needs updating)
├── CONTRIBUTING.md         # Contributor Covenant Code of Conduct (German)
├── CODE_OF_CONDUCT.md      # Community guidelines
└── LICENSE                 # Apache License 2.0
```

---

## Tech Stack

| Layer       | Technology                                      |
|-------------|--------------------------------------------------|
| HTML        | Vanilla HTML5, `lang="de"` (German)              |
| CSS         | `jessejay.css` (legacy) + Tailwind CSS via CDN  |
| JavaScript  | Vanilla JS (`scripts.js`), no frameworks         |
| Fonts       | Google Fonts — Inter                             |
| Deployment  | GitHub Pages (static, no build step)             |
| CI/CD       | GitHub Actions                                   |
| Security    | CodeQL (JS), Dependency Review                   |
| Deps        | Renovate bot (extends recommended config)        |
| Python util | `requests` + `beautifulsoup4` (web_scraper only) |

---

## Key Conventions

### HTML
- The primary page is `index.html`. It uses Tailwind CSS loaded from CDN (`cdn.tailwindcss.com`).
- The page is in **German** (`<html lang="de">`), with some English content in biography sections.
- The site includes a **cookie banner**, **language selector** (DE/EN/FR/IT), and a **contact form** with reCAPTCHA placeholder.
- Sections: Biography (`#about`/`#biografie`), Music (`#music`/`#musik`), Contact (`#contact`/`#kontakt`).
- Flash-era assets (`.swf`, Flash detection code) are present but non-functional — do not try to revive them.

### CSS
- `jessejay.css` provides base resets, typography, layout, and responsive breakpoints for legacy pages.
- `index.html` uses inline `<style>` blocks and Tailwind utility classes for the modern design.
- Responsive breakpoints: mobile ≤ 768px, tablet 601–1024px.
- Color scheme (modern): dark navy/blue gradient background (`#0f172a` → `#1e3c72`), light text (`#e2e8f0`).

### JavaScript
- `scripts.js` initializes: audio players, contact form, gallery items.
- Uses `document.addEventListener('DOMContentLoaded', ...)` as the entry point.
- `detectFlashPlugin()` always returns `false` — Flash is dead, this is a stub.
- No external JS libraries or npm dependencies.

### SQL / XML Files
- These are **phpMyAdmin exports** from a MariaDB 10.3 database (`jessejay` database).
- Character sets: `utf8mb4` (SQL files), `latin1` (XML exports — note encoding mismatch).
- Tables: `biography`, `events`, `guestbook`, `imageTable`, `links`, `news`, `soundTable`.
- These are **historical data archives**, not actively connected to the static site.
- Do not modify SQL/XML unless explicitly asked to update data content.

### Python (web_scraper/)
- Standalone utility, not part of the website itself.
- Install deps: `pip install -r web_scraper/requirements.txt`
- Run: `python web_scraper/scraper.py`
- Currently scrapes `http://example.com` as a demo — the target URL would need updating for real use.

---

## Development Workflow

### Running the Site Locally

No build step required. Serve the static files:

```bash
# Python (recommended)
python -m http.server 8000
# Then open http://localhost:8000
```

### Branch Strategy

- **`main`** — production branch, auto-deploys to GitHub Pages via `static.yml`
- **Feature branches** — use descriptive names; AI/Claude branches follow the pattern `claude/<description>-<id>`
- PRs trigger dependency review; merges to `main` trigger deployment

### Deployment

Deployment is fully automated via GitHub Actions (`static.yml`):
- Triggers on push to `main`
- Uploads the entire repository as a Pages artifact
- No build or compilation step — files are served as-is

### GitHub Actions Workflows (Active)

| Workflow              | Trigger                | Purpose                          |
|-----------------------|------------------------|----------------------------------|
| `static.yml`          | push to `main`         | Deploy to GitHub Pages           |
| `codeql.yml`          | push/PR to `main`, weekly | JS security scanning          |
| `dependency-review.yml` | pull_request         | Flag vulnerable dependencies     |
| `greetings.yml`       | issues/PRs opened      | Welcome new contributors         |
| `stale.yml`           | scheduled              | Mark stale issues/PRs            |

Many other workflow files (`hugo.yml`, `jekyll.yml`, `nextjs.yml`, `webpack.yml`, etc.) appear to be GitHub-generated templates and are **not actively used** by this project.

---

## Content & Multilingual Notes

- Primary language: **German** (Swiss context, Zürich)
- Content has German and English biography text
- The `biography` table has separate `german` and `english` columns
- The UI has a language selector (DE/EN/FR/IT) but translation logic may be incomplete
- Translate keys follow the pattern `class="translate" key="biography"` on HTML elements

---

## Important Context for AI Assistants

1. **No build system** — do not introduce npm, webpack, or build tools without being asked.
2. **No backend** — the site is purely static. The README describes Flask/Node.js options for a contact form backend, but none is implemented. The contact form currently does not send emails.
3. **Legacy assets** — `.swf`, `.gif` (Flash-era), `.mov` files are historical. Treat them as read-only artifacts.
4. **SQL files are archives** — they document the original database schema, not a live database.
5. **Tailwind via CDN** — `index.html` uses CDN Tailwind, which is appropriate for this simple static site. Do not switch to a PostCSS/npm Tailwind setup unless explicitly requested.
6. **reCAPTCHA placeholder** — `YOUR_RECAPTCHA_SITE_KEY` in `index.html` is a placeholder that needs a real key to work.
7. **SECURITY.md is a template** — the version table (`5.1.x`, `4.0.x`) is boilerplate and does not reflect real versioning for this project.
8. **Copyright** — content is © 2003–2025 DJ Jesse Jay. Music/tracks in videos are not freely licensed. Background assets are CC BY 4.0. Site code is Apache License 2.0.

---

## Contact & Credits

- DJ: Michael Fellner (DJ Jesse Jay)
- Radio: [Radio LoRa](https://www.lora.ch), show "Blue Dimension"
- SoundCloud: [soundcloud.com/jessejay](https://soundcloud.com/jessejay)
- Programming credits: Marcin Kolonko, Marcel Raschke
Sign off by Claude.ai Mistral Codex Gemini Duck.ai perplexity Marcel Raschke
  cy8er@blackbox.gay

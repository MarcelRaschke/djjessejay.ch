# Termux Setup — Running the Repo on an Android Phone

Local development and testing of this repository on Android via Termux.
The server this starts (`server.js`, Express) is for local use only; the live
site is served through GitHub Pages plus the Cloudflare Worker described in
`DNS_CONFIG.md`.

## Requirements

- Termux installed from **F-Droid** or the GitHub releases. The Play Store
  build is outdated and its package links are broken.
- ~500 MB free storage.
- The repo requires Node `>=24.0.0` (`package.json` engines). Termux's
  `nodejs-lts` package tracks the Node 24 LTS line and satisfies this; the
  `nodejs` package tracks the Current line instead, and the two conflict —
  install only one.

## 1. Base packages

```bash
pkg update && pkg upgrade -y
pkg install -y git nodejs-lts python
node -v      # must report v24.x
python3 --version
```

## 2. Clone and install

```bash
git clone --depth 1 https://github.com/MarcelRaschke/djjessejay.ch.git
cd djjessejay.ch
npm install --omit=dev
```

The runtime dependencies (`express`, `ws`, `cors`, `express-rate-limit`,
`nodemailer`) are pure JavaScript — no native compilation or `build-essential`
is needed.

A plain `npm install` (with dev dependencies) is only needed for the CSS build
and the lint/test tooling. `@tailwindcss/cli` v4 ships native binaries that may
not have an Android build; `tailwind.css` is committed, so rebuilding it from a
phone is optional.

## 3. Configure

```bash
cp .env.example .env
nano .env
```

`PORT` defaults to `3000`. The Turnstile/SMTP variables can stay empty for local
testing; `server.js` falls back to empty strings and those features stay inert.

## 4. Run

```bash
npm start
```

Open `http://localhost:3000` in the phone's browser. From another device on the
same Wi-Fi, use the phone's local IP (`ifconfig wlan0`).

## 5. Tests (optional)

```bash
npm install
npm test
```

## 6. Keeping the server alive

Android's phantom process killer tends to terminate long-lived `node`
processes when the screen locks or Termux is backgrounded:

- Termux notification → **Acquire wakelock**, and disable battery
  optimization for Termux.
- For a persistent setup, use Termux:Boot with a start script, or
  `pkg install termux-services` and an `sv` service for `node server.js`.

## Limits on a phone

- **No Cloudflare deploys**: the `workers/*` need Wrangler with account
  authentication, and the repository's `CLOUDFLARE_API_TOKEN` is expired
  (see `DNS_CONFIG.md`, "Still open"). Deploy from a machine with valid
  credentials instead.
- **No Neo4j check locally**: the `v9 Neo4j Snapshot Roundtrip` CI check uses
  Docker, which Termux cannot run. `npm run test:provenance-v9` works without
  it.
- **Local only**: do not expose the phone-hosted server publicly (tunnels,
  port forwarding, or similar). The production path is GitHub Pages plus the
  Cloudflare Worker.

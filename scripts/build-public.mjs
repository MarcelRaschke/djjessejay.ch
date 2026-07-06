#!/usr/bin/env node
/**
 * Assembles the public static-asset directory for the Cloudflare Worker.
 *
 * The repo root mixes the website with server code, build config, SQL archives
 * and tooling. Rather than rely on .assetsignore excludes (fragile — it must
 * enumerate everything NOT to ship), we copy an explicit allow-list of public
 * web files into ./public, which the Worker serves via its [assets] binding.
 *
 * Run automatically before `wrangler dev` / `wrangler deploy` (see package.json).
 */

import { existsSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public');

// Explicit allow-list of files that make up the public website.
// Add new public assets here; anything not listed is never shipped.
const PUBLIC_FILES = [
    'index.html',
    'home.html',
    'home.htm',
    'jessejay.css',
    'tailwind.css',
    'scripts.js',
    'favicon.ico',
    'robots.txt',
    'img_contact_sound.svg',
    'spacer.svg',
    'DJPult.gif',
    'get_flashplayer_88_31.gif',
    'JesseJayBanner.mov',
    'RadioStudio.mov',
    'michi.swf',
];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

let copied = 0;
const missing = [];
for (const rel of PUBLIC_FILES) {
    const src = join(root, rel);
    if (!existsSync(src)) {
        missing.push(rel);
        continue;
    }
    const dest = join(out, rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    copied++;
}

console.log(`build-public: copied ${copied} file(s) into public/`);
if (missing.length) {
    console.warn(`build-public: WARNING — ${missing.length} listed file(s) not found: ${missing.join(', ')}`);
}

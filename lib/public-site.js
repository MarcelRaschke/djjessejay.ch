'use strict';

// Single source of truth for what the public website consists of.
// Used by server.js (local preview with SERVE_STATIC=1) and by
// scripts/stage-pages-site.mjs (the GitHub Pages artifact). Anything not
// matched here stays private: server code, package manifests, docs, tests,
// workflows, infrastructure and dotfiles.

const PUBLIC_FILES = new Set([
  'index.html', '404.html', 'datenschutz.html', 'eu-ai-act.html', 'blue-dimension.html', 'ivdj-supreme.html', 'hero-test.html',
  'artist-profile.json', 'robots.txt',
  'favicon.ico', 'favicon.svg', 'tailwind.css', 'jessejay.css', 'scripts.js',
  'DJ-Jesse-Jay.jpg', 'DJPult.gif', 'img_contact_sound.svg', 'spacer.svg',
]);

const PUBLIC_DIRS = new Set([
  'css', 'js', 'assets', 'survey', 'pressekit', 'presskit', 'website', 'visuals', 'vendor',
]);

// Never public, also inside the public trees.
const BLOCKED_EXT = /\.(?:sql|env|pem|key|log|jsonl|sh|py|ts|md|ya?ml|lock)$/i;

// Scripts and JSON are only public inside the public trees or when listed in
// PUBLIC_FILES. Root-level server.js, package.json and similar never are.
const SOURCE_EXT = /\.(?:m?js|cjs|json)$/i;

/**
 * True when a normalized, repository-relative file path (forward slashes,
 * no leading slash) belongs to the public site.
 */
function isPublicFile(rel) {
  if (typeof rel !== 'string' || rel === '') return false;
  const segments = rel.split('/');
  if (segments.some((seg) => seg === '' || seg.startsWith('.'))) return false;
  if (BLOCKED_EXT.test(rel)) return false;
  if (segments.length === 1) return PUBLIC_FILES.has(rel);
  return PUBLIC_DIRS.has(segments[0]);
}

module.exports = { PUBLIC_FILES, PUBLIC_DIRS, BLOCKED_EXT, SOURCE_EXT, isPublicFile };

// Guards the two-click rule: no third-party player may load before a click,
// and the privacy policy must exist and be linked from the home page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const index = readFileSync(resolve(root, 'index.html'), 'utf8');

test('index.html embeds no iframe before user consent', () => {
  assert.equal(/<iframe\b/i.test(index), false, 'iframe found in index.html');
});

test('no third-party player host is used as a direct src', () => {
  const direct = /\ssrc="https:\/\/(w\.soundcloud\.com|player-widget\.mixcloud\.com|www\.mixcloud\.com)/i;
  assert.equal(direct.test(index), false);
});

test('player consent box carries its source and loader script', () => {
  assert.match(index, /class="player-consent"[^>]*data-src="https:\/\/w\.soundcloud\.com\//);
  assert.match(index, /<script src="js\/player-consent\.js" defer><\/script>/);
  assert.ok(existsSync(resolve(root, 'js/player-consent.js')));
});

test('privacy policy exists and is linked from the footer', () => {
  assert.ok(existsSync(resolve(root, 'datenschutz.html')));
  assert.match(index, /href="datenschutz\.html"/);
  const policy = readFileSync(resolve(root, 'datenschutz.html'), 'utf8');
  for (const section of ['verantwortlich', 'hosting', 'kontakt', 'soundcloud', 'ausland', 'rechte']) {
    assert.match(policy, new RegExp(`id="${section}"`), `missing section #${section}`);
  }
});

test('loader only accepts allowlisted https player hosts', () => {
  const js = readFileSync(resolve(root, 'js/player-consent.js'), 'utf8');
  assert.match(js, /url\.protocol === 'https:'/);
  assert.match(js, /ALLOWED_HOSTS/);
});

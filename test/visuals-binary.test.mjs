// Guard für visuals/djjessejay-binary: muss unter der strikten Site-CSP laufen
// (style-src/script-src/font-src 'self', kein eval, keine Fremd-Origins).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DIR = "visuals/djjessejay-binary";
const PAGES = ["index.html", "poster.html", "banner.html", "loop.html", "avatar.html"];
const read = (f) => readFileSync(join(DIR, f), "utf8");

test("alle Seiten und Assets vorhanden", () => {
  for (const f of [...PAGES, "binary.css", "binary.js",
    "fonts/jetbrains-mono-latin-400-normal.woff2", "fonts/jetbrains-mono-latin-700-normal.woff2",
    "fonts/orbitron-latin-900-normal.woff2", "fonts/OFL-JetBrainsMono.txt", "fonts/OFL-Orbitron.txt"]) {
    assert.ok(statSync(join(DIR, f)).size > 0, f);
  }
});

test("HTML ohne Inline-Styles, Inline-Scripts, Event-Handler oder Fremd-URLs", () => {
  for (const f of PAGES) {
    const html = read(f);
    assert.doesNotMatch(html, /\sstyle="/i, `${f}: style-Attribut`);
    assert.doesNotMatch(html, /<style[\s>]/i, `${f}: <style>-Block`);
    assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/i, `${f}: Inline-Script`);
    assert.doesNotMatch(html, /\son[a-z]+="/i, `${f}: Inline-Event-Handler`);
    assert.doesNotMatch(html, /(src|href)="(https?:)?\/\//i, `${f}: Fremd-URL`);
  }
});

test("JS und CSS ohne eval, Netzwerk oder Fremd-Origins", () => {
  const js = read("binary.js");
  assert.doesNotMatch(js, /\beval\s*\(|new\s+Function|innerHTML|fetch\s*\(|XMLHttpRequest|WebSocket/);
  const css = read("binary.css");
  assert.doesNotMatch(css, /url\(\s*["']?(https?:)?\/\//i);
  assert.doesNotMatch(css, /@import/i);
});

test("nur woff2 im Font-Ordner, jeweils mit OFL-Lizenz", () => {
  const files = readdirSync(join(DIR, "fonts"));
  for (const f of files) assert.match(f, /\.(woff2|txt)$/);
  for (const lic of ["fonts/OFL-JetBrainsMono.txt", "fonts/OFL-Orbitron.txt"]) {
    assert.match(read(lic), /SIL Open Font License/);
  }
});

#!/usr/bin/env node
import fs from 'node:fs';

const path = process.argv[2] || 'index.html';
let html = fs.readFileSync(path, 'utf8');
const description = 'DJ Jesse Jay — Zürich electronic DJ since 1997, vinyl-rooted and connected with Radio LoRa through Galaxy Space Night and Blue Dimension.';
const title = 'DJ Jesse Jay — Zürich electronic DJ since 1997';
const image = 'https://djjessejay.ch/DJ-Jesse-Jay.jpg';
const canonical = 'https://djjessejay.ch/';

function replace(re, value) {
  if (!re.test(html)) throw new Error(`Expected metadata pattern not found: ${re}`);
  html = html.replace(re, value);
}

replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${description}">`);
replace(/<meta property="og:type" content="[^"]*">/, '<meta property="og:type" content="profile">');
replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`);
replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${description}">`);
replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${canonical}">`);
replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${image}">`);
replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${title}">`);
replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${description}">`);
replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${image}">`);

const jsonld = fs.readFileSync('website/schema.org.jsonld', 'utf8').trim();
const block = `\n    <!-- Canonical structured identity; generated from website/schema.org.jsonld -->\n    <script type="application/ld+json">${jsonld}</script>`;
if (!html.includes('Canonical structured identity')) html = html.replace('</head>', `${block}\n</head>`);

fs.writeFileSync(path, html);
console.log(`Synchronized canonical metadata in ${path}`);

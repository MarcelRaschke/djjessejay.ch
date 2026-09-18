#!/usr/bin/env node
/**
 * Replaces RECAPTCHA_SITE_KEY placeholder in index.html with the actual value from environment
 * Usage: RECAPTCHA_SITE_KEY=your_key node scripts/replace-recaptcha-key.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';

const inputFile = new URL('../index.html', import.meta.url);
const content = readFileSync(inputFile, 'utf8');

const PLACEHOLDER = 'YOUR_RECAPTCHA_SITE_KEY';
const siteKey = process.env.RECAPTCHA_SITE_KEY || '';

if (!siteKey) {
  console.log('reCAPTCHA site key not provided (set RECAPTCHA_SITE_KEY env var); index.html unchanged');
  process.exit(0);
}

const updatedContent = content.replaceAll(PLACEHOLDER, siteKey);
writeFileSync(inputFile, updatedContent, 'utf8');
console.log(`reCAPTCHA site key replaced in index.html`);

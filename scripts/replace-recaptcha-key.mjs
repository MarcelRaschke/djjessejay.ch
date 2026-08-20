#!/usr/bin/env node
/**
 * Replaces RECAPTCHA_SITE_KEY placeholder in index.html with the actual value from environment
 * Usage: RECAPTCHA_SITE_KEY=your_key node scripts/replace-recaptcha-key.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';

const inputFile = new URL('../index.html', import.meta.url);
const content = readFileSync(inputFile, 'utf8');

const siteKey = process.env.RECAPTCHA_SITE_KEY || 'RECAPTCHA_SITE_KEY';
const updatedContent = content.replace(/RECAPTCHA_SITE_KEY/g, siteKey);

writeFileSync(inputFile, updatedContent, 'utf8');
console.log(`reCAPTCHA site key replaced with: ${siteKey === 'RECAPTCHA_SITE_KEY' ? 'placeholder (set RECAPTCHA_SITE_KEY env var)' : siteKey}`);

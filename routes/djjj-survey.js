'use strict';

// djjjcoin community survey endpoint (Phase 2 use-case survey).
// Anonymous by design: no cookies, no tracking, no IP storage. The only
// optional personal data is the free-text email in q10 (testnet invitation);
// it is stored as given and deleted on request (DSG/revDSG).
// Protection: global /api/ rate limit in server.js plus a hidden honeypot
// field ("website") that humans never fill.
// Storage: JSONL append into SURVEY_DATA_DIR (default ../.survey-data/).
// The directory is dot-prefixed, so express.static with dotfiles:'ignore'
// never serves it, and .gitignore excludes it from the repository.

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();

const SURVEY_DATA_DIR = process.env.SURVEY_DATA_DIR || path.join(__dirname, '..', '.survey-data');
const SURVEY_FILE = path.join(SURVEY_DATA_DIR, 'responses.jsonl');
const MAX_TEXT_LENGTH = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALLOWED_SINGLE = {
  q2: ['ja-hardware', 'ja-anleitung', 'nein'],
  q3: ['ja-regelmaessig', 'gelegentlich', 'nein'],
  q4: ['mobil', 'browser', 'paper', 'weiss-nicht'],
  q7: ['regelmaessig', 'gelegentlich', 'nein'],
  q8: ['ja', 'egal', 'nein']
};

const ALLOWED_MULTI = {
  q5: ['tickets', 'merch', 'track-unlocks', 'voting', 'nichts'],
  q6: ['zu-kompliziert', 'sicherheitsbedenken', 'kein-nutzen', 'krypto-misstrauen']
};

function sanitizeText(str, maxLength) {
  const max = maxLength || MAX_TEXT_LENGTH;
  if (str === null || str === undefined) return '';
  return String(str).trim().replace(/[<>"'%&;()]/g, '').substring(0, max);
}

function isValidRank(v) {
  return ['1', '2', '3', '4', '5'].includes(String(v));
}

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};

    // Honeypot: humans never fill the hidden "website" field.
    if (sanitizeText(b.website, 200)) {
      return res.status(403).json({ error: 'Bot traffic detected.' });
    }

    const q1 = b.q1 || {};
    const other = q1.other || {};
    const ranks = [q1.tickets, q1.merch, q1.trackUnlocks, q1.setlistVoting, other.rank];
    if (!ranks.every(isValidRank) || new Set(ranks.map(String)).size !== 5) {
      return res.status(400).json({ error: 'Frage 1 unvollständig: alle fünf Plätze vergeben, jede Zahl nur einmal.' });
    }

    for (const key of Object.keys(ALLOWED_SINGLE)) {
      const value = b[key];
      if (value !== undefined && value !== null && !ALLOWED_SINGLE[key].includes(String(value))) {
        return res.status(400).json({ error: 'Ungültiger Wert für ' + key + '.' });
      }
    }

    for (const key of Object.keys(ALLOWED_MULTI)) {
      const value = b[key];
      if (value !== undefined && value !== null) {
        const valid = Array.isArray(value)
          && value.length <= ALLOWED_MULTI[key].length
          && value.every((v) => ALLOWED_MULTI[key].includes(String(v)));
        if (!valid) {
          return res.status(400).json({ error: 'Ungültiger Wert für ' + key + '.' });
        }
      }
    }

    const email = sanitizeText(b.q10, 254);
    if (email && !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Ungültige E-Mail-Adresse.' });
    }

    const record = {
      id: crypto.randomUUID(),
      receivedAt: new Date().toISOString(),
      q1: {
        tickets: String(q1.tickets),
        merch: String(q1.merch),
        trackUnlocks: String(q1.trackUnlocks),
        setlistVoting: String(q1.setlistVoting),
        other: {
          rank: String(other.rank),
          text: sanitizeText(other.text, 200) || null
        }
      },
      q2: b.q2 !== undefined && b.q2 !== null ? String(b.q2) : null,
      q3: b.q3 !== undefined && b.q3 !== null ? String(b.q3) : null,
      q4: b.q4 !== undefined && b.q4 !== null ? String(b.q4) : null,
      q5: Array.isArray(b.q5) ? b.q5.map(String) : null,
      q6: Array.isArray(b.q6) ? b.q6.map(String) : null,
      q7: b.q7 !== undefined && b.q7 !== null ? String(b.q7) : null,
      q8: b.q8 !== undefined && b.q8 !== null ? String(b.q8) : null,
      q9: sanitizeText(b.q9) || null,
      q10: email || null
    };

    await fs.promises.mkdir(SURVEY_DATA_DIR, { recursive: true });
    await fs.promises.appendFile(SURVEY_FILE, JSON.stringify(record) + '\n', { mode: 0o600 });

    console.log('djjj-survey submission stored:', record.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Unexpected error in /api/djjj-survey:', err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// Read-only aggregate count for the evaluation gate (Phase 2 target: 50
// responses, 20 node/miner commitments). Exposes no personal data.
router.get('/count', async (req, res) => {
  try {
    let count = 0;
    let data = '';
    try {
      data = await fs.promises.readFile(SURVEY_FILE, 'utf8');
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    for (const line of data.split('\n')) {
      if (line.trim()) count += 1;
    }
    res.json({ count });
  } catch (err) {
    console.error('Unexpected error in /api/djjj-survey/count:', err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

module.exports = router;

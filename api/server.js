/**
 * API Proxy – djjessejay.ch
 * Hält den Anthropic-API-Key serverseitig, weg vom Browser.
 *
 * Setup:
 *   cd api && npm install && ANTHROPIC_API_KEY=sk-... node server.js
 *
 * Environment:
 *   ANTHROPIC_API_KEY  – required
 *   ALLOWED_ORIGIN     – allowed CORS origin (default: http://localhost:8080)
 *   PORT               – listen port (default: 3001)
 */

'use strict';

const http = require('http');
const https = require('https');
const url = require('url');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ALLOWED_ORIGIN   = process.env.ALLOWED_ORIGIN || 'http://localhost:8080';
const PORT             = parseInt(process.env.PORT || '3001', 10);

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

if (!ANTHROPIC_API_KEY) {
  console.error('[proxy] ANTHROPIC_API_KEY ist nicht gesetzt – Server startet nicht.');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url);
  if (req.method !== 'POST' || parsedUrl.pathname !== '/api/claude') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    // Validate JSON input
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    // Only allow requests to the messages endpoint
    const proxyBody = JSON.stringify(payload);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(proxyBody),
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
    };

    const proxyReq = https.request(ANTHROPIC_URL, options, (proxyRes) => {
      let responseBody = '';
      proxyRes.on('data', chunk => { responseBody += chunk; });
      proxyRes.on('end', () => {
        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
        res.end(responseBody);
      });
    });

    proxyReq.on('error', (err) => {
      console.error('[proxy] Upstream error:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Upstream error' }));
    });

    proxyReq.write(proxyBody);
    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log(`[proxy] fsociety API-Proxy läuft auf Port ${PORT}`);
  console.log(`[proxy] CORS Origin: ${ALLOWED_ORIGIN}`);
});

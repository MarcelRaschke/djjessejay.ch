'use strict';

const path = require('path');

// Honeypot configuration — low-interaction decoy endpoints
module.exports = {
  // Fake endpoints that bots commonly probe (prefix match, case-insensitive).
  // Behind the Cloudflare Worker only /api/* reaches this server, so the
  // /api/* decoys are the ones public traffic can trigger.
  fakeEndpoints: [
    // WordPress/CMS
    '/wp-admin',
    '/wp-login',
    '/wp-content',
    '/wp-json',
    '/administrator',

    // Common admin panels
    '/admin',
    '/admin.php',
    '/dashboard',
    '/control',

    // Config/backup files
    '/.env',
    '/config.php',
    '/backup',
    '/backup.sql',
    '/database.sql',
    '/.git',
    '/.git/config',
    '/web.config',

    // API endpoints bots probe
    '/api/users',
    '/api/admin',
    '/api/v1/users',
    '/api/v2/users',
    '/graphql',
    '/api/graphql',

    // PHP/ASP endpoints
    '/shell.php',
    '/webshell.php',
    '/upload.php',
    '/shell.asp',

    // Vulnerability scanning paths
    '/xmlrpc.php',
    '/.well-known/security.txt',
    '/security.txt',
    '/robots.txt.bak',

    // Miscellaneous
    '/test',
    '/test.php',
    '/debug',
    '/phpinfo.php',
    '/info.php'
  ],

  // JSONL log file. Anchored to this directory so it does not depend on the
  // process working directory; override with HONEYPOT_LOG_FILE. The default lives
  // in a dot-directory because server.js serves the repo root statically with
  // dotfiles:'ignore' — a custom path must stay outside the repo root or in a
  // dot-directory, or the log becomes downloadable.
  logFile: process.env.HONEYPOT_LOG_FILE || path.join(__dirname, '.logs', 'honeypot.jsonl'),

  alerts: {
    enableAlerts: process.env.HONEYPOT_ALERTS === 'true',
    emailTo: process.env.HONEYPOT_ALERT_EMAIL || '',
    webhookUrl: process.env.HONEYPOT_WEBHOOK_URL || '',
    // Minimum time between alerts for the same IP
    cooldownMs: 10 * 60 * 1000,
    alertThresholds: {
      uniquePathsPerIP: 10,  // Alert if one IP probes 10+ distinct fake endpoints within 1 minute
      payloadSize: 5000      // Alert if Content-Length > 5KB
    }
  },

  // Response strategy
  responses: {
    default: { status: 404, body: { error: 'Not Found' } },
    admin: { status: 401, body: { error: 'Unauthorized' } },
    api: { status: 403, body: { error: 'Forbidden' } }
  }
};

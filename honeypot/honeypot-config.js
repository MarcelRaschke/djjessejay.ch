'use strict';

// Honeypot configuration — low-interaction decoy endpoints
module.exports = {
  // Fake endpoints that bots commonly probe
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

  // HTTP methods to trap
  trapMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],

  // Log file location
  logFile: './honeypot/logs/honeypot.jsonl',

  // Alert thresholds
  alerts: {
    enableAlerts: process.env.HONEYPOT_ALERTS === 'true',
    emailTo: process.env.HONEYPOT_ALERT_EMAIL || '',
    webhookUrl: process.env.HONEYPOT_WEBHOOK_URL || '',
    alertThresholds: {
      hitsPerMinute: 5,      // Alert if same IP hits 5+ honeypots per minute
      uniquePathsPerIP: 10,  // Alert if IP probes 10+ fake endpoints
      payloadSize: 5000      // Alert if payload > 5KB
    }
  },

  // Response strategy
  responses: {
    default: { status: 404, body: { error: 'Not Found' } },
    wordpress: { status: 200, body: '<!-- WordPress -->' },
    admin: { status: 401, body: { error: 'Unauthorized' } },
    api: { status: 403, body: { error: 'Forbidden' } }
  },

  // Exclude legitimate user-agents from logging
  excludeUserAgents: [
    'Mozilla/5.0',  // Real browsers
    'Googlebot',
    'bingbot'
  ]
};

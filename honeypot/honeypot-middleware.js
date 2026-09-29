'use strict';

const fs = require('fs');
const path = require('path');
const config = require('./honeypot-config');

const WINDOW_MS = 60 * 1000;
const MAX_TRACKED_IPS = 10000;
const MAX_LOGGED_FIELD = 512;
const ERROR_LOG_INTERVAL_MS = 60 * 1000;

const decoyPrefixes = config.fakeEndpoints.map(endpoint => endpoint.toLowerCase());

// Track per-IP probing to decide when to alert
const ipTracking = new Map();

let lastLogErrorAt = 0;

// The honeypot must never take the site down: report storage problems, at most
// once a minute, and keep serving.
function reportLogError(err) {
  const now = Date.now();
  if (now - lastLogErrorAt < ERROR_LOG_INTERVAL_MS) return;
  lastLogErrorAt = now;
  console.error('[HONEYPOT] log write failed:', err.message);
}

try {
  fs.mkdirSync(path.dirname(config.logFile), { recursive: true });
} catch (err) {
  reportLogError(err);
}

function clip(value, max = MAX_LOGGED_FIELD) {
  if (value === null || value === undefined) return null;
  return String(value).slice(0, max);
}

// Append a honeypot hit to the JSONL log (asynchronous, never throws)
function logHit(data) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ip: data.ip,
    // Untrusted client-supplied header values (Cloudflare or a spoofing client)
    forwardedFor: clip(data.forwardedFor),
    userAgent: clip(data.userAgent),
    path: clip(data.path),
    method: data.method,
    query: data.query || null,
    payloadSize: data.payloadSize || 0,
    headers: {
      referer: clip(data.referer),
      accept: clip(data.accept),
      'accept-language': clip(data.acceptLanguage)
    }
  };

  fs.appendFile(config.logFile, JSON.stringify(logEntry) + '\n', err => {
    if (err) reportLogError(err);
  });

  return logEntry;
}

function pruneTracking(now) {
  for (const [key, data] of ipTracking) {
    if (now - data.hitTime > WINDOW_MS && now - data.lastAlertAt > config.alerts.cooldownMs) {
      ipTracking.delete(key);
    }
  }
  if (ipTracking.size >= MAX_TRACKED_IPS) ipTracking.clear();
}

// Decide whether this hit should raise an alert. At most one alert per IP per
// cooldown period.
function shouldAlert(ip, requestPath, payloadSize) {
  const threshold = config.alerts.alertThresholds;
  const now = Date.now();

  if (ipTracking.size >= MAX_TRACKED_IPS) pruneTracking(now);

  let ipData = ipTracking.get(ip);
  if (!ipData) {
    ipData = { paths: new Set(), hitTime: now, lastAlertAt: 0 };
    ipTracking.set(ip, ipData);
  }

  if (now - ipData.hitTime > WINDOW_MS) {
    ipData.paths.clear();
    ipData.hitTime = now;
  }
  if (ipData.paths.size < threshold.uniquePathsPerIP) ipData.paths.add(requestPath);

  if (now - ipData.lastAlertAt < config.alerts.cooldownMs) return null;

  let alert = null;
  if (payloadSize > threshold.payloadSize) {
    alert = { type: 'oversized_payload', message: `Payload ${payloadSize} bytes exceeds ${threshold.payloadSize}` };
  } else if (ipData.paths.size >= threshold.uniquePathsPerIP) {
    alert = {
      type: 'scanning_behavior',
      message: `IP ${ip} probed ${ipData.paths.size} fake endpoints in 1 minute`
    };
  }

  if (alert) ipData.lastAlertAt = now;
  return alert;
}

// Send alert (webhook and/or email)
async function sendAlert(alertData, logEntry) {
  if (!config.alerts.enableAlerts) return;

  console.warn(`[HONEYPOT ALERT] ${alertData.type}: ${alertData.message}`);
  console.warn(`[HONEYPOT] Source: ${logEntry.ip} | Path: ${logEntry.path}`);

  // Webhook alert
  if (config.alerts.webhookUrl) {
    try {
      await fetch(config.alerts.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({
          alert_type: alertData.type,
          message: alertData.message,
          source_ip: logEntry.ip,
          path: logEntry.path,
          timestamp: logEntry.timestamp
        })
      });
    } catch (err) {
      console.error('Webhook alert failed:', err.message);
    }
  }

  // Email alert
  if (config.alerts.emailTo && process.env.SMTP_HOST) {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      connectionTimeout: 10000,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    try {
      await transporter.sendMail({
        from: `"DjJesseJay Honeypot" <${process.env.SMTP_USER}>`,
        to: config.alerts.emailTo,
        subject: `[HONEYPOT] ${alertData.type.toUpperCase()}`,
        text: `Alert Type: ${alertData.type}\nMessage: ${alertData.message}\nSource IP: ${logEntry.ip}\nPath: ${logEntry.path}\nTime: ${logEntry.timestamp}`
      });
    } catch (err) {
      console.error('Email alert failed:', err.message);
    }
  }
}

// Honeypot middleware factory
function createHoneypotMiddleware() {
  return (req, res, next) => {
    const requestPath = req.path;
    const lowerPath = requestPath.toLowerCase();

    if (!decoyPrefixes.some(prefix => lowerPath.startsWith(prefix))) {
      return next(); // Not a honeypot path, continue normally
    }

    try {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';

      // Payload size from Content-Length (never consume the request stream)
      const payloadSize = Number(req.get('content-length')) || 0;

      const logEntry = logHit({
        ip,
        forwardedFor: req.get('cf-connecting-ip') || req.get('x-forwarded-for'),
        userAgent: req.get('user-agent') || 'unknown',
        path: requestPath,
        method: req.method,
        query: Object.keys(req.query).length > 0 ? req.query : null,
        payloadSize,
        referer: req.get('referer'),
        accept: req.get('accept'),
        acceptLanguage: req.get('accept-language')
      });

      const alert = shouldAlert(ip, requestPath, payloadSize);
      if (alert) {
        sendAlert(alert, logEntry).catch(console.error);
      }
    } catch (err) {
      reportLogError(err);
    }

    // Determine response based on endpoint type
    let response = config.responses.default;
    if (lowerPath.includes('wp-') || lowerPath.includes('admin')) {
      response = config.responses.admin;
    } else if (lowerPath.includes('api')) {
      response = config.responses.api;
    }

    res.status(response.status).json(response.body);
  };
}

// Read recent hits from the JSONL log (skips unparseable lines)
function getRecentHits(minutes = 60, ipFilter = null) {
  if (!fs.existsSync(config.logFile)) return [];

  const cutoff = Date.now() - (minutes * 60 * 1000);
  const hits = [];

  for (const line of fs.readFileSync(config.logFile, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (new Date(entry.timestamp).getTime() > cutoff && (!ipFilter || entry.ip === ipFilter)) {
      hits.push(entry);
    }
  }

  return hits;
}

module.exports = {
  createHoneypotMiddleware,
  getRecentHits,
  logHit
};

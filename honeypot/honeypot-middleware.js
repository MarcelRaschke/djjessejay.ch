'use strict';

const fs = require('fs');
const path = require('path');
const config = require('./honeypot-config');

// Ensure logs directory exists
const logsDir = path.dirname(config.logFile);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Track IP-based hit counts for alert thresholds
const ipTracking = new Map();

// Log a honeypot hit to JSONL file
function logHit(data) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ip: data.ip,
    userAgent: data.userAgent,
    path: data.path,
    method: data.method,
    query: data.query || null,
    payloadSize: data.payloadSize || 0,
    headers: {
      referer: data.referer || null,
      accept: data.accept || null,
      'accept-language': data.acceptLanguage || null
    }
  };

  const jsonl = JSON.stringify(logEntry) + '\n';
  fs.appendFileSync(config.logFile, jsonl, { flag: 'a' });

  return logEntry;
}

// Check if alert should be triggered
function shouldAlert(ip, path, payloadSize) {
  const threshold = config.alerts.alertThresholds;

  // Check payload size
  if (payloadSize > threshold.payloadSize) {
    return { type: 'oversized_payload', message: `Payload ${payloadSize} bytes exceeds ${threshold.payloadSize}` };
  }

  // Track IP hits
  if (!ipTracking.has(ip)) {
    ipTracking.set(ip, { paths: new Set(), hitTime: Date.now() });
  }

  const ipData = ipTracking.get(ip);
  ipData.paths.add(path);

  // Reset counter if older than 1 minute
  if (Date.now() - ipData.hitTime > 60000) {
    ipData.paths.clear();
    ipData.hitTime = Date.now();
  }

  // Alert if too many paths probed
  if (ipData.paths.size >= threshold.uniquePathsPerIP) {
    return {
      type: 'scanning_behavior',
      message: `IP ${ip} probed ${ipData.paths.size} fake endpoints in 1 minute`
    };
  }

  return null;
}

// Send alert (email or webhook)
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
    const method = req.method;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    // Check if this is a fake endpoint
    const isFakeEndpoint = config.fakeEndpoints.some(endpoint =>
      requestPath.toLowerCase().startsWith(endpoint.toLowerCase())
    );

    if (!isFakeEndpoint) {
      return next(); // Not a honeypot path, continue normally
    }

    // Get payload size from Content-Length header (don't consume the stream)
    const payloadSize = Number(req.get('content-length')) || 0;

    // Log the hit
    const logEntry = logHit({
      ip,
      userAgent: req.get('user-agent') || 'unknown',
      path: requestPath,
      method,
      query: Object.keys(req.query).length > 0 ? req.query : null,
      payloadSize,
      referer: req.get('referer'),
      accept: req.get('accept'),
      acceptLanguage: req.get('accept-language')
    });

    // Check for alerts
    const alert = shouldAlert(ip, requestPath, payloadSize);
    if (alert) {
      sendAlert(alert, logEntry).catch(console.error);
    }

    // Determine response based on endpoint type
    let response = config.responses.default;
    if (requestPath.includes('wp-') || requestPath.includes('admin')) {
      response = config.responses.admin;
    } else if (requestPath.includes('api')) {
      response = config.responses.api;
    }

    // Send fake response
    res.status(response.status).json(response.body);
  };
}

// Export utility to query honeypot logs
function getRecentHits(minutes = 60, ipFilter = null) {
  if (!fs.existsSync(config.logFile)) return [];

  const logs = fs.readFileSync(config.logFile, 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));

  const cutoff = Date.now() - (minutes * 60 * 1000);
  return logs.filter(log => {
    const logTime = new Date(log.timestamp).getTime();
    return logTime > cutoff && (!ipFilter || log.ip === ipFilter);
  });
}

module.exports = {
  createHoneypotMiddleware,
  getRecentHits,
  logHit
};

'use strict';

const express = require('express');
const { getRecentHits } = require('./honeypot-middleware');

// Create honeypot monitoring router
function createHoneypotMonitor() {
  const router = express.Router();

  // List recent honeypot hits (requires auth token)
  router.get('/honeypot/hits', (req, res) => {
    // Simple token-based auth for monitoring endpoint
    const authToken = req.query.token || req.get('x-honeypot-token');
    const expectedToken = process.env.HONEYPOT_MONITOR_TOKEN;

    if (!expectedToken || authToken !== expectedToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const minutes = Math.min(Number(req.query.minutes) || 60, 1440); // Max 24h
    const hits = getRecentHits(minutes);

    // Aggregate statistics
    const stats = {
      totalHits: hits.length,
      timeWindow: `${minutes}m`,
      uniqueIPs: new Set(hits.map(h => h.ip)).size,
      uniquePaths: new Set(hits.map(h => h.path)).size,
      methods: {},
      topIPs: {},
      topPaths: {}
    };

    // Count by method
    hits.forEach(hit => {
      stats.methods[hit.method] = (stats.methods[hit.method] || 0) + 1;
      stats.topIPs[hit.ip] = (stats.topIPs[hit.ip] || 0) + 1;
      stats.topPaths[hit.path] = (stats.topPaths[hit.path] || 0) + 1;
    });

    // Top 5 IPs and paths
    stats.topIPs = Object.entries(stats.topIPs)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([ip, count]) => ({ ip, count }));

    stats.topPaths = Object.entries(stats.topPaths)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([path, count]) => ({ path, count }));

    res.json({
      stats,
      recentHits: hits.slice(-50) // Last 50 hits
    });
  });

  // Export honeypot logs as CSV
  router.get('/honeypot/export', (req, res) => {
    const authToken = req.query.token || req.get('x-honeypot-token');
    const expectedToken = process.env.HONEYPOT_MONITOR_TOKEN;

    if (!expectedToken || authToken !== expectedToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const minutes = Math.min(Number(req.query.minutes) || 1440, 2880); // Max 48h
    const hits = getRecentHits(minutes);

    // Convert to CSV
    const headers = ['timestamp', 'ip', 'userAgent', 'path', 'method', 'payloadSize', 'referer'];
    const rows = hits.map(hit => [
      hit.timestamp,
      hit.ip,
      `"${(hit.userAgent || '').replace(/"/g, '""')}"`,
      hit.path,
      hit.method,
      hit.payloadSize,
      hit.headers?.referer || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=honeypot-${Date.now()}.csv`
    });
    res.send(csv);
  });

  return router;
}

module.exports = {
  createHoneypotMonitor
};

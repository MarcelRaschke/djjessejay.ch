'use strict';

const net = require('net');
const { ipKeyGenerator } = require('express-rate-limit');

// Rate-limit key per visitor. In production cloudflared runs on the origin host
// and connects from loopback, so every request shares one socket address; the
// visitor's address is then in CF-Connecting-IP, which Cloudflare sets and
// overwrites at the edge. The header is trusted only from a loopback peer: any
// other client could forge it, so for them the socket address is used.
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

function clientKey(req) {
  const peer = req.socket?.remoteAddress || '';
  const header = req.headers['cf-connecting-ip'];
  if (LOOPBACK.has(peer) && typeof header === 'string' && net.isIP(header.trim())) {
    return ipKeyGenerator(header.trim());
  }
  return ipKeyGenerator(peer || 'unknown');
}

module.exports = { clientKey };

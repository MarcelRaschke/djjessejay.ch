#!/usr/bin/env node
const https = require('https');
const dns = require('dns').promises;
const tls = require('tls');

const domain = process.argv[2] || 'djjessejay.ch';
const origin = process.argv[3] || 'localhost:8080';
let passed = 0, failed = 0;

async function test(name, fn) {
  process.stdout.write(`Testing: ${name}... `);
  try {
    await fn();
    console.log('✅ PASS');
    passed++;
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    failed++;
  }
}

async function testDNSResolution() {
  const addresses = await dns.resolve4(domain);
  const isCloudflare = addresses.some(ip => 
    ip.startsWith('104.') || ip.startsWith('141.') || 
    ip.startsWith('162.') || ip.startsWith('172.')
  );
  if (!isCloudflare) throw new Error(`DNS resolves to ${addresses[0]}, expected Cloudflare IP`);
}

async function testHTTPSConnectivity() {
  return new Promise((resolve, reject) => {
    const options = { hostname: domain, port: 443, path: '/health', method: 'GET', timeout: 5000 };
    const req = https.request(options, (res) => {
      if (res.statusCode === 200 || res.statusCode === 404) resolve();
      else reject(new Error(`HTTP ${res.statusCode}`));
    });
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Timeout')));
    req.end();
  });
}

async function testOriginIsolation() {
  return new Promise((resolve, reject) => {
    const [host, port] = origin.split(':');
    const options = { hostname: host, port: parseInt(port), timeout: 2000 };
    const req = https.request(options, () => reject(new Error('Origin is directly accessible')));
    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') resolve();
      else reject(err);
    });
    req.on('timeout', () => resolve());
    req.end();
  });
}

async function testCertificateValidity() {
  return new Promise((resolve, reject) => {
    const options = { hostname: domain, port: 443, rejectUnauthorized: true };
    const socket = tls.connect(options, () => {
      const cert = socket.getPeerCertificate();
      socket.destroy();
      if (!cert || !cert.valid_from || !cert.valid_to) reject(new Error('Invalid certificate'));
      else resolve();
    });
    socket.on('error', reject);
    socket.setTimeout(5000, () => { socket.destroy(); reject(new Error('Timeout')); });
  });
}

async function testCloudflareHeaders() {
  return new Promise((resolve, reject) => {
    const options = { hostname: domain, port: 443, path: '/', method: 'GET', timeout: 5000 };
    const req = https.request(options, (res) => {
      const cfRay = res.headers['cf-ray'];
      if (!cfRay) reject(new Error('CF-RAY header missing'));
      else resolve();
    });
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Timeout')));
    req.end();
  });
}

async function testTunnelStatus() {
  return new Promise((resolve, reject) => {
    const options = { hostname: domain, port: 443, path: '/health', method: 'GET', timeout: 5000 };
    const req = https.request(options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 500) resolve();
      else reject(new Error(`HTTP ${res.statusCode}`));
    });
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Timeout')));
    req.end();
  });
}

(async function() {
  console.log(`\n🔒 Origin Protection Verification\nDomain: ${domain}\nOrigin: ${origin}\n─────────────────────────────────\n`);
  await test('DNS Resolution', testDNSResolution);
  await test('HTTPS Connectivity', testHTTPSConnectivity);
  await test('Origin Isolation', testOriginIsolation);
  await test('Certificate Validity', testCertificateValidity);
  await test('Cloudflare Headers', testCloudflareHeaders);
  await test('Tunnel Status', testTunnelStatus);
  console.log(`\n─────────────────────────────────\n📊 Results: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();

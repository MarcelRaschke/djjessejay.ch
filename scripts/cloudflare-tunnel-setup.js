#!/usr/bin/env node

/**
 * Cloudflare Tunnel Setup Automation
 * 
 * Automates creation of Cloudflare Tunnel and Access control policies
 * for djjessejay.ch origin protection.
 * 
 * Prerequisites:
 * - CLOUDFLARE_API_TOKEN (with Zone.Tunnel:Edit + Organization.Access:Edit)
 * - CLOUDFLARE_ACCOUNT_ID (from Cloudflare Dashboard)
 * - CLOUDFLARE_ZONE_ID (for djjessejay.ch)
 * - ORIGIN_HOST (e.g., localhost:8080 or origin.internal:8080)
 * 
 * Usage:
 *   CLOUDFLARE_API_TOKEN=xyz node scripts/cloudflare-tunnel-setup.js
 */

const https = require('https');

const {
  CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_ZONE_ID,
  ORIGIN_HOST = 'localhost:8080',
} = process.env;

const errors = [];
if (!CLOUDFLARE_API_TOKEN) errors.push('Missing CLOUDFLARE_API_TOKEN');
if (!CLOUDFLARE_ACCOUNT_ID) errors.push('Missing CLOUDFLARE_ACCOUNT_ID');
if (!CLOUDFLARE_ZONE_ID) errors.push('Missing CLOUDFLARE_ZONE_ID');

if (errors.length > 0) {
  console.error('❌ Configuration Error:');
  errors.forEach(e => console.error(`   ${e}`));
  process.exit(1);
}

async function cfAPI(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.cloudflare.com',
      port: 443,
      path: `/client/v4${path}`,
      method,
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (!json.success) {
            reject(new Error(`API Error: ${JSON.stringify(json.errors)}`));
          } else {
            resolve(json.result);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function setupTunnel() {
  console.log('🚀 Starting Cloudflare Tunnel Setup\n');

  try {
    console.log('📍 Step 1: Creating Cloudflare Tunnel...');
    const tunnel = await cfAPI('POST', `/accounts/${CLOUDFLARE_ACCOUNT_ID}/cfd_tunnel`, {
      name: 'djjessejay-origin-protection',
      description: 'Automated tunnel for djjessejay.ch origin protection',
      config_src: 'cloudflare',
    });

    const tunnelId = tunnel.id;
    const tunnelToken = tunnel.token;

    console.log(`✅ Tunnel created: ${tunnelId}`);
    console.log(`🔑 Tunnel Token: ${tunnelToken}\n`);

    console.log('📍 Step 2: Creating Access Group...');
    const accessGroup = await cfAPI('POST', `/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/groups`, {
      name: 'djjessejay-authorized-users',
      description: 'Authorized users for djjessejay.ch tunnel access',
      include: [
        { email: { email: 'paulimausizu@gmail.com' } },
        { email: { email: 'dingsda26@gmail.com' } },
      ],
    });

    const groupId = accessGroup.id;
    console.log(`✅ Access Group created: ${groupId}\n`);

    console.log('📍 Step 3: Creating Access Policy...');
    const accessPolicy = await cfAPI('POST', `/zones/${CLOUDFLARE_ZONE_ID}/access/apps`, {
      name: 'djjessejay-tunnel-access',
      domain: 'djjessejay.ch',
      type: 'self_hosted',
      session_duration: '24h',
      enable_binding_cookie: true,
      app_launcher_visible: false,
    });

    const appId = accessPolicy.id;
    console.log(`✅ Access Policy created: ${appId}\n`);

    console.log('📍 Step 4: Creating Access Policy Rule...');
    const policyRule = await cfAPI('POST', `/zones/${CLOUDFLARE_ZONE_ID}/access/apps/${appId}/policies`, {
      name: 'Authorized Email Access',
      description: 'Allow access to authorized email addresses',
      precedence: 1,
      decision: 'allow',
      include: [{ group: { id: groupId } }],
    });

    console.log(`✅ Policy Rule created: ${policyRule.id}\n`);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ TUNNEL SETUP COMPLETE\n');
    console.log('📋 Summary:');
    console.log(`   Tunnel ID:      ${tunnelId}`);
    console.log(`   Tunnel Token:   ${tunnelToken}`);
    console.log(`   Access Group:   ${groupId}`);
    console.log(`   Access Policy:  ${appId}`);
    console.log(`   Policy Rule:    ${policyRule.id}\n`);
    console.log('🔐 Authorized Users:');
    console.log('   - paulimausizu@gmail.com');
    console.log('   - dingsda26@gmail.com\n');
    console.log('📝 Next Steps:');
    console.log('   1. Save the Tunnel Token above');
    console.log('   2. Deploy cloudflared connector on origin server');
    console.log(`   3. Run: ./cloudflared tunnel run --token ${tunnelToken}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

setupTunnel();

'use strict';

const path = require('path');
const fs = require('fs/promises');
const express = require('express');

const router = express.Router();
const ROOT = path.resolve(__dirname, '..');

const DRIVE_VISUALS = [
  {
    id: '1ZZM0k-QwVW4tq358QenJ0atgWwGMz3dz',
    name: 'dj Jesse Jay Logo.svg',
    kind: 'logo',
    sourceUrl: 'https://drive.google.com/file/d/1ZZM0k-QwVW4tq358QenJ0atgWwGMz3dz/view'
  },
  {
    id: '1scybBquoSKEck0yP0Ya6FYWW-KvaKg0A',
    name: 'Dj JesseJay.png',
    kind: 'image',
    sourceUrl: 'https://drive.google.com/file/d/1scybBquoSKEck0yP0Ya6FYWW-KvaKg0A/view'
  },
  {
    id: '1k4FQ88mFTrG-rbiKnMa0Vc4wJzOUsfXM',
    name: 'neon dj jj.png',
    kind: 'image',
    sourceUrl: 'https://drive.google.com/file/d/1k4FQ88mFTrG-rbiKnMa0Vc4wJzOUsfXM/view'
  },
  {
    id: '1lSud5Z7kGHxnMQFjtutAh57oogzbvYCD',
    name: 'dj Jesse Jay.gif',
    kind: 'animation',
    sourceUrl: 'https://drive.google.com/file/d/1lSud5Z7kGHxnMQFjtutAh57oogzbvYCD/view'
  }
];

async function readJson(relativePath) {
  const raw = await fs.readFile(path.join(ROOT, relativePath), 'utf8');
  return JSON.parse(raw);
}

async function fileExists(relativePath) {
  try {
    await fs.access(path.join(ROOT, relativePath));
    return true;
  } catch {
    return false;
  }
}

router.get('/profile', async (_req, res) => {
  try {
    const profile = await readJson('artist-profile.json');
    res.json({
      source: {
        type: 'git-repository',
        repository: 'MarcelRaschke/djjessejay.ch',
        branch: process.env.GIT_BRANCH || 'main',
        path: 'artist-profile.json',
        evidenceClass: 'P1'
      },
      data: profile
    });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load canonical artist profile.', detail: error.message });
  }
});

router.get('/sources', async (_req, res) => {
  const provenancePresent = await fileExists('website/provenance.json');
  const profilePresent = await fileExists('artist-profile.json');

  res.json({
    generatedAt: new Date().toISOString(),
    policy: 'Evidence → Canonical Profile → Structured Data → Website/Presskit → AI Context → Generated Content',
    sources: [
      {
        id: 'github-site',
        label: 'djjessejay.ch / GitHub',
        type: 'github',
        status: profilePresent ? 'connected' : 'degraded',
        mode: 'read-local-checkout',
        repository: 'MarcelRaschke/djjessejay.ch',
        branch: 'main',
        url: 'https://github.com/MarcelRaschke/djjessejay.ch',
        evidenceClass: 'P1'
      },
      {
        id: 'canonical-profile',
        label: 'Canonical Artist Profile',
        type: 'repository-data',
        status: profilePresent ? 'connected' : 'degraded',
        path: 'artist-profile.json',
        evidenceClass: 'P1'
      },
      {
        id: 'provenance',
        label: 'Website Provenance',
        type: 'repository-data',
        status: provenancePresent ? 'connected' : 'degraded',
        path: 'website/provenance.json',
        evidenceClass: 'P1'
      },
      {
        id: 'google-drive-visuals',
        label: 'Google Drive Visual Assets',
        type: 'google-drive',
        status: 'catalogued',
        mode: 'external-reference',
        note: 'Known Drive file IDs are catalogued. Runtime OAuth is not configured; files are not silently copied.',
        itemCount: DRIVE_VISUALS.length
      },
      {
        id: 'google-analytics',
        label: 'Google Analytics',
        type: 'analytics',
        status: process.env.GA_PROPERTY_ID ? 'configured' : 'not_connected',
        note: process.env.GA_PROPERTY_ID ? 'Property ID configured; API credentials still require server-side validation.' : 'No GA property configured. No analytics values are fabricated.'
      },
      {
        id: 'blue-dimension-live',
        label: 'Blue Dimension Live Metadata',
        type: 'radio',
        status: process.env.BLUE_DIMENSION_METADATA_URL ? 'configured' : 'not_connected',
        note: 'Static identity comes from canonical profile. Current schedule/now-playing/listeners require a verified live endpoint.'
      }
    ]
  });
});

router.get('/visuals', (_req, res) => {
  res.json({
    source: 'Google Drive external references',
    mode: 'catalogue-only',
    authenticatedRuntimeAccess: false,
    items: DRIVE_VISUALS
  });
});

router.get('/analytics', (_req, res) => {
  if (!process.env.GA_PROPERTY_ID) {
    return res.status(503).json({
      status: 'not_connected',
      provider: 'Google Analytics',
      metrics: null,
      message: 'GA_PROPERTY_ID is not configured; real metrics are intentionally unavailable.'
    });
  }

  return res.status(501).json({
    status: 'configuration_present_adapter_pending',
    provider: 'Google Analytics',
    propertyId: process.env.GA_PROPERTY_ID,
    metrics: null
  });
});

router.get('/radio', async (_req, res) => {
  try {
    const profile = await readJson('artist-profile.json');
    res.json({
      identity: profile.radio,
      live: process.env.BLUE_DIMENSION_METADATA_URL
        ? { status: 'configured', endpoint: process.env.BLUE_DIMENSION_METADATA_URL }
        : { status: 'not_connected', nowPlaying: null, listeners: null, schedule: null },
      warning: 'No current radio schedule, now-playing or listener count is asserted without a verified live source.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load radio identity.', detail: error.message });
  }
});

module.exports = router;

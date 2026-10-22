'use strict';

const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const controlCenterRouter = require('./control-center/data-sources');
const djjjSurveyRouter = require('./routes/djjj-survey');
const { createHoneypotMiddleware } = require('./honeypot/honeypot-middleware');
const { createHoneypotMonitor } = require('./honeypot/honeypot-monitor');
const { createClientKeyGenerator } = require('./src/client-key');

const app = express();

// Honeypot middleware (early in stack to catch probing)
app.use(createHoneypotMiddleware());

// Regular body parsers
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

// CORS configuration - restrict to known origins
const allowedOrigins = [
  'https://djjessejay.ch',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8080'
];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Behind the Cloudflare Tunnel every request arrives from cloudflared on the
// loopback interface, so a key derived from the socket address is the same for
// every visitor and both limiters below share one bucket for the whole
// internet. The per-client identity is the leftmost x-forwarded-for entry, but
// only once the deployed wdjjj Worker overwrites that header and Access keeps
// everything else off the origin — see src/client-key.js. Neither is visible
// from here, so the operator asserts both with TRUST_FORWARDED_FOR=1. Set it
// too early and a client can rotate spoofed addresses through fresh buckets.
const TRUST_FORWARDED_FOR = process.env.TRUST_FORWARDED_FOR === '1';
app.set('trust proxy', TRUST_FORWARDED_FOR ? 'loopback' : false);
const clientKey = createClientKeyGenerator(rateLimit.ipKeyGenerator, { trustForwardedFor: TRUST_FORWARDED_FOR });

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey
});

// Stricter rate limiting for AI proxy to bound upstream cost
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many AI requests, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Honeypot monitoring (requires HONEYPOT_MONITOR_TOKEN env var)
app.use('/api', createHoneypotMonitor());

// Read-only DJ Jesse Jay Control Center source APIs.
// These routes expose repository-backed truth and explicit connection state only.
app.use('/api/control-center', controlCenterRouter);

// djjjcoin community survey (Phase 2 use-case survey) — anonymous submissions,
// rate-limited by the global /api/ limiter, honeypot-checked in the router.
app.use('/api/djjj-survey', djjjSurveyRouter);

// Static files.
// In production the origin only serves /api: the public site comes from GitHub Pages
// through the wdjjj Worker, and the Worker forwards nothing else here. Static serving
// is therefore off unless SERVE_STATIC=1 (local preview, `npm run dev`, or the
// documented custom-server rollback). Even then only an explicit allowlist of public
// site files is served; everything else in the repository stays unreachable.
const SERVE_STATIC = process.env.SERVE_STATIC === '1';
const PUBLIC_FILES = new Set([
  'index.html', 'ivdj-supreme.html', 'hero-test.html', 'artist-profile.json', 'robots.txt',
  'favicon.ico', 'favicon.svg', 'tailwind.css', 'jessejay.css', 'scripts.js',
  'DJ-Jesse-Jay.jpg', 'DJPult.gif', 'img_contact_sound.svg', 'spacer.svg',
]);
const PUBLIC_DIRS = new Set(['css', 'js', 'assets', 'survey', 'pressekit', 'presskit', 'website', 'visuals', 'vendor']);
const BLOCKED_EXT = /\.(?:sql|env|pem|key|log|jsonl|sh|py|ts|md|ya?ml|lock)$/i;
const staticFiles = express.static(__dirname, { dotfiles: 'ignore', index: ['index.html'], redirect: false });

// Directory index of the allowlisted trees, built once at startup so the request path never
// touches the filesystem synchronously. Directories added later need a restart to get the
// trailing-slash redirect; their files are still served by express.static.
function collectPublicDirectories() {
  const dirs = new Set();
  const walk = (rel) => {
    let entries;
    try { entries = fs.readdirSync(path.join(__dirname, rel), { withFileTypes: true }); } catch { return; }
    dirs.add(rel);
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) walk(`${rel}/${entry.name}`);
    }
  };
  for (const top of PUBLIC_DIRS) walk(top);
  return dirs;
}
const PUBLIC_DIR_INDEX = collectPublicDirectories();

/**
 * Returns 'serve', 'deny', 'bad', 'pass' (not a file request: let the SPA fallback answer)
 * or { redirect } for an allowlisted directory requested without its trailing slash.
 */
function classifyStaticPath(rawPath) {
  let decoded;
  try { decoded = decodeURIComponent(rawPath); } catch { return 'bad'; }
  const rel = path.posix.normalize(decoded.replace(/\\/g, '/')).replace(/^\/+/, '');
  if (rel === '' || rel === '.') return 'serve';
  if (rel.startsWith('..') || rel.split('/').some((seg) => seg.startsWith('.'))) return 'deny';
  if (BLOCKED_EXT.test(rel)) return 'deny';
  const top = rel.split('/')[0];
  if (PUBLIC_FILES.has(rel)) return 'serve';
  // A directory inside the allowlist requested without its trailing slash ("/survey",
  // "/visuals/blue-dimension-21600") redirects to its index. The target is built from the
  // normalized relative path, so "//survey" cannot become an off-site redirect.
  if (PUBLIC_DIRS.has(top) && !decoded.endsWith('/') && PUBLIC_DIR_INDEX.has(rel)) return { redirect: `/${rel}/` };
  if (PUBLIC_DIRS.has(top) && rel.length > top.length) return 'serve';
  const last = rel.split('/').pop();
  return last.includes('.') ? 'deny' : 'pass';
}

if (SERVE_STATIC) {
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path === '/api' || req.path.startsWith('/api/')) return next();
    const verdict = classifyStaticPath(req.path);
    if (verdict === 'bad') return res.status(400).end();
    if (verdict === 'deny') return res.status(404).end();
    if (verdict === 'serve') return staticFiles(req, res, next);
    if (verdict && verdict.redirect) {
      const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
      return res.redirect(301, verdict.redirect + query);
    }
    return next();
  });
}

// Environment variables
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY || '';
const SCORE_THRESHOLD = Number(process.env.RECAPTCHA_SCORE_THRESHOLD) || 0.5;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
const ANTHROPIC_MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS) || 1024;
const MAX_FIELD_LENGTH = 2000;
const AI_PROMPT_MAX_LENGTH = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Server-owned system instructions keyed by feature id. The client only sends
// the feature id and user input; it can never supply a system instruction, so
// prompts cannot be injected via the system role.
const AI_SYSTEM_INSTRUCTIONS = {
  bio: "You are a creative music journalist with a passion for electronic music. Write an engaging and slightly poetic alternative biography for DJ Jesse Jay, based on his existing bio. Highlight the 'soul-bearing journeys' and his deep connection to the Zurich club scene. Keep it to three paragraphs. Respond in German.",
  refine: "You are a helpful AI assistant. Your task is to refine a user's message into a more professional and clear booking or contact request. Correct any grammar or spelling mistakes and structure it politely, but retain the original intent and key information. Respond in the same language as the user's message.",
  recommendation: "You are a knowledgeable and enthusiastic music curator for DJ Jesse Jay. Based on a user's described mood or event, you recommend one of three categories of his mixes: 'Latest Mixes' for modern, cutting-edge sounds; 'Radio Show' for deep, long-form journeys; or 'Classic Sets' for timeless, nostalgic vibes. Your response should first state the recommended category in bold, surrounded by asterisks (e.g., **Latest Mixes**), followed by a creative, short paragraph explaining why it's the perfect fit. Respond in the same language as the user's prompt.",
  press: "You are a professional PR agent specializing in electronic music. Your task is to write a short, exciting press release or social media announcement (around 100-150 words) for a gig by DJ Jesse Jay. The tone should be professional yet energetic. Use the provided event details. The output should be ready to copy and paste. Respond in the language of the user's details.",
  setlist: "You are an expert AI music curator with deep knowledge of Progressive House, Techno, and Deep House from the 90s to today. Your task is to create a hypothetical 5-track setlist that DJ Jesse Jay might play, based on a user's description of a mood or theme. You must adhere to his known style: soulful, deep, journey-like, and sometimes sexy. The setlist should have a logical flow. RULES: 1. Generate a list of exactly 5 tracks. 2. Format the output as a numbered list. 3. Each item must follow this format: `Artist Name - Track Title (Remix if applicable)`. 4. Choose plausible, real tracks from the appropriate genres. 5. After the list, add one short, creative sentence describing the overall vibe of the generated set. 6. Respond in the same language as the user's prompt.",
  chat: "You are a friendly and knowledgeable AI assistant for the website of DJ Jesse Jay, a techno and progressive house DJ from Zurich, Switzerland. Your name is JJ-AI. Your knowledge is based on the following information: - DJ Name: Jesse Jay (real name: Michael Fellner) - Active Since: 1997 - Location: Zurich, Switzerland - Music Styles: Progressive House, Techno, Deep House, Melodic Tech. His music is described as 'soul-bearing journeys' and 'deep, timeless musical experiences'. - Radio Show: 'The Blue Dimension' on Radio LoRa (lora.ch & DAB+). It runs every Thursday from midnight to 6 AM. He has been hosting a show since 2001. - Career Highlights: He grew up in the scene of legendary Zurich clubs like Aera, Labyrinth, SpiderGalaxy, and Dachkantine. - Official Links: Soundcloud (soundcloud.com/jessejay) and Radio LoRa (lora.ch/radio/sendungen/blue-dimension). - Personality: Answer in a helpful and slightly enthusiastic tone, reflecting the passion for electronic music. Keep answers concise and to the point. - Language: Always respond in the language of the user's question. - Limitations: You CANNOT handle bookings, personal requests, or provide personal contact details. If a user asks about bookings, you MUST direct them to the contact form on the website. - Your Goal: To answer questions about DJ Jesse Jay's music, career, and radio show based ONLY on the information provided."
};

// Security: Input validation and sanitization
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeInput(str, maxLength = MAX_FIELD_LENGTH) {
  if (!str) return '';
  let sanitized = String(str).trim();
  // Remove potentially harmful characters
  sanitized = sanitized.replace(/[<>\"'%&;()]/g, '');
  // Limit length
  return sanitized.substring(0, maxLength);
}

async function verifyRecaptcha(token) {
  if (!token) {
    throw new Error('reCAPTCHA token is required');
  }
  
  const params = new URLSearchParams({ 
    secret: RECAPTCHA_SECRET, 
    response: token 
  });
  
  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    body: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  
  if (!res.ok) {
    throw new Error(`reCAPTCHA verification failed with status ${res.status}`);
  }
  
  return res.json();
}

async function sendContactEmail({ name, email, message }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.CONTACT_EMAIL_TO) {
    console.warn('SMTP configuration incomplete, email not sent');
    return;
  }
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { 
      user: process.env.SMTP_USER, 
      pass: process.env.SMTP_PASS 
    },
    tls: {
      // Always verify certificates; set SMTP_REJECT_UNAUTHORIZED=false to disable for self-signed certs
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false'
    }
  });
  
  await transporter.sendMail({
    from: `"DJ Jesse Jay Website" <${process.env.SMTP_USER}>`,
    to: process.env.CONTACT_EMAIL_TO,
    replyTo: email,
    subject: `Kontaktanfrage von ${sanitizeInput(name)}`,
    text: `Name: ${sanitizeInput(name)}\nEmail: ${sanitizeInput(email)}\n\n${sanitizeInput(message)}`,
    html: `<p><strong>Name:</strong> ${escapeHtml(name)}</p>`
      + `<p><strong>Email:</strong> ${escapeHtml(email)}</p><hr>`
      + `<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
  });
}

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const name = sanitizeInput(req.body.name);
    const email = sanitizeInput(req.body.email);
    const message = sanitizeInput(req.body.message);
    const token = req.body['g-recaptcha-response'];

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, email, and message are required.' 
      });
    }

    // Validate email format
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }

    // Validate reCAPTCHA token
    if (!token) {
      return res.status(400).json({ error: 'reCAPTCHA token is missing.' });
    }

    // Validate reCAPTCHA configuration
    if (!RECAPTCHA_SECRET) {
      console.error('RECAPTCHA_SECRET_KEY is not configured');
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    // Verify reCAPTCHA
    let captcha;
    try {
      captcha = await verifyRecaptcha(token);
    } catch (err) {
      console.error('reCAPTCHA verification error:', err.message);
      return res.status(502).json({ error: 'reCAPTCHA verification service unavailable.' });
    }

    // Check reCAPTCHA result
    if (!captcha.success) {
      console.warn('reCAPTCHA failed:', { success: captcha.success, score: captcha.score });
      return res.status(403).json({ error: 'Bot traffic detected.' });
    }

    if (typeof captcha.score !== 'number' || captcha.score < SCORE_THRESHOLD) {
      console.warn('reCAPTCHA score too low:', { score: captcha.score, threshold: SCORE_THRESHOLD });
      return res.status(403).json({ error: 'Bot traffic detected.' });
    }

    // Send email notification
    try {
      await sendContactEmail({ name, email, message });
    } catch (err) {
      console.error('Email send failed:', err.message);
      // Don't fail the request if email fails (user still gets success response)
      // Return 500 only if SMTP is configured but fails
      if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        return res.status(500).json({ error: 'Failed to send message.' });
      }
    }

    console.log('Contact submission successful:', { name, email, score: captcha.score });
    res.json({ success: true, message: 'Your message has been sent successfully.' });
    
  } catch (err) {
    console.error('Unexpected error in /api/contact:', err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// AI proxy endpoint.
// The Anthropic API key lives only in the server environment. The browser never
// receives or transmits it. The client supplies a feature id and user input; the
// server selects the system instruction and forwards to Anthropic.
app.post('/api/ai/generate', aiLimiter, async (req, res) => {
  try {
    const feature = sanitizeInput(req.body.feature, 32);
    const userInput = sanitizeInput(req.body.input, AI_PROMPT_MAX_LENGTH);

    if (!feature || !AI_SYSTEM_INSTRUCTIONS[feature]) {
      return res.status(400).json({ error: 'Unknown AI feature.' });
    }
    if (!userInput) {
      return res.status(400).json({ error: 'Input is required.' });
    }

    if (!ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not configured');
      return res.status(503).json({ error: 'AI service is not configured.' });
    }

    const systemInstruction = AI_SYSTEM_INSTRUCTIONS[feature];
    const payload = {
      model: ANTHROPIC_MODEL,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      system: systemInstruction,
      messages: [{ role: 'user', content: userInput }]
    };

    let anthropicRes;
    try {
      anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Anthropic request error:', err.message);
      return res.status(502).json({ error: 'AI service is unavailable.' });
    }

    if (!anthropicRes.ok) {
      console.error('Anthropic response status:', anthropicRes.status);
      return res.status(502).json({ error: 'AI service returned an error.' });
    }

    const result = await anthropicRes.json();
    const text = result && result.content && result.content[0] && result.content[0].text;
    if (!text) {
      return res.status(502).json({ error: 'AI service returned an unexpected response.' });
    }
    res.json({ text });
  } catch (err) {
    console.error('Unexpected error in /api/ai/generate:', err);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    aiEnabled: !!ANTHROPIC_API_KEY
  });
});

// SPA fallback - serve index.html for any non-API GET (local preview only)
app.use((req, res) => {
  if (req.method === 'GET' && !SERVE_STATIC) {
    res.status(404).json({ error: 'Not found.' });
  } else if (req.method === 'GET') {
    res.sendFile(path.join(__dirname, 'index.html'));
  } else {
    res.status(405).json({ error: 'Method not allowed.' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error.',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`reCAPTCHA enabled: ${!!RECAPTCHA_SECRET}`);
  console.log(`AI proxy enabled: ${!!ANTHROPIC_API_KEY}`);
  console.log(`SMTP enabled: ${!!(process.env.SMTP_HOST && process.env.SMTP_USER)}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});
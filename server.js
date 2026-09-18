'use strict';

const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const controlCenterRouter = require('./control-center/data-sources');

const app = express();

// Middleware
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

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter rate limiting for AI proxy to bound upstream cost
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many AI requests, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Read-only DJ Jesse Jay Control Center source APIs.
// These routes expose repository-backed truth and explicit connection state only.
app.use('/api/control-center', controlCenterRouter);

// Static files
app.use(express.static(__dirname, { dotfiles: 'ignore', index: false }));

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

// SPA fallback - serve index.html for any non-API GET
app.use((req, res) => {
  if (req.method === 'GET') {
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
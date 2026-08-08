'use strict';

const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json({ limit: '16kb' }));
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

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Static files
app.use(express.static(__dirname, { dotfiles: 'ignore', index: false }));

// Environment variables
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY || '';
const SCORE_THRESHOLD = Number(process.env.RECAPTCHA_SCORE_THRESHOLD) || 0.5;
const MAX_FIELD_LENGTH = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      // Do not fail on invalid certs
      rejectUnauthorized: process.env.NODE_ENV === 'production'
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// SPA fallback - serve index.html for any non-API GET
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
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
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`reCAPTCHA enabled: ${!!RECAPTCHA_SECRET}`);
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

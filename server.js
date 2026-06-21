'use strict';

const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static(__dirname, { dotfiles: 'ignore', index: false }));

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY || '';
const SCORE_THRESHOLD = Number(process.env.RECAPTCHA_SCORE_THRESHOLD) || 0.5;
const MAX_FIELD_LENGTH = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function verifyRecaptcha(token) {
    const params = new URLSearchParams({ secret: RECAPTCHA_SECRET, response: token });
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        body: params,
    });
    return res.json();
}

async function sendContactEmail({ name, email, message }) {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
        from: `"DJ Jesse Jay Website" <${process.env.SMTP_USER}>`,
        to: process.env.CONTACT_EMAIL_TO,
        replyTo: email,
        subject: `Kontaktanfrage von ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
        html: `<p><strong>Name:</strong> ${escapeHtml(name)}</p>`
            + `<p><strong>Email:</strong> ${escapeHtml(email)}</p><hr>`
            + `<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
    });
}

app.post('/api/contact', async (req, res) => {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim();
    const message = (req.body.message || '').trim();
    const token = req.body['g-recaptcha-response'];

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    if (name.length > MAX_FIELD_LENGTH || email.length > MAX_FIELD_LENGTH || message.length > MAX_FIELD_LENGTH) {
        return res.status(400).json({ error: 'Field too long' });
    }
    if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ error: 'Invalid email address' });
    }
    if (!token) {
        return res.status(400).json({ error: 'reCAPTCHA token missing' });
    }
    if (!RECAPTCHA_SECRET) {
        console.error('RECAPTCHA_SECRET_KEY is not configured');
        return res.status(500).json({ error: 'Server misconfigured' });
    }

    // Verify reCAPTCHA v3 server-side
    let captcha;
    try {
        captcha = await verifyRecaptcha(token);
    } catch (err) {
        console.error('reCAPTCHA verify error:', err.message);
        return res.status(502).json({ error: 'reCAPTCHA verification unavailable' });
    }

    if (!captcha.success || typeof captcha.score !== 'number' || captcha.score < SCORE_THRESHOLD) {
        console.warn('reCAPTCHA rejected:', { success: captcha.success, score: captcha.score });
        return res.status(403).json({ error: 'Bot traffic detected' });
    }

    // Send email — skipped if SMTP not configured
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.CONTACT_EMAIL_TO) {
        try {
            await sendContactEmail({ name, email, message });
        } catch (err) {
            console.error('Email send failed:', err.message);
            return res.status(500).json({ error: 'Failed to send message' });
        }
    } else {
        console.log('Contact submission (SMTP not configured):', { name, email, score: captcha.score });
    }

    res.json({ success: true });
});

// SPA fallback — serve index.html for any non-API GET
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));

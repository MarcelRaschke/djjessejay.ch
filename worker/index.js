/**
 * Cloudflare Worker for djjessejay.ch
 *
 * Serves the static site via the [assets] binding and handles the
 * reCAPTCHA-protected contact endpoint (POST /api/contact) in the same Worker.
 *
 * Email is sent through the Resend HTTP API — nodemailer/SMTP does not work in
 * the Workers runtime (no raw TCP sockets). This mirrors the validation and
 * reCAPTCHA v3 flow from the original Express server.js.
 */

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

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

async function verifyRecaptcha(token, secret) {
    const params = new URLSearchParams({ secret, response: token });
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        body: params,
    });
    return res.json();
}

async function sendContactEmail({ name, email, message }, env) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: env.CONTACT_EMAIL_FROM,
            to: env.CONTACT_EMAIL_TO,
            reply_to: email,
            subject: `Kontaktanfrage von ${name}`,
            text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
            html: `<p><strong>Name:</strong> ${escapeHtml(name)}</p>`
                + `<p><strong>Email:</strong> ${escapeHtml(email)}</p><hr>`
                + `<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
        }),
    });
    if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Resend responded ${res.status}: ${detail}`);
    }
}

async function handleContact(request, env) {
    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid JSON body' }, 400);
    }

    const name = (body.name || '').trim();
    const email = (body.email || '').trim();
    const message = (body.message || '').trim();
    const token = body['g-recaptcha-response'];

    if (!name || !email || !message) {
        return json({ error: 'Missing required fields' }, 400);
    }
    if (name.length > MAX_FIELD_LENGTH || email.length > MAX_FIELD_LENGTH || message.length > MAX_FIELD_LENGTH) {
        return json({ error: 'Field too long' }, 400);
    }
    if (!EMAIL_RE.test(email)) {
        return json({ error: 'Invalid email address' }, 400);
    }
    if (!token) {
        return json({ error: 'reCAPTCHA token missing' }, 400);
    }
    if (!env.RECAPTCHA_SECRET_KEY) {
        console.error('RECAPTCHA_SECRET_KEY is not configured');
        return json({ error: 'Server misconfigured' }, 500);
    }

    // Verify reCAPTCHA v3 server-side
    let captcha;
    try {
        captcha = await verifyRecaptcha(token, env.RECAPTCHA_SECRET_KEY);
    } catch (err) {
        console.error('reCAPTCHA verify error:', err.message);
        return json({ error: 'reCAPTCHA verification unavailable' }, 502);
    }

    const threshold = Number(env.RECAPTCHA_SCORE_THRESHOLD) || 0.5;
    if (!captcha.success || typeof captcha.score !== 'number' || captcha.score < threshold) {
        console.warn('reCAPTCHA rejected:', { success: captcha.success, score: captcha.score });
        return json({ error: 'Bot traffic detected' }, 403);
    }

    // Send email — skipped if Resend not configured (logged instead, no hard failure)
    if (env.RESEND_API_KEY && env.CONTACT_EMAIL_FROM && env.CONTACT_EMAIL_TO) {
        try {
            await sendContactEmail({ name, email, message }, env);
        } catch (err) {
            console.error('Email send failed:', err.message);
            return json({ error: 'Failed to send message' }, 500);
        }
    } else {
        console.log('Contact submission (Resend not configured):', { name, email, score: captcha.score });
    }

    return json({ success: true });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === '/api/contact') {
            if (request.method !== 'POST') {
                return json({ error: 'Method not allowed' }, 405);
            }
            return handleContact(request, env);
        }

        // Everything else → static assets (index.html served for unknown paths
        // via the not_found_handling = "single-page-application" setting).
        return env.ASSETS.fetch(request);
    },
};

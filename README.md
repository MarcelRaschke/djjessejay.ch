# DJ Jesse Jay — djjessejay.ch

Official website of **DJ Jesse Jay**, a professional DJ from Zurich, Switzerland, active since 1997. Host of the radio show *Blue Dimension* on [Radio LoRa](https://www.lora.ch/radio/sendungen/blue-dimension).

---

## Features

- Multilingual support (DE, EN, FR, IT)
- Responsive design (mobile, tablet, desktop)
- Music section with embedded media
- Contact form with reCAPTCHA and privacy consent
- Cookie consent banner
- GDPR-compliant privacy page (`datenschutz.html`) and imprint (`impressum.html`)
- Open Source — Apache License 2.0

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | HTML5, CSS3 (Tailwind CSS), Vanilla JS |
| Fonts      | Google Fonts (Inter)                |
| Hosting    | Static site (no server required)    |

---

## Project Structure

```
djjessejay.ch/
├── img/                  # Images (profile photo, etc.)
├── index.html            # Main page
├── jessejay.css          # Custom styles
├── scripts.js            # JavaScript (cookie banner, language switcher, form)
├── datenschutz.html      # Privacy policy
├── impressum.html        # Imprint
├── robots.txt            # Search engine directives
├── favicon.ico           # Site icon
├── LICENSE               # Apache 2.0
├── CONTRIBUTING.md       # Contribution guidelines
├── CODE_OF_CONDUCT.md    # Code of conduct
└── SECURITY.md           # Security policy
```

---

## Local Development

No build step required — it's a pure static site.

**Option A — Python (built-in):**
```bash
python -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000).

**Option B — Node.js (npx):**
```bash
npx serve .
```

---

## Contact Form

The contact form uses client-side validation and reCAPTCHA. To enable email sending in production, connect it to a backend endpoint or a service such as [Formspree](https://formspree.io) or [EmailJS](https://www.emailjs.com).

Replace `YOUR_RECAPTCHA_SITE_KEY` in `index.html` with your actual Google reCAPTCHA v2 site key.

---

## Contributing

Pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting changes.

---

## License

[Apache License 2.0](LICENSE) — 2003–2025 DJ Jesse Jay, Zürich 🇨🇭

Built with ❤️ by Marcin Kolonko and Marcel Raschke.

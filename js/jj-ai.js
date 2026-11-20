/**
 * JJ-AI visitor assistant for djjessejay.ch. Vanilla, no dependencies.
 *
 * - Appears only when /api/health reports jjAi: true (feature switch on the origin).
 * - Shows an AI disclosure and asks for consent before anything is sent
 *   (EU AI Act Art. 50(1); transfer to Anthropic, see datenschutz.html#jj-ai).
 * - Renders all model output as text. Links come only from server-validated
 *   catalog entries; the booking draft opens the visitor's own mail program.
 * - Only the consent flag and a short-lived availability flag go to sessionStorage.
 */
(() => {
  'use strict';

  const API = '/api/jj-ai/chat';
  const HEALTH = '/api/health';
  const MAX_MESSAGES = 12;
  const MAX_CHARS = 1500;
  const CONSENT_FLAG = 'jjai-consent-v1';
  const MODES = {
    ask: { label: 'Fragen', hello: 'Frag mich zu DJ Jesse Jay, seinem Sound oder seiner Radio-Geschichte.' },
    booking: { label: 'Booking', hello: 'Ich helfe dir, eine Booking-Anfrage vorzubereiten. Um welches Datum und welchen Ort geht es?' },
    mixes: { label: 'Mixes', hello: 'Beschreib Stimmung oder Anlass, ich schlage passende Sets vor.' },
  };

  const state = { mode: 'ask', messages: [], busy: false };
  let els = null;

  function el(tag, attrs = {}, text) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === true) node.setAttribute(k, '');
      else if (v !== false && v != null) node.setAttribute(k, String(v));
    }
    if (text != null) node.textContent = text;
    return node;
  }

  const store = {
    get() { try { return sessionStorage.getItem(CONSENT_FLAG) === '1'; } catch { return false; } },
    set() { try { sessionStorage.setItem(CONSENT_FLAG, '1'); } catch { /* storage unavailable: ask again next time */ } },
  };

  // The availability check is cached per tab for a few minutes, so browsing the
  // site does not call /api/health on every page view.
  const HEALTH_FLAG = 'jjai-available-v1';
  const HEALTH_TTL_MS = 5 * 60 * 1000;

  async function available() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(HEALTH_FLAG) || 'null');
      if (cached && Date.now() - cached.at < HEALTH_TTL_MS) return cached.ok === true;
    } catch { /* no cache */ }
    const ok = await probe();
    try { sessionStorage.setItem(HEALTH_FLAG, JSON.stringify({ ok, at: Date.now() })); } catch { /* storage unavailable */ }
    return ok;
  }

  async function probe() {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    try {
      const res = await fetch(HEALTH, { signal: ctrl.signal, credentials: 'same-origin', headers: { Accept: 'application/json' } });
      if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) return false;
      const data = await res.json();
      return data && data.jjAi === true;
    } catch {
      return false;
    } finally {
      clearTimeout(t);
    }
  }

  function build() {
    const launch = el('button', { type: 'button', class: 'jjai-launch', 'aria-haspopup': 'dialog', 'aria-controls': 'jjai-panel', 'aria-expanded': 'false' });
    launch.append(el('span', { class: 'dot', 'aria-hidden': 'true' }), document.createTextNode('JJ-AI fragen'));

    const panel = el('div', { id: 'jjai-panel', class: 'jjai-panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'jjai-title', hidden: true });
    const head = el('div', { class: 'jjai-head' });
    const title = el('h2', { id: 'jjai-title' }, 'JJ-AI');
    title.append(el('span', { class: 'jjai-badge' }, 'KI'));
    const close = el('button', { type: 'button', class: 'jjai-icon', 'aria-label': 'JJ-AI schliessen' }, '×');
    head.append(title, close);

    const note = el('p', { class: 'jjai-note' }, 'Du chattest mit einer KI, nicht mit DJ Jesse Jay. Antworten können Fehler enthalten. ');
    note.append(el('a', { href: 'eu-ai-act.html#jj-ai' }, 'Mehr zur KI'));

    const consent = el('div', { class: 'jjai-consent' });
    const c1 = el('p');
    c1.append(el('strong', {}, 'Bevor es losgeht: '), document.createTextNode('Deine Nachrichten werden zur Beantwortung an Anthropic in den USA übermittelt und dort nach höchstens 30 Tagen gelöscht. Auf djjessejay.ch wird nichts gespeichert.'));
    const c2 = el('p', {}, 'Bitte keine sensiblen Daten eingeben. JJ-AI sagt nichts zu und entscheidet nichts; Bookings bestätigt DJ Jesse Jay persönlich. ');
    c2.append(el('a', { href: 'datenschutz.html#jj-ai' }, 'Datenschutz'));
    const agree = el('button', { type: 'button', class: 'jjai-btn' }, 'Verstanden, starten');
    consent.append(c1, c2, agree);

    const modes = el('div', { class: 'jjai-modes', role: 'group', 'aria-label': 'Thema', hidden: true });
    for (const [id, m] of Object.entries(MODES)) {
      modes.append(el('button', { type: 'button', 'data-mode': id, 'aria-pressed': String(id === state.mode) }, m.label));
    }

    const log = el('div', { class: 'jjai-log', role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions', hidden: true });

    const form = el('form', { class: 'jjai-form', hidden: true });
    const input = el('textarea', { rows: '1', maxlength: String(MAX_CHARS), 'aria-label': 'Nachricht an JJ-AI', placeholder: 'Nachricht …' });
    const send = el('button', { type: 'submit', class: 'jjai-btn' }, 'Senden');
    form.append(input, send);

    panel.append(head, note, consent, modes, log, form);
    document.body.append(launch, panel);
    return { launch, panel, close, consent, agree, modes, log, form, input, send };
  }

  function addMessage(kind, text, extras) {
    const msg = el('div', { class: `jjai-msg ${kind}` });
    if (kind === 'ai') msg.append(el('span', { class: 'jjai-label' }, 'KI-generiert'));
    msg.append(document.createTextNode(text));
    if (extras) msg.append(extras);
    els.log.append(msg);
    els.log.scrollTop = els.log.scrollHeight;
    return msg;
  }

  function renderExtras(data) {
    const box = el('div', { class: 'jjai-extras' });
    for (const mix of Array.isArray(data.mixes) ? data.mixes : []) {
      if (typeof mix.url === 'string' && mix.url.startsWith('https://soundcloud.com/')) {
        box.append(el('a', { href: mix.url, target: '_blank', rel: 'noopener noreferrer' }, `▶ ${mix.title} (SoundCloud)`));
      }
    }
    const d = data.bookingDraft;
    if (d && d.to === 'info@djjessejay.ch' && typeof d.body === 'string') {
      const open = el('button', { type: 'button' }, 'Entwurf als E-Mail öffnen');
      open.addEventListener('click', () => {
        window.location.href = `mailto:${d.to}?subject=${encodeURIComponent(d.subject || 'Booking-Anfrage')}&body=${encodeURIComponent(d.body)}`;
      });
      box.append(open, el('span', { class: 'jjai-hint' }, 'Bitte prüfen und selbst senden. DJ Jesse Jay antwortet persönlich.'));
    }
    return box.childNodes.length ? box : null;
  }

  function setMode(mode) {
    state.mode = mode;
    state.messages = [];
    els.log.replaceChildren();
    for (const b of els.modes.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    addMessage('ai', MODES[mode].hello);
    els.input.focus();
  }

  function setBusy(busy) {
    state.busy = busy;
    els.send.disabled = busy;
    els.input.disabled = busy;
  }

  async function submit(text) {
    if (state.busy) return;
    const content = text.trim().slice(0, MAX_CHARS);
    if (!content) return;
    if (state.messages.length + 1 > MAX_MESSAGES) {
      addMessage('error', 'Das Gespräch ist lang geworden. Wähle oben ein Thema, um neu zu beginnen.');
      return;
    }
    state.messages.push({ role: 'user', content });
    addMessage('user', content);
    els.input.value = '';
    setBusy(true);
    const typing = el('div', { class: 'jjai-typing' }, 'JJ-AI schreibt …');
    els.log.append(typing);
    try {
      const res = await fetch(API, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ mode: state.mode, messages: state.messages }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.text !== 'string') {
        state.messages.pop();
        addMessage('error', data.error || 'JJ-AI ist gerade nicht erreichbar. Bitte später erneut versuchen oder an info@djjessejay.ch schreiben.');
        return;
      }
      state.messages.push({ role: 'assistant', content: data.text });
      addMessage('ai', data.text, renderExtras(data));
    } catch {
      state.messages.pop();
      addMessage('error', 'Keine Verbindung. Bitte später erneut versuchen.');
    } finally {
      typing.remove();
      setBusy(false);
      els.input.focus();
    }
  }

  function startChat() {
    els.consent.hidden = true;
    els.modes.hidden = false;
    els.log.hidden = false;
    els.form.hidden = false;
    setMode(state.mode);
  }

  function open() {
    els.panel.hidden = false;
    els.launch.hidden = true;
    els.launch.setAttribute('aria-expanded', 'true');
    if (store.get()) {
      if (els.consent.hidden === false) startChat(); else els.input.focus();
    } else {
      els.agree.focus();
    }
  }

  function close() {
    els.panel.hidden = true;
    els.launch.hidden = false;
    els.launch.setAttribute('aria-expanded', 'false');
    els.launch.focus();
  }

  function wire() {
    els.launch.addEventListener('click', open);
    els.close.addEventListener('click', close);
    els.panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    els.agree.addEventListener('click', () => { store.set(); startChat(); });
    els.modes.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-mode]');
      if (b && !state.busy) setMode(b.dataset.mode);
    });
    els.form.addEventListener('submit', (e) => { e.preventDefault(); submit(els.input.value); });
    els.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); els.form.requestSubmit(); }
    });
  }

  async function init() {
    if (!(await available())) return;
    els = build();
    wire();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

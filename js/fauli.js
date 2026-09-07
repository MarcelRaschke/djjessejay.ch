/**
 * FAULI // ZERO_BPM_MODE
 * Blue Dimension / DJ Jesse Jay
 *
 * UI-only visual timebase controller. It never changes audio playback rate or BPM.
 */
(() => {
  'use strict';

  const STATE = Object.freeze({ NORMAL: 'normal', CHILL: 'chill' });
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function injectStyles() {
    if (document.getElementById('fauli-styles')) return;
    const style = document.createElement('style');
    style.id = 'fauli-styles';
    style.textContent = `
      #fauli-easter-egg{position:fixed;right:18px;bottom:18px;z-index:900;display:flex;align-items:center;gap:10px;padding:8px 11px;border:1px solid rgba(0,240,255,.45);border-radius:999px;background:rgba(5,11,24,.82);backdrop-filter:blur(10px);color:#00f0ff;font:700 11px/1.1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;box-shadow:0 0 18px rgba(0,240,255,.16);cursor:pointer;transition:transform .25s ease,box-shadow .25s ease,border-color .25s ease}
      #fauli-easter-egg:hover,#fauli-easter-egg:focus-visible{transform:translateY(-2px);box-shadow:0 0 28px rgba(0,240,255,.35);border-color:#00f0ff;outline:none}
      #fauli-easter-egg .fauli-face{width:34px;height:34px;display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle at 50% 38%,#334155 0 34%,#1e293b 35% 70%,#0b1220 71%);font-size:20px;filter:drop-shadow(0 0 7px rgba(0,240,255,.45))}
      #fauli-easter-egg .fauli-readout{min-width:108px}
      #fauli-easter-egg .fauli-state{display:block;color:#ffb703;font-size:9px;margin-top:3px}
      html[data-fauli-state="chill"] #fauli-easter-egg{border-color:#ffb703;box-shadow:0 0 30px rgba(255,183,3,.2)}
      html[data-fauli-state="chill"] #fauli-easter-egg .fauli-state{color:#00f0ff}
      html[data-fauli-state="chill"] .animate-float{animation-duration:24s!important}
      html[data-fauli-state="chill"] .animate-pulse-glow{animation-duration:16s!important}
      html[data-fauli-state="chill"] .bg-gradient-animated{animation-duration:32s!important}
      @media (max-width:640px){#fauli-easter-egg{right:10px;bottom:10px;padding:7px 9px}.fauli-copy{display:none}#fauli-easter-egg .fauli-readout{min-width:78px}}
      @media (prefers-reduced-motion:reduce){#fauli-easter-egg{transition:none}#fauli-easter-egg:hover,#fauli-easter-egg:focus-visible{transform:none}}
    `;
    document.head.appendChild(style);
  }

  function setState(state) {
    const chill = state === STATE.CHILL;
    document.documentElement.dataset.fauliState = state;
    document.documentElement.style.setProperty('--fauli-visual-rate', chill ? '0.0038' : '1');

    const root = document.getElementById('fauli-easter-egg');
    if (!root) return;
    root.setAttribute('aria-pressed', String(chill));
    root.setAttribute('aria-label', chill ? 'Fauli: Chill Mode aktiv. Zurück zum vollen Signal.' : 'Fauli: Zero BPM Mode aktivieren.');
    root.querySelector('.fauli-bpm').textContent = chill ? '0.5 BPM' : '130+ BPM';
    root.querySelector('.fauli-state').textContent = chill ? 'ZERO_BPM_MODE // ACTIVE' : 'CLICK TO CHILL';
  }

  function mount() {
    if (document.getElementById('fauli-easter-egg')) return;
    injectStyles();

    const button = document.createElement('button');
    button.id = 'fauli-easter-egg';
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `
      <span class="fauli-face" aria-hidden="true">🦥</span>
      <span class="fauli-readout">
        <span class="fauli-bpm">130+ BPM</span>
        <span class="fauli-state">CLICK TO CHILL</span>
      </span>
      <span class="fauli-copy" aria-hidden="true">FAULI</span>
    `;

    button.addEventListener('click', () => {
      const next = document.documentElement.dataset.fauliState === STATE.CHILL ? STATE.NORMAL : STATE.CHILL;
      setState(next);
      window.dispatchEvent(new CustomEvent('fauli:statechange', { detail: { state: next, visualRate: next === STATE.CHILL ? 0.0038 : 1 } }));
    });

    document.body.appendChild(button);
    setState(STATE.NORMAL);

    if (prefersReducedMotion.matches) {
      button.title = 'Bewegung reduziert (Systemeinstellung)';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();

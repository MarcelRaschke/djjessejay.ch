/**
 * FAULI // CHILL PROTOCOL
 * Blue Dimension / DJ Jesse Jay
 *
 * Deterministic, UI-only state machine.
 *
 * Boundary:
 *   FAULI controls visual state, not sound.
 *   visualBpm is an animation timebase only.
 *   No audio BPM, gain, DSP, playback-rate, or network control is exposed.
 */
(() => {
  'use strict';

  const STATES = Object.freeze({ NORMAL: 'normal', CHILL: 'chill' });

  const CHILL_STATE = Object.freeze({
    stability: 100,
    visualBpm: 0.5,
    signal: '97.5 MHz',
    overdrive: 'SUPPRESSED',
    status: 'STABLE',
    mode: 'CHILL',
    control: 'ACTIVE',
    kineticLoad: 'DAMPED',
    network: 'NOMINAL'
  });

  const NORMAL_STATE = Object.freeze({
    stability: 100,
    visualBpm: null,
    signal: '97.5 MHz',
    overdrive: 'SUPPRESSED',
    status: 'STABLE',
    mode: 'NORMAL',
    control: 'ACTIVE',
    kineticLoad: 'NOMINAL',
    network: 'NOMINAL'
  });

  let state = STATES.NORMAL;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function snapshot(nextState = state) {
    const source = nextState === STATES.CHILL ? CHILL_STATE : NORMAL_STATE;
    return Object.freeze({ ...source });
  }

  function render(nextState = state) {
    const current = snapshot(nextState);
    const root = document.documentElement;

    root.dataset.fauliState = nextState;
    root.style.setProperty(
      '--fauli-visual-rate',
      nextState === STATES.CHILL ? '0.0038' : '1'
    );

    const hud = document.getElementById('fauli-hud');
    if (!hud) return current;

    const fields = {
      stability: current.stability + '%',
      visualBpm: current.visualBpm === null ? '—' : current.visualBpm,
      signal: current.signal,
      overdrive: current.overdrive,
      status: current.status,
      mode: current.mode,
      control: current.control,
      kineticLoad: current.kineticLoad,
      network: current.network
    };

    Object.entries(fields).forEach(([key, value]) => {
      const node = hud.querySelector(`[data-fauli="${key}"]`);
      if (node) node.textContent = value;
    });

    hud.dataset.state = nextState;
    return current;
  }

  function transition(nextState) {
    if (!Object.values(STATES).includes(nextState) || nextState === state) {
      return snapshot();
    }

    state = nextState;
    const current = render(state);

    window.dispatchEvent(new CustomEvent('fauli:statechange', {
      detail: {
        state,
        snapshot: current
      }
    }));

    return current;
  }

  function mountHud() {
    if (document.getElementById('fauli-hud')) return;

    const hud = document.createElement('section');
    hud.id = 'fauli-hud';
    hud.setAttribute('aria-label', 'FAULI Chill Protocol Status');
    hud.innerHTML = `
      <header>FAULI // CHILL PROTOCOL</header>
      <dl>
        <div><dt>SYSTEM STABILITY</dt><dd data-fauli="stability"></dd></div>
        <div><dt>VISUAL BPM</dt><dd data-fauli="visualBpm"></dd></div>
        <div><dt>SIGNAL</dt><dd data-fauli="signal"></dd></div>
        <div><dt>OVERDRIVE</dt><dd data-fauli="overdrive"></dd></div>
        <div><dt>STATUS</dt><dd data-fauli="status"></dd></div>
        <div><dt>MODE</dt><dd data-fauli="mode"></dd></div>
        <div><dt>CONTROL</dt><dd data-fauli="control"></dd></div>
        <div><dt>KINETIC LOAD</dt><dd data-fauli="kineticLoad"></dd></div>
        <div><dt>NETWORK</dt><dd data-fauli="network"></dd></div>
      </dl>
      <footer>FAULI // CHIEF CHILL OFFICER<br><span>No panic. No overdrive. Just signal.</span></footer>
    `;

    document.body.appendChild(hud);
    render();
  }

  function injectStyles() {
    if (document.getElementById('fauli-styles')) return;

    const style = document.createElement('style');
    style.id = 'fauli-styles';
    style.textContent = `
      #fauli-hud{position:fixed;right:18px;bottom:18px;z-index:900;width:min(310px,calc(100vw - 36px));padding:16px;border:1px solid rgba(0,240,255,.42);border-radius:12px;background:rgba(5,11,24,.88);backdrop-filter:blur(12px);color:#d9faff;font:600 10px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em;box-shadow:0 0 24px rgba(0,240,255,.12)}
      #fauli-hud header{margin-bottom:12px;color:#00f0ff;font-size:12px;font-weight:800;letter-spacing:.14em}
      #fauli-hud dl{display:grid;gap:6px;margin:0}
      #fauli-hud dl div{display:flex;justify-content:space-between;gap:14px;border-bottom:1px solid rgba(255,255,255,.07);padding-bottom:4px}
      #fauli-hud dt{opacity:.7}
      #fauli-hud dd{margin:0;color:#ffb703;font-weight:800;text-align:right}
      #fauli-hud footer{margin-top:13px;color:#00f0ff;font-size:9px;line-height:1.55}
      #fauli-hud footer span{color:#a7b6c7;letter-spacing:.03em}
      @media (max-width:640px){#fauli-hud{right:10px;bottom:10px;width:min(280px,calc(100vw - 20px));padding:12px}}
      @media (prefers-reduced-motion:reduce){#fauli-hud{scroll-behavior:auto}}
    `;
    document.head.appendChild(style);
  }

  function mount() {
    injectStyles();
    mountHud();

    if (prefersReducedMotion.matches) {
      document.documentElement.dataset.fauliReducedMotion = 'true';
    }

    render(STATES.NORMAL);
  }

  // Public API is intentionally visual-state-only.
  window.FAULI = Object.freeze({
    STATES,
    getState: () => state,
    getSnapshot: () => snapshot(),
    setState: transition,
    render
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();

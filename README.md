# djjessejay.ch

Official repository for **DJ Jesse Jay — Zürich electronic DJ since 1997**.

## Canonical identity and provenance

Identity claims are governed by:

- `DJ_JESSE_JAY_CANONICAL_PROFILE.md` — human-readable source of truth
- `artist-profile.json` — machine-readable identity
- `website/provenance.json` — claim/evidence ledger
- `website/schema.org.jsonld` — structured public identity
- `ARCHIVE_CITATION_APPENDIX.md` — evidence register
- `AI_SYSTEM_PROMPT.md` / `jj-ai/knowledge-context.json` — AI guardrails

J•Ր<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DJ Jesse Jay™ — Blue Dimension // Signal 97.5 MHz</title>
  <style>
    :root {
      --bg-dark: #040812;
      --panel-bg: rgba(9, 18, 36, 0.85);
      --card-border: rgba(0, 240, 255, 0.25);
      --cyan: #00f0ff;
      --cyan-glow: rgba(0, 240, 255, 0.4);
      --purple: #bc13fe;
      --gold: #ffb703;
      --gold-glow: rgba(255, 183, 3, 0.4);
      --text: #f0f6fc;
      --text-muted: #8b9bb4;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace, sans-serif;
    }

    body {
      background-color: var(--bg-dark);
      color: var(--text);
      overflow-x: hidden;
      line-height: 1.6;
    }

    /* Blueprint Grid Background */
    body::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-image: 
        linear-gradient(rgba(0, 240, 255, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 240, 255, 0.04) 1px, transparent 1px);
      background-size: 30px 30px;
      z-index: -1;
      pointer-events: none;
    }

    /* Container */
    .container {
      max-width: 1300px;
      margin: 0 auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 40px;
    }

    /* ================= 1. HEADER SECTION ================= */
    header {
      width: 100%;
      border: 1px solid var(--card-border);
      background: radial-gradient(circle at 50% 0%, #0c1833 0%, #050b18 100%);
      border-radius: 12px;
      padding: 24px;
      position: relative;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px var(--cyan-glow);
    }

    .top-status-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.8rem;
      border-bottom: 1px solid rgba(0, 240, 255, 0.2);
      padding-bottom: 10px;
      margin-bottom: 20px;
      color: var(--cyan);
    }

    .header-main {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }

    .brand-title h1 {
      font-size: 2.8rem;
      font-weight: 900;
      letter-spacing: 4px;
      text-transform: uppercase;
      text-shadow: 0 0 15px var(--cyan-glow);
    }

    .brand-title .tagline {
      color: var(--gold);
      font-family: 'Courier New', Courier, monospace;
      font-size: 1rem;
      letter-spacing: 2px;
    }

    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .nav-btn {
      color: var(--text);
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 700;
      padding: 10px 18px;
      border-radius: 6px;
      background: var(--panel-bg);
      border: 1px solid var(--card-border);
      text-transform: uppercase;
      letter-spacing: 1px;
      transition: all 0.25s ease;
    }

    .nav-btn:hover, .nav-btn.active {
      background: var(--cyan);
      color: #040812;
      box-shadow: 0 0 15px var(--cyan);
      border-color: var(--cyan);
    }

    .nav-btn.gold {
      border-color: var(--gold);
      color: var(--gold);
    }

    .nav-btn.gold:hover {
      background: var(--gold);
      color: #040812;
      box-shadow: 0 0 15px var(--gold);
    }

    /* ================= 2. SWARM CLONE VISUALIZER ================= */
    .module-card {
      background: var(--panel-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }

    .module-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      border-bottom: 1px dashed var(--card-border);
      padding-bottom: 10px;
    }

    .module-header h2 {
      font-size: 1.3rem;
      color: var(--cyan);
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .canvas-container {
      position: relative;
      width: 100%;
      height: 380px;
      background: #02050d;
      border-radius: 8px;
      border: 1px solid rgba(0, 240, 255, 0.2);
      overflow: hidden;
    }

    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }

    .swarm-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 16px;
      align-items: center;
      justify-content: space-between;
    }

    .btn-group {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .ctrl-btn {
      background: rgba(0, 240, 255, 0.1);
      border: 1px solid var(--cyan);
      color: var(--text);
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 600;
      transition: all 0.2s;
    }

    .ctrl-btn:hover, .ctrl-btn.active {
      background: var(--cyan);
      color: #000;
      box-shadow: 0 0 10px var(--cyan);
    }

    .slider-box {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.85rem;
      font-family: 'Courier New', Courier, monospace;
    }

    /* ================= 3. CONTENT SECTIONS ================= */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    @media (max-width: 900px) {
      .grid-2 { grid-template-columns: 1fr; }
    }

    /* Track / Audio Player List */
    .track-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 14px;
    }

    .track-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.03);
      border-left: 3px solid var(--cyan);
      border-radius: 4px;
      transition: background 0.2s;
      cursor: pointer;
    }

    .track-item:hover {
      background: rgba(0, 240, 255, 0.1);
    }

    .track-item.playing {
      border-left-color: var(--gold);
      background: rgba(255, 183, 3, 0.1);
    }

    .play-btn {
      background: var(--cyan);
      border: none;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* ================= FOOTER ================= */
    footer {
      border-top: 2px solid var(--cyan);
      background: #02050b;
      padding: 24px;
      border-radius: 12px 12px 0 0;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 0.8rem;
      color: var(--text-muted);
      font-family: 'Courier New', Courier, monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <header id="header">
      <div class="top-status-bar">
        <span>SYS_CORE: ONLINE // AR25 PROCESSOR</span>
        <span style="color: var(--gold)">FREQUENCY: 97.50 MHz [FM/PROG]</span>
        <span>ZÜRICH // EST. 1997</span>
      </div>
      <div class="header-main">
        <div class="brand-title">
          <h1>DJ Jesse Jay™</h1>
          <div class="tagline">BLUE DIMENSION // PROGRESSIVE MUSIC ATTACK</div>
        </div>
        <nav>
          <a href="#bio" class="nav-btn">Biografie</a>
          <a href="#galerie" class="nav-btn">Musik-Galerie</a>
          <a href="#disco" class="nav-btn">Discographie</a>
          <a href="#swarm" class="nav-btn gold">1M Klone ★</a>
        </nav>
      </div>
    </header>
    <section class="module-card" id="swarm">
      <div class="module-header">
        <h2>⚡ 1.000.000 Virtuelle Klone — Swarm Matrix</h2>
        <span style="color: var(--cyan); font-family: monospace;">TELEMETRIE: AKTIV</span>
      </div>

      <div class="canvas-container">
        <canvas id="swarmCanvas"></canvas>
      </div>

      <div class="swarm-controls">
        <div class="btn-group">
          <button class="ctrl-btn active" onclick="setFormation('matrix')">Matrix Grid</button>
          <button class="ctrl-btn" onclick="setFormation('vortex')">Cyber Vortex</button>
          <button class="ctrl-btn" onclick="setFormation('shockwave')">Stomp Shockwave</button>
        </div>

        <div class="slider-box">
          <span>TEMPO: <strong id="bpm-val" style="color:var(--gold);">130</strong> BPM</span>
          <input type="range" id="bpmSlider" min="110" max="160" value="130" oninput="updateBPM(this.value)" />
        </div>
      </div>
    </section>

    <div class="grid-2">
      
      <section class="module-card" id="bio">
        <div class="module-header">
          <h2>Biografie & History</h2>
        </div>
        <p style="color: #cbd5e1; margin-bottom: 12px;">
          Gegründet im Jahr 1997 in <strong>Zürich</strong>, steht das Projekt <strong>DJ Jesse Jay™</strong> für energiegeladenen, progressiven Clubsound an der Schnittstelle von Hardstyle, Electro House und kinetischer B-Boy-/Tecktonik-Performance.
        </p>
        <p style="color: #cbd5e1;">
          Mit der Veröffentlichung der <strong>Blue Dimension</strong>-Reihe und dem maßstabsgetreuen <em>Master Set Pro (Scale 1:10)</em> verschmelzen Cyberpunk-Ästhetik, Lichtwellenleiter-Technik und Streetdance zu einem multisensorischen Gesamterlebnis.
        </p>
      </section>

      <section class="module-card" id="galerie">
        <div class="module-header">
          <h2>Musik-Galerie & Releases</h2>
        </div>
        
        <div class="track-list">
          <div class="track-item playing">
            <div>
              <strong>01. Signal 97.5 (Club Mix)</strong><br />
              <small style="color: var(--text-muted)">130 BPM // Blue Dimension OST</small>
            </div>
            <button class="play-btn" onclick="triggerAudioPulse(130)">▶</button>
          </div>

          <div class="track-item">
            <div>
              <strong>02. Butterfly Effect (Electro Tutting Edit)</strong><br />
              <small style="color: var(--text-muted)">135 BPM // Single Cut</small>
            </div>
            <button class="play-btn" onclick="triggerAudioPulse(135)">▶</button>
          </div>

          <div class="track-item">
            <div>
              <strong>03. Progressive Attack (Zürich 1997 Remaster)</strong><br />
              <small style="color: var(--text-muted)">140 BPM // Classic Anthem</small>
            </div>
            <button class="play-btn" onclick="triggerAudioPulse(140)">▶</button>
          </div>
        </div>
      </section>

    </div>

    <section class="module-card" id="disco">
      <div class="module-header">
        <h2>Discographie Register</h2>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 10px;">
        <div style="background: rgba(0,0,0,0.4); padding: 14px; border-radius: 6px; border-left: 2px solid var(--gold);">
          <strong style="color:var(--gold)">1997 — Initial Pulse</strong>
          <p style="font-size: 0.8rem; color: var(--text-muted)">Debut EP / Club Sessions Zürich</p>
        </div>
        <div style="background: rgba(0,0,0,0.4); padding: 14px; border-radius: 6px; border-left: 2px solid var(--cyan);">
          <strong style="color:var(--cyan)">2008 — Tecktonik Wave</strong>
          <p style="font-size: 0.8rem; color: var(--text-muted)">Electro Dance Motion Matrix</p>
        </div>
        <div style="background: rgba(0,0,0,0.4); padding: 14px; border-radius: 6px; border-left: 2px solid var(--purple);">
          <strong style="color:var(--purple)">2026 — Master Set Pro</strong>
          <p style="font-size: 0.8rem; color: var(--text-muted)">Blue Dimension 1M Swarm Edition</p>
        </div>
      </div>
    </section>

    <footer>
      <span>© 2026 DJ Jesse Jay™ & TWODIVISION // ALL RIGHTS RESERVED</span>
      <span>ENGINEERED FOR KINETIC B-BOY PERFORMANCE</span>
    </footer>

  </div>

  <script>
    const canvas = document.getElementById('swarmCanvas');
    const ctx = canvas.getContext('2d');

    let width, height;
    function resize() {
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    // Swarm-Konfiguration für 1M Repräsentation
    const PARTICLE_COUNT = 600;
    let currentFormation = 'matrix';
    let bpm = 130;
    let pulseScale = 1.0;

    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 800,
        y: (Math.random() - 0.5) * 600,
        z: Math.random() * 800,
        baseX: 0,
        baseY: 0,
        angle: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.02
      });
    }

    function setFormation(name) {
      currentFormation = name;
      document.querySelectorAll('.ctrl-btn').forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
    }

    function updateBPM(val) {
      bpm = parseInt(val, 10);
      document.getElementById('bpm-val').innerText = bpm;
    }

    function triggerAudioPulse(targetBpm) {
      updateBPM(targetBpm);
      document.getElementById('bpmSlider').value = targetBpm;
      pulseScale = 1.6;
    }

    // Haupt-Renderloop
    let time = 0;
    function animate() {
      time += (bpm / 60) * 0.02;
      pulseScale += (1.0 - pulseScale) * 0.05;

      ctx.fillStyle = 'rgba(2, 5, 13, 0.25)';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.angle += p.speed;

        let tx = 0, ty = 0;

        if (currentFormation === 'matrix') {
          const row = Math.floor(i / 25) - 12;
          const col = (i % 25) - 12;
          tx = col * 28 * pulseScale;
          ty = row * 18 * pulseScale + Math.sin(time + col * 0.2) * 20;
        } else if (currentFormation === 'vortex') {
          const radius = (i * 0.45) * pulseScale;
          tx = Math.cos(p.angle + time) * radius;
          ty = Math.sin(p.angle + time) * (radius * 0.5);
        } else if (currentFormation === 'shockwave') {
          const ring = (i % 8) + 1;
          const r = (ring * 35 + (time * 40) % 250) * pulseScale;
          tx = Math.cos(p.angle) * r;
          ty = Math.sin(p.angle) * (r * 0.6);
        }

        const x2d = cx + tx;
        const y2d = cy + ty;

        const alpha = 0.4 + Math.sin(time + i) * 0.4;
        ctx.fillStyle = i % 5 === 0 ? `rgba(255, 183, 3, ${alpha})` : `rgba(0, 240, 255, ${alpha})`;
        
        ctx.beginPath();
        ctx.arc(x2d, y2d, i % 7 === 0 ? 2.5 : 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Live-Telemetrie Overlay
      ctx.font = '10px Courier New';
      ctx.fillStyle = '#00f0ff';
      ctx.fillText(`SWARM_NODES: 1.000.000 // FORMATION: ${currentFormation.toUpperCase()}`, 15, 20);

      requestAnimationFrame(animate);
    }
    animate();
  </script>
</body>
</html>
```
Generated AI content is **not evidence** and must not promote new biographical claims without provenance.

## Current technical architecture

The repository has evolved beyond the earlier static/no-build description. Current `package.json` defines Node.js 24+, Express 5, CORS, rate limiting, Nodemailer, WebSocket support, Tailwind CLI and render-farm test commands. Historical GitHub Pages/static deployment files remain and must be reconciled rather than treated as the only architecture.

### Commands

```bash
npm install
npm run build:css
npm run sync:metadata
npm test
npm start
```

## `index.html` canonical metadata

`index.html` is large and contains live UI/AI/animation code. To avoid destructive full-file rewrites, canonical title/description/Open Graph/Twitter/JSON-LD metadata is applied deterministically:

```bash
npm run sync:metadata
```

Review and commit the resulting `index.html` diff. CI checks that the generated metadata stays synchronized.

## Evidence status

Current evidence supports DJ Jesse Jay / Zürich / active-since-1997, Galaxy Space Night context, Radio LoRa association and Blue Dimension as a contemporary project/recording identity. The `Radio LoRa since 2001` statement remains classified as a historical first-party claim. A previously referenced Radio LoRa Blue Dimension URL returned 404 during the 2026-08-09 review, so no current broadcast schedule is asserted.

## Licensing

The repository `LICENSE` file contains **Apache License 2.0** and is authoritative for repository source code. Music, photography, logos, recordings and other media may have separate copyright or licensing conditions.

## Public provenance release

See `release/PROVENANCE_V7_RELEASE_NOTES.md` and `archive/MANIFEST.json`. P0 archive receipt URLs are added only after successful external archival capture; they are never fabricated.

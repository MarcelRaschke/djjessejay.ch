// DjJesseJay Binary Neon — Vanilla-Laufzeit für alle Formate.
// Kein eval, keine Inline-Styles im Markup (nur CSSOM), keine Netzwerkzugriffe.
// Query-Parameter: ?raw (1:1-Pixel, ohne Skalierung, für Screenshots) · ?bpm=124|132
(() => {
  "use strict";

  const params = new URLSearchParams(location.search);
  if (params.has("raw")) document.documentElement.classList.add("raw");

  const stage = document.querySelector(".stage");
  if (!stage) return;

  // --- Bühne an das Fenster anpassen ---------------------------------------
  const fit = () => {
    if (document.documentElement.classList.contains("raw")) return;
    const s = Math.min(innerWidth / stage.offsetWidth, innerHeight / stage.offsetHeight);
    stage.style.setProperty("--scale", String(s));
  };
  addEventListener("resize", fit, { passive: true });
  fit();

  // --- Bit-Raster aus dem Wort erzeugen ------------------------------------
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const bytes = [];
  for (const host of document.querySelectorAll("[data-word]")) {
    const word = host.dataset.word;
    [...word].forEach((ch, i) => {
      const code = ch.charCodeAt(0);
      const byte = el("div", "byte" + (ch >= "A" && ch <= "Z" ? " is-upper" : ""));
      byte.setAttribute("aria-hidden", "true");
      byte.append(el("span", "byte__idx", String(i).padStart(2, "0")));
      const cells = el("div", "byte__cells");
      for (const b of code.toString(2).padStart(8, "0")) cells.append(el("div", b === "1" ? "cell on" : "cell", b));
      byte.append(cells);
      byte.append(el("span", "byte__hex", "0x" + code.toString(16).toUpperCase()));
      byte.append(el("span", "byte__ch", ch));
      host.append(byte);
      bytes.push(byte);
    });
  }

  // --- Loop im BPM-Takt -----------------------------------------------------
  if (!stage.hasAttribute("data-loop")) return;

  const STEPS = bytes.length || 10;
  const status = stage.querySelector("[data-status]");
  const beats = [...stage.querySelectorAll(".beat")];
  const bpmButtons = [...stage.querySelectorAll("[data-bpm]")];
  const toggle = stage.querySelector("[data-toggle]");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let bpm = [124, 132].includes(Number(params.get("bpm"))) ? Number(params.get("bpm")) : 124;
  let period = 60000 / bpm;
  let t0 = performance.now();
  let pausedAt = reduced ? t0 : null;
  let lastStep = -1;
  let raf = 0;

  const render = (beatPos) => {
    const step = Math.floor(beatPos);
    const phase = beatPos - step;
    const beat = step % 4;
    stage.classList.toggle("kick", beat === 0 && phase < 0.35);
    if (step === lastStep) return;
    lastStep = step;
    const head = step % STEPS;
    bytes.forEach((b, i) => { b.dataset.d = String((head - i + STEPS) % STEPS); });
    beats.forEach((b, k) => b.classList.toggle("on", k === beat));
    if (status) status.textContent = `${bpm} BPM · STEP ${String(head + 1).padStart(2, "0")}/${STEPS} · BEAT ${beat + 1}/4`;
  };

  const tick = (now) => {
    render((now - t0) / period);
    raf = requestAnimationFrame(tick);
  };

  const setBpm = (next) => {
    const now = performance.now();
    const pos = ((pausedAt ?? now) - t0) / period;   // Taktposition beibehalten
    bpm = next; period = 60000 / bpm;
    t0 = (pausedAt ?? now) - pos * period;
    lastStep = -1;
    bpmButtons.forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.bpm) === bpm)));
    render(((pausedAt ?? now) - t0) / period);
  };

  const play = () => {
    if (pausedAt == null) return;
    t0 += performance.now() - pausedAt;
    pausedAt = null;
    stage.classList.add("is-looping");
    toggle.textContent = "PAUSE";
    raf = requestAnimationFrame(tick);
  };

  const pause = () => {
    if (pausedAt != null) return;
    pausedAt = performance.now();
    cancelAnimationFrame(raf);
    stage.classList.remove("is-looping", "kick");
    toggle.textContent = "PLAY";
  };

  bpmButtons.forEach((b) => b.addEventListener("click", () => setBpm(Number(b.dataset.bpm))));
  toggle.addEventListener("click", () => (pausedAt == null ? pause() : play()));
  document.addEventListener("visibilitychange", () => { if (document.hidden) cancelAnimationFrame(raf); else if (pausedAt == null) raf = requestAnimationFrame(tick); });

  setBpm(bpm);
  if (reduced) { toggle.textContent = "PLAY"; render(0); }
  else { pausedAt = performance.now(); play(); }
})();

/* ============================================================
   HOTZE FM — prozedurale Musik-Engine (WebAudio)
   Drei Radiostationen, alles live generiert, keine Samples:
     1. OST-TECHNO      (139 BPM, Sägezahn-Bass, Treiber-Kick)
     2. WILD-LIFE-HOUSE (124 BPM, Offbeat-Hats, warme Akkorde)
     3. HOTZE-FUNK     (100 BPM, Slap-Bass, Gitarren-Stabs)
   emitBeat() feuert pro Achtel ein Event für Visuals (Stadt, Disco).
   ============================================================ */

let actx = null;
let master = null;
let compressor = null;
let analyser = null;

export function audio() {
  try {
    if (!actx) {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain();
      master.gain.value = 0.7;
      compressor = actx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.ratio.value = 4;
      analyser = actx.createAnalyser();
      analyser.fftSize = 256;
      master.connect(compressor).connect(analyser).connect(actx.destination);
    }
    if (actx.state === 'suspended') actx.resume();
    return actx;
  } catch { return null; }
}

/* ---------- Instrumente ---------- */

function env(g, t, a, d, peak) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

export function kick(t, vol = 0.9) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
  env(g, t, 0.002, 0.25, vol);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + 0.3);
}

export function snare(t, vol = 0.35) {
  const a = audio(); if (!a) return;
  const len = 0.18, buf = a.createBuffer(1, a.sampleRate * len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource(); s.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1800;
  const g = a.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(master);
  s.start(t);
}

export function hat(t, open = false, vol = 0.18) {
  const a = audio(); if (!a) return;
  const len = open ? 0.3 : 0.06, buf = a.createBuffer(1, a.sampleRate * len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, open ? 1.5 : 3);
  const s = a.createBufferSource(); s.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
  const g = a.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(master);
  s.start(t);
}

export function bassNote(t, freq, dur, type = 'sawtooth', vol = 0.25, filterHz = 400) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
  o.type = type; o.frequency.value = freq;
  f.type = 'lowpass';
  f.frequency.setValueAtTime(filterHz * 2, t);
  f.frequency.exponentialRampToValueAtTime(filterHz, t + dur);
  env(g, t, 0.01, dur, vol);
  o.connect(f).connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.1);
}

export function stab(t, freqs, dur, type = 'sawtooth', vol = 0.1) {
  const a = audio(); if (!a) return;
  const g = a.createGain();
  env(g, t, 0.005, dur, vol);
  for (const f of freqs) {
    const o = a.createOscillator();
    o.type = type; o.frequency.value = f;
    o.detune.value = (Math.random() - 0.5) * 12;
    o.connect(g);
    o.start(t); o.stop(t + dur + 0.1);
  }
  g.connect(master);
}

export function lead(t, freq, dur, vol = 0.12) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'square'; o.frequency.value = freq;
  const vibrato = a.createOscillator(), vg = a.createGain();
  vibrato.frequency.value = 6; vg.gain.value = 5;
  vibrato.connect(vg).connect(o.frequency);
  env(g, t, 0.02, dur, vol);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.1);
  vibrato.start(t); vibrato.stop(t + dur + 0.1);
}

/* ---------- Notenhelfer ---------- */
const N = {};
['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].forEach((n, i) => {
  for (let o = 1; o <= 6; o++) N[n + o] = 440 * Math.pow(2, (i - 9) / 12 + (o - 4));
});
export const note = n => N[n] || 220;

/* ---------- Stations-Definitionen ---------- */
export const STATIONS = [
  {
    id: 'ost-techno',
    name: 'OST-TECHNO 106,7',
    desc: 'Aufschwung Ost — harte Treiber für die Platte!',
    bpm: 139,
    root: 'A',
    step(t, bar, eight) {
      if (eight % 2 === 0) kick(t, eight === 0 ? 1 : 0.8);
      hat(t, eight % 2 === 1, 0.14);
      if (eight === 4) snare(t, 0.3);
      const roots = { A: 'A1', E: 'E1', F: 'F1', G: 'G1' };
      const prog = ['A', 'A', 'F', 'G'][bar % 4];
      if (eight % 2 === 0) bassNote(t, note(roots[prog] + ''), 0.22, 'sawtooth', 0.3, 500);
      const chordTable = {
        A: ['A3', 'C4', 'E4'],
        F: ['F3', 'A3', 'C4'],
        G: ['G3', 'B3', 'D4'],
        E: ['E3', 'G3', 'B3'],
      };
      if (eight === 0 || eight === 3 || eight === 6) {
        stab(t, chordTable[prog].map(note), 0.15, 'sawtooth', 0.07);
      }
      if (bar % 4 === 3 && eight > 4) {
        const leadSeq = ['A4', 'C5', 'E5', 'G5'];
        lead(t, note(leadSeq[(eight - 5) % 4]), 0.12, 0.1);
      }
    },
  },
  {
    id: 'wildlife-house',
    name: 'WILD-LIFE-HOUSE 98,2',
    desc: 'Wolkenkratzer-Gefühl, warme Akkorde, Sonne auf!',
    bpm: 124,
    root: 'F',
    step(t, bar, eight) {
      if (eight === 0 || eight === 4) kick(t, 0.85);
      hat(t, eight % 2 === 1, false, 0.2);
      if (eight === 2 || eight === 6) hat(t, true, 0.15);
      if (eight === 4) snare(t, 0.22);
      const prog = ['F', 'F', 'Am', 'G'][bar % 4];
      const bassRoots = { F: 'F2', Am: 'A2', G: 'G2' };
      if (eight % 2 === 0) bassNote(t, note(bassRoots[prog]), 0.25, 'triangle', 0.32, 300);
      const chords = {
        F: ['F3', 'A3', 'C4', 'E4'],
        Am: ['A3', 'C4', 'E4', 'G4'],
        G: ['G3', 'B3', 'D4', 'F4'],
      };
      if (eight % 2 === 0) stab(t, chords[prog].map(note), 0.3, 'triangle', 0.06);
      if (bar % 2 === 1 && (eight === 2 || eight === 5 || eight === 7)) {
        const seq = { 2: 'A4', 5: 'G4', 7: 'E4' };
        lead(t, note(seq[eight]), 0.2, 0.08);
      }
    },
  },
  {
    id: 'hotze-funk',
    name: 'HOTZE-FUNK 89,9',
    desc: 'Der Hotze persönlich groovt durch die Nacht!',
    bpm: 100,
    root: 'E',
    step(t, bar, eight) {
      if (eight === 0 || eight === 3 || eight === 6) kick(t, 0.75);
      if (eight === 2 || eight === 6) snare(t, 0.28);
      hat(t, false, 0.1);
      if (eight === 7) hat(t, true, 0.2);
      const prog = ['E7', 'E7', 'A7', 'B7'][bar % 4];
      const bassLines = {
        E7: ['E2', 'G2', 'A2', 'B2'],
        A7: ['A2', 'C3', 'D3', 'E3'],
        B7: ['B2', 'D3', 'E3', 'F3'],
      };
      const bl = bassLines[prog];
      if (eight % 2 === 0) bassNote(t, note(bl[(eight / 2) % 4]), 0.18, 'square', 0.22, 700);
      const stabChords = {
        E7: ['E3', 'G#3', 'B3', 'D4'],
        A7: ['A3', 'C#4', 'E4', 'G4'],
        B7: ['B3', 'D#4', 'F#4', 'A4'],
      };
      if (eight === 1 || eight === 4 || eight === 7) {
        stab(t, stabChords[prog].map(note), 0.12, 'sawtooth', 0.05);
      }
    },
  },
];

/* ---------- Radio / Sequencer ---------- */
const listeners = [];
let current = -1;
let nextTime = 0;
let bar = 0, eight = 0;
let running = false;

export function onBeat(fn) { listeners.push(fn); }
export function currentStation() { return current >= 0 ? STATIONS[current] : null; }
export function isPlaying() { return running; }

export function setStation(idx) {
  audio();
  current = idx;
  bar = 0; eight = 0;
  if (actx) nextTime = actx.currentTime + 0.05;
  running = idx >= 0;
}

export function stop() {
  running = false;
  current = -1;
}

export function getLevel() {
  if (!analyser) return 0;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  let sum = 0;
  for (let i = 0; i < 40; i++) sum += data[i];
  return sum / (40 * 255);
}

/* Der Sequencer plant Lookahead-weise, GTA-mäßig treibend. */
export function pump() {
  if (!running || !actx) return;
  const st = STATIONS[current];
  const stepDur = 60 / st.bpm / 2; // Achtel
  while (nextTime < actx.currentTime + 0.15) {
    st.step(nextTime, bar, eight);
    const beatInfo = { when: nextTime, bar, eight, isQuarter: eight % 2 === 0, level: 0 };
    const delay = Math.max(0, (nextTime - actx.currentTime) * 1000);
    setTimeout(() => {
      for (const fn of listeners) fn(beatInfo);
    }, delay);
    eight++;
    if (eight >= 8) { eight = 0; bar++; }
    nextTime += stepDur;
  }
}

/* ---------- Custom-Track (Studio) als 4. Station ---------- */
let customTrack = null;

export function registerCustomTrack(track) {
  customTrack = {
    id: 'studio-track',
    name: (track.name || 'MEIN TRACK').toUpperCase().slice(0, 24) + ' (HOTZE STUDIO)',
    desc: 'Dein eigener Sound — produziert im Hotze Musikstudio!',
    bpm: track.bpm,
    root: 'A',
    step(t, bar, eight) {
      const g = track.genres[track.genre];
      const q = track;
      if (q.kick[eight]) kick(t, 0.9);
      if (q.snare[eight]) snare(t, 0.32);
      if (q.hat[eight]) hat(t, q.hatOpen[eight], 0.16);
      if (q.bass[eight]) bassNote(t, note(g.bassSeq[eight % g.bassSeq.length]), 0.2, g.bassType, 0.28, g.bassFilter);
      if (q.stab[eight]) stab(t, g.chords[bar % g.chords.length].map(note), 0.14, 'sawtooth', 0.06);
      if (q.lead[eight]) lead(t, note(g.leadSeq[eight % g.leadSeq.length]), 0.14, 0.1);
    },
  };
  STATIONS[3] = customTrack;
}

export function customStationIndex() { return 3; }

/* Ein kurzer Stations-Jingle beim Umschalten (Rauschen + Sweep). */
export function jingle() {
  const a = audio(); if (!a) return;
  const t = a.currentTime;
  stab(t, [note('A4'), note('E5')], 0.15, 'square', 0.1);
  stab(t + 0.16, [note('D5'), note('A5')], 0.2, 'square', 0.1);
}

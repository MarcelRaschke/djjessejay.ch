/* ============================================================
   HOTZE'S MUSIKSTUDIO — Step-Sequencer & Genre-Router
   16 Steps, 6 Spuren (Kick, Snare, Hat, Bass, Stab, Lead),
   3 Genre-Presets. Produzierte Tracks werden als 4. Radiostation
   registriert und können im Auto gefahren werden.
   ============================================================ */
import { audio, kick, snare, hat, bassNote, stab, lead, note, registerCustomTrack, jingle } from './music.js';

const GENRES = {
  techno: {
    bpm: 139,
    bassSeq: ['A1', 'A1', 'E1', 'A1', 'F1', 'F1', 'C2', 'F1', 'G1', 'G1', 'D2', 'G1', 'A1', 'A1', 'E1', 'A1'],
    chords: [['A3', 'C4', 'E4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['G3', 'B3', 'D4']],
    leadSeq: ['A4', 'A4', 'C5', 'C5', 'E5', 'E5', 'G5', 'G5', 'A4', 'A4', 'C5', 'C5', 'D5', 'D5', 'E5', 'E5'],
    bassType: 'sawtooth', bassFilter: 500,
    defaults: { kick: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], snare: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], hat: [0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1], bass: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], stab: [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0], lead: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  },
  house: {
    bpm: 124,
    bassSeq: ['F2', 'F2', 'F2', 'F2', 'A2', 'A2', 'A2', 'A2', 'C3', 'C3', 'C3', 'C3', 'G2', 'G2', 'G2', 'G2'],
    chords: [['F3', 'A3', 'C4', 'E4'], ['F3', 'A3', 'C4', 'E4'], ['A3', 'C4', 'E4', 'G4'], ['G3', 'B3', 'D4', 'F4']],
    leadSeq: ['A4', 'C5', 'E5', 'C5', 'G4', 'B4', 'D5', 'B4', 'F4', 'A4', 'C5', 'A4', 'E4', 'G4', 'B4', 'G4'],
    bassType: 'triangle', bassFilter: 300,
    defaults: { kick: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], snare: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], hat: [0,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1], bass: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1], stab: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], lead: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  },
  funk: {
    bpm: 100,
    bassSeq: ['E2', 'E2', 'G2', 'A2', 'E2', 'E2', 'B2', 'D3', 'A2', 'A2', 'C3', 'D3', 'B2', 'B2', 'D3', 'E3'],
    chords: [['E3', 'G#3', 'B3', 'D4'], ['E3', 'G#3', 'B3', 'D4'], ['A3', 'C#4', 'E4', 'G4'], ['B3', 'D#4', 'F#4', 'A4']],
    leadSeq: ['E4', 'G4', 'B4', 'E5', 'D5', 'B4', 'G4', 'E4', 'A4', 'C5', 'E5', 'A5', 'G5', 'E5', 'C5', 'A4'],
    bassType: 'square', bassFilter: 700,
    defaults: { kick: [1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0], snare: [0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,0], hat: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,1], bass: [1,0,1,1,0,0,1,0,1,0,1,1,0,0,1,0], stab: [0,1,0,0,0,0,0,1,0,1,0,0,0,0,0,1], lead: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  },
};

const TRACKS = ['kick', 'snare', 'hat', 'bass', 'stab', 'lead'];
const LABELS = { kick: 'KICK', snare: 'SNARE', hat: 'HI-HAT', bass: 'BASS', stab: 'STAB', lead: 'LEAD' };

const track = {
  name: 'PLATTENBAU GROOVE',
  genre: 'techno',
  kick: Array(16).fill(0), snare: Array(16).fill(0), hat: Array(16).fill(0),
  bass: Array(16).fill(0), stab: Array(16).fill(0), lead: Array(16).fill(0),
};

function loadDefaults(g) {
  const d = GENRES[g].defaults;
  for (const t of TRACKS) track[t] = d[t].slice();
}

let onProduce = null;
export function setProduceCallback(fn) { onProduce = fn; }

/* ---------- UI ---------- */
export function initStudio() {
  const seq = document.getElementById('seq');
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = '64px repeat(16, 1fr)';
  grid.style.gap = '4px';
  seq.appendChild(grid);

  grid.appendChild(document.createElement('div'));
  for (let s = 0; s < 16; s++) {
    const h = document.createElement('div');
    h.textContent = s + 1;
    h.style.fontSize = '.62rem';
    h.style.color = s % 4 === 0 ? '#ffd700' : '#777';
    h.style.textAlign = 'center';
    grid.appendChild(h);
  }

  for (const t of TRACKS) {
    const lab = document.createElement('div');
    lab.className = 'rowlabel';
    lab.textContent = LABELS[t];
    grid.appendChild(lab);
    for (let s = 0; s < 16; s++) {
      const c = document.createElement('div');
      c.className = 'cell' + (s % 4 === 0 ? ' beat' : '');
      c.dataset.track = t;
      c.dataset.step = s;
      c.addEventListener('pointerdown', e => {
        e.preventDefault();
        track[t][s] = track[t][s] ? 0 : 1;
        c.classList.toggle('on', !!track[t][s]);
        audio();
      });
      grid.appendChild(c);
    }
  }

  document.querySelectorAll('#genre-router .gbtn').forEach(b => {
    b.addEventListener('pointerdown', e => {
      e.preventDefault();
      document.querySelectorAll('#genre-router .gbtn').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel');
      track.genre = b.dataset.g;
      loadDefaults(track.genre);
      refreshGrid();
    });
  });

  document.getElementById('btnPreview').addEventListener('pointerdown', e => {
    e.preventDefault();
    preview();
  });
  document.getElementById('btnProduce').addEventListener('pointerdown', e => {
    e.preventDefault();
    produce();
  });
  document.getElementById('btnCloseStudio').addEventListener('pointerdown', e => {
    e.preventDefault();
    closeStudio();
  });
  document.getElementById('trackname').addEventListener('input', e => {
    track.name = e.target.value;
  });

  loadDefaults('techno');
  refreshGrid();
}

export function refreshGrid() {
  document.querySelectorAll('#seq .cell').forEach(c => {
    c.classList.toggle('on', !!track[c.dataset.track][+c.dataset.step]);
  });
}

export function openStudio() {
  document.getElementById('studio').classList.add('open');
  document.getElementById('trackname').value = track.name;
  refreshGrid();
}
export function closeStudio() {
  document.getElementById('studio').classList.remove('open');
}

/* ---------- Vorschau: 2 Takte live abspielen ---------- */
let previewing = false;
export function preview() {
  const a = audio(); if (!a || previewing) return;
  previewing = true;
  const g = GENRES[track.genre];
  const stepDur = 60 / g.bpm / 4; // 16tel bei 16 Steps pro Takt = Achtelraster? Nein: 16 Steps = 1 Takt → 16tel
  let t = a.currentTime + 0.05;
  for (let s = 0; s < 32; s++) {
    const st = s % 16;
    const bar = (s / 16) | 0;
    if (track.kick[st]) kick(t, 0.9);
    if (track.snare[st]) snare(t, 0.32);
    if (track.hat[st]) hat(t, st % 2 === 1, 0.16);
    if (track.bass[st]) bassNote(t, note(g.bassSeq[st]), 0.2, g.bassType, 0.28, g.bassFilter);
    if (track.stab[st]) stab(t, g.chords[bar % g.chords.length].map(note), 0.14, 'sawtooth', 0.06);
    if (track.lead[st]) lead(t, note(g.leadSeq[st]), 0.14, 0.1);
    t += stepDur;
  }
  setTimeout(() => { previewing = false; }, (stepDur * 32 + 0.3) * 1000);
}

/* ---------- Produzieren: Track als Radiostation registrieren ---------- */
export function produce() {
  const name = (track.name || 'MEIN TRACK').trim();
  if (!name) {
    document.getElementById('studio-note').textContent = 'Gib deinem Track zuerst einen Namen!';
    return;
  }
  registerCustomTrack({
    name,
    bpm: GENRES[track.genre].bpm,
    genre: track.genre,
    genres: GENRES,
    kick: track.kick.slice(),
    snare: track.snare.slice(),
    hat: track.hat.slice(),
    hatOpen: track.hat.map((v, i) => (v && i % 2 === 1) ? 1 : 0),
    bass: track.bass.slice(),
    stab: track.stab.slice(),
    lead: track.lead.slice(),
  });
  jingle();
  document.getElementById('studio-note').textContent =
    `✅ „${name.toUpperCase()}" produziert! Im Auto mit R zur 4. Station schalten!`;
  if (onProduce) onProduce(name);
}

import * as THREE from 'three';
import { onBeat, currentStation, setStation, stop, getLevel, STATIONS, audio, jingle, pump } from './music.js';
import { initStudio, openStudio, closeStudio, setProduceCallback } from './studio.js';
import { bindGame, mintNFT, listNFTs, sellNFT, nftTick, startProject, projectsTick, getProjects, tasksTick, taskProgress, getTask, newTask, agent, agentTick, toggleAgent, installAPI, PROJECT_TYPES, sellPackage, providerInfo, updateProviderHUD } from './ai.js';
const PROJECTS_UI = { PROJECT_TYPES };

/* ============================================================
   HOTZE CITY — friedliche 3D Open World im GTA-Look
   Kein Blut, keine Waffen: Auto fahren, Pakete liefern,
   Bullen schubsen dich nur weg.
   ============================================================ */

/* ---------- Renderer / Szene ---------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5e0);
scene.fog = new THREE.Fog(0x87b5e0, 60, 220);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game').appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x556b3a, 0.9));
const sun = new THREE.DirectionalLight(0xfff2cc, 1.6);
sun.position.set(60, 90, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
sun.shadow.camera.top = 90;   sun.shadow.camera.bottom = -90;
scene.add(sun);

/* ---------- Welt-Konstanten ---------- */
const BLOCK = 60;          // Kantenlänge eines Häuserblocks
const ROAD_W = 14;          // Straßenbreite
const GRID = 7;            // 7x7 Blöcke
const CITY = BLOCK * GRID; // Gesamtausdehnung

/* ---------- Boden & Straßen ---------- */
const groundTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#3a7d3a'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#357235';
  for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(80, 80);
  return t;
})();
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(CITY + 200, CITY + 200),
  new THREE.MeshLambertMaterial({ map: groundTex })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const roadMat = new THREE.MeshLambertMaterial({ color: 0x3c3c44 });
const lineMat = new THREE.MeshBasicMaterial({ color: 0xd8d840 });
for (let i = 0; i <= GRID; i++) {
  const p = -CITY / 2 + i * BLOCK;
  const h = new THREE.Mesh(new THREE.PlaneGeometry(CITY + ROAD_W, ROAD_W), roadMat);
  h.rotation.x = -Math.PI / 2; h.position.set(0, 0.02, p);
  h.receiveShadow = true; scene.add(h);
  const v = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, CITY + ROAD_W), roadMat);
  v.rotation.x = -Math.PI / 2; v.position.set(p, 0.021, 0);
  v.receiveShadow = true; scene.add(v);
  for (let d = -CITY / 2 + 3; d < CITY / 2; d += 6) {
    const l1 = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.3), lineMat);
    l1.rotation.x = -Math.PI / 2; l1.position.set(d, 0.03, p); scene.add(l1);
    const l2 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1.6), lineMat);
    l2.rotation.x = -Math.PI / 2; l2.position.set(p, 0.03, d); scene.add(l2);
  }
}

/* ---------- Häuser ---------- */
const buildings = [];
const housePalette = [0x8a7a6a, 0x9a6a5a, 0x6a7a8a, 0x7a8a6a, 0x8a6a8a, 0xa89a7a];
const windowMat = new THREE.MeshLambertMaterial({ color: 0x2b3a55 });
function makeBuilding(x, z, w, d, h) {
  const col = housePalette[(Math.random() * housePalette.length) | 0];
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color: col })
  );
  m.position.set(x, h / 2, z);
  m.castShadow = true; m.receiveShadow = true;
  scene.add(m);
  const rows = Math.floor(h / 4);
  for (let r = 0; r < rows; r++) {
    for (let s = -1; s <= 1; s += 2) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w, d) * 0.5, 1.2),
        Math.random() < 0.35
          ? new THREE.MeshBasicMaterial({ color: 0xffe9a0 })
          : windowMat);
      win.position.set(x, 2.2 + r * 4, z + s * (d / 2 + 0.02));
      if (Math.abs(s * (d / 2 + 0.02)) > Math.abs(d / 2)) {
        win.rotation.y = s > 0 ? 0 : Math.PI;
        scene.add(win);
      }
      const win2 = win.clone();
      win2.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2;
      win2.position.set(x + s * (w / 2 + 0.02), 2.2 + r * 4, z);
      scene.add(win2);
    }
  }
  buildings.push({ x, z, w, d, h });
}
for (let gx = 0; gx < GRID; gx++) {
  for (let gz = 0; gz < GRID; gz++) {
    if (gx === (GRID >> 1) && gz === (GRID >> 1)) continue; // Startblock frei
    const cx = -CITY / 2 + gx * BLOCK + BLOCK / 2;
    const cz = -CITY / 2 + gz * BLOCK + BLOCK / 2;
    const n = 2 + ((Math.random() * 2) | 0);
    for (let b = 0; b < n; b++) {
      const w = 12 + Math.random() * 14;
      const d = 12 + Math.random() * 14;
      const h = 8 + Math.random() * 30;
      const ox = (Math.random() - 0.5) * (BLOCK - ROAD_W - w - 6);
      const oz = (Math.random() - 0.5) * (BLOCK - ROAD_W - d - 6);
      makeBuilding(cx + ox, cz + oz, w, d, h);
    }
  }
}

/* ---------- Straßenlaternen & Bäume ---------- */
function makeLamp(x, z) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 8),
    new THREE.MeshLambertMaterial({ color: 0x333333 }));
  pole.position.y = 3; g.add(pole);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
  bulb.position.y = 6; g.add(bulb);
  g.position.set(x, 0, z);
  scene.add(g);
}
function makeTree(x, z) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 3, 8),
    new THREE.MeshLambertMaterial({ color: 0x6b4a2a }));
  trunk.position.y = 1.5; trunk.castShadow = true; g.add(trunk);
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8, 1),
    new THREE.MeshLambertMaterial({ color: 0x2e7d32 }));
  crown.position.y = 4; crown.castShadow = true; g.add(crown);
  g.position.set(x, 0, z);
  scene.add(g);
}
for (let i = 0; i <= GRID; i++) {
  for (let j = 0; j <= GRID; j++) {
    const x = -CITY / 2 + i * BLOCK + ROAD_W / 2 + 1;
    const z = -CITY / 2 + j * BLOCK + ROAD_W / 2 + 1;
    if (Math.random() < 0.7) makeLamp(x, z);
  }
}
for (let i = 0; i < 60; i++) {
  const gx = (Math.random() * GRID) | 0, gz = (Math.random() * GRID) | 0;
  const x = -CITY / 2 + gx * BLOCK + 10 + Math.random() * (BLOCK - 34);
  const z = -CITY / 2 + gz * BLOCK + 10 + Math.random() * (BLOCK - 34);
  makeTree(x, z);
}

/* ---------- Spieler (zu Fuß) ---------- */
function makeCharacter(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a06a });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.45), mat);
  torso.position.y = 1.15; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skin);
  head.position.y = 1.95; head.castShadow = true; g.add(head);
  const legs = [];
  for (const s of [-0.22, 0.22]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.75, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x2a3a6a }));
    leg.position.set(s, 0.38, 0); leg.castShadow = true; g.add(leg); legs.push(leg);
  }
  const arms = [];
  for (const s of [-0.55, 0.55]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.25), mat);
    arm.position.set(s, 1.2, 0); arm.castShadow = true; g.add(arm); arms.push(arm);
  }
  return { g, legs, arms };
}
const player = makeCharacter(0xff5533);
player.g.position.set(0, 0, 6);
scene.add(player.g);

/* ---------- Autos ---------- */
const CAR_COLORS = [0xdd3333, 0x3355dd, 0x33bb55, 0xddaa22, 0xaa44cc, 0x2299aa, 0xdd7700];
function makeCar(color, isPolice) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 4.2), bodyMat);
  body.position.y = 0.7; body.castShadow = true; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, 2.0),
    new THREE.MeshLambertMaterial({ color: 0x223344 }));
  cabin.position.set(0, 1.35, -0.2); cabin.castShadow = true; g.add(cabin);
  for (const [x, z] of [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12),
      new THREE.MeshLambertMaterial({ color: 0x111111 }));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x * 1.05, 0.42, z);
    g.add(wheel);
  }
  if (isPolice) {
    const lightbar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.35),
      new THREE.MeshBasicMaterial({ color: 0xff3355 }));
    lightbar.position.set(0, 1.72, -0.2); g.add(lightbar);
    g.userData.lightbar = lightbar;
  }
  scene.add(g);
  return g;
}

/* Verkehr: KI-Autos fahren auf Straßenringen */
const traffic = [];
for (let i = 0; i < 14; i++) {
  const car = makeCar(CAR_COLORS[(Math.random() * CAR_COLORS.length) | 0], false);
  const lane = (Math.random() * GRID) | 0;
  const axis = Math.random() < 0.5 ? 'x' : 'z';
  const dir = Math.random() < 0.5 ? 1 : -1;
  const fixed = -CITY / 2 + lane * BLOCK + (dir > 0 ? -ROAD_W / 4 : ROAD_W / 4);
  const pos = (Math.random() - 0.5) * CITY;
  const t = { car, axis, dir, fixed, pos, speed: 10 + Math.random() * 6 };
  setTrafficPos(t);
  traffic.push(t);
}
function setTrafficPos(t) {
  if (t.axis === 'x') {
    t.car.position.set(t.pos, 0, t.fixed);
    t.car.rotation.y = t.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    t.car.position.set(t.fixed, 0, t.pos);
    t.car.rotation.y = t.dir > 0 ? 0 : Math.PI;
  }
}

/* Polizeiautos (nur bei Fahndung aktiv) */
const police = [];
for (let i = 0; i < 3; i++) {
  const car = makeCar(0x3355ee, true);
  car.visible = false;
  police.push({ car, active: false, speed: 16 });
}

/* ---------- Vinyl-Platten (Auftrag 1) ---------- */
const packages = [];
function makeVinyl() {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 0.06, 24),
    new THREE.MeshLambertMaterial({ color: 0x111111 })
  );
  disc.rotation.x = Math.PI / 2;
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.26, 0.07, 16),
    new THREE.MeshLambertMaterial({ color: 0xff5533 })
  );
  label.rotation.x = Math.PI / 2;
  g.add(disc); g.add(label);
  return g;
}
function spawnPackage() {
  const vinyl = makeVinyl();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 30, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
  const gx = (Math.random() * GRID) | 0, gz = (Math.random() * GRID) | 0;
  const x = -CITY / 2 + gx * BLOCK + 5 + Math.random() * (BLOCK - 10);
  const z = -CITY / 2 + gz * BLOCK + 5 + Math.random() * (BLOCK - 10);
  vinyl.position.set(x, 0.9, z);
  beam.position.set(x, 15, z);
  const g = new THREE.Group();
  g.add(vinyl); g.add(beam);
  scene.add(g);
  packages.push({ g, m: vinyl, x, z });
}

/* ---------- Auftrags-System (Story-Kette) ---------- */
const quests = [
  { id: 'platten', title: 'PLATTEN SUCHEN', desc: 'Sammle 3 Vinyls (goldene Säulen) ein!', need: 3, counter: 0, kind: 'pickup' },
  { id: 'kumpels', title: 'KUMPELS TREFFEN', desc: 'Triff die Jungs an der Ecke (E drücken)!', need: 1, counter: 0, kind: 'talk' },
  { id: 'chillen', title: 'CHILLEN', desc: 'Chill 10 Sekunden am Grill im Park!', need: 10, counter: 0, kind: 'chill' },
  { id: 'sendung-planen', title: 'RADIOSENDUNG PLANEN', desc: 'Fahr zum Hotze-Funk-Sender und plan die Show!', need: 1, counter: 0, kind: 'talk' },
  { id: 'sendung', title: 'RADIOSENDUNG AUSTRAGEN', desc: 'On Air! Bleib 8 Sekunden beim Sender!', need: 8, counter: 0, kind: 'chill' },
  { id: 'anlage', title: 'ANLAGE ORGANISIEREN', desc: 'Hol dir 2 Boxen vom Lagerhaus!', need: 2, counter: 0, kind: 'pickup' },
  { id: 'party', title: 'PARTY!', desc: 'Geh zur Disco — die Party wartet!', need: 1, counter: 0, kind: 'talk' },
];
let questIdx = 0;
const questState = { marker: null, target: null, timer: 0 };

const kumpel = { x: -BLOCK * 1.5, z: BLOCK * 0.5 + 20 };
const grill = { x: -BLOCK * 0.5, z: -BLOCK * 1.5 + 10 };
const sender = { x: BLOCK * 2.5, z: -BLOCK * 2.5 + 10 };
const lager = { x: -BLOCK * 2.5, z: -BLOCK * 2.5 + 10 };
const studio = { x: BLOCK * 0.5 + 18, z: BLOCK * 1.5 + 10 };

/* Musikstudio-Gebäude */
(function buildStudio() {
  const b = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 8),
    new THREE.MeshLambertMaterial({ color: 0x2a1a4a }));
  b.position.set(studio.x, 3, studio.z);
  b.castShadow = true; b.receiveShadow = true;
  scene.add(b);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.6),
    new THREE.MeshBasicMaterial({ color: 0xff69b4 }));
  sign.position.set(studio.x, 6.4, studio.z + 4.05);
  scene.add(sign);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3),
    new THREE.MeshBasicMaterial({ color: 0xffd700 }));
  door.position.set(studio.x, 1.5, studio.z + 4.06);
  scene.add(door);
  // Studio-Marker-Säule
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 30, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff69b4, transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
  beam.position.set(studio.x, 15, studio.z);
  scene.add(beam);
  buildings.push({ x: studio.x, z: studio.z, w: 10, d: 8, h: 6 });
})();

function updateQuestHUD() {
  const q = quests[questIdx];
  const el = document.getElementById('mission');
  if (!q) {
    el.innerHTML = 'ALLES GESCHAFFT! 🎉<br><small>Du hast Hotze City gerockt! Cruise frei!</small>';
    return;
  }
  const unit = q.kind === 'chill' ? 's' : 'x';
  el.innerHTML = `${q.title}<br><small>${q.desc} — ${q.counter}/${q.need}${unit}</small>`;
}

const markerGeo = new THREE.ConeGeometry(0.6, 1.2, 4);
const markerMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
function placeMarker(x, z, label) {
  if (!questState.marker) {
    const m = new THREE.Mesh(markerGeo, markerMat);
    m.rotation.x = Math.PI;
    scene.add(m);
    questState.marker = m;
  }
  questState.marker.visible = true;
  questState.marker.position.set(x, 7, z);
  questState.target = { x, z, label };
}
function hideMarker() {
  if (questState.marker) questState.marker.visible = false;
  questState.target = null;
}

const kumpelNPCs = [];
(function buildKumpels() {
  const cols = [0x33aa55, 0x3355dd, 0xddaa22];
  for (let i = 0; i < 3; i++) {
    const f = makeCharacter(cols[i]);
    f.g.position.set(kumpel.x + (i - 1) * 1.4, 0, kumpel.z + (i % 2) * 1.2);
    f.g.rotation.y = Math.PI;
    scene.add(f.g);
    kumpelNPCs.push(f);
  }
})();

(function buildGrill() {
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0x333333 }));
  bowl.position.set(grill.x, 0.8, grill.z);
  scene.add(bowl);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8),
    new THREE.MeshLambertMaterial({ color: 0x555555 }));
  leg.position.set(grill.x, 0.4, grill.z);
  scene.add(leg);
  for (let i = 0; i < 3; i++) {
    const sausage = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.5, 4, 8),
      new THREE.MeshLambertMaterial({ color: 0xc26a2a }));
    sausage.rotation.z = Math.PI / 2 + i * 0.2;
    sausage.position.set(grill.x + (i - 1) * 0.25, 0.9, grill.z + (i - 1) * 0.15);
    scene.add(sausage);
  }
  const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.6),
    new THREE.MeshLambertMaterial({ color: 0x7a5a3a }));
  bench.position.set(grill.x + 2.5, 0.45, grill.z);
  scene.add(bench);
  const benchLegGeo = new THREE.BoxGeometry(0.12, 0.45, 0.5);
  for (const s of [-1, 1]) {
    const bl = new THREE.Mesh(benchLegGeo, bench.material);
    bl.position.set(grill.x + 2.5 + s * 1.0, 0.22, grill.z);
    scene.add(bl);
  }
})();

(function buildSender() {
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 26, 8),
    new THREE.MeshLambertMaterial({ color: 0xcc4444 }));
  mast.position.set(sender.x, 13, sender.z);
  mast.castShadow = true;
  scene.add(mast);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2 - i * 0.3, 0.05, 6, 16),
      new THREE.MeshLambertMaterial({ color: 0xdddddd }));
    ring.position.set(sender.x, 6 + i * 6, sender.z);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
  }
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3355 }));
  tip.position.set(sender.x, 26.5, sender.z);
  scene.add(tip);
  const hut = new THREE.Mesh(new THREE.BoxGeometry(3, 2.4, 3),
    new THREE.MeshLambertMaterial({ color: 0x8a7a6a }));
  hut.position.set(sender.x + 4, 1.2, sender.z);
  hut.castShadow = true;
  scene.add(hut);
})();

const lagerBoxes = [];
function ensureSpeakerBoxes() {
  if (lagerBoxes.length) return;
  for (let i = 0; i < 2; i++) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 1.0),
      new THREE.MeshLambertMaterial({ color: 0x222222 }));
    const cone = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16),
      new THREE.MeshLambertMaterial({ color: 0x666666 }));
    cone.position.z = 0.51;
    box.add(cone);
    box.position.set(lager.x + i * 2.2, 1.0, lager.z);
    box.castShadow = true;
    scene.add(box);
    lagerBoxes.push({ g: box, x: lager.x + i * 2.2, z: lager.z, taken: false });
  }
}

function setQuestTarget() {
  const q = quests[questIdx];
  if (!q) { hideMarker(); return; }
  if (q.id === 'platten') {
    while (packages.length < q.need) spawnPackage();
    hideMarker();
    q.targetDynamic = true;
  } else if (q.id === 'kumpels') {
    placeMarker(kumpel.x, kumpel.z, 'Kumpelecke');
  } else if (q.id === 'chillen') {
    placeMarker(grill.x, grill.z, 'Grill im Park');
  } else if (q.id === 'sendung-planen' || q.id === 'sendung') {
    placeMarker(sender.x, sender.z, 'Hotze-Funk-Sender');
  } else if (q.id === 'anlage') {
    placeMarker(lager.x, lager.z, 'Lagerhaus');
    ensureSpeakerBoxes();
  } else if (q.id === 'party') {
    placeMarker(disco.x, disco.z + disco.d / 2 + 2, 'Disco');
  }
  updateQuestHUD();
}

function advanceQuest() {
  questIdx++;
  questState.timer = 0;
  if (questIdx < quests.length) {
    const q = quests[questIdx];
    msg(`✅ Auftrag fertig! Weiter geht's: ${q.title}`, 3500);
    [523, 659, 784, 1047].forEach((f, j) => setTimeout(() => blip(f, 0.15, 'triangle', 0.15), j * 100));
  } else {
    msg('🎉 PARTY ZEIT! Du hast alles geschafft, Hotze!', 6000);
    state.money += 5000;
    state.stars = 0;
    updateHUD();
    [523, 659, 784, 1047, 1319].forEach((f, j) => setTimeout(() => blip(f, 0.2, 'triangle', 0.18), j * 100));
    disco.open = true;
    if (state.radio === -1 && state.inCar) { state.radio = 1; setStation(1); }
  }
  setQuestTarget();
}

/* ---------- Sound ---------- */
let actx = null;
function ac() {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    return actx;
  } catch { return null; }
}
function blip(freq, dur = 0.08, type = 'square', vol = 0.1) {
  const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  o.connect(g).connect(a.destination);
  o.start(); o.stop(a.currentTime + dur);
}

/* ---------- Blue Dimension Weekly Special ---------- */
/* Donnerstag 24:00 bis Freitag 06:00 Uhr (reale Uhrzeit):
   Jesse Jays Blue Dimension Night auf Radio LoRa — die Stadt schaltet
   in den Blue-Dimension-Modus: blaues Licht, Psy-Party in der Disco,
   Jesse Jay FM läuft automatisch im Auto. */
function blueDimensionActive() {
  const now = new Date();
  const day = now.getDay();      // 0=So ... 4=Do, 5=Fr
  const h = now.getHours();
  // Donnerstag 24 Uhr = Freitag 00:00 -> Freitag 0-6 Uhr
  return day === 5 && h < 6;
}
const blueDim = { active: false, sceneFog: null };

function enterBlueDimension() {
  blueDim.active = true;
  scene.background = new THREE.Color(0x0a1435);
  scene.fog.color.setHex(0x0a1435);
  sun.intensity = 0.25;
  const bd = new THREE.PointLight(0x2266ff, 30, 120, 1.6);
  bd.position.set(0, 40, 0);
  scene.add(bd);
  blueDim.light = bd;
  // Disco wird zur Psy-Night
  disco.open = true;
  document.body.classList.add('blue-dim');
  const banner = document.getElementById('blue-banner');
  if (banner) banner.classList.add('show');
  msg('🌊🔭 BLUE DIMENSION NIGHT! Jesse Jay ist on air auf LoRa 97,5 — Psy-Party in der Disco!', 6000);
}

function exitBlueDimension() {
  if (!blueDim.active) return;
  blueDim.active = false;
  scene.background = new THREE.Color(0x87b5e0);
  scene.fog.color.setHex(0x87b5e0);
  sun.intensity = 1.6;
  if (blueDim.light) { scene.remove(blueDim.light); blueDim.light = null; }
  document.body.classList.remove('blue-dim');
  const banner = document.getElementById('blue-banner');
  if (banner) banner.classList.remove('show');
  msg('Blue Dimension vorbei \u2014 die Stadt erwacht im Normalmodus.');
}

/* ---------- HUD ---------- */
const $ = id => document.getElementById(id);
const state = {
  money: 0, missions: 0, stars: 0,
  inCar: null, carCandidates: [], radio: -1,
  djjj: 0,
};

/* ---------- DJJJCOIN ---------- */
const djjj = {
  price: 50, history: [50], lastTick: 0, trendUp: true,
  miningActive: false, mineAcc: 0,
};
function djjjTick(dt) {
  // Kurs-Random-Walk mit Dump/Pump-Events
  djjj.lastTick += dt;
  if (djjj.lastTick < 3) return;
  djjj.lastTick = 0;
  const drift = (Math.random() - 0.48) * djjj.price * 0.06;
  const shock = Math.random() < 0.04 ? (Math.random() < 0.5 ? -1 : 1) * djjj.price * 0.25 : 0;
  djjj.price = Math.max(5, Math.round((djjj.price + drift + shock) * 10) / 10);
  djjj.history.push(djjj.price);
  if (djjj.history.length > 60) djjj.history.shift();
  djjj.trendUp = djjj.history[djjj.history.length - 1] >= djjj.history[Math.max(0, djjj.history.length - 10)];
  updateDjjjHUD();
  if (shock > 0) msg('🚀 DJJJCOIN PUMP! Kurs auf ' + djjj.price + ' Taler!');
  if (shock < 0) msg('📉 DJJJCOIN-CRASH! Kurs auf ' + djjj.price + ' Taler!');
}
function updateDjjjHUD() {
  const bal = document.getElementById('djjj-balance');
  const pr = document.getElementById('djjj-price');
  if (bal) bal.textContent = state.djjj.toFixed(2);
  if (pr) pr.textContent = djjj.price;
}
function drawDjjjChart() {
  const c = document.getElementById('djjj-chart');
  if (!c) return;
  const g = c.getContext('2d');
  const w = c.width, h = c.height;
  g.fillStyle = '#12081f';
  g.fillRect(0, 0, w, h);
  const hist = djjj.history;
  if (hist.length < 2) return;
  const min = Math.min(...hist) * 0.95, max = Math.max(...hist) * 1.05;
  g.strokeStyle = djjj.trendUp ? '#55ff55' : '#ff5555';
  g.lineWidth = 2;
  g.beginPath();
  hist.forEach((p, i) => {
    const x = (i / (hist.length - 1)) * w;
    const y = h - ((p - min) / (max - min)) * h;
    i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
  });
  g.stroke();
  const cur = document.getElementById('djjj-cur');
  const tr = document.getElementById('djjj-trend');
  const val = document.getElementById('djjj-value');
  if (cur) cur.textContent = djjj.price;
  if (tr) { tr.textContent = djjj.trendUp ? '↑ STEIGT' : '↓ FÄLLT'; tr.style.color = djjj.trendUp ? '#55ff55' : '#ff5555'; }
  if (val) val.textContent = Math.round(state.djjj * djjj.price);
}
function openDjjjExchange() {
  document.getElementById('djjj-panel').classList.add('open');
  drawDjjjChart();
}
function closeDjjjExchange() {
  document.getElementById('djjj-panel').classList.remove('open');
}
function djjjBuy(n) {
  const cost = Math.ceil(n * djjj.price);
  if (state.money < cost) {
    document.getElementById('djjj-note').textContent = 'Nicht genug Taler! Kosten: ' + cost;
    return;
  }
  state.money -= cost;
  state.djjj += n;
  updateHUD(); updateDjjjHUD(); drawDjjjChart();
  document.getElementById('djjj-note').textContent = n + ' DJJJCOIN gekauft für ' + cost + ' Taler!';
  blip(600, 0.08, 'triangle', 0.1);
}
function djjjSell(n) {
  if (state.djjj < n) {
    document.getElementById('djjj-note').textContent = 'Zu wenig Coins im Depot!';
    return;
  }
  state.djjj -= n;
  const gain = Math.floor(n * djjj.price);
  state.money += gain;
  updateHUD(); updateDjjjHUD(); drawDjjjChart();
  document.getElementById('djjj-note').textContent = n + ' DJJJCOIN verkauft für ' + gain + ' Taler!';
  blip(400, 0.08, 'triangle', 0.1);
}

/* Mining-Rig-Gebäude (Kraftwerk) */
const djjjMine = { x: BLOCK * 1.5 + 20, z: -BLOCK * 0.5 };
(function buildMine() {
  const base = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 6),
    new THREE.MeshLambertMaterial({ color: 0x333340 }));
  base.position.set(djjjMine.x, 2, djjjMine.z);
  base.castShadow = true;
  scene.add(base);
  // Dampfsäulen
  for (let i = 0; i < 2; i++) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 8, 10),
      new THREE.MeshLambertMaterial({ color: 0x555560 }));
    stack.position.set(djjjMine.x - 2 + i * 4, 8, djjjMine.z);
    scene.add(stack);
  }
  // Mining-Rig: grüne LED-Reihe
  const rig = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 0.3),
    new THREE.MeshBasicMaterial({ color: 0x00ff66 }));
  rig.position.set(djjjMine.x, 4.5, djjjMine.z + 3.1);
  scene.add(rig);
  djjjMine.rig = rig;
  // Coin-Symbol über dem Dach
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.2, 20),
    new THREE.MeshBasicMaterial({ color: 0xffd700 }));
  coin.rotation.x = Math.PI / 2;
  coin.position.set(djjjMine.x, 7, djjjMine.z);
  scene.add(coin);
  djjjMine.coin = coin;
  // Börsen-Gebäude in der Stadtmitte-Nähe
  const ex = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 6),
    new THREE.MeshLambertMaterial({ color: 0xff7700 }));
  ex.position.set(BLOCK * 0.5 + 18, 2.5, -BLOCK * 1.5 + 10);
  ex.castShadow = true;
  scene.add(ex);
  const exSign = new THREE.Mesh(new THREE.PlaneGeometry(5, 1),
    new THREE.MeshBasicMaterial({ color: 0xffd700 }));
  exSign.position.set(BLOCK * 0.5 + 18, 5.8, -BLOCK * 1.5 + 13.05);
  scene.add(exSign);
  buildings.push({ x: djjjMine.x, z: djjjMine.z, w: 8, d: 6, h: 4 });
  buildings.push({ x: BLOCK * 0.5 + 18, z: -BLOCK * 1.5 + 10, w: 6, d: 6, h: 5 });
})();

function updateDjjjMine(dt) {
  if (!djjjMine.rig) return;
  djjjMine.rig.material.color.setHex(Math.floor(performance.now() / 200) % 2 ? 0x00ff66 : 0x004422);
  if (djjjMine.coin) djjjMine.coin.rotation.z += dt * 1.5;
  // Passives Mining: alle 30 s +0.1 Coin, wenn Spieler das Rig besucht hat
  if (djjj.miningActive) {
    djjj.mineAcc += dt;
    if (djjj.mineAcc >= 30) {
      djjj.mineAcc = 0;
      state.djjj += 0.1;
      updateDjjjHUD();
      msg('⛏️ Mining-Rig: +0.1 DJJJCOIN geschürft!');
    }
  }
}
function updateHUD() {
  $('money').textContent = state.money;
  $('missions').textContent = state.missions;
  $('stars').textContent = '★'.repeat(state.stars) || '—';
}
let msgTimer = null;
function msg(t, dur = 2600) {
  const el = $('msg');
  el.textContent = t;
  el.style.opacity = 1;
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => el.style.opacity = 0, dur);
}

/* ---------- Radio (Hotze FM) ---------- */
const JESSE_STATION = 4; // Index der Jesse-Jay-Station
const loraAudio = () => document.getElementById('lora-audio');
const loraStatus = (t) => { const el = document.getElementById('lora-status'); if (el) el.textContent = t; };

/* Donnerstagnacht (Blue Dimension): LoRa live — sonst Jesse Jays SoundCloud */
function isThursdayNight() {
  const now = new Date();
  const day = now.getDay();   // 4 = Do, 5 = Fr
  const h = now.getHours();
  return day === 4 && h >= 0 || day === 5 && h < 6;
}

function openLoraRadio(autoplay) {
  closeSoundCloud();
  const panel = document.getElementById('lora-panel');
  panel.classList.add('open');
  const a = loraAudio();
  loraStatus('Verbinde mit livestream.lora.ch ...');
  if (autoplay) {
    a.play().then(() => loraStatus('LIVE — Radio LoRa 97,5 Zürich')).catch(() => {
      loraStatus('Autoplay blockiert — bitte Play drücken!');
    });
  }
  a.onerror = () => loraStatus('Stream-Fehler — Retry drücken!');
  a.onplaying = () => loraStatus('LIVE — Radio LoRa 97,5 Zürich');
  a.onwaiting = () => loraStatus('Puffert ...');
}
function closeLoraRadio() {
  document.getElementById('lora-panel').classList.remove('open');
  const a = loraAudio();
  if (a) { a.pause(); }
}
function openSoundCloud() {
  closeLoraRadio();
  document.getElementById('sc-panel').classList.add('open');
}
function closeSoundCloud() {
  document.getElementById('sc-panel').classList.remove('open');
}
/* Station 5: Donnerstagnacht LoRa live, sonst Jesse Jays SoundCloud */
function openJesseRadio() {
  if (isThursdayNight()) {
    openLoraRadio(true);
    $('radio-display').textContent = 'LORA 97,5 LIVE (ZÜRICH)';
    msg('📻 RADIO LORA 97,5 LIVE — Blue Dimension mit Jesse Jay!', 4000);
  } else {
    openSoundCloud();
    $('radio-display').textContent = 'JESSE JAY FM (SOUNDCLOUD)';
    msg('📻 JESSE JAY FM — DJ Jesse Jay aus Zürich! Deep House & Melodic Techno.', 4000);
  }
}
function closeJesseRadio() {
  closeLoraRadio();
  closeSoundCloud();
}
function cycleRadio() {
  audio();
  let next = state.radio + 1;
  // Studio-Station (Index 3) nur anwählen, wenn schon ein Track produziert wurde
  if (next === 3 && !STATIONS[3]) next = 4;
  if (next === JESSE_STATION) {
    state.radio = JESSE_STATION;
    stop();
    openJesseRadio();
    return;
  }
  if (next > JESSE_STATION) next = -1;
  state.radio = next;
  if (state.radio === -1) {
    stop();
    closeJesseRadio();
    msg('Radio aus. Ruhe sinkt über Hotze City...');
  } else {
    setStation(state.radio);
    jingle();
    msg(`📻 ${STATIONS[state.radio].name} — ${STATIONS[state.radio].desc}`, 3200);
  }
  const rd = $('radio-display');
  rd.textContent = state.radio === -1 ? 'RADIO AUS' : STATIONS[state.radio].name;
}

/* ---------- DISCO "AUFSCHWUNG OST" ---------- */
const disco = { x: BLOCK, z: BLOCK, w: 26, d: 26, h: 12, lights: [], strobe: null, fans: [], near: false, open: false };
(function buildDisco() {
  const base = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(disco.w, disco.h, disco.d),
    new THREE.MeshLambertMaterial({ color: 0x1a0a2e }));
  shell.position.set(disco.x, disco.h / 2, disco.z);
  shell.castShadow = true; shell.receiveShadow = true;
  base.add(shell);
  const roofSign = new THREE.Mesh(new THREE.PlaneGeometry(20, 3),
    new THREE.MeshBasicMaterial({ color: 0xff00aa }));
  roofSign.position.set(disco.x, disco.h + 2.2, disco.z + disco.d / 2 + 0.1);
  base.add(roofSign);
  // Stroboskop-Kugeln (Disco-Kugeln)
  const ballGeo = new THREE.SphereGeometry(0.9, 12, 12);
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.95, roughness: 0.05 });
  const p1 = new THREE.Mesh(ballGeo, ballMat);
  p1.position.set(disco.x - 4, disco.h - 2, disco.z);
  base.add(p1);
  const p2 = new THREE.Mesh(ballGeo, ballMat);
  p2.position.set(disco.x + 4, disco.h - 2, disco.z);
  base.add(p2);
  // Strobo-Licht
  const strobe = new THREE.PointLight(0xffffff, 0, 18, 2);
  strobe.position.set(disco.x, disco.h - 2, disco.z);
  base.add(strobe);
  disco.strobe = strobe;
  // Farbwechselnde Spotlights über dem Dach
  const spotColors = [0xff0066, 0x00ffcc, 0xffee00, 0x9900ff];
  for (let i = 0; i < 4; i++) {
    const sl = new THREE.PointLight(spotColors[i], 0, 16, 2);
    sl.position.set(disco.x - 6 + i * 4, disco.h - 1, disco.z + 4);
    base.add(sl);
    disco.lights.push(sl);
  }
  // Eingang (leuchtende Tür)
  const door = new THREE.Mesh(new THREE.PlaneGeometry(4, 5),
    new THREE.MeshBasicMaterial({ color: 0x220033 }));
  door.position.set(disco.x, 2.5, disco.z + disco.d / 2 + 0.15);
  base.add(door);
  scene.add(base);
  buildings.push({ x: disco.x, z: disco.z, w: disco.w, d: disco.d, h: disco.h });
})();

/* Tanzende NPC-Fans vor der Disco */
const fanColors = [0xff69b4, 0x00ffcc, 0xffee00, 0x9900ff, 0xff6600, 0x33ff33];
(function buildFans() {
  for (let i = 0; i < 10; i++) {
    const f = makeCharacter(fanColors[i % fanColors.length]);
    const ang = (i / 10) * Math.PI * 2;
    const r = 6 + Math.random() * 5;
    f.g.position.set(disco.x + Math.cos(ang) * r, 0, disco.z + disco.d / 2 + 4 + Math.sin(ang) * r * 0.5);
    f.g.rotation.y = Math.atan2(disco.x - f.g.position.x, disco.z - f.g.position.z);
    scene.add(f.g);
    disco.fans.push({ f, phase: Math.random() * Math.PI * 2, style: (Math.random() * 3) | 0 });
  }
})();

function updateDisco(now, beat) {
  const t = state.inCar ? state.inCar.car.position : player.g.position;
  const dist = Math.hypot(t.x - disco.x, t.z - disco.z);
  disco.near = dist < 40;
  const playing = beat || state.radio !== -1;
  // Beat-Puls
  let pulse = 0;
  if (beat && beat.isQuarter) pulse = 1 - (beat.eight % 2) * 0.5;
  const level = getLevel();
  if (disco.near || disco.open) {
    // Strobo nur bei Musik und Nähe
    if (playing) {
      const s = Math.floor(now / 120) % 2 === 0 ? 3 + level * 8 : 0;
      disco.strobe.intensity = s;
      disco.lights.forEach((l, i) => {
        l.intensity = 2 + pulse * 6 + level * 4;
        // Farbwechsel pro Takt
        if (beat && beat.bar % 4 === i) l.color.setHex([0xff0066, 0x00ffcc, 0xffee00, 0x9900ff][(beat.bar) % 4]);
      });
      // Disco-Kugeln drehen
      scene.traverse(o => {
        if (o.geometry instanceof THREE.SphereGeometry && o.material.metalness > 0.5) o.rotation.y += 0.04;
      });
      // Fans tanzen nur wenn Musik läuft und jemand nahe ist
      for (const fan of disco.fans) {
        const { f, phase, style } = fan;
        f.g.position.y = Math.abs(Math.sin(now / 150 + phase)) * (style === 0 ? 0.5 : style === 1 ? 0.25 : 0.8);
        f.arms[0].rotation.x = Math.sin(now / 130 + phase) * 1.2;
        f.arms[1].rotation.x = -Math.sin(now / 130 + phase) * 1.2;
        f.g.rotation.z = Math.sin(now / 260 + phase) * 0.08;
        f.legs[0].rotation.x = Math.sin(now / 150 + phase) * 0.3;
        f.legs[1].rotation.x = -Math.sin(now / 150 + phase) * 0.3;
      }
    } else {
      disco.strobe.intensity = 0;
      disco.lights.forEach(l => l.intensity = 0.5);
      for (const fan of disco.fans) {
        fan.f.g.position.y *= 0.9;
        fan.f.arms.forEach(a => a.rotation.x *= 0.92);
      }
    }
  } else {
    disco.strobe.intensity = 0;
    disco.lights.forEach(l => l.intensity = 0);
  }
}

/* Pulsierende Stadt: Gebäude-Lichter blinken im Takt, wenn Radio an */
const cityGlow = new THREE.PointLight(0xff88cc, 0, 60, 2);
cityGlow.position.set(0, 30, 0);
scene.add(cityGlow);

/* ---------- Eingaben ---------- */
const keys = {};
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (k === 'f') tryToggleCar();
  if (k === 'e') tryPickup();
  if (k === 'r' && state.inCar) cycleRadio();
  if (k === 't') { const on = toggleAgent(); }
  if (k === 'p') openProjectsPanel();
  if (k === 'n') openNftPanel();
  if (k === 'j') {
    document.getElementById('ki-panel').classList.add('open');
    refreshJessePanel();
  }
  if (k === ' ') e.preventDefault();
});
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ---------- Touch-Steuerung ---------- */
const touch = { active: false, x: 0, y: 0 };
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (isTouch) document.body.classList.add('touch');

const joyEl = $('joystick'), stickEl = $('stick');
let joyId = null, joyCenter = { x: 0, y: 0 };
const JOY_R = 50;

function setJoy(dx, dy) {
  const len = Math.hypot(dx, dy);
  const cl = Math.min(len, JOY_R);
  const nx = len > 0 ? dx / len : 0, ny = len > 0 ? dy / len : 0;
  stickEl.style.transform = `translate(${nx * cl}px, ${ny * cl}px)`;
  touch.active = len > 8;
  touch.x = nx * (cl / JOY_R);
  touch.y = ny * (cl / JOY_R);
}
joyEl.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.changedTouches[0];
  joyId = t.identifier;
  const r = joyEl.getBoundingClientRect();
  joyCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  setJoy(t.clientX - joyCenter.x, t.clientY - joyCenter.y);
}, { passive: false });
joyEl.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === joyId) setJoy(t.clientX - joyCenter.x, t.clientY - joyCenter.y);
  }
}, { passive: false });
const joyEnd = e => {
  for (const t of e.changedTouches) {
    if (t.identifier === joyId) { joyId = null; setJoy(0, 0); }
  }
};
joyEl.addEventListener('touchend', joyEnd);
joyEl.addEventListener('touchcancel', joyEnd);

function bindBtn(id, key, tap) {
  const el = $(id);
  if (!el) return;
  const down = e => {
    e.preventDefault();
    el.classList.add('on');
    if (tap) tap();
    else keys[key] = true;
  };
  const up = e => {
    e.preventDefault();
    el.classList.remove('on');
    if (!tap) keys[key] = false;
  };
  el.addEventListener('touchstart', down, { passive: false });
  el.addEventListener('touchend', up, { passive: false });
  el.addEventListener('touchcancel', up, { passive: false });
}
bindBtn('btnF', null, tryToggleCar);
bindBtn('btnE', null, tryPickup);
bindBtn('btnR', null, () => { if (state.inCar) cycleRadio(); });
bindBtn('btnBrake', ' ');

let touchWasActive = false;
function applyTouchMove() {
  if (!touch.active) return;
  const dead = 0.2;
  const mag = Math.hypot(touch.x, touch.y);
  if (mag < dead) return;
  const fx = touch.x / mag, fy = touch.y / mag;
  const drive = -fy;
  const strafe = fx;
  if (state.inCar) {
    keys['w'] = drive > dead;
    keys['s'] = drive < -dead;
    keys['a'] = strafe < -dead;
    keys['d'] = strafe > dead;
  } else {
    keys['w'] = drive > dead;
    keys['s'] = drive < -dead;
    keys['a'] = strafe < -dead;
    keys['d'] = strafe > dead;
  }
}

/* ---------- Parkende Autos (steigen möglich) ---------- */
const parkedCars = [];
function spawnParked(x, z, rotY) {
  const car = makeCar(CAR_COLORS[(Math.random() * CAR_COLORS.length) | 0], false);
  car.position.set(x, 0, z);
  car.rotation.y = rotY;
  parkedCars.push({ car, x, z, heading: rotY, speed: 0 });
}
spawnParked(ROAD_W / 2 + 2.5, 0, 0);
spawnParked(-ROAD_W / 2 - 2.5, 14, Math.PI);
spawnParked(BLOCK, ROAD_W / 2 + 2.5, Math.PI / 2);
spawnParked(-BLOCK, -ROAD_W / 2 - 2.5, -Math.PI / 2);
spawnParked(BLOCK * 2, ROAD_W / 2 + 2.5, Math.PI / 2);

function tryToggleCar() {
  if (state.inCar) {
    const c = state.inCar;
    player.g.position.set(c.x + Math.cos(c.heading) * 2.2, 0, c.z - Math.sin(c.heading) * 2.2);
    player.g.visible = true;
    state.inCar = null;
    msg('Ausgestiegen. Beine wieder her!');
    if (state.radio !== -1) { state.radio = -1; stop(); closeJesseRadio(); $('radio-display').textContent = 'RADIO AUS'; }
    blip(300, 0.06, 'sine');
    return;
  }
  const pp = player.g.position;
  let best = null, bd = 5;
  for (const c of parkedCars) {
    const d = Math.hypot(c.x - pp.x, c.z - pp.z);
    if (d < bd) { bd = d; best = c; }
  }
  if (best) {
    state.inCar = best;
    player.g.visible = false;
    msg('Motor gestartet — vorsichtig fahren, Hotze! Mit R Radio schalten! 📻');
    if (blueDim.active && state.radio === -1) {
      state.radio = JESSE_STATION;
      openJesseRadio();
    }
    blip(440, 0.1, 'sawtooth', 0.08);
  } else {
    msg('Kein Auto in der Nähe. Mit F einsteigen.');
  }
}

function tryPickup() {
  if (state.inCar) return;
  const q = quests[questIdx];
  const pp = player.g.position;

  // Vinyl-Platten (Auftrag "platten")
  for (let i = packages.length - 1; i >= 0; i--) {
    const p = packages[i];
    if (Math.hypot(p.x - pp.x, p.z - pp.z) < 2.2) {
      scene.remove(p.g);
      packages.splice(i, 1);
      blip(700, 0.08, 'triangle', 0.12);
      if (q && q.id === 'platten') {
        q.counter++;
        state.money += 200;
        updateQuestHUD();
        if (q.counter >= q.need) { state.missions++; updateHUD(); advanceQuest(); }
        else msg(`Vinyl gesichert! (${q.counter}/${q.need})`);
        return;
      }
    }
  }

  // Boxen (Auftrag "anlage")
  for (const b of lagerBoxes) {
    if (!b.taken && Math.hypot(b.x - pp.x, b.z - pp.z) < 2.4) {
      b.taken = true;
      scene.remove(b.g);
      blip(300, 0.1, 'sawtooth', 0.1);
      q.counter++;
      updateQuestHUD();
      if (q.counter >= q.need) { state.missions++; state.money += 300; updateHUD(); advanceQuest(); }
      else msg(`Box geladen! (${q.counter}/${q.need})`);
      return;
    }
  }

  // Talks: Kumpels, Sender, Disco (Auftrag "kumpels", "sendung-planen", "party")
  if (q && q.kind === 'talk' && questState.target) {
    const t = questState.target;
    if (Math.hypot(t.x - pp.x, t.z - pp.z) < 4) {
      if (q.id === 'kumpels') msg('Na Alter, was geit? Alles klar bei dir — weiter geht’s!', 3000);
      if (q.id === 'sendung-planen') msg('Sendung geplant: „Aufschwung Ost — die Hotze-Show“!', 3000);
      if (q.id === 'party') msg('Die Party läuft! Alle sind da — Aufschwung Ost!', 3000);
      q.counter = q.need;
      state.missions++;
      updateHUD();
      advanceQuest();
      return;
    }
  }

  // AST NFT-Tower: Mint-Panel öffnen
  if (Math.hypot(nftTower.x - pp.x, nftTower.z + 4 - pp.z) < 4.5) {
    openNftPanel();
    return;
  }

  // DJJJCOIN: Börse öffnen
  const exX = BLOCK * 0.5 + 18, exZ = -BLOCK * 1.5 + 13;
  if (Math.hypot(exX - pp.x, exZ - pp.z) < 4) {
    openDjjjExchange();
    msg('🧿 Hotze Exchange geöffnet! Kaufe low, verkaufe high!');
    return;
  }
  // DJJJCOIN: Mining-Rig aktivieren
  if (Math.hypot(djjjMine.x - pp.x, djjjMine.z + 3 - pp.z) < 4.5) {
    if (!djjj.miningActive) {
      djjj.miningActive = true;
      msg('⛏️ Mining-Rig aktiviert! Es schürft jetzt passiv DJJJCOIN für dich (+0.1 alle 30s)');
    } else {
      msg('Mining-Rig läuft schon. Geduld, Hotze!');
    }
    return;
  }

  // Musikstudio betreten
  if (Math.hypot(studio.x - pp.x, studio.z + 4 - pp.z) < 4) {
    openStudio();
    msg('Willkommen im Musikstudio! Bau deinen Track! 🎚️', 3000);
    return;
  }

  msg('Hier gibt’s nix zu holen. Folg dem goldnen Marker!');
}

/* ---------- Fahndung / Bullen ---------- */
function updatePolice(dt) {
  if (state.stars === 0) {
    for (const p of police) { p.car.visible = false; p.active = false; }
    return;
  }
  const activeCount = Math.min(state.stars, police.length);
  const target = state.inCar
    ? { x: state.inCar.car.position.x, z: state.inCar.car.position.z }
    : { x: player.g.position.x, z: player.g.position.z };
  for (let i = 0; i < police.length; i++) {
    const p = police[i];
    if (i < activeCount) {
      if (!p.active) {
        const ang = Math.random() * Math.PI * 2;
        p.car.position.set(target.x + Math.cos(ang) * 60, 0, target.z + Math.sin(ang) * 60);
        p.active = true;
      }
      p.car.visible = true;
      const dx = target.x - p.car.position.x, dz = target.z - p.car.position.z;
      const dist = Math.hypot(dx, dz) || 1;
      const spd = p.speed + state.stars * 2;
      p.car.position.x += dx / dist * spd * dt;
      p.car.position.z += dz / dist * spd * dt;
      p.car.rotation.y = Math.atan2(dx, dz);
      p.car.userData.lightbar.material.color.setHex(
        Math.floor(performance.now() / 250) % 2 ? 0xff3355 : 0x3355ff);
      if (dist < 2.5) {
        // Harmlos: Bullen schieben dich nur weg — kein Schaden, kein Blut.
        const push = 6;
        if (state.inCar) {
          const c = state.inCar;
          c.x -= dx / dist * push * dt * 30;
          c.z -= dz / dist * push * dt * 30;
          c.speed *= 0.5;
        } else {
          player.g.position.x -= dx / dist * push * dt;
          player.g.position.z -= dz / dist * push * dt;
        }
        state.stars = 0;
        updateHUD();
        msg('Ertappt! Die Bullen schieben dich weg und lassen dich laufen...', 3200);
        blip(150, 0.3, 'square', 0.12);
      }
    } else {
      p.car.visible = false; p.active = false;
    }
  }
}

/* ---------- Minimap ---------- */
const mmCtx = $('minimap').getContext('2d');
function drawMinimap() {
  const w = 180, half = w / 2, scale = half / (CITY * 0.75);
  mmCtx.fillStyle = '#1a2a1a';
  mmCtx.fillRect(0, 0, w, w);
  mmCtx.strokeStyle = '#555';
  for (let i = 0; i <= GRID; i++) {
    const p = half + (-CITY / 2 + i * BLOCK) * scale;
    mmCtx.beginPath(); mmCtx.moveTo(p, 0); mmCtx.lineTo(p, w); mmCtx.stroke();
    mmCtx.beginPath(); mmCtx.moveTo(0, p); mmCtx.lineTo(w, p); mmCtx.stroke();
  }
  const t = state.inCar ? state.inCar.car.position : player.g.position;
  const tx = half + t.x * scale, ty = half + t.z * scale;
  mmCtx.fillStyle = '#ffd700';
  for (const p of packages) {
    mmCtx.beginPath();
    mmCtx.arc(half + p.x * scale, half + p.z * scale, 3, 0, 7);
    mmCtx.fill();
  }
  mmCtx.fillStyle = state.inCar ? '#3355ff' : '#ff5533';
  mmCtx.beginPath();
  mmCtx.arc(tx, ty, 4, 0, 7);
  mmCtx.fill();
}

/* ---------- Bewegung & Kamera ---------- */
const clock = new THREE.Clock();
let walkPhase = 0;
const camOffset = new THREE.Vector3();
let camYaw = Math.PI; // Blick von hinten

function collide(x, z, r) {
  for (const b of buildings) {
    const dx = Math.max(Math.abs(x - b.x) - (b.w / 2 + r), 0);
    const dz = Math.max(Math.abs(z - b.z) - (b.d / 2 + r), 0);
    if (dx * dx + dz * dz < 0.01) return true;
  }
  return false;
}

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);

  // Touch: Joystick auf Tasten mappen, bei Loslassen lösen
  const wasTouch = touch.active || touchWasActive;
  if (wasTouch) {
    applyTouchMove();
    if (!touch.active) ['w','a','s','d'].forEach(k => keys[k] = false);
  }
  touchWasActive = touch.active;

  if (state.inCar) {
    const c = state.inCar;
    const accel = keys['w'] ? 22 : keys['s'] ? -14 : 0;
    const brake = keys[' '] ? 0.88 : 1;
    c.speed += accel * dt;
    c.speed *= brake;
    c.speed = THREE.MathUtils.clamp(c.speed, -12, 34);
    c.speed *= (1 - 0.4 * dt);
    const steer = (keys['a'] ? 1 : 0) - (keys['d'] ? 1 : 0);
    c.heading += steer * dt * 2.0 * Math.min(Math.abs(c.speed) / 10, 1) * Math.sign(c.speed || 1);
    let nx = c.x + Math.sin(c.heading) * c.speed * dt;
    let nz = c.z + Math.cos(c.heading) * c.speed * dt;
    if (!collide(nx, nz, 1.6)) { c.x = nx; c.z = nz; }
    else { c.speed *= -0.3; blip(90, 0.08, 'square', 0.06); }
    nx = THREE.MathUtils.clamp(c.x, -CITY / 2 - 40, CITY / 2 + 40);
    nz = THREE.MathUtils.clamp(c.z, -CITY / 2 - 40, CITY / 2 + 40);
    c.x = nx; c.z = nz;
    c.car.position.set(c.x, 0, c.z);
    c.car.rotation.y = c.heading;
    if (Math.abs(c.speed) > 20 && Math.random() < 0.05) state.stars = Math.min(5, state.stars + 1), updateHUD(), msg('Zu schnell gefahren — Fahndung steigt!');
    if (keys['shift'] && Math.abs(c.speed) > 26 && Math.random() < 0.02) blip(700, 0.03, 'sine', 0.04);
  } else {
    const pp = player.g.position;
    const sprint = keys['shift'] ? 1.8 : 1;
    const spd = 5.2 * sprint;
    let mx = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0);
    let mz = (keys['s'] ? 1 : 0) - (keys['w'] ? 1 : 0);
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      mx /= len; mz /= len;
      const nx = pp.x + mx * spd * dt;
      const nz = pp.z + mz * spd * dt;
      if (!collide(nx, pp.z, 0.5)) pp.x = nx;
      if (!collide(pp.x, nz, 0.5)) pp.z = nz;
      player.g.rotation.y = Math.atan2(mx, mz) + Math.PI;
      walkPhase += dt * 10 * sprint;
      player.legs[0].rotation.x = Math.sin(walkPhase) * 0.6;
      player.legs[1].rotation.x = -Math.sin(walkPhase) * 0.6;
      player.arms[0].rotation.x = -Math.sin(walkPhase) * 0.5;
      player.arms[1].rotation.x = Math.sin(walkPhase) * 0.5;
    } else {
      player.legs.forEach(l => l.rotation.x *= 0.8);
      player.arms.forEach(a => a.rotation.x *= 0.8);
    }
  }

  // Kamera folgt
  const t = state.inCar ? state.inCar.car.position : player.g.position;
  const speedPull = state.inCar ? Math.min(Math.abs(state.inCar.speed) * 0.06, 2) : 0;
  camOffset.set(Math.sin(camYaw) * (8 + speedPull), 4.5 + speedPull, Math.cos(camYaw) * (8 + speedPull));
  const camTarget = t.clone().add(camOffset);
  camera.position.lerp(camTarget, 0.08);
  camera.lookAt(t.x, 1.5, t.z);

  // Verkehrs-KI
  for (const tr of traffic) {
    tr.pos += tr.dir * tr.speed * dt;
    if (tr.pos > CITY / 2 + 10) tr.pos = -CITY / 2 - 10;
    if (tr.pos < -CITY / 2 - 10) tr.pos = CITY / 2 + 10;
    setTrafficPos(tr);
  }

  updatePolice(dt);

  // Chill-Aufträge: Timer läuft, solange man nah beim Marker ist
  const q = quests[questIdx];
  if (q && q.kind === 'chill' && questState.target) {
    const t = questState.target;
    const pos = state.inCar ? state.inCar.car.position : player.g.position;
    const near = Math.hypot(t.x - pos.x, t.z - pos.z) < 6;
    if (near) {
      questState.timer += dt;
      const shown = Math.floor(questState.timer);
      if (shown > q.counter) { q.counter = shown; updateQuestHUD(); }
      if (questState.timer >= q.need) {
        state.missions++;
        state.money += 400;
        updateHUD();
        advanceQuest();
      }
    } else {
      if (q.counter > 0) msg('Zu weit weg — Chilling abgebrochen. Zurück zum Marker!');
      questState.timer = 0;
      q.counter = 0;
      updateQuestHUD();
    }
  }

  // Marker schwebt und dreht sich
  if (questState.marker && questState.marker.visible) {
    questState.marker.rotation.y += dt * 2;
    questState.marker.position.y = 7 + Math.sin(performance.now() / 400) * 0.5;
  }

  // Blue Dimension Weekly Special prüfen (alle 10 s)
  blueCheck -= dt;
  if (blueCheck <= 0) {
    blueCheck = 10;
    const act = blueDimensionActive();
    if (act && !blueDim.active) enterBlueDimension();
    if (!act && blueDim.active) exitBlueDimension();
  }
  // Während Blue Dimension: Disco-Lichter pulsieren im Psy-Blau
  if (blueDim.active && disco.lights.length) {
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 300);
    disco.lights.forEach((l, i) => {
      l.color.setHex([0x2266ff, 0x00ccff, 0x4466ff, 0x6699ff][i % 4]);
      l.intensity = 2 + pulse * 8;
    });
  }

  // KI-System: NFT-Alter, Projekte, Aufgaben, Autopilot
  nftTick(dt);
  projectsTick(dt);
  tasksTick();
  if (agent.enabled) agentTick(dt);
  if (document.getElementById('nft-panel').classList.contains('open')) refreshNftPanel();
  if (document.getElementById('proj-panel').classList.contains('open')) refreshProjectsPanel();

  // DJJJCOIN: Kurs-Tick + Mining
  djjjTick(dt);
  updateDjjjMine(dt);
  if (document.getElementById('djjj-panel').classList.contains('open')) drawDjjjChart();

  // Musik-Sequencer füttern + Beat-Visuals
  pump();
  updateDisco(performance.now(), lastBeat && performance.now() - lastBeatAt < 600 ? lastBeat : null);
  if (state.radio !== -1) {
    const level = getLevel();
    cityGlow.intensity = 1.5 + level * 6;
    cityGlow.color.setHSL((performance.now() / 8000) % 1, 0.8, 0.55);
  } else {
    cityGlow.intensity = 0;
  }

  drawMinimap();
  renderer.render(scene, camera);
}

/* ---------- NFT- & Projekt-Panels ---------- */
function escapeHTML(value) {\n  return String(value)\n    .replaceAll('&', '&amp;')\n    .replaceAll('<', '&lt;')\n    .replaceAll('>', '&gt;')\n    .replaceAll('\\"', '&quot;')\n    .replaceAll("'", '&#39;');\n}\n\nfunction openNftPanel() {
  document.getElementById('nft-panel').classList.add('open');
  refreshNftPanel();
}
function refreshNftPanel() {
  const list = document.getElementById('nft-list');
  if (!list) return;
  const nfts = listNFTs();
  if (!nfts.length) { list.innerHTML = '<div style="color:#888;grid-column:1/-1">Noch keine Verträge. Minte deinen ersten AST!</div>'; return; }
  list.innerHTML = nfts.map(n => `
    <div class="nft-card">
      <b>${escapeHTML(n.name)}</b>
      <span class="rare" style="color:${escapeHTML(n.col)}">${escapeHTML(n.rarity)}</span><br>
      <span style="color:#aaa">${escapeHTML(n.hash)}</span><br>
      <span style="color:#ffd700">Wert: ${n.valueDJJJ} DJJJ</span>
      <button data-sell="${n.id}">VERKAUFEN</button>
    </div>`).join('');
  list.querySelectorAll('button[data-sell]').forEach(b => {
    b.addEventListener('pointerdown', e => {
      e.preventDefault();
      sellNFT(b.dataset.sell);
      refreshNftPanel();
    });
  });
}
function openProjectsPanel() {
  document.getElementById('proj-panel').classList.add('open');
  refreshProjectsPanel();
}
function refreshProjectsPanel() {
  const listEl = document.getElementById('proj-list');
  const btnsEl = document.getElementById('proj-buttons');
  const taskEl = document.getElementById('task-line');
  if (!listEl) return;
  const act = getProjects();
  listEl.innerHTML = act.length
    ? act.map(p => `<div class="proj-row"><b>${escapeHTML(p.name)}</b><div class="proj-bar"><div style="width:${p.progress}%"></div></div><span style="color:#aaa;font-size:.75rem">${p.progress}%</span></div>`).join('')
    : '<div style="color:#888">Keine aktiven Projekte. Starte eines!</div>';
  const { PROJECT_TYPES } = PROJECTS_UI;
  btnsEl.innerHTML = PROJECT_TYPES.map(t =>
    `<button data-proj="${t.id}">${t.name}<br><small style="font-weight:normal">${t.desc}</small></button>`).join('');
  btnsEl.querySelectorAll('button[data-proj]').forEach(b => {
    b.addEventListener('pointerdown', e => {
      e.preventDefault();
      const r = startProject(b.dataset.proj);
      if (!r.ok) msg(r.error);
      refreshProjectsPanel();
    });
  });
  const tk = getTask();
  taskEl.textContent = tk ? `📋 Aufgabe: ${tk.desc} (Fortschritt: ${JSON.stringify(tk.progress)})` : '';
}
document.getElementById('nft-mint').addEventListener('pointerdown', e => {
  e.preventDefault();
  const r = mintNFT();
  if (!r.ok) msg(r.error);
  refreshNftPanel();
});

function refreshJessePanel() {
  const info = providerInfo();
  const bal = document.getElementById('ki-balance');
  if (bal) bal.textContent = info.tokens.toLocaleString('de-CH');
  const logEl = document.getElementById('ki-log');
  if (logEl) logEl.innerHTML = info.log.slice(-8).map(l => `<div style="color:${l.startsWith('+') ? '#55ff55' : '#ff8888'};font-size:.72rem">${escapeHTML(l)}</div>`).join('');
  updateProviderHUD();
}
document.getElementById('ki-dep-micro').addEventListener('pointerdown', e => {
  e.preventDefault();
  const r = sellPackage('micro');
  document.getElementById('ki-note').textContent = r.ok ? 'MICRO-Paket aktiviert: +5.000 Tokens!' : r.error;
  refreshJessePanel();
});
document.getElementById('ki-dep-standard').addEventListener('pointerdown', e => {
  e.preventDefault();
  const r = sellPackage('standard');
  document.getElementById('ki-note').textContent = r.ok ? 'STANDARD-Paket aktiviert: +50.000 Tokens!' : r.error;
  refreshJessePanel();
});
document.getElementById('ki-dep-pro').addEventListener('pointerdown', e => {
  e.preventDefault();
  const r = sellPackage('pro');
  document.getElementById('ki-note').textContent = r.ok ? 'PRO-Paket aktiviert: +500.000 Tokens!' : r.error;
  refreshJessePanel();
});

let lastBeat = null, lastBeatAt = 0;
let blueCheck = 0;
onBeat(b => { lastBeat = b; lastBeatAt = performance.now(); });

initStudio();

/* ---------- KI-System-Anbindung ---------- */
const playerPos = () => {
  if (state.inCar) return { x: state.inCar.x, z: state.inCar.z };
  return { x: player.g.position.x, z: player.g.position.z };
};
const playerHeading = () => state.inCar ? state.inCar.heading : player.g.rotation.y;
const setStationSafe = i => { if (i >= 0 && i < 4) { state.radio = i; setStation(i); } };

/* AST NFT-Tower: mintbares Vertragsgebäude */
const nftTower = { x: -BLOCK * 0.5 - 15, z: BLOCK * 1.5 + 10 };
(function buildNftTower() {
  const t = new THREE.Mesh(new THREE.BoxGeometry(7, 14, 7),
    new THREE.MeshLambertMaterial({ color: 0x1a1a2e }));
  t.position.set(nftTower.x, 7, nftTower.z);
  t.castShadow = true;
  scene.add(t);
  // Bunt leuchtende "Vertrags"-Segmente
  const segCols = [0xff0066, 0x00ffcc, 0xffee00, 0x9900ff, 0x33ff33];
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(7.3, 0.5, 7.3),
      new THREE.MeshBasicMaterial({ color: segCols[i] }));
    s.position.set(nftTower.x, 2 + i * 2.6, nftTower.z);
    scene.add(s);
  }
  const tip = new THREE.Mesh(new THREE.OctahedronGeometry(1.2),
    new THREE.MeshBasicMaterial({ color: 0xffd700 }));
  tip.position.set(nftTower.x, 15.5, nftTower.z);
  scene.add(tip);
  nftTower.tip = tip;
  buildings.push({ x: nftTower.x, z: nftTower.z, w: 7, d: 7, h: 14 });
})();

/* Tick-Hooks, damit ai.js Zugriff auf Spielinternes hat */
bindGame({
  state, quests, questState, packages, lagerBoxes, disco, blueDim, djjj,
  keys, playerPos, playerHeading, tryToggleCar, tryPickup, cycleRadio,
  updateHUD, updateDjjjHUD, msg, blip,
  djjjBuy, djjjSell, setStationSafe,
  get questIdx() { return questIdx; },
  set questIdx(v) { questIdx = v; },
});
installAPI();
document.getElementById('djjj-buy').addEventListener('pointerdown', e => { e.preventDefault(); djjjBuy(10); });
document.getElementById('djjj-sell').addEventListener('pointerdown', e => { e.preventDefault(); djjjSell(10); });
document.getElementById('djjj-buyall').addEventListener('pointerdown', e => { e.preventDefault(); djjjBuy(Math.floor(state.money / djjj.price)); });
document.getElementById('djjj-close').addEventListener('pointerdown', e => { e.preventDefault(); closeDjjjExchange(); });
document.getElementById('lora-close').addEventListener('pointerdown', e => {
  e.preventDefault();
  state.radio = -1;
  closeJesseRadio();
  $('radio-display').textContent = 'RADIO AUS';
  msg('LoRa aus. Radio aus.');
});
document.getElementById('sc-close').addEventListener('pointerdown', e => {
  e.preventDefault();
  state.radio = -1;
  closeJesseRadio();
  $('radio-display').textContent = 'RADIO AUS';
  msg('Jesse Jay FM aus. Radio aus.');
});
document.getElementById('lora-retry').addEventListener('pointerdown', e => {
  e.preventDefault();
  const a = loraAudio();
  loraStatus('Verbinde mit livestream.lora.ch ...');
  a.load();
  a.play().then(() => loraStatus('LIVE — Radio LoRa 97,5 Zürich')).catch(() => loraStatus('Autoplay blockiert — bitte Play drücken!'));
});
setProduceCallback(name => {
  state.money += 1000;
  state.missions++;
  updateHUD();
  msg(`🎧 Track „${name.toUpperCase()}“ produziert! +1000 Taler — mit R im Auto abspielen!`, 5000);
});

updateHUD();
updateDjjjHUD();
setQuestTarget();
msg('Wilkommen in Hotze City! Auftrag 1: PLATTEN SUCHEN — folg den goldnen Säulen!', 5000);
tick();

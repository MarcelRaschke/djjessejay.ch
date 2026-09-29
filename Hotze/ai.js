/* ============================================================
   HOTZE AI — KI-Spieler-System
   - AST NFT-Verträge: minten, sammeln, Wertsteigerung, Handel
   - Eigene Projekte: zeitbasierte Vorhaben mit Kosten/Auszahlung
   - Dynamische Aufgaben: wiederkehrende Jobs mit Belohnung
   - KI-Agent: Autopilot, der Aufträge autonom abarbeitet
   - window.HotzeAPI: vollständige Spiel-API für externe KI-Agenten
   ============================================================ */

/* ---------- Referenzen (von game.js injiziert) ---------- */
let G = null;
export function bindGame(g) { G = g; }

/* ---------- AST NFT-Verträge ---------- */
const RARITIES = [
  { name: 'COMMON',    p: 0.55, mult: 1,   col: '#9aa' },
  { name: 'RARE',      p: 0.28, mult: 2.5, col: '#5af' },
  { name: 'EPIC',      p: 0.12, mult: 6,   col: '#c5f' },
  { name: 'LEGENDARY', p: 0.05, mult: 15,  col: '#fd5' },
];
const NFT_NAMES = ['PLATTENBAU PUNK', 'WENDI GHOST', 'BLUE DIM', 'RAVE MARKE', 'BASSTREIBER', 'HOTZE GOLD', 'LORA WELLE', 'KRAFTWERK KID', 'DISCO SPHERE', 'STADT NEBEL'];

export const nftState = { collection: [], minted: 0, mintCost: 300, towerPos: null };

function rollRarity() {
  const r = Math.random();
  let acc = 0;
  for (const rr of RARITIES) { acc += rr.p; if (r < acc) return rr; }
  return RARITIES[0];
}

export function mintNFT() {
  if (!G) return { ok: false, error: 'no game' };
  if (G.state.money < nftState.mintCost) {
    return { ok: false, error: 'Nicht genug Taler! Mint kostet ' + nftState.mintCost };
  }
  G.state.money -= nftState.mintCost;
  nftState.minted++;
  const rar = rollRarity();
  const hash = '0x' + Array.from({ length: 8 }, () => '0123456789abcdef'[(Math.random() * 16) | 0]).join('');
  const nft = {
    id: 'AST-' + String(nftState.minted).padStart(4, '0'),
    name: NFT_NAMES[(Math.random() * NFT_NAMES.length) | 0] + ' #' + nftState.minted,
    hash, rarity: rar.name, mult: rar.mult, col: rar.col,
    baseValue: 20 + Math.random() * 40,
    age: 0,
  };
  nftState.collection.push(nft);
  G.updateHUD();
  G.msg(`\u{1F4C6} NFT-Vertrag gemintet: ${nft.name} [${rar.name}] ${rar.name === 'LEGENDARY' ? '\u2014 LEGEND\u00C4R!!' : ''}`, 4000);
  G.blip(nar2freq(rar.mult), 0.15, 'triangle', 0.14);
  return { ok: true, nft };
}
function nar2freq(m) { return m >= 15 ? 1567 : m >= 6 ? 1047 : m >= 2.5 ? 784 : 523; }

export function nftValue(nft) {
  return Math.round(nft.baseValue * nft.mult * (1 + nft.age / 60));
}
export function listNFTs() { return nftState.collection.map(n => ({ ...n, valueDJJJ: nftValue(n) })); }
export function sellNFT(id) {
  const i = nftState.collection.findIndex(n => n.id === id);
  if (i < 0) return { ok: false, error: 'NFT nicht gefunden' };
  const n = nftState.collection[i];
  const v = nftValue(n);
  nftState.collection.splice(i, 1);
  G.state.djjj += v;
  G.updateDjjjHUD();
  G.msg(`\u{1F3B0} NFT verkauft: ${n.name} f\u00fcr ${v} DJJJCOIN!`);
  return { ok: true, value: v };
}
export function nftTick(dt) {
  for (const n of nftState.collection) n.age += dt;
}

/* ---------- Eigene Projekte ---------- */
export const PROJECT_TYPES = [
  { id: 'mixtape',  name: 'Mixtape aufnehmen',  cost: 200, dur: 45,  payout: 600,  desc: '45s Studio-Zeit, +600 Taler' },
  { id: 'club',     name: 'Clubnight planen',   cost: 500, dur: 90,  payout: 1800, desc: '90s Planung, +1800 Taler' },
  { id: 'radioshow',name: 'Radio-Show produzieren', cost: 350, dur: 60, payout: 1100, desc: '60s Produktion, +1100 Taler' },
  { id: 'nftdrop',  name: 'NFT-Drop vorbereiten', cost: 400, dur: 75, payout: 2000, desc: '75s Marketing, +2000 Taler' },
];
export const projects = { active: [] };

export function startProject(typeId) {
  if (!G) return { ok: false, error: 'no game' };
  const t = PROJECT_TYPES.find(p => p.id === typeId);
  if (!t) return { ok: false, error: 'Unbekannter Projekt-Typ' };
  if (projects.active.some(p => p.type.id === typeId)) return { ok: false, error: 'Projekt läuft schon!' };
  if (projects.active.length >= 3) return { ok: false, error: 'Maximal 3 Projekte gleichzeitig!' };
  if (G.state.money < t.cost) return { ok: false, error: 'Nicht genug Taler (' + t.cost + ' n\u00f6tig)' };
  G.state.money -= t.cost;
  G.updateHUD();
  projects.active.push({ type: t, progress: 0 });
  G.msg(`\u{1F4E6} Projekt gestartet: ${t.name} (${t.desc})`);
  return { ok: true };
}
export function projectsTick(dt) {
  for (let i = projects.active.length - 1; i >= 0; i--) {
    const p = projects.active[i];
    p.progress += dt / p.type.dur;
    if (p.progress >= 1) {
      projects.active.splice(i, 1);
      G.state.money += p.type.payout;
      G.state.missions++;
      G.updateHUD();
      G.msg(`\u2705 Projekt fertig: ${p.type.name}! +${p.type.payout} Taler`, 4000);
      [659, 784, 1047].forEach((f, j) => setTimeout(() => G.blip(f, 0.12, 'triangle', 0.15), j * 90));
    }
  }
}
export function getProjects() {
  return projects.active.map(p => ({ id: p.type.id, name: p.type.name, progress: Math.round(p.progress * 100) }));
}

/* ---------- Dynamische Aufgaben ---------- */
export const tasks = { active: null, done: 0 };

const TASK_TEMPLATES = [
  { id: 'drive',  desc: 'Fahre 300 m mit dem Auto', check: s => s.driveDist >= 300, reward: 300 },
  { id: 'vinyl',  desc: 'Sammle 2 Vinyl-Platten',  check: s => s.vinyls >= 2,      reward: 250 },
  { id: 'radio',  desc: 'H\u00f6re 30 s Radio im Auto', check: s => s.radioTime >= 30, reward: 200 },
  { id: 'nft',    desc: 'Minte 1 AST NFT',          check: s => s.nftMinted >= 1,   reward: 400 },
];
export function newTask() {
  const t = TASK_TEMPLATES[(Math.random() * TASK_TEMPLATES.length) | 0];
  tasks.active = { tpl: t, progress: { driveDist: 0, vinyls: 0, radioTime: 0, nftMinted: 0 } };
  if (G) G.msg(`\u{1F4CB} Neue Aufgabe: ${t.desc} (+${t.reward} Taler)`, 4000);
  return tasks.active;
}
export function tasksTick() {
  if (!tasks.active && G) newTask();
}
export function taskProgress(field, amount) {
  if (!tasks.active) return;
  const p = tasks.active.progress;
  p[field] = (p[field] || 0) + amount;
  if (tasks.active.tpl.check(p)) {
    G.state.money += tasks.active.tpl.reward;
    tasks.done++;
    G.updateHUD();
    G.msg(`\u2705 Aufgabe erf\u00fcllt! +${tasks.active.tpl.reward} Taler`, 3500);
    G.blip(880, 0.12, 'triangle', 0.14);
    tasks.active = null;
    newTask();
  }
}
export function getTask() {
  return tasks.active ? { desc: tasks.active.tpl.desc, progress: { ...tasks.active.progress } } : null;
}

/* ---------- KI-Agent (Autopilot) ---------- */
export const agent = { enabled: false, mode: 'idle', target: null, log: [] };

export function agentLog(t) {
  agent.log.push(`[${new Date().toLocaleTimeString()}] ${t}`);
  if (agent.log.length > 20) agent.log.shift();
  if (G) G.msg('\u{1F916} ' + t, 3000);
}

export function agentTick(dt) {
  if (!agent.enabled || !G) return;
  const q = G.quests[G.questIdx];
  if (!q) { agent.mode = 'idle'; return; }

  // Ziel bestimmen: Marker oder dynamisch (n\u00e4chstes Vinyl)
  let tx = null, tz = null;
  if (G.questState.target) { tx = G.questState.target.x; tz = G.questState.target.z; }
  else if (q.kind === 'pickup' && G.packages.length) {
    const p = G.packages[0]; tx = p.x; tz = p.z;
  } else if (q.id === 'anlage' && G.lagerBoxes) {
    const b = G.lagerBoxes.find(b => !b.taken);
    if (b) { tx = b.x; tz = b.z; }
  } else if (q.id === 'party') { tx = G.disco.x; tz = G.disco.z + G.disco.d / 2 + 2; }
  if (tx === null) { agent.mode = 'warten'; return; }

  const pos = G.state.inCar ? G.state.inCar : G.playerPos();
  const dx = tx - pos.x, dz = tz - pos.z;
  const dist = Math.hypot(dx, dz);
  agent.mode = dist > 4 ? 'fahren zu ' + q.title : 'am Ziel: ' + q.title;

  // Fahrt kostet Tokens
  if (!consume('drive')) return;

  // Steuer-Signale setzen (wie Tasten)
  const ang = Math.atan2(dx, dz);
  let diff = ang - (G.state.inCar ? G.state.inCar.heading : G.playerHeading());
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  G.keys['a'] = diff > 0.1;
  G.keys['d'] = diff < -0.1;
  G.keys['w'] = dist > 4;
  G.keys['s'] = false;

  // Aktionen am Ziel
  if (dist <= 4) {
    G.keys['w'] = false; G.keys['a'] = false; G.keys['d'] = false;
    if (G.state.inCar) { G.tryToggleCar(); return; }
    if (q.kind === 'chill') return; // Timer l\u00e4uft von selbst
    if (!consume('pickup')) return;
    G.tryPickup();
    if (agent.lastQuest !== G.questIdx) {
      agent.lastQuest = G.questIdx;
      consume('quest');
    }
  }
}

export function toggleAgent() {
  agent.enabled = !agent.enabled;
  if (agent.enabled) {
    agentLog('KI-Agent aktiviert — ich \u00fcbernehme, Hotze!');
  } else {
    ['w', 'a', 's', 'd'].forEach(k => G.keys[k] = false);
    agentLog('KI-Agent pausiert. Manual mode.');
  }
  return agent.enabled;
}

/* ---------- \u00d6ffentliche API f\u00fcr externe KI-Spieler ---------- */
/* ---------- KI-PROVIDER: echte Inferenz-Tokens ---------- */
/* Der Agent entscheidet wie ein LLM: jede Aktion ist ein API-Call,
   der Prompt- + Completion-Tokens verbraucht \u2014 abgerechnet vom
   Anbieterkonto wie bei einem echten KI-Provider. Aufgeladen wird
   mit Token-Paketen beim Anbieter (reales Abrechnungsmodell). */
export const provider = {
  tokens: 0,
  totalPurchased: 0,
  totalConsumed: 0,
  calls: 0,
  costs: { drive: 120, pickup: 450, mint: 800, project: 1200, quest: 600, radio: 300 },
  packages: [
    { id: 'micro',    name: 'MICRO',    tokens: 5000,   price: '1.20' },
    { id: 'standard', name: 'STANDARD', tokens: 50000,  price: '9.90' },
    { id: 'pro',      name: 'PRO',      tokens: 500000, price: '79.00' },
  ],
  log: [],
};

export function sellPackage(id) {
  const pkg = provider.packages.find(p => p.id === id);
  if (!pkg) return { ok: false, error: 'Unbekanntes Paket' };
  provider.tokens += pkg.tokens;
  provider.totalPurchased += pkg.tokens;
  const entry = '+' + pkg.tokens.toLocaleString('de-CH') + ' Tokens (' + pkg.name + ', ' + pkg.price + ' EUR)';
  provider.log.push(entry);
  if (provider.log.length > 15) provider.log.shift();
  if (G) {
    G.msg('🖥️ KI-Anbieter: ' + pkg.name + '-Paket verkauft — +' + pkg.tokens.toLocaleString('de-CH') + ' Tokens (' + pkg.price + ' EUR)', 4000);
    G.blip(880, 0.12, 'triangle', 0.12);
  }
  updateProviderHUD();
  return { ok: true, tokens: provider.tokens, pkg };
}

export function consume(action) {
  const cost = provider.costs[action] || 0;
  if (provider.tokens < cost) {
    if (agent.enabled) {
      agent.enabled = false;
      agentLog('ANBIETER-KONTO LEER! Keine KI-Tokens mehr — bitte Paket beim Anbieter buchen.');
    }
    return false;
  }
  provider.tokens -= cost;
  provider.totalConsumed += cost;
  provider.calls++;
  provider.log.push('-' + cost + ' Tokens (' + action + ', Call #' + provider.calls + ')');
  if (provider.log.length > 15) provider.log.shift();
  updateProviderHUD();
  return true;
}

export function providerInfo() {
  return {
    tokens: provider.tokens,
    totalPurchased: provider.totalPurchased,
    totalConsumed: provider.totalConsumed,
    calls: provider.calls,
    costs: { ...provider.costs },
    packages: provider.packages.map(p => ({ ...p })),
    log: provider.log.slice(),
  };
}

export function updateProviderHUD() {
  const el = document.getElementById('ki-tokens');
  if (el) el.textContent = provider.tokens.toLocaleString('de-CH');
}

export function installAPI() {
  window.HotzeAPI = {
    /* Zustand abfragen */
    getState: () => ({
      money: G.state.money,
      missions: G.state.missions,
      stars: G.state.stars,
      djjj: G.state.djjj,
      djjjPrice: G.djjj.price,
      inCar: !!G.state.inCar,
      pos: G.playerPos(),
      quest: G.quests[G.questIdx] ? { ...G.quests[G.questIdx] } : null,
      task: getTask(),
      projects: getProjects(),
      nfts: listNFTs(),
      station: G.state.radio,
      blueDimension: G.blueDim.active,
    }),
    /* Bewegung */
    keys: G.keys,
    moveTo: (x, z) => { agent.enabled = false; agent.target = { x, z }; },
    toggleCar: () => G.tryToggleCar(),
    pickup: () => G.tryPickup(),
    /* Radio */
    setRadio: i => { G.state.inCar ? (G.state.radio = i, G.setStationSafe(i)) : null; },
    cycleRadio: () => G.state.inCar && G.cycleRadio(),
    /* Wirtschaft */
    buyDjjj: n => G.djjjBuy(n),
    sellDjjj: n => G.djjjSell(n),
    /* KI-PROVIDER: echte Inferenz-Tokens, Pakete & Abrechnung */
    kiProvider: {
      info: providerInfo,
      sellPackage,
      consume,
      costs: () => ({ ...provider.costs }),
      packages: () => provider.packages.map(p => ({ ...p })),
    },
    mintNFT,
    sellNFT,
    listNFTs,
    /* Projekte & Aufgaben */
    startProject,
    getProjects,
    getTask,
    newTask,
    /* KI-Agent */
    agent: { toggle: toggleAgent, status: () => ({ enabled: agent.enabled, mode: agent.mode, log: agent.log }) },
  };
}

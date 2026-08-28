'use strict';

const content = document.querySelector('#content');
const nav = [...document.querySelectorAll('.nav button')];

async function getJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 503 && response.status !== 501) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return { status: response.status, payload };
}

function statusClass(status = '') {
  return String(status).replace(/[^a-z0-9_]/gi, '_').toLowerCase();
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function card(title, body, className = '') {
  return `<article class="card ${className}"><h2>${esc(title)}</h2>${body}</article>`;
}

async function renderOverview() {
  const [sources, profile] = await Promise.all([
    getJson('/api/control-center/sources'),
    getJson('/api/control-center/profile')
  ]);
  const p = profile.payload.data;
  const connected = sources.payload.sources.filter(s => ['connected','catalogued','configured'].includes(s.status)).length;
  const pending = sources.payload.sources.length - connected;
  content.innerHTML = `<div class="grid">
    ${card('Artist', `<div class="value">${esc(p.artistName)}</div><p class="muted">${esc(p.location.city)} · active since ${esc(p.activeSince)}</p>`)}
    ${card('Source health', `<div class="value">${connected}/${sources.payload.sources.length}</div><p class="muted">${pending} source(s) require credentials or a verified endpoint.</p>`)}
    ${card('Radio identity', `<div class="value">${esc(p.radio.currentProjectIdentity)}</div><p class="muted">${esc(p.radio.station)} · ${esc(p.radio.frequencyBrand)}</p>`)}
    ${card('Genres', p.genres.map(g => `<span class="pill">${esc(g)}</span>`).join(''))}
    ${card('Real data sources', sources.payload.sources.map(s => `<div class="source"><strong>${esc(s.label)}</strong><span class="status ${statusClass(s.status)}">${esc(s.status)}</span><code>${esc(s.repository || s.path || s.note || s.type)}</code></div>`).join(''), 'full')}
    ${card('Authority rule', `<p class="muted">${esc(sources.payload.policy)}</p><p class="muted">Generated content is not treated as evidence.</p>`, 'wide')}
    ${card('Runtime truth', `<span class="pill ok">Repository data: live</span><span class="pill warn">GA: credential-gated</span><span class="pill warn">Radio live metadata: endpoint-gated</span><p class="muted">No synthetic listener counts, schedules, releases or analytics are displayed as factual.</p>`, 'wide')}
  </div>`;
}

async function renderCms() {
  const profile = (await getJson('/api/control-center/profile')).payload;
  content.innerHTML = `<div class="grid">
    ${card('Repository CMS', `<div class="value">Git-backed</div><p class="muted">Canonical structured profile is read directly from the deployed repository checkout.</p><p><a href="${esc(profile.data.urls.repository)}" target="_blank" rel="noopener">Open repository ↗</a></p>`, 'wide')}
    ${card('Canonical profile', `<span class="status connected">connected</span><p class="muted">artist-profile.json · P1 first-party repository evidence</p>`, 'wide')}
    ${card('Current canonical data', `<pre>${esc(JSON.stringify(profile.data, null, 2))}</pre>`, 'full')}
  </div>`;
}

async function renderRadio() {
  const data = (await getJson('/api/control-center/radio')).payload;
  const live = data.live || {};
  content.innerHTML = `<div class="grid">
    ${card('Blue Dimension', `<div class="value">${esc(data.identity.currentProjectIdentity)}</div><p class="muted">${esc(data.identity.station)} · Zürich · ${esc(data.identity.frequencyBrand)}</p>`, 'wide')}
    ${card('Live metadata', `<span class="status ${statusClass(live.status)}">${esc(live.status)}</span><p class="muted">Now Playing: ${live.nowPlaying == null ? 'not asserted' : esc(live.nowPlaying)}</p><p class="muted">Listeners: ${live.listeners == null ? 'not asserted' : esc(live.listeners)}</p><p class="muted">Schedule: ${live.schedule == null ? 'not asserted' : esc(live.schedule)}</p>`, 'wide')}
    ${card('Evidence guard', `<p class="muted">${esc(data.warning)}</p>`, 'full')}
  </div>`;
}

async function renderVisuals() {
  const data = (await getJson('/api/control-center/visuals')).payload;
  content.innerHTML = `<div class="grid">
    ${card('Google Drive catalogue', `<div class="value">${data.items.length}</div><p class="muted">Known asset references · runtime OAuth: ${data.authenticatedRuntimeAccess ? 'connected' : 'not connected'}</p>`, 'full')}
    ${data.items.map(item => card(item.name, `<span class="pill">${esc(item.kind)}</span><p class="muted">Drive ID<br><code>${esc(item.id)}</code></p><p><a href="${esc(item.sourceUrl)}" target="_blank" rel="noopener">Open source ↗</a></p>`, 'wide')).join('')}
  </div>`;
}

async function renderAnalytics() {
  const result = await getJson('/api/control-center/analytics');
  const data = result.payload;
  content.innerHTML = `<div class="grid">
    ${card('Google Analytics', `<span class="status ${statusClass(data.status)}">${esc(data.status)}</span><p class="muted">${esc(data.message || 'Property configuration exists; adapter is not yet returning metrics.')}</p>`, 'full')}
    ${card('Metrics policy', `<p class="muted">Real values appear only after a verified server-side GA connection. Until then this screen intentionally contains no pageviews, visitor counts, session duration or conversion estimates.</p>`, 'full')}
  </div>`;
}

function renderPending(label, description) {
  content.innerHTML = `<div class="grid">${card(label, `<span class="status not_connected">source mapping pending</span><p class="muted">${esc(description)}</p><p class="muted">This module will not manufacture records while no authoritative import source has been mapped.</p>`, 'full')}</div>`;
}

const views = {
  overview: renderOverview,
  cms: renderCms,
  music: () => renderPending('Music & Discography', 'Authoritative release/track source still needs to be selected from repository/SoundCloud metadata.'),
  radio: renderRadio,
  events: () => renderPending('Events', 'Event records require an evidence-backed source mapping before they become operational data.'),
  visuals: renderVisuals,
  analytics: renderAnalytics,
  audit: () => renderPending('Settings / Audit', 'Mutation audit and authenticated admin writes remain deliberately disabled in this read-only integration pass.')
};

async function activate(name) {
  nav.forEach(button => button.classList.toggle('active', button.dataset.view === name));
  content.innerHTML = '<div class="card full"><span class="status">loading verified data</span></div>';
  try {
    await views[name]();
  } catch (error) {
    content.innerHTML = `<div class="card full"><h2>Source error</h2><p class="muted">${esc(error.message)}</p></div>`;
  }
}

nav.forEach(button => button.addEventListener('click', () => activate(button.dataset.view)));
activate('overview');

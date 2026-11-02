import { UpdatesView } from './updates.mjs';
import { AudioCanvas } from './audio.mjs';
import { MotionArtwork } from './motion-artwork.mjs';
import { icon, hydrateIcons } from './icons.mjs';
import { resolveTheme } from './themes.mjs';
import { demoTelemetry, demoMedia } from './demo.mjs';
import { clamp, speedInUnits, gearLabel, durationLabel, arcPath, Trip } from './model.mjs';
import { previewApi } from './preview.mjs';
import { DECKS, DeckView, resolveDeck } from './decks.mjs';
import { demoMap } from './map.mjs';

const $ = id => document.getElementById(id);
const api = window.driveDeck || previewApi();
const nodes = Object.fromEntries([...document.querySelectorAll('[id]')].map(el => [el.id, el]));
let settings, live = { connected: false }, media = { available: false }, activeTheme;
let animationState={source:'cover',url:null,providers:{}},classicMotion;
let classicLevels;
let audioState = {available:false,bands:[]};
let mapState = { connected: false, roads: [], route: [], position: null }, deckView;
let displayList = [], panelTab = 'themes', previousFocus, saveQueue = Promise.resolve();
let demoStarted = performance.now(), demoPaused = false, demoTrack = 0, demoPosition = 67, demoLastTick = performance.now();
let smoothRpm = 0, smoothSpeed = 0, lastFrame = null, lastSlowFrame = 0, lastMediaRender = '';
let gaugeKey = '', toastTimer, hasEverConnected = false, fullscreen = false;
const liveTrip = new Trip(), demoTrip = new Trip();
const demoTracks = [demoMedia, { ...demoMedia, title: 'Coastline at dusk', artist: 'DriveDeck Studio', album: 'OPEN ROADS / VOL. 02', duration: 213 }, { ...demoMedia, title: 'One more corner', artist: 'DriveDeck Studio', album: 'AFTER HOURS / VOL. 01', duration: 196 }];

function text(id, value) { if (nodes[id].textContent !== String(value)) nodes[id].textContent = value; }
function toast(message, error = false) {
  if (!message) return;
  clearTimeout(toastTimer); text('toast', message); $('toast').classList.toggle('error', error); $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, error ? 6500 : 3200);
}
async function save(patch, message) {
  const job = saveQueue.then(async () => {
    text('save-status', 'Saving…');
    try {
      const result = await api.updateSettings(patch);
      if (!result?.ok) { text('save-status', 'Could not save changes'); toast(result?.error || 'Could not save changes.', true); return false; }
      applySettings(result.settings);
      text('save-status', 'All changes saved'); if (message) toast(message); return true;
    } catch (error) { text('save-status', 'Could not save changes'); toast(error.message, true); return false; }
  });
  saveQueue = job.catch(() => {}); return job;
}

function deckCards() {
  $('deck-grid').innerHTML = DECKS.map(deck => `<button class="deck-choice" data-deck-choice="${deck.id}" aria-label="Choose ${deck.name}"><img src="assets/decks/${deck.id}.png" alt="${deck.name} dashboard preview"><div><strong>${deck.name}</strong><small>${deck.note}</small></div></button>`).join('');
}

// Preserve legacy saved widget layouts without exposing retired customization controls.
function applyWidgetLayout() {
  for (const widget of ['media','vehicle','journey']) $(`${widget}-widget`).hidden = !settings.widgets.includes(widget);
  for (const widget of settings.widgets) $('widgets').append($(`${widget}-widget`));
  $('dashboard-grid')?.classList.toggle('no-widgets', !settings.widgets.length);
  document.querySelector('.dashboard-grid').style.gridTemplateColumns = !settings.widgets.length ? '1fr' : '';
  $('widgets').style.display = !settings.widgets.length ? 'none' : '';
}

function applyTheme(vehicleId) {
  const theme = resolveTheme(settings, vehicleId);
  if (activeTheme?.id === theme.id && activeTheme?.accent === theme.accent && activeTheme?.name === theme.name && activeTheme?.automatic === theme.automatic) return;
  activeTheme = theme;
  $('app').dataset.theme = theme.id;
  $('app').style.setProperty('--accent', theme.accent);
  const rgb = [1, 3, 5].map(offset => parseInt(theme.accent.slice(offset, offset + 2), 16)).join(',');
  $('app').style.setProperty('--accent-rgb', rgb);
  text('brand-name', theme.name); text('brand-tagline', theme.tagline); text('brand-emblem', theme.emblem);
  text('theme-mode', theme.automatic ? 'VEHICLE MATCHED' : settings.autoTheme ? 'AUTO · WAITING FOR A MATCH' : 'MANUAL THEME');
  document.querySelectorAll('[data-theme-choice]').forEach(button => {
    button.classList.toggle('selected', button.dataset.themeChoice === theme.id);
    button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme.id));
  });
  text('profile-subtitle', theme.id === 'custom' ? 'A cockpit with your signature.' : theme.description);
}

function applySettings(next) {
  const demoChanged = settings && settings.demo !== next.demo;
  settings = next;
  $('animated-artwork').checked=settings.animatedArtwork;
  $('canvas-enabled').checked=settings.canvasEnabled; $('apple-enabled').checked=settings.appleEnabled;
  $('animation-first').value=settings.animationOrder?.[0]||'canvas';
  $('animation-effective-order').textContent=(!settings.animatedArtwork?[]:(settings.animationOrder||['canvas','apple']).filter(source=>source==='canvas'?settings.canvasEnabled:settings.appleEnabled).map(source=>source==='canvas'?'Spotify Canvas':'Apple Music')).concat('Album cover').join(' → ');
  if (demoChanged) { smoothRpm = 0; smoothSpeed = 0; lastMediaRender = ''; }
  $('app').dataset.layout = settings.layout;
  $('app').dataset.deck = settings.deck;
  text('deck-library-name',DECKS.find(d=>d.id===settings.deck)?.name||'Deck library');
  $('auto-deck').checked = settings.autoDeck;
  $('demo-drive-mode').value = settings.demoDriveMode;
  $('demo-mode-control').hidden = !settings.demo;
  $('map-terrain').checked = settings.mapTerrain;
  $('atlas-view').value = settings.atlasView;
  $('map-appearance').value = settings.mapAppearance;
  $('map-heading').checked = settings.mapHeadingUp;
  $('map-zoom').value = settings.mapZoom;
  document.querySelectorAll('[data-deck-choice]').forEach(button => { button.classList.toggle('selected', button.dataset.deckChoice === settings.deck); button.setAttribute('aria-pressed', String(button.dataset.deckChoice === settings.deck)); });
  $('app').style.setProperty('--brightness', String(settings.brightness / 100));
  text('speed-unit', settings.units === 'kmh' ? 'KM/H' : 'MPH');
  $('unit-button').innerHTML = `${settings.units === 'kmh' ? 'KM/H' : 'MPH'} ${icon('swap')}`;
  text('trip-unit', settings.units === 'kmh' ? 'KM' : 'MI');
  document.querySelectorAll('#layout-switch [data-layout]').forEach(button => { button.classList.toggle('selected', button.dataset.layout === settings.layout); button.setAttribute('aria-pressed', String(button.dataset.layout === settings.layout)); });
  $('demo-toggle').checked = settings.demo;
  $('always-on-top').checked = settings.alwaysOnTop;
  for (const [id, key] of [['max-rpm', 'maxRpm'], ['redline', 'redline'], ['udp-port', 'port'], ['brightness', 'brightness'], ['units-select', 'units']]) {
    if (document.activeElement !== $(id)) $(id).value = settings[key];
  }
  text('brightness-value', `${settings.brightness}%`);
  $('demo-button').classList.toggle('demo-active', settings.demo);
  $('demo-button').setAttribute('aria-pressed', String(settings.demo));
  $('demo-badge').hidden = !settings.demo; $('demo-footer').hidden = !settings.demo;
  activeTheme = null; applyTheme(settings.demo ? null : live.connected ? live.vehicleId : null);
  applyWidgetLayout();
  if (demoChanged && settings.demo) { demoStarted = performance.now(); demoLastTick = performance.now(); demoPosition = 67; demoPaused = false; }
}

function buildGauge(maxRpm, redline) {
  const key = `${maxRpm}:${redline}`; if (gaugeKey === key) return; gaugeKey = key;
  $('tach-track').setAttribute('d', arcPath(135, 405));
  const startRed = 135 + clamp(redline / maxRpm, 0, 1) * 270;
  $('tach-redline').setAttribute('d', arcPath(startRed, 405));
  let ticks = '', labels = '';
  const divisions = Math.ceil(maxRpm / 1000);
  const labelEvery = divisions > 12 ? 2 : 1;
  const tickCount = divisions * 5;
  for (let i = 0; i <= tickCount; i++) {
    const ratio = i / tickCount, angle = (135 + ratio * 270) * Math.PI / 180;
    const major = i % 5 === 0, radius = major ? 112 : 117;
    const red = ratio * maxRpm >= redline;
    ticks += `<line class="tach-tick ${major ? 'major' : ''} ${red ? 'red' : ''}" x1="${160 + radius * Math.cos(angle)}" y1="${163 + radius * Math.sin(angle)}" x2="${160 + 122 * Math.cos(angle)}" y2="${163 + 122 * Math.sin(angle)}"/>`;
    if (major && (i / 5) % labelEvery === 0) labels += `<text class="tach-label ${red ? 'red' : ''}" x="${160 + 96 * Math.cos(angle)}" y="${163 + 96 * Math.sin(angle)}">${(ratio * maxRpm / 1000).toFixed(maxRpm % 1000 ? 1 : 0)}</text>`;
  }
  $('tach-ticks').innerHTML = ticks; $('tach-labels').innerHTML = labels;
}

function currentDemoMedia(now) {
  const track = demoTracks[demoTrack % demoTracks.length];
  if (!demoPaused) demoPosition = (demoPosition + Math.max(0, (now - demoLastTick) / 1000)) % track.duration;
  demoLastTick = now;
  return { ...track, position: demoPosition, playing: !demoPaused };
}

function renderMedia(current, isDemo, now) {
  const available = current.available;
  const key = JSON.stringify([isDemo, available, current.title, current.artist, current.album, current.playing, current.source, current.artwork, current.canToggle, current.canNext, current.canPrevious]);
  if (key !== lastMediaRender) {
    lastMediaRender = key;
    text('track-title', available ? current.title || 'Untitled track' : 'Bring your soundtrack.');
    text('track-artist', available ? current.artist || 'Unknown artist' : 'Play something in your favorite app.');
    text('track-album', available ? current.album || 'WINDOWS MEDIA SESSION' : 'Spotify · browsers · Windows players');
    text('media-source', isDemo ? 'SILENT DEMO' : available ? friendlySource(current.source) : 'WINDOWS MEDIA');
    text('playing-indicator', available ? current.playing ? 'PLAYING' : 'PAUSED' : 'IDLE');
    $('album-art').classList.toggle('demo-art', isDemo);
    $('album-equalizer').classList.toggle('playing', !!current.playing);
    $('media-toggle').innerHTML = icon(current.playing ? 'pause' : 'play');
    $('media-toggle').setAttribute('aria-label', current.playing ? 'Pause' : 'Play');
    $('media-toggle').disabled = !available || !current.canToggle;
    $('media-next').disabled = !available || !current.canNext;
    $('media-previous').disabled = !available || !current.canPrevious;
    const safeArtwork = typeof current.artwork === 'string' && /^data:image\/(png|jpeg|webp|bmp|gif);base64,[A-Za-z0-9+/=]+$/.test(current.artwork) && current.artwork.length < 1500000;
    $('album-image').hidden = !safeArtwork;
    if (safeArtwork) $('album-image').src = current.artwork; else $('album-image').removeAttribute('src');
    text('media-helper-status', media.error ? media.error : media.available ? `Connected to ${friendlySource(media.source)}. Playback controls depend on the player.` : 'Windows media is ready. Start playback in a compatible media app.');
  }
  const duration = available && Number.isFinite(current.duration) ? Math.max(0, current.duration) : 0;
  const position = available ? clamp((current.position || 0) + (!isDemo && current.playing && current.updatedAt ? Math.max(0, (Date.now() - current.updatedAt) / 1000) : 0), 0, duration) : 0;
  $('media-progress').style.width = `${duration ? (position / duration) * 100 : 0}%`;
  text('media-position', durationLabel(position)); text('media-duration', durationLabel(duration));
}

function renderAnimationStatus(){
  const state=animationState,providers=state.providers||{};
  $('animation-status').textContent=[state.message||'Regular album cover',providers.canvas?`Spotify Canvas: ${providers.canvas}`:'',providers.apple?`Apple Music: ${providers.apple}`:''].filter(Boolean).join('\n');
  $('remove-canvas-clip').disabled=!state.hasCanvasClip; $('open-animation-source').disabled=!state.pageUrl;
}
function friendlySource(source = '') {
  const value = source.toLowerCase();
  if (value.includes('spotify')) return 'SPOTIFY';
  if (value.includes('chrome')) return 'CHROME';
  if (value.includes('msedge')) return 'EDGE';
  if (value.includes('firefox')) return 'FIREFOX';
  if (value.includes('vlc')) return 'VLC';
  return 'WINDOWS MEDIA';
}

function renderSlow(data, now) {
  const connected = data.connected;
  applyTheme(settings.demo ? null : connected ? data.vehicleId : null);
  const theme = activeTheme;
  text('vehicle-name', connected && data.vehicleName ? data.vehicleName : 'BeamNG.drive');
  text('profile-title', `${theme.name} / ${settings.layout.toUpperCase()}`);
  text('connection-label', settings.demo ? 'DEMO DRIVE' : live.connected ? 'BEAMNG CONNECTED' : live.error ? 'CONNECTION ISSUE' : 'WAITING FOR BEAMNG');
  $('status-dot').className = `status-dot ${settings.demo ? 'demo' : live.connected ? 'connected' : ''}`;
  $('waiting-overlay').hidden = connected;
  if (live.connected) hasEverConnected = true;
  text('telemetry-caption', settings.demo ? 'SIMULATED DATA' : live.connected ? `${live.protocol || 'OUTGAUGE'} · LIVE` : 'AWAITING TELEMETRY');
  text('footer-status', settings.demo ? 'Demo drive · silent sample media' : live.error ? live.error : live.connected ? `Local telemetry · ${live.received} packets received` : hasEverConnected ? 'Telemetry disconnected · waiting to reconnect' : 'Waiting for your next drive');
  text('settings-connection-status', live.connected ? 'BeamNG connected' : live.error ? 'Connection issue' : 'Waiting for BeamNG');
  text('settings-connection-detail', live.error || `127.0.0.1:${live.port || settings.port} · ${live.received || 0} packets received`);
  text('gear-value', connected ? gearLabel(data.gear) : '—');
  text('drive-description', !connected ? 'READY WHEN YOU ARE' : data.gear === 0 ? 'NEUTRAL' : data.gear === -1 ? 'REVERSE' : settings.layout === 'sport' ? 'PERFORMANCE MODE' : 'ENJOY THE DRIVE');
  text('fuel-value', connected && Number.isFinite(data.fuel) ? Math.round(data.fuel * 100) : '—');
  $('fuel-bar').style.width = `${connected && Number.isFinite(data.fuel) ? clamp(data.fuel * 100, 0, 100) : 0}%`;
  text('temperature-value', connected && Number.isFinite(data.engineTemp) ? Math.round(data.engineTemp) : '—');
  const throttle = connected && Number.isFinite(data.throttle) ? data.throttle : null;
  const brake = connected && Number.isFinite(data.brake) ? data.brake : null;
  $('throttle-bar').style.width = `${(throttle || 0) * 100}%`; $('brake-bar').style.width = `${(brake || 0) * 100}%`;
  text('throttle-value', throttle === null ? '—' : `${Math.round(throttle * 100)}%`);
  text('brake-value', brake === null ? '—' : `${Math.round(brake * 100)}%`);
  const lights = connected ? data.lights || {} : {};
  $('signal-left').classList.toggle('lit', !!lights.left); $('signal-right').classList.toggle('lit', !!lights.right); $('high-beam').classList.toggle('lit', !!lights.highBeam);
  const warnings = [];
  if (lights.handbrake) warnings.push('PARKING BRAKE');
  if (lights.oil) warnings.push('OIL PRESSURE');
  if (lights.battery) warnings.push('BATTERY');
  if (lights.abs) warnings.push('ABS');
  if (lights.traction) warnings.push('TRACTION CONTROL');
  if (connected && data.fuel < .1) warnings.push('LOW FUEL');
  if (connected && data.engineTemp > 115) warnings.push('COOLANT TEMP');
  text('warning-text', !connected ? 'NO VEHICLE DATA' : warnings.length ? warnings.join(' · ') : 'SYSTEMS NORMAL');
  document.querySelector('.warning-area').classList.toggle('warning', warnings.length > 0);
  const trip = settings.demo ? demoTrip : liveTrip;
  text('trip-value', (trip.meters / (settings.units === 'kmh' ? 1000 : 1609.344)).toFixed(1));
  text('trip-time', durationLabel(trip.seconds));
  renderMedia(settings.demo ? currentDemoMedia(now) : media, settings.demo, now);
  text('clock', new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()));
}

function frame(now) {
  const dt = lastFrame === null ? 16 : Math.min(100, now - lastFrame); lastFrame = now;
  const demo = settings.demo;
  const data = demo ? demoTelemetry((now - demoStarted) / 1000) : live;
  const effectiveDeck = resolveDeck(settings, data);
  $('app').dataset.deck = effectiveDeck;
  liveTrip.update(live, now); if (demo) demoTrip.update(data, now);
  const maxRpm = !demo && data.connected && Number.isFinite(data.maxRpm) && data.maxRpm >= 1000 ? data.maxRpm : settings.maxRpm;
  const redline = Math.min(settings.redline, maxRpm);
  buildGauge(maxRpm, redline);
  const mix = 1 - Math.exp(-dt / 110);
  smoothRpm += ((data.connected ? data.rpm || 0 : 0) - smoothRpm) * mix;
  smoothSpeed += ((data.connected ? speedInUnits(data.speedMps || 0, settings.units) : 0) - smoothSpeed) * mix;
  classicMotion.update(animationState,media,!settings.demo&&settings.animatedArtwork&&effectiveDeck==='classic');
  deckView.update({ animation:animationState, settings, data, audio: audioState, map: demo ? demoMap((now - demoStarted) / 1000) : mapState,
    media: demo ? currentDemoMedia(now) : media, rpm: smoothRpm, speed: smoothSpeed, maxRpm,
    trip: demo ? demoTrip : liveTrip, now });
  text('speed-value', data.connected ? Math.round(smoothSpeed) : '—');
  text('rpm-value', data.connected ? (smoothRpm / 1000).toFixed(1) : '—');
  const ratio = clamp(smoothRpm / maxRpm, .00001, 1);
  $('tach-progress').setAttribute('d', arcPath(135, 135 + ratio * 270));
  $('tach-needle').style.transform = `rotate(${225 + ratio * 270}deg)`;
  document.querySelectorAll('.sport-revs i').forEach((bar, index) => { bar.classList.toggle('on', data.connected && ratio >= (index + 1) / 28); bar.classList.toggle('red', (index + 1) / 28 >= redline / maxRpm); });
  $('app').classList.toggle('shift-flash', data.connected && smoothRpm >= redline && Math.floor(now / 180) % 2 === 0);
  if (now - lastSlowFrame > 90) { lastSlowFrame = now; renderSlow(data, now); }
  requestAnimationFrame(frame);
}

function openPanel(tab) {
  previousFocus = document.activeElement; panelTab = tab;
  $('settings-panel').hidden = false; $('panel-backdrop').hidden = false;
  document.querySelectorAll('[data-tab]').forEach(button => { button.classList.toggle('selected', button.dataset.tab === tab); button.setAttribute('aria-selected', String(button.dataset.tab === tab)); });
  for (const name of ['themes', 'connection', 'display']) $(`tab-${name}`).hidden = name !== tab;
  text('panel-title', tab === 'themes' ? 'Your cockpit.' : tab === 'connection' ? 'Let’s get connected.' : 'Find your place.');
  $('panel-close').focus();
  if (tab === 'display') void refreshDisplays();
}
function closePanel() { $('settings-panel').hidden = true; $('panel-backdrop').hidden = true; previousFocus?.focus(); }
async function refreshDisplays() {
  try { displayList = await api.getDisplays(); renderDisplays(); } catch (error) { toast(error.message, true); }
}
function renderDisplays() {
  $('display-list').replaceChildren();
  if (!displayList.length) {
    const p = document.createElement('p'); p.className = 'section-description'; p.textContent = 'Display selection is available in the Windows desktop app.'; $('display-list').append(p); return;
  }
  for (const display of displayList) {
    const button = document.createElement('button'); button.className = `display-card ${display.id === settings.displayId ? 'selected' : ''}`;
    const iconSpan = document.createElement('span'); iconSpan.innerHTML = icon('monitor');
    const copy = document.createElement('div'), name = document.createElement('strong'), detail = document.createElement('small'), hint = document.createElement('span');
    name.textContent = display.label; detail.textContent = `${display.width} × ${display.height}${display.primary ? ' · Primary display' : ''}`; hint.textContent = display.width / display.height > 3 ? 'ULTRAWIDE' : 'OPEN HERE';
    copy.append(name, detail); button.append(iconSpan, copy, hint);
    button.addEventListener('click', async () => { const result = await api.moveToDisplay(display.id); if (!result?.ok) toast(result?.error, true); else { toast(`Cockpit moved to ${display.label}.`); closePanel(); } });
    $('display-list').append(button);
  }
}

async function playback(action) {
  if (settings.demo) {
    if (action === 'toggle') { currentDemoMedia(performance.now()); demoPaused = !demoPaused; }
    if (action === 'next') { demoTrack++; demoPosition = 0; demoLastTick = performance.now(); }
    if (action === 'previous') { demoTrack = (demoTrack + demoTracks.length - 1) % demoTracks.length; demoPosition = 0; demoLastTick = performance.now(); }
    lastMediaRender = ''; return;
  }
  const result = await api.mediaCommand(action); if (!result?.ok) toast(result?.error || 'Media control unavailable.', true);
}

async function seekMedia(seconds){
 if(settings.demo){demoPosition=clamp(seconds,0,demoTracks[demoTrack%demoTracks.length].duration);demoLastTick=performance.now();return;}
 const result=await api.seekMedia(seconds);if(!result?.ok)toast(result?.error||'Seeking is unavailable for this player.',true);
}

function bindEvents() {
  $('deck-library-button').onclick = () => { $('deck-library').showModal(); $('deck-library-close').focus(); };
  $('deck-library-close').onclick=()=>$('deck-library').close();
  $('deck-library-open').onclick=()=>{closePanel();$('deck-library').showModal();};
  $('deck-library').onclick=e=>{if(e.target===$('deck-library'))$('deck-library').close();};
  document.querySelectorAll('[data-deck-choice]').forEach(button => { button.onclick = async () => {if(await save({ deck: button.dataset.deckChoice, autoDeck: false }))$('deck-library').close();}; });
  $('auto-deck').onchange = event => save({ autoDeck: event.target.checked });
  $('demo-drive-mode').onchange = event => save({ demoDriveMode: event.target.value });
  $('map-terrain').onchange = event => save({mapTerrain:event.target.checked});
  $('atlas-view').onchange = event => save({atlasView:event.target.value});
  $('map-appearance').onchange = event => save({ mapAppearance: event.target.value });
  $('map-heading').onchange = event => save({ mapHeadingUp: event.target.checked });
  $('map-zoom').onchange = event => save({ mapZoom: Number(event.target.value) });
  $('deck-design-button').onclick = () => openPanel('themes'); $('deck-connect-button').onclick = () => openPanel('connection'); $('deck-display-button').onclick = () => openPanel('display'); $('deck-demo-button').onclick = () => save({ demo: !settings.demo });
  $('install-companion').onclick = async () => { const result=await api.installCompanion(); if(result.ok)toast('Companion installed. Enable Other UDP protocols in BeamNG and restart the game.');else if(!result.canceled)toast(result.error,true); };
  $('themes-button').onclick = () => openPanel('themes'); $('brand-button').onclick = () => openPanel('themes');
  $('settings-button').onclick = () => openPanel('connection'); $('connection-button').onclick = () => openPanel('connection');
  $('media-view-button').onclick = () => openPanel('connection'); $('display-button').onclick = () => openPanel('display');
  $('dashboard-button').onclick = closePanel; $('panel-close').onclick = closePanel; $('panel-backdrop').onclick = closePanel;
  document.querySelectorAll('[data-tab]').forEach(button => { button.onclick = () => openPanel(button.dataset.tab); });
  document.querySelectorAll('#layout-switch [data-layout]').forEach(button => { button.onclick = () => save({ layout: button.dataset.layout }); });
  $('animated-artwork').onchange=event=>save({animatedArtwork:event.target.checked});
  $('canvas-enabled').onchange=event=>save({canvasEnabled:event.target.checked});
  $('apple-enabled').onchange=event=>save({appleEnabled:event.target.checked});
  $('animation-first').onchange=event=>save({animationOrder:event.target.value==='apple'?['apple','canvas']:['canvas','apple']});
  for(const [id,method]of [['add-canvas-clip','addCanvasClip'],['remove-canvas-clip','removeCanvasClip'],['retry-animation','retryAnimation'],['open-animation-source','openAnimationSource']])$(id).onclick=async()=>{const result=await api[method]();if(!result?.ok&&!result?.canceled)toast(result?.error||'This action is unavailable.',true);};
  $('demo-toggle').onchange = event => save({ demo: event.target.checked });
  $('always-on-top').onchange = event => save({ alwaysOnTop: event.target.checked });
  $('demo-button').onclick = () => save({ demo: !settings.demo }); $('start-demo').onclick = () => save({ demo: true });
  $('max-rpm').onchange = event => { const n = Number(event.target.value); if (n >= 1000 && n <= 30000) void save({ maxRpm: n }); else toast('Choose an RPM scale from 1,000 to 30,000.', true); };
  $('redline').onchange = event => { const n = Number(event.target.value); if (n >= 500 && n <= settings.maxRpm) void save({ redline: n }); else toast('Redline must be between 500 and your RPM scale.', true); };
  $('apply-port').onclick = () => { const port = Number($('udp-port').value); if (Number.isInteger(port) && port >= 1024 && port <= 65535) void save({ port }, `Listening on UDP ${port}. Match this port in BeamNG.`); else toast('Choose a UDP port between 1024 and 65535.', true); };
  $('brightness').oninput = event => { $('app').style.setProperty('--brightness', event.target.value / 100); text('brightness-value', `${event.target.value}%`); };
  $('brightness').onchange = event => save({ brightness: Number(event.target.value) });
  $('units-select').onchange = event => { smoothSpeed = 0; void save({ units: event.target.value }); };
  $('unit-button').onclick = () => { smoothSpeed = 0; void save({ units: settings.units === 'mph' ? 'kmh' : 'mph' }); };
  $('reset-trip').onclick = () => { (settings.demo ? demoTrip : liveTrip).reset(); toast('This drive has been reset.'); };
  $('media-toggle').onclick = () => playback('toggle'); $('media-next').onclick = () => playback('next'); $('media-previous').onclick = () => playback('previous');
  $('resolution-preset').onchange=e=>{if(e.target.value==='custom')return;const [w,h]=e.target.value.split('x');$('resolution-width').value=w;$('resolution-height').value=h;};
  for(const id of ['resolution-width','resolution-height'])$(id).oninput=()=>$('resolution-preset').value='custom';
  $('resolution-apply').onclick=async()=>{if(!api.setResolution)return toast('Window resizing is available in the desktop app.',true);const result=await api.setResolution(Number($('resolution-width').value),Number($('resolution-height').value));toast(result.ok?'Window resolution applied.':result.error,!result.ok);};
  $('fullscreen-button').onclick = () => api.toggleFullscreen(); $('panel-fullscreen').onclick = () => api.toggleFullscreen();
  $('refresh-displays').onclick = refreshDisplays; $('minimize-button').onclick = () => api.minimize(); $('close-button').onclick = () => api.close();
  for (const [id, method, message] of [['export-settings', 'exportSettings', 'Setup exported.'], ['import-settings', 'importSettings', 'Setup imported.'], ['open-companion', 'openCompanion', null]]) {
    $(id).onclick = async () => { const result = await api[method](); if (result?.ok) { if (result.settings) applySettings(result.settings); if (message) toast(message); } else if (!result?.canceled) toast(result?.error, true); };
  }
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('settings-panel').hidden) { event.preventDefault(); closePanel(); }
    if (event.key === 'Tab' && !$('settings-panel').hidden) {
      const elements = [...$('settings-panel').querySelectorAll('button:not(:disabled),input,select,summary')].filter(el => el.getClientRects().length);
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
}

async function boot() {
  hydrateIcons(); deckCards();
  classicLevels=new AudioCanvas($('classic-levels'),6);
  deckView = new DeckView($('deck-stage'), { playback, seek:seekMedia, atlasView:()=>save({atlasView:settings.atlasView==='3d'?'2d':'3d'}), civettaPage:value=>save({civettaPage:value}), miniPlayerView:value=>save({miniPlayerView:value}), animationFailed:(source,key)=>api.animationFailed?.(source,key), audioView: value => save({audioView:value}), songVisualizer: () => save({songVisualizer:!settings.songVisualizer}), zoom: factor => save({ mapZoom: clamp(settings.mapZoom * factor, .4, 3) }), compass: () => save({ mapHeadingUp: !settings.mapHeadingUp }) });
  classicMotion=new MotionArtwork($('album-motion'),(source,key)=>api.animationFailed?.(source,key));
  const revs = document.createElement('div'); revs.className = 'sport-revs'; revs.setAttribute('aria-hidden', 'true'); revs.innerHTML = '<i></i>'.repeat(28); document.querySelector('.cluster').append(revs);
  api.onTelemetry(value => { live = value; }); api.onMedia(value => { media = value; }); api.onSettings(applySettings);
  api.onAnimation?.(value=>{animationState=value;renderAnimationStatus();});
  api.onAudio?.(value => { audioState = value; });
  api.onMap?.(patch => { if (patch.mapId && patch.mapId !== mapState.mapId) mapState = { roads: [], route: [], terrain:null, position: null, connected: false }; mapState = { ...mapState, ...patch }; });
  api.onFullscreen(value => { fullscreen = value; $('app').dataset.fullscreen = String(value); $('fullscreen-button').innerHTML = `${icon('expand')} ${value ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}`; });
  const updateView=new UpdatesView(api);
  const initial = await api.bootstrap(); live = initial.telemetry || live; media = initial.media || media; displayList = initial.displays || []; fullscreen = initial.fullscreen;
  let mobileRunning=false;
  function showMobile(state){mobileRunning=!!state.running;$('mobile-toggle').textContent=mobileRunning?'Stop phone dashboard':'Start phone dashboard';$('mobile-links').replaceChildren();if(state.error)$('mobile-links').textContent=state.error;else if(mobileRunning){if(!state.codes?.length)$('mobile-links').textContent='Connect this PC to Wi-Fi or Ethernet, then restart sharing.';for(const code of state.codes||[]){const row=document.createElement('figure');row.className='mobile-pairing';const image=document.createElement('img');image.src=code.image;image.alt='Scan with your phone camera to open DriveDeck';image.width=320;image.height=320;const caption=document.createElement('figcaption');caption.textContent='PC address: '+code.address;const key=document.createElement('input');key.readOnly=true;key.value=code.pairingCode;key.setAttribute('aria-label','Phone pairing code');key.style.width='100%';key.onclick=()=>key.select();const keyLabel=document.createElement('p');keyLabel.textContent='Pairing code · enter this on the phone Connect screen';row.append(image,caption,keyLabel,key);$('mobile-links').append(row);}}}
  if(api.openMobileInstructions)$('mobile-instructions').onclick=()=>api.openMobileInstructions();
  if(api.mobileStatus){showMobile(await api.mobileStatus());$('mobile-toggle').onclick=async()=>{const button=$('mobile-toggle');button.disabled=true;try{showMobile(await (mobileRunning?api.stopMobile():api.startMobile()));}finally{button.disabled=false;}};}
  animationState=initial.animation||animationState;renderAnimationStatus();
  updateView.render(initial.updates);updateView.currentRelease=initial.currentRelease;if(initial.showInstalledNotes)updateView.showInstalled(initial.currentRelease);
  audioState = initial.audio || audioState;
  mapState = initial.map || mapState;
  $('app').dataset.fullscreen = String(!!fullscreen);
  $('resolution-width').value=initial.settings.windowWidth||1560;$('resolution-height').value=initial.settings.windowHeight||650;const selectedSize=$('resolution-width').value+'x'+$('resolution-height').value;$('resolution-preset').value=[...$('resolution-preset').options].some(o=>o.value===selectedSize)?selectedSize:'custom';
  applySettings(initial.settings); text('app-version', `VERSION ${initial.version}`); bindEvents();
  $('app').dataset.ready = 'true'; requestAnimationFrame(frame);
}
boot().catch(error => { console.error(error); toast(`DriveDeck could not start: ${error.message}`, true); });

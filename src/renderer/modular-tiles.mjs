import { tileVisualizerEnabled } from './modular-layout.mjs';
import { AudioCanvas } from './audio.mjs';
import { MapCanvas } from './map.mjs';
import { clamp, gearLabel } from './model.mjs';
import { LyricsView, lyricPosition } from './lyrics.mjs';
import { MotionArtwork } from './motion-artwork.mjs';
import { martinDial, drawMartinSweep, martinPressures } from './martin.mjs';
import { m235Markup, updateM235 } from './m235.mjs';
import { cleanDrivetrain, updateClean } from './plaid-clean.mjs';
import { stabilityMarkup, updateStability, moveCleanWheels } from './stability.mjs';
import { PlaidWarp } from './plaid-warp.mjs';
import { resolveDriveMode } from './drive-mode.mjs';
import { drivingVehicle } from './tesla.mjs';
import { SurroundingsView, surroundingPosition } from './surroundings.mjs';
import { icon } from './icons.mjs';
import { vehicleVisual } from './vehicle-identity.mjs';
import { civettaMarkup, updateCivetta } from './civetta.mjs';
import { homosexualMarkup, updateHomosexual, PlanarG } from './homosexual.mjs';
import { iadnuyhMarkup, updateIadnuyh } from './iadnuyh.mjs';

const clusters = {
  m235: [m235Markup, updateM235],
  civetta: [civettaMarkup, updateCivetta],
  luce: [homosexualMarkup, updateHomosexual],
  compass: [iadnuyhMarkup, updateIadnuyh],
};

// Scope SVG gradients and other local references for each copy of a module.
function scopeIds(root, prefix) {
  const ids = Object.fromEntries([...root.querySelectorAll('[id]')].map(node => [node.id, node]));
  for (const [id, node] of Object.entries(ids)) node.id = prefix + id;
  for (const node of root.querySelectorAll('*')) {
    for (const { name, value } of [...node.attributes]) {
      const updated = value.replace(/url\(#([\w-]+)\)/g, (original, id) => ids[id] ? `url(#${prefix}${id})` : original);
      if (value[0] === '#' && /^(?:xlink:)?href$/.test(name) && ids[value.slice(1)]) {
        node.setAttribute(name, '#' + prefix + value.slice(1));
      } else if (updated !== value) node.setAttribute(name, updated);
    }
  }
  return ids;
}

function put(node, value) {
  if (node.textContent !== String(value)) node.textContent = value;
}

function formatTemperature(value, state) {
  if (!state.data.connected || !Number.isFinite(value)) return '—';
  const metric = state.settings.units === 'kmh';
  return Math.round(metric ? value : value * 9 / 5 + 32) + (metric ? '°C' : '°F');
}

function artwork(view, image, video, actions) {
  const motion = new MotionArtwork(video, actions.animationFailed);
  let previous = null;
  return (state, active = true) => {
    const { media, animation, settings } = state;
    motion.update(animation, media, active && !settings.demo && settings.animatedArtwork);
    const artwork = media.artwork ?? null;
    if (!active || previous === artwork) return;
    previous = artwork;
    const safe = typeof previous === 'string' && previous.length < 1500000
      && /^data:image\/(png|jpeg|webp|bmp|gif);base64,[A-Za-z0-9+/=]+$/.test(previous);
    image.hidden = !safe;
    if (safe) image.src = previous; else image.removeAttribute('src');
    view.classList.toggle('has-cover', safe);
  };
}

function mountSpectrum(canvas, count = 32) {
  const visualizer = new AudioCanvas(canvas, count);
  return (state, palette) => {
    if (canvas.hidden) return;
    visualizer.palette = palette;
    visualizer.motionAmount = state.settings.visualizerMotion ?? 100;
    visualizer.draw(state.audio, state.now, state.settings.demo, state.media.playing);
  };
}

export function mountModule(root, tile, source, actions, prefix, toggleVisualizer) {
  let update, configure;
  let hide = () => {};
  const type = tile.type;
  if (['speed', 'rpm', 'sound-speed', 'sound-rpm'].includes(type)) {
    const speed = type.endsWith('speed');
    const dial = source.querySelector(speed ? '.speed-dial' : '.rev-dial').cloneNode(true);
    root.append(dial);
    const ids = scopeIds(root, prefix);
    const ring = ids[speed ? 'ultra-speed-ring' : 'ultra-rpm-ring'];
    if (type.startsWith('sound-')) {
      root.classList.add('um-sound-gauge');
      const gradient = ids[speed ? 'ultra-speed-gradient' : 'ultra-rev-gradient'];
      const [first, last] = gradient.querySelectorAll('stop');
      first.style.stopColor = 'var(--album-1)';
      last.style.stopColor = 'var(--album-3)';
      ring.style.stroke = `url(#${gradient.id})`;
      dial.querySelector('.ultra-ring-track').style.stroke = ring.style.stroke;
    }
    update = state => {
      const { data, settings, maxRpm } = state;
      const km = settings.units === 'kmh';
      put(ids[speed ? 'ultra-speed' : 'ultra-rpm'], data.connected ? speed ? Math.round(state.speed) : (state.rpm / 1000).toFixed(1) : '—');
      if (speed) {
        put(ids['ultra-unit'], km ? 'km/h' : 'mph');
        put(ids['ultra-fuel'], data.connected && Number.isFinite(data.fuel) ? Math.round(data.fuel * 100) + '% fuel' : 'Fuel —');
      } else {
        put(ids['ultra-gear'], data.connected ? data.selectedGear || gearLabel(data.gear) : '—');
        put(ids['ultra-temp'], formatTemperature(data.engineTemp, state));
      }
      const ratio = data.connected ? speed ? state.speed / (km ? 280 : 180) : state.rpm / maxRpm : 0;
      ring.style.strokeDashoffset = String(930 * (1 - clamp(ratio || 0, 0, 1)));
    };
  } else if (type === 'martin-speed' || type === 'martin-rpm') {
    const kind = type.slice(7);
    const isSpeed = kind === 'speed';
    root.innerHTML = martinDial(kind);
    const ids = scopeIds(root, prefix);
    const ticks = [...root.querySelectorAll(`[data-martin-${kind}-tick]`)];
    const marks = [...root.querySelectorAll(`[data-martin-${kind}-mark]`)];
    update = state => {
      const { data, settings, maxRpm } = state;
      const km = settings.units === 'kmh';
      const max = isSpeed ? km ? 260 : 160 : maxRpm;
      const ratio = data.connected ? clamp((isSpeed ? state.speed : state.rpm) / max || 0, 0, 1) : 0;
      drawMartinSweep(ids[`${type}-sweep`], ratio);
      for (const name of ['accent', 'edge']) ids[`${type}-${name}`].style.strokeDasharray = `${ratio * 72.22} 100`;
      ids[`${type}-needle`].setAttribute('transform', `rotate(${140 + ratio * 260} 180 180)`);
      for (const node of [...ticks, ...marks]) {
        const tick = node.getAttribute(`data-martin-${kind}-tick`);
        const step = Number(tick ?? node.getAttribute(`data-martin-${kind}-mark`));
        if (tick !== null) put(node, isSpeed ? Math.round(step * max) : Number((step * max / 1000).toFixed(1)));
        node.classList.toggle('passed', ratio > 0 && step <= ratio);
        node.classList.toggle('red', !isSpeed && step >= (settings.redline || max * .85) / max);
      }
      const reading = isSpeed ? Math.round(state.speed) : (state.rpm / 1000).toFixed(1);
      put(ids[`${type}-value`], data.connected ? reading : '—');
      put(ids[`${type}-unit`], isSpeed ? km ? 'KM/H' : 'MPH' : '× 1000 RPM');
      put(ids[`${type}-detail`], isSpeed ? data.connected && Number.isFinite(data.fuel)
        ? Math.round(data.fuel * 100) + '%' : '—' : formatTemperature(data.engineTemp, state));
    };
  } else if (/^(m235|civetta)-(speed|rpm)$/.test(type)) {
    const [deck, kind] = type.split('-');
    const [markup, render] = clusters[deck];
    root.innerHTML = markup();
    const cluster = root.firstElementChild;
    cluster.hidden = false;
    cluster.classList.add('um-single-gauge');
    const svg = cluster.querySelector('svg');
    const bounds = {
      'm235-speed': '140 35 350 490', 'm235-rpm': '950 35 350 490',
      'civetta-speed': '928 158 382 254', 'civetta-rpm': '473 7 494 505',
    };
    const [x, y, width, height] = bounds[type].split(' ');
    const drawing = [...svg.children].filter(node => node.localName !== 'defs');
    svg.querySelector('defs').insertAdjacentHTML('beforeend',
      `<clipPath id="module-gauge-crop"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath>`);
    svg.insertAdjacentHTML('beforeend', '<g clip-path="url(#module-gauge-crop)"></g>');
    svg.lastElementChild.append(...drawing);
    svg.setAttribute('viewBox', bounds[type]);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.setAttribute('aria-label', kind === 'speed' ? 'Speedometer' : 'Tachometer');
    const ids = scopeIds(root, prefix);
    const estimator = new PlanarG();
    let reading, unit;
    if (type !== 'civetta-speed') {
      const readout = document.createElement('div');
      readout.className = 'um-gauge-reading';
      readout.innerHTML = '<strong></strong><small></small>';
      reading = readout.firstElementChild;
      unit = readout.lastElementChild;
      cluster.append(readout);
    }
    update = state => {
      render(ids, state, estimator);
      if (!reading) return;
      put(reading, state.data.connected ? kind === 'speed' ? Math.round(state.speed) : (state.rpm / 1000).toFixed(1) : '—');
      put(unit, kind === 'rpm' ? '×1000 RPM' : state.settings.units === 'kmh' ? 'KM/H' : 'MPH');
    };
  } else if (type === 'drive-mode') {
    root.innerHTML = '<div class="um-drive-mode"><strong>—</strong></div>';
    update = ({data, settings}) => {
      const mode = resolveDriveMode(data, settings.demo ? settings.demoDriveMode : null);
      const color = /^#[\da-f]{3,8}$/i.test(data.driveModeColor || '') && !settings.demo ? data.driveModeColor : mode.color;
      root.firstElementChild.style.setProperty('--mode-color', color);
      const label = root.querySelector('strong');
      put(label, mode.available ? mode.label : '—');
      label.title = mode.label;
    };
  } else if (Object.hasOwn(clusters, type)) {
    const [markup, render] = clusters[type];
    root.innerHTML = markup();
    root.firstElementChild.hidden = false;
    const ids = scopeIds(root, prefix);
    const estimator = new PlanarG();
    const display = ids['civetta-page'];
    let page = 'auto';
    if (display) display.onchange = () => { page = display.value; };
    update = state => {
      render(ids, display ? { ...state, settings: { ...state.settings, civettaPage: page } } : state, estimator);
    };
  } else if (type === 'vehicle') {
    root.innerHTML = `<svg class="um-car" aria-label="Current vehicle" role="img" hidden><image/></svg>
      <span class="um-car-placeholder" hidden>${icon('car')}</span><span class="um-overlay"></span>`;
    const svg = root.firstElementChild;
    const image = svg.firstElementChild;
    const placeholder = root.querySelector('.um-car-placeholder');
    const label = root.lastElementChild;
    let asset;
    update = ({ data }) => {
      const visual = vehicleVisual(data);
      const current = data.connected ? visual.asset : null;
      if (current !== asset) {
        asset = current;
        svg.toggleAttribute('hidden', !asset);
        if (asset) {
          svg.setAttribute('viewBox', visual.viewBox.join(' '));
          image.setAttribute('width', visual.width);
          image.setAttribute('height', visual.height);
          image.setAttribute('href', new URL(`./assets/vehicles/${asset}.png`, import.meta.url).href);
        } else image.removeAttribute('href');
      }
      placeholder.hidden = !data.connected || Boolean(asset);
      put(label, data.connected ? visual.label || data.vehicleName || 'Vehicle image unavailable' : 'Waiting for BeamNG');
      if (placeholder.title !== label.textContent) placeholder.title = label.textContent;
    };
  } else if (type === 'g-force') {
    root.innerHTML = '<svg class="um-gforce" viewBox="0 0 160 160" role="img" aria-label="Estimated G-force"><circle cx="80" cy="80" r="66"/><circle cx="80" cy="80" r="33"/><path d="M80 14V146M14 80H146"/><circle cx="80" cy="80" r="5" class="um-g-dot"/></svg><span class="um-overlay"></span>';
    const estimator = new PlanarG();
    const dot = root.querySelector('.um-g-dot');
    update = ({ data, map, now }) => {
      const g = estimator.update(data, map, now);
      dot.setAttribute('cx', 80 + clamp(g?.lateral ?? 0, -1, 1) * 66);
      dot.setAttribute('cy', 80 - clamp(g?.longitudinal ?? 0, -1, 1) * 66);
      put(root.lastElementChild, g ? Math.hypot(g.lateral, g.longitudinal).toFixed(2) + ' g · Est.' : 'Waiting for position data');
    };
  } else if (type === 'drivetrain' || type === 'damage') {
    root.innerHTML = type === 'drivetrain' ? cleanDrivetrain() : stabilityMarkup();
    root.firstElementChild.hidden = false;
    const ids = scopeIds(root, prefix);
    ids['plaid-track-deck'] = root;
    update = state => {
      moveCleanWheels(ids, state.data, state.now);
      if (type === 'drivetrain') updateClean(ids, state.data, value => formatTemperature(value, state));
      else updateStability(ids, state.data);
    };
  } else if (type === 'plaid') {
    root.innerHTML = '<canvas aria-label="Plaid tunnel"></canvas><span class="um-overlay"></span>';
    const warp = new PlaidWarp(root.firstElementChild);
    update = ({ data, now }) => {
      const speed = data.speedMps || 0;
      const ready = Math.abs(speed) < .3;
      warp.draw({ mode: 'plaid', ready, speed, now, live: data.connected });
      put(root.lastElementChild, !data.connected ? 'Waiting for BeamNG' : ready ? 'Stationary' : 'PLAID');
    };
  } else if (type === 'audio' || type === 'levels') {
    root.innerHTML = '<canvas aria-label="Live music spectrum"></canvas>';
    update = mountSpectrum(root.firstElementChild, type === 'levels' ? 6 : 32);
  } else if (type === 'lyrics') {
    root.innerHTML = '<section class="lyrics-stage" aria-label="Song lyrics"><div class="lyric-lines"></div><p class="lyrics-empty" role="status"></p><small class="lyrics-credit" hidden></small></section>';
    const lyrics = new LyricsView(root.firstElementChild, actions.lyrics, actions.seek);
    update = state => lyrics.update(state.media, true, state.settings.demo);
    hide = () => lyrics.update({}, false, false);
  } else if (type === 'map' || type === 'map3d' || type === 'traffic') {
    root.innerHTML = '<canvas aria-label="Live road view"></canvas><span class="um-overlay"></span>';
    const canvas = root.firstElementChild;
    const traffic = type === 'traffic';
    const map = traffic ? new SurroundingsView(canvas, { appearance: 'dark', sideCamera: false }) : new MapCanvas(canvas);
    const status = root.lastElementChild;
    let car, rear, fallback, image, asset;
    if (traffic) {
      status.insertAdjacentHTML('beforebegin', drivingVehicle('um-car'));
      const ids = scopeIds(root, prefix);
      car = ids['um-car-driving-car'];
      car.className = 'um-traffic-car';
      rear = ids['um-car-rear-asset'];
      fallback = ids['um-car-rear-fallback'];
      image = ids['um-car-rear-image'];
    }
    update = state => {
      const { data, map: geometry, now, settings } = state;
      if (traffic) {
        map.draw(data, now, { ...geometry, renderDistance: settings.renderDistance ?? 120 }, settings.trafficView === 'absolute' ? 'absolute' : 'full');
        car.hidden = !data.connected;
        if (data.connected) {
          const { width, height } = canvas.getBoundingClientRect();
          car.style.top = surroundingPosition(0, 0, width, height).y + 'px';
          const visual = vehicleVisual(data);
          if (asset !== visual.asset || rear.hidden === Boolean(visual.asset)) {
            asset = visual.asset;
            rear.hidden = !asset;
            fallback.hidden = Boolean(asset);
            if (asset) {
              rear.setAttribute('viewBox', visual.viewBox.join(' '));
              image.setAttribute('width', visual.width);
              image.setAttribute('height', visual.height);
              image.setAttribute('href', new URL(`./assets/vehicles/${asset}.png`, import.meta.url).href);
            } else image.removeAttribute('href');
          }
        }
        put(status, settings.demo ? 'Demo drive' : !data.connected ? 'Waiting for BeamNG' : data.surroundings ? '' : 'Waiting for surroundings');
      } else {
        map.draw(geometry, { ...settings, compactMap: true, atlasView: type === 'map3d' ? '3d' : '2d' }, now);
        put(status, geometry?.connected ? geometry.levelName || 'BeamNG' : 'Waiting for map');
      }
    };
  } else if (type === 'artwork' || type === 'player') {
    const mini = type === 'player';
    root.innerHTML = `<div class="um-music"><div class="um-cover"><span>${icon('music')}</span><img alt="Current album artwork" hidden><video muted loop playsinline hidden></video></div><div class="um-track"><strong></strong><small></small><progress max="1" value="0" aria-label="Track progress"></progress></div>${mini ? `<div class="um-transport">${['previous','play','next'].map(key => `<button type="button" data-transport="${key}" aria-label="${key === 'play' ? 'Play or pause' : key + ' track'}">${icon(key)}</button>`).join('')}</div>` : ''}</div>`;
    root.classList.add('um-media-module', 'um-toggleable-spectrum');
    root.insertAdjacentHTML('beforeend', `<canvas class="um-media-spectrum" aria-label="Music spectrum" hidden></canvas>
      <button type="button" class="um-spectrum-toggle" aria-label="Music visualizer" aria-pressed="false" title="Toggle music visualizer">${icon('spectrum')}</button>`);
    const canvas = root.querySelector('canvas');
    const toggle = root.querySelector('.um-spectrum-toggle');
    const drawSpectrum = mountSpectrum(canvas, mini ? 32 : 6);
    toggle.onclick = () => toggleVisualizer(canvas.hidden);
    configure = tile => {
      const enabled = tileVisualizerEnabled(tile);
      canvas.hidden = !enabled;
      root.classList.toggle('with-spectrum', enabled);
      toggle.setAttribute('aria-pressed', String(enabled));
    };
    const cover = root.querySelector('.um-cover');
    const renderCover = artwork(cover, cover.querySelector('img'), cover.querySelector('video'), actions);
    const title = root.querySelector('strong');
    const artist = root.querySelector('small');
    const progress = root.querySelector('progress');
    const transport = [...root.querySelectorAll('[data-transport]')];
    for (const button of transport) button.onclick = () => actions.playback?.(button.dataset.transport === 'play' ? 'toggle' : button.dataset.transport);
    update = (state, palette) => {
      const { media } = state;
      renderCover(state);
      drawSpectrum(state, palette);
      put(title, media.available ? media.title || 'Untitled track' : 'Your soundtrack');
      if (title.title !== title.textContent) title.title = title.textContent;
      put(artist, media.available ? media.artist || '' : 'Play something in your music app');
      progress.hidden = !media.duration;
      progress.value = media.duration ? lyricPosition(media, state.settings.demo) / media.duration : 0;
      for (const [index, button] of transport.entries()) button.disabled = !actions.playback || !media[['canPrevious','canToggle','canNext'][index]];
      if (mini && transport[1].dataset.playing !== String(Boolean(media.playing))) {
        transport[1].dataset.playing = String(Boolean(media.playing));
        transport[1].innerHTML = icon(media.playing ? 'pause' : 'play');
        transport[1].ariaLabel = media.playing ? 'Pause' : 'Play';
      }
    };
    hide = () => renderCover({ media: {}, animation: {}, settings: {} }, false);
  } else {
    update = mountReadout(root, type);
  }
  return { update, hide, configure };
}

function mountReadout(root, type) {
  const labels = {
    'digital-speed': [''], temperature: ['Coolant', 'Oil', 'Outside'],
    tires: ['FL · PSI', 'FR · PSI', 'RL · PSI', 'RR · PSI'],
    gear: ['Gear', 'Drive mode'], fuel: ['Fuel', 'Trip'], pedals: ['Throttle', 'Brake'],
  }[type];
  const compactLabels = { tires: ['FL', 'FR', 'RL', 'RR'], gear: ['', ''], temperature: ['Coolant', 'Oil', 'Ext.'] }[type] || labels;
  root.innerHTML = `<div class="um-readings">${labels.map((label, index) => `<div title="${label}"><strong>—</strong><small>${label}</small><small class="um-compact-label" aria-hidden="true">${compactLabels[index]}</small>${type === 'pedals' ? '<progress max="1" value="0"></progress>' : ''}</div>`).join('')}</div>`;
  const readings = [...root.querySelectorAll('strong')];
  return state => {
    const { data, settings, speed, trip } = state;
    const km = settings.units === 'kmh';
    const live = data.connected;
    let values;
    if (type === 'digital-speed') {
      values = [live ? Math.round(speed) : '—'];
      for (const unit of root.querySelectorAll('.um-readings small')) put(unit, km ? 'KM/H' : 'MPH');
    } else if (type === 'temperature') values = ['engineTemp', 'oilTemp', 'ambientTemp'].map(key => formatTemperature(data[key], state));
    else if (type === 'tires') values = Object.values(martinPressures(data, settings.demo));
    else if (type === 'gear') values = live ? [data.selectedGear || gearLabel(data.gear), data.driveModeLabel || data.driveModeKey || (settings.demo ? settings.demoDriveMode : null) || '—'] : ['—', '—'];
    else if (type === 'fuel') values = [live && Number.isFinite(data.fuel) ? Math.round(data.fuel * 100) + '%' : '—', ((trip?.meters || 0) / (km ? 1000 : 1609.344)).toFixed(1) + (km ? ' km' : ' mi')];
    else values = ['throttle','brake'].map((key, index) => {
      const value = live && Number.isFinite(data[key]) ? clamp(data[key], 0, 1) : null;
      root.querySelectorAll('progress')[index].value = value ?? 0;
      return value === null ? '—' : Math.round(value * 100) + '%';
    });
    readings.forEach((node, index) => put(node, values[index]));
  };
}

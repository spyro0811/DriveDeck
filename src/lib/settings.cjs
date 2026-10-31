const fs = require('node:fs');
const path = require('node:path');

const THEMES = ['aura', 'etk', 'hirochi', 'ibishu', 'bmw', 'porsche', 'ferrari', 'custom'];
const WIDGETS = ['media', 'vehicle', 'journey'];
const DECKS = ['model-s', 'model-three', 'civetta', 'homosexual', 'iadnuyh', 'ultra', 'atlas', 'pure', 'sound', 'levels', 'vivace'];
const DEFAULTS = Object.freeze({
  theme: 'aura', autoTheme: true, units: 'mph', layout: 'touring', deck: 'ultra', autoDeck: false,
  animatedArtwork: true, animationOrder: ['canvas','apple'], canvasEnabled: true, appleEnabled: true,
  miniPlayerView: 'visualizer', songVisualizer: false, audioView: 'artwork', mapZoom: 1, mapAppearance: 'dark', atlasView: '2d', mapTerrain: true, mapHeadingUp: true, demoDriveMode: 'comfort', civettaPage: 'auto',
  customName: 'YOUR MARQUE', accent: '#d5f38a', maxRpm: 8000, redline: 6500,
  port: 4444, brightness: 100, alwaysOnTop: false, demo: false,
  widgets: ['media', 'vehicle', 'journey'], displayId: null,
  brandMappings: { etk: 'etk', hirochi: 'hirochi', ibishu: 'ibishu', bmw: 'bmw', porsche: 'porsche', ferrari: 'ferrari' },
});

function validateSettings(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) input = {};
  const number = (name, min, max) => typeof input[name] === 'number' && Number.isFinite(input[name])
    ? Math.round(Math.max(min, Math.min(max, input[name]))) : DEFAULTS[name];
  const maxRpm = number('maxRpm', 1000, 30000);
  const widgets = Array.isArray(input.widgets) ? [...new Set(input.widgets.filter(w => WIDGETS.includes(w)))] : [...DEFAULTS.widgets];
  const mappings = {};
  const rawMappings = input.brandMappings && typeof input.brandMappings === 'object' && !Array.isArray(input.brandMappings)
    ? input.brandMappings : DEFAULTS.brandMappings;
  for (const [key, theme] of Object.entries(rawMappings).slice(0, 100)) {
    if (/^[a-z0-9_-]{1,64}$/i.test(key) && THEMES.includes(theme) && !['__proto__', 'constructor', 'prototype'].includes(key)) mappings[key.toLowerCase()] = theme;
  }
  return {
    animatedArtwork: input.animatedArtwork !== false,
    animationOrder: Array.isArray(input.animationOrder) && input.animationOrder[0] === 'apple' ? ['apple','canvas'] : ['canvas','apple'],
    canvasEnabled: input.canvasEnabled !== false, appleEnabled: input.appleEnabled !== false,
    deck: DECKS.includes(input.deck) ? input.deck : DEFAULTS.deck,
    songVisualizer: input.songVisualizer === true,
    miniPlayerView: 'visualizer',
    audioView: input.audioView === 'visualizer' ? 'visualizer' : 'artwork',
    autoDeck: input.autoDeck === true,
    mapZoom: typeof input.mapZoom === 'number' && Number.isFinite(input.mapZoom) ? Math.max(.4, Math.min(3, input.mapZoom)) : 1,
    mapTerrain: input.mapTerrain !== false,
    atlasView: input.atlasView === '3d' ? '3d' : '2d',
    mapAppearance: input.mapAppearance === 'light' ? 'light' : 'dark',
    mapHeadingUp: input.mapHeadingUp !== false,
    civettaPage: ['auto','info','gforce','tires'].includes(input.civettaPage) ? input.civettaPage : 'auto',
    demoDriveMode: ['comfort', 'sport', 'arsenic', 'off', 'offroad', 'street', 'track', 'drift', 'topspeed', 'race'].includes(input.demoDriveMode) ? input.demoDriveMode : 'comfort',
    theme: THEMES.includes(input.theme) ? input.theme : DEFAULTS.theme,
    autoTheme: typeof input.autoTheme === 'boolean' ? input.autoTheme : DEFAULTS.autoTheme,
    units: input.units === 'kmh' ? 'kmh' : 'mph',
    layout: ['touring', 'sport', 'focus'].includes(input.layout) ? input.layout : DEFAULTS.layout,
    customName: typeof input.customName === 'string' && input.customName.trim() ? input.customName.trim().slice(0, 24) : DEFAULTS.customName,
    accent: typeof input.accent === 'string' && /^#[0-9a-f]{6}$/i.test(input.accent) ? input.accent : DEFAULTS.accent,
    maxRpm, redline: Math.min(maxRpm, number('redline', 500, 30000)),
    port: number('port', 1024, 65535), brightness: number('brightness', 20, 100),
    alwaysOnTop: input.alwaysOnTop === true, demo: input.demo === true,
    displayId: Number.isInteger(input.displayId) ? input.displayId : null,
    widgets, brandMappings: mappings,
  };
}

function readSettings(file) {
  try { return validateSettings(JSON.parse(fs.readFileSync(file, 'utf8'))); }
  catch { return validateSettings(); }
}

function writeSettings(file, settings) {
  const validated = validateSettings(settings);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(validated, null, 2));
  fs.renameSync(`${file}.tmp`, file);
  return validated;
}

module.exports = { DEFAULTS, THEMES, WIDGETS, validateSettings, readSettings, writeSettings };

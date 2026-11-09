// Browser-only design preview. The desktop app uses its isolated preload API.
export function previewApi() {
  const defaults = {
    theme: 'aura', autoTheme: false, units: 'mph', layout: 'touring', customName: 'YOUR MARQUE',
    accent: '#d5f38a', maxRpm: 8000, redline: 6500, port: 4444, brightness: 100,
    alwaysOnTop: false, demo: true, widgets: ['media', 'vehicle', 'journey'], displayId: null,
    brandMappings: { etk: 'etk', hirochi: 'hirochi', ibishu: 'ibishu', bmw: 'bmw', porsche: 'porsche', ferrari: 'ferrari' },
    animatedArtwork:false,animationOrder:['canvas','apple'],canvasEnabled:true,appleEnabled:true,
    excludeBeamngAudio:true,trafficView:'full',visualizerMotion:100,bassFlash:false,miniPlayerView:'visualizer', songVisualizer: false, audioView: 'artwork', deck: 'ultra', autoDeck: false, demoDriveMode: 'comfort', civettaPage:'auto', mapZoom: 1, mapAppearance: 'dark', atlasView:'2d', mapTerrain:true, mapHeadingUp: true,
  };
  let settings = { ...defaults };
  try { settings = { ...defaults, ...JSON.parse(localStorage.getItem('drivedeck-preview') || '{}') }; } catch {}
  if(['classic','lyrics'].includes(settings.deck))settings.deck='ultra';settings.miniPlayerView='visualizer';
  const listeners = [];
  const unavailable = async () => ({ ok: false, error: 'This control is available in the DriveDeck desktop app.' });
  return {
    bootstrap: async () => ({ settings, media: { available: false }, telemetry: { connected: false, port: 4444 }, displays: [], version: '0.1.0 · DESIGN PREVIEW' }),
    updateSettings: async patch => {
      settings = { ...settings, ...patch }; localStorage.setItem('drivedeck-preview', JSON.stringify(settings));
      listeners.forEach(fn => fn(settings)); return { ok: true, settings };
    },
    onSettings: fn => { listeners.push(fn); return () => {}; },
    onTelemetry: () => () => {}, onMedia: () => () => {}, onFullscreen: () => () => {},
    onAnimation: () => () => {}, retryAnimation: unavailable, animationFailed: unavailable, addCanvasClip: unavailable, removeCanvasClip: unavailable, openAnimationSource: unavailable,
    onMap: () => () => {}, installCompanion: unavailable,
    toggleFullscreen: async () => { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); return { ok: true }; },
    getDisplays: async () => [], moveToDisplay: unavailable, mediaCommand: unavailable,
    exportSettings: unavailable, importSettings: unavailable, openCompanion: unavailable, minimize: unavailable, close: unavailable,
  };
}

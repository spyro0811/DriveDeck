export const columns = 12;
export const rows = 8;
export const maxModules = 18;
export const maxPresets = 20;

// Width and height are grid cells on first placement.
export const moduleCatalog = {
  speed: ['Speedometer', 'Ultra Glass', 3, 5],
  rpm: ['Tachometer', 'Ultra Glass', 3, 5],
  'martin-speed': ['Analog speedometer', 'Martin', 3, 5],
  'martin-rpm': ['Analog tachometer', 'Martin', 3, 5],
  'digital-speed': ['Digital speed', 'Model Three', 3, 3],
  m235: ['Angular instruments', 'M235', 6, 4],
  'm235-speed': ['Speedometer', 'M235', 3, 5],
  'm235-rpm': ['Tachometer', 'M235', 3, 5],
  'civetta-speed': ['Speedometer', 'Civetta', 3, 4],
  'civetta-rpm': ['Tachometer', 'Civetta', 4, 5],
  civetta: ['Scintilla instruments', 'Civetta', 7, 5],
  luce: ['Triple analog gauges', 'Luce', 7, 5],
  compass: ['Compass instruments', 'iadnuyh', 7, 5],
  temperature: ['Temperatures', 'Plaid Track', 3, 3],
  drivetrain: ['Drivetrain', 'Plaid Clean', 5, 5],
  damage: ['Component damage', 'Plaid Stability', 5, 5],
  plaid: ['Plaid tunnel', 'Plaid Track', 6, 5],
  'sound-speed': ['Speedometer', 'Ultra Sound', 3, 5],
  'sound-rpm': ['Tachometer', 'Ultra Sound', 3, 5],
  audio: ['Audio visualizer', 'Ultra Sound', 5, 3],
  levels: ['Six-band visualizer', 'Ultra Levels', 5, 3],
  artwork: ['Album art & music', 'Ultra Sound', 4, 5],
  player: ['Mini player', 'Ultra Sound', 6, 2],
  lyrics: ['Animated lyrics', 'Ultra Lyrics', 6, 5],
  map: ['Live map', 'Ultra Glass', 6, 5],
  'map3d': ['3D map', 'Ultra Atlas', 6, 5],
  traffic: ['Surroundings', 'Model S', 6, 5],
  vehicle: ['Current vehicle', 'Model S', 4, 4],
  'g-force': ['G-force meter', 'Plaid Track', 3, 4],
  tires: ['Tire pressures', 'Martin', 3, 3],
  pedals: ['Pedal inputs', 'Plaid Track', 3, 2],
  gear: ['Gear & drive mode', 'Model S', 3, 2],
  'drive-mode': ['Drive mode', 'DriveDeck', 2, 1],
  fuel: ['Fuel & trip', 'Ultra Glass', 3, 2],
};

function preset(name, tiles) {
  return { name, layout: tiles.map(([type, x, y, w, h], index) => ({ id: 'tile-' + index, type, x, y, w, h })) };
}

export const starterPresets = [
  preset('Everyday', [['speed',0,0,3,6], ['map',3,0,6,6], ['rpm',9,0,3,6], ['fuel',0,6,3,2], ['player',3,6,6,2], ['gear',9,6,3,2]]),
  preset('Track', [['martin-speed',0,0,3,5], ['drivetrain',3,0,6,5], ['martin-rpm',9,0,3,5], ['temperature',0,5,4,3], ['plaid',4,5,5,3], ['pedals',9,5,3,3]]),
  preset('Music', [['artwork',0,0,3,6], ['lyrics',3,0,6,6], ['digital-speed',9,0,3,3], ['levels',9,3,3,3], ['player',0,6,9,2], ['gear',9,6,3,2]]),
  preset('Blank', []),
];

export function fits(layout, tile) {
  return tile.x >= 0 && tile.y >= 0 && tile.x + tile.w <= columns && tile.y + tile.h <= rows
    && layout.every(other => other.id === tile.id || tile.x + tile.w <= other.x || other.x + other.w <= tile.x
      || tile.y + tile.h <= other.y || other.y + other.h <= tile.y);
}

export function findSpace(layout, tile) {
  for (let y = 0; y <= rows - tile.h; y++) {
    for (let x = 0; x <= columns - tile.w; x++) {
      const candidate = { ...tile, x, y };
      if (fits(layout, candidate)) return candidate;
    }
  }
  return null;
}

const largeModules = new Set(['m235', 'civetta', 'luce', 'compass']);

export function moduleSize(type) {
  if (type === 'lyrics') return [3, 3];
  return largeModules.has(type) ? [2, 2] : [1, 1];
}

export const supportsTileVisualizer = type => ['player', 'artwork'].includes(type);
export const tileVisualizerEnabled = tile => supportsTileVisualizer(tile.type) && (tile.visualizer ?? tile.type === 'artwork');

export function sanitizeModularAppearance(input) {
  return {
    color: typeof input?.color === 'string' && /^#[a-f0-9]{6}$/i.test(input.color) ? input.color : null,
    syncArtwork: input?.syncArtwork === true,
    tileDistinction: input?.tileDistinction !== false,
  };
}

export function sanitizeLayout(value) {
  if (!Array.isArray(value)) return starterPresets[0].layout.map(tile => ({ ...tile }));
  const layout = [];
  for (const item of value.slice(0, maxModules)) {
    if (!item || typeof item.type !== 'string' || !Object.hasOwn(moduleCatalog, item.type) || typeof item.id !== 'string'
      || !/^[a-z\d-]{1,64}$/i.test(item.id) || layout.some(tile => tile.id === item.id)) continue;
    const [minW, minH] = moduleSize(item.type);
    const { id, type, x, y, w, h } = item;
    if (![x, y, w, h].every(Number.isInteger) || w < minW || h < minH) continue;
    const tile = { id, type, x, y, w, h };
    if (supportsTileVisualizer(type) && typeof item.visualizer === 'boolean') tile.visualizer = item.visualizer;
    if (fits(layout, tile)) layout.push(tile);
  }
  return layout;
}

export function sanitizePresets(value) {
  if (!Array.isArray(value)) return [];
  const presets = [];
  for (const item of value.slice(0, maxPresets)) {
    const name = typeof item?.name === 'string' ? item.name.trim().slice(0, 36) : '';
    if (!name || !Array.isArray(item.layout) || presets.some(preset => preset.name.toLowerCase() === name.toLowerCase())) continue;
    presets.push({ name, layout: sanitizeLayout(item.layout) });
  }
  return presets;
}

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateSettings } = require('../src/lib/settings.cjs');
const { findSpace, fits, starterPresets, moduleCatalog, moduleSize } = require('../src/renderer/modular-layout.mjs');

test('Modular setup imports keep valid tiles and named presets, dropping overlaps and unknown types', () => {
  const speed = { id: 'one', type: 'speed', x: 0, y: 0, w: 3, h: 4 };
  const audio = { id: 'two', type: 'audio', x: 5, y: 0, w: 4, h: 4 };
  const layout = [speed, audio, { ...audio, id: 'collision', x: 1 }, { ...speed, type: 'missing' }, { ...speed, id: 'overflow', x: 11 }];
  const result = validateSettings({ deck: 'modular', modularLayout: layout, modularPresets: [
    { name: '  Night drive  ', layout },
    { name: 'night drive', layout: [] },
    { name: 'Blank slate', layout: [] },
  ] });
  assert.equal(result.deck, 'modular');
  assert.deepEqual(result.modularLayout, [speed, audio]);
  assert.deepEqual(result.modularPresets, [
    { name: 'Night drive', layout: [speed, audio] },
    { name: 'Blank slate', layout: [] },
  ]);
  assert.deepEqual(validateSettings(JSON.parse(JSON.stringify(result))).modularLayout, [speed, audio]);
});

test('A packed starter layout requires freeing space and a new tile fits when space is available', () => {
  const layout = starterPresets[0].layout;
  const tile = { id: 'new', type: 'lyrics', w: 6, h: 5 };
  assert.equal(findSpace(layout, tile), null);
  const withoutMap = layout.filter(item => item.type !== 'map');
  const placed = findSpace(withoutMap, tile);
  assert.deepEqual([placed.x, placed.y], [3, 0]);
  assert.equal(fits(withoutMap, placed), true);
});

test('Compact modules and their options survive saved layouts and presets', () => {
  const fullSize = ['m235', 'civetta', 'luce', 'compass', 'lyrics'];
  const compactTypes = Object.keys(moduleCatalog).filter(type => !fullSize.includes(type));
  for (const type of compactTypes) {
    assert.deepEqual(moduleSize(type), [1, 1], type);
    const tile = { id: 'tiny', type, x: 11, y: 7, w: 1, h: 1 };
    if (type === 'player' || type === 'artwork') tile.visualizer = true;
    const saved = validateSettings({ modularLayout: [tile], modularPresets: [{name: 'Compact', layout: [tile]}] });
    assert.deepEqual(saved.modularLayout, [tile], type);
    assert.deepEqual(saved.modularPresets[0].layout, [tile], type);
  }
  for (const type of fullSize) {
    const saved = validateSettings({ modularLayout: [{id: 'tiny', type, x: 0, y: 0, w: 1, h: 1}] });
    assert.deepEqual(saved.modularLayout, [], type);
  }
});

test('Modular appearance accepts only color and boolean preferences and artwork can opt out of the default spectrum', () => {
  const tile = { id:'cover', type:'artwork', x:0, y:0, w:1, h:1, visualizer:false };
  const saved = validateSettings({
    modularLayout: [tile],
    modularAppearance: {color:'#342538', syncArtwork:true, tileDistinction:false},
  });
  assert.deepEqual(saved.modularLayout, [tile]);
  assert.deepEqual(saved.modularAppearance, {color:'#342538', syncArtwork:true, tileDistinction:false});
  assert.deepEqual(validateSettings({modularAppearance:{color:'url(example)',syncArtwork:1}}).modularAppearance,
    {color:null, syncArtwork:false, tileDistinction:true});
});

test('Desktop setup requires a saved or previously customized nonempty Ultra Modular layout', () => {
  const defaults = validateSettings();
  assert.equal(defaults.modularDesktopConfigured, false);
  assert.equal(validateSettings(defaults).modularDesktopConfigured, false);
  const completed = validateSettings({ ...defaults, modularDesktopConfigured: true });
  assert.equal(completed.modularDesktopConfigured, true);
  assert.equal(validateSettings(completed).modularDesktopConfigured, true);
  assert.equal(validateSettings({ ...completed, modularLayout: [] }).modularDesktopConfigured, false);
  assert.equal(validateSettings({ modularLayout: starterPresets[1].layout }).modularDesktopConfigured, true);
});

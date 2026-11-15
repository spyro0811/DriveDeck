const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

app.disableHardwareAcceleration();
app.setPath('userData', path.resolve('.runtime/modular-qa'));

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1400, height: 670,
    useContentSize: true, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const file = path.resolve('src/renderer/index.html');
  const js = script => win.webContents.executeJavaScript(script);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const errors = [];
  win.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
  await win.loadFile(file);
  await js(`localStorage.setItem('drivedeck-preview', JSON.stringify({deck:'modular',autoDeck:false,demo:true,modularAppearance:{color:'#253647'}}));`);
  await win.loadFile(file);
  for (let i = 0; i < 100; i++) {
    if (await js("document.querySelectorAll('.um-tile').length === 6")) break;
    await wait(50);
  }
  const capture = async (name, thumbnail = false) => {
    const box = await js(`(() => {
      const area = document.querySelector('#modular-deck').getBoundingClientRect();
      return { x: Math.round(area.x), y: Math.round(area.y), width: Math.round(area.width), height: Math.round(area.height) };
    })()`);
    const image = await win.webContents.capturePage(name === 'module-library' ? undefined : box);
    fs.mkdirSync('artifacts/modular', { recursive: true });
    fs.writeFileSync('artifacts/modular/' + name + '.png', image.toPNG());
    if (thumbnail && process.argv.includes('--thumbnail')) {
      fs.writeFileSync('src/renderer/assets/decks/modular.png', image.resize({ width: 840 }).toPNG());
    }
  };
  assert.equal(await js("document.querySelectorAll('.um-tile').length"), 6);
  assert.match(await js("document.querySelector('[data-module=speed] strong').textContent"), /^\d+$/);
  assert.equal(await js("document.querySelectorAll('[data-deck-choice=modular]').length"), 1);
  await capture('everyday', true);

  await js("document.querySelector('[data-um-edit]').click()");
  const choose = (selector, value) => js(`(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    input.value = ${JSON.stringify(value)};
    input.dispatchEvent(new Event('change', {bubbles:true}));
  })()`);
  const folder = deck => js(`Array.from(document.querySelectorAll('[data-folder]'))
    .find(button => button.querySelector('strong').textContent === ${JSON.stringify(deck)}).click()`);
  const add = async (deck, type) => {
    await js("document.querySelector('[data-um-library]').click()");
    await folder(deck);
    await js(`document.querySelector('[data-module-choice=${type}]').click()`);
  };
  await choose('[data-um-presets]', '3'); // Blank
  await js("document.querySelector('[data-um-library]').click()");
  await wait(240);
  assert.equal(await js("Array.from(document.querySelectorAll('[data-folder] img')).every(image => image.complete && image.naturalWidth > 0)"), true);
  await capture('module-library');
  await folder('Martin');
  assert.deepEqual(await js("Array.from(document.querySelectorAll('[data-module-choice]'), button => button.dataset.moduleChoice)"), ['martin-speed', 'martin-rpm', 'tires']);
  await js("document.querySelector('[data-um-back]').click(); document.querySelector('[data-um-close]').click()");
  await add('Model Three', 'digital-speed');
  await add('Model Three', 'digital-speed');
  await add('Ultra Lyrics', 'lyrics');
  await add('Ultra Sound', 'player');
  assert.equal(await js("document.querySelectorAll('.um-tile').length"), 4);
  await js(`document.querySelector('[data-module=digital-speed] [data-um-handle]').click();
    document.querySelector('[data-move="1,0"]').click();`);
  assert.match(await js("document.querySelector('[data-um-message]').textContent"), /occupied/);
  await js(`document.querySelector('[data-um-name]').value='Night drive';
    document.querySelector('[data-um-save]').click(); document.querySelector('[data-um-done]').click();`);
  await wait(300);
  assert.equal(await js("JSON.parse(localStorage.getItem('drivedeck-preview')).modularPresets[0].name"), 'Night drive');
  await win.loadFile(file);
  await wait(500);
  assert.equal(await js("document.querySelectorAll('[data-module=digital-speed]').length"), 2);
  assert.equal(await js("document.querySelectorAll('[data-module=lyrics] .current').length"), 1);
  assert.equal(await js("document.querySelector('[data-module=lyrics] .um-media-spectrum')"), null);
  await js("document.querySelector('[data-module=player] .um-spectrum-toggle').click()");
  await wait(120);
  assert.equal(await js("document.querySelector('[data-module=player] .um-spectrum-toggle').getAttribute('aria-pressed')"), 'true');
  await win.loadFile(file);
  await wait(500);
  assert.ok(await js("document.querySelector('[data-module=player] .um-media-spectrum').clientHeight > 0"));
  await js("document.querySelector('[data-module=player] .um-spectrum-toggle').click()");
  await wait(120);
  assert.equal(await js("document.querySelector('[data-module=player] .um-media-spectrum').hidden"), true);
  await choose('[data-um-presets]', '2'); // Music
  await wait(120);
  assert.equal(await js(`(() => {
    const canvas = document.querySelector('[data-module=artwork] .um-media-spectrum');
    if (canvas.hidden || !canvas.clientHeight) return 0;
    const row = canvas.getContext('2d').getImageData(0, Math.floor(canvas.height / 2), canvas.width, 1).data;
    let bands = 0, drawing = false;
    for (let i = 3; i < row.length; i += 4) {
      if (row[i] && !drawing) bands++;
      drawing = Boolean(row[i]);
    }
    return bands;
  })()`), 6);
  await js("document.querySelector('[data-module=artwork] .um-spectrum-toggle').click()");
  await wait(120);
  assert.equal(await js("document.querySelector('[data-module=artwork] .um-media-spectrum').hidden"), true);
  await js("document.querySelector('[data-um-background]').click()");
  assert.equal(await js("document.querySelector('[data-um-color-open], [data-um-color-form]')"), null);
  await js(`document.querySelector('[data-um-sync]').checked = true;
    document.querySelector('[data-um-distinction]').checked = false;
    document.querySelector('[data-um-distinction]').dispatchEvent(new Event('input', { bubbles: true }));`);
  assert.equal(await js("getComputedStyle(document.querySelector('.modular-deck')).backgroundColor"), 'rgb(37, 54, 71)');
  await js("document.querySelector('[data-um-appearance-form]').requestSubmit()");
  await wait(120);
  assert.deepEqual(await js("JSON.parse(localStorage.getItem('drivedeck-preview')).modularAppearance"),
    {color:'#253647',syncArtwork:true,tileDistinction:false});
  await win.loadFile(file);
  await wait(400);
  assert.equal(await js("document.querySelector('[data-module=artwork] .um-media-spectrum').hidden"), true);
  assert.equal(await js("getComputedStyle(document.querySelector('.um-tile')).borderTopWidth"), '0px');
  await js("document.querySelector('[data-um-background]').click()");
  await js(`document.querySelector('[data-um-color-reset]').click();
    document.querySelector('[data-um-appearance-form]').requestSubmit();`);
  await wait(120);
  assert.deepEqual(await js("JSON.parse(localStorage.getItem('drivedeck-preview')).modularAppearance"),
    {color:null,syncArtwork:false,tileDistinction:false});
  assert.match(await js("getComputedStyle(document.querySelector('.modular-deck')).backgroundImage"), /radial-gradient/);
  await choose('[data-um-presets]', '4'); // Night drive
  await wait(120);

  await js("document.querySelector('[data-um-edit]').click()");
  await choose('[data-um-presets]', '3');
  await add('Model Three', 'digital-speed');
  const drag = async (selector, dx, dy) => {
    const points = await js(`(() => {
      const handle = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
      const grid = document.querySelector('[data-um-grid]').getBoundingClientRect();
      const x = Math.round(handle.x + handle.width / 2), y = Math.round(handle.y + handle.height / 2);
      return { start: {x,y}, end: {x:Math.round(x+grid.width/12*${dx}),y:Math.round(y+grid.height/8*${dy})} };
    })()`);
    win.webContents.sendInputEvent({ type:'mouseDown', button:'left', clickCount:1, ...points.start });
    win.webContents.sendInputEvent({ type:'mouseMove', button:'left', ...points.end });
    win.webContents.sendInputEvent({ type:'mouseUp', button:'left', clickCount:1, ...points.end });
    await wait(100);
  };
  await drag('[data-um-handle]', 2, 1);
  assert.equal(await js("document.querySelector('.um-tile').style.gridColumn"), '3 / span 3');
  assert.equal(await js("document.querySelector('.um-tile').style.gridRow"), '2 / span 3');
  await drag('[data-um-resize]', 2, 1);
  assert.equal(await js("document.querySelector('.um-tile').style.gridColumn"), '3 / span 5');
  assert.equal(await js("document.querySelector('.um-tile').style.gridRow"), '2 / span 4');
  await js("document.querySelector('[data-um-cancel]').click()");

  await choose('[data-um-presets]', '1'); // Track
  await wait(320);
  assert.equal(await js("document.querySelectorAll('[data-module=drivetrain] [data-clean-wheel]').length"), 4);
  assert.ok(await js("document.querySelector('[data-module=plaid] canvas').width > 0"));
  await capture('track');

  await js("document.querySelector('[data-um-edit]').click()");
  await choose('[data-um-presets]', '3');
  for (const [deck, type] of [['Plaid Track','drivetrain'], ['Plaid Track','damage'], ['M235','m235'], ['Civetta','civetta'],
    ['Luce','luce'], ['iadnuyh','compass'], ['Ultra Atlas','map3d'], ['Model S','traffic'], ['Ultra Sound','audio'],
    ['Ultra Sound','artwork'], ['Model S','vehicle'], ['Plaid Track','g-force'], ['Martin','tires'],
    ['M235','m235-rpm'], ['Civetta','civetta-speed']]) {
    await choose('[data-um-presets]', '3');
    await add(deck, type);
    await wait(90);
    assert.equal(await js(`document.querySelectorAll('[data-module=${type}]').length`), 1);
  }
  await choose('[data-um-presets]', '3');
  await add('M235', 'm235-speed');
  await add('Civetta', 'civetta-rpm');
  await add('Model S', 'traffic');
  await add('Plaid Track', 'damage');
  await add('DriveDeck', 'drive-mode');
  await wait(120);
  assert.match(await js("document.querySelector('[data-module=m235-speed] .um-gauge-reading strong').textContent"), /^\d+$/);
  assert.match(await js("document.querySelector('[data-module=civetta-rpm] .um-gauge-reading strong').textContent"), /^\d+\.\d$/);
  assert.equal(await js("document.querySelector('[data-module=traffic] .um-traffic-car').hidden"), false);
  assert.equal(await js("getComputedStyle(document.querySelector('[data-module=damage] .pt-damage-list')).display"), 'none');
  assert.notEqual(await js("document.querySelector('[data-module=drive-mode] strong').textContent"), '—');
  await capture('editor');
  // Resize a tile through the editor to check the new minimum in normal use.
  await choose('[data-um-presets]', '3');
  await add('Plaid Track', 'damage');
  await drag('[data-um-resize]', -4, -4);
  assert.equal(await js("document.querySelector('[data-module=damage]').style.gridColumn"), '1 / span 1');
  assert.equal(await js("document.querySelector('[data-module=damage]').style.gridRow"), '1 / span 1');
  await js(`document.querySelector('[data-um-done]').click()`);
  await wait(120);
  assert.equal(await js("JSON.parse(localStorage.getItem('drivedeck-preview')).modularLayout[0].h"), 1);
  assert.equal(await js("getComputedStyle(document.querySelector('[data-module=damage] .pt-damage-list')).display"), 'none');
  assert.ok(await js("document.querySelector('[data-module=damage] svg').getBoundingClientRect().height > 20"));
  await js("document.querySelector('[data-um-edit]').click()");
  await choose('[data-um-presets]', '3');
  await add('Plaid Track', 'damage');
  await js(`void Object.assign(document.querySelector('[data-module=damage] .um-tile-content').style,
    {width:'826px',flex:'none',height:'232px'})`);
  assert.equal(await js(`(() => {
    const tile = document.querySelector('[data-module=damage]');
    const model = tile.querySelector('.pt-stability > svg').getBoundingClientRect();
    const readings = tile.querySelector('.pt-damage-list').getBoundingClientRect();
    return model.height >= 125 && readings.width > 0 && readings.top >= model.bottom;
  })()`), true);
  await js("document.querySelector('[data-um-cancel]').click()");
  assert.equal(await js("document.querySelectorAll('.um-tile').length"), 1);
  const { moduleCatalog } = await import('../src/renderer/modular-layout.mjs');
  const compact = Object.keys(moduleCatalog).filter(type => !['m235', 'civetta', 'luce', 'compass', 'lyrics'].includes(type));
  for (let offset = 0; offset < compact.length; offset += 12) {
    const types = compact.slice(offset, offset + 12);
    const cells = types.map((type, x) => ({id: 'compact-' + x, type, x, y: 2, w: 1, h: 1, ...(type === 'player' ? {visualizer: true} : {})}));
    await js(`localStorage.setItem('drivedeck-preview', JSON.stringify({deck:'modular',demo:true,modularLayout:${JSON.stringify(cells)}}))`);
    await win.loadFile(file);
    await wait(250);
    assert.equal(await js("document.querySelectorAll('.um-tile.um-one-column.um-one-row').length"), types.length);
    if (types.includes('player')) {
      assert.ok(await js("document.querySelector('[data-module=player] .um-media-spectrum').clientHeight > 0"));
      await capture('compact');
    }
  }
  await js("document.querySelector('[data-um-edit]').click()");
  await choose('[data-um-presets]', '3');
  await add('Ultra Sound', 'sound-speed');
  await add('Ultra Sound', 'sound-rpm');
  assert.equal(await js("document.querySelectorAll('.um-sound-gauge').length"), 2);
  await js("document.querySelector('[data-um-done]').click()");

  const syncedGauges = await js(`(async () => {
    const { DeckView } = await import('./decks.mjs');
    const stage = document.createElement('div');
    stage.className = 'deck-stage';
    stage.style.display = 'none';
    document.body.append(stage);
    try {
      const view = new DeckView(stage, {});
      const types = ['sound-speed', 'sound-rpm', 'speed'];
      const layout = types.map((type, x) => ({ id: 'palette-' + x, type, x, y: 0, w: 1, h: 1 }));
      view.modular.setVisible(true);
      view.modular.update({ settings: { modularLayout: layout, units: 'mph', modularAppearance: {color:'#253647',syncArtwork:true} }, data: { connected: true },
        maxRpm: 8000, rpm: 4000, speed: 90 }, view.palette);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      for (const [pixel, expected] of [['#ff0040','rgb(255, 0, 64)'], ['#0070ff','rgb(0, 112, 255)'], [null,'rgb(129, 217, 255)']]) {
        ctx.fillStyle = pixel || '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        view.renderMedia({ available: true, artwork: pixel ? canvas.toDataURL() : null }, false);
        const stops = [...stage.querySelectorAll('.um-sound-gauge stop:first-child')];
        for (let retry = 0; retry < 50 && getComputedStyle(stops[0]).stopColor !== expected; retry++) {
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        if (stops.length !== 2 || !stops.every(stop => getComputedStyle(stop).stopColor === expected)) return false;
        const background = getComputedStyle(view.modular.root);
        if (pixel && !background.backgroundImage.includes('linear-gradient')) return false;
        if (!pixel && background.backgroundColor !== 'rgb(37, 54, 71)') return false;
        for (const gauge of stage.querySelectorAll('.um-sound-gauge')) {
          const gradient = gauge.querySelector('linearGradient');
          if (getComputedStyle(gauge.querySelector('.ultra-ring-fill')).stroke !== 'url("#' + gradient.id + '")') return false;
        }
        if (getComputedStyle(stage.querySelector('[data-module=speed] .ultra-ring-fill')).stroke.startsWith('url')) return false;
      }
      return true;
    } finally {
      stage.remove();
    }
  })()`);
  assert.equal(syncedGauges, true);
  const lyricViews = await js(`(async () => {
    const { DeckView, DECKS } = await import('./decks.mjs');
    const { demoMedia, demoTelemetry } = await import('./demo.mjs');
    const stage = document.createElement('div');
    stage.className = 'deck-stage';
    stage.style.cssText = 'position:fixed;inset:0;visibility:hidden';
    document.body.append(stage);
    const view = new DeckView(stage, {});
    try {
      const settings = { deck:'lyrics', demo:true, units:'mph', miniPlayerView:'lyrics', audioView:'artwork', mapZoom:1 };
      const state = { settings, data:demoTelemetry(0), map:{}, media:{ ...demoMedia, position:0 },
        audio:{}, animation:{}, rpm:4000, speed:90, maxRpm:8000, trip:{ meters:0,seconds:0 }, now:1000 };
      const render = () => { state.now += 100; view.update(state); };
      const ids = view.ids;
      render();
      if (ids['lyrics-levels'].hidden || view.lyricsLevels.count !== 6 || ids['lyrics-levels'].clientWidth <= 0) return 'missing deck spectrum';
      for (const {id} of DECKS.filter(deck => !['lyrics', 'modular'].includes(deck.id))) {
        settings.deck = id;
        state.media.position = 0;
        render();
        const chooser = ids['mini-player-view'];
        const line = ids['mini-lyric'];
        if (chooser.hidden || !chooser.clientWidth || line.hidden || !line.clientWidth
          || line.querySelector('.lyric-lines').textContent !== 'The city lights are waking') return 'missing mini player lyrics on ' + id;
        state.media.position = 5;
        render();
        if (line.textContent !== 'The night rolls past the glass' || line.querySelector('.lyric-lines').childElementCount) return 'wrong line on ' + id;
      }
      settings.deck = 'ultra';
      settings.miniPlayerView = 'visualizer';
      render();
      if (!ids['mini-lyric'].hidden || ids['deck-levels'].hidden) return 'visualizer mode did not restore';
      return 'ok';
    } finally { stage.remove(); }
  })()`);
  assert.equal(lyricViews, 'ok');
  const unique = await js("new Set(Array.from(document.querySelectorAll('.um-tile [id]'), node => node.id)).size === document.querySelectorAll('.um-tile [id]').length");
  assert.equal(unique, true);
  assert.deepEqual(errors, []);
  console.log('PASS Ultra Modular library, live modules, starter presets, editing, cancel, and saved preset reload.');
  win.destroy();
  app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });

const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

app.disableHardwareAcceleration();
app.setPath('userData', path.resolve('.runtime/lyrics-layout'));

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false, width: 1440, height: 640,
    webPreferences: { offscreen: true, backgroundThrottling: false },
  });
  const js = code => win.webContents.executeJavaScript(code);
  await win.loadFile(path.resolve('src/renderer/index.html'));
  await js(`localStorage.setItem('drivedeck-preview', JSON.stringify({deck:'scenes',autoDeck:false,demo:true}));`);
  await win.loadFile(path.resolve('src/renderer/index.html'));
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  for (let i = 0; i < 60; i++) {
    if (await js("Boolean(document.querySelector('.lyric-lines .current'))")) break;
    await delay(50);
  }
  assert.equal(await js("document.getElementById('app').dataset.deck"), 'lyrics');
  await js("document.querySelector('.lyric-lines p:nth-child(3) button').click()");
  await delay(450);
  assert.equal(await js("document.querySelector('.lyric-lines .current').textContent"), 'The road unfolds before me');
  const highlight = await js("document.querySelector('.lyric-lines .current').style.getPropertyValue('--lyric-progress')");
  assert.ok(parseFloat(highlight) > 0, `Lyric fill was ${JSON.stringify(highlight)}`);
  const bounds = await js(`(() => {
    const list = document.querySelector('.lyric-lines').getBoundingClientRect();
    const line = document.querySelector('.lyric-lines .current').getBoundingClientRect();
    return { width: list.width, height: list.height, centerError: Math.abs((list.top+list.bottom-line.top-line.bottom)/2) };
  })()`);
  assert.ok(bounds.width > 200 && bounds.height > 100 && bounds.centerError < 5, JSON.stringify(bounds));
  await js("document.getElementById('deck-play').click()");
  await delay(200);
  const progress = () => js("document.querySelector('.lyric-lines .current').style.getPropertyValue('--lyric-progress')");
  const paused = await progress();
  await delay(250);
  assert.equal(await progress(), paused);
  fs.mkdirSync('artifacts/lyrics-layout', { recursive: true });
  fs.writeFileSync('artifacts/lyrics-layout/lyrics.png', (await win.webContents.capturePage()).toPNG());
  assert.equal(await js("document.querySelector('.lyric-effect').hidden"), false, 'The highway animation is now available in Ultra Lyrics');
  await js("document.querySelector('.lyric-lines p:nth-child(4) button').click(); document.getElementById('deck-play').click()");
  await delay(700);
  const effect = () => js(`(() => {
    const canvas = document.querySelector('.lyric-effect');
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    return { hidden: canvas.hidden, hue: pixels.findIndex((value, index) =>
      index % 4 === 0 && value > pixels[index + 2] && pixels[index + 3] > 90), image: canvas.toDataURL() };
  })()`);
  const heart = await effect();
  assert.equal(heart.hidden, false);
  assert.ok(heart.hue >= 0, 'Heartbreak cue should draw a pink heart');
  fs.writeFileSync('artifacts/lyrics-layout/heartbreak.png', (await win.webContents.capturePage()).toPNG());
  await js("document.getElementById('deck-play').click()");
  await delay(100);
  const pausedEffect = await effect();
  await delay(250);
  assert.equal((await effect()).image, pausedEffect.image);
  await js("document.querySelector('.lyric-lines p:nth-child(5) button').click()");
  await delay(100);
  assert.notEqual((await effect()).image, pausedEffect.image);
  const rendered = await js(`(async () => {
    const { lyricCues, lyricCue } = await import('./lyric-cues.mjs');
    const { LyricEffects } = await import('./lyric-effects.mjs');
    const effects = new LyricEffects(document.createElement('div'));
    return lyricCues.filter(([cue, sample]) => {
      effects.update(cue, .7, false);
      const pixels = effects.context.getImageData(0, 0, 192, 160).data;
      return lyricCue(sample) === cue && pixels.some((value, index) => index % 4 === 3 && value > 90);
    }).length;
  })()`);
  assert.equal(rendered, 40);
  await win.webContents.debugger.attach();
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await delay(100);
  assert.equal(await js("document.querySelector('.lyric-effect').hidden"), true);
  win.webContents.debugger.detach();
  assert.ok(await js("document.querySelector('[data-deck-choice=lyrics]')"));
  assert.equal(await js("document.querySelector('[data-deck-choice=scenes]')"), null);
  console.log('PASS Saved Scenes selections migrate to Ultra Lyrics and all 40 effects render.');
  win.destroy();
  app.exit(0);
}).catch(error => { console.error(error); app.exit(1); });

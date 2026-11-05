const { app, BrowserWindow, ipcMain, screen, dialog, shell, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const currentRelease=require(process.platform==='linux'?'./release-notes-linux.json':'./release-notes.json');
const {shouldShowNotes}=require('./lib/release-notes.cjs');
let showInstalledNotes=false,notesSeenFile;
const { Updates } = require('./lib/updates.cjs');
const { Telemetry } = require('./lib/telemetry.cjs');
const { MobileServer } = require('./lib/mobile.cjs');
const { pairingCodes } = require('./lib/mobile-qr.cjs');
const { Audio } = require('./lib/audio.cjs');
const { AnimatedArtwork, ClipLibrary, trackKey } = require('./lib/animated-artwork.cjs');
const { Media } = require('./lib/media.cjs');
const { VehiclePreview } = require('./lib/vehicle-preview.cjs');
const vehiclePreviews = new VehiclePreview();
const { readSettings, writeSettings, validateSettings } = require('./lib/settings.cjs');

const smokeLinux=process.argv.includes('--linux-smoke-test');
const smoke = smokeLinux||process.argv.includes('--smoke-test');
if (smoke || process.env.DRIVEDECK_DATA_DIR) app.setPath('userData', path.resolve(process.env.DRIVEDECK_DATA_DIR || path.join(__dirname, '..', '.runtime/smoke')));
const page = path.join(__dirname, 'renderer/index.html');
const pageUrl = pathToFileURL(page).href;
const telemetry = new Telemetry();
const media = new Media({ scriptPath: app.isPackaged ? path.join(process.resourcesPath, 'native/media.ps1') : path.join(__dirname, '../native/media.ps1') });
const audio = new Audio({ scriptPath: app.isPackaged ? path.join(process.resourcesPath, 'native/audio.ps1') : path.join(__dirname, '../native/audio.ps1') });
function syncAudio() { const deck=settings.autoDeck&&telemetry.snapshot().vehicleId==='vivace'?'vivace':settings.deck; if((mobile.status().running||settings.miniPlayerView==='visualizer'||deck==='levels'||(deck==='sound'&&(settings.audioView==='visualizer'||settings.songVisualizer)))&&!settings.demo)audio.start();else if(audio.child||audio.state.starting||audio.state.error)audio.stop(); }
let animated, updates, updateTimer;
let window, settings, settingsFile, ticker;
let saveQueue = Promise.resolve();
let quitting = false;
const mobile = new MobileServer({root:__dirname,snapshot:()=>({settings:{units:settings.units,maxRpm:settings.maxRpm,redline:settings.redline,mapTerrain:settings.mapTerrain},data:telemetry.snapshot(),media:{...media.state,canToggle:false,canNext:false,canPrevious:false,canSeek:false},audio:audio.state}),map:()=>telemetry.mapFeed.snapshot(),preview:()=>{const data=telemetry.snapshot();return vehiclePreviews.get(data.vehicleId,data.vehicleName);}});

function displays() {
  return screen.getAllDisplays().map((d, index) => ({
    id: d.id, label: d.label || `Display ${index + 1}`, width: d.size.width, height: d.size.height,
    primary: d.id === screen.getPrimaryDisplay().id,
  }));
}

function send(channel, value) {
  if (window && !window.isDestroyed() && !window.webContents.isDestroyed()) window.webContents.send(channel, value);
}

function handle(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame
      || !event.senderFrame.url.startsWith(pageUrl)) throw new Error('Untrusted request.');
    return handler(...args);
  });
}

async function applySettings(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return { ok: false, error: 'Invalid settings.' };
  const next = validateSettings({ ...settings, ...patch });
  const previousPort = settings.port;
  try {
    if (next.port !== telemetry.port) await telemetry.listen(next.port);
    writeSettings(settingsFile, next);
    settings = next;
    animated.update(media.state,settings);
    syncAudio();
    window.setAlwaysOnTop(next.alwaysOnTop);
    send('settings:changed', settings);
    return { ok: true, settings };
  } catch (error) {
    if (telemetry.port !== previousPort) {
      try { await telemetry.listen(previousPort); } catch {}
    }
    return { ok: false, error: error.message };
  }
}

function queueSettings(patch) {
  const next = saveQueue.then(() => applySettings(patch));
  saveQueue = next.catch(() => {});
  return next;
}

function registerHandlers() {
  handle('mobile:status',()=>pairingCodes(mobile.status()));
  handle('mobile:start',async()=>{try{return await pairingCodes(await mobile.start());}catch{await mobile.stop();return {running:false,links:[],error:'Could not start the phone dashboard. Try again.'};}});
  handle('mobile:stop',()=>mobile.stop());
  handle('mobile:instructions',async()=>{await shell.openExternal('https://drivedecks.app/mobile');return {ok:true};});
  handle('release:acknowledge',()=>{fs.writeFileSync(notesSeenFile,JSON.stringify({version:app.getVersion()}));showInstalledNotes=false;return {ok:true};});
  handle('app:bootstrap', () => ({ platform:process.platform,currentRelease,showInstalledNotes,settings, telemetry: telemetry.snapshot(), map: telemetry.mapFeed.snapshot(), media: media.state, animation: animated.state, audio: audio.state, displays: displays(), version: app.getVersion(), updates: updates?.snapshot(), fullscreen: window.isFullScreen() }));
  handle('updates:check', () => updates.check());
  handle('updates:download', () => updates.download());
  handle('updates:install', () => updates.install());
  handle('updates:releases', async () => {if(!updates.releasesUrl)return {ok:false};await shell.openExternal(updates.releasesUrl);return {ok:true};});
  handle('vehicle:preview', id => id===telemetry.snapshot().vehicleId ? vehiclePreviews.get(id,telemetry.snapshot().vehicleName) : {id:null,image:null});
  handle('settings:update', patch => queueSettings(patch));
  handle('animation:retry', () => { animated.retry(); return {ok:true}; });
  handle('animation:failed', (source,key) => { animated.reject(source,key); return {ok:true}; });
  handle('animation:remove-canvas', () => { animated.library.remove(media.state); animated.retry(); return {ok:true}; });
  handle('animation:add-canvas', async () => {
    const current={...media.state};if(!current.available||!current.title||!current.artist)return {ok:false,error:'Play a song with a title and artist first.'};
    const result=await dialog.showOpenDialog(window,{title:'Choose a local Canvas clip for this song',properties:['openFile'],filters:[{name:'Video clip (up to 50 MB)',extensions:['mp4','webm']}]});
    if(result.canceled)return {ok:false,canceled:true};
    if(trackKey(current)!==trackKey(media.state))return {ok:false,error:'The song changed. Try again for the current song.'};
    try{animated.library.add(current,result.filePaths[0]);animated.retry();return {ok:true};}catch(error){return {ok:false,error:error.message};}
  });
  handle('animation:open-source', async () => {const url=animated.state.pageUrl;if(url&&/^https:\/\/music\.apple\.com\/us\/album\/\d+$/.test(url)){await shell.openExternal(url);return {ok:true};}return {ok:false};});
  handle('media:seek', seconds => media.command('seek',seconds));
  handle('media:command', action => media.command(action));
  handle('window:fullscreen', () => { window.setFullScreen(!window.isFullScreen()); return { ok: true }; });
  handle('window:resolution',async(width,height)=>{if(!Number.isInteger(width)||!Number.isInteger(height)||width<1000||width>7680||height<520||height>4320)return {ok:false,error:'Choose a width from 1000–7680 and height from 520–4320.'};const result=await queueSettings({windowWidth:width,windowHeight:height});if(!result.ok)return result;const resize=()=>{if(window.isMaximized())window.unmaximize();window.setContentSize(width,height);window.center();};if(window.isFullScreen()){window.once('leave-full-screen',resize);window.setFullScreen(false);}else resize();return {ok:true,width,height};});
  handle('window:minimize', () => window.minimize());
  handle('window:close', () => window.close());
  handle('window:displays', displays);
  handle('window:move', async id => {
    const display = screen.getAllDisplays().find(d => d.id === id);
    if (!display) return { ok: false, error: 'That display is no longer connected.' };
    window.setFullScreen(false);
    window.setBounds(display.workArea);
    await new Promise(resolve => setTimeout(resolve, 150));
    window.setFullScreen(true);
    return queueSettings({ displayId: id });
  });
  handle('settings:export', async () => {
    const result = await dialog.showSaveDialog(window, { title: 'Export DriveDeck setup', defaultPath: 'DriveDeck-setup.json', filters: [{ name: 'DriveDeck setup', extensions: ['json'] }] });
    if (result.canceled) return { ok: false, canceled: true };
    try { fs.writeFileSync(result.filePath, JSON.stringify({ format: 'drivedeck-setup', version: 1, settings }, null, 2)); return { ok: true }; }
    catch (error) { return { ok: false, error: error.message }; }
  });
  handle('settings:import', async () => {
    const result = await dialog.showOpenDialog(window, { title: 'Import DriveDeck setup', properties: ['openFile'], filters: [{ name: 'DriveDeck setup', extensions: ['json'] }] });
    if (result.canceled) return { ok: false, canceled: true };
    try {
      const file = result.filePaths[0];
      if (fs.statSync(file).size > 65536) throw new Error('Setup file is too large.');
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (data.format !== 'drivedeck-setup' || data.version !== 1 || !data.settings || typeof data.settings !== 'object') throw new Error('Choose a DriveDeck setup JSON file.');
      return queueSettings(validateSettings(data.settings));
    } catch (error) { return { ok: false, error: error.message }; }
  });
  handle('beamng:companion', async () => {
    const folder = app.isPackaged ? path.join(process.resourcesPath, 'beamng') : path.join(__dirname, '../beamng');
    const error = await shell.openPath(folder);
    return error ? { ok: false, error } : { ok: true };
  });
  handle('beamng:install', async () => {
    const locations=require('./lib/platform-paths.cjs').platformPaths();
    let root;
    if(process.platform==='linux'){
      const folders=(await require('./lib/beamng-folders.cjs').beamngFolders()).slice(0,6);
      if(folders.length){const choice=await dialog.showMessageBox(window,{type:'question',title:'Choose your BeamNG installation',message:'Which version of BeamNG are you running?',detail:folders.map((folder,index)=>`${index+1}. ${folder.kind}\n${folder.root}`).join('\n\n')+'\n\nChoose Proton if you selected Proton in Steam compatibility settings. Select the same Steam library as the game.',buttons:[...folders.map((folder,index)=>`${index+1}. ${folder.kind}`),'Browse for another folder…','Cancel'],defaultId:0,cancelId:folders.length+1});if(choice.response===folders.length+1)return {ok:false,canceled:true};if(choice.response<folders.length)root=folders[choice.response].root;}
    }
    if(!root){const result=await dialog.showOpenDialog(window,{title:'Choose the active BeamNG user folder (not its mods folder)',defaultPath:locations.user,properties:['openDirectory'],buttonLabel:'Install companion here'});if(result.canceled)return {ok:false,canceled:true};root=result.filePaths[0];}
    if (!fs.existsSync(path.join(root, 'settings')) && !fs.existsSync(path.join(root, 'beamng.log'))) return { ok: false, error: 'Choose the BeamNG user folder, containing settings or beamng.log.' };
    const source = app.isPackaged ? path.join(process.resourcesPath, 'beamng/drivedeck-companion.zip') : path.join(__dirname, '../beamng/drivedeck-companion.zip');
    const target = path.join(root, 'mods/drivedeck-companion.zip');
    const oldUnpacked = path.join(root, 'mods/unpacked/drivedeck');
    const backup = path.join(root, 'drivedeck-backups', String(Date.now()));
    const moved = [];
    try {
      const bytes = fs.readFileSync(source);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(`${target}.tmp`, bytes);
      for (const previous of [target, oldUnpacked]) {
        if (fs.existsSync(previous)) {
          fs.mkdirSync(backup, { recursive: true });
          const destination = path.join(backup, path.basename(previous));
          fs.renameSync(previous, destination); moved.push([previous, destination]);
        }
      }
      fs.renameSync(`${target}.tmp`, target);
      return { ok: true,installedTo:target };
    } catch (error) {
      for (const [previous, destination] of moved.reverse()) { try { fs.renameSync(destination, previous); } catch {} }
      return { ok: false, error: error.message };
    }
  });
}

async function createWindow() {
  settingsFile = path.join(app.getPath('userData'), 'settings.json');
  notesSeenFile=path.join(app.getPath('userData'),'release-notes-seen.json');
  const existingSettings=fs.existsSync(settingsFile);
  showInstalledNotes=!smoke&&shouldShowNotes(notesSeenFile,app.getVersion(),existingSettings);
  if(!existingSettings)fs.writeFileSync(notesSeenFile,JSON.stringify({version:app.getVersion()}));
  settings = readSettings(settingsFile);
  if(smoke)settings.animatedArtwork=false;
  animated=new AnimatedArtwork({library:new ClipLibrary(path.join(app.getPath('userData'),'animated-artwork'))});
  animated.on('state', state => send('animation:state',state));
  animated.update(media.state,settings);
  try { await telemetry.listen(settings.port); }
  catch (error) { telemetry.error = error.message; }
  const target = screen.getAllDisplays().find(d => d.id === settings.displayId);
  window = new BrowserWindow({
    title: 'DriveDeck', width: process.platform==='linux'?Math.min(settings.windowWidth,screen.getPrimaryDisplay().workAreaSize.width):settings.windowWidth, height: process.platform==='linux'?Math.min(settings.windowHeight,screen.getPrimaryDisplay().workAreaSize.height):settings.windowHeight, minWidth: 1000, minHeight: 520,
    icon: path.join(__dirname, 'renderer/assets/icon.png'),
    show: false, backgroundColor: '#0b0d0c', frame: false, autoHideMenuBar: true,
    ...(target ? { x: target.workArea.x, y: target.workArea.y } : {}),
    alwaysOnTop: settings.alwaysOnTop,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, backgroundThrottling: false, spellcheck: false },
  });
  Menu.setApplicationMenu(null);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  window.on('enter-full-screen', () => send('window:fullscreen-changed', true));
  window.on('leave-full-screen', () => send('window:fullscreen-changed', false));
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { event.preventDefault(); window.setFullScreen(!window.isFullScreen()); }
    if (input.key === 'Escape' && window.isFullScreen()) { event.preventDefault(); window.setFullScreen(false); }
  });
  updates = new Updates({updater:process.platform==='win32'?require('electron-updater').autoUpdater:process.platform==='linux'&&process.env.APPIMAGE?new (require('electron-updater').AppImageUpdater)():null,version:app.getVersion(),repository:require('../package.json').releaseRepository,packaged:app.isPackaged,portable:!!process.env.PORTABLE_EXECUTABLE_DIR,disabled:smoke||!!process.env.DRIVEDECK_DATA_DIR});
  updates.on('state', state => send('updates:state',state));
  registerHandlers();
  audio.on('state', state => send('audio:state', state));
  syncAudio();
  media.start();
  media.on('state', state => {send('media:state', state);animated.update(state,settings);});
  telemetry.mapFeed.on('update', patch => send('map:state', patch));
  let mapTick = 0;
  ticker = setInterval(() => { send('telemetry:state', telemetry.snapshot()); syncAudio(); if (++mapTick % 15 === 0) send('map:state', { connected: telemetry.mapFeed.snapshot().connected }); }, 1000 / 30);
  await window.loadFile(page);
  if (!smoke) {
    updateTimer=setTimeout(()=>updates.check(),4000);
    window.show();
    if (target) window.setFullScreen(true);
  } else {
    await require(smokeLinux?'../scripts/smoke-linux.cjs':'../scripts/smoke.cjs').run({ app, window, telemetry, media, settingsFile });
  }
}

if (app.requestSingleInstanceLock()) {
  app.on('second-instance', () => {
    if (window && !window.isDestroyed()) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); }
  });
  app.whenReady().then(createWindow).catch(error => { console.error(error); app.exit(1); });
} else { app.quit(); }
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => {
  if (quitting) return;
  quitting = true;
  void mobile.stop();
  clearTimeout(updateTimer); clearInterval(ticker); telemetry.close(); media.stop(); audio.stop(); animated?.stop();
});

const {app,BrowserWindow}=require('electron'),{MobileServer}=require('../src/lib/mobile.cjs'),path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
app.disableHardwareAcceleration();app.setPath('userData',path.resolve('.runtime/mobile-qa'));
async function checkModularFlow(win, setDesktopLayout) {
  const js = script => win.webContents.executeJavaScript(script);
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function until(expression) {
    for (let attempt = 0; attempt < 60; attempt++) {
      if (await js(expression)) return;
      await pause(50);
    }
    throw new Error('Timed out checking phone layout: ' + expression);
  }
  const gateVisible = "!document.getElementById('modular-setup').hidden";
  await js(`document.getElementById('library-open').click();
    document.querySelector('#cards [data-deck="modular"]').click();`);
  await until(gateVisible);
  assert.equal(await js("document.getElementById('stage').hidden"), true);
  assert.ok(await js("document.querySelector('#cards [data-deck=modular] .deck-new-tag') !== null"));
  const desktopTile = {id:'desktop-rpm',type:'sound-rpm',x:0,y:0,w:2,h:2};
  setDesktopLayout([desktopTile]);
  await until("document.querySelector('[data-id=desktop-rpm]') !== null");
  assert.equal(await js(gateVisible), false);
  await until("document.querySelector('#cards [data-deck=modular] .deck-new-tag') === null");
  assert.equal(await js("document.querySelector('[data-um-edit]').hidden"), true);
  assert.equal(await js("document.querySelector('[data-um-source]').textContent"), 'Stay on mobile');
  setDesktopLayout([{ ...desktopTile, id:'desktop-gear', type:'gear' }]);
  await until("document.querySelector('[data-id=desktop-gear]') !== null");
  await js("document.querySelector('[data-um-source]').click()");
  await until("!document.querySelector('[data-um-edit]').hidden");
  await js(`(() => {
    const presets = document.querySelector('[data-um-presets]');
    presets.value = '2';
    presets.dispatchEvent(new Event('change'));
  })()`);
  await until("document.querySelector('[data-module=lyrics]') !== null");
  assert.equal(await js("JSON.parse(localStorage.getItem('drivedeck-phone')).modularSource"), 'phone');
  await win.reload();
  await until("document.querySelector('[data-module=lyrics]') !== null");
  assert.equal(await js("document.querySelector('#cards .deck-new-tag')"), null);
  assert.equal(await js("document.querySelector('#cards > button').dataset.deck"), 'martin');
  await js("document.querySelector('[data-um-source]').click()");
  await until("document.querySelector('[data-id=desktop-gear]') !== null");
  assert.ok(await js("JSON.parse(localStorage.getItem('drivedeck-phone')).modularLayout.some(tile => tile.type === 'lyrics')"));
  setDesktopLayout([]);
  await until(gateVisible);
  await js("document.getElementById('modular-stay').click()");
  await until("document.querySelector('[data-module=lyrics]') !== null && !document.getElementById('stage').hidden");
}

app.whenReady().then(async()=>{let connected=true,desktopLayout=[];const server=new MobileServer({root:path.resolve('src'),snapshot:deck=>({...(deck==='modular'?{modular:{ready:desktopLayout.length>0,layout:desktopLayout}}:{}),settings:{maxRpm:8000,redline:6500},data:{connected,vehicleId:'vivace',vehicleName:'Cherrier Ardente',selectedGear:'D',gear:4,rpm:4000,speedMps:25,fuel:.7,engineTemp:85},media:{available:false},audio:{}}),map:()=>({roads:[],route:[],position:null,connected:false}),preview:async()=>({image:null})});await server.start({host:'127.0.0.1'});const win=new BrowserWindow({show:false,width:844,height:390,webPreferences:{offscreen:true,backgroundThrottling:false}});const errors=[];win.webContents.on('console-message',(event)=>{if(event.level==='error'||event.level===3)errors.push(event.message);});await win.loadURL(`http://127.0.0.1:${server.status().port}/#${server.token}`);const js=s=>win.webContents.executeJavaScript(s);await new Promise(r=>setTimeout(r,1800));await js(`localStorage.removeItem('drivedeck-pair');localStorage.removeItem('drivedeck-phone')`);await win.loadURL(`http://127.0.0.1:${server.status().port}/`);await new Promise(r=>setTimeout(r,1200));if(!await js(`document.getElementById('pairing').open`))throw new Error('Home Screen pairing form missing');await js(`document.getElementById('pc-address').value=location.host;document.getElementById('pair-code').value=${JSON.stringify(server.pairCode)};document.getElementById('pair-form').requestSubmit()`);await new Promise(r=>setTimeout(r,1200));if(await js(`document.getElementById('pairing').open`))throw new Error('Manual pairing failed');await win.reload();await new Promise(r=>setTimeout(r,1200));if(await js(`document.getElementById('pairing').open`))throw new Error('Pairing was not remembered');const decks=await js(`Array.from(document.querySelectorAll('#cards [data-deck]'),b=>b.dataset.deck)`);if(decks.length!==16)throw new Error('Missing decks: '+JSON.stringify(errors));assert.deepEqual(decks.slice(0, 3), ['modular', 'lyrics', 'martin']);for(const deck of decks){await js(`document.querySelector('#cards [data-deck="${deck}"]').click()`);await new Promise(r=>setTimeout(r,120));}await checkModularFlow(win,layout=>{desktopLayout=layout;});for(const deck of ['model-three','model-s']){await js(`document.querySelector('#cards [data-deck="${deck}"]').click()`);await new Promise(r=>setTimeout(r,1000));const prefix=deck==='model-s'?'ms':'mt';const image=await js(`new Promise(resolve=>{const src=document.getElementById('${prefix}-rear-image').getAttribute('href');const image=new Image();image.onload=()=>resolve({src,loaded:true});image.onerror=()=>resolve({src,loaded:false});image.src=src;})`);if(!image.loaded||!image.src.includes('/renderer/assets/vehicles/Ardente.png'))throw new Error('Drive vehicle image failed: '+JSON.stringify(image));}await js(`document.querySelector('#cards [data-deck="sound"]').click()`);await new Promise(r=>setTimeout(r,1000));await js(`document.getElementById('song-levels-toggle').click()`);await new Promise(r=>setTimeout(r,1000));if(!await js(`document.getElementById('song-levels-toggle').getAttribute('aria-pressed')==='true'&&!document.getElementById('song-levels').hidden`))throw new Error('Song visualizer toggle did not enable');await js(`document.getElementById('song-levels-toggle').click()`);await new Promise(r=>setTimeout(r,1000));if(!await js(`document.getElementById('song-levels').hidden`))throw new Error('Song visualizer toggle did not disable');await js(`document.querySelector('#cards [data-deck="m235"]').click()`);await new Promise(r=>setTimeout(r,1800));const reading=await js(`document.getElementById('m235-speed').textContent`);if(Number(reading)<50)throw new Error('No live speed: '+reading);connected=false;await new Promise(r=>setTimeout(r,1800));if(await js(`document.getElementById('m235-speed').textContent`)!=='—')throw new Error('Stale speed');await js(`Object.defineProperty(document.documentElement,'requestFullscreen',{configurable:true,value:()=>Promise.reject(new Error('Unsupported'))});document.getElementById('fullscreen').click()`);await new Promise(r=>setTimeout(r,300));if(!await js(`document.body.classList.contains('immersive')&&getComputedStyle(document.querySelector('.phone-toolbar')).display==='none'&&!document.getElementById('exit-fullscreen').hidden`))throw new Error('Fullscreen fallback failed');fs.mkdirSync('artifacts/mobile',{recursive:true});await new Promise(r=>setTimeout(r,1500));fs.writeFileSync('artifacts/mobile/expanded.png',(await win.webContents.capturePage()).toPNG());await js(`document.getElementById('exit-fullscreen').click()`);if(await js(`document.body.classList.contains('immersive')`))throw new Error('Exit failed');win.setSize(390,844);await new Promise(r=>setTimeout(r,200));if(await js('document.documentElement.scrollWidth>innerWidth'))throw new Error('Portrait overflow');fs.mkdirSync('artifacts/mobile',{recursive:true});fs.writeFileSync('artifacts/mobile/portrait.png',(await win.webContents.capturePage()).toPNG());win.setSize(844,390);await js(`document.querySelector('#cards [data-deck="m235"]').click()`);connected=true;await new Promise(r=>setTimeout(r,1800));fs.writeFileSync('artifacts/mobile/landscape.png',(await win.webContents.capturePage()).toPNG());await server.stop();await new Promise(r=>setTimeout(r,3000));if(await js(`document.getElementById('m235-speed').textContent`)!=='—')throw new Error('Connection loss did not blank speed: '+JSON.stringify(await js("({speed:document.getElementById('m235-speed').textContent,hidden:document.hidden,connection:document.getElementById('connection').textContent,recovery:document.getElementById('recovery-message').textContent})")));if(errors.length)throw new Error(errors.join('\n'));console.log('PASS phone dashboard: 16 decks, desktop and independent Modular layouts, live speed, disconnect, landscape and portrait');win.destroy();app.quit();}).catch(e=>{console.error(e);app.exit(1);});

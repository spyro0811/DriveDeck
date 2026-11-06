const {app,BrowserWindow}=require('electron'),path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
app.disableHardwareAcceleration();app.setPath('userData',path.resolve('.runtime/martin-refinement'));
app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:1560,height:650,useContentSize:true,webPreferences:{backgroundThrottling:false}}),js=s=>win.webContents.executeJavaScript(s),delay=ms=>new Promise(r=>setTimeout(r,ms));const until=async code=>{for(let i=0;i<120;i++){if(await js(code))return;await delay(50);}throw Error('Timed out: '+code);};
 await win.loadFile(path.resolve('src/renderer/index.html'));await until("document.getElementById('app').dataset.ready==='true'");
 await js("localStorage.setItem('drivedeck-preview',JSON.stringify({deck:'martin',martinCenter:'artwork',demo:true,autoDeck:false}))");win.reload();await delay(300);await until("document.getElementById('deck-stage').dataset.deck==='martin'");
 await js("document.fonts.load('700 20px MartinSF').then(()=>true)");assert.equal(await js("document.fonts.check('700 20px MartinSF')"),true);assert.match(await js("getComputedStyle(document.getElementById('martin-speed-value')).fontFamily"),/MartinSF/);
 assert.equal(await js("document.getElementById('deck-media').getClientRects().length"),0);assert.ok(await js("document.getElementById('martin-play').getClientRects().length"));
 await js("document.getElementById('martin-play').click()");await until("document.getElementById('martin-play').textContent==='▶'");await js("document.getElementById('martin-play').click()");
 const dial=await js("(()=>{const r=document.querySelector('.martin-dial>svg').getBoundingClientRect();return {width:r.width,height:r.height}})()");assert.ok(Math.abs(dial.width-dial.height)<1);
 await js("document.getElementById('martin-center').value='tires';document.getElementById('martin-center').dispatchEvent(new Event('change'))");await until("document.getElementById('martin-tires').hidden===false");assert.ok(await js("document.getElementById('deck-media').getClientRects().length"));
 const nextDial=await js("document.querySelector('.martin-dial>svg').getBoundingClientRect().width");assert.ok(Math.abs(dial.width-nextDial)<1,'Gauge proportions stay stable when center view changes');
 fs.mkdirSync('artifacts/martin-refinement',{recursive:true});
 for(const [width,height]of [[1560,650],[2560,720],[1280,800]]){
  win.setContentSize(width,height);await js("document.getElementById('app').dataset.fullscreen='true'");await delay(250);
  const geometry=await js("(()=>{const s=document.getElementById('martin-center').getBoundingClientRect(),h=document.querySelector('.cockpit-header').getBoundingClientRect();return {x:s.x+s.width/2,y:s.y+s.height/2,selectTop:s.top,menuBottom:h.bottom}})()");assert.ok(geometry.selectTop>geometry.menuBottom+4);
  win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(geometry.x),y:2});await delay(200);
  win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(geometry.x),y:Math.round(geometry.y)});await delay(200);
  assert.equal(await js("document.elementFromPoint("+geometry.x+","+geometry.y+").id"),'martin-center');
  await js("document.getElementById('martin-center').focus()");win.webContents.sendInputEvent({type:'keyDown',keyCode:'Home'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Home'});await until("document.getElementById('martin-art').hidden===false");
  assert.equal(await js("document.getElementById('deck-media').getClientRects().length"),0);
  await win.webContents.capturePage();await delay(200);fs.writeFileSync('artifacts/martin-refinement/fullscreen-'+width+'x'+height+'.png',(await win.webContents.capturePage()).toPNG());
 }
 console.log('PASS supplied font, centered circles, stable proportions, artwork transport, mini-player visibility and fullscreen selector mouse hit testing / keyboard input at three display sizes.');app.exit(0);
}).catch(error=>{console.error(error);app.exit(1);});

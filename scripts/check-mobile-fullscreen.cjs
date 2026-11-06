const {app,BrowserWindow}=require('electron');
const {MobileServer}=require('../src/lib/mobile.cjs');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
app.disableHardwareAcceleration();app.setPath('userData',path.resolve('.runtime/mobile-fullscreen-qa'));
app.whenReady().then(async()=>{
 const server=new MobileServer({root:path.resolve('src'),snapshot:()=>({settings:{maxRpm:8000},data:{connected:true,speedMps:25,rpm:3500,gear:3,selectedGear:'D'},media:{available:false},audio:{}}),map:()=>({roads:[],connected:false}),preview:async()=>({image:null})});
 await server.start({host:'127.0.0.1'});
 const win=new BrowserWindow({show:false,width:844,height:390,useContentSize:true,webPreferences:{offscreen:true,backgroundThrottling:false}}),js=s=>win.webContents.executeJavaScript(s),delay=ms=>new Promise(r=>setTimeout(r,ms));
 await win.loadURL(`http://127.0.0.1:${server.status().port}/#${server.token}`);await delay(700);
 await js(`Object.defineProperty(document.documentElement,'requestFullscreen',{value:()=>Promise.reject(Error('Unsupported')),configurable:true});document.getElementById('fullscreen').click()`);
 fs.mkdirSync('artifacts/mobile-fullscreen',{recursive:true});
 const cases=[{w:844,h:390,left:0,right:0},{w:932,h:430,left:59,right:0},{w:932,h:430,left:0,right:59},{w:1200,h:300,left:0,right:0},{w:1024,h:768,left:0,right:0},{w:390,h:844,left:0,right:0,top:59,bottom:34}];
 for(const {w,h,left,right,top=0,bottom=0} of cases){
  win.setContentSize(w,h);await js(`for(const [name,value] of Object.entries(${JSON.stringify({left,right,top,bottom})})){document.body.style.setProperty('--phone-safe-'+name,value+'px')}`);await delay(150);
  for(const deck of await js(`Array.from(document.querySelectorAll('#cards [data-deck]'),e=>e.dataset.deck)`)){
   await js(`document.querySelector('#cards [data-deck="${deck}"]').click()`);await delay(100);
   const box=await js(`(()=>{const s=document.getElementById('stage').getBoundingClientRect(),v=document.getElementById('viewport').getBoundingClientRect(),a=document.getElementById('deck-area').getBoundingClientRect();return {x:s.x,y:s.y,right:s.right,bottom:s.bottom,w:s.width,h:s.height,vx:v.x,vy:v.y,vw:v.width,vh:v.height,ax:a.x,ay:a.y,aw:a.width,ah:a.height,immersive:document.body.classList.contains('immersive'),error:!document.getElementById('connection-recovery').hidden}})()`);
   assert.ok(box.immersive&&!box.error,JSON.stringify({deck,box}));
   assert.ok(box.x>=left+7&&box.right<=w-right-7,'Content clears camera cutout: '+JSON.stringify({deck,box}));
   assert.ok(box.y>=top&&box.bottom<=h-bottom+1,'Content clears portrait cutout and home indicator');
   assert.ok(box.vy>=24&&h-box.vy-box.vh>=24,'Top and bottom black bars stay visible');
   assert.ok(Math.abs(box.vx)<1&&Math.abs(box.vw-w)<1,'Backdrop fills width without black side bars');
   if(w>=h)assert.ok(Math.abs(box.x-box.ax)<1&&Math.abs(box.y-box.ay)<1&&Math.abs(box.w-box.aw)<1&&Math.abs(box.h-box.ah)<1,'Deck fills safe landscape area');
  }
  await js(`document.querySelector('#cards [data-deck=martin]').click()`);await delay(200);
  fs.writeFileSync(`artifacts/mobile-fullscreen/${w}x${h}-safe-${left}-${right}.png`,(await win.webContents.capturePage()).toPNG());
 }
 await js(`document.getElementById('exit-fullscreen').click()`);assert.equal(await js(`document.body.classList.contains('immersive')`),false);
 await server.stop();console.log('PASS all 13 decks clear left/right cutouts and portrait safe areas, preserve black bars, fill the safe display area; exit restores toolbar');win.destroy();app.quit();
}).catch(e=>{console.error(e);app.exit(1)});

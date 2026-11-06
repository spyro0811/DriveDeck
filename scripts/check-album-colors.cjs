const {app,BrowserWindow,nativeImage}=require('electron'),{MobileServer}=require('../src/lib/mobile.cjs');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
app.disableHardwareAcceleration();app.setPath('userData',path.resolve('.runtime/album-color-qa'));
app.whenReady().then(async()=>{
 const artwork=nativeImage.createFromPath(process.argv[2]).toDataURL();
 const server=new MobileServer({root:path.resolve('src'),snapshot:()=>({settings:{maxRpm:8000},data:{connected:true,speedMps:25,rpm:3500,gear:3,selectedGear:'D'},media:{available:true,playing:true,title:'Album palette preview',artwork},audio:{available:true,updatedAt:Date.now(),bands:Array.from({length:32},(_,i)=>.25+(i%7)/12)}}),map:()=>({roads:[],connected:false}),preview:async()=>({image:null})});
 await server.start({host:'127.0.0.1'});const win=new BrowserWindow({show:false,width:1200,height:600,useContentSize:true,webPreferences:{offscreen:true,backgroundThrottling:false}}),js=s=>win.webContents.executeJavaScript(s),delay=ms=>new Promise(r=>setTimeout(r,ms));
 await win.loadURL(`http://127.0.0.1:${server.status().port}/#${server.token}`);await delay(800);fs.mkdirSync('artifacts/album-colors',{recursive:true});
 for(const deck of ['sound','levels']){
  await js(`document.querySelector('#cards [data-deck="${deck}"]').click()`);await delay(800);
  const palette=await js(`Array.from({length:3},(_,i)=>getComputedStyle(document.getElementById('stage')).getPropertyValue('--album-'+(i+1)).trim())`);
  assert.equal(palette[0],'#9b145a');assert.equal(palette[1],palette[2]);assert.ok(palette[1].slice(1).match(/../g).every(v=>parseInt(v,16)>=85&&parseInt(v,16)<=100));
  fs.writeFileSync(`artifacts/album-colors/${deck}.png`,(await win.webContents.capturePage()).toPNG());
 }
 await server.stop();console.log('PASS supplied cover produces pink/muted gray in Ultra Sound and Ultra Levels');win.destroy();app.quit();
}).catch(e=>{console.error(e);app.exit(1)});

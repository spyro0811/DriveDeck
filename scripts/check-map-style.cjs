// Isolated preview QA; no game or music controls.
const {app,BrowserWindow}=require('electron');const fs=require('node:fs'),path=require('node:path');
app.disableHardwareAcceleration();app.setPath('userData',path.resolve('.runtime/map-style-preview'));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:2560,height:720,webPreferences:{backgroundThrottling:false}});
 await win.loadFile(path.resolve('src/renderer/index.html'));const js=code=>win.webContents.executeJavaScript(code);
 await new Promise(r=>setTimeout(r,600));fs.mkdirSync('artifacts/map081-final',{recursive:true});
 for(const deck of ['ultra','atlas','pure']){
  await js(`document.getElementById('deck-select').value='${deck}';document.getElementById('deck-select').dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('app').dataset.fullscreen='true'`);
  await win.webContents.capturePage();await new Promise(r=>setTimeout(r,450));
  console.log(deck,await js("['map-zoom-in','map-zoom-out'].map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {id,hit:hit?.id,cls:hit?.className}})"));
  fs.writeFileSync(`artifacts/map081-final/${deck}.png`,(await win.webContents.capturePage()).toPNG());
 }
 console.log('Captured all three map decks with the dark default palette.');app.quit();
}).catch(error=>{console.error(error);app.exit(1)});

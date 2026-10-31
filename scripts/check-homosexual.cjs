// Isolated preview QA; no game or music controls.
const {app,BrowserWindow}=require('electron');const fs=require('node:fs'),path=require('node:path');
app.disableHardwareAcceleration();app.setPath('userData',path.resolve('.runtime/map-style-preview'));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:2560,height:720,webPreferences:{backgroundThrottling:false}});
 await win.loadFile(path.resolve('src/renderer/index.html'));const js=code=>win.webContents.executeJavaScript(code);
 await new Promise(r=>setTimeout(r,600));fs.mkdirSync('artifacts/homosexual010',{recursive:true});
 for(const deck of ['homosexual']){
  await js(`document.getElementById('deck-select').value='${deck}';document.getElementById('deck-select').dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('app').dataset.fullscreen='true'`);
  await win.webContents.capturePage();await new Promise(r=>setTimeout(r,450));

  fs.writeFileSync(`artifacts/homosexual010/${deck}.png`,(await win.webContents.capturePage()).toPNG());
 }
 console.log('Captured homosexual reference deck.');app.quit();
}).catch(error=>{console.error(error);app.exit(1)});

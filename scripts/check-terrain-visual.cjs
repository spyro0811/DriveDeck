// Isolated preview QA; no game or music controls.
const {app,BrowserWindow}=require('electron');const fs=require('node:fs'),path=require('node:path');
app.disableHardwareAcceleration();app.setPath('userData',path.resolve('.runtime/map-style-preview'));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:2560,height:720,webPreferences:{backgroundThrottling:false}});
 await win.loadFile(path.resolve(process.env.DRIVEDECK_RENDERER||'src/renderer/index.html'));const js=code=>win.webContents.executeJavaScript(code);
 await new Promise(r=>setTimeout(r,600));fs.mkdirSync('artifacts/atlas012',{recursive:true});
 await js(`(async()=>{const {MapCanvas}=await import('./map.mjs');const draw=MapCanvas.prototype.draw;MapCanvas.prototype.draw=function(map,settings,now){const cells=[];for(let y=0;y<96;y++)for(let x=0;x<96;x++)cells.push(x<40+8*Math.sin(y/8)?1:x>60+6*Math.sin(y/5)?2:y>32&&y<62?3:0);return draw.call(this,{...map,terrain:{origin:[-3840,-3840],width:96,height:96,step:80,cells}},settings,now)}})()`);
 await js("document.querySelector('[data-deck-choice=atlas]').click();document.getElementById('atlas-view').value='3d';document.getElementById('atlas-view').dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('app').dataset.fullscreen='true'");
 await win.webContents.capturePage();await new Promise(r=>setTimeout(r,500));
 fs.writeFileSync('artifacts/atlas012/terrain-smooth.png',(await win.webContents.capturePage()).toPNG());
 console.log('Captured explicit demo terrain colors.');app.quit();
}).catch(error=>{console.error(error);app.exit(1)});

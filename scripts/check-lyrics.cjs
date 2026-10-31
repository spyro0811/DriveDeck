const {app,BrowserWindow}=require('electron');const fs=require('node:fs');const path=require('node:path');
app.disableHardwareAcceleration();
app.setPath('userData',path.resolve('.runtime/lyrics-layout'));
app.whenReady().then(async()=>{
 console.log('ready');const win=new BrowserWindow({show:false,width:2560,height:720,webPreferences:{backgroundThrottling:false}});
 await win.loadFile(path.resolve('src/renderer/index.html'));const js=code=>win.webContents.executeJavaScript(code);
 await new Promise(r=>setTimeout(r,600));
 await js("document.getElementById('deck-select').value='lyrics';document.getElementById('deck-select').dispatchEvent(new Event('change',{bubbles:true}))");
 console.log('loaded');await win.webContents.capturePage();await new Promise(r=>setTimeout(r,1200));
 const layout=await js("(()=>{const ids=['sound-stage','lyrics-stage','sound-center','sound-info'];const result=Object.fromEntries(ids.map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect();return [id,{top:r.top,bottom:r.bottom,height:r.height,scroll:e.scrollTop,client:e.clientHeight,scrollHeight:e.scrollHeight,hidden:e.hidden}]}));const current=document.querySelector('#lyrics-stage .current');result.active=current?{top:current.getBoundingClientRect().top,bottom:current.getBoundingClientRect().bottom,offset:current.offsetTop}:null;return result})()");
 fs.mkdirSync('artifacts/lyrics-layout',{recursive:true});fs.writeFileSync('artifacts/lyrics-layout/lyrics.png',(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(layout,null,2));app.quit();
}).catch(e=>{console.error(e);app.exit(1)});

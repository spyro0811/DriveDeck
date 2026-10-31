// Isolated preview QA; no game or music controls.
const {app,BrowserWindow}=require('electron');const fs=require('node:fs'),path=require('node:path');
app.disableHardwareAcceleration();app.setPath('userData',path.resolve('.runtime/map-style-preview'));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:2560,height:720,webPreferences:{backgroundThrottling:false}});
 await win.loadFile(path.resolve(process.env.DRIVEDECK_RENDERER||'src/renderer/index.html'));const js=code=>win.webContents.executeJavaScript(code);
 await new Promise(r=>setTimeout(r,600));fs.mkdirSync('artifacts/atlas012',{recursive:true});
 for(const view of ['2d','3d'])for(const [width,height] of [[1000,520],[1560,650],[2560,720]]){
  win.setSize(width,height);
  await js(`document.querySelector('[data-deck-choice=atlas]').click();document.getElementById('atlas-view').value='${view}';document.getElementById('atlas-view').dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('app').dataset.fullscreen='true'`);
  await win.webContents.capturePage();await new Promise(r=>setTimeout(r,450));
  console.log(view,width,await js(`(()=>{const s=document.querySelector('.rev-dial>svg'),r=s.getBoundingClientRect(),padding=parseFloat(getComputedStyle(s).paddingLeft),radius=Math.min(r.width-padding*2,r.height-padding*2)/340*148,g=document.getElementById('ultra-gear').getBoundingClientRect();return {gear:document.getElementById('ultra-gear').textContent,radius,ratio:Math.max(...[[g.left,g.top],[g.right,g.top],[g.left,g.bottom],[g.right,g.bottom]].map(([x,y])=>Math.hypot(x-(r.x+r.width/2),y-(r.y+r.height/2))/radius))}})()`));
  const controls=await js(`(()=>{const c=document.getElementById('deck-map').getBoundingClientRect(),x=c.x+c.width/2,y=c.y+c.height*${view==='3d'?.68:.59},z=document.querySelector('.map-zoom').getBoundingClientRect();return {overlap:z.left<x+30&&z.right>x-30&&z.top<y+30&&z.bottom>y-30,hits:['map-zoom-in','map-zoom-out','map-dimension'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.id===id})}})()`);
  if(controls.overlap||controls.hits.some(hit=>!hit))throw Error('Atlas control placement failed '+JSON.stringify(controls));
  fs.writeFileSync(`artifacts/atlas012/${view}-${width}.png`,(await win.webContents.capturePage()).toPNG());
 }
 console.log('Captured Atlas 2D/3D at three sizes.');app.quit();
}).catch(error=>{console.error(error);app.exit(1)});

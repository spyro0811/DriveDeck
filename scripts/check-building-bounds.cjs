// Replay numeric geometry read from the running East Coast map. No game assets.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
app.disableHardwareAcceleration();app.setPath('userData',path.resolve('.runtime/building-bounds-qa'));
app.whenReady().then(async()=>{
 const scene=JSON.parse(fs.readFileSync('artifacts/building-bounds/live-city-replay.json','utf8'));
 const win=new BrowserWindow({show:false,width:1640,height:650,useContentSize:true,webPreferences:{offscreen:true}});await win.loadFile(path.resolve('src/renderer/index.html'));await new Promise(r=>setTimeout(r,500));
 const result=await win.webContents.executeJavaScript(`(async()=>{
  const scene=${JSON.stringify(scene)}, {SurroundingsView}=await import('./surroundings.mjs'),{vehicleVisual}=await import('./vehicle-identity.mjs');
  const output=document.createElement('canvas');output.width=1640;output.height=650;const ctx=output.getContext('2d');ctx.fillStyle='#10171d';ctx.fillRect(0,0,1640,650);ctx.fillStyle='#e5ebef';ctx.font='500 26px Segoe UI';ctx.fillText('Absolute · building footprint correction',30,42);ctx.fillStyle='#9eacb7';ctx.font='14px Segoe UI';ctx.fillText('Same town, road data and viewpoint · geometry read from the running map',30,69);
  const data={connected:true,vehicleId:'vivace',vehicleName:'Cherrier Ardente',speedMps:0},visual=vehicleVisual(data),car=new Image();car.src=new URL('./assets/vehicles/'+visual.asset+'.png',location.href).href;await car.decode();
  for(const [index,key]of ['before','after'].entries()){
   const canvas=document.createElement('canvas');canvas.getBoundingClientRect=()=>({width:760,height:480});const view=new SurroundingsView(canvas);view.draw({...data,surroundings:{vehicles:[],signals:[],environment:scene[key],lanes:scene.lanes}},1000,scene.map,'absolute');
   const c=canvas.getContext('2d');c.globalCompositeOperation='destination-over';c.fillStyle='#f0f2f4';c.fillRect(0,0,760,480);c.globalCompositeOperation='source-over';const box=visual.viewBox,scale=Math.min(185/box[2],150/box[3]),w=box[2]*scale,h=box[3]*scale;c.drawImage(car,...box,380-w/2,458-h,w,h);
   const x=30+index*810;ctx.fillStyle='#dce5eb';ctx.font='500 19px Segoe UI';ctx.fillText(index?'Corrected · local bounds and rotation':'Before · enlarged world-aligned boxes',x,109);ctx.drawImage(canvas,x,130,760,480);
  }
  const inside=(o,x,y)=>{const a=o.heading*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=x-o.x,dy=y-o.y;return Math.abs(dx*c-dy*s)<o.width/2&&Math.abs(dx*s+dy*c)<o.length/2;};
  return {png:output.toDataURL('image/png'),beforeInside:scene.before.filter(o=>o.kind==='building'&&inside(o,0,0)).length,afterInside:scene.after.filter(o=>o.kind==='building'&&inside(o,0,0)).length};
 })()`);
 assert.ok(result.beforeInside>0,'Live replay must reproduce the car-inside-building defect');assert.equal(result.afterInside,0,'Corrected building bounds must leave the parked car outside');
 fs.writeFileSync('artifacts/building-bounds/city-before-after.png',Buffer.from(result.png.split(',')[1],'base64'));win.destroy();console.log('PASS live-map replay: car inside '+result.beforeInside+' old building boxes, outside every corrected box');app.quit();
}).catch(error=>{console.error(error);app.exit(1)});

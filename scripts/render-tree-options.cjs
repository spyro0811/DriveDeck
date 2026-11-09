const {app,BrowserWindow}=require('electron'),path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
app.disableHardwareAcceleration();app.setPath('userData',path.resolve('.runtime/tree-options-qa'));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1560,height:760,useContentSize:true,webPreferences:{offscreen:true}});
 await win.loadFile(path.resolve('src/renderer/index.html'));await new Promise(r=>setTimeout(r,500));
 const result=await win.webContents.executeJavaScript(`(async()=>{
  const {environmentMesh}=await import('./environment-3d.mjs'),{paintTraffic,trafficCarMesh}=await import('./traffic-3d.mjs'),{drawRoadLanes}=await import('./road-lanes.mjs'),{drawSidewalkSurface}=await import('./sidewalk-surface.mjs');
  const c=document.createElement('canvas');c.width=1560;c.height=760;const ctx=c.getContext('2d');ctx.fillStyle='#10171d';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#e4e9ed';ctx.font='500 28px Segoe UI';ctx.fillText('Absolute · tree options',42,48);ctx.font='14px Segoe UI';ctx.fillStyle='#9eacb7';ctx.fillText('Gray model geometry, enlarged above · the same perspective road view below',42,76);
  const styles=[['compact','A · Compact oval','Smaller crown, open road view'],['slender','B · Slender canopy','Narrower silhouette, taller crown'],['evergreen','C · Layered evergreen','Active · tapered, three overlapping layers']];
  for(let i=0;i<styles.length;i++){
   const [style,label,note]=styles[i],x=38+i*506,w=480;ctx.save();ctx.translate(x,102);ctx.fillStyle='#f1f3f4';ctx.beginPath();ctx.roundRect(0,0,w,620,16);ctx.fill();ctx.fillStyle='#283139';ctx.font='500 21px Segoe UI';ctx.fillText(label,22,38);ctx.font='13px Segoe UI';ctx.fillStyle='#69757f';ctx.fillText(note,22,62);
   ctx.fillStyle='#d8dde0';ctx.beginPath();ctx.ellipse(w/2,346,72,13,0,0,Math.PI*2);ctx.fill();
   const faces=environmentMesh({kind:'tree',x:0,y:0,z:12,width:12,length:10,height:9,heading:0},style).sort((a,b)=>b.points.reduce((s,p)=>s+p[1],0)/b.points.length-a.points.reduce((s,p)=>s+p[1],0)/a.points.length);
   for(const f of faces){ctx.beginPath();f.points.forEach(([u,v,z],j)=>{const px=w/2+(u+v*.32)*31,py=345-z*31+v*5;j?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.closePath();ctx.fillStyle=f.color;ctx.fill();ctx.strokeStyle=f.color;ctx.lineWidth=.6;ctx.stroke();}
   ctx.font='12px Segoe UI';ctx.fillStyle='#69757f';ctx.fillText('Perspective view',22,387);
   const scene=document.createElement('canvas');scene.width=440;scene.height=190;const sc=scene.getContext('2d');sc.fillStyle='#e9ecef';sc.fillRect(0,0,440,190);drawRoadLanes(sc,{count:2,points:[{x:-1.75,y:-8,width:7,roadWidth:7},{x:-1.75,y:100,width:7,roadWidth:7}]},440,190,false);drawSidewalkSurface(sc,Array.from({length:36},(_,j)=>({x:5.6,y:j-8,width:3,length:1,heading:0})),440,190);paintTraffic(sc,[...environmentMesh({kind:'tree',x:5.6,y:28,z:12,width:12,length:10,height:9,heading:0},style),...trafficCarMesh({x:0,y:0,heading:0,body:'sedan'})],440,190);ctx.drawImage(scene,20,403);ctx.restore();
  }
  const rows=Array.from({length:24},(_,i)=>({x:3.5+(i>15?.4:0),y:i-8,width:2,length:1,heading:0})),probe=document.createElement('canvas');probe.width=900;probe.height=480;const pc=probe.getContext('2d'),cache={stationary:true,lanes:{count:2,points:[{x:0,y:-15,width:5,roadWidth:5},{x:0,y:60,width:5,roadWidth:5}]}};const draw=objects=>{pc.clearRect(0,0,900,480);drawSidewalkSurface(pc,objects,900,480,cache);return probe.toDataURL('image/png');};const original=draw(rows);let stable=true;for(let frame=0;frame<120;frame++){const shuffled=[...rows.slice(frame%rows.length),...rows.slice(0,frame%rows.length)].map(o=>({...o,x:o.x+Math.sin(frame)*.02,y:o.y+Math.cos(frame)*.02}));if(draw(shuffled)!==original)stable=false;}cache.stationary=false;const moved=draw(rows.map(o=>({...o,y:o.y-1})))!==original;
  return {contact:c.toDataURL('image/png'),pavement:original,stable,moved};
 })()`);
 assert.equal(result.stable,true,'Parked sidewalk pixels changed with shuffled packets and sensor jitter');assert.equal(result.moved,true,'Sidewalk failed to follow movement');
 fs.mkdirSync('artifacts/tree-options',{recursive:true});for(const [name,data]of [['tree-options',result.contact],['stationary-sidewalk',result.pavement]])fs.writeFileSync('artifacts/tree-options/'+name+'.png',Buffer.from(data.split(',')[1],'base64'));
 win.destroy();console.log('PASS three native tree mockups; 120 parked frames are pixel-identical and movement still updates');app.quit();
}).catch(error=>{console.error(error);app.exit(1);});

// Colors describe sampled terrain surfaces, never inferred administrative zones.
const DARK=['#171a1e','#173522','#51351f','#292d32'],LIGHT=['#edf0f2','#b9d4a2','#c79b70','#b6bbc2'];
export function terrainColors(settings){return settings.mapAppearance==='light'?LIGHT:DARK}
export function terrainTexture(terrain,settings){
 const canvas=document.createElement('canvas');canvas.width=terrain.width;canvas.height=terrain.height;
 const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(terrain.width,terrain.height),colors=terrainColors(settings).map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
 // Canvas row zero is the top; world row zero is the south side.
 for(let y=0;y<terrain.height;y++)for(let x=0;x<terrain.width;x++){const color=colors[terrain.cells[y*terrain.width+x]||0],i=((terrain.height-1-y)*terrain.width+x)*4;pixels.data.set([...color,255],i)}
 ctx.putImageData(pixels,0,0);return canvas;
}
const textureCache=new WeakMap();
export function drawTerrainPerspective(ctx,terrain,view,settings,w,h){
 let cached=textureCache.get(terrain);const appearance=settings.mapAppearance||'dark';
 if(!cached||cached.appearance!==appearance){cached={appearance,canvas:terrainTexture(terrain,settings)};textureCache.set(terrain,cached)}
 const image=cached.canvas,tile=Math.min(2,Math.max(.125,160/terrain.step));
 const colors=terrainColors(settings);
 const drawTriangle=(a,b,c)=>{
  const det=(b.u-a.u)*(c.v-a.v)-(c.u-a.u)*(b.v-a.v);if(Math.abs(det)<1e-8)return;
  const aa=((b.x-a.x)*(c.v-a.v)-(c.x-a.x)*(b.v-a.v))/det,bb=((b.y-a.y)*(c.v-a.v)-(c.y-a.y)*(b.v-a.v))/det,cc=((c.x-a.x)*(b.u-a.u)-(b.x-a.x)*(c.u-a.u))/det,dd=((c.y-a.y)*(b.u-a.u)-(b.y-a.y)*(c.u-a.u))/det;
  ctx.save();ctx.beginPath();const center={x:(a.x+b.x+c.x)/3,y:(a.y+b.y+c.y)/3};[a,b,c].forEach((p,i)=>{const d=Math.hypot(p.x-center.x,p.y-center.y)||1,x=p.x+(p.x-center.x)/d,y=p.y+(p.y-center.y)/d;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.clip();ctx.transform(aa,bb,cc,dd,a.x-aa*a.u-cc*a.v,a.y-bb*a.u-dd*a.v);ctx.imageSmoothingEnabled=true;ctx.drawImage(image,0,0);ctx.restore();
 };
 for(let y=0;y<terrain.height;y+=tile)for(let x=0;x<terrain.width;x+=tile){
  const x2=Math.min(x+tile,terrain.width),y2=Math.min(y+tile,terrain.height),corners=[[x,y],[x2,y],[x2,y2],[x,y2]].map(([u,v])=>({wx:terrain.origin[0]+u*terrain.step,wy:terrain.origin[1]+(terrain.height-v)*terrain.step,u,v}));
  const points=view.clipPolygon(corners);if(points.length<3||Math.max(...points.map(p=>p.x))<0||Math.min(...points.map(p=>p.x))>w||Math.max(...points.map(p=>p.y))<0||Math.min(...points.map(p=>p.y))>h)continue;
  // Correct north/south texture row when filling the anti-seam underlay.
  const row=terrain.height-1-Math.min(terrain.height-1,Math.floor((y+y2)/2)),col=Math.min(terrain.width-1,Math.floor((x+x2)/2));ctx.fillStyle=colors[terrain.cells[row*terrain.width+col]||0];ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();
  for(let i=1;i<points.length-1;i++)drawTriangle(points[0],points[i],points[i+1]);
 }
}

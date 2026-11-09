import {settleSidewalk}from'./settled-sidewalk.mjs';
import {projectTraffic} from './traffic-3d.mjs';
import {sidewalkRibbons} from './sidewalk-ribbon.mjs';
const key=(x,y)=>x+','+y;
// Suppress metre-grid stair steps without moving the contour by more than 65 cm.
function simplifyLine(points){
 if(points.length<3)return points;const a=points[0],b=points.at(-1),dx=b[0]-a[0],dy=b[1]-a[1],d=dx*dx+dy*dy;let best=.65*.65,index=-1;
 for(let i=1;i<points.length-1;i++){const p=points[i],t=d?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/d)):0,dist=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;if(dist>best){best=dist;index=i;}}
 return index<0?[a,b]:[...simplifyLine(points.slice(0,index+1)).slice(0,-1),...simplifyLine(points.slice(index))];
}
function smoothContour(points){let split=1,far=0;for(let i=1;i<points.length;i++){const d=(points[i][0]-points[0][0])**2+(points[i][1]-points[0][1])**2;if(d>far){far=d;split=i;}}return [...simplifyLine(points.slice(0,split+1)).slice(0,-1),...simplifyLine([...points.slice(split),points[0]]).slice(0,-1)];}
// Round only the corners, in metres. Long curb edges stay straight, and the
// rounded shape is cached with the measured footprint rather than animated.
export function roundedSidewalk(loop,radius=.12){const out=[];for(let i=0;i<loop.length;i++){const a=loop[(i+loop.length-1)%loop.length],b=loop[i],c=loop[(i+1)%loop.length],la=Math.hypot(a[0]-b[0],a[1]-b[1]),lc=Math.hypot(c[0]-b[0],c[1]-b[1]);if(la<.001||lc<.001)continue;const d=Math.min(radius,la*.25,lc*.25),start=[b[0]+(a[0]-b[0])*d/la,b[1]+(a[1]-b[1])*d/la],end=[b[0]+(c[0]-b[0])*d/lc,b[1]+(c[1]-b[1])*d/lc];for(let n=0;n<=6;n++){const t=n/6,u=1-t;out.push([u*u*start[0]+2*u*t*b[0]+t*t*end[0],u*u*start[1]+2*u*t*b[1]+t*t*end[1]]);}}return out;}
// Join measured cells before drawing: shared cell edges never become curb faces.
export function sidewalkContours(objects){
 if(!objects.length)return [];const a=objects[0].heading*Math.PI/180,c=Math.cos(a),s=Math.sin(a),rects=objects.map(o=>({x:o.x*c-o.y*s,y:o.x*s+o.y*c,w:o.width,h:o.length}));
 const ox=Math.min(...rects.map(r=>r.x-r.w/2)),oy=Math.min(...rects.map(r=>r.y-r.h/2)),cells=new Set();
 for(const r of rects){const x0=Math.round(r.x-r.w/2-ox),y0=Math.round(r.y-r.h/2-oy);for(let x=x0;x<x0+Math.round(r.w);x++)for(let y=y0;y<y0+Math.round(r.h);y++)if(cells.size<2400)cells.add(key(x,y));}
 // Close isolated one-cell holes, without bridging separate road-width gaps.
 const fill=[];for(const cell of cells){const [x,y]=cell.split(',').map(Number);for(const [xx,yy]of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]])if(!cells.has(key(xx,yy))){const neighbors=[[xx-1,yy],[xx+1,yy],[xx,yy-1],[xx,yy+1]].filter(([u,v])=>cells.has(key(u,v)));if(neighbors.length>=3)fill.push(key(xx,yy));}}for(const cell of fill)cells.add(cell);
 const edges=new Map();function add(x,y,xx,yy){const k=key(x,y);if(!edges.has(k))edges.set(k,[]);edges.get(k).push([xx,yy]);}
 // Canonical grid order keeps contour starts and simplification independent
 // of packet order and nearest-cell ties when the vehicle is stationary.
 const ordered=[...cells].map(cell=>cell.split(',').map(Number)).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 for(const [x,y] of ordered){if(!cells.has(key(x,y-1)))add(x,y,x+1,y);if(!cells.has(key(x+1,y)))add(x+1,y,x+1,y+1);if(!cells.has(key(x,y+1)))add(x+1,y+1,x,y+1);if(!cells.has(key(x-1,y)))add(x,y+1,x,y);}
 const loops=[];while(edges.size){const start=edges.keys().next().value;let current=start,points=[];for(let i=0;i<12000;i++){const [x,y]=current.split(',').map(Number);points.push([x+ox,y+oy]);const ends=edges.get(current);if(!ends?.length)break;const next=ends.pop();if(!ends.length)edges.delete(current);current=key(...next);if(current===start)break;}if(points.length>2&&Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-p[1]*q[0];},0))>=6)loops.push(points.map(([x,y])=>[x*c+y*s,y*c-x*s]));}
 return loops.map(smoothContour);
}
function clipped(points){const out=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],aa=a[1]>-10,bb=b[1]>-10;if(aa)out.push(a);if(aa!==bb){const t=(-10-a[1])/(b[1]-a[1]);out.push([a[0]+(b[0]-a[0])*t,-10]);}}return out;}
function path(ctx,loops,w,h){ctx.beginPath();for(const loop of loops){const points=clipped(loop).map(([x,y])=>projectTraffic([x,y,0],w,h));if(points.length<3)continue;points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();}}
// Cache one opaque union of the sidewalk footprints. All joins share one
// material and one outer shadow; individual cells/triangles never get borders.
function paintSurface(ctx,loops,w,h,cache){
 const dark=cache.appearance==='dark',color=dark?'#969696':'#e0e0e0',scale=Math.min(globalThis.devicePixelRatio||1,1.5);
 const canLayer=typeof OffscreenCanvas!=='undefined';
 const paint=c=>{path(c,loops,w,h);c.save();c.fillStyle=color;c.shadowColor=dark?'rgba(0,0,0,.18)':'rgba(65,65,65,.23)';c.shadowBlur=4;c.shadowOffsetX=0;c.shadowOffsetY=0;c.fill('nonzero');c.restore();};
 if(!canLayer){paint(ctx);return;}
 if(cache.surfaceLoops!==loops||cache.surfaceW!==w||cache.surfaceH!==h||cache.surfaceColor!==color||cache.surfaceScale!==scale){
  const lw=Math.max(1,Math.round(w*scale)),lh=Math.max(1,Math.round(h*scale)),layer=cache.surfaceLayer||new OffscreenCanvas(lw,lh);if(layer.width!==lw||layer.height!==lh){layer.width=lw;layer.height=lh;}const c=layer.getContext('2d');c.setTransform(scale,0,0,scale,0,0);c.clearRect(0,0,w,h);paint(c);
  Object.assign(cache,{surfaceLoops:loops,surfaceW:w,surfaceH:h,surfaceColor:color,surfaceScale:scale,surfaceLayer:layer});
 }
 ctx.drawImage(cache.surfaceLayer,0,0,w,h);
}
function footprint(objects){return objects.map(o=>{const a=o.heading*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return {x:o.x*c-o.y*s,y:o.x*s+o.y*c,w:o.width,h:o.length,heading:o.heading};}).sort((a,b)=>Math.round(a.y*20)-Math.round(b.y*20)||a.x-b.x);}
function sameFootprint(a,b){return a?.length===b.length&&a.every((p,i)=>Math.abs(p.x-b[i].x)<.12&&Math.abs(p.y-b[i].y)<.12&&Math.abs(p.w-b[i].w)<.01&&Math.abs(p.h-b[i].h)<.01&&Math.abs(p.heading-b[i].heading)<.15);}
export function sidewalkHeat(loops){const hits=[];for(const loop of loops)for(let i=0;i<loop.length;i++){const a=loop[i],b=loop[(i+1)%loop.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,-(a[0]*dx+a[1]*dy)/(dx*dx+dy*dy||1))),x=a[0]+t*dx,y=a[1]+t*dy,clearance=Math.hypot(Math.max(0,Math.abs(x)-.95),Math.max(0,Math.abs(y)-2.1)),strength=Math.max(0,1-clearance/1.8);if(strength>0)hits.push({x,y,strength});}return hits.sort((a,b)=>b.strength-a.strength).filter((p,i,all)=>!all.slice(0,i).some(q=>Math.hypot(p.x-q.x,p.y-q.y)<1.2)).slice(0,6);}
export function updateSidewalkPose(cache,data,map,now){const stationary=Math.abs(data.speedMps||0)<.2,id=data.vehicleId+':'+(map?.mapId||map?.levelName||'')+':'+(map?.renderDistance??120),p=map?.position,heading=map?.heading||0,anchor=cache.anchor,moved=anchor&&p&&(Math.hypot(p[0]-anchor.x,p[1]-anchor.y)>1||Math.abs(((heading-anchor.heading+540)%360)-180)>3);if(cache.identity!==id){cache.worldSections=null;cache.projectedPose=null;cache.worldRevision=0;}if(cache.identity!==id||moved){cache.candidateLoops=null;cache.fittedObservation=undefined;cache.objects=null;cache.samples=null;cache.boundsLoops=null;cache.loops=null;cache.footprint=null;cache.stationarySince=null;cache.anchor=null;cache.structured=false;cache.layoutAttempted=false;}cache.identity=id;cache.stationary=stationary;cache.now=now;if(!stationary){cache.stationarySince=null;cache.frozen=false;cache.anchor=null;}else if(!cache.anchor&&p)cache.anchor={x:p[0],y:p[1],heading};}
export function drawSidewalkSurface(ctx,objects,w,h,cache={}){
 let candidates=[];const now=cache.now??performance.now();if(cache.stationary){cache.stationarySince??=now;cache.frozen=!!cache.loops&&now-cache.stationarySince>1500;}else{cache.stationarySince=null;cache.frozen=false;}
 if(!objects.length&&!cache.frozen){cache.objects=null;cache.samples=null;cache.boundsLoops=null;cache.footprint=null;cache.loops=null;cache.structured=false;cache.layoutAttempted=false;return;}
 const extending=cache.frozen&&objects.length&&Math.max(...objects.map(o=>o.y))>Math.max(...(cache.samples||[]).map(o=>o.y))+6;const upgrade=!cache.structured&&!cache.layoutAttempted&&objects.length&&(cache.lanes?.points?.length||cache.roads?.length);const observed=cache.observation===undefined||cache.fittedObservation!==cache.observation;if((cache.objects!==objects&&observed)||upgrade){cache.objects=objects;if(!cache.frozen||upgrade||extending){const next=footprint(objects);if(extending||upgrade||!cache.stationary||!sameFootprint(cache.footprint,next)){const ribbons=sidewalkRibbons(objects,cache.lanes,cache.map,cache.roads);cache.layoutAttempted=!!(cache.lanes?.points?.length||cache.roads?.length);cache.structured=!!ribbons.length;cache.candidateLoops=(ribbons.length?ribbons:sidewalkContours(objects));cache.boundsLoops=cache.candidateLoops;candidates=cache.boundsLoops.map(loop=>roundedSidewalk(loop,.16));cache.loops=candidates;cache.footprint=next;cache.samples=objects;cache.fittedObservation=cache.observation;}}}if(cache.map&&(cache.worldSections?.size||cache.candidateLoops&&cache.samples?.length)){cache.boundsLoops=settleSidewalk(cache,candidates,cache.map,now);cache.loops=cache.boundsLoops;}const loops=cache.loops;
 ctx.save();paintSurface(ctx,loops,w,h,cache);path(ctx,loops,w,h);ctx.clip('nonzero');
 for(const hit of sidewalkHeat(loops)){const p=projectTraffic([hit.x,hit.y,0],w,h),q=projectTraffic([hit.x+1.1,hit.y,0],w,h);if(!p||!q)continue;const r=Math.max(10,Math.min(w*.13,Math.abs(q.x-p.x))),g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);g.addColorStop(0,`rgba(255,${Math.round(200-hit.strength*55)},25,${hit.strength*.6})`);g.addColorStop(.45,`rgba(255,205,30,${hit.strength*.22})`);g.addColorStop(1,'rgba(255,220,45,0)');ctx.fillStyle=g;ctx.fillRect(p.x-r,p.y-r,r*2,r*2);}
 ctx.restore();
}

import { drawTerrainPerspective } from './terrain.mjs';
// Perspective of the live road graph and reported building heights.
export function perspectiveProjection(position,heading,headingUp,w,h,zoom){
 const angle=headingUp?heading*Math.PI/180:0,c=Math.cos(angle),s=Math.sin(angle),scale=Math.min(w,h)/1050*zoom,depth=h*.85;
 const camera=(x,y)=>{const dx=x-position[0],dy=y-position[1];return {x:(c*dx-s*dy)*scale,f:(s*dx+c*dy)*scale}};
 const screen=(p,z=0)=>{const raw=1+p.f/depth;if(raw<.2-1e-9)return null;const d=Math.max(.2,raw);return {x:w/2+p.x/d,y:h*.08+h*.60/d-z*scale/d,factor:1/d}};
 return {project:(x,y,z=0)=>screen(camera(x,y),z),clipPolygon:vertices=>{
  const near=-depth*.8,input=vertices.map(v=>({...v,...camera(v.wx,v.wy)})),out=[];
  for(let i=0;i<input.length;i++){const a=input[i],b=input[(i+1)%input.length],ai=a.f>=near,bi=b.f>=near;if(ai)out.push(a);if(ai!==bi){const t=(near-a.f)/(b.f-a.f);out.push({x:a.x+(b.x-a.x)*t,f:near+.001,u:a.u+(b.u-a.u)*t,v:a.v+(b.v-a.v)*t});}}
  return out.map(p=>({...screen(p),u:p.u,v:p.v}));
 },segment:(x1,y1,x2,y2)=>{
  let a=camera(x1,y1),b=camera(x2,y2);const near=-depth*.8;
  if(a.f<near&&b.f<near)return null;
  if(a.f<near){const t=(near-a.f)/(b.f-a.f);a={x:a.x+(b.x-a.x)*t,f:near+.001}}
  if(b.f<near){const t=(near-b.f)/(a.f-b.f);b={x:b.x+(a.x-b.x)*t,f:near+.001}}
  return [screen(a),screen(b)];
 }};
}
export function drawPerspective(ctx,map,settings,w,h,palette){
 const view=perspectiveProjection(map.position,map.heading||0,settings.mapHeadingUp,w,h,settings.mapZoom);
 ctx.save();ctx.globalAlpha=map.connected?1:.32;ctx.lineJoin='round';ctx.lineCap='round';
 if(settings.mapTerrain!==false&&map.terrain)drawTerrainPerspective(ctx,map.terrain,view,settings,w,h);
 // Old feeds have no height: keep them flat until the updated companion supplies it.
 const buildings=[];
 for(const b of map.buildings||[]){const base=[],roof=[];let valid=true;for(let i=0;i<8;i+=2){const p=view.project(b[i],b[i+1]),q=view.project(b[i],b[i+1],Number.isFinite(b[8])?Math.min(200,b[8]):0);if(!p||!q){valid=false;break}base.push(p);roof.push(q)}if(valid){const xs=base.map(p=>p.x),ys=base.map(p=>p.y);if(Math.max(...xs)>=-80&&Math.min(...xs)<=w+80&&Math.max(...ys)>=-80&&Math.min(...ys)<=h+80)buildings.push({base,roof,depth:base.reduce((n,p)=>n+p.y,0)/4})}}
 buildings.sort((a,b)=>a.depth-b.depth);
 const polygon=points=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath()};
 for(const {base,roof} of buildings){ctx.fillStyle=palette.buildingEdge;ctx.strokeStyle=palette.buildingEdge;ctx.lineWidth=.7;for(let i=0;i<4;i++){const j=(i+1)%4;polygon([base[i],base[j],roof[j],roof[i]]);ctx.fill()}polygon(roof);ctx.fillStyle=palette.building;ctx.fill();ctx.stroke()}
 const levels=[.3,.55,.85,1.2,1.65,2.3,3.3],paths=Array.from({length:4},()=>levels.map(()=>new Path2D()));
 for(const r of map.roads){const ends=view.segment(...r.slice(0,4));if(!ends)continue;const [a,b]=ends;if(Math.max(a.x,b.x)<-80||Math.min(a.x,b.x)>w+80||Math.max(a.y,b.y)<-80||Math.min(a.y,b.y)>h+80)continue;const factor=(a.factor+b.factor)/2;let band=0;while(band<levels.length-1&&factor>(levels[band]+levels[band+1])/2)band++;const kind=r[5]<=.25?3:r[4]>=24?0:r[4]>=12?1:2;paths[kind][band].moveTo(a.x,a.y);paths[kind][band].lineTo(b.x,b.y)}
 const widths=[11,8,5.5,2.5];
 for(const casing of [true,false])for(let i=3;i>=0;i--)for(let j=0;j<levels.length;j++){ctx.strokeStyle=casing?(i===0?palette.majorEdge:palette.casing):palette.roads[i];ctx.lineWidth=(widths[i]+(casing?2:0))*levels[j];ctx.stroke(paths[i][j])}
 if(map.connected&&map.route?.length>1){const path=new Path2D();for(let i=1;i<map.route.length;i++){const ends=view.segment(...map.route[i-1],...map.route[i]);if(ends){path.moveTo(ends[0].x,ends[0].y);path.lineTo(ends[1].x,ends[1].y)}}for(const [color,width] of [[palette.routeEdge,13],['#0969df',9],['#3298ff',5]]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke(path)}}
 ctx.restore();
 const shade=ctx.createLinearGradient(0,0,0,h*.4);shade.addColorStop(0,settings.mapAppearance==='light'?'#c1d4ca88':'#000000a0');shade.addColorStop(1,'#00000000');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h*.4);
}

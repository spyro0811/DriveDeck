import {projectTraffic} from './traffic-3d.mjs';
import {nearestBuildingPoint} from './building-footprint.mjs';
const face=(points,color)=>({points,color,smooth:true});
function block(w,l,h,z=0){const p=[[-w/2,-l/2,z],[w/2,-l/2,z],[w/2,l/2,z],[-w/2,l/2,z],[-w/2,-l/2,z+h],[w/2,-l/2,z+h],[w/2,l/2,z+h],[-w/2,l/2,z+h]];return [[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]].map((ids,i)=>face(ids.map(n=>p[n]),['#969696','#aaaaaa','#9c9c9c','#898989','#b6b6b6'][i]));}
function cylinder(radius,height,z=0,x=0,y=0){const rings=[0,height].map(h=>Array.from({length:12},(_,i)=>{const a=i/12*Math.PI*2;return [x+Math.cos(a)*radius,y+Math.sin(a)*radius,z+h];}));return [...rings[0].map((p,i)=>face([p,rings[0][(i+1)%12],rings[1][(i+1)%12],rings[1][i]],`rgb(${132+Math.round(Math.cos(i/12*Math.PI*2)*15)},${132+Math.round(Math.cos(i/12*Math.PI*2)*15)},${132+Math.round(Math.cos(i/12*Math.PI*2)*15)})`)),face(rings[1],'#ababab')];}
function canopy(w,l,h,z){const rings=Array.from({length:6},(_,j)=>{const a=-Math.PI/2+j/5*Math.PI;return Array.from({length:12},(_,i)=>{const b=i/12*Math.PI*2;return [Math.cos(a)*Math.cos(b)*w/2,Math.cos(a)*Math.sin(b)*l/2,z+(Math.sin(a)+1)*h/2];});});const faces=[];for(let j=0;j<5;j++)for(let i=0;i<12;i++){const n=(i+1)%12,tone=147+j*5+Math.round(Math.cos(i/12*Math.PI*2)*8);faces.push(face([rings[j][i],rings[j][n],rings[j+1][n],rings[j+1][i]],`rgb(${tone},${tone},${tone})`));}return faces;}
function cone(radius,height,z){const faces=[],ring=Array.from({length:20},(_,i)=>{const a=i/20*Math.PI*2;return [Math.cos(a)*radius,Math.sin(a)*radius,z];});for(let i=0;i<20;i++){const tone=146+Math.round(Math.cos(i/20*Math.PI*2)*14);faces.push(face([ring[i],ring[(i+1)%20],[0,0,z+height]],`rgb(${tone},${tone},${tone})`));}return faces;}
export function treeDimensions(o){return {height:Math.max(1.5,Math.min(10,o.height)),width:Math.max(.8,Math.min(3.2,o.width*.42)),length:Math.max(.8,Math.min(3.2,o.length*.42))};}
export function treeMesh(o,style='evergreen'){
 const {height:h,width:w,length:l}=treeDimensions(o),trunk=Math.max(.09,Math.min(.23,w*.07));
 if(style==='evergreen')return [...cylinder(trunk,h*.55),...cone(w*.5,h*.44,h*.25),...cone(w*.4,h*.4,h*.43),...cone(w*.28,h*.35,h*.62)];
 if(style==='slender')return [...cylinder(trunk,h*.55),...canopy(w*.65,l*.65,h*.62,h*.35)];
 return [...cylinder(trunk,h*.66),...canopy(w,l,h*.42,h*.55)];
}
export function environmentMesh(o,treeStyle='evergreen'){
 if(typeof treeStyle!=='string')treeStyle='evergreen';
 let faces=[];const h=o.height;
 if(o.kind==='building'){faces=block(o.width,o.length,h);faces.push(...block(o.width*.94,o.length*.94,.18,h));}
 else if(o.kind==='tree'){faces=treeMesh(o,treeStyle);}
 else if(o.kind==='pole'){faces=cylinder(.1,h);if(Math.max(o.width,o.length)>1){faces.push(...block(Math.max(.2,o.width*.85),Math.max(.2,o.length*.85),.14,h-.25));}}
 else if(o.kind==='hydrant'){const r=Math.min(o.width,o.length)*.3;faces=[...cylinder(Math.max(.12,r),h*.8),...canopy(r*2.3,r*2.3,h*.25,h*.75),...block(Math.max(.4,o.width),.18,h*.18,h*.52)];}
 // Roads and actors share a level display plane. Raw world-elevation deltas
 // would float hillside objects above that road or bury downhill objects.
 const a=o.heading*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return faces.map(f=>({...f,points:f.points.map(([x,y,z])=>[o.x+x*c+y*s,o.y+y*c-x*s,z])}));
}
export function paintEnvironmentProximity(ctx,objects,w,h,buildingShapes){
 for(const o of objects){if(o.y < -7 || o.y > 10)continue;
  const shape=o.kind==='building'?buildingShapes?.get(o):null;if(shape&&!shape.footprints.length)continue;
  const a=o.heading*Math.PI/180,c=Math.cos(a),s=Math.sin(a),width=o.kind==='tree'?.65:o.kind==='pole'?.25:o.width,length=o.kind==='tree'?.65:o.kind==='pole'?.25:o.length,lx=Math.max(-width/2,Math.min(width/2,-o.x*c+o.y*s)),ly=Math.max(-length/2,Math.min(length/2,-o.x*s-o.y*c)),point=shape?nearestBuildingPoint(shape.footprints):[o.x+lx*c+ly*s,o.y+ly*c-lx*s];if(!point)continue;const [x,y]=point,clearance=Math.hypot(Math.max(0,Math.abs(x)-.95),Math.max(0,Math.abs(y)-2.1)),strength=Math.max(0,1-clearance/1.7);if(!strength)continue;
  const p=projectTraffic([x,y,.3],w,h),q=projectTraffic([x+1.5,y,.3],w,h);if(!p||!q)continue;const radius=Math.max(10,Math.min(w*.25,Math.abs(p.x-q.x)));
  ctx.save();ctx.beginPath();for(const f of shape?.faces||environmentMesh(o)){const points=f.points.map(p=>projectTraffic(p,w,h));if(points.some(p=>!p))continue;points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();}ctx.clip();const gradient=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);gradient.addColorStop(0,`rgba(255,${Math.round(210-strength*65)},35,${strength*.8})`);gradient.addColorStop(1,'rgba(255,210,35,0)');ctx.fillStyle=gradient;ctx.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);ctx.restore();
 }
}

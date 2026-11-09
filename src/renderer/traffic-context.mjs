import {projectTraffic,trafficCarMesh,paintTraffic} from './traffic-3d.mjs';
export function drawRoadContext(ctx,map,w,h,cache,now){
 if(!map?.position||!map?.roads?.length)return;const [px,py]=map.position;
 if(cache.roads!==map.roads||now-(cache.time||0)>700){cache.roads=map.roads;cache.time=now;cache.near=map.roads.map(r=>{const dx=r[2]-r[0],dy=r[3]-r[1],t=Math.max(0,Math.min(1,((px-r[0])*dx+(py-r[1])*dy)/(dx*dx+dy*dy||1)));return {r,d:Math.hypot(r[0]+dx*t-px,r[1]+dy*t-py)};}).filter(o=>o.d<450).sort((a,b)=>a.d-b.d).slice(0,300).map(o=>o.r);}
 const a=(map.heading||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),relative=(x,y)=>[(x-px)*c-(y-py)*s,(x-px)*s+(y-py)*c,0];ctx.strokeStyle=w<h*1.8?'#929ca580':'#a0acb370';ctx.lineWidth=1.35;
 for(const r of (cache.near||[]).slice(0,100)){const dx=r[2]-r[0],dy=r[3]-r[1],l=Math.hypot(dx,dy)||1,half=Math.min(12,r[4]/2);for(const sign of [-1,1]){const ox=dy/l*half*sign,oy=-dx/l*half*sign;ctx.beginPath();let started=false;for(let i=0;i<=16;i++){const p=projectTraffic(relative(r[0]+dx*i/16+ox,r[1]+dy*i/16+oy),w,h);if(!p){started=false;continue;}if(started)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);started=true;}ctx.stroke();}}
}
export function cameraPanelSize(w,h){const width=Math.min(w*.64,h*.36*16/9);return {width,height:width*9/16};}
export function drawSignalSideView(ctx,data,feed,w,h,state,now){
 const left=!!data.lights?.left,right=!!data.lights?.right;if(left!==right){state.side=left?'LEFT':'RIGHT';state.until=now+1600;}else if(left&&right){state.until=0;}
 if(now>(state.until||0))return;const live=globalThis.driveDeckCamera;if(live&&live.side===state.side.toLowerCase()&&performance.now()-live.time<2200){ctx.save();const {width:sw,height:sh}=cameraPanelSize(w,h);ctx.beginPath();ctx.roundRect(12,12,sw,sh,9);ctx.clip();ctx.drawImage(live.image,12,12,sw,sh);ctx.fillStyle='#fff';ctx.font='11px sans-serif';ctx.fillText(state.side+(performance.now()-live.time<700?' · LIVE CAMERA':' · CAMERA RECONNECTING'),22,32);ctx.restore();return;}if(!feed)return;const {width:sw,height:sh}=cameraPanelSize(w,h);const x=12,y=12;ctx.save();ctx.beginPath();ctx.roundRect(x,y,sw,sh,9);ctx.clip();ctx.fillStyle='#202932';ctx.fillRect(x,y,sw,sh);ctx.translate(x,y);const sign=state.side==='LEFT'?-1:1;
 const faces=feed.vehicles.filter(v=>v.x*sign>0&&Math.abs(v.y)<45).flatMap(v=>trafficCarMesh({...v,x:v.y*.5,y:Math.abs(v.x)*2+5,heading:v.heading+sign*90}));paintTraffic(ctx,faces,sw,sh);ctx.fillStyle='#f0f4f7';ctx.font='11px sans-serif';ctx.fillText(state.side+' · 3D SIDE VIEW',10,18);ctx.fillStyle='#a6b3bd';ctx.font='9px sans-serif';ctx.fillText('Nearby vehicles · not a game camera',10,sh-10);ctx.restore();
}





import {projectTraffic} from './traffic-3d.mjs';
export function laneBoundaries(lanes){
 if(!lanes?.points?.length)return [];
 return Array.from({length:lanes.count+1},(_,index)=>lanes.points.map((p,i)=>{const a=lanes.points[Math.max(0,i-1)],b=lanes.points[Math.min(lanes.points.length-1,i+1)],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1,offset=p.width*(index/lanes.count-.5);return [p.x+dy/length*offset,p.y-dx/length*offset,0];}));
}
export function drawRoadLanes(ctx,lanes,w,h,navigating=false){if(lanes)lanes={...lanes,points:lanes.points.map(p=>({...p,width:p.roadWidth||p.width}))};const boundaries=laneBoundaries(lanes);if(!boundaries.length)return;
 const current=currentLaneIndex(lanes);fillRoadStrip(ctx,boundaries[0],boundaries.at(-1),'#7c88931a',w,h);if(navigating)fillRoadStrip(ctx,boundaries[current],boundaries[current+1],'#428ce933',w,h);
 for(const [i,points]of boundaries.entries()){ctx.strokeStyle=i>0&&i<lanes.count?'#aebbcddd':navigating&&(i===current||i===current+1)?'#4b91ddbb':'#a2aeb988';ctx.lineWidth=i===current||i===current+1?2:1.2;ctx.setLineDash(i>0&&i<lanes.count?[9,9]:[]);ctx.beginPath();let started=false;for(const point of points){const p=projectTraffic(point,w,h);if(!p){started=false;continue;}if(started)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);started=true;}ctx.stroke();}ctx.setLineDash([]);
}

export function curbWarning(clearance){return Math.max(0,Math.min(1,1-clearance/1.25));}
export function curbBoundaries(lanes){if(!lanes?.points?.every(p=>Number.isFinite(p.roadWidth)))return [];const edges=laneBoundaries({...lanes,points:lanes.points.map(p=>({...p,width:p.roadWidth}))});return edges.length?[edges[0],edges.at(-1)]:[];}
export function drawEstimatedCurbs(ctx,lanes,w,h){const edges=curbBoundaries(lanes);if(!edges.length)return;
 for(const [side,edge]of edges.entries())for(let i=0;i<edge.length-1;i++){
  const a=edge[i],b=edge[i+1],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<.01)continue;
  const t=Math.max(0,Math.min(1,-(a[0]*dx+a[1]*dy)/(length*length))),distance=Math.hypot(a[0]+t*dx,a[1]+t*dy),warning=curbWarning(distance-.95),sign=side===0?-1:1,ox=dy/length*sign,oy=-dx/length*sign;
  const points=[[a[0],a[1],.1],[b[0],b[1],.1],[b[0]+ox,b[1]+oy,.1],[a[0]+ox,a[1]+oy,.1]].map(p=>projectTraffic(p,w,h));if(points.some(p=>!p))continue;
  ctx.beginPath();points.forEach((p,j)=>j?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);ctx.lineTo(points[1].x,points[1].y);ctx.strokeStyle=`rgb(${Math.round(122+warning*133)},${Math.round(135+warning*76)},${Math.round(147-warning*112)})`;ctx.lineWidth=1+warning*2;ctx.stroke();
 }
 ctx.font='9px sans-serif';ctx.fillStyle='#9ba9b6';ctx.fillText('Estimated pavement edges',12,h-10);
}
export function currentLaneIndex(lanes){let nearest=Infinity,index=0;for(let i=0;i<lanes.points.length-1;i++){const a=lanes.points[i],b=lanes.points[i+1],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(length<.001)continue;const t=Math.max(0,Math.min(1,-(a.x*dx+a.y*dy)/(length*length))),x=a.x+t*dx,y=a.y+t*dy,d=x*x+y*y;if(d<nearest){nearest=d;const lateral=(-x*dy+y*dx)/length,width=a.width+(b.width-a.width)*t;index=Math.max(0,Math.min(lanes.count-1,Math.floor((.5+lateral/width)*lanes.count)));}}return index;}


function fillRoadStrip(ctx,left,right,color,w,h){for(let i=0;i<left.length-1;i++){const points=[left[i],left[i+1],right[i+1],right[i]].map(p=>projectTraffic(p,w,h));if(points.some(p=>!p))continue;ctx.beginPath();points.forEach((p,j)=>j?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=color;ctx.fill();}}


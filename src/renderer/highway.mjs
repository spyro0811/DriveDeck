import {projectTraffic} from './traffic-3d.mjs';
export function drawShoulders(ctx,objects,w,h){
 for(const o of objects){if(o.kind!=='shoulder')continue;const a=o.heading*Math.PI/180,c=Math.cos(a),s=Math.sin(a),points=[[-o.width/2,-o.length/2],[-o.width/2,o.length/2],[o.width/2,o.length/2],[o.width/2,-o.length/2]].map(([x,y])=>projectTraffic([o.x+x*c+y*s,o.y+y*c-x*s,0],w,h));if(points.some(p=>!p))continue;
  ctx.save();ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=o.edge?'#b1b8bf90':'#a8b1b815';ctx.fill();
  if(!o.edge){ctx.strokeStyle='#a6afb75c';ctx.lineWidth=1;for(const [i,j]of [[0,1],[2,3]]){ctx.beginPath();ctx.moveTo(points[i].x,points[i].y);ctx.lineTo(points[j].x,points[j].y);ctx.stroke();}}ctx.restore();
 }
}

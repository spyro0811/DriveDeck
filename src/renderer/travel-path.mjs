import {projectTraffic} from './traffic-3d.mjs';
// Estimate the current travel arc from successive world poses, independent of
// navigation routes and road-centre guesses. Heading increases clockwise.
export function travelPath(cache,data,map,now){
 const p=map?.position,heading=map?.heading;
 if(!data.connected||!p||!p.every(Number.isFinite)||!Number.isFinite(heading)){cache.pose=null;cache.curvature=0;return [];}
 const id=data.vehicleId+':'+(map.mapId||''),speed=Math.abs(data.speedMps||0),dt=Math.min(.15,Math.max(0,(now-(cache.time??now))/1000));cache.time=now;
 if(cache.id!==id){cache.id=id;cache.pose=null;cache.target=0;cache.curvature=0;}
 const previous=cache.pose;
 if(previous&&(p[0]!==previous.x||p[1]!==previous.y||heading!==previous.heading)){
  const distance=Math.hypot(p[0]-previous.x,p[1]-previous.y),elapsed=(now-previous.time)/1000,angle=((heading-previous.heading+540)%360-180)*Math.PI/180;
  cache.target=distance>.04&&distance<Math.max(10,speed*elapsed*3)&&elapsed<1?Math.max(-.12,Math.min(.12,angle/distance)):0;
  cache.pose={x:p[0],y:p[1],heading,time:now};
 }else if(!previous)cache.pose={x:p[0],y:p[1],heading,time:now};
 if(speed<.3||now-cache.pose.time>500)cache.target=0;
 cache.curvature=(cache.curvature||0)+(cache.target-(cache.curvature||0))*(1-Math.exp(-dt*9));
 const k=cache.curvature,length=Math.min(35,Math.max(14,speed*1.3)),points=[];
 for(let s=.6;s<=length;s+=.4){const a=Math.max(-1.15,Math.min(1.15,k*s));points.push(Math.abs(k)<.0001?[0,s]:[(1-Math.cos(a))/k,Math.sin(a)/k]);}
 return points;
}
export function drawTravelPath(ctx,cache,data,map,now,w,h){
 const points=travelPath(cache,data,map,now);if(points.length<2)return;
 ctx.save();ctx.beginPath();const half=.4;
 for(const [side,list]of [[-1,points],[1,[...points].reverse()]])for(const [x,y]of list){const p=projectTraffic([x+side*half,y,.012],w,h);if(!p)continue;if(side===-1&&x===points[0][0]&&y===points[0][1])ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}
 ctx.closePath();ctx.fillStyle=map?.route?.length>1?'#278bff99':'rgba(135,143,150,.48)';ctx.fill();ctx.restore();
}

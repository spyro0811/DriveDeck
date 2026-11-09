import {BarrierGeometry}from'./barrier-geometry.mjs';
// Static scenery is attached to its capture pose, not to packet-arrival time.
export function worldPoint([x,y],pose){const a=pose.heading*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return[pose.x+c*x+s*y,pose.y-s*x+c*y];}
export function viewPoint([x,y],pose){const a=pose.heading*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=x-pose.x,dy=y-pose.y;return[c*dx-s*dy,s*dx+c*dy];}
export const mapPose=map=>map?.position?.length>=2&&map.position.every(Number.isFinite)?{x:map.position[0],y:map.position[1],heading:map.heading||0}:null;
export class StaticScene{
 constructor(){this.barrierGeometry=new BarrierGeometry();this.reset();}
 reset(){this.barrierGeometry.reset();this.barrierRange=null;this.objects=new Map();this.pavement=[];this.barrierWorld=[];this.barrierEdges=[];this.barrierInput=null;this.barrierBatch=-1;this.barrierSeen=-Infinity;this.identity=null;this.last=-Infinity;this.input=null;this.pavementInput=null;this.pavementRevision=0;this.pose=null;this.lanes=null;this.lanesInput=null;this.generation=(this.generation||0)+1;}
 update(data,map,now){const pose=mapPose(map),identity=data.vehicleId+':'+(map?.mapId||'');
  if(!data.connected||!pose){this.reset();return data.surroundings;}
  if(this.identity!==identity||(this.pose&&Math.hypot(pose.x-this.pose.x,pose.y-this.pose.y)>50)){this.reset();this.identity=identity;}
  this.pose=pose;const feed=data.surroundings;
  if(feed){this.last=now;const capture=feed.origin||pose;
   const hasBatch=feed.barrierBatch!==undefined,changed=hasBatch?feed.barrierBatch!==this.barrierBatch:feed.barrierFaces!==this.barrierInput,range=map.renderDistance??120;
   if(feed.barrierFaces&&(changed||range!==this.barrierRange)&&((hasBatch&&changed)||feed.barrierFaces.length)){
    this.barrierBatch=feed.barrierBatch;this.barrierInput=feed.barrierFaces;this.barrierRange=range;this.barrierSeen=now;
    this.barrierGeometry.submit(feed.barrierFaces,feed.barrierOrigin||capture,pose,range);
   }
   if(this.input!==feed.environment){this.input=feed.environment;for(const o of feed.environment||[]){const [x,y]=worldPoint([o.x,o.y],capture),heading=(o.heading||0)+capture.heading;let key=o.kind+':'+Math.round(x*2)+':'+Math.round(y*2);if(!this.objects.has(key)){const match=[...this.objects].find(([,p])=>p.kind===o.kind&&Math.hypot(p.x-x,p.y-y)<.5&&Math.abs(p.width-o.width)<.2);if(match)key=match[0];}const old=this.objects.get(key);this.objects.set(key,old?{...old,seen:now}:{...o,x,y,heading,seen:now,id:key});}}
   if(this.lanesInput!==feed.lanes){this.lanesInput=feed.lanes;if(feed.lanes)this.lanes={...feed.lanes,points:feed.lanes.points.map(p=>{const[x,y]=worldPoint([p.x,p.y],capture);return{...p,x,y};})};}
   if(this.pavementInput!==feed.pavement){this.pavementInput=feed.pavement;if(feed.pavement?.length)(this.pavementRevision++,this.pavement=feed.pavement.map(o=>{const[x,y]=worldPoint([o.x,o.y],capture);return{...o,x,y,heading:(o.heading||0)+capture.heading};}));}
  }
  for(const[key,o]of this.objects)if(now-o.seen>5000||Math.hypot(o.x-pose.x,o.y-pose.y)>180)this.objects.delete(key);
  if(now-this.last>5000){this.objects.clear();this.pavement=[];this.lanes=null;}
  if(now-this.barrierSeen>5000&&this.barrierGeometry.world.length)this.barrierGeometry.reset();
  this.barrierWorld=this.barrierGeometry.world;this.barrierEdges=this.barrierGeometry.edges;
  const local=o=>{const[x,y]=viewPoint([o.x,o.y],pose);return{...o,x,y,...(Number.isFinite(o.heading)?{heading:o.heading-pose.heading}:{})};};
  return{vehicles:[],signals:[],...(feed||{}),barrierEdges:this.barrierEdges.map(e=>e.map(p=>viewPoint(p,pose))),barrierFaces:this.barrierWorld.map(t=>t.map(p=>viewPoint(p,pose))),pavementRevision:this.pavementRevision,staticExpired:now-this.last>5000,lanes:this.lanes?{...this.lanes,points:this.lanes.points.map(local)}:null,environment:[...this.objects.values()].map(local),pavement:this.pavement.map(local)};
 }
}

import {barrierBoundary} from './road-signs.mjs';
// Keep complete triangles that intersect the requested view, including a small
// margin for motion while the next update is being prepared.
export function buildBarrierGeometry(triangles,origin,pose,range=120){
 const a=origin.heading*Math.PI/180,c=Math.cos(a),s=Math.sin(a),b=pose.heading*Math.PI/180,pc=Math.cos(b),ps=Math.sin(b),world=[],far=range+12,side=Math.min(60,far);
 for(const t of triangles){const points=[],local=[];for(const p of t){const x=origin.x+c*p[0]+s*p[1],y=origin.y-s*p[0]+c*p[1],dx=x-pose.x,dy=y-pose.y;points.push([x,y]);local.push([pc*dx-ps*dy,ps*dx+pc*dy]);}
  if(Math.max(...local.map(p=>p[1]))< -18||Math.min(...local.map(p=>p[1]))>far||Math.max(...local.map(p=>p[0]))< -side||Math.min(...local.map(p=>p[0]))>side)continue;world.push(points);
 }
 return{world,edges:barrierBoundary(world)};
}
let worker,pending=new Map(),sequence=0,workerFailed=false;
function getWorker(){
 if(workerFailed||typeof Worker==='undefined')return null;
 if(!worker){try{worker=new Worker(new URL('./barrier-worker.mjs',import.meta.url),{type:'module'});worker.onmessage=({data})=>{const job=pending.get(data.id);if(!job)return;pending.delete(data.id);job.done(data);};worker.onerror=()=>{workerFailed=true;worker?.terminate();worker=null;const jobs=[...pending.values()];pending.clear();for(const job of jobs)job.failed();};}catch{workerFailed=true;return null;}}
 return worker;
}
const unpack=(values,width)=>{const out=[];for(let i=0;i<values.length;i+=width){const poly=[];for(let j=0;j<width;j+=2)poly.push([values[i+j],values[i+j+1]]);out.push(poly);}return out;};
export class BarrierGeometry{
 constructor(){this.generation=0;this.reset();}
 reset(){this.generation++;this.world=[];this.edges=[];this.queued=null;this.version=0;}
 submit(triangles,origin,pose,range){const job={triangles,origin,pose,range,generation:this.generation};if(!triangles.length){this.reset();return;}if(this.busy){this.queued=job;return;}this.start(job);}
 start(job){
  const background=getWorker();if(!background){const result=buildBarrierGeometry(job.triangles,job.origin,job.pose,job.range);if(job.generation===this.generation){this.world=result.world;this.edges=result.edges;this.version++;}this.resolveReady();return;}
  this.background=true;this.busy=true;const id=++sequence,points=new Float64Array(job.triangles.length*6);let offset=0;for(const t of job.triangles)for(const p of t){points[offset++]=p[0];points[offset++]=p[1];}
  const finish=result=>{if(job.generation===this.generation){this.world=result.world;this.edges=result.edges;this.version++;}this.busy=false;const next=this.queued;this.queued=null;if(next&&next.generation===this.generation)this.start(next);else this.resolveReady();};
  pending.set(id,{done:data=>finish(job.generation===this.generation?{world:unpack(data.triangles,6),edges:unpack(data.edges,4)}:{world:[],edges:[]}),failed:()=>{this.background=false;finish(job.generation===this.generation?buildBarrierGeometry(job.triangles,job.origin,job.pose,job.range):{world:[],edges:[]});}});
  background.postMessage({id,points,origin:job.origin,pose:job.pose,range:job.range},[points.buffer]);
 }
 ready(){if(!this.busy)return Promise.resolve();return new Promise(resolve=>(this.waiters??=[]).push(resolve));}
 resolveReady(){if(this.busy)return;for(const resolve of this.waiters||[])resolve();this.waiters=[];}
}

// Publish only complete geometry batches. An incomplete UDP update never
// replaces the last intact concrete barrier with a handful of fragments.
class BarrierFeed{
 constructor(){this.pending=new Map();this.latest=-1;}
 accept(value,now){
  if(value.batch===undefined)return value;
  for(const [key,b]of this.pending)if(now-b.at>2000)this.pending.delete(key);
  if(value.batch<=this.latest)return null;
  const key=value.vehicleId+':'+value.batch;let batch=this.pending.get(key);
  if(!batch){if(this.pending.size>=2)this.pending.delete(this.pending.keys().next().value);batch={at:now,vehicleId:value.vehicleId,total:value.total,origin:value.origin,parts:new Map()};this.pending.set(key,batch);}
  if(batch.total!==value.total||JSON.stringify(batch.origin)!==JSON.stringify(value.origin)){this.pending.delete(key);return null;}
  batch.parts.set(value.part,value.barrierFaces);
  if(batch.parts.size!==batch.total)return null;
  const barrierFaces=[];for(let part=0;part<batch.total;part++)barrierFaces.push(...batch.parts.get(part));
  this.latest=value.batch;for(const [key,p]of this.pending)if(p.at<=batch.at)this.pending.delete(key);
  return{vehicleId:value.vehicleId,origin:batch.origin,batch:value.batch,barrierFaces};
 }
}
module.exports={BarrierFeed};

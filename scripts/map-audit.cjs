// Read-only UDP diagnostic. Run while DriveDeck is closed.
const fs=require('node:fs');
const path=require('node:path');
const {Telemetry}=require('../src/lib/telemetry.cjs');
const receiver=new Telemetry();
const output=path.resolve(process.argv[2]||'artifacts/map-audit.json');
let ended=false,timer;
function finish(roads){
 if(ended)return;ended=true;clearTimeout(timer);
 const map=receiver.mapFeed.snapshot(),parent=new Map(),degree=new Map();
 const key=(x,y)=>`${x},${y}`;
 const root=x=>{if(!parent.has(x))parent.set(x,x);let r=x;while(parent.get(r)!==r)r=parent.get(r);while(x!==r){const next=parent.get(x);parent.set(x,r);x=next;}return r;};
 for(const r of roads||[]){const a=key(r[0],r[1]),b=key(r[2],r[3]);parent.set(root(a),root(b));degree.set(a,(degree.get(a)||0)+1);degree.set(b,(degree.get(b)||0)+1);}
 const report={simulated:false,mapId:map.mapId,segments:roads?.length||0,components:new Set([...parent.keys()].map(root)).size,looseEnds:[...degree.values()].filter(n=>n===1).length,position:map.position,roads:roads||[],received:receiver.received};
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report));receiver.close();
 delete report.roads;console.log(JSON.stringify(report));
}
receiver.mapFeed.on('update',patch=>{if(patch.roads?.length)finish(patch.roads);});
receiver.listen(4444).then(()=>{timer=setTimeout(()=>finish(),14000);}).catch(e=>{console.error(e.message);process.exitCode=1;});

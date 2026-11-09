const {test}=require('node:test'),assert=require('node:assert/strict');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('Static surroundings use their capture pose and survive brief gaps without retaining traffic',async()=>{
 const {StaticScene,worldPoint}=await import('../src/renderer/static-scene.mjs'),scene=new StaticScene(),origin={x:100,y:200,heading:30},feed={origin,environment:[{kind:'building',x:8,y:25,width:10,length:15,height:12,heading:0}],pavement:[{x:8,y:20,width:4,length:5,heading:0}],vehicles:[{id:1,x:0,y:20}],signals:[{x:5,y:20}]};
 const data={connected:true,vehicleId:'vivace',surroundings:feed},map={position:[100,210],heading:35,mapId:'east'};
 const first=scene.update(data,map,1000),expected=worldPoint([8,25],origin),actual=worldPoint([first.environment[0].x,first.environment[0].y],{x:100,y:210,heading:35});close(actual[0],expected[0]);close(actual[1],expected[1]);
 const nextMap={...map,position:[103,215],heading:42},gap=scene.update({...data,surroundings:null},nextMap,2100);assert.equal(gap.environment.length,1);assert.equal(gap.pavement.length,1);assert.equal(gap.vehicles.length,0);assert.equal(gap.signals.length,0);const moved=worldPoint([gap.environment[0].x,gap.environment[0].y],{x:103,y:215,heading:42});close(moved[0],expected[0]);close(moved[1],expected[1]);
 assert.equal(scene.update({...data,surroundings:null},nextMap,6100).environment.length,0);
 scene.update(data,map,7000);const reset=scene.update({...data,surroundings:null},{...map,position:[1000,1000]},7100);assert.equal(reset.pavement.length,0);assert.equal(reset.environment.length,0);
 scene.update(data,map,7200);scene.update({...data,connected:false,surroundings:null},map,7300);assert.equal(scene.update(data,map,7400).pavement.length,1,'same packet must be re-ingested after reset');
});
test('Settled sidewalks retain world geometry across movement, jitter and new distant coverage',async()=>{
 const {settleSidewalk}=await import('../src/renderer/settled-sidewalk.mjs'),{worldPoint,viewPoint}=await import('../src/renderer/static-scene.mjs');const cache={},map={position:[100,200],heading:25,renderDistance:120},pose={x:100,y:200,heading:25},candidate=[[[5,-5],[9,-5],[9,65],[5,65]]];
 settleSidewalk(cache,candidate,map,1000);settleSidewalk(cache,[],map,2500);const settled=JSON.stringify([...cache.worldSections]),moving={...map,position:[102,211],heading:35},current={x:102,y:211,heading:35};
 const jitter=candidate.map(loop=>loop.map(p=>viewPoint(worldPoint([p[0]+.015,p[1]],pose),current)));const loops=settleSidewalk(cache,jitter,moving,2600);
 // Existing cells must never breathe, rotate, or slide when the fitting changes.
 for(const [key,old]of JSON.parse(settled))assert.deepEqual(cache.worldSections.get(key),old);
 const rendered=loops.flat().map(p=>worldPoint(p,current));const stored=[...cache.worldSections.values()].flatMap(e=>e.loops.flat());rendered.forEach((p,i)=>{close(p[0],stored[i][0]);close(p[1],stored[i][1]);});
 const count=cache.worldSections.size;settleSidewalk(cache,[[[5,70],[9,70],[9,110],[5,110]]],moving,2700);assert.ok(cache.worldSections.size>count,'new observations still extend the sidewalk');
});
test('Surroundings capture pose is validated before renderer use',()=>{
 const {decodeSensors}=require('../src/lib/vehicle-sensors.cjs'),packet=origin=>Buffer.from('DDS1'+JSON.stringify({vehicleId:'vivace',origin,vehicles:[],signals:[]}));assert.deepEqual(decodeSensors(packet({x:1,y:2,heading:30})).origin,{x:1,y:2,heading:30});assert.equal(decodeSensors(packet({x:'bad',y:2,heading:30})).origin,undefined);
});

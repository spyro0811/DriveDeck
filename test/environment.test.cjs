const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {lua,lauxlib,lualib,to_luastring}=require('fengari');
const {decodeSensors}=require('../src/lib/vehicle-sensors.cjs');
function runLua(code){const state=lauxlib.luaL_newstate();lualib.luaL_openlibs(state);const status=lauxlib.luaL_dostring(state,to_luastring(code)),message=status===lua.LUA_OK?'':lua.lua_tojsstring(state,-1);lua.lua_close(state);assert.equal(status,lua.LUA_OK,message);}
test('Absolute scans static and forest objects within a fixed budget, keeps real bounds, and clears between maps',()=>{
 const source=fs.readFileSync(require('node:path').join(__dirname,'../beamng/drivedeck/lua/ge/extensions/drivedeck/environment.lua'),'utf8');
 runLua(`math.atan2=math.atan;local mission='east';getMissionFilename=function()return mission end;local calls=0;local names={};for i=1,250 do names[i]=tostring(i)end
 local shapes={'/buildings/eca_bld_cafe.dae','/props/fire_hydrant.dae','/props/power_pole.dae','/trees/oak_tree.dae','/buildings/eca_townbase.dae'}
 local object=function(i)local kind=(i-1)%5+1;local p={x=6+(i%4)*5,y=10+math.floor(i/5),z=0};return{shapeName=shapes[kind],getPosition=function()return p end,getScale=function()return{x=2,y=1,z=1}end,getObjBox=function()return{minExtents={x=kind==2 and -.4 or -1,y=-1,z=0},maxExtents={x=kind==2 and .4 or 1,y=1,z=kind==1 and 10 or kind==2 and 1 or 8}}end,getTransform=function()return{getColumn=function(self,n)return({[0]={x=1,y=0,z=0},[1]={x=0,y=1,z=0},[2]={x=0,y=0,z=1},[3]=p})[n]end}end}end
 scenetree={findClassObjects=function()return mission=='empty' and {} or names end,findObject=function(name)calls=calls+1;return object(tonumber(name))end}
 Box3F=function()return{}end;Point3F=function(x,y,z)return{x=x,y=y,z=z}end
 local tree={getPosition=function()return{x=-6,y=5,z=0}end,getData=function()return{shapeFile='oak_tree.dae',getName=function()return 'oak'end}end,getObjBox=function()return{minExtents={x=-2,y=-2,z=0},maxExtents={x=2,y=2,z=12}}end,getScale=function()return 1 end,getTransform=function()return{getColumn=function(self,n)return({[0]={x=1,y=0,z=0},[1]={x=0,y=1,z=0},[2]={x=0,y=0,z=1},[3]={x=-6,y=5,z=0}})[n]end}end}
 core_forest={getForestObject=function()return{getData=function()return{getItemsBox=function()return mission=='empty' and {} or {tree,tree}end}end}end}
 local m=(function()${source} end)();for i=1,4 do calls=0;m.step({x=0,y=0,z=0},1);assert(calls<=96,'Static frame scan budget exceeded')end
 local out=m.sample({x=0,y=0,z=0},0,1);assert(#out>10 and #out<=80);local counts={};local forest=0;for _,o in ipairs(out)do counts[o.kind]=(counts[o.kind]or 0)+1;if o.x==-6 then forest=forest+1;assert(o.height==12)end;if o.kind=='building'then assert(o.width==4 and o.height==10)end end;assert(counts.building and counts.hydrant and counts.pole and counts.tree);assert(forest==1,'Duplicate forest item');assert(counts.tree<=32 and counts.building<=24)
 mission='empty';m.step({x=0,y=0,z=0},1);assert(#m.sample({x=0,y=0,z=0},0,1)==0)`);
});

test('Rotated forest shops keep local dimensions and orientation and omit underground foundations',()=>{
 const source=fs.readFileSync(require('node:path').join(__dirname,'../beamng/drivedeck/lua/ge/extensions/drivedeck/environment.lua'),'utf8');
 runLua(`math.atan2=math.atan;getMissionFilename=function()return 'east_coast_usa'end;scenetree={findClassObjects=function()return{}end};Box3F=function()return{}end;Point3F=function(x,y,z)return{x=x,y=y,z=z}end
 local c=math.sqrt(.5);local shop={getPosition=function()return{x=20,y=25,z=3}end,getData=function()return{shapeFile='eca_bld_shop_town_a.dae',getName=function()return 'shop'end}end,getObjBox=function()return{minExtents={x=-6.200015068,y=-5.199999809,z=-2.891904116},maxExtents={x=6.199999809,y=8.006734848,z=8.650006294}}end,getWorldBox=function()error('World AABB must not become a building footprint')end,getScale=function()return 1.5 end,getTransform=function()return{getColumn=function(self,i)return({[0]={x=c,y=-c,z=0},[1]={x=c,y=c,z=0},[2]={x=0,y=0,z=1},[3]={x=20,y=25,z=3}})[i]end}end}
 core_forest={getForestObject=function()return{getData=function()return{getItemsBox=function()return{shop}end}end}end};local m=(function()${source}end)();m.step({x=0,y=0,z=0},1);local out=m.sample({x=0,y=0,z=0},0,1);assert(#out==1);local o=out[1];assert(math.abs(o.width-18.6000223155)<.001);assert(math.abs(o.length-19.8101019855)<.001);assert(math.abs(o.heading-45)<.001);assert(math.abs(o.height-12.975009441)<.001);assert(o.z==3);assert(o.x>21 and o.y>26,'Local center must rotate with the shop')`);
});
test('Absolute packets reject oversized and unknown environment objects and preserve all four types',async()=>{
 const objects=['building','tree','pole','hydrant'].map((kind,i)=>({kind,x:6+i,y:12,z:.2,width:kind==='building'?20:1,length:3,height:kind==='building'?18:2,heading:45}));
 const packet=environment=>Buffer.from('DDS1'+JSON.stringify({vehicleId:'vivace',vehicles:[],signals:[],environment}));
 const decoded=decodeSensors(packet([...objects,{...objects[0],width:900},{...objects[0],kind:'anything'},{...objects[0],z:99}]));assert.deepEqual(decoded.environment,objects);assert.equal(decodeSensors(packet(Array(100).fill(objects[0]))).environment.length,80);
 const {environmentMesh}=await import('../src/renderer/environment-3d.mjs');for(const o of objects){const faces=environmentMesh(o);assert.ok(faces.length>=5);assert.ok(faces.every(f=>f.points.every(p=>p.every(Number.isFinite))));assert.ok(new Set(faces.map(f=>f.color)).size>1);}
 const {validateSettings}=require('../src/lib/settings.cjs');assert.equal(validateSettings({trafficView:'absolute'}).trafficView,'absolute');
});

test('Hillside objects meet the same display ground as the road and tree crowns stay compact',async()=>{
 const {environmentMesh,treeDimensions}=await import('../src/renderer/environment-3d.mjs');
 for(const kind of ['building','tree','pole','hydrant']){const object={kind,x:6,y:25,z:0,width:12,length:10,height:12,heading:30};assert.deepEqual(environmentMesh({...object,z:15}),environmentMesh({...object,z:-15}));assert.equal(Math.min(...environmentMesh(object).flatMap(f=>f.points.map(p=>p[2]))),0);}
 const tree={kind:'tree',x:0,y:20,z:0,width:24,length:24,height:25,heading:0};assert.ok(treeDimensions(tree).width<=3.2);assert.ok(treeDimensions(tree).height<=10);for(const style of ['compact','slender','evergreen']){const points=environmentMesh(tree,style).flatMap(f=>f.points);assert.ok(Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0]))<=3.2);assert.ok(points.every(p=>p.every(Number.isFinite)));}
 assert.deepEqual([tree].flatMap(environmentMesh),environmentMesh(tree,'evergreen'),'Array callbacks must preserve the selected evergreen style');
});

test('Sidewalk contours ignore packet ordering and hold still through parked sensor jitter',async()=>{
 const {sidewalkContours,drawSidewalkSurface}=await import('../src/renderer/sidewalk-surface.mjs');
 const rows=Array.from({length:18},(_,i)=>({x:3+(i>10?.5:0),y:i-5,width:2,length:1,heading:0}));
 assert.deepEqual(sidewalkContours(rows),sidewalkContours([...rows].reverse()));assert.deepEqual(sidewalkContours(rows),sidewalkContours([...rows.slice(7),...rows.slice(0,7)]));
 const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}}),cache={stationary:true};drawSidewalkSurface(ctx,rows,800,400,cache);const first=cache.loops;
 drawSidewalkSurface(ctx,[...rows].reverse().map(o=>({...o,x:o.x+.02,y:o.y-.03})),800,400,cache);assert.equal(cache.loops,first,'Small parked changes must reuse the same geometry');
 cache.stationary=false;drawSidewalkSurface(ctx,rows.map(o=>({...o,x:o.x+.5})),800,400,cache);assert.notEqual(cache.loops,first,'The scene must track real movement');
});

test('Rounded sidewalks retain soft corners, settle while parked, and release on movement or respawn',async()=>{const {roundedSidewalk,drawSidewalkSurface,updateSidewalkPose}=await import('../src/renderer/sidewalk-surface.mjs'),outline=[[2,-5],[4,-5],[4,15],[2,15]],rounded=roundedSidewalk(outline);assert.ok(rounded.length>outline.length);assert.ok(rounded.some(p=>p[0]>2&&p[0]<2.55&&p[1]>-5&&p[1]<-4.45));const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:()=>{}}),cache={},data={vehicleId:'vivace',speedMps:0},map={mapId:'east',position:[100,200],heading:0},rows=Array.from({length:20},(_,i)=>({x:3,y:i-5,width:2,length:1,heading:0}));updateSidewalkPose(cache,data,map,0);drawSidewalkSurface(ctx,rows,800,400,cache);const first=cache.loops;updateSidewalkPose(cache,data,map,2000);drawSidewalkSurface(ctx,rows.map(o=>({...o,x:o.x+.4})),800,400,cache);assert.equal(cache.loops,first,'A stopped curb must not ripple as scan samples change');updateSidewalkPose(cache,data,{...map,position:[120,200]},2100);drawSidewalkSurface(ctx,rows.map(o=>({...o,x:o.x+4})),800,400,cache);assert.notEqual(cache.loops,first,'Respawning must discard the held curb');const next=cache.loops;updateSidewalkPose(cache,{...data,speedMps:10},map,2200);drawSidewalkSurface(ctx,rows,800,400,cache);assert.notEqual(cache.loops,next);});

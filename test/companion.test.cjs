const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { lua, lauxlib, lualib, to_luastring } = require('fengari');

function runLua(code) {
  const state = lauxlib.luaL_newstate(); lualib.luaL_openlibs(state);
  const result = lauxlib.luaL_dostring(state, to_luastring(code));
  const message = result === lua.LUA_OK ? '' : lua.lua_tojsstring(state, -1);
  lua.lua_close(state); assert.equal(result, lua.LUA_OK, message);
}
test('Simplified traffic is classified by selected configuration rather than shared model metadata',()=>{const source=fs.readFileSync(path.join(__dirname,'../beamng/drivedeck/lua/ge/extensions/drivedeck/map.lua'),'utf8'),block=source.slice(source.indexOf('local vehicleKinds='),source.indexOf('local function sendSurroundings'));runLua(`core_vehicles={getVehicleDetails=function()return {configs={},model={},current={}}end};${block}
local function car(config)return {partConfig=config,getJBeamFilename=function()return 'simple_traffic'end,getID=function()return 1 end}end
assert(vehicleKind(car('vehicles/simple_traffic/roamer_base.pc'))=='suv');assert(vehicleKind(car('vehicles/simple_traffic/pickup_d15_farm.pc'))=='pickup');assert(vehicleKind(car('vehicles/simple_traffic/van_passenger.pc'))=='van');assert(vehicleKind(car('vehicles/simple_traffic/bastion_base.pc'))=='sedan')`);});
test('Roadside scan exports only named narrow sidewalk and guardrail objects',()=>{const source=fs.readFileSync(path.join(__dirname,'../beamng/drivedeck/lua/ge/extensions/drivedeck/roadside.lua'),'utf8');runLua(`math.atan2=math.atan;getMissionFilename=function()return 'test'end;scenetree={findClassObjects=function()return {'sidewalk','guardrail','building'}end,findObject=function(name)return {shapeName=name,getObjBox=function()return {minExtents={x=-1,y=-5,z=0},maxExtents={x=1,y=5,z=.2}}end,getScale=function()return{x=1,y=1,z=1}end,getTransform=function()return {getColumn=function(self,i)return ({[0]={x=1,y=0,z=0},[1]={x=0,y=1,z=0},[2]={x=0,y=0,z=1},[3]={x=5,y=20,z=0}})[i]end}end}end};local module=(function() ${source} end)();local objects=module.sample({x=0,y=0,z=0},0,1);assert(#objects==2 and objects[1].width==2 and objects[1].length==10)`);});
test('Side camera follows main auto exposure and manual exposure without changing the main view',()=>{const source=fs.readFileSync(path.join(__dirname,'../beamng/drivedeck/lua/ge/extensions/drivedeck/camera.lua'),'utf8'),block=source.slice(source.indexOf(" local main=RenderViewManagerInstance:getView('main')"),source.indexOf(' local forward=player:getDirectionVector()'));runLua(`local view={};local main={currentExposure=.025};local exposure={autoExposure=true};RenderViewManagerInstance={getView=function()return main end};scenetree={findObject=function()return exposure end};local function sync() ${block} end;sync();assert(view.currentExposure==.025 and view.useManualEV==false);exposure.autoExposure=false;exposure.manualEV=1.3;sync();assert(view.useManualEV and view.manualEV==1.3 and main.currentExposure==.025)`);});

test('Road lanes avoid inferred extra lanes and preserve explicit road lane counts',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../beamng/drivedeck/lua/ge/extensions/drivedeck/map.lua'),'utf8'),block=source.slice(source.indexOf('local function nearbyLanes('),source.indexOf('local function sendSurroundings('));
 runLua(`map={findBestRoad=function()return 'a','b' end,getMap=function()return {nodes={a={pos={x=0,y=-10},radius=7,links={b={lanes='++--'}}},b={pos={x=0,y=30},radius=7,links={a={},c={}}},c={pos={x=15,y=70},radius=6,links={b={}}}}}end}
 ${block}
 local lanes=nearbyLanes({x=0,y=0},{x=0,y=1},function(p)return p.x,p.y end);assert(lanes.count==2 and lanes.estimated==true and #lanes.points>5);assert(lanes.points[#lanes.points].x>10);assert(lanes.points[1].width<=7.4);scenetree={findObject=function(name)if name=='a' then return {getClassName=function()return 'DecalRoad'end,autoLanes=false,lanesLeft=2,lanesRight=2}end end};local explicit=nearbyLanes({x=0,y=0},{x=0,y=1},function(p)return p.x,p.y end);assert(explicit.count==4 and explicit.estimated==false);assert(nearbyLanes({x=1000,y=0},{x=0,y=1},function(p)return p.x,p.y end)==nil)`);
});

test('Nearby exporter preserves stop-line lamps on hills, resolves uncached objects and skips stop signs',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../beamng/drivedeck/lua/ge/extensions/drivedeck/map.lua'),'utf8');
 const block=source.slice(source.indexOf('local function nearbyLanes('),source.indexOf('local function buildRoads('));
 const signalSource=fs.readFileSync(path.join(__dirname,'../beamng/drivedeck/lua/ge/extensions/drivedeck/signals.lua'),'utf8');
 runLua(`math.atan2=math.atan;local PORT=4444;local captured;jsonEncode=function(v)captured=v;return 'test' end;local udp={sendto=function()end}
 local player={getID=function()return 1 end,getJBeamFilename=function()return 'vivace' end}
 local function car(id,x,y,z)return {getID=function()return id end,getPosition=function()return{x=x,y=y,z=z or 0}end,getDirectionVector=function()return{x=0,y=1}end}end
 local stopWidths={}
 getAllVehiclesByType=function()return {player,car(2,-3,20),{getID=function()error('traffic object removed')end},car(3,0,500),car(4,0,20,20)}end
 scenetree={findObjectById=function(id)return {getPosition=function()return {x=8,y=8,z=0}end,getWorldBox=function()return {minExtents={x=2,y=8,z=0},maxExtents={x=8,y=8.3,z=6}}end}end};core_trafficSignals={getSignals=function()return {{active=true,pos={x=0,y=-1},dir={x=0,y=1},linkedObjects={},getState=function()return 'green',{lights={'black','black','green'}}end},{active=true,pos={x=0,y=20},dir={x=0,y=1},linkedObjects={},getState=function()return 'basicStop',{action='briefStop',lights={'red'}}end},{linkedObjects={11},active=true,pos={x=0,y=-1},dir={x=0,y=1},getState=function()return 'stopSign',{action='briefStop',lights={'red'}}end},{getSignalObjects=function()return {10}end,active=true,pos={x=2,y=-2},dir={x=0,y=.6},getState=function()return 'red',{lights={'red','black','black'}}end},{active=true,pos={x=3,y=30},dir={x=0,y=-1},getState=function()return 'green',{lights={'black','black','green'}}end}}end}
 package.loaded['ge/extensions/drivedeck/signals']=(function() ${signalSource} end)();
 ${block}
 sendSurroundings(player,{x=0,y=0,z=0},{x=0,y=1});assert(captured.vehicleId=='vivace');assert(#captured.vehicles==1 and captured.vehicles[1].x==-3 and captured.vehicles[1].y==20);assert(#captured.signals==1 and captured.signals[1].state=='red' and captured.signals[1].x==8);assert(captured.signals[1].approachY==-2);assert(#captured.signs==2 and captured.signs[1].kind=='stop');assert(captured.signs[2].x==3.5)`);
});

test('Damage exporter separates damaged, broken and unknown components from temperature',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../beamng/drivedeck/lua/vehicle/protocols/drivedeck_cluster_v2.lua'),'utf8');
 const block=source.slice(source.indexOf('local function componentDamage('),source.indexOf('local function copyText('));
 runLua(`local engine={};damageTracker={getDamage=function(group,key)return key=='engineLockedUp' or key=='tireFL' end};powertrain={getDevices=function()return {{name='gearbox',deviceCategories={gearbox=true},isBroken=true}}end};wheels={wheels={{name='FL'},{name='RR',isBroken=true}}}
 ${block}
 beamstate={getPartDamageScores=function()return {vivace_bumper_F=0.2,vivace_door_L=0.8,vivace_fender_R=0,vivace_hatch=0.5}end};local damage=componentDamage();assert(damage.bumperFront==1 and damage.doorLeft==2 and damage.fenderFR==0 and damage.trunk==1 and damage.bumperRear==nil);assert(damage.engine==2 and damage.transmission==2 and damage.cooling==0 and damage.FL==1 and damage.RR==2 and damage.FR==nil);engine=nil;assert(componentDamage().engine==nil)`);
});

test('Building outlines use actual scaled/rotated mesh bounds and scanning is spread across frames',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../beamng/drivedeck/lua/ge/extensions/drivedeck/map.lua'),'utf8');
 runLua(`
  captured={};math.atan2=math.atan
  package.preload.socket=function()return{udp=function()return{settimeout=function()end,sendto=function()end,close=function()end}end}end
  jsonEncode=function(value)captured[#captured+1]=value;return 'payload'end
  setExtensionUnloadMode=function()end
  be={getPlayerVehicle=function()return{getPosition=function()return{x=100,y=200}end,getDirectionVector=function()return{x=0,y=1}end}end}
  map={getMap=function()return graph end};graph={nodes={}}
  getMissionFilename=function()return '/levels/test/main.level.json'end
  local names={};for i=1,201 do names[i]='object'..i end
  local calls=0
  local object={getField=function(self,key)if key=='shapeName'then return '/levels/test/buildings/house_01.dae'else return '0'end end,getPosition=function()return{x=100,y=200}end,getObjBox=function()return{minExtents={x=0,y=0,z=0},maxExtents={x=10,y=20,z=5}}end,getScale=function()return{x=2,y=1,z=1}end,getTransform=function()return{getColumn=function(self,i)return ({[0]={x=0,y=1},[1]={x=-1,y=0},[2]={x=0,y=0},[3]={x=100,y=200}})[i]end}end}
  scenetree={findClassObjects=function(class)assert(class=='TSStatic');return names end,findObject=function(name)calls=calls+1;if name=='object1'then return object end;return {getField=function()return '/tree.dae'end}end}
  local module=(function() ${source} end)();module.onExtensionLoaded();module.onUpdate(.1,.1,.1)
  assert(calls<=80,'Building scan blocked a frame')
  for _,message in ipairs(captured)do assert(message.kind~='buildings','Incomplete scan should not publish partial buildings')end
  module.onUpdate(.1,.1,.1);module.onUpdate(.1,.1,.1)
  local buildings
  for _,message in ipairs(captured)do if message.kind=='buildings'then buildings=message.buildings end end
  assert(buildings and #buildings==1)
  local expected={100,200,100,220,80,220,80,200};for i,n in ipairs(expected)do assert(buildings[1][i]==n,'Incorrect transformed footprint')end
  module.onExtensionUnloaded()
 `);
});

test('mod loader resolves BeamNG underscore names to folders and registers manual lifetime before loading', () => {
  const source = fs.readFileSync(path.join(__dirname, '../beamng/drivedeck/scripts/drivedeck/modScript.lua'), 'utf8');
  const extensionName = 'drivedeck_map';
  assert.ok(fs.existsSync(path.join(__dirname, '../beamng/drivedeck/lua/ge/extensions', `${extensionName.replaceAll('_', '/')}.lua`)));
  runLua(`
    local registered=false
    setExtensionUnloadMode=function(name,mode)assert(name=='drivedeck_map' and mode=='manual');registered=true end
    extensions={load=function(name)assert(registered and name=='drivedeck_map');extensions.drivedeck_map={}end}
    ${source}
    assert(extensions.drivedeck_map)
  `);
});

test('vehicle Lua reads the real driveModes controller API and changes mode without altering the game', () => {
  const source = fs.readFileSync(path.join(__dirname, '../beamng/drivedeck/lua/vehicle/protocols/drivedeck_cluster_v2.lua'),'utf8');
  runLua(`
    package.preload.ffi = function() return {fill=function(target)target.value=''end,copy=function(target,value,count)target.value=value:sub(1,count)end} end
    bit={bor=function(a,b)return a|b end}
    activeMode='comfort'
    local drive={getCurrentDriveModeKey=function()return activeMode end,getDriveModeData=function(key)return {name=key,settings={gauge={modeName=key:upper(),modeColor=key=='sport' and '#8F0101' or '#1e7ccc'}}}end}
    controller={getController=function(name)assert(name=='driveModes');return drive end}
    powertrain={getDevicesByType=function(name)assert(name=='combustionEngine');return {{maxRPM=8000}}end}
    vehiclePath='/vehicles/vivace/'
    v={data={information={name='Cherrier Vivace S'}}}
    electrics={values={rpm=1200,rpmTacho=1210,wheelspeed=12,fuel=.6,watertemp=90,gearIndex=3,gear='D',signal_L=1,parkingbrake=0}}
    obj={queueGameEngineLua=function(self,code)assert(code:find('drivedeck_map',1,true))end,getEnvTemperature=function()return 300 end}
    local module=(function() ${source} end)()
    module.init()
    local o={magic={},vehicleId={},vehicleName={},modeKey={},modeLabel={},modeColor={},selectedGear={}}
    module.fillStruct(o,.04)
    assert(o.magic.value=='DDK2' and o.version==2)
    assert(o.vehicleId.value=='vivace' and o.modeKey.value=='comfort' and o.modeLabel.value=='COMFORT')
    assert(o.rpm==1210 and o.gear==3 and o.lights==32)
    activeMode='sport';module.fillStruct(o,.04)
    assert(o.modeLabel.value=='SPORT' and o.modeColor.value=='#8F0101')
    assert(module.getPort()==4444 and module.getMaxUpdateRate()==30)
  `);
});

test('map Lua exports actual graph edges, skips hidden roads, and sends the ground-marker route', () => {
  const source = fs.readFileSync(path.join(__dirname, '../beamng/drivedeck/lua/ge/extensions/drivedeck/map.lua'),'utf8');
  runLua(`
    captured={};math.atan2=math.atan
    package.preload.socket=function()return{udp=function()return{settimeout=function()end,sendto=function(self,message,ip,port)assert(message:sub(1,4)=='DDM1' and ip=='127.0.0.1' and port==4444)end,close=function()end}end}end
    jsonEncode=function(value)captured[#captured+1]=value;return 'payload'end
    setExtensionUnloadMode=function()end
    be={getPlayerVehicle=function(self,index)assert(index==0);return{getPosition=function()return{x=0,y=0}end,getDirectionVector=function()return{x=0,y=1}end}end}
    local nodes={a={pos={x=0,y=0},radius=4,links={b={drivability=1},c={drivability=.5,hiddenInNavi=true}}},b={pos={x=10,y=20},radius=4,links={a={drivability=1}}},c={pos={x=30,y=40},radius=4,links={a={hiddenInNavi=true}}}}
    local graph={nodes=nodes};map={getMap=function()return graph end}
    getMissionFilename=function()return '/levels/utah/main.level.json'end
    core_groundMarkers={routePlanner={path={{pos={x=0,y=0}},{pos={x=10,y=20}}}}}
    local module=(function() ${source} end)()
    module.onExtensionLoaded();module.onUpdate(.6,.6,.6)
    local roads,pose,route
    for _,message in ipairs(captured)do if message.kind=='roads'then roads=message elseif message.kind=='pose'then pose=message elseif message.kind=='route'then route=message end end
    assert(roads and #roads.roads==1 and roads.roads[1][3]==10 and roads.roads[1][4]==20)
    assert(pose and pose.mapId=='utah' and pose.heading==0)
    assert(route and #route.points==2 and route.points[2][1]==10)
    module.onExtensionUnloaded()
  `);
});

test('map exporter keeps single-sided links and complete networks larger than the old 6000-edge cap',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../beamng/drivedeck/lua/ge/extensions/drivedeck/map.lua'),'utf8');
 runLua(`
  captured={};math.atan2=math.atan
  package.preload.socket=function()return{udp=function()return{settimeout=function()end,sendto=function()end,close=function()end}end}end
  jsonEncode=function(value)captured[#captured+1]=value;return 'payload'end
  setExtensionUnloadMode=function()end
  be={getPlayerVehicle=function()return{getPosition=function()return{x=0,y=0}end,getDirectionVector=function()return{x=0,y=1}end}end}
  local nodes={}
  -- Reverse-only links reproduce the valid edges discarded by name ordering.
  for i=0,6500 do nodes['n'..i]={pos={x=i*.5,y=0},radius=3,links={}} end
  for i=1,6500 do nodes['n'..i].links['n'..(i-1)]={drivability=1}end
  nodes.n0.links.n1={drivability=1} -- Reciprocal entry must not duplicate a road.
  nodes.crossA={pos={x=-8000,y=20},links={crossB={drivability=.8}}}
  nodes.crossB={pos={x=8000,y=20},links={}}
  nodes.hidden={pos={x=0,y=30},links={n0={hiddenInNavi=true}}}
  local graph={nodes=nodes};map={getMap=function()return graph end}
  getMissionFilename=function()return '/levels/test/main.level.json'end
  local module=(function() ${source} end)()
  module.onExtensionLoaded()
  for i=1,40 do module.onUpdate(.1,.1,.1)end
  local parts,edges,seen={},0,{}
  for _,message in ipairs(captured)do if message.kind=='roads' and not parts[message.part]then
    parts[message.part]=true
    for _,road in ipairs(message.roads)do
      edges=edges+1
      if road[2]==0 and road[4]==0 then seen[math.max(road[1],road[3])]=true end
    end
  end end
  assert(edges==6501,'Expected 6500 connected roads plus crossing segment, got '..edges)
  for i=1,6500 do assert(seen[i*.5],'Missing road '..i)end
  -- Periodic retries reuse the batch, so a dropped part can be recovered.
  local firstBatch=captured[1].batch
  local roadBatch
  for _,message in ipairs(captured)do if message.kind=='roads'then roadBatch=message.batch;break end end
  captured={};module.onUpdate(6,6,6)
  local retried=false
  for _,message in ipairs(captured)do if message.kind=='roads'then assert(message.batch==roadBatch);retried=true end end
  assert(retried)
  module.onExtensionUnloaded()
 `);
});

test('Terrain exporter samples actual materials in bounded frame work and sends recoverable chunks',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../beamng/drivedeck/lua/ge/extensions/drivedeck/map.lua'),'utf8');
 runLua(`
  captured={};math.atan2=math.atan;local calls=0
  package.preload.socket=function()return{udp=function()return{settimeout=function()end,sendto=function()end,close=function()end}end}end
  jsonEncode=function(value)captured[#captured+1]=value;return 'payload'end;setExtensionUnloadMode=function()end
  vec3=function(x,y,z)return{x=x,y=y,z=z}end
  core_terrain={getTerrain=function()return{getMaterialIdxWs=function(self,pos)calls=calls+1;return calls%4 end,getMaterialName=function(self,index)return ({[0]='grass',[1]='concrete',[2]='sand',[3]='unknown'})[index]end}end}
  be={getPlayerVehicle=function()return{getPosition=function()return{x=0,y=0}end,getDirectionVector=function()return{x=0,y=1}end}end}
  scenetree={findClassObjects=function()return{}end};map={getMap=function()return{nodes={}}end};getMissionFilename=function()return '/levels/test/main.level.json'end
  local m=(function() ${source} end)();m.onExtensionLoaded();m.onUpdate(.01,.01,.01);assert(calls==96,'Terrain lookup budget exceeded')
  for _,p in ipairs(captured)do assert(p.kind~='terrain','Partial grid was published')end
  for i=1,210 do m.onUpdate(.01,.01,.01)end
  local count=0;for _,p in ipairs(captured)do if p.kind=='terrain'then count=count+1;assert(p.total==22 and #p.cells==(p.part==21 and 256 or 768));assert(p.cells[1]==3 and p.cells[2]==2 and p.cells[3]==0 and p.cells[4]==1)end end
  assert(count==22,'Expected a complete recoverable terrain batch');m.onExtensionUnloaded()
 `);
});
test('Visible paved surfaces override underlying grass with at most eight raycasts per frame',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../beamng/drivedeck/lua/ge/extensions/drivedeck/map.lua'),'utf8');
 runLua(`
  captured={};math.atan2=math.atan;local frameRays=0
  package.preload.socket=function()return{udp=function()return{settimeout=function()end,sendto=function()end,close=function()end}end}end
  jsonEncode=function(value)captured[#captured+1]=value;return 'payload'end;setExtensionUnloadMode=function()end
  vec3=function(x,y,z)return{x=x,y=y,z=z}end
  core_terrain={getTerrainHeight=function()return 10 end,getTerrain=function()return{getMaterialIdxWs=function()return 0 end,getMaterialName=function()return 'grass'end}end}
  castRay=function(a,b,terrain,render)frameRays=frameRays+1;assert(a.z==510 and b.z==0 and terrain and render);return{materialName='concrete_pavement'}end
  be={getPlayerVehicle=function()return{getPosition=function()return{x=0,y=0}end,getDirectionVector=function()return{x=0,y=1}end}end}
  scenetree={findClassObjects=function()return{}end};map={getMap=function()return{nodes={}}end};getMissionFilename=function()return '/levels/test/main.level.json'end
  local m=(function() ${source} end)();m.onExtensionLoaded()
  for i=1,650 do frameRays=0;m.onUpdate(.01,.01,.01);assert(frameRays<=8,'Raycast budget exceeded')end
  local cells={};for _,p in ipairs(captured)do if p.kind=='terrain'then for i,v in ipairs(p.cells)do cells[p.part*768+i]=v end end end
  assert(cells[64*128+65]==3,'Visible city pavement must replace underlying grass')
  assert(cells[1]==1,'Do not invent city zoning over unsampled distant grass');m.onExtensionUnloaded()
 `);
});
test('Companion identifies Ardente by selected body/config, not the shared Vivace folder',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../beamng/drivedeck/lua/vehicle/protocols/drivedeck_cluster_v2.lua'),'utf8');
 runLua(`
  package.preload.ffi=function()return{fill=function(t)t.value=''end,copy=function(t,s,n)t.value=s:sub(1,n)end}end;bit={bor=function(a,b)return a|b end}
  vehiclePath='/vehicles/vivace/';controller={getController=function()end};powertrain={getDevicesByType=function()return{}end};electrics={values={}}
  obj={queueGameEngineLua=function()end,getEnvTemperature=function()return 300 end}
  v={data={information={name={'Cherrier Vivace'}}},config={parts={vivace_body='ardente_body'},partConfigFilename='vehicles/vivace/custom.pc'}}
  local m=(function() ${source} end)();m.init();local o={magic={},vehicleId={},vehicleName={},modeKey={},modeLabel={},modeColor={},selectedGear={}};m.fillStruct(o,2)
  assert(o.vehicleId.value=='vivace' and o.vehicleName.value=='Cherrier Ardente')
  vehiclePath=string.char(67,58,92)..'vehicles'..string.char(92)..'vivace'..string.char(92);m.reset();m.fillStruct(o,2);assert(o.vehicleId.value=='vivace','Proton Windows paths normalize to the correct vehicle ID')
  v.config.parts.vivace_body='vivace_body';v.config.partConfigFilename='vehicles/vivace/ardente_old_config.pc';m.reset();m.fillStruct(o,2);assert(o.vehicleName.value=='Cherrier Vivace','Selected body takes priority over filename')
  v.config.parts={};m.reset();m.fillStruct(o,2);assert(o.vehicleName.value=='Cherrier Ardente','Config fallback identifies shared-platform variants')
   v.config.parts={vivace_body='vivace_body',vivace_bumper_R='tograc_bumper_R'};m.reset();m.fillStruct(o,2);assert(o.vehicleName.value=='Cherrier Tograc','Selected Tograc trim beats stale config filename')
   v.config.parts.vivace_bumper_R='vivace_bumper_R';v.config.partConfigFilename='vehicles/vivace/tograc_old.pc';m.reset();m.fillStruct(o,2);assert(o.vehicleName.value=='Cherrier Vivace','Selected Vivace trim beats stale Tograc filename')
   vehiclePath='vehicles/md_series/';v.config={parts={schoolbus_body_b='schoolbus_body_b'}};m.reset();m.fillStruct(o,2);assert(o.vehicleName.value=='Gavril MD-Series Bus')
   v.config={parts={md_series_frame_front='md_series_frame_front',schoolbus_body_b=''},partConfigFilename='vehicles/md_series/schoolbus_old.pc'};m.reset();m.fillStruct(o,2);assert(o.vehicleName.value=='Gavril MD-Series','A truck or disabled bus body does not reuse the bus image')

 `);
});









test('Stop signs do not require a small bounding box and include instanced signs',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../beamng/drivedeck/lua/ge/extensions/drivedeck/roadside.lua'),'utf8');
 runLua(`math.atan2=math.atan;getMissionFilename=function()return 'test'end
 scenetree={findClassObjects=function()return {'stop'}end,findObject=function()return {shapeName='sign_stop.dae',getPosition=function()return{x=3,y=10,z=0}end}end}
 Box3F=function()return{}end;Point3F=function()return{}end
 core_forest={getForestObject=function()return{getData=function()return{getItemsBox=function()return{{getData=function()return{shapeFile='sign_stop.dae',getName=function()return 'stop'end}end,getPosition=function()return{x=-3,y=20,z=0}end}}end}end}end}
 local m=(function() ${source} end)();local out=m.sample({x=0,y=0,z=0},0,1);assert(#out==2 and out[1].kind=='stop' and out[2].kind=='stop')`);
});
test('Sidewalk sampling follows collision surfaces, excludes road surfaces and bounds frame cost',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../beamng/drivedeck/lua/ge/extensions/drivedeck/pavement.lua'),'utf8');
 runLua(`math.atan2=math.atan;getMissionFilename=function()return 'test'end;vec3=function(x,y,z)return{x=x,y=y,z=z}end
 local calls=0;Engine={castRay=function(a,b)calls=calls+1;return {obj={shapeName=a.x>2 and 'sidewalk_downtown.dae' or 'road.dae'},pt={z=.1},norm={z=1}}end}
 package.preload['ge/extensions/drivedeck/mixed_surface']=function()return{step=function()end}end;local m=(function() ${source} end)();for frame=1,230 do calls=0;m.step({x=0,y=0,z=0});assert(calls<=4)end
 local out=m.sample({x=0,y=0,z=0},0,1);assert(#out>0 and #out<=96);for _,o in ipairs(out)do assert(o.x-o.width/2>=2 and o.length==1)end
 getMissionFilename=function()return 'next'end;m.step({x=-100,y=-100,z=0});assert(#m.sample({x=-100,y=-100,z=0},0,1)==0)`);
});

test('Sidewalk rays follow local ground height on slopes instead of clipping to car elevation',()=>{const source=fs.readFileSync(path.join(__dirname,'../beamng/drivedeck/lua/ge/extensions/drivedeck/pavement.lua'),'utf8');runLua(`math.atan2=math.atan;getMissionFilename=function()return 'hill'end;vec3=function(x,y,z)return{x=x,y=y,z=z}end;core_terrain={getTerrainHeight=function(p)return p.x*.5 end};Engine={castRay=function(a,b)local z=a.x*.5;assert(math.abs(a.z-z-.8)<.001 and math.abs(b.z-z+3)<.001);return{obj={shapeName='sidewalk.dae'},pt={z=z},norm={z=.9}}end};package.preload['ge/extensions/drivedeck/mixed_surface']=function()return{step=function()end}end;local m=(function() ${source} end)();for i=1,210 do m.step({x=0,y=0,z=0})end;local out=m.sample({x=0,y=0,z=0},0,1);local far=false;for _,o in ipairs(out)do if math.abs(o.x)+o.width/2>8 then far=true end end;assert(far,'Hillside sidewalks must survive elevation filtering')`);});

test('Performance and Off skip nearby actors, lights and roadside scans',()=>{const source=fs.readFileSync(path.join(__dirname,'../beamng/drivedeck/lua/ge/extensions/drivedeck/map.lua'),'utf8'),block=source.slice(source.indexOf('local stopWidths='),source.indexOf('local function buildRoads('));runLua(`math.atan2=math.atan;local captured;local PORT=4444;local udp={sendto=function()end};jsonEncode=function(v)captured=v;return ''end;getAllVehiclesByType=function()error('Heavy actor scan must not run')end;local sceneMode='off';${block};local player={getJBeamFilename=function()return 'vivace'end};sendSurroundings(player,{x=0,y=0,z=0},{x=0,y=1});assert(#captured.vehicles==0 and #captured.signals==0 and captured.lanes==nil);sceneMode='road';sendSurroundings(player,{x=0,y=0,z=0},{x=0,y=1});assert(#captured.vehicles==0 and #captured.pavement==0)`);});

test('Combined meshes classify sidewalk materials independently from asphalt and respect object transforms',()=>{const source=fs.readFileSync(path.join(__dirname,'../beamng/drivedeck/lua/ge/extensions/drivedeck/mixed_surface.lua'),'utf8');runLua(`readFile=function()return [[<mesh><source id="test-positions"><float_array>0 0 0 4 0 0 0 4 0 8 0 0 8 4 0</float_array></source><triangles material="town_sidewalk"><input semantic="VERTEX" offset="0"/><p>0 1 2</p></triangles><triangles material="asphalt"><input semantic="VERTEX" offset="0"/><p>1 3 4</p></triangles></mesh>]]end;local m=(function() ${source} end)();local o={getScale=function()return{x=2,y=2,z=1}end,getTransform=function()return{getColumn=function(self,i)return({[0]={x=1,y=0,z=0},[1]={x=0,y=1,z=0},[2]={x=0,y=0,z=1},[3]={x=10,y=20,z=2}})[i]end}end};assert(m.contains('town',o,{x=12,y=22,z=2})==nil);for i=1,10 do m.step()end;assert(m.contains('town',o,{x=12,y=22,z=2})==true);assert(m.contains('town',o,{x=24,y=22,z=2})==false);assert(m.contains('town',o,{x=12,y=22,z=10})==false)`);});

test('East Coast brick footways are accepted while asphalt and upper storeys stay excluded',()=>{const source=fs.readFileSync(path.join(__dirname,'../beamng/drivedeck/lua/ge/extensions/drivedeck/mixed_surface.lua'),'utf8');runLua(`readFile=function()return [[<mesh><source id="test-positions"><float_array>0 0 0 4 0 0 0 4 0 8 0 0 8 4 0</float_array></source><triangles material="eca_bld_bricks_dark-material"><input semantic="VERTEX" offset="0"/><p>0 1 2</p></triangles><triangles material="eca_asphalt-material"><input semantic="VERTEX" offset="0"/><p>1 3 4</p></triangles></mesh>]]end;local m=(function() ${source} end)();local o={getScale=function()return{x=1,y=1,z=1}end,getTransform=function()return{getColumn=function(self,i)return({[0]={x=1,y=0,z=0},[1]={x=0,y=1,z=0},[2]={x=0,y=0,z=1},[3]={x=0,y=0,z=0}})[i]end}end};m.contains('town',o,{x=1,y=1,z=0});for i=1,10 do m.step()end;assert(m.contains('town',o,{x=1,y=1,z=0})==true);assert(m.contains('town',o,{x=7,y=1,z=0})==false);assert(m.contains('town',o,{x=1,y=1,z=3})==false)`);});

test('Instanced guardrail geometry supports scalar forest scale and rotates into the live scene',()=>{const source=fs.readFileSync('beamng/drivedeck/lua/ge/extensions/drivedeck/roadside.lua','utf8');runLua(`math.atan2=math.atan;getMissionFilename=function()return'rails'end;scenetree={findClassObjects=function()return{}end};Box3F=function()return{}end;Point3F=function()return{}end;local item={getData=function()return{shapeFile='guardrail1.dae',getName=function()return'guardrail1'end}end,getObjBox=function()return{minExtents={x=-.2,y=-5,z=0},maxExtents={x=.2,y=5,z=1}}end,getScale=function()return 2 end,getTransform=function()return{getColumn=function(self,i)return({[0]={x=0,y=-1,z=0},[1]={x=1,y=0,z=0},[2]={x=0,y=0,z=1},[3]={x=8,y=40,z=0}})[i]end}end};core_forest={getForestObject=function()return{getData=function()return{getItemsBox=function()return{item}end}end}end};local m=(function()${source}end)();local a=m.sample({x=0,y=0,z=0},0,1);assert(#a==1 and a[1].kind=='guardrail' and a[1].length==20 and a[1].height==2);assert(a[1].x==8 and a[1].y==40 and math.abs(a[1].heading-90)<.001)`);});
test('Forward sidewalk probes reach the requested distance with four rays per step',()=>{const source=fs.readFileSync('beamng/drivedeck/lua/ge/extensions/drivedeck/pavement.lua','utf8');runLua(`math.atan2=math.atan;getMissionFilename=function()return'ahead'end;vec3=function(x,y,z)return{x=x,y=y,z=z}end;scenetree={};local rays=0;Engine={castRay=function(a,b)rays=rays+1;return{obj={shapeName='sidewalk.dae'},pt={z=0},norm={z=1}}end};package.loaded['ge/extensions/drivedeck/mixed_surface']={step=function()end};local m=(function()${source}end)();for i=1,650 do local before=rays;m.step({x=0,y=0,z=0},{x=0,y=1},90);assert(rays-before<=4)end;local a=m.sample({x=0,y=0,z=0},0,1);local far=0;for _,o in ipairs(a)do far=math.max(far,o.y)end;assert(far>=85 and #a<=256)`);});

test('Highway edges retain the paved shoulder and collision-confirmed bridge barriers beyond it',()=>{const source=fs.readFileSync('beamng/drivedeck/lua/ge/extensions/drivedeck/highway.lua','utf8');runLua(`math.atan2=math.atan;getMissionFilename=function()return'highway'end;vec3=function(x,y,z)return{x=x,y=y,z=z}end;local road={material='road_edge',getNodeCount=function()return 2 end,getNodePosition=function(self,i)return{x=7.2,y=i*100-10,z=0}end,getNodeWidth=function()return .2 end};scenetree={findClassObjects=function()return{'edge'}end,findObject=function()return road end,findObjectById=function()return{shapeName='roads/large_bridge.dae'}end};local casts=0;Engine={castRay=function(a,b)casts=casts+1;if a.x==b.x and a.y==b.y then return{pt={z=0}}end;return{obj={getID=function()return 1 end},pt={x=b.x>0 and 8 or -8,y=b.y,z=.6},norm={z=0}}end};local m=(function()${source}end)();local lanes={points={{x=0,y=0,width=7.4,roadWidth=10},{x=0,y=8,width=7.4,roadWidth=10},{x=0,y=16,width=7.4,roadWidth=10},{x=0,y=24,width=7.4,roadWidth=10}}};local out;for i=1,5 do local before=casts;out=m.sample({x=0,y=0,z=0},0,1,lanes);assert(casts-before<=3)end;local shoulders,rails=0,0;for _,o in ipairs(out)do if o.kind=='shoulder'then shoulders=shoulders+1;assert(math.abs(o.x-7.2)<.001)elseif o.kind=='guardrail'then rails=rails+1;assert(o.solid and math.abs(o.x)==8)end end;assert(shoulders>0 and rails>0)`);});

test('East Coast footway discovery reaches a raised distant mesh without terrain ray hits',()=>{const mixed=fs.readFileSync('beamng/drivedeck/lua/ge/extensions/drivedeck/mixed_surface.lua','utf8'),pavement=fs.readFileSync('beamng/drivedeck/lua/ge/extensions/drivedeck/pavement.lua','utf8');runLua(`math.atan2=math.atan;getMissionFilename=function()return'east_coast_usa'end;vec3=function(x,y,z)return{x=x,y=y,z=z}end;readFile=function()return [[<mesh><source id="near-positions"><float_array>5 -10 3 7 -10 3 7 16 3 5 16 3</float_array></source><triangles material="town_sidewalk"><input semantic="VERTEX" offset="0"/><p>0 1 2 0 2 3</p></triangles></mesh><mesh><source id="far-positions"><float_array>5 16 3 7 16 3 7 130 3 5 130 3</float_array></source><triangles material="town_sidewalk"><input semantic="VERTEX" offset="0"/><p>0 1 2 0 2 3</p></triangles></mesh>]]end;local o={shapeName='east_coast_usa/townbase.dae',getScale=function()return 1 end,getID=function()return 42 end,getTransform=function()return{getColumn=function(self,i)return({[0]={x=1,y=0,z=0},[1]={x=0,y=1,z=0},[2]={x=0,y=0,z=1},[3]={x=0,y=0,z=0}})[i]end}end};scenetree={findClassObjects=function()return{'town'}end,findObject=function()return o end};local m=(function()${mixed}end)();package.loaded['ge/extensions/drivedeck/mixed_surface']=m;local rays=0;Engine={castRay=function()rays=rays+1;return nil end};core_terrain={getTerrainHeight=function()return 0 end};local p=(function()${pavement}end)();for i=1,1100 do local before=rays;p.step({x=0,y=0,z=3},{x=0,y=1},120);assert(rays-before<=4)end;assert(m.heightAt({x=6,y=110,z=3})==3);assert(m.heightAt({x=0,y=110,z=3})==nil);local far=0;for _,o in ipairs(p.sample({x=0,y=0,z=3},0,1))do far=math.max(far,o.y)end;assert(far>115)`);});

test('Utah road signs classify exact chevrons, speed limits and warnings without mistaking bus stops for STOP',()=>{const source=fs.readFileSync('beamng/drivedeck/lua/ge/extensions/drivedeck/signs.lua','utf8');runLua(`local m=(function()${source}end)();assert(m.classify('/levels/Utah/art/shapes/ut_roadsigns/ut_chevron_left.DAE')=='chevron-left');assert(m.classify('ut_chevron_right.DAE ut_chevron_right')=='chevron-right');local k,s=m.classify('ut_70_speed_limit.DAE');assert(k=='speed' and s==70);assert(m.classify('ut_yield.DAE')=='yield');assert(m.classify('ut_curve_left.DAE')=='turn-left');assert(m.classify('ut_STOP.DAE')=='stop');assert(m.classify('ut_busstop_old_sign.dae')==nil)`);});

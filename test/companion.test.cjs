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
  v.config.parts.vivace_body='vivace_body';v.config.partConfigFilename='vehicles/vivace/ardente_old_config.pc';m.reset();m.fillStruct(o,2);assert(o.vehicleName.value=='Cherrier Vivace','Selected body takes priority over filename')
  v.config.parts={};m.reset();m.fillStruct(o,2);assert(o.vehicleName.value=='Cherrier Ardente','Config fallback identifies shared-platform variants')
 `);
});


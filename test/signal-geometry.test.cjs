const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');const {lua,lauxlib,lualib,to_luastring}=require('fengari');
function run(code){const s=lauxlib.luaL_newstate();lualib.luaL_openlibs(s);const r=lauxlib.luaL_dostring(s,to_luastring(code)),m=r===lua.LUA_OK?'':lua.lua_tojsstring(s,-1);lua.lua_close(s);assert.equal(r,lua.LUA_OK,m);}
test('Far-side heads remain visible across a wide intersection and mount to real roadside poles',()=>{
 const source=fs.readFileSync('beamng/drivedeck/lua/ge/extensions/drivedeck/signals.lua','utf8');run(`
 local function pole(x,y,h)return {getPosition=function()return{x=x,y=y,z=0}end,getWorldBox=function()return{maxExtents={z=h}}end,getData=function()return{shapeFile='pole_city1.dae',getName=function()return'pole_city1'end}end}end
 local supports={pole(4.4,35,10),pole(4.1,14,3.6)}
 core_forest={getForestObject=function()return{getData=function()return{getItemsBox=function()return supports end}end}end};Box3F=function()return{}end;Point3F=function(x,y,z)return{x=x,y=y,z=z}end
 local heads={[1]={x=4.1,y=14,z=3.3},[2]={x=-1.5,y=35,z=6.2}}
 scenetree={findClassObjects=function()return{}end,findObjectById=function(id)local p=heads[id];return{shapeName='trafficlight_overhead1.dae',getPosition=function()return p end,getWorldBox=function()return{minExtents={x=p.x-.2,y=p.y-.2,z=p.z-.45},maxExtents={x=p.x+.2,y=p.y+.2,z=p.z+.45}}end}end}
 local color='red';core_trafficSignals={getSignals=function()return{{name='approach',active=true,pos={x=0,y=14,z=0},dir={x=0,y=1},getSignalObjects=function()return{1,2}end,getState=function()return color,{lights={color,'black','black'}}end}}end}
 local m=(function()${source}end)();local a=m.sample({x=0,y=-30,z=0},0,1);assert(#a==2);assert(a[2].y==65 and a[2].x==4.4);assert(math.abs(a[2].x+a[2].armX+1.5)<.001);assert(a[2].height==6.2 and a[2].approachY==44);assert(a[1].armX==nil)
 color='green';local b=m.sample({x=0,y=20,z=0},0,1);assert(#b==2 and b[2].state=='green');local c=m.sample({x=0,y=47,z=0},0,1);assert(#c==0)
 `);
});
test('Renderer keeps both sides of the same intersection while excluding the next one',async()=>{
 const {upcomingSignals}=await import('../src/renderer/surroundings.mjs');const {decodeSensors}=require('../src/lib/vehicle-sensors.cjs');const signals=[{x:4,y:24,height:3.4,state:'green',approachY:25},{x:4.4,y:45,height:6.2,armX:-5.9,armY:0,state:'green',approachY:25},{x:6,y:120,height:6,state:'red',approachY:100}];const packet=Buffer.from('DDS1'+JSON.stringify({vehicleId:'vivace',vehicles:[],signals}));const decoded=decodeSensors(packet);assert.equal(decoded.signals[1].approachY,25);const shown=upcomingSignals(decoded.signals);assert.equal(shown.length,2);assert.equal(shown[1].y,45);
});

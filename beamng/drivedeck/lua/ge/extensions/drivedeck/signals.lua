-- Physical signal heads and their supports are separate objects on many maps.
-- Cache static geometry; query live controller colours on every sample.
local M={}
local mission,names,index,staticSupports,geometry=nil,{},1,{},{}
local function supportShape(shape)
 local s=tostring(shape or ''):lower():match('([^/]+)$') or ''
 if s:find('power',1,true) or s:find('attach',1,true) then return false end
 return s:find('pole_city',1,true) or s:find('pole_traffic',1,true) or s:find('traffic',1,true) and s:find('pole',1,true) or s:find('signal',1,true) and s:find('pole',1,true)
end
local function support(object)
 local p,b=object:getPosition(),object:getWorldBox()
 return {x=p.x,y=p.y,z=p.z,top=b.maxExtents.z}
end
local function prepare()
 local current=getMissionFilename and getMissionFilename() or ''
 if current~=mission then mission=current;names=scenetree.findClassObjects and scenetree.findClassObjects('TSStatic') or {};index=1;staticSupports={};geometry={} end
 -- Incremental scan for maps using standalone poles, without a full-scene stall.
 for n=index,math.min(index+95,#names) do pcall(function()local o=scenetree.findObject(names[n]);if o and supportShape(o.shapeName) then staticSupports[#staticSupports+1]=support(o)end end)end
 index=math.min(index+96,#names+1)
end
local function findSupport(head)
 local best,score=nil,math.huge
 local function consider(p)
  local d=(p.x-head.x)^2+(p.y-head.y)^2
  if d<18^2 and head.z-p.z>1 and head.z-p.z<14 and p.top>head.z-.8 and d<score then best,score=p,d end
 end
 for _,p in ipairs(staticSupports)do consider(p)end
 pcall(function()
  local forest=core_forest and core_forest.getForestObject();if not forest then return end
  local bounds=Box3F();bounds.minExtents=Point3F(head.x-18,head.y-18,head.z-14);bounds.maxExtents=Point3F(head.x+18,head.y+18,head.z+8)
  for _,item in ipairs(forest:getData():getItemsBox(bounds) or {})do local data=item:getData();if supportShape(tostring(data.shapeFile or '')..' '..tostring(data:getName())) then consider(support(item))end end
 end)
 return best
end
local function lampGeometry(id,object,signal,objects)
 local pos=object:getPosition();local old=geometry[id];local now=os.clock()
 if old and (old.pos.x-pos.x)^2+(old.pos.y-pos.y)^2<.01 and (old.confirmed or now-old.time<3) then return old end
 local b=object:getWorldBox();local narrow=b.maxExtents.z-b.minExtents.z<2
 local head={x=pos.x,y=pos.y,z=(b.minExtents.z+b.maxExtents.z)*.5}
 local base=narrow and findSupport(head) or {x=pos.x,y=pos.y,z=b.minExtents.z}
 local confirmed=base~=nil
 if not base then
  -- A lower, linked roadside lamp is a useful support anchor on custom maps.
  local nearest=18^2
  for _,otherId in ipairs(objects)do if otherId~=id then pcall(function()local other=scenetree.findObjectById(otherId);local p=other:getPosition();local d=(p.x-head.x)^2+(p.y-head.y)^2;if head.z-p.z>1.4 and d<nearest then nearest=d;base={x=p.x,y=p.y,z=p.z-3.4}end end)end end
 end
 if not base then
  -- Keep unsupported suspended lamps off the carriageway. Only the support is
  -- estimated; the lamp remains at its measured world position.
  local dl=math.sqrt(signal.dir.x^2+signal.dir.y^2);local rx,ry=signal.dir.y/dl,-signal.dir.x/dl
  local dx,dy=head.x-signal.pos.x,head.y-signal.pos.y;local lateral=dx*rx+dy*ry
  local width=4;pcall(function()local a,c=map.findBestRoad(signal.pos,signal.dir);local nodes=map.getMap().nodes;width=math.max(3.5,math.min(15,math.max(nodes[a].radius or 0,nodes[c].radius or 0)))end)
  local edge=(lateral<0 and -1 or 1)*math.max(width,math.abs(lateral))
  base={x=head.x+rx*(edge-lateral),y=head.y+ry*(edge-lateral),z=head.z-(tostring(object.shapeName):find('overhead',1,true) and 6 or 3.4)}
 end
 local dx,dy=head.x-base.x,head.y-base.y
 if dx*dx+dy*dy<.25^2 then head.x,head.y=base.x,base.y;dx,dy=0,0 end
 local value={pos={x=pos.x,y=pos.y},head=head,base=base,dx=dx,dy=dy,height=math.max(1.8,math.min(12,head.z-base.z)),confirmed=confirmed,time=now}
 geometry[id]=value;return value
end
M.sample=function(position,fx,fy)
 prepare()
 local function relative(p)local dx,dy=p.x-position.x,p.y-position.y;return dx*fy-dy*fx,dx*fx+dy*fy end
 local approaches={}
 for _,s in pairs(core_trafficSignals.getSignals())do pcall(function()
  if not(s.active and s.pos and s.dir and s.getState)then return end
  local x,y=relative(s.pos);local dl=math.sqrt(s.dir.x^2+s.dir.y^2)
  if dl<.01 or (s.dir.x*fx+s.dir.y*fy)/dl<.65 or y< -65 or y>140 or math.abs(x)>math.max(12,math.abs(y)*.3)then return end
  local _,state=s:getState();local color
  if state and state.lights and #state.lights>=3 then for _,c in ipairs(state.lights)do if c=='red' or c=='amber' or c=='green'then color=c;break end end end
  if not color then return end
  local objects=s.linkedObjects or {};if #objects==0 and s.getSignalObjects then objects=s:getSignalObjects() or {}end
  local heads={}
  for _,id in ipairs(objects)do pcall(function()
   local o=scenetree.findObjectById(id);if not o then return end
   local hx,hy=relative(o:getPosition());if hy< -10 or hy>145 or math.abs(hx)>45 or math.abs(hy-y)>70 then return end
   local g=lampGeometry(id,o,s,objects);local bx,by=relative(g.base);local ax,ay=g.dx*fy-g.dy*fx,g.dx*fx+g.dy*fy
   if math.abs(bx)>149 or math.abs(by)>149 then return end
   heads[#heads+1]={x=bx,y=by,height=g.height,state=color,armX=(ax~=0 or ay~=0) and ax or nil,armY=(ax~=0 or ay~=0) and ay or nil,approachY=y}
  end)end
  if #heads>0 then approaches[#approaches+1]={x=x,y=y,heads=heads}end
 end)end
 table.sort(approaches,function(a,b)return math.max(0,a.y)+math.abs(a.x)*.5<math.max(0,b.y)+math.abs(b.x)*.5 end)
 local out={};local anchor=approaches[1]
 if anchor then for _,a in ipairs(approaches)do if math.abs(a.y-anchor.y)<24 and math.abs(a.x-anchor.x)<20 then for _,s in ipairs(a.heads)do
  local duplicate=false;for _,p in ipairs(out)do if (p.x+(p.armX or 0)-s.x-(s.armX or 0))^2+(p.y+(p.armY or 0)-s.y-(s.armY or 0))^2<1.2^2 then duplicate=true;break end end
  if not duplicate and #out<8 then out[#out+1]=s end
 end end end end
 return out
end
return M

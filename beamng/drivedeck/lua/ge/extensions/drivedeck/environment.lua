-- Absolute view: read-only, cached scene objects. No game assets are copied.
local M={}
local mission,names,index,objects,forestObjects,forestTimer=nil,{},1,{},{},1
local function classify(shape)
 local s=(shape or ''):lower():match('([^/]+)$') or ''
 for _,token in ipairs({'blocker','chopped','stump','branches','poleattach'}) do if s:find(token,1,true) then return end end
 if s:find('hydrant',1,true) then return 'hydrant' end
 if s:find('pole',1,true) or s:find('streetlight',1,true) or s:find('street_light',1,true) or s:find('lamppost',1,true) then return 'pole' end
 if s:find('tree',1,true) or s:find('oak',1,true) or s:find('pine',1,true) or s:find('birch',1,true) or s:find('palm',1,true) or s:find('maple',1,true) then return 'tree' end
 for _,token in ipairs({'townbase','ground','terrain','roof','wall','window','door','fence','sign','sidewalk','curb','bridge'}) do if s:find(token,1,true) then return end end
 for _,token in ipairs({'bld','building','house','warehouse','garage','office','apartment','shop','factory','barn','hotel','cafe','church'}) do if s:find(token,1,true) then return 'building' end end
end
local function measured(object,kind,forest)
 -- ForestItem world boxes enclose a rotated building in a larger axis-aligned
 -- square. Use its local bounds and basis, just like TSStatic objects.
 local box,scale,matrix=object:getObjBox(),object:getScale(),object:getTransform()
 if type(scale)=='number' then scale={x=scale,y=scale,z=scale} end
 local mn,mx=box.minExtents,box.maxExtents;local a,b,z,p=matrix:getColumn(0),matrix:getColumn(1),matrix:getColumn(2),matrix:getColumn(3)
 -- Several town meshes contain a below-ground foundation; it is not facade.
 local base=kind=='building' and math.max(0,mn.z) or mn.z
 local cx,cy,cz=(mn.x+mx.x)*scale.x*.5,(mn.y+mx.y)*scale.y*.5,base*scale.z
 if kind=='tree' or kind=='pole' then cx,cy=0,0 end
 return {kind=kind,x=p.x+a.x*cx+b.x*cy+z.x*cz,y=p.y+a.y*cx+b.y*cy+z.y*cz,z=p.z+a.z*cx+b.z*cy+z.z*cz,width=math.abs((mx.x-mn.x)*scale.x),length=math.abs((mx.y-mn.y)*scale.y),height=math.abs((mx.z-base)*scale.z),heading=math.deg(math.atan2(b.x,b.y))}
end
local function valid(o)
 if not o or o.height<.2 or o.height>65 or o.width<.1 or o.length<.1 then return false end
 if o.kind=='building' then return o.height>2.5 and o.width<=90 and o.length<=90 end
 if o.kind=='tree' then return o.width<=24 and o.length<=24 end
 if o.kind=='pole' then return o.width<=12 and o.length<=12 and o.height<=40 end
 return o.width<=3 and o.length<=3 and o.height<=3
end
M.step=function(position,dt)
 local current=getMissionFilename()
 if current~=mission then mission=current;names=scenetree.findClassObjects('TSStatic') or {};index=1;objects={};forestObjects={};forestTimer=1 end
 -- A fixed object budget; never scan the entire scene in one frame.
 for n=1,math.min(96,#names) do
  local name=names[index];index=index%#names+1
  pcall(function()
   local object=scenetree.findObject(name);if not object then objects[name]=nil;return end
   local kind=classify(tostring(object.shapeName or ''));if not kind then return end
   local p=object:getPosition();if (p.x-position.x)^2+(p.y-position.y)^2>180^2 then objects[name]=nil;return end
   local o=measured(object,kind,false);objects[name]=valid(o) and o or nil
  end)
 end
 forestTimer=forestTimer+(dt or .016)
 if forestTimer>=1 then
  forestTimer=0
  pcall(function()
   local forest=core_forest and core_forest.getForestObject();if not forest then forestObjects={};return end
   local bounds=Box3F();bounds.minExtents=Point3F(position.x-80,position.y-80,position.z-15);bounds.maxExtents=Point3F(position.x+80,position.y+80,position.z+60)
   local items=forest:getData():getItemsBox(bounds) or {};local nearby={}
   for _,item in ipairs(items) do local p=item:getPosition();local d=(p.x-position.x)^2+(p.y-position.y)^2;if d<80^2 then nearby[#nearby+1]={item=item,d=d} end end
   table.sort(nearby,function(a,b)return a.d<b.d end);local nextObjects={}
   for n=1,math.min(192,#nearby) do pcall(function()
    local item=nearby[n].item;local data=item:getData();local kind=classify(tostring(data.shapeFile or data.shapeName or '')..' '..tostring(data:getName()))
    if kind then local o=measured(item,kind,true);if valid(o) then nextObjects[#nextObjects+1]=o end end
   end)end
   forestObjects=nextObjects
  end)
 end
end
M.sample=function(position,fx,fy)
 local candidates={}
 local function add(o)
  local dx,dy=o.x-position.x,o.y-position.y;local distance=dx*dx+dy*dy
  local range=o.kind=='building' and 125 or 80
  if distance<range^2 and math.abs(o.z-position.z)<20 then candidates[#candidates+1]={o=o,d=distance} end
 end
 for _,o in pairs(objects) do add(o) end;for _,o in ipairs(forestObjects) do add(o) end
 table.sort(candidates,function(a,b)return a.d<b.d end)
 local out,counts,seen={},{},{}
 local limits={building=24,tree=32,pole=16,hydrant=8}
 for _,entry in ipairs(candidates) do local o=entry.o;local key=o.kind..':'..math.floor(o.x*2)..':'..math.floor(o.y*2)
  if not seen[key] and (counts[o.kind] or 0)<limits[o.kind] and #out<80 then
   seen[key]=true;counts[o.kind]=(counts[o.kind] or 0)+1
   local dx,dy=o.x-position.x,o.y-position.y
   out[#out+1]={kind=o.kind,x=dx*fy-dy*fx,y=dx*fx+dy*fy,z=o.z-position.z,width=o.width,length=o.length,height=o.height,heading=o.heading-math.deg(math.atan2(fx,fy))}
  end
 end
 return out
end
return M

local M={}
local names,index,objects,mission={},1,{},nil
local function measure(object,kind)
 local box,scale,matrix=object:getObjBox(),object:getScale(),object:getTransform();if type(scale)=='number' then scale={x=scale,y=scale,z=scale} end;local mn,mx=box.minExtents,box.maxExtents;local a,b,z,p=matrix:getColumn(0),matrix:getColumn(1),matrix:getColumn(2),matrix:getColumn(3)
   local width,length=math.abs((mx.x-mn.x)*scale.x),math.abs((mx.y-mn.y)*scale.y);local height=math.abs((mx.z-mn.z)*scale.z)
   if math.min(width,length)>8 or math.max(width,length)>120 or height>5 then return end
   local cx,cy,cz=(mn.x+mx.x)*scale.x*.5,(mn.y+mx.y)*scale.y*.5,mn.z*scale.z
 return {kind=kind,x=p.x+a.x*cx+b.x*cy+z.x*cz,y=p.y+a.y*cx+b.y*cy+z.y*cz,z=p.z+a.z*cx+b.z*cy+z.z*cz,width=math.max(.1,width),length=math.max(.1,length),height=math.max(.12,height),heading=math.deg(math.atan2(b.x,b.y))}
end
local railCache,railTick={},0
local function rail(label)return not(label:find('post',1,true) or label:find('endcap',1,true)) and (label:find('guardrail',1,true) or label:find('guard_rail',1,true) or label:find('crashbarrier',1,true) or label:find('jersey',1,true) or label:find('centerdividerbarrier',1,true) or label:find('barrier_concrete',1,true))end
M.sample=function(position,fx,fy)
 local current=getMissionFilename()
 if current~=mission then mission=current;objects={};railCache={};railTick=0;index=1;names=scenetree.findClassObjects('TSStatic') or {} end
 for n=1,math.min(256,#names) do
  local name=names[index];index=index%#names+1
  pcall(function()
   local object=scenetree.findObject(name);if not object then objects[name]=nil;return end
   local shape=tostring(object.shapeName or ''):lower();local label=tostring(name):lower()..' '..shape
   local kind=(label:find('stop_sign',1,true) or label:find('stopsign',1,true) or label:find('sign_stop',1,true)) and 'stop' or (label:find('guardrail',1,true) or label:find('guard_rail',1,true) or label:find('crashbarrier',1,true) or label:find('jersey',1,true)) and 'guardrail' or (label:find('sidewalk',1,true) or label:find('pavement',1,true) or label:find('curb',1,true)) and 'sidewalk' or nil
   if not kind then return end
   if kind=='stop' then local p=object:getPosition();objects[name]={kind='stop',x=p.x,y=p.y,z=p.z,width=.8,length=.1,height=2.2,heading=0};return end
   objects[name]=measure(object,kind)
  end)
 end
 local out={};railTick=railTick+1;local refresh=railTick%15==1;if refresh then railCache={}end
 -- Instanced map signs live in the forest container rather than the TSStatic list.
 pcall(function()
  local forest=core_forest and core_forest.getForestObject();if not forest then return end
  local bounds=Box3F();bounds.minExtents=Point3F(position.x-90,position.y-90,position.z-6);bounds.maxExtents=Point3F(position.x+90,position.y+90,position.z+12)
  for _,item in ipairs(forest:getData():getItemsBox(bounds) or {}) do
   local data=item:getData();local label=(tostring(data.shapeFile or data.shapeName or '')..' '..tostring(data:getName())):lower()
   if refresh and rail(label) then pcall(function()local o=measure(item,'guardrail');if o and #railCache<192 then railCache[#railCache+1]=o end end)end
   if label:find('sign_stop',1,true) or label:find('stop_sign',1,true) or label:find('stopsign',1,true) then
    local p=item:getPosition();local dx,dy=p.x-position.x,p.y-position.y;out[#out+1]={kind='stop',x=dx*fy-dy*fx,y=dx*fx+dy*fy,width=.8,length=.1,height=2.2,heading=0}
   end
  end
 end)
 local all={};for _,o in pairs(objects)do all[#all+1]=o end;for _,o in ipairs(railCache)do all[#all+1]=o end
 for _,o in ipairs(all) do local dx,dy=o.x-position.x,o.y-position.y;if dx*dx+dy*dy<140^2 and math.abs(o.z-position.z)<6 then out[#out+1]={kind=o.kind,x=dx*fy-dy*fx,y=dx*fx+dy*fy,width=o.width,length=o.length,height=o.height,heading=o.heading-math.deg(math.atan2(fx,fy))} end end
 table.sort(out,function(a,b)return a.x*a.x+a.y*a.y<b.x*b.x+b.y*b.y end);while #out>24 do table.remove(out)end;return out
end
return M

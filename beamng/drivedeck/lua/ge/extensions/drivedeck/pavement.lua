local M={}
local cells,queue,index,origin,mission={}, {},1,nil,nil
local ahead,ai,anchor,lastRange={},1,nil,nil
local geometryRevision=0
local function sidewalk(object)
 if not object then return false end
 local label=(tostring(object.shapeName or '')..' '..tostring(object.name or '')):lower()
 return label:find('sidewalk',1,true) or label:find('pavement',1,true) or label:find('curb',1,true)
end
M.step=function(position,direction,renderDistance)
 local range=math.max(30,math.min(120,tonumber(renderDistance) or 120))
 if not Engine or not Engine.castRay then return end
 local surfaces=require('ge/extensions/drivedeck/mixed_surface');surfaces.step()
 local revision=surfaces.revision and surfaces.revision()or 0;if revision~=geometryRevision then geometryRevision=revision;for key,c in pairs(cells)do if not c.surface then cells[key]=nil end end;origin=nil;anchor=nil end
 local current=getMissionFilename();if current~=mission then cells={};origin=nil;mission=current;ahead={};ai=1;anchor=nil end
 if not origin or index>#queue or (origin.x-position.x)^2+(origin.y-position.y)^2>9 then
  origin={x=position.x,y=position.y};queue={};index=1
  local cx,cy=math.floor(position.x),math.floor(position.y)
  for x=cx-14,cx+14 do for y=cy-14,cy+14 do local key=x..':'..y
   if not cells[key] then queue[#queue+1]={x=x,y=y,key=key,d=(x-position.x)^2+(y-position.y)^2} end
  end end
  table.sort(queue,function(a,b)return a.d<b.d end)
  for key,c in pairs(cells) do if (c.x-position.x)^2+(c.y-position.y)^2>(range+20)^2 then cells[key]=nil end end
 end
 local directional=direction and math.sqrt(direction.x^2+direction.y^2)>.1
 if directional and (not anchor or ai>#ahead or (anchor.x-position.x)^2+(anchor.y-position.y)^2>100 or lastRange~=range) then
  local length=math.sqrt(direction.x^2+direction.y^2);local fx,fy=direction.x/length,direction.y/length
  anchor={x=position.x,y=position.y};lastRange=range;ahead={};ai=1
  for distance=18,range,3 do for side=-18,18,2 do
   local x,y=math.floor(position.x+fx*distance+fy*side),math.floor(position.y+fy*distance-fx*side);local key=x..':'..y
   if not cells[key] then ahead[#ahead+1]={x=x,y=y,key=key,d=distance}end
  end end
 end
 for n=1,4 do local far=directional and n>2;local c=far and ahead[ai] or queue[index];if not c then c=queue[index];far=false end;if not c then break end;if far then ai=ai+1 else index=index+1 end
  pcall(function()
   local height=surfaces.heightAt and surfaces.heightAt({x=c.x+.5,y=c.y+.5,z=position.z})
   if height then c.z=height;c.surface=true;cells[c.key]=c;return end
   local ground=position.z
   if core_terrain and core_terrain.getTerrainHeight then local ok,z=pcall(core_terrain.getTerrainHeight,vec3(c.x+.5,c.y+.5,position.z));if ok and type(z)=='number' then ground=z end end
   -- Stay below storefront awnings; high rays mistake their roofs for pavement.
   local hit=Engine.castRay(vec3(c.x+.5,c.y+.5,ground+.8),vec3(c.x+.5,c.y+.5,ground-3),false,true)
   local raw=hit and (hit.object or hit.obj);local object=raw and (scenetree and scenetree.findObjectById and scenetree.findObjectById(raw:getID()) or raw)
   local marked=nil;local shape=object and tostring(object.shapeName or '') or ''
   local mixed=hit and hit.pt and shape:lower():find('east_coast_usa',1,true) and shape:lower():find('townbase',1,true)
   if mixed then marked=require('ge/extensions/drivedeck/mixed_surface').contains(shape,object,hit.pt)end
   if mixed and marked==nil then queue[#queue+1]=c;return end
   local surface=marked;if not mixed then surface=sidewalk(object)end
   c.z=hit and hit.pt and hit.pt.z or position.z;c.surface=hit and surface and (not hit.norm or hit.norm.z>.7) or false;cells[c.key]=c
  end)
 end
end
M.sample=function(position,fx,fy)
 local rows={};for _,c in pairs(cells) do if c.surface and math.abs(c.z-position.z)<35 then rows[c.y]=rows[c.y] or {};rows[c.y][#rows[c.y]+1]=c end end
 local out={}
 for _,row in pairs(rows) do
  table.sort(row,function(a,b)return a.x<b.x end);local i=1
  while i<=#row do local first,last=row[i],row[i];i=i+1
   while i<=#row and row[i].x==last.x+1 do last=row[i];i=i+1 end
   local dx,dy=(first.x+last.x+1)*.5-position.x,first.y+.5-position.y
   out[#out+1]={kind='sidewalk',x=dx*fy-dy*fx,y=dx*fx+dy*fy,width=last.x-first.x+1,length=1,height=.15,heading=-math.deg(math.atan2(fx,fy))}
  end
 end
 table.sort(out,function(a,b)return a.x*a.x+a.y*a.y<b.x*b.x+b.y*b.y end);if #out>256 then local selected={};for i=1,256 do selected[i]=out[math.floor((i-1)*(#out-1)/255)+1]end;out=selected end;return out
end
return M

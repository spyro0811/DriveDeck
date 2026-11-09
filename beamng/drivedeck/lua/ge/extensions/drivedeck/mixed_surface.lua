-- Read paved footway triangles from combined Collada town meshes.
-- No game assets are changed or bundled with DriveDeck.
local M={};local cache={};local jobs={}
local instances,mission,revision={},nil,0
local names,index={},1
local function attr(s,name)return s:match(name..'="([^"]+)"')end
local function footway(material)
 material=material:lower()
 return material:find('sidewalk',1,true) or material:find('curb',1,true) or material:find('eca_bld_bricks',1,true)
end
local function numbers(s)local out={};for n in s:gmatch('[^%s]+')do out[#out+1]=tonumber(n);if #out%2048==0 then coroutine.yield()end end;return out end
local function loadSurface(shape)
 if cache[shape]~=nil then return cache[shape]end;cache[shape]=false
 local text=readFile(shape);if not text or #text>32000000 then return end
 local combined={}
 for mesh in text:gmatch('<mesh>(.-)</mesh>')do
  if mesh:find('sidewalk',1,true) or mesh:find('curb',1,true) or mesh:find('eca_bld_bricks',1,true) then
   local positions;for tag,body in mesh:gmatch('<source%s+([^>]+)>(.-)</source>')do if (attr(tag,'id') or ''):find('positions',1,true)then positions=numbers(body:match('<float_array[^>]*>(.-)</float_array>') or '');break end end
   if positions then
    local bins={};local count=0
    for tag,body in mesh:gmatch('<triangles%s+([^>]+)>(.-)</triangles>')do
     local material=(attr(tag,'material') or ''):lower()
     if footway(material)then
      local stride,offset=0,0;for input in body:gmatch('<input%s+([^>]+)/>')do local n=tonumber(attr(input,'offset')) or 0;stride=math.max(stride,n+1);if attr(input,'semantic')=='VERTEX'then offset=n end end
      local indices=numbers(body:match('<p>(.-)</p>') or '')
      if stride>0 then for i=1,#indices,stride*3 do
       local t={};for j=0,2 do local index=indices[i+j*stride+offset];if index then local k=index*3+1;t[#t+1]={positions[k],positions[k+1],positions[k+2]}end end
       if #t==3 and t[1][1] and t[2][1] and t[3][1]then
        local a,b,c=t[1],t[2],t[3];local area=(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]);
        if math.abs(area)>.001 then
         local minx,maxx=math.floor(math.min(a[1],b[1],c[1])/8),math.floor(math.max(a[1],b[1],c[1])/8);local miny,maxy=math.floor(math.min(a[2],b[2],c[2])/8),math.floor(math.max(a[2],b[2],c[2])/8)
         if (maxx-minx+1)*(maxy-miny+1)<1000 then for x=minx,maxx do for y=miny,maxy do local key=x..':'..y;bins[key]=bins[key] or {};bins[key][#bins[key]+1]=t end end;count=count+1 end
        end
       end
      end end
     end
    end
    if count>0 then for key,list in pairs(bins)do combined[key]=combined[key]or{};for _,t in ipairs(list)do combined[key][#combined[key]+1]=t end end end
   end
  end
 end
 if next(combined)then cache[shape]=combined;revision=revision+1;return combined end
end
M.revision=function()return revision end
M.step=function()
 local id=getMissionFilename and getMissionFilename() or '';if id~=mission then mission=id;instances={};index=1;names=scenetree and scenetree.findClassObjects and scenetree.findClassObjects('TSStatic')or{}end
 for i=index,math.min(index+63,#names)do pcall(function()local o=scenetree.findObject(names[i]);local shape=tostring(o.shapeName or'');if shape:lower():find('east_coast_usa',1,true)and shape:lower():find('townbase',1,true)then local key=o.getID and o:getID()or tostring(o);instances[key]={shape=shape,object=o};if cache[shape]==nil and not jobs[shape]then jobs[shape]=coroutine.create(function()loadSurface(shape)end)end end end)end;index=math.min(index+64,#names+1)
 for shape,job in pairs(jobs)do local ok=coroutine.resume(job);if not ok or coroutine.status(job)=='dead' then jobs[shape]=nil;if not ok then cache[shape]=false end end;break end
end
M.contains=function(shape,object,point)
 local key=object.getID and object:getID()or tostring(object);instances[key]={shape=shape,object=object}
 if cache[shape]==nil and not jobs[shape]then jobs[shape]=coroutine.create(function()loadSurface(shape)end)end
 if cache[shape]==false and not jobs[shape]then return false end
 local bins=cache[shape];if not bins then return nil end
 local transform,scale=object:getTransform(),object:getScale();if type(scale)=='number'then scale={x=scale,y=scale,z=scale}end;local a,b,z,p=transform:getColumn(0),transform:getColumn(1),transform:getColumn(2),transform:getColumn(3)
 local dx,dy,dz=point.x-p.x,point.y-p.y,point.z-p.z;local x=(dx*a.x+dy*a.y+dz*a.z)/scale.x;local y=(dx*b.x+dy*b.y+dz*b.z)/scale.y;local zz=(dx*z.x+dy*z.y+dz*z.z)/scale.z
 for _,t in ipairs(bins[math.floor(x/8)..':'..math.floor(y/8)] or {})do
  local a,b,c=t[1],t[2],t[3];local den=(b[2]-c[2])*(a[1]-c[1])+(c[1]-b[1])*(a[2]-c[2]);local u=((b[2]-c[2])*(x-c[1])+(c[1]-b[1])*(y-c[2]))/den;local v=((c[2]-a[2])*(x-c[1])+(a[1]-c[1])*(y-c[2]))/den
  if u>=-.001 and v>=-.001 and u+v<=1.001 and math.abs(zz-(u*a[3]+v*b[3]+(1-u-v)*c[3]))<.5 then return true end
 end
 return false
end
-- Query the labelled pavement triangles directly. Terrain height can be below
-- a town's raised ground mesh, so a terrain-relative ray may never hit it.
M.heightAt=function(point)
 local result=nil
 for _,entry in pairs(instances)do pcall(function()
  local bins=cache[entry.shape];if not bins then return end
  local o=entry.object;local tm,scale=o:getTransform(),o:getScale();if type(scale)=='number'then scale={x=scale,y=scale,z=scale}end
  local ax,ay,az,p=tm:getColumn(0),tm:getColumn(1),tm:getColumn(2),tm:getColumn(3)
  if math.abs(az.z)<.99 then return end
  local dx,dy=point.x-p.x,point.y-p.y;local x=(dx*ax.x+dy*ax.y)/scale.x;local y=(dx*ay.x+dy*ay.y)/scale.y
  for _,t in ipairs(bins[math.floor(x/8)..':'..math.floor(y/8)]or{})do
   local a,b,c=t[1],t[2],t[3];local den=(b[2]-c[2])*(a[1]-c[1])+(c[1]-b[1])*(a[2]-c[2]);local nx=(b[2]-a[2])*(c[3]-a[3])-(b[3]-a[3])*(c[2]-a[2]);local ny=(b[3]-a[3])*(c[1]-a[1])-(b[1]-a[1])*(c[3]-a[3])
   if math.abs(den)>.001 and math.abs(den)/math.sqrt(den*den+nx*nx+ny*ny)>.7 then
    local u=((b[2]-c[2])*(x-c[1])+(c[1]-b[1])*(y-c[2]))/den;local v=((c[2]-a[2])*(x-c[1])+(a[1]-c[1])*(y-c[2]))/den
    if u>=-.001 and v>=-.001 and u+v<=1.001 then local z=u*a[3]+v*b[3]+(1-u-v)*c[3];local world=p.z+ax.z*x*scale.x+ay.z*y*scale.y+az.z*z*scale.z;if math.abs(world-point.z)<35 and(not result or math.abs(world-point.z)<math.abs(result-point.z))then result=world end end
   end
  end
 end)end
 return result
end
return M

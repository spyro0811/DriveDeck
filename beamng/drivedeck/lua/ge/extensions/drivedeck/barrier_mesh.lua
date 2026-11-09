-- Read only local barrier geometry. Keep complete top surfaces, rather than
-- throwing away individual triangles when a curved mesh is densely tessellated.
local M={}
local mission,names,index,instances=nil,{},1,{}
local cache,jobs,forestInstances,tick={},{},{},0
local function attr(s,k)return s:match(k..'="([^"]+)"')end
local function nums(s)local out={};for v in s:gmatch('[^%s]+')do out[#out+1]=tonumber(v);if #out%2048==0 then coroutine.yield()end end;return out end
local function barrierName(shape)
 local s=shape:lower();return s:find('guardrail',1,true)or s:find('barrier',1,true)or s:find('jersey',1,true)or s:find('parapet',1,true)or s:find('concrete_divider',1,true)
end
local function load(shape)
 local text=readFile(shape);local out={};if not text or #text>16000000 then return out end
 local matrices={};for node in text:gmatch('<node%s+[^>]*>(.-)</node>')do local geometry=node:match('<instance_geometry[^>]*url="#([^"]+)"');local matrix=node:match('<matrix[^>]*>(.-)</matrix>');if geometry and matrix then local m=nums(matrix);if #m==16 then matrices[geometry]=m end end end
 for tag,body in text:gmatch('<geometry%s+([^>]+)>(.-)</geometry>')do
  local mesh=body:match('<mesh>(.-)</mesh>')
  if mesh then
   local positions;for st,sb in mesh:gmatch('<source%s+([^>]+)>(.-)</source>')do if (attr(st,'id')or''):find('positions',1,true)then positions=nums(sb:match('<float_array[^>]*>(.-)</float_array>')or'');break end end
   if positions then for _,typ in ipairs({'polylist','triangles'})do for pt,pb in mesh:gmatch('<'..typ..'%s+([^>]+)>(.-)</'..typ..'>')do
    local material=(attr(pt,'material')or''):lower()
    if material:find('guardrail',1,true)or material:find('barrier',1,true)or material:find('concrete',1,true)or material:find('jersey',1,true)then
     local stride,offset=0,0;for input in pb:gmatch('<input%s+([^>]+)/>')do local n=tonumber(attr(input,'offset'))or 0;stride=math.max(stride,n+1);if attr(input,'semantic')=='VERTEX'then offset=n end end
     local ids=nums(pb:match('<p>(.-)</p>')or'');local counts={};if typ=='triangles'then for i=1,tonumber(attr(pt,'count'))or 0 do counts[i]=3 end else counts=nums(pb:match('<vcount>(.-)</vcount>')or'')end
     local cursor=1;local matrix=matrices[attr(tag,'id')]
     local function vertex(i)local k=ids[cursor+(i-1)*stride+offset]*3+1;local x,y,z=positions[k],positions[k+1],positions[k+2];if matrix then return{x*matrix[1]+y*matrix[2]+z*matrix[3]+matrix[4],x*matrix[5]+y*matrix[6]+z*matrix[7]+matrix[8],x*matrix[9]+y*matrix[10]+z*matrix[11]+matrix[12]}end;return{x,y,z}end
     for n,count in ipairs(counts)do
      if count>=3 then for j=2,count-1 do local a,b,c=vertex(1),vertex(j),vertex(j+1);local ux,uy,uz=b[1]-a[1],b[2]-a[2],b[3]-a[3];local vx,vy,vz=c[1]-a[1],c[2]-a[2],c[3]-a[3];local nx,ny,nz=uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx;local len=math.sqrt(nx*nx+ny*ny+nz*nz)
       local longest=math.max(math.sqrt(ux*ux+uy*uy),math.sqrt(vx*vx+vy*vy),math.sqrt((b[1]-c[1])^2+(b[2]-c[2])^2));if len>.001 and nz/len>.65 and nz/math.max(.001,longest)<2 then out[#out+1]={a,b,c}end
      end end
      cursor=cursor+count*stride;if n%256==0 then coroutine.yield()end
     end
    end
   end end end
  end
 end
 return out
end
local function queue(shape)if not cache[shape]and not jobs[shape]then jobs[shape]=coroutine.create(function()cache[shape]=load(shape)end)end end
local function clip(poly,axis,bound,greater)
 local out={};for i,a in ipairs(poly)do local b=poly[i%#poly+1];local da=(a[axis]-bound)*(greater and 1 or -1);local db=(b[axis]-bound)*(greater and 1 or -1);if da>=0 then out[#out+1]=a end;if (da>=0)~=(db>=0)then local t=da/(da-db);out[#out+1]={a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t}end end;return out
end
M.sample=function(position,fx,fy,range,build)
 range=math.max(30,math.min(120,range or 120))
 local id=getMissionFilename();if id~=mission then mission=id;names=scenetree.findClassObjects('TSStatic')or{};index=1;instances={};forestInstances={};tick=0;jobs={} end
 for n=1,math.min(96,#names)do local name=names[index];index=index%#names+1;pcall(function()local o=scenetree.findObject(name);local shape=tostring(o.shapeName or'');if barrierName(shape)then instances[name]={object=o,shape=shape};queue(shape)end end)end
 tick=tick+1;if tick%15==1 then pcall(function()
  local forest=core_forest and core_forest.getForestObject();if not forest then return end;local b=Box3F();b.minExtents=Point3F(position.x-140,position.y-140,position.z-30);b.maxExtents=Point3F(position.x+140,position.y+140,position.z+30);local nextItems={}
  for _,o in ipairs(forest:getData():getItemsBox(b)or{})do local shape=tostring(o:getData().shapeFile or'');if barrierName(shape)then nextItems[#nextItems+1]={object=o,shape=shape};queue(shape)end end;forestInstances=nextItems
 end)end
 for shape,job in pairs(jobs)do local ok=coroutine.resume(job);if not ok or coroutine.status(job)=='dead'then jobs[shape]=nil;if not ok then cache[shape]={}end end;break end
 if build==false then return{},false end
 local out,seen={},{};local all={};local keys={};for name in pairs(instances)do keys[#keys+1]=name end;table.sort(keys);for _,name in ipairs(keys)do all[#all+1]=instances[name]end;for _,entry in ipairs(forestInstances)do all[#all+1]=entry end
 local overflow=false
 for _,entry in ipairs(all)do pcall(function()
  local o=entry.object;local tm,scale=o:getTransform(),o:getScale();if type(scale)=='number'then scale={x=scale,y=scale,z=scale}end;local a,b,z,p=tm:getColumn(0),tm:getColumn(1),tm:getColumn(2),tm:getColumn(3);local group={}
  for _,t in ipairs(cache[entry.shape]or{})do
   local tri,nearHeight={},false
   for _,v in ipairs(t)do local wx=p.x+a.x*v[1]*scale.x+b.x*v[2]*scale.y+z.x*v[3]*scale.z;local wy=p.y+a.y*v[1]*scale.x+b.y*v[2]*scale.y+z.y*v[3]*scale.z;local wz=p.z+a.z*v[1]*scale.x+b.z*v[2]*scale.y+z.z*v[3]*scale.z;local dx,dy=wx-position.x,wy-position.y;tri[#tri+1]={dx*fy-dy*fx,dx*fx+dy*fy};if math.abs(wz-position.z)<25 then nearHeight=true end end
   if nearHeight then
    local poly=clip(tri,1,-60,true);if #poly>=3 then poly=clip(poly,1,60,false)end;if #poly>=3 then poly=clip(poly,2,-12,true)end;if #poly>=3 then poly=clip(poly,2,range+5,false)end
    if #poly>=3 then for i=2,#poly-1 do local t={poly[1],poly[i],poly[i+1]};local area=math.abs((t[2][1]-t[1][1])*(t[3][2]-t[1][2])-(t[2][2]-t[1][2])*(t[3][1]-t[1][1]));if area>.00001 then
     local keys={};for _,v in ipairs(t)do v[1]=math.floor(v[1]*100+.5)/100;v[2]=math.floor(v[2]*100+.5)/100;keys[#keys+1]=v[1]..','..v[2]end;table.sort(keys);local key=table.concat(keys,':');if not seen[key]then seen[key]=true;group[#group+1]=t end
    end end end
   end
  end
  -- Keep a whole object's visible geometry or retain the previous complete batch.
  -- Never punch random holes in the wall to satisfy a packet limit.
  if #out+#group<=8192 then for _,t in ipairs(group)do out[#out+1]=t end else overflow=true end
 end)end
 return out,next(jobs)==nil and not overflow
end
return M

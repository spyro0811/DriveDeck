-- Read-only paved road edges plus collision-confirmed barriers embedded in
-- bridges/tunnels. These cannot be found by a standalone guardrail name scan.
local M={};local mission,names,index,edges,hits,probe=nil,{},1,{},{},1
local function reset()local id=getMissionFilename();if id~=mission then mission=id;names=scenetree.findClassObjects('DecalRoad')or{};index=1;edges={};hits={};probe=1 end end
local function relative(p,position,fx,fy)local dx,dy=p.x-position.x,p.y-position.y;return dx*fy-dy*fx,dx*fx+dy*fy end
M.sample=function(position,fx,fy,lanes)
 reset()
 for n=1,math.min(128,#names)do local name=names[index];index=index%#names+1;pcall(function()
  local o=scenetree.findObject(name);local material=tostring(o.material or ''):lower()
  if not(material=='road_edge' or material:find('road_asphalt',1,true) or material=='road1_concrete' or material=='decalroad_concrete')then return end
  local out={};for i=1,math.min(256,o:getNodeCount()-1)do local a,b=o:getNodePosition(i-1),o:getNodePosition(i);local dx,dy=b.x-a.x,b.y-a.y;local length=math.sqrt(dx*dx+dy*dy)
   if length>.2 then local width=(o:getNodeWidth(i-1)+o:getNodeWidth(i))*.5;out[#out+1]={a={x=a.x,y=a.y,z=a.z},b={x=b.x,y=b.y,z=b.z},width=width,edge=material=='road_edge'}end
  end;edges[name]=out
 end)end
 local points=lanes and lanes.points
 if Engine and Engine.castRay and points and #points>1 then pcall(function()
  probe=probe% (#points-1)+1;local a,b=points[probe],points[probe+1];local dx,dy=b.x-a.x,b.y-a.y;local len=math.sqrt(dx*dx+dy*dy);if len<.1 or a.y< -4 or a.y>120 then return end
  local tx,ty=dx/len,dy/len;local half=(a.roadWidth or a.width)*.5;local wx,wy=position.x+fy*a.x+fx*a.y,position.y-fx*a.x+fy*a.y;local ground=position.z
  pcall(function()local v=vec3(wx,wy,ground);local i,j=map.findBestRoad(v,vec3(fx,fy,0));local nodes=map.getMap().nodes;local pa,pb=nodes[i].pos,nodes[j].pos;local ex,ey=pb.x-pa.x,pb.y-pa.y;local t=math.max(0,math.min(1,((wx-pa.x)*ex+(wy-pa.y)*ey)/(ex*ex+ey*ey)));ground=pa.z+(pb.z-pa.z)*t end)
  local surface=Engine.castRay(vec3(wx,wy,ground+1.5),vec3(wx,wy,ground-3),false,true);if surface and surface.pt then ground=surface.pt.z end
  for _,side in ipairs({-1,1})do local nx,ny=ty*side,-tx*side;local function world(offset)return vec3(wx+(fy*nx+fx*ny)*offset,wy+(-fx*nx+fy*ny)*offset,ground+.6)end
   local hit=Engine.castRay(world(math.max(1.5,half-1)),world(half+10),false,true);local raw=hit and(hit.obj or hit.object);local o=raw and scenetree.findObjectById(raw:getID());local label=o and tostring(o.shapeName or ''):lower()or''
   if hit and hit.pt and hit.norm and math.abs(hit.norm.z)<.5 and(label:find('rail',1,true)or label:find('barrier',1,true)or label:find('divider',1,true)or label:find('bridge',1,true)or label:find('tunnel',1,true)or label:find('/roads/',1,true))then
    local p=hit.pt;local key=side..':'..math.floor(wx/3)..':'..math.floor(wy/3);hits[key]={x=p.x,y=p.y,z=ground,side=side,solid=not label:find('guardrail',1,true)}
   end
  end
 end)end
 local out={};for _,list in pairs(edges)do for _,e in ipairs(list)do
  local dx,dy=e.b.x-e.a.x,e.b.y-e.a.y;local l=math.sqrt(dx*dx+dy*dy);local t=math.max(0,math.min(1,((position.x-e.a.x)*dx+(position.y-e.a.y)*dy)/(l*l)));local dist=(e.a.x+dx*t-position.x)^2+(e.a.y+dy*t-position.y)^2
  if dist<130^2 and math.abs(e.a.z+(e.b.z-e.a.z)*t-position.z)<18 then
   -- Split long edge spans so projection can clip them at the camera.
   local count=math.ceil(l/8);for n=0,count-1 do local u=(n+.5)/count;local p={x=e.a.x+dx*u,y=e.a.y+dy*u};local x,y=relative(p,position,fx,fy)
    if y> -12 and y<140 and math.abs(x)<70 then out[#out+1]={kind='shoulder',x=x,y=y,width=e.edge and .12 or math.max(.3,math.min(60,e.width)),length=l/count,height=.12,heading=math.deg(math.atan2(dx,dy)-math.atan2(fx,fy)),edge=e.edge}end
   end
  end
 end end
 local sides={[-1]={},[1]={}};for key,p in pairs(hits)do local x,y=relative(p,position,fx,fy);if x*x+y*y>150^2 then hits[key]=nil elseif y> -10 then sides[p.side][#sides[p.side]+1]={x=x,y=y,z=p.z,solid=p.solid}end end
 for _,list in pairs(sides)do table.sort(list,function(a,b)return a.y<b.y end);for i=2,#list do local a,b=list[i-1],list[i];local dx,dy=b.x-a.x,b.y-a.y;local l=math.sqrt(dx*dx+dy*dy);if l>1 and l<12 then out[#out+1]={kind='guardrail',x=(a.x+b.x)/2,y=(a.y+b.y)/2,width=.3,length=l,height=1,heading=math.deg(math.atan2(dx,dy)),solid=a.solid and b.solid}end end end
 table.sort(out,function(a,b)return a.x*a.x+a.y*a.y<b.x*b.x+b.y*b.y end);while #out>96 do table.remove(out)end;return out
end
return M

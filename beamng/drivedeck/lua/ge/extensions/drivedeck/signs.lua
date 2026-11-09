local M={};local mission,names,index,objects,tick,forestCache=nil,{},1,{},0,{}
local function kind(shape)
 local s=tostring(shape):lower():match('([^/]+)$')or'';s=(s:match('^([^%s]+)')or s):gsub('%.dae$','')
 if s:find('chevron_left',1,true)then return'chevron-left'end;if s:find('chevron_right',1,true)then return'chevron-right'end
 local speed=s:match('(%d+)_speed_limit')or s:match('speed_limit_(%d+)');if speed then return'speed',tonumber(speed)end
 if not(s:find('sign',1,true)or s:find('ut_',1,true)or s:find('stop',1,true))then return end
 local labels={{'stop_ahead','warning','STOP AHEAD'},{'yield_ahead','warning','YIELD AHEAD'},{'stop','stop','STOP'},{'yield','yield','YIELD'},{'do_not_enter','no-entry','NO ENTRY'},{'road_closed','no-entry','CLOSED'},{'left_turn','turn-left'},{'right_turn','turn-right'},{'curve_left','turn-left'},{'curve_right','turn-right'},{'winding_road_left','winding-left'},{'winding_road_right','winding-right'},{'merge_left','merge-left'},{'merge_right','merge-right'},{'crossroads','warning','+'},{'side_road','warning','JUNCTION'},{'t_intersection','warning','T'},{'road_narrows','warning','NARROWS'},{'narrow_bridge','warning','BRIDGE'},{'falling_rocks','warning','ROCKS'},{'watch_for_rocks','warning','ROCKS'},{'slippery','warning','SLIPPERY'},{'dip','warning','DIP'},{'dead_end','warning','DEAD END'},{'divided_highway','warning','DIVIDED'},{'double_arrow','warning','↔'},{'unimproved','warning','UNPAVED'},{'gravel','warning','GRAVEL'},{'danger_mine','warning','DANGER'},{'parking','information','P'},{'gas_station','information','FUEL'},{'camping','information','CAMP'},{'airport','information','AIRPORT'}}
 for _,entry in ipairs(labels)do if s:find(entry[1],1,true)and(entry[1]~='stop'or s=='ut_stop'or s:find('sign_stop',1,true)or s:find('stop_sign',1,true)or s:find('stopsign',1,true))then return entry[2],nil,entry[3]end end
end
local function capture(o,shape)
 local k,speed,label=kind(shape);if not k then return end;local p=o:getPosition();return{x=p.x,y=p.y,z=p.z,kind=k,speed=speed,label=label,height=2.2}
end
M.classify=kind
M.sample=function(position,fx,fy)
 local id=getMissionFilename();if id~=mission then mission=id;names=scenetree.findClassObjects('TSStatic')or{};index=1;objects={};forestCache={};tick=0 end
 for n=1,math.min(128,#names)do local name=names[index];index=index%#names+1;pcall(function()local o=scenetree.findObject(name);if o then objects[name]=capture(o,tostring(o.shapeName or''))end end)end
 tick=tick+1;if tick%15==1 then pcall(function()local forest=core_forest and core_forest.getForestObject();if not forest then return end;local b=Box3F();b.minExtents=Point3F(position.x-125,position.y-125,position.z-25);b.maxExtents=Point3F(position.x+125,position.y+125,position.z+25);local list={};for _,o in ipairs(forest:getData():getItemsBox(b)or{})do local data=o:getData();local value=capture(o,tostring(data.shapeFile or'')..' '..tostring(data:getName()));if value then list[#list+1]=value end end;forestCache=list end)end
 local out={};local function add(o)local dx,dy=o.x-position.x,o.y-position.y;local x,y=dx*fy-dy*fx,dx*fx+dy*fy;if y> -4 and y<125 and math.abs(x)<65 and math.abs(o.z-position.z)<25 then for _,p in ipairs(out)do if p.kind==o.kind and(p.x-x)^2+(p.y-y)^2<1 then return end end;out[#out+1]={kind=o.kind,x=x,y=y,height=o.height,label=o.label,speed=o.speed}end end
 for _,o in pairs(objects)do add(o)end;for _,o in ipairs(forestCache)do add(o)end;table.sort(out,function(a,b)return a.x*a.x+a.y*a.y<b.x*b.x+b.y*b.y end);while#out>40 do table.remove(out)end;return out
end
return M

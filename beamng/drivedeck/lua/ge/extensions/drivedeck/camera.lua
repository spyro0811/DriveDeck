local M={}
local clock,configTimer,fps,expiresAt=0,1,0,0
local view,untilTime,side,timer,warm= nil,0,nil,0,0
M.signal=function(id,value) local player=be:getPlayerVehicle(0);if player and player:getID()==id and (value=='left' or value=='right') then side=value;untilTime=clock+1.6 end end
M.onUpdate=function(dt)
 clock=clock+(dt or 0);configTimer=configTimer+(dt or 0)
 if configTimer>=.2 then
  configTimer=0;fps=0;expiresAt=0
  local ok,c=pcall(jsonReadFile,'/drivedeck-camera-config.json');local now=os.time()
  if ok and type(c)=='table' and c.cameraEnabled==true and (c.deck=='model-s' or c.deck=='model-three') and (c.sceneMode=='full' or c.sceneMode=='absolute') and type(c.expiresAt)=='number' and c.expiresAt>now and c.expiresAt<=now+4 and type(c.fps)=='number' then fps=math.max(0,math.min(30,c.fps));expiresAt=c.expiresAt end
 end
 if os.time()>=expiresAt then fps=0 end
 local player=be:getPlayerVehicle(0)
 if fps==0 or not player or not side or clock>untilTime then if view then pcall(function()RenderViewManagerInstance:destroyView(view)end);view=nil end;return end
 local ok,err=pcall(function()
 if not view then view=RenderViewManagerInstance:getOrCreateView('DriveDeckSideCamera');view.luaOwned=true;view.renderCubemap=false;view.resolution=Point2I(320,180);view.viewPort=RectI(0,0,320,180);view.namedTexTargetColor='DriveDeckSideCamera';view.frustum=Frustum.construct(false,math.rad(85),320/180,.1,120);view.fov=85;view.renderEditorIcons=false;view.usePostEffects=true;warm=0 end
 -- Copy exposure after view creation; tone mapping must remain enabled.
 local main=RenderViewManagerInstance:getView('main')
 local exposure=scenetree.findObject('PostEffectLocalExposureObject')
 view.useManualEV=exposure and exposure.autoExposure==false or false
 if view.useManualEV then view.manualEV=exposure.manualEV or 0
 elseif main and main.currentExposure and main.currentExposure>0 then view.currentExposure=main.currentExposure end
 local forward=player:getDirectionVector();local up=vec3(0,0,1);local right=forward:cross(up);right:normalize();local sign=side=='left' and -1 or 1
 local position=player:getPosition()+right*(sign*1.15)+up*1.2+forward*.7
 local rotation=quatFromDir(-forward+right*(sign*.4),up);local matrix=QuatF(rotation.x,rotation.y,rotation.z,rotation.w):getMatrix();matrix:setPosition(position);view.cameraMatrix=matrix
 timer=timer+(dt or 0);warm=warm+1
 if timer>=1/fps and warm>2 then timer=0;if view:saveToDisk('/drivedeck-side-camera.png') then writeFile('/drivedeck-side-camera.json',jsonEncode({side=side})) end end
 end)
 if not ok then log('W','DriveDeckCamera',tostring(err));side=nil;if view then pcall(function()RenderViewManagerInstance:destroyView(view)end);view=nil end end
end
M.onExtensionUnloaded=function()if view then pcall(function()RenderViewManagerInstance:destroyView(view)end)end end
return M



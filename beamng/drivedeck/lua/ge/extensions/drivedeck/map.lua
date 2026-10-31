-- DriveDeck road-map bridge. Original code, MIT license.
-- Uses the same map.getMap().nodes and ground-marker route as BeamNG's minimap.
-- Read-only: no vehicle control, teleporting, or navigation changes.
local M = {}
local udp = nil
local PORT = 4444 -- Match drivedeck_cluster_v2.lua and the desktop app.
local poseTimer, routeTimer, roadTimer = 0, 0, 10
local lastGraph, lastMapId, roads, queue = nil, nil, {}, {}
local queueIndex, batch = 1, 0
local roadCenter = nil
local maxRoads = 32000
local roadRadius = 6000
local buildingNames, buildingIndex, buildingCenter = nil, 1, nil
local buildingCandidates, buildingQueue, buildingQueueIndex = {}, {}, 1
local buildingBatch, buildingTimer = 0, 0

local function isBuilding(shape)
  local name = (shape or ''):lower():match('([^/]+)$') or ''
  for _, token in ipairs({'wall', 'roof', 'door', 'window', 'fence', 'stair', 'sign', 'bridge', 'chimney', 'tank', 'cityblock', 'city_block', 'buildingblock', 'building_block', 'ground', 'terrain'}) do
    if name:find(token, 1, true) then return false end
  end
  for _, token in ipairs({'bld', 'building', 'house', 'warehouse', 'garage', 'office', 'apartment', 'residential', 'shop', 'mall', 'factory', 'hangar', 'barn', 'hotel'}) do
    if name:find(token, 1, true) then return true end
  end
  return false
end

local function buildingOutline(obj)
  local box, scale, matrix = obj:getObjBox(), obj:getScale(), obj:getTransform()
  local mn, mx = box.minExtents, box.maxExtents
  if math.abs((mx.z - mn.z) * scale.z) < 2.5 then return end
  local a, b, z, pos = matrix:getColumn(0), matrix:getColumn(1), matrix:getColumn(2), matrix:getColumn(3)
  local points = {}
  for _, p in ipairs({{mn.x, mn.y}, {mx.x, mn.y}, {mx.x, mx.y}, {mn.x, mx.y}}) do
    local x = pos.x + a.x * p[1] * scale.x + b.x * p[2] * scale.y + z.x * mn.z * scale.z
    local y = pos.y + a.y * p[1] * scale.x + b.y * p[2] * scale.y + z.y * mn.z * scale.z
    if x ~= x or y ~= y or math.abs(x) > 1e7 or math.abs(y) > 1e7 then return end
    points[#points + 1] = x; points[#points + 1] = y
  end
  local dx, dy = points[3] - points[1], points[4] - points[2]
  local ex, ey = points[7] - points[1], points[8] - points[2]
  local area = math.abs(dx * ey - dy * ex)
  if area < 12 or area > 18000 or dx * dx + dy * dy > 48400 or ex * ex + ey * ey > 48400 then return end
  local height=math.abs((mx.z-mn.z)*scale.z)
  pcall(function() local world=obj:getWorldBox();height=math.abs(world.maxExtents.z-world.minExtents.z) end)
  if height<2.5 or height>300 then return end
  points[9]=height
  return points, pos
end

local function beginBuildings(position)
  buildingCenter = {x = position.x, y = position.y}
  buildingCandidates = {}; buildingIndex = 1
  local ok, names = pcall(function() return scenetree and scenetree.findClassObjects('TSStatic') end)
  buildingNames = ok and names or {}
end

local function stepBuildings(mapId, levelName)
  if not buildingNames then return end
  -- Bounded work per frame; never scan thousands of meshes in one game tick.
  for i = 1, 80 do
    local name = buildingNames[buildingIndex]
    if not name then break end
    buildingIndex = buildingIndex + 1
    pcall(function()
      local obj = scenetree.findObject(name)
      if not obj or not isBuilding(obj:getField('shapeName', 0)) or obj:getField('hidden', 0) == '1' then return end
      local position = obj:getPosition()
      local dx, dy = position.x - buildingCenter.x, position.y - buildingCenter.y
      if dx * dx + dy * dy > 3500 * 3500 then return end
      local points = buildingOutline(obj)
      if points then buildingCandidates[#buildingCandidates + 1] = {distance = dx * dx + dy * dy, points = points} end
    end)
  end
  if buildingIndex <= #buildingNames then return end
  buildingNames = nil
  table.sort(buildingCandidates, function(a,b) return a.distance < b.distance end)
  local count = math.min(3000, #buildingCandidates)
  buildingBatch = buildingBatch + 1; buildingQueue = {}; buildingQueueIndex = 1; buildingTimer = 0
  local total = math.max(1, math.ceil(count / 64))
  for part = 0, total - 1 do
    local chunk = {}
    for i = part * 64 + 1, math.min(count, (part + 1) * 64) do chunk[#chunk + 1] = buildingCandidates[i].points end
    buildingQueue[#buildingQueue + 1] = {kind = 'buildings', mapId = mapId, levelName = levelName, batch = buildingBatch, part = part, total = total, buildings = chunk}
  end
  buildingCandidates = {}
end

-- Actual terrain layer samples; bounded work and independent recoverable chunks.
local terrainScan, terrainCenter, terrainQueue, terrainQueueIndex = nil, nil, {}, 1
local terrainTimer, terrainBatch, terrainMapId, terrainRepeatTimer = 30, 0, nil, 0
local function terrainClass(name, mapId)
  name = (name or ''):lower()
  for _, token in ipairs({'asphalt', 'concrete', 'pavement', 'paved', 'cobble', 'sidewalk', 'parking', 'tarmac'}) do if name:find(token, 1, true) then return 3 end end
  for _, token in ipairs({'grass', 'forest', 'meadow'}) do if name:find(token, 1, true) then return 1 end end
  for _, token in ipairs({'sand', 'dirt', 'desert', 'canyon', 'redrock', 'clay', 'mud'}) do if name:find(token, 1, true) then return 2 end end
  if name:find('rock', 1, true) then return (mapId or ''):lower():find('utah', 1, true) and 2 or 3 end
  if name:find('gravel', 1, true) then return 3 end
  return 0
end
local function visibleSurface(pos, mapId, fallbackZ)
  if not castRay then return 0 end
  local ground=(core_terrain.getTerrainHeight and core_terrain.getTerrainHeight(pos)) or fallbackZ or 0
  local hit=castRay(vec3(pos.x,pos.y,ground+500),vec3(pos.x,pos.y,ground-10),true,true)
  if not hit then return 0 end
  local name=hit.materialName or hit.material
  if type(name)=='string' then local category=terrainClass(name,mapId);if category~=0 then return category end end
  local object=hit.object
  if type(object)=='number' and scenetree.findObjectById then object=scenetree.findObjectById(object) end
  if object and type(object)~='number' and object.getField then
    local shape=(object:getField('shapeName',0) or ''):lower()
    if isBuilding(shape) then return 3 end
    for _,token in ipairs({'asphalt','concrete','pavement','paved','sidewalk','cityblock','city_block','roadmesh','road_mesh','street','parking','plaza','urban_ground'}) do if shape:find(token,1,true) then return 3 end end
  end
  return 0
end
local function stepTerrain(position, mapId, dt)
  terrainTimer = terrainTimer + dt
  if terrainMapId ~= mapId then terrainScan = nil; terrainCenter = nil; terrainQueue = {}; terrainMapId = mapId; terrainTimer = 30 end
  local moved = not terrainCenter or math.abs(position.x-terrainCenter.x)>600 or math.abs(position.y-terrainCenter.y)>600
  if not terrainScan and (moved or terrainTimer>20) then
    terrainTimer = 0; terrainCenter = {x=position.x,y=position.y}
    local ok, terrain = pcall(function() return core_terrain and core_terrain.getTerrain and core_terrain.getTerrain() end)
    if ok and terrain then
      local step, size = 60, 128
      local hasBounds,bounds=pcall(function()return terrain:getWorldBox()end)
      terrainScan = {object=terrain,bounds=hasBounds and bounds or nil,index=1,cache={},cells={},width=size,height=size,step=step,origin={math.floor(position.x/step)*step-size/2*step,math.floor(position.y/step)*step-size/2*step}}
    end
  end
  if not terrainScan then return end
  local scan = terrainScan
  local rays=0
  for i=1,96 do
    if rays>=8 then break end
    if scan.index>scan.width*scan.height then break end
    local n=scan.index-1
    local ok, category = pcall(function()
      local pos=vec3(scan.origin[1]+(n%scan.width+.5)*scan.step,scan.origin[2]+(math.floor(n/scan.width)+.5)*scan.step,0)
      local inside=not scan.bounds or (pos.x>=scan.bounds.minExtents.x and pos.x<=scan.bounds.maxExtents.x and pos.y>=scan.bounds.minExtents.y and pos.y<=scan.bounds.maxExtents.y)
      local category=0
      if inside then local idx=scan.object:getMaterialIdxWs(pos);if scan.cache[idx]==nil then scan.cache[idx]=terrainClass(scan.object:getMaterialName(idx),mapId) end;category=scan.cache[idx] end
      -- Raycast only the nearby visible surface, with a strict per-frame budget.
      local dx,dy=pos.x-position.x,pos.y-position.y
      if castRay and dx*dx+dy*dy<1800*1800 then rays=rays+1;local surface=visibleSurface(pos,mapId,position.z);if surface~=0 then category=surface end end
      return category
    end)
    scan.cells[scan.index]=ok and category or 0;scan.index=scan.index+1
  end
  if scan.index<=scan.width*scan.height then return end
  terrainBatch=terrainBatch+1;terrainQueue={};terrainQueueIndex=1;terrainRepeatTimer=0
  local total=math.ceil(#scan.cells/768)
  for part=0,total-1 do
    local cells={};for i=part*768+1,math.min((part+1)*768,#scan.cells) do cells[#cells+1]=scan.cells[i] end
    terrainQueue[#terrainQueue+1]={kind='terrain',mapId=mapId,batch=terrainBatch,part=part,total=total,origin=scan.origin,width=scan.width,height=scan.height,step=scan.step,cells=cells}
  end
  terrainScan=nil
end

local function send(data)
  if not udp then return end
  local ok, encoded = pcall(jsonEncode, data)
  if ok and #encoded < 59000 then udp:sendto('DDM1' .. encoded, '127.0.0.1', PORT) end
end

local function mapIdentity()
  local mission = getMissionFilename() or ''
  local id = mission:match('levels/([^/]+)') or mission
  return id, id:gsub('_', ' ')
end

local function buildRoads(graph, position, mapId, levelName)
  -- Keep a complete spatial region, never the first N pairs() entries.
  -- Large graphs reduce coverage as a whole instead of punching random holes.
  local radius = roadRadius
  repeat
    roads = {}
    local seen = {}
    local minX, maxX = position.x - radius, position.x + radius
    local minY, maxY = position.y - radius, position.y + radius
    for id, node in pairs(graph.nodes or {}) do
      for linkedId, link in pairs(node.links or {}) do
        local other = graph.nodes[linkedId]
        if other and not link.hiddenInNavi then
          local a, b = node.pos, other.pos
          -- Bounds also retain a road crossing the region with both ends outside.
          local intersects = math.max(a.x, b.x) >= minX and math.min(a.x, b.x) <= maxX
            and math.max(a.y, b.y) >= minY and math.min(a.y, b.y) <= maxY
          if intersects then
            -- Some BeamNG graph edges exist on only one node. Name ordering alone
            -- loses these links; track the unordered pair only after exporting it.
            local first, second = tostring(id), tostring(linkedId)
            if first > second then first, second = second, first end
            seen[first] = seen[first] or {}
            if not seen[first][second] then
              seen[first][second] = true
              roads[#roads + 1] = {a.x, a.y, b.x, b.y, math.min(80, math.max(2, ((node.radius or 3) + (other.radius or 3)))), math.max(0, math.min(1, link.drivability or 1))}
            end
          end
        end
      end
    end
    if #roads <= maxRoads then break end
    radius = radius * 0.7
  until radius < 50
  -- An exceptionally dense/custom graph must not publish an incomplete network.
  if #roads > maxRoads then return end
  roadCenter = {x = position.x, y = position.y}
  batch = batch + 1
  queue = {}; queueIndex = 1
  local total = math.max(1, math.ceil(#roads / 80))
  for part = 0, total - 1 do
    local chunk = {}
    for i = part * 80 + 1, math.min((part + 1) * 80, #roads) do chunk[#chunk + 1] = roads[i] end
    queue[#queue + 1] = {kind = 'roads', mapId = mapId, levelName = levelName, batch = batch, part = part, total = total, roads = chunk}
  end
end

local function onUpdate(dtReal, dtSim, dtRaw)
  if not udp then return end
  local vehicle = be:getPlayerVehicle(0)
  if not vehicle then return end
  local dt = dtReal or 0
  poseTimer = poseTimer + dt; routeTimer = routeTimer + dt; roadTimer = roadTimer + dt; buildingTimer = buildingTimer + dt
  local position = vehicle:getPosition()
  local mapId, levelName = mapIdentity()
  stepTerrain(position,mapId,dt)
  -- Repeat complete batches so a restarted dashboard recovers without a game reload.
  if #terrainQueue>0 then
    if terrainQueueIndex<=#terrainQueue then send(terrainQueue[terrainQueueIndex]);terrainQueueIndex=terrainQueueIndex+1
    else terrainRepeatTimer=terrainRepeatTimer+dt;if terrainRepeatTimer>=8 then terrainQueueIndex=1;terrainRepeatTimer=0 end end
  end
  if poseTimer >= 1/15 then
    poseTimer = 0
    local direction = vehicle:getDirectionVector()
    send({kind = 'pose', mapId = mapId, levelName = levelName, position = {position.x, position.y}, heading = math.deg(math.atan2(direction.x, direction.y))})
  end
  local graph = map and map.getMap and map.getMap()
  local moved = not roadCenter or math.abs(position.x - roadCenter.x) > 600 or math.abs(position.y - roadCenter.y) > 600
  local changed = graph ~= lastGraph or mapId ~= lastMapId
  if mapId ~= lastMapId then buildingCenter = nil; buildingNames = nil; buildingQueue = {}; buildingQueueIndex = 1 end
  if not buildingNames and (not buildingCenter or math.abs(position.x - buildingCenter.x) > 650 or math.abs(position.y - buildingCenter.y) > 650) then beginBuildings(position) end
  stepBuildings(mapId, levelName)
  if buildingQueueIndex > #buildingQueue and buildingTimer > 8 then buildingQueueIndex = 1; buildingTimer = 0 end
  if buildingQueue[buildingQueueIndex] then send(buildingQueue[buildingQueueIndex]); buildingQueueIndex = buildingQueueIndex + 1 end
  if graph and graph.nodes and (changed or (moved and queueIndex > #queue)) then
    buildRoads(graph, position, mapId, levelName)
    roadTimer = 0; lastGraph = graph; lastMapId = mapId
  end
  -- Resend the SAME batch, allowing the receiver to fill a missing UDP part.
  -- Finish a large transfer before recentering; do not restart it every 5 seconds.
  if queueIndex > #queue and roadTimer > 5 then queueIndex = 1; roadTimer = 0 end
  -- Spread map batches over frames.
  for i = 1, 3 do
    if queue[queueIndex] then send(queue[queueIndex]); queueIndex = queueIndex + 1 end
  end
  if routeTimer >= 0.5 then
    routeTimer = 0
    local points = {}
    local planner = core_groundMarkers and core_groundMarkers.routePlanner
    if planner and planner.path then
      for i = 1, math.min(1000, #planner.path) do
        local pos = planner.path[i].pos
        if pos then points[#points + 1] = {pos.x, pos.y} end
      end
    end
    send({kind = 'route', mapId = mapId, points = points})
  end
end

local function onExtensionLoaded()
  local socketLib = require('socket')
  udp = socketLib.udp()
  if udp then udp:settimeout(0) end
  setExtensionUnloadMode(M, 'manual')
end
local function onExtensionUnloaded() if udp then udp:close(); udp = nil end end
local function onClientEndMission() terrainScan=nil; terrainCenter=nil;terrainQueue={};terrainMapId=nil; lastGraph = nil; lastMapId = nil; roadCenter = nil; queue = {}; buildingCenter = nil; buildingNames = nil; buildingQueue = {} end
M.onExtensionLoaded = onExtensionLoaded
M.onExtensionUnloaded = onExtensionUnloaded
M.onUpdate = onUpdate
M.onClientEndMission = onClientEndMission
return M

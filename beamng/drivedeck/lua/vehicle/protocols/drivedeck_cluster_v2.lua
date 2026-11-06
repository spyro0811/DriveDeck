-- DriveDeck 0.2 companion. Original code, MIT license.
-- Enable Options > Protocols > Other UDP protocols; Ctrl+R after installation.
local M = {}
local ffi = require('ffi')
local vehicleId, vehicleName, engine = '', '', nil
local driveModeController = nil
local probeTimer = 10
local tireTimer = 0

local function copyText(target, value, capacity)
  ffi.fill(target, capacity, 0)
  value = tostring(value or '')
  ffi.copy(target, value, math.min(#value, capacity - 1))
end

local function discover()
  local directory = vehiclePath or (v and v.data and v.data.vehicleDirectory) or ''
  directory = tostring(directory):gsub('\\', '/'):gsub('/+$', '')
  vehicleId = directory:match('vehicles/([^/]+)') or directory
  local rawName = v and v.data and v.data.information and v.data.information.name
  if type(rawName)=='table' then rawName=rawName[1] or rawName.name end
  vehicleName = type(rawName)=='string' and rawName or vehicleId
  if vehicleId=='vivace' then
    local config=v and v.config or {}
    local parts=config.parts or {}
    local body=parts.vivace_body or (v and v.data and v.data.activeParts and v.data.activeParts.ardente_body and 'ardente_body')
    local configName=type(config.partConfigFilename)=='string' and config.partConfigFilename:lower() or ''
    local knownBody=type(body)=='string' and body~=''
    local ardente=(knownBody and body:lower():find('ardente',1,true)) or (not knownBody and (configName:find('ardente',1,true) or vehicleName:lower():find('ardente',1,true)))
    local trim=parts.vivace_bumper_R or parts.vivace_lettering
    local knownTrim=type(trim)=='string' and trim~=''
    local tograc=(knownTrim and trim:lower():find('tograc',1,true)) or (not knownTrim and (configName:find('tograc',1,true) or vehicleName:lower():find('tograc',1,true)))
    vehicleName=ardente and 'Cherrier Ardente' or tograc and 'Cherrier Tograc' or 'Cherrier Vivace'
  elseif vehicleId=='md_series' then
    local config=v and v.config or {}
    local parts=config.parts or {}
    local active=v and v.data and v.data.activeParts or {}
    local bus=(type(parts.schoolbus_body_b)=='string' and parts.schoolbus_body_b~='') or (type(parts.schoolbus_body_c)=='string' and parts.schoolbus_body_c~='') or active.schoolbus_body_b or active.schoolbus_body_c
    if not next(parts) and not bus then
      local fallback=tostring(config.partConfigFilename or ''):lower()..' '..vehicleName:lower()
      bus=fallback:find('schoolbus',1,true) or fallback:find('bus',1,true)
    end
    vehicleName=bus and 'Gavril MD-Series Bus' or 'Gavril MD-Series'
  end
  engine = nil
  if powertrain and powertrain.getDevicesByType then
    for _, candidate in pairs(powertrain.getDevicesByType('combustionEngine') or {}) do engine = candidate; break end
  end
  driveModeController = controller and controller.getController('driveModes') or nil
  if not driveModeController and controller and controller.getControllersByType then
    for _, candidate in pairs(controller.getControllersByType('driveModes') or {}) do driveModeController = candidate; break end
  end
end

local function init()
  discover()
  -- Loads only our read-only game-engine extension, without changing a game controller.
  obj:queueGameEngineLua("if not extensions.drivedeck_map then extensions.load('drivedeck_map') end")
end

local function getStructDefinition()
  return [[
    char magic[4]; unsigned int version;
    char vehicleId[48]; char vehicleName[32];
    float maxRpm; float speed; float rpm; float fuel; float engineTemp; int gear;
    char modeKey[24]; char modeLabel[24]; char modeColor[8];
    float ambientTemp; unsigned int lights; float throttle; float brake; float odometer;
    char selectedGear[8];
  ]]
end

local function fillStruct(o, dtSim)
  probeTimer = probeTimer + dtSim
  if probeTimer > 1 then probeTimer = 0; discover() end
  local e = electrics.values or {}
  ffi.copy(o.magic, 'DDK2', 4); o.version = 2
  copyText(o.vehicleId, vehicleId, 48); copyText(o.vehicleName, vehicleName, 32)
  o.maxRpm = engine and engine.maxRPM or 8000
  o.speed = math.abs(e.wheelspeed or e.airspeed or 0); o.rpm = e.rpmTacho or e.rpm or 0
  o.fuel = math.max(0, math.min(1, e.fuel or 0)); o.engineTemp = e.watertemp or 0; o.gear = e.gearIndex or 0
  copyText(o.selectedGear, e.gear or '', 8)
  local modeKey, modeLabel, modeColor = '', '', ''
  if driveModeController and driveModeController.getCurrentDriveModeKey then
    modeKey = driveModeController.getCurrentDriveModeKey() or ''
    local mode = driveModeController.getDriveModeData(modeKey)
    if mode then
      modeLabel = mode.name or modeKey
      for _, setting in pairs(mode.settings or {}) do
        if setting.modeName then modeLabel = setting.modeName end
        if setting.modeColor then modeColor = setting.modeColor end
      end
    end
  end
  copyText(o.modeKey, modeKey, 24); copyText(o.modeLabel, modeLabel, 24); copyText(o.modeColor, modeColor, 8)
  o.ambientTemp = obj:getEnvTemperature() - 273.15
  o.throttle = e.throttle or 0; o.brake = e.brake or 0; o.odometer = e.odometer or 0
  local lights = 0
  local function light(active, mask) if active and active ~= 0 then lights = bit.bor(lights, mask) end end
  light(e.highbeam, 2); light((e.parkingbrake or 0) > 0.5, 4)
  light(e.tcsActive, 16); light(e.signal_L, 32); light(e.signal_R, 64)
  light(e.oil, 256); light(e.battery, 512); light(e.absActive, 1024)
  o.lights = lights
  tireTimer = tireTimer + (dtSim or 0)
  if tireTimer >= 0.5 and wheels and wheels.wheels and obj.getGroupPressure and obj.getEnvPressure and jsonEncode then
    tireTimer = 0
    local pressures = {}
    for _, wheel in pairs(wheels.wheels) do
      local name = type(wheel.name)=='string' and wheel.name:upper() or ''
      local group = wheel.pressureGroup and v and v.data and v.data.pressureGroups and v.data.pressureGroups[wheel.pressureGroup]
      if group and (name=='FL' or name=='FR' or name=='RL' or name=='RR') then
        local ok, absolute = pcall(obj.getGroupPressure, obj, group)
        local envOk, atmospheric = pcall(obj.getEnvPressure, obj)
        if ok and envOk and type(absolute)=='number' and type(atmospheric)=='number' then
          local kpa = math.max(0,(absolute-atmospheric)*0.001)
          if kpa==kpa and kpa<=3000 then pressures[name]=kpa end
        end
      end
    end
    if obj.getID then
      obj:queueGameEngineLua(string.format('if extensions.drivedeck_map then extensions.drivedeck_map.sendTires(%d,%q,%q) end',obj:getID(),vehicleId,jsonEncode(pressures)))
    end
  end
end

M.init = init
M.reset = discover
M.getAddress = function() return '127.0.0.1' end
M.getPort = function() return 4444 end -- Match the app's UDP port when customized.
M.getMaxUpdateRate = function() return 30 end
M.isPhysicsStepUsed = function() return false end
M.getStructDefinition = getStructDefinition
M.fillStruct = fillStruct
return M

const dgram = require('node:dgram');
const { EventEmitter } = require('node:events');
const { MapFeed } = require('./map-feed.cjs');

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const finite = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;
const text = (packet, offset, size) => packet.subarray(offset, offset + size).toString('utf8').split('\0')[0].trim();

function decodeTirePacket(packet){
  if(!Buffer.isBuffer(packet)||packet.length>2048||packet.toString('ascii',0,4)!=='DDT1')return null;
  try{const data=JSON.parse(packet.toString('utf8',4));if(typeof data.vehicleId!=='string'||!/^[a-z0-9_-]{1,48}$/i.test(data.vehicleId)||!data.pressures||typeof data.pressures!=='object'||Array.isArray(data.pressures))return null;
  const pressures={};for(const key of ['FL','FR','RL','RR']){if(data.pressures[key]===undefined)continue;if(!finite(data.pressures[key],0,3000))return null;pressures[key]=data.pressures[key];}return {vehicleId:data.vehicleId,pressures};}catch{return null;}
}
function decodePacket(packet) {
  if (!Buffer.isBuffer(packet)) return null;
  if (packet.length === 196 && packet.toString('ascii', 0, 4) === 'DDK2') {
    if (packet.readUInt32LE(4) !== 2) return null;
    const v1 = Buffer.from(packet.subarray(0, 112)); v1.write('DDK1'); v1.writeUInt32LE(1, 4);
    const result = decodePacket(v1); if (!result) return null;
    const modeColor = text(packet, 160, 8);
    const ambient = packet.readFloatLE(168), throttle = packet.readFloatLE(176), brake = packet.readFloatLE(180), odometer = packet.readFloatLE(184);
    if (![ambient, throttle, brake, odometer].every(Number.isFinite)) return null;
    const bits = packet.readUInt32LE(172);
    return { ...result, driveModeKey: text(packet, 112, 24), driveModeLabel: text(packet, 136, 24),
      driveModeColor: /^#[a-f\d]{6}$/i.test(modeColor) ? modeColor : null,
      ambientTemp: finite(ambient, -100, 100) ? ambient : null, throttle: clamp(throttle, 0, 1), brake: clamp(brake, 0, 1),
      odometer: Math.max(0, odometer), selectedGear: text(packet, 188, 8),
      lights: { shift: !!(bits & 1), highBeam: !!(bits & 2), handbrake: !!(bits & 4), traction: !!(bits & 16), left: !!(bits & 32), right: !!(bits & 64), oil: !!(bits & 256), battery: !!(bits & 512), abs: !!(bits & 1024) },
    };
  }
  if (packet.length === 112 && packet.toString('ascii', 0, 4) === 'DDK1') {
    if (packet.readUInt32LE(4) !== 1) return null;
    const result = {
      protocol: 'DriveDeck', vehicleId: text(packet, 8, 48), vehicleName: text(packet, 56, 32),
      maxRpm: packet.readFloatLE(88), speedMps: packet.readFloatLE(92),
      rpm: packet.readFloatLE(96), fuel: packet.readFloatLE(100),
      engineTemp: packet.readFloatLE(104), gear: packet.readInt32LE(108),
    };
    if (!finite(result.speedMps, -1000, 2000) || !finite(result.rpm, 0, 100000)
      || !finite(result.maxRpm, 0, 100000) || !finite(result.fuel, 0, 1)
      || !finite(result.engineTemp, -273, 2000) || !finite(result.gear, -1, 30)) return null;
    result.speedMps = Math.abs(result.speedMps);
    return result;
  }
  if (packet.length !== 92 && packet.length !== 96) return null;
  if (text(packet, 4, 4) !== 'beam') return null;
  const speedMps = packet.readFloatLE(12);
  const rpm = packet.readFloatLE(16);
  const fuel = packet.readFloatLE(28);
  const engineTemp = packet.readFloatLE(24);
  if (!finite(speedMps, -1000, 2000) || !finite(rpm, 0, 100000)
    || !finite(fuel, 0, 1) || !finite(engineTemp, -273, 2000)) return null;
  const values = [20, 48, 52, 56].map(offset => packet.readFloatLE(offset));
  if (!values.every(Number.isFinite)) return null;
  const lights = packet.readUInt32LE(44);
  const available = packet.readUInt32LE(40);
  return {
    protocol: 'OutGauge', speedMps: Math.abs(speedMps), rpm, fuel, engineTemp,
    oilTemp: Number.isFinite(packet.readFloatLE(36)) ? packet.readFloatLE(36) : null,
    gear: packet.readUInt8(10) - 1,
    turbo: values[0], throttle: clamp(values[1], 0, 1), brake: clamp(values[2], 0, 1), clutch: clamp(values[3], 0, 1),
    lights: {
      shift: !!(lights & 1), highBeam: !!(lights & 2), handbrake: !!(lights & 4),
      traction: !!(lights & 16), left: !!(lights & 32), right: !!(lights & 64),
      oil: !!(lights & 256), battery: !!(lights & 512), abs: !!(lights & 1024),
    },
    availableLights: available,
  };
}

class Telemetry extends EventEmitter {
  constructor({ staleMs = 1600 } = {}) {
    super();
    this.staleMs = staleMs;
    this.socket = null;
    this.port = null;
    this.lastPacketAt = 0;
    this.received = 0;
    this.error = null;
    this.data = {};
    this.tires=null;this.tiresAt=0;
    this.vehicleAt = 0;
    this.mapFeed = new MapFeed();
  }

  async listen(port) {
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Choose a UDP port between 1024 and 65535.');
    if (this.socket && this.port === port && !this.error) return;
    const socket = dgram.createSocket('udp4');
    try {
      await new Promise((resolve, reject) => {
        socket.once('error', reject);
        socket.bind(port, '127.0.0.1', resolve);
      });
    } catch (error) {
      try { socket.close(); } catch {}
      throw new Error(error.code === 'EADDRINUSE'
        ? `Port ${port} is already in use. Choose another port and use the same one in BeamNG.`
        : `Could not open UDP port ${port}: ${error.message}`);
    }
    socket.removeAllListeners('error');
    socket.on('error', error => { this.error = error.message; });
    socket.on('message', packet => this.accept(packet));
    const previous = this.socket;
    this.socket = socket;
    this.port = port;
    this.lastPacketAt = 0;
    this.vehicleAt = 0;
    this.received = 0;
    this.data = {};
    this.tires=null;this.tiresAt=0;
    this.error = null;
    this.mapFeed.clear();
    if (previous) previous.close();
  }

  accept(packet, now = Date.now()) {
    if(Buffer.isBuffer(packet)&&packet.toString('ascii',0,4)==='DDT1'){const tires=decodeTirePacket(packet);if(!tires)return false;this.tires=tires;this.tiresAt=now;return true;}
    if (Buffer.isBuffer(packet) && packet.toString('ascii', 0, 4) === 'DDM1') return this.mapFeed.accept(packet, now);
    const decoded = decodePacket(packet);
    if (!decoded) return false;
    if (now - this.lastPacketAt > this.staleMs) this.data = {};
    if (decoded.protocol === 'DriveDeck') this.vehicleAt = now;
    this.lastPacketAt = now;
    this.received++;
    this.data = { ...this.data, ...decoded };
    return true;
  }

  snapshot(now = Date.now()) {
    const ageMs = this.lastPacketAt ? Math.max(0, now - this.lastPacketAt) : null;
    const connected = ageMs !== null && ageMs < this.staleMs;
    const vehicleFresh = connected && now - this.vehicleAt < this.staleMs;
    return {
      ...this.data,
      vehicleId: vehicleFresh ? this.data.vehicleId : null,
      vehicleName: vehicleFresh ? this.data.vehicleName : null,
      maxRpm: vehicleFresh ? this.data.maxRpm : null,
      driveModeKey: vehicleFresh ? this.data.driveModeKey : null,
      driveModeLabel: vehicleFresh ? this.data.driveModeLabel : null,
      driveModeColor: vehicleFresh ? this.data.driveModeColor : null,
      selectedGear: vehicleFresh ? this.data.selectedGear : null,
      ambientTemp: vehicleFresh ? this.data.ambientTemp : null,
      odometer: vehicleFresh ? this.data.odometer : null,
      tirePressures:vehicleFresh&&this.tires?.vehicleId===this.data.vehicleId&&now-this.tiresAt<2000?this.tires.pressures:null,
      connected, ageMs, received: this.received, port: this.port,
      error: this.error,
    };
  }

  close() {
    if (this.socket) this.socket.close();
    this.socket = null;
    this.port = null;
    this.lastPacketAt = 0;
  }
}

module.exports = { Telemetry, decodePacket, decodeTirePacket };

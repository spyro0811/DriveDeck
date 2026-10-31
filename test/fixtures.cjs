function outGauge({ speed = 30, rpm = 4200, gear = 4, fuel = .72, temp = 91, lights = 32 } = {}) {
  const packet = Buffer.alloc(96);
  packet.write('beam', 4); packet.writeUInt8(gear + 1, 10);
  packet.writeFloatLE(speed, 12); packet.writeFloatLE(rpm, 16);
  packet.writeFloatLE(.5, 20); packet.writeFloatLE(temp, 24); packet.writeFloatLE(fuel, 28);
  packet.writeFloatLE(103, 36); packet.writeUInt32LE(2047, 40); packet.writeUInt32LE(lights, 44);
  packet.writeFloatLE(.65, 48); packet.writeFloatLE(.12, 52); packet.writeFloatLE(0, 56);
  return packet;
}
function companion({ vehicleId = 'etk800', name = 'ETK 800', maxRpm = 7200, speed = 30, rpm = 4200, fuel = .72, temp = 91, gear = 4 } = {}) {
  const packet = Buffer.alloc(112); packet.write('DDK1'); packet.writeUInt32LE(1, 4);
  packet.write(vehicleId, 8, 47); packet.write(name, 56, 31);
  packet.writeFloatLE(maxRpm, 88); packet.writeFloatLE(speed, 92); packet.writeFloatLE(rpm, 96);
  packet.writeFloatLE(fuel, 100); packet.writeFloatLE(temp, 104); packet.writeInt32LE(gear, 108);
  return packet;
}
function companionV2({ mode = 'comfort', label = 'COMFORT', color = '#1e7ccc', ...options } = {}) {
  const packet = Buffer.alloc(196); companion(options).copy(packet); packet.write('DDK2'); packet.writeUInt32LE(2,4);
  packet.write(mode,112,23); packet.write(label,136,23); packet.write(color,160,7);
  packet.writeFloatLE(29.4,168); packet.writeUInt32LE(4,172); packet.writeFloatLE(.5,176); packet.writeFloatLE(0,180); packet.writeFloatLE(10000,184); packet.write('D',188);
  return packet;
}
function mapPacket(value) { return Buffer.from('DDM1' + JSON.stringify(value)); }
module.exports = { outGauge, companion, companionV2, mapPacket };

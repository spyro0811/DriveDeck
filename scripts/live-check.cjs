// Read-only diagnostic: listens to the same local UDP feed as DriveDeck.
// Close the dashboard before running; no packets are sent to BeamNG.
const fs = require('node:fs');
const path = require('node:path');
const { Telemetry } = require('../src/lib/telemetry.cjs');
const telemetry = new Telemetry();
const duration = Math.max(5, Math.min(900, Number(process.argv[2]) || 120));
const output = path.resolve(process.argv[3] || 'artifacts/live-beamng.json');
const report = { started: new Date().toISOString(), simulated: false, packets: {}, modes: [], maps: [], samples: 0 };
let lastStatus = '';
const accept = telemetry.accept.bind(telemetry);
telemetry.accept = packet => {
  const key = `${packet.toString('ascii', 0, 4)}:${packet.length}`;
  report.packets[key] = (report.packets[key] || 0) + 1;
  return accept(packet);
};
function save() { fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2)); }
function sample() {
  const t = telemetry.snapshot(), m = telemetry.mapFeed.snapshot();
  const status = { connected: t.connected, vehicleId: t.vehicleId, mode: t.driveModeKey, label: t.driveModeLabel, color: t.driveModeColor,
    speedMps: t.speedMps, rpm: t.rpm, received: t.received, mapId: m.mapId, mapConnected: m.connected, roads: m.roads.length, routePoints: m.route.length };
  report.samples++;
  if (t.vehicleId && !report.modes.some(v => v.vehicleId === t.vehicleId && v.mode === t.driveModeKey)) report.modes.push({ vehicleId: t.vehicleId, mode: t.driveModeKey, label: t.driveModeLabel, color: t.driveModeColor });
  if (m.connected && m.roads.length && !report.maps.some(v => v.mapId === m.mapId && v.roads === m.roads.length && v.routePoints === m.route.length)) report.maps.push({ mapId: m.mapId, roads: m.roads.length, routePoints: m.route.length });
  const signature = JSON.stringify([t.connected, t.vehicleId, t.driveModeKey, m.connected, m.roads.length, m.route.length]);
  if (signature !== lastStatus) { console.log(JSON.stringify(status)); lastStatus = signature; }
  save();
}
let timer, deadline;
function finish() { clearInterval(timer); clearTimeout(deadline); sample(); report.finished = new Date().toISOString(); save(); telemetry.close(); console.log(`Saved ${output}`); }
telemetry.listen(4444).then(() => { console.log(`Listening on 127.0.0.1:4444 for ${duration}s`); timer = setInterval(sample, 1000); deadline = setTimeout(finish, duration * 1000); }).catch(error => { console.error(error.message); process.exitCode = 1; });
process.once('SIGINT', finish);

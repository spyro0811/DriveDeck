export const demoMedia = {
  available: true, title: 'Midnight, in motion', artist: 'DriveDeck Studio', album: 'AFTER HOURS / VOL. 01',
  playing: true, position: 67, duration: 248, canToggle: true, canNext: true, canPrevious: true,
  source: 'SILENT DEMO', artwork: null,
};
export function demoTelemetry(seconds) {
  const phase = (seconds % 36) / 36;
  const speed = 30 + 18 * Math.sin(phase * Math.PI * 2 - 0.6) + 7 * Math.sin(phase * Math.PI * 4);
  const gear = speed > 49 ? 5 : speed > 34 ? 4 : speed > 19 ? 3 : 2;
  const rpm = 1750 + speed * 48 + 320 * Math.sin(seconds * 0.7);
  return {
    connected: true, protocol: 'Demo', speedMps: Math.max(0, speed), rpm, gear,
    fuel: 0.74 - (seconds % 2000) / 16000, engineTemp: 89 + Math.sin(seconds * .1),
    throttle: Math.max(0, Math.min(1, .43 + .32 * Math.cos(phase * Math.PI * 2))),
    brake: Math.max(0, -.25 - .5 * Math.cos(phase * Math.PI * 2)),
    lights: { left: seconds % 60 > 50 && seconds % 1 < .5 },
    vehicleId: null, vehicleName: 'AURA GT / DEMO VEHICLE', maxRpm: null,
    ambientTemp: 29.4, odometer: 43600,
  };
}

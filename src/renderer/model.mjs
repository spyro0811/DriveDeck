export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function speedInUnits(mps, units) { return Math.abs(mps) * (units === 'kmh' ? 3.6 : 2.2369362921); }
export function gearLabel(gear) { return gear === -1 ? 'R' : gear === 0 ? 'N' : Number.isInteger(gear) && gear > 0 ? String(gear) : '—'; }
export function durationLabel(seconds) {
  const value = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
}
export function arcPath(startAngle, endAngle, radius = 127, cx = 160, cy = 163) {
  const point = angle => [cx + radius * Math.cos(angle * Math.PI / 180), cy + radius * Math.sin(angle * Math.PI / 180)];
  const a = point(startAngle), b = point(endAngle);
  return `M ${a[0]} ${a[1]} A ${radius} ${radius} 0 ${endAngle - startAngle > 180 ? 1 : 0} 1 ${b[0]} ${b[1]}`;
}
export class Trip {
  constructor() { this.reset(); }
  reset() { this.meters = 0; this.seconds = 0; this.lastAt = null; this.lastSpeed = 0; }
  update(data, now) {
    const seconds = this.lastAt === null ? 0 : clamp((now - this.lastAt) / 1000, 0, .25);
    if (data.connected) {
      const speed = Number.isFinite(data.speedMps) ? Math.abs(data.speedMps) : 0;
      this.meters += ((this.lastSpeed + speed) / 2) * seconds;
      this.seconds += seconds;
      this.lastSpeed = speed;
    } else { this.lastSpeed = 0; }
    this.lastAt = now;
  }
}

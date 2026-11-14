const MODES = {
  comfort: { label: 'COMFORT', color: '#6acfff', base: '#1e7ccc' },
  sport: { label: 'SPORT', color: '#ff2924', base: '#8f0101' },
  arsenic: { label: 'ARSENIC', color: '#d0f500', base: '#598500' },
  off: { label: 'ESC OFF', color: '#bfc5c5', base: '#343838' },
  offroad: { label: 'OFFROAD', color: '#ff9a37', base: '#ec6b00' },
};
export function resolveDriveMode(data, demoMode) {
  const key = demoMode || data.driveModeKey;
  if (!key) return { key: 'unknown', label: data.connected ? 'WAITING FOR DRIVE MODE' : 'NO SIGNAL', color: '#8e969b', base: '#343838', available: false };
  const preset = MODES[key] || { label: key.toUpperCase(), color: data.driveModeColor || '#bbc5d3', base: data.driveModeColor || '#445566' };
  return { ...preset, key, label: demoMode ? preset.label : data.driveModeLabel || preset.label,
    base: data.driveModeColor || preset.base, available: true };
}

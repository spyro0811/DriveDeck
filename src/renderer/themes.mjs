export const THEMES = [
  { id: 'aura', name: 'AURA', title: 'The original', tagline: 'THE ORIGINAL DRIVEDECK EXPERIENCE', accent: '#d5f38a', emblem: 'A', description: 'Quiet confidence. Electric detail.', shape: 'arc' },
  { id: 'etk', name: 'ETK', title: 'Executive sport', tagline: 'PRECISION IN EVERY REVOLUTION', accent: '#87baff', emblem: 'E', description: 'A modern German sport cluster.', shape: 'arc' },
  { id: 'hirochi', name: 'HIROCHI', title: 'Rally spirit', tagline: 'ENGINEERED FOR THE NEXT CORNER', accent: '#ffbc62', emblem: 'H', description: 'Rally-ready amber instruments.', shape: 'bar' },
  { id: 'ibishu', name: 'IBISHU', title: 'Analog soul', tagline: 'ANALOG SOUL. DIGITAL FREEDOM.', accent: '#89e0ce', emblem: 'I', description: 'Japanese classics, reimagined.', shape: 'arc' },
  { id: 'bmw', name: 'BAVARIAN', title: 'BMW inspired', tagline: 'AN INDEPENDENT BMW-INSPIRED THEME', accent: '#6eb8ff', emblem: 'B', description: 'Cool blue with a sporting edge.', shape: 'bar' },
  { id: 'porsche', name: 'STUTTGART', title: 'Porsche inspired', tagline: 'AN INDEPENDENT PORSCHE-INSPIRED THEME', accent: '#f1e5ca', emblem: 'S', description: 'A warm, understated sports dial.', shape: 'arc' },
  { id: 'ferrari', name: 'MARANELLO', title: 'Ferrari inspired', tagline: 'AN INDEPENDENT FERRARI-INSPIRED THEME', accent: '#ffcb49', emblem: 'M', description: 'A bright dial. A racing heartbeat.', shape: 'arc' },
  { id: 'custom', name: 'YOUR MARQUE', title: 'Make your own', tagline: 'YOUR IDENTITY. EVERY INSTRUMENT.', accent: '#d5f38a', emblem: '+', description: 'Your name. Your signature color.', shape: 'arc' },
];
export function resolveTheme(settings, vehicleId) {
  let id = settings.theme;
  let automatic = false;
  if (settings.autoTheme && vehicleId) {
    const vehicle = vehicleId.toLowerCase();
    const mappings = Object.entries(settings.brandMappings || {}).sort((a, b) => b[0].length - a[0].length);
    const match = mappings.find(([keyword, theme]) => keyword && vehicle.includes(keyword.toLowerCase()) && THEMES.some(t => t.id === theme));
    if (match) { id = match[1]; automatic = true; }
    // BeamNG uses internal folder names rather than the displayed manufacturer.
    if (!automatic) {
      if (/^(etk|etkc|etk800|etki)/.test(vehicle)) { id = 'etk'; automatic = true; }
      if (/^(sunburst|sbr)/.test(vehicle)) { id = 'hirochi'; automatic = true; }
      if (/^(covet|200bx|bx|pessima|miramar|pigeon|wigeon|hopper)/.test(vehicle)) { id = 'ibishu'; automatic = true; }
    }
  }
  let theme = THEMES.find(t => t.id === id) || THEMES[0];
  if (theme.id === 'custom') theme = { ...theme, name: settings.customName, accent: settings.accent, emblem: settings.customName.slice(0, 1).toUpperCase() };
  return { ...theme, automatic };
}

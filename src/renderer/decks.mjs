import {plaidMarkup,PlaidView} from './plaid.mjs';
import {BassPulse} from './audio.mjs';
import {ROBOBEAT_DECK,robobeatMarkup,UnlockSound,RobobeatView} from './robobeat.mjs';
import {martinMarkup,MartinView} from './martin.mjs';
import {ARCH_DECK,archMarkup,updateArch} from './arch.mjs';
import {m235Markup,updateM235} from './m235.mjs';
import { vehicleVisual } from './vehicle-identity.mjs';
import { teslaMarkup, TeslaDecks } from './tesla.mjs';
import { civettaMarkup, updateCivetta } from './civetta.mjs';
import { homosexualMarkup, updateHomosexual, PlanarG } from './homosexual.mjs';
import { iadnuyhMarkup, updateIadnuyh } from './iadnuyh.mjs';
import { MotionArtwork } from './motion-artwork.mjs';
import { icon } from './icons.mjs';
import { artworkPalette, DEFAULT_PALETTE } from './palette.mjs';
import { AudioCanvas } from './audio.mjs';
import { MapCanvas } from './map.mjs';
import { clamp, gearLabel, durationLabel } from './model.mjs';

export const DECKS = [
  {id:'martin',name:'Martin',note:'Teal circular instruments. Artwork, navigation or tire pressure at the center.'},
  { id: 'm235', name: 'M235', note: 'Angular instruments, orange illumination, and a central digital speed display.' },
  { id: 'model-s', name: 'Model S', note: 'Minimal instruments. Your BeamNG model, with a dedicated Park view.' },
  {id:'plaid-track',name:'Plaid Track',note:'Track temperatures, clean instruments and a Plaid launch display.'},
  { id: 'model-three', name: 'Model Three', note: 'A light vehicle panel and live navigation, made for the EDGE.' },
  { id: 'civetta', name: 'Civetta', note: 'Scintilla instruments, synced to your drive mode.' },
  { id: 'homosexual', name: 'Luce', note: 'Three sculpted analog dials. Orange needles and golden markings.' },
  { id: 'iadnuyh', name: 'iadnuyh', note: 'Blue and orange instruments. A compass at the center.' },
  { id: 'levels', name: 'Ultra Levels', note: 'Six sculpted bars. Bass to treble. Colors from your cover.' },
  { id: 'sound', name: 'Ultra Sound', note: 'Your music, framed by speed and RPM.' },
  { id: 'ultra', name: 'Ultra Glass', note: 'Floating instruments. A map at the heart.' },
  { id: 'atlas', name: 'Ultra Atlas', note: 'An expansive map with glass instruments.' },
  { id: 'pure', name: 'Ultra Pure', note: 'A light, pared-back digital cockpit.' },
  { id: 'vivace', name: 'Vivace S', note: 'The Cherrier cluster, synced to drive mode.' },
];
export const decksForPlatform=(platform,unlocked=false)=>[...DECKS,...(platform==='linux'?[ARCH_DECK]:[]),...(unlocked?[ROBOBEAT_DECK]:[])];
const MODES = {
  comfort: { label: 'COMFORT', color: '#6acfff', base: '#1e7ccc' },
  sport: { label: 'SPORT', color: '#ff2924', base: '#8f0101' },
  arsenic: { label: 'ARSENIC', color: '#d0f500', base: '#598500' },
  off: { label: 'ESC OFF', color: '#bfc5c5', base: '#343838' },
  offroad: { label: 'OFFROAD', color: '#ff9a37', base: '#ec6b00' },
};
export function resolveDeck(settings, data) {
  return settings.autoDeck && data.connected && vehicleVisual(data).key==='Vivace' ? 'vivace' : settings.deck;
}
export function resolveDriveMode(data, demoMode) {
  const key = demoMode || data.driveModeKey;
  if (!key) return { key: 'unknown', label: data.connected ? 'WAITING FOR DRIVE MODE' : 'NO SIGNAL', color: '#8e969b', base: '#343838', available: false };
  const preset = MODES[key] || { label: key.toUpperCase(), color: data.driveModeColor || '#bbc5d3', base: data.driveModeColor || '#445566' };
  return { ...preset, key, label: demoMode ? preset.label : data.driveModeLabel || preset.label,
    base: data.driveModeColor || preset.base, available: true };
}
const pt = (cx, cy, radius, angle) => [cx + Math.cos(angle * Math.PI / 180) * radius, cy + Math.sin(angle * Math.PI / 180) * radius];
const pathArc = (cx, cy, radius, a, b) => { const x = pt(cx, cy, radius, a), y = pt(cx, cy, radius, b); return `M${x} A${radius},${radius} 0 ${Math.abs(b-a)>180?1:0} ${b>a?1:0} ${y}`; };
const ring = (cx, cy, ro, ri, a, b) => {
  const p1 = pt(cx, cy, ro, a), p2 = pt(cx, cy, ro, b), p3 = pt(cx, cy, ri, b), p4 = pt(cx, cy, ri, a);
  return `M${p1} A${ro},${ro} 0 0 ${b>a?1:0} ${p2} L${p3} A${ri},${ri} 0 0 ${b>a?0:1} ${p4} Z`;
};

function vivaceSVG() {
  let ticks = '', labels = '';
  for (let i = 0; i <= 40; i++) {
    const a = -i * 165 / 40, major = i % 5 === 0;
    const p = pt(282, 295, major ? 208 : 217, a), q = pt(282, 295, 228, a);
    ticks += `<path d="M${p}L${q}" class="v-tick ${i >= 35 ? 'red' : ''}"/>`;
    if (major) { const l = pt(282, 295, 236, a); labels += `<text x="${l[0]}" y="${l[1]}" class="v-number ${i>=35?'red':''}">${i/5}</text>`; }
  }
  for (let i = 0; i <= 40; i++) {
    const a = 180 + i * 165 / 40, major = i % 4 === 0;
    const p = pt(918, 295, major ? 208 : 218, a), q = pt(918, 295, 228, a);
    ticks += `<path d="M${p}L${q}" class="v-tick"/>`;
    if (major) { const l = pt(918, 295, 236, a); labels += `<text x="${l[0]}" y="${l[1]}" class="v-number v-speed-tick" data-speed-tick="${i/40}">${i*5}</text>`; }
  }
  return `<svg viewBox="0 0 1200 370" class="vivace-svg" aria-label="Vivace S instrument cluster">
    <defs>
      <radialGradient id="vivace-dial"><stop offset="0" stop-color="#000"/><stop offset="65%" stop-color="#000"/><stop offset="66%" stop-color="var(--mode-base)"/><stop offset="88%" stop-color="var(--mode-color)"/><stop offset="100%" stop-color="var(--mode-color)" stop-opacity="0"/></radialGradient>
      <linearGradient id="vivace-glass" x2="0" y2="1"><stop stop-color="#212329"/><stop offset="1" stop-color="#07080a"/></linearGradient>
      <clipPath id="vivace-clip"><path d="M22 270 70 147 Q90 95 163 67 L279 27 Q600-3 921 27 L1037 67 Q1110 95 1130 147 L1178 270 1096 337H104L22 270Z"/></clipPath>
    </defs>
    <path d="M9 272 58 142 Q82 78 157 53L276 12Q600-17 924 12L1043 53Q1118 78 1142 142L1191 272 1100 351H100Z" fill="#0c0d11" stroke="#292a31" stroke-width="6"/>
    <g clip-path="url(#vivace-clip)"><path d="M0 0H1200V370H0Z" fill="#000"/>
      <circle cx="282" cy="295" r="266" fill="url(#vivace-dial)"/><circle cx="918" cy="295" r="266" fill="url(#vivace-dial)"/>
      <path d="${ring(282,295,230,169,0,-165)}" fill="#ffffff10"/><path d="${ring(918,295,230,169,180,345)}" fill="#ffffff10"/>
      ${ticks}${labels}
      <g id="v-rpm-needle"><path d="M282 291 516 294 282 299Z" fill="#fff"/><path d="M282 295H509" stroke="#fff" stroke-width="1.3"/></g>
      <g id="v-speed-needle"><path d="M918 291 684 294 918 299Z" fill="#fff"/></g>
      <text x="282" y="257" class="v-rpm-caption">X1000</text><text x="282" y="281" class="v-rpm-caption">rpm</text>
      <text x="918" y="207" class="v-mode" id="v-mode-label">COMFORT</text>
      <text x="905" y="275" class="v-speed" text-anchor="end" id="v-speed">—</text><text x="919" y="275" class="v-unit" id="v-unit">MPH</text>
      <text x="600" y="284" class="v-gear" id="v-gear">—</text><text x="550" y="287" class="v-small-gear">R</text><text x="651" y="287" class="v-small-gear">1</text>
      <text x="600" y="185" class="v-ambient" id="v-ambient">—°F</text><text x="600" y="215" class="v-system" id="v-system">ESC TCS</text>
      <g class="v-minigauge"><path d="${pathArc(523,92,49,-100,100)}"/><text x="541" y="49">1</text><text x="567" y="93">1/2</text><text x="541" y="144" fill="#ff6b5d">0</text><path d="M500 24h13v18h-13zm2 4h9m2 2h4l3 6v8"/><path id="v-fuel-needle" class="v-mini-needle" d="M523 92 566 92"/></g>
      <g class="v-minigauge"><path d="${pathArc(677,92,49,80,280)}"/><text x="661" y="49" fill="#ff6b5d">130</text><text x="630" y="93">90 °C</text><text x="658" y="144" fill="#70cfff">50</text><path d="M690 23v14m-4-4v-9a4 4 0 0 1 8 0v9a6 6 0 1 1-8 0"/><path id="v-temp-needle" class="v-mini-needle" d="M677 92 634 92"/></g>
      <text x="282" y="143" class="v-brake" id="v-brake">Ⓟ</text>
      <text x="495" y="321" class="v-trip" id="v-odometer">ODO —</text><text x="701" y="321" class="v-trip" id="v-trip">TRIP 0.0 MI</text>
      <path d="M0 333H1200" stroke="#1c2025" stroke-width="3"/>
    </g>
  </svg>`;
}

export class DeckView {
  constructor(root, actions) {
    this.root = root; this.actions = actions; this.planarG = new PlanarG();
    root.innerHTML = `<section class="ultra-deck" id="ultra-deck">
      <div class="ultra-scene"><div class="ultra-scene-light"></div></div>
      <div class="ultra-heading"><span class="ultra-wordmark">Drive<span>Deck</span><small>ULTRA</small></span><span class="ultra-mode-badge" id="ultra-drive-mode">YOUR DRIVE, BEAUTIFULLY.</span><span class="ultra-scene-status" id="ultra-scene-status">LOCAL COCKPIT</span></div>
      <div class="ultra-instruments">
        <section class="ultra-dial speed-dial" aria-label="Speed"><svg viewBox="0 0 340 340"><defs><linearGradient id="ultra-speed-gradient" x2="1" y2="1"><stop stop-color="#7ee1fc"/><stop offset="1" stop-color="#3c8ce8"/></linearGradient></defs><circle cx="170" cy="170" r="148" class="ultra-ring-track"/><circle cx="170" cy="170" r="148" class="ultra-ring-fill speed-ring" id="ultra-speed-ring"/><g class="ultra-marks">${[0,1,2,3,4,5,6,7,8,9,10,11].map(i=>{const a=i*Math.PI/6;return `<path d="M${170+Math.cos(a)*134},${170+Math.sin(a)*134}L${170+Math.cos(a)*137},${170+Math.sin(a)*137}"/>`;}).join('')}</g></svg><div class="ultra-dial-value"><span class="ultra-dial-caption">SPEED</span><strong id="ultra-speed">—</strong><span class="ultra-unit" id="ultra-unit">mph</span><span class="ultra-dial-detail" id="ultra-fuel">—% fuel</span></div></section>
        <section class="sound-center" id="sound-center" hidden>
          <div class="sound-switch" id="sound-switch" role="group" aria-label="Center display"><button id="sound-art-button">Album art</button><button id="sound-visualizer-button">Visualizer</button></div>
          <div class="sound-stage" id="sound-stage"><div class="sound-artwork" id="sound-artwork"><video id="sound-motion" muted loop playsinline disablepictureinpicture hidden></video><img id="sound-art-image" alt="Current album artwork" hidden><span id="sound-art-placeholder">${icon('music')}</span><small id="sound-motion-label" class="motion-source-label" hidden></small></div><canvas id="sound-canvas" aria-label="Live audio frequency spectrum" hidden></canvas></div>
          <div class="sound-info" id="sound-info"><div class="sound-title-row"><strong id="sound-title">Your soundtrack.</strong><canvas id="song-levels" aria-label="Six-band audio spectrum beside song title" hidden></canvas></div><span id="sound-artist">Play something in your favorite app.</span><small id="sound-status">WINDOWS MEDIA</small><button id="song-levels-toggle" class="song-levels-toggle" aria-pressed="false">Song visualizer</button></div>
        </section>
        <section class="ultra-map" id="ultra-map"><canvas id="deck-map" aria-label="BeamNG live navigation map"></canvas><div class="map-shade"></div><div class="map-location"><span class="map-location-symbol">${icon('route')}</span><div><strong id="deck-map-title">Your world, in view.</strong><span id="deck-map-subtitle">Connect the map companion</span></div></div><div class="map-compass" id="map-compass">N</div><div class="map-empty" id="map-empty"><span>${icon('route')}</span><strong>The road starts here.</strong><p>Install the companion for BeamNG’s live roads,<br>vehicle position, and active navigation route.</p></div><button class="map-dimension" id="map-dimension" aria-label="Atlas 3D perspective" aria-pressed="false">3D</button><div class="map-zoom"><button id="map-zoom-in" aria-label="Zoom map in">+</button><button id="map-zoom-out" aria-label="Zoom map out">−</button></div><span class="map-source" id="map-source">BEAMNG ROAD NETWORK</span><div class="map-live-dot" id="map-live-dot"></div></section>
        <section class="ultra-dial rev-dial" aria-label="Engine RPM"><svg viewBox="0 0 340 340"><defs><linearGradient id="ultra-rev-gradient" x2="1" y2="1"><stop stop-color="#91e1bc"/><stop offset="1" stop-color="#36a26d"/></linearGradient></defs><circle cx="170" cy="170" r="148" class="ultra-ring-track"/><circle cx="170" cy="170" r="148" class="ultra-ring-fill rev-ring" id="ultra-rpm-ring"/></svg><div class="ultra-dial-value"><span class="ultra-dial-caption">ENGINE</span><strong id="ultra-rpm">—</strong><span class="ultra-unit">× 1000 rpm</span><span class="ultra-dial-detail"><b id="ultra-gear">—</b><span id="ultra-temp">—°C</span></span></div></section>
      </div>
      <div class="ultra-bottom"><div class="ultra-vehicle"><span class="ultra-vehicle-symbol">${icon('car')}</span><div><strong id="ultra-vehicle">BeamNG.drive</strong><span id="ultra-system">Ready for your next drive</span></div></div><div id="ultra-media-slot"></div><div class="ultra-journey"><strong id="ultra-trip">0.0 mi</strong><span id="ultra-time">00:00 this drive</span></div></div>
    </section>
    <section class="vivace-deck" id="vivace-deck" hidden><div class="vivace-heading"><span><b>CHERRIER</b><small>VIVACE S</small></span><span id="vivace-sync-status">WAITING FOR VEHICLE</span><span class="vivace-s">S</span></div><div class="vivace-cluster">${vivaceSVG()}</div><div class="vivace-bottom"><span id="vivace-warnings">SYSTEMS NORMAL</span><div id="vivace-media-slot"></div><span class="vivace-label">CHERRIER · DIGITAL COCKPIT</span></div></section>
    ${martinMarkup()}
    ${robobeatMarkup()}
    ${archMarkup()}
    ${m235Markup()}
    ${iadnuyhMarkup()}
    ${homosexualMarkup()}
    ${civettaMarkup()}
    ${teslaMarkup()}
    ${plaidMarkup()}
    <div id="sound-bottom-controls" class="sound-bottom-controls" role="group" aria-label="Ultra Sound playback controls" hidden><div class="sound-seek-row"><span id="sound-elapsed">0:00</span><input id="sound-seek" type="range" min="0" max="100" step="0.1" value="0" aria-label="Playback position"><span id="sound-duration">0:00</span></div></div>
    <div class="deck-media" id="deck-media"><div class="deck-song"><div class="deck-art" id="deck-art"><video id="deck-motion" muted loop playsinline disablepictureinpicture hidden></video><img id="deck-art-image" alt="Album artwork" hidden><span>${icon('music')}</span></div><div class="deck-track"><strong id="deck-track">Your soundtrack.</strong><span id="deck-artist">Play something in your favorite app.</span><div class="deck-track-progress"><i id="deck-track-progress"></i></div></div></div><canvas id="deck-levels" class="deck-levels" aria-label="Live six-band Now Playing visualizer, bass to highs" title="System audio · bass to highs" hidden></canvas><div class="deck-transport"><button id="deck-previous" aria-label="Previous track">${icon('previous')}</button><button id="deck-play" class="deck-play" aria-label="Play or pause">${icon('play')}</button><button id="deck-next" aria-label="Next track">${icon('next')}</button></div></div>`;
    this.ids = Object.fromEntries([...root.querySelectorAll('[id]')].map(e=>[e.id,e]));
    this.ids['ultra-media-slot'].append(this.ids['sound-bottom-controls']);
    this.ids['sound-seek'].oninput=()=>{this.seeking=true;this.text('sound-elapsed',durationLabel(this.seekDuration*Number(this.ids['sound-seek'].value)/100));};
    this.ids['sound-seek'].onchange=()=>{this.seeking=false;if(!this.ids['sound-seek'].disabled)actions.seek?.(this.seekDuration*Number(this.ids['sound-seek'].value)/100);};
    this.ids['sound-seek'].onblur=this.ids['sound-seek'].onpointercancel=()=>{this.seeking=false;};
    this.bassPulse=new BassPulse();this.flash=document.createElement("div");this.flash.className="bass-screen-flash";this.flash.setAttribute("aria-hidden","true");root.append(this.flash);
    this.unlockSound=new UnlockSound();this.robobeat=new RobobeatView(this.ids,this.unlockSound);this.martin=new MartinView(this.ids,actions);
    this.tesla=new TeslaDecks(this.ids,actions);this.plaid=new PlaidView(this.ids,actions,new PlanarG());
    this.motionPlayers=[new MotionArtwork(this.ids['sound-motion'],actions.animationFailed),new MotionArtwork(this.ids['deck-motion'],actions.animationFailed)];
    this.palette=DEFAULT_PALETTE;this.paletteSource=null;this.paletteRequest=0;
    this.levels = new AudioCanvas(this.ids['sound-canvas'],6);
    this.barLevels = new AudioCanvas(this.ids['deck-levels'],6);
    this.songLevels = new AudioCanvas(this.ids['song-levels'],6);
    this.ids['civetta-page'].onchange=e=>actions.civettaPage(e.target.value);

    this.ids['song-levels-toggle'].onclick=()=>actions.songVisualizer();
    this.audio = new AudioCanvas(this.ids['sound-canvas']);
    this.ids['sound-art-button'].onclick=()=>actions.audioView('artwork');
    this.ids['sound-visualizer-button'].onclick=()=>actions.audioView('visualizer');
    this.map = new MapCanvas(this.ids['deck-map']);
    this.ids['deck-previous'].onclick = () => actions.playback('previous'); this.ids['deck-play'].onclick = () => actions.playback('toggle'); this.ids['deck-next'].onclick = () => actions.playback('next');
    this.ids['map-zoom-in'].onclick = () => actions.zoom(1.25); this.ids['map-zoom-out'].onclick = () => actions.zoom(.8);
    this.ids['map-dimension'].onclick=()=>actions.atlasView();
    this.ids['map-compass'].onclick = () => actions.compass();
    this.deck = null; this.lastMedia = ''; this.slowAt = 0;
  }
  text(id, value) { const e=this.ids[id]; if (e.textContent!==String(value)) e.textContent=value; }
  update({ settings, data, map, media, audio, animation, rpm, speed, maxRpm, trip, now }) {
    const deck = resolveDeck(settings,data);
    for(const view of [this.audio,this.levels,this.barLevels,this.songLevels,this.martin.levels])view.motionAmount=settings.visualizerMotion??100;
    this.flash.style.opacity=String(this.bassPulse.step(this.unlockSound.spectrum()||audio,now,settings.robobeatUnlocked===true&&settings.bassFlash===true&&(!settings.demo||this.unlockSound.playing)));
    for(const player of this.motionPlayers)player.update(animation,media,deck!=='classic'&&!settings.demo&&settings.animatedArtwork);
    if (deck==='classic') { this.root.hidden=true; this.renderMedia(media,settings.demo); return; }
    this.root.hidden=false;
    this.root.dataset.atlasView=settings.atlasView||'2d';
    this.ids['map-dimension'].hidden=deck!=='atlas';this.ids['map-dimension'].setAttribute('aria-pressed',String(settings.atlasView==='3d'));this.text('map-dimension',settings.atlasView==='3d'?'2D':'3D');
    this.root.dataset.mapAppearance=settings.mapAppearance === 'light' ? 'light' : 'dark';
    if (deck!==this.deck) {
      this.deck=deck; this.root.dataset.deck=deck;
      if(this.deckBefore==='robobeat'&&deck!=='robobeat')this.unlockSound.stop();this.deckBefore=deck;this.ids['robobeat-deck'].hidden=deck!=='robobeat';this.ids['martin-deck'].hidden=deck!=='martin';this.ids['arch-deck'].hidden=deck!=='arch';this.ids['m235-deck'].hidden=deck!=='m235';
      this.ids['plaid-track-deck'].hidden=deck!=='plaid-track';
      this.ids['model-s-deck'].hidden=deck!=='model-s';this.ids['model-three-deck'].hidden=deck!=='model-three';
      this.ids['ultra-deck'].hidden=['plaid-track','martin','robobeat','arch','m235','model-s','model-three','civetta','vivace','iadnuyh','homosexual'].includes(deck); this.ids['iadnuyh-deck'].hidden=deck!=='iadnuyh'; this.ids['homosexual-deck'].hidden=deck!=='homosexual'; this.ids['civetta-deck'].hidden=deck!=='civetta'; this.planarG.reset(); this.ids['vivace-deck'].hidden=deck!=='vivace';
      this.ids[deck==='plaid-track'?'plaid-media-slot':deck==='martin'?'martin-media-slot':deck==='robobeat'?'robobeat-media-slot':deck==='arch'?'arch-media-slot':deck==='m235'?'m235-media-slot':deck==='model-s'?'model-s-media-slot':deck==='model-three'?'model-three-media-slot':deck==='civetta'?'civetta-media-slot':deck==='homosexual'?'homosexual-media-slot':deck==='iadnuyh'?'iadnuyh-media-slot':deck==='vivace'?'vivace-media-slot':'ultra-media-slot'].append(this.ids['deck-media']);
    }
    const sound=deck==='sound';this.ids['sound-bottom-controls'].hidden=!sound;
    const transport=this.ids['deck-play'].closest('.deck-transport'),destination=sound?this.ids['sound-bottom-controls']:this.ids['deck-media'];
    if(transport.parentElement!==destination){if(sound)destination.prepend(transport);else destination.append(transport);}
    const barVisualizer=!sound;
    this.ids['deck-media'].dataset.view='visualizer';
    this.ids['deck-levels'].hidden=!barVisualizer;
    if(barVisualizer)this.barLevels.draw(audio,now,settings.demo,media.playing);
    if(['model-s','model-three'].includes(deck))this.tesla.update({deck,settings,data,map,rpm,speed,now});
    if(deck==='plaid-track')this.plaid.update({settings,data,map,rpm,speed,maxRpm,trip,now});
    if(deck==='martin')this.martin.update({settings,data,rpm,speed,maxRpm,map,media,audio,now,trip},this.palette);
    if(deck==='robobeat')this.robobeat.update({settings,data,rpm,speed,maxRpm,audio,media,now});
    if(deck==='arch')updateArch(this.ids,{settings,data,rpm,speed,maxRpm});
    if(deck==='m235')updateM235(this.ids,{settings,data,rpm,speed,maxRpm});
    if(deck==='civetta')updateCivetta(this.ids,{settings,data,map,rpm,speed,now},this.planarG);
    if(deck==='homosexual')updateHomosexual(this.ids,{settings,data,map,rpm,speed,maxRpm,trip,now},this.planarG);
    if(deck==='iadnuyh')updateIadnuyh(this.ids,{settings,data,map,rpm,speed,maxRpm});
    const connected = data.connected;
    const mode=resolveDriveMode(data,settings.demo?settings.demoDriveMode:null);
    this.root.style.setProperty('--mode-color',mode.color); this.root.style.setProperty('--mode-base',mode.base);
    this.root.dataset.mode=mode.key;
    this.text('ultra-speed',connected?Math.round(speed):'—'); this.text('ultra-rpm',connected?(rpm/1000).toFixed(1):'—');
    this.text('v-speed',connected?Math.round(speed):'—'); this.text('v-unit',settings.units==='kmh'?'KM/H':'MPH');
    this.ids['ultra-speed-ring'].style.strokeDashoffset=String(930*(1-clamp(speed/(settings.units==='kmh'?280:180),.08,1)));
    this.ids['ultra-rpm-ring'].style.strokeDashoffset=String(930*(1-clamp(rpm/maxRpm,.08,1)));
    this.ids['v-rpm-needle'].style.transform=`rotate(${-clamp(rpm/8000,0,1)*165}deg)`;
    this.ids['v-speed-needle'].style.transform=`rotate(${clamp(speed/(settings.units==='kmh'?320:200),0,1)*165}deg)`;
    this.ids['ultra-map'].hidden=['sound','levels'].includes(deck); this.ids['sound-center'].hidden=!['sound','levels'].includes(deck);

    if(['sound','levels'].includes(deck)) {
      const visual=deck==='levels'||settings.audioView==='visualizer';
      this.ids['sound-switch'].hidden=deck!=='sound';
      this.ids['song-levels-toggle'].hidden=deck!=='sound';
      this.ids['song-levels-toggle'].setAttribute('aria-pressed',String(!!settings.songVisualizer));
      this.ids['song-levels'].hidden=deck!=='sound'||!settings.songVisualizer;
      if(settings.songVisualizer&&deck==='sound')this.songLevels.draw(audio,now,settings.demo,media.playing);
      this.applyGaugePalette(deck);
      this.ids['sound-artwork'].hidden=visual;this.ids['sound-canvas'].hidden=!visual;
      this.ids['sound-art-button'].setAttribute('aria-pressed',String(!visual));this.ids['sound-visualizer-button'].setAttribute('aria-pressed',String(visual));
      if(visual)(deck==='levels'?this.levels:this.audio).draw(audio,now,settings.demo,media.playing);
      const animatedCover=this.motionPlayers[0].ready;
      this.ids['sound-motion-label'].hidden=!animatedCover;
      this.text('sound-motion-label',animation?.source==='apple'?'APPLE MUSIC':'LOCAL CANVAS CLIP');
      const coverCaption=animatedCover?(animation?.source==='apple'?'APPLE MUSIC · ANIMATED COVER':'LOCAL CANVAS CLIP'):'WINDOWS MEDIA · ALBUM ART';
      const fresh=audio?.available && Date.now()-audio.updatedAt<600;
      this.text('sound-status',settings.demo?'DEMO · SIMULATED MEDIA':!visual&&!settings.songVisualizer?coverCaption:audio?.error?'AUDIO UNAVAILABLE · SWITCH TO ART AND BACK TO RETRY':audio?.starting?'CONNECTING TO AUDIO OUTPUT':fresh?audio.bands?.some(v=>v>.025)?settings.excludeBeamngAudio===false?'SYSTEM AUDIO · LIVE':'MUSIC AUDIO · LIVE':'WAITING FOR MUSIC':'CONNECTING TO AUDIO OUTPUT');
    }
    if (!['martin','robobeat','arch','m235','model-s','model-three','civetta','homosexual','iadnuyh','vivace','sound','levels'].includes(deck)) this.map.draw(map,{...settings,atlasView:deck==='atlas'?settings.atlasView:'2d'},now);
    if(!['sound','levels'].includes(deck))this.applyGaugePalette(deck);
    if(now-this.slowAt<90)return; this.slowAt=now;
    this.text('ultra-unit',settings.units==='kmh'?'km/h':'mph');
    this.text('ultra-fuel',connected&&Number.isFinite(data.fuel)?`${Math.round(data.fuel*100)}% fuel`:'Fuel —');
    this.text('ultra-gear',connected?(data.selectedGear||gearLabel(data.gear)):'—');
    this.text('ultra-temp',connected&&Number.isFinite(data.engineTemp)?`${Math.round(data.engineTemp)}°C`:'—°C');
    this.text('ultra-drive-mode',settings.demo?'DEMO DRIVE':mode.available?mode.label:connected?'CONNECTED TO BEAMNG':'YOUR DRIVE, BEAUTIFULLY.');
    this.text('ultra-scene-status',settings.demo?'SIMULATED DATA':connected?'LIVE VEHICLE DATA':'WAITING FOR BEAMNG');
    this.text('ultra-vehicle',connected?(data.vehicleName||'BeamNG.drive'):'BeamNG.drive');
    this.text('ultra-system',!connected?'Ready for your next drive':data.lights?.handbrake?'Parking brake applied':data.fuel<.1?'Low fuel':'Enjoy the drive.');
    this.text('ultra-trip',`${(trip.meters/(settings.units==='kmh'?1000:1609.344)).toFixed(1)} ${settings.units==='kmh'?'km':'mi'}`); this.text('ultra-time',`${durationLabel(trip.seconds)} this drive`);
    const ready=!!map?.roads?.length&&!!map?.position;
    this.ids['map-empty'].hidden=ready;
    this.text('deck-map-title',ready?(settings.demo?'A little room to explore.':titleCase(map.levelName||map.mapId)):'Your world, in view.');
    this.text('deck-map-subtitle',settings.demo?'Demo map · sample roads':ready?map.connected?(map.route?.length>1?'Following your in-game route':'Live roads · vehicle position'):'Map signal lost':'Connect the map companion');
    this.text('map-source',settings.demo?'DEMO MAP · NOT GAME ROADS':ready?map.connected?map.buildings?.length?'BEAMNG ROADS · BUILDING OUTLINES':'BEAMNG ROAD NETWORK':'LAST MAP · DISCONNECTED':'BEAMNG ROAD NETWORK');
    this.ids['map-live-dot'].classList.toggle('live',!!map?.connected);
    this.text('map-compass',settings.mapHeadingUp?'↑':'N');
    this.text('v-mode-label',mode.available?mode.label:'—');
    this.text('v-gear',connected?(data.selectedGear||gearLabel(data.gear)):'—');
    this.text('v-ambient',connected&&Number.isFinite(data.ambientTemp)?`${Math.round(settings.units==='mph'?data.ambientTemp*9/5+32:data.ambientTemp)}°${settings.units==='mph'?'F':'C'}`:'—');
    this.text('vivace-sync-status',settings.demo?`DEMO · ${mode.label}`:!connected?'NO VEHICLE SIGNAL':mode.available?`LIVE · ${mode.label}`:'ENABLE COMPANION TO SYNC DRIVE MODE');
    this.text('v-system',mode.key==='off'?'ESC TCS OFF':data.lights?.traction?'ESC TCS':'');
    this.ids['v-brake'].style.opacity=connected&&data.lights?.handbrake?'1':'0';
    this.ids['v-fuel-needle'].style.transform=`rotate(${-100+200*clamp(data.fuel||0,0,1)}deg)`;
    this.ids['v-temp-needle'].style.transform=`rotate(${clamp(((data.engineTemp||50)-50)/80,0,1)*200-100}deg)`;
    this.text('v-odometer',connected&&Number.isFinite(data.odometer)?`${(data.odometer/(settings.units==='kmh'?1000:1609.344)).toFixed(1)} ${settings.units==='kmh'?'km':'mi'}`:'ODO —');
    this.text('v-trip',`${(trip.meters/(settings.units==='kmh'?1000:1609.344)).toFixed(1)} ${settings.units==='kmh'?'km':'mi'}`);
    this.text('vivace-warnings',!connected?'WAITING FOR BEAMNG':data.lights?.handbrake?'PARKING BRAKE':data.fuel<.1?'LOW FUEL':'');
    this.root.querySelectorAll('[data-speed-tick]').forEach(e=>{e.textContent=Math.round(Number(e.dataset.speedTick)*(settings.units==='kmh'?320:200));});
    this.renderMedia(media,settings.demo);
  }
  applyGaugePalette(deck) {
    const colors=['sound','levels'].includes(deck)?this.palette:null;
    const key=colors?.join(',')||'original';if(key===this.gaugePaletteKey)return;this.gaugePaletteKey=key;
    for(const [id,fallback] of [['ultra-speed-gradient',['#7ee1fc','#3c8ce8']],['ultra-rev-gradient',['#91e1bc','#36a26d']]]){
      this.root.querySelectorAll(`#${id} stop`).forEach((stop,i)=>stop.setAttribute('stop-color',colors?colors[i===0?0:2]:fallback[i]));
    }
  }
  renderMedia(media,demo) {
    this.seekDuration=Number.isFinite(media.duration)&&media.duration>0?media.duration:0;
    this.ids['sound-seek'].disabled=!media.available||!media.canSeek||!this.seekDuration||typeof this.actions.seek!=='function';
    this.ids['sound-seek'].title=this.ids['sound-seek'].disabled?'Seeking is unavailable for this player':'Seek in the current track';
    this.text('sound-duration',durationLabel(this.seekDuration));
    if(!this.seeking){this.ids['sound-seek'].value=this.seekDuration?clamp((media.position||0)/this.seekDuration*100,0,100):0;this.text('sound-elapsed',durationLabel(media.position||0));}

    const key=[media.title,media.artist,media.playing,media.available,media.canNext,media.canToggle,media.canPrevious,demo].join('|');
    if(key!==this.lastMedia||media.artwork!==this.lastArtwork){
      this.lastArtwork=media.artwork;
      this.lastMedia=key;
      this.text('sound-title',media.available?media.title||'Untitled track':'Your soundtrack.'); this.text('sound-artist',media.available?media.artist||'Windows media':'Play something in your favorite app.');
      this.text('deck-track',media.available?media.title||'Untitled track':'Your soundtrack.'); this.text('deck-artist',media.available?media.artist||'Windows media':'Play something in your favorite app.');
      this.ids['deck-play'].innerHTML=icon(media.playing?'pause':'play');
      this.ids['deck-play'].disabled=!media.available||!media.canToggle; this.ids['deck-next'].disabled=!media.available||!media.canNext; this.ids['deck-previous'].disabled=!media.available||!media.canPrevious;
      const safe=typeof media.artwork==='string'&&/^data:image\/(png|jpeg|webp|bmp|gif);base64,[A-Za-z0-9+/=]+$/.test(media.artwork)&&media.artwork.length<1500000;
      const source=safe?media.artwork:null;
      if(source!==this.paletteSource){this.paletteSource=source;const request=++this.paletteRequest;artworkPalette(source).catch(()=>[...DEFAULT_PALETTE]).then(palette=>{if(request!==this.paletteRequest)return;this.palette=palette;for(const view of [this.audio,this.levels,this.songLevels,this.barLevels])view.palette=palette;palette.forEach((color,i)=>this.root.style.setProperty(`--album-${i+1}`,color));this.root.dataset.palette=source?'artwork':'default';});}
      this.ids['sound-art-image'].hidden=!safe;this.ids['sound-art-placeholder'].hidden=safe;
      if(safe)this.ids['sound-art-image'].src=media.artwork;else this.ids['sound-art-image'].removeAttribute('src');
      this.ids['deck-art-image'].hidden=!safe;
      if(safe)this.ids['deck-art-image'].src=media.artwork;else this.ids['deck-art-image'].removeAttribute('src');
      this.ids['deck-art'].classList.toggle('demo',demo);
    }
    this.ids['deck-track-progress'].style.width=`${media.duration?clamp(media.position/media.duration*100,0,100):0}%`;
  }
}
function titleCase(value){return value.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}

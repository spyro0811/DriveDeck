import {vehicleVisual} from './vehicle-identity.mjs';
import {clamp,gearLabel} from './model.mjs';
import {MapCanvas} from './map.mjs';
import {AudioCanvas} from './audio.mjs';
const point=(r,a)=>[180+r*Math.cos(a*Math.PI/180),180+r*Math.sin(a*Math.PI/180)];
// Start the restrained tail at the scale's far end, then fade through zero
// into a flat white instrument surface. Only the live portion is revealed.
export function martinSweepOpacity(angle,ratio){
 if(!Number.isFinite(ratio)||ratio<=0||angle>140+clamp(ratio,0,1)*260)return 0;
 const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t);};
 return angle<140?.14*smooth((angle-40)/100):.14+.86*smooth((angle-140)/50);
}
// Rasterize the static angular fade once; SVG owns all placement and clipping.
// Avoid foreignObject: WebKit can composite its HTML canvas outside the dial.
let whiteSurface;
function martinSurface(){
 if(whiteSurface)return whiteSurface;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
 const ctx=canvas.getContext('2d');ctx.scale(1024/360,1024/360);
 const gradient=ctx.createConicGradient(40*Math.PI/180,180,180);
 for(let angle=40;angle<=190;angle+=10)gradient.addColorStop((angle-40)/360,`rgba(244,245,243,${martinSweepOpacity(angle,1)})`);
 gradient.addColorStop(1,'#f4f5f3');ctx.strokeStyle=gradient;ctx.lineWidth=52;ctx.beginPath();ctx.arc(180,180,125,40*Math.PI/180,400*Math.PI/180);ctx.stroke();
 whiteSurface=canvas.toDataURL('image/png');return whiteSurface;
}
function drawMartinSweep(image,ratio){
 if(!image.getAttribute('href'))image.setAttribute('href',martinSurface());
 image.style.opacity=ratio>0?'1':'0';
 const clip=image.ownerSVGElement.querySelector('[data-martin-sweep-mask]');
 clip.style.strokeDasharray=`${(100+clamp(ratio,0,1)*260)/360*100} 100`;
}
function dial(kind){
 let marks='';
 for(let i=0;i<=80;i++){
  const ratio=i/80,major=i%10===0,medium=i%5===0,a=140+ratio*260;
  const p=point(major?144:medium?147:150,a),q=point(157,a);
  marks+=`<path d="M${p}L${q}" class="martin-tick ${major?'major':''}" data-martin-${kind}-mark="${ratio}"/>`;
  if(major){const l=point(130,a);marks+=`<text x="${l[0]}" y="${l[1]}" class="martin-number" data-martin-${kind}-tick="${ratio}">${kind==='rpm'?i/10:i/10*20}</text>`;}
 }
 return `<div class="martin-dial"><svg viewBox="0 0 360 360" role="img" aria-label="${kind==='speed'?'Speedometer':'Tachometer'}">
 <defs><radialGradient id="martin-${kind}-dial-shade" cx=".46" cy=".35" r=".7"><stop stop-color="#17241e"/><stop offset=".72" stop-color="#101b16"/><stop offset="1" stop-color="#060b09"/></radialGradient>
 <linearGradient id="martin-${kind}-rim" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="#59625c"/><stop offset=".35" stop-color="#202923"/><stop offset=".8" stop-color="#47534a"/><stop offset="1" stop-color="#222b25"/></linearGradient>

 <mask id="martin-${kind}-surface-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="360" height="360"><circle cx="180" cy="180" r="125" fill="none" stroke="white" stroke-width="52.5" transform="rotate(40 180 180)" pathLength="100" data-martin-sweep-mask="${kind}"/></mask>
 <radialGradient id="martin-${kind}-center-shade"><stop stop-color="#060908"/><stop offset=".8" stop-color="#030605"/><stop offset="1" stop-color="#0c1510"/></radialGradient></defs>
 <circle cx="180" cy="180" r="164" class="martin-outer" stroke="url(#martin-${kind}-rim)"/>
 <circle cx="180" cy="180" r="161.5" class="martin-rim-inner"/>
 <circle cx="180" cy="180" r="159" fill="url(#martin-${kind}-dial-shade)"/>
 <image x="0" y="0" width="360" height="360" class="martin-sweep" id="martin-${kind}-sweep" mask="url(#martin-${kind}-surface-mask)" aria-hidden="true"/>
 <circle cx="180" cy="180" r="151" class="martin-arc-edge" id="martin-${kind}-edge" pathLength="100"/>
 ${marks}
 <circle cx="180" cy="180" r="101.5" class="martin-inner-bevel"/>
 <circle cx="180" cy="180" r="98" fill="url(#martin-${kind}-center-shade)"/>
 <circle cx="180" cy="180" r="94" class="martin-accent-track"/><circle cx="180" cy="180" r="94" class="martin-accent" id="martin-${kind}-accent" pathLength="100"/>
 <circle cx="180" cy="180" r="91.8" class="martin-accent-inner"/>
 <g id="martin-${kind}-needle" transform="rotate(140 180 180)"><path d="M280 178.7 331 180 280 181.3Z" fill="#eef1e9"/></g>
 <text x="180" y="197" class="martin-value" id="martin-${kind}-value">—</text>
 <text x="180" y="222" class="martin-unit" id="martin-${kind}-unit">${kind==='speed'?'MPH':'GEAR'}</text>
 <rect x="122" y="289" width="116" height="41" rx="8" fill="#060b08" fill-opacity=".96"/><text x="180" y="302" class="martin-support-label">${kind==='speed'?'FUEL':'ENGINE TEMP'}</text><text x="180" y="320" class="martin-detail" id="martin-${kind}-detail">—</text></svg></div>`;
}
export function martinVehicle(){return `<div class="martin-current-car"><svg id="martin-vehicle-asset" hidden role="img" aria-label="Current vehicle forward-facing view"><image id="martin-vehicle-image"/></svg><span id="martin-vehicle-empty">Waiting for vehicle</span><small id="martin-vehicle-name"></small></div>`;}
export function martinMarkup(){return `<section id="martin-deck" class="martin-deck" hidden><header><b>MARTIN</b><span id="martin-outside">—</span><label>CENTER DISPLAY<select id="martin-center" aria-label="Martin center display"><option value="artwork">Cover art + visualizer</option><option value="map">Map</option><option value="map3d">Map · 3D</option><option value="tires">Tire pressure</option></select></label></header><div class="martin-cluster">${dial('speed')}<div class="martin-middle"><section id="martin-art"><div class="martin-cover"><img id="martin-cover-image" alt="Album artwork" hidden><span id="martin-cover-empty">♪</span></div><strong id="martin-title">Your soundtrack.</strong><span id="martin-artist">Play something in your favorite app.</span><canvas id="martin-levels" aria-label="Album-colored audio visualizer"></canvas><div class="martin-center-transport"><button id="martin-previous" aria-label="Previous track">‹</button><button id="martin-play" aria-label="Play or pause">▶</button><button id="martin-next" aria-label="Next track">›</button></div></section><section class="martin-map-panel" id="martin-map-panel" hidden><canvas id="martin-map" aria-label="Live BeamNG map"></canvas><span id="martin-map-status">Waiting for BeamNG map</span><div class="martin-map-buttons"><button id="martin-zoom-in" aria-label="Zoom in">+</button><button id="martin-zoom-out" aria-label="Zoom out">−</button></div></section><section class="martin-tires" id="martin-tires" hidden><h2>TIRE PRESSURE</h2><div class="martin-tire-layout"><div><b id="martin-FL">—</b><small>FL · PSI</small><b id="martin-RL">—</b><small>RL · PSI</small></div>${martinVehicle()}<div><b id="martin-FR">—</b><small>FR · PSI</small><b id="martin-RR">—</b><small>RR · PSI</small></div></div><p id="martin-tire-status">Waiting for tire data</p></section></div>${dial('rpm')}</div><footer><span id="martin-status">WAITING FOR BEAMNG</span><div id="martin-media-slot"></div><span id="martin-trip">—</span></footer></section>`;}
export function martinPressures(data,demo=false){const values=demo?{FL:230,FR:230,RL:245,RR:245}:data.connected?data.tirePressures:null;return Object.fromEntries(['FL','FR','RL','RR'].map(key=>[key,Number.isFinite(values?.[key])&&values[key]>=0&&values[key]<=3000?(values[key]*.145037738).toFixed(1):'—']));}
export class MartinView{
 constructor(ids,actions){this.ids=ids;this.actions=actions;for(const [id,command]of [['previous','previous'],['play','toggle'],['next','next']])ids['martin-'+id].onclick=()=>actions.playback?.(command);this.map=new MapCanvas(ids['martin-map']);this.levels=new AudioCanvas(ids['martin-levels'],6);ids['martin-center'].onchange=e=>actions.martinCenter?.(e.target.value);ids['martin-zoom-in'].onclick=()=>actions.zoom(1.25);ids['martin-zoom-out'].onclick=()=>actions.zoom(.8);}
 updateVehicle(data,demo){
  const visual=vehicleVisual(demo?{vehicleId:'ardente'}:data),live=!!data.connected,asset=live?visual.asset:null,key=asset||'';
  const svg=this.ids['martin-vehicle-asset'],image=this.ids['martin-vehicle-image'],empty=this.ids['martin-vehicle-empty'];
  const name=live?(visual.label||data.vehicleName||data.vehicleId||'Current vehicle'):'Waiting for BeamNG';
  this.ids['martin-vehicle-name'].textContent=name;svg.setAttribute('aria-label',name+' · forward-facing view');
  if(key===this.vehicleKey){if(!asset)empty.textContent=live?'Vehicle image unavailable':'Waiting for vehicle';return;}
  this.vehicleKey=key;svg.toggleAttribute('hidden',!asset);empty.hidden=!!asset;
  if(!asset){image.removeAttribute('href');empty.textContent=live?'Vehicle image unavailable':'Waiting for vehicle';return;}
  svg.setAttribute('viewBox',visual.viewBox.join(' '));image.setAttribute('width',visual.width);image.setAttribute('height',visual.height);
  image.onerror=()=>{if(this.vehicleKey===key){svg.toggleAttribute('hidden',true);empty.hidden=false;empty.textContent='Vehicle image unavailable';}};
  image.setAttribute('href',new URL(`./assets/vehicles/${asset}.png`,import.meta.url).href);
 }
 update({data,settings,rpm,speed,maxRpm,map,media,audio,now,trip},palette){const live=!!data.connected,km=settings.units==='kmh',view=settings.martinCenter||'artwork',put=(id,v)=>{if(this.ids[id].textContent!==String(v))this.ids[id].textContent=v;};this.ids['martin-center'].value=view;this.ids['martin-deck'].dataset.center=view;for(const [name,ratio]of [['speed',live?clamp(speed/(km?260:160),0,1):0],['rpm',live?clamp(rpm/maxRpm,0,1):0]]){drawMartinSweep(this.ids[`martin-${name}-sweep`],ratio);for(const part of ['accent','edge'])this.ids[`martin-${name}-${part}`].style.strokeDasharray=`${ratio*72.22} 100`;this.ids['martin-deck'].querySelectorAll(`[data-martin-${name}-tick],[data-martin-${name}-mark]`).forEach(e=>{const value=Number(e.getAttribute(`data-martin-${name}-tick`)??e.getAttribute(`data-martin-${name}-mark`));e.classList.toggle('passed',ratio>0&&value<=ratio);e.classList.toggle('red',name==='rpm'&&value>=Math.min(1,(settings.redline||maxRpm*.85)/maxRpm));});this.ids[`martin-${name}-needle`].setAttribute('transform',`rotate(${140+ratio*260} 180 180)`);}this.ids['martin-deck'].querySelectorAll('[data-martin-speed-tick]').forEach(e=>e.textContent=Math.round(Number(e.dataset.martinSpeedTick)*(km?260:160)));this.ids['martin-deck'].querySelectorAll('[data-martin-rpm-tick]').forEach(e=>e.textContent=Number((Number(e.dataset.martinRpmTick)*maxRpm/1000).toFixed(1)));put('martin-speed-value',live?Math.round(speed):'—');put('martin-speed-unit',km?'KM/H':'MPH');put('martin-rpm-value',live?(data.selectedGear==='D'&&data.gear>0?data.gear:data.selectedGear||gearLabel(data.gear)):'—');put('martin-rpm-unit',live?(data.driveModeLabel||'GEAR'):'GEAR');put('martin-speed-detail',live&&Number.isFinite(data.fuel)?Math.round(data.fuel*100)+'%':'—');const temp=n=>live&&Number.isFinite(n)?Math.round(km?n:n*9/5+32)+'°'+(km?'C':'F'):'—';put('martin-rpm-detail',temp(data.engineTemp));put('martin-outside',temp(data.ambientTemp));put('martin-status',settings.demo?'DEMO · SIMULATED DATA':live?'LIVE VEHICLE DATA':'WAITING FOR BEAMNG');put('martin-trip',((trip?.meters||0)/(km?1000:1609.344)).toFixed(1)+(km?' KM':' MI'));
  this.ids['martin-art'].hidden=view!=='artwork';this.ids['martin-map-panel'].hidden=!['map','map3d'].includes(view);this.ids['martin-tires'].hidden=view!=='tires';
  if(view==='artwork'){this.ids['martin-play'].textContent=media.playing?'Ⅱ':'▶';this.ids['martin-play'].disabled=!media.available||!media.canToggle||!this.actions.playback;this.ids['martin-previous'].disabled=!media.available||!media.canPrevious||!this.actions.playback;this.ids['martin-next'].disabled=!media.available||!media.canNext||!this.actions.playback;put('martin-title',media.available?media.title||'Untitled track':'Your soundtrack.');put('martin-artist',media.available?media.artist||'':'Play something in your favorite app.');if(media.artwork!==this.rawCover){this.rawCover=media.artwork;this.safeCover=typeof media.artwork==='string'&&media.artwork.length<1500000&&/^data:image\/(png|jpeg|webp|bmp|gif);base64,[A-Za-z0-9+/=]+$/.test(media.artwork)?media.artwork:null;}const source=this.safeCover;if(source!==this.cover){this.cover=source;this.ids['martin-cover-image'].hidden=!source;this.ids['martin-cover-empty'].hidden=!!source;if(source)this.ids['martin-cover-image'].src=source;else this.ids['martin-cover-image'].removeAttribute('src');}this.levels.palette=palette;this.levels.draw(audio,now,settings.demo,media.playing);}
  else if(view==='tires'){this.updateVehicle(data,settings.demo);const pressures=martinPressures(data,settings.demo);for(const key of ['FL','FR','RL','RR'])put('martin-'+key,pressures[key]);put('martin-tire-status',settings.demo?'DEMO PRESSURES':Object.values(pressures).some(v=>v!=='—')?'LIVE · PSI':'Install the updated companion · tire data unavailable');}
  else{this.map.draw(map,{...settings,atlasView:view==='map3d'?'3d':'2d',mapAppearance:'dark'},now);put('martin-map-status',map?.connected&&map.roads?.length?(map.levelName||'LIVE NAVIGATION'):'Waiting for BeamNG map');}
 }
}

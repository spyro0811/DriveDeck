import { vehicleVisual } from './vehicle-identity.mjs';
import { clearStudioPreview } from './vehicle-matte.mjs';
import { gearLabel } from './model.mjs';
import { MapCanvas } from './map.mjs';
import { icon } from './icons.mjs';
export const isParked=data=>!!data.connected&&String(data.selectedGear||'').trim().toUpperCase()==='P';
const carFallback=`<svg viewBox="0 0 300 150" aria-label="Vehicle preview unavailable"><path d="M38 92 57 60 108 41H199L234 69 266 84 273 112H30Z" fill="currentColor" opacity=".3"/><path d="M77 64 114 48H191L217 70H69Z" fill="currentColor" opacity=".4"/><circle cx="81" cy="113" r="20" fill="#17191b" stroke="#79818a" stroke-width="5"/><circle cx="228" cy="113" r="20" fill="#17191b" stroke="#79818a" stroke-width="5"/></svg>`;
const drivingCar=`<div class="tesla-driving-car" id="ms-driving-car" hidden><svg id="ms-rear-asset" hidden role="img" aria-label="Current vehicle forward-facing view"><image id="ms-rear-image"/></svg><svg id="ms-rear-fallback" viewBox="0 0 260 340" role="img" aria-label="Forward-facing vehicle illustration, viewed from behind"><defs><linearGradient id="rear-body" x2="1" y2=".3"><stop stop-color="#747c85"/><stop offset=".25" stop-color="#d9dde1"/><stop offset=".55" stop-color="#f0f1f2"/><stop offset="1" stop-color="#929aa2"/></linearGradient><linearGradient id="rear-glass" x2=".2" y2="1"><stop stop-color="#141b23"/><stop offset=".45" stop-color="#343e49"/><stop offset="1" stop-color="#0b1016"/></linearGradient></defs><path d="M43 102H59V178H43ZM201 102H217V178H201ZM37 233H56V303H37ZM204 233H223V303H204Z" fill="#14171b"/><path d="M65 51Q130 20 195 51L213 164 220 278Q219 312 196 320H64Q41 312 40 278L47 164Z" fill="url(#rear-body)" stroke="#69717c" stroke-width="2"/><path d="M69 66Q130 41 191 66L193 107Q130 91 67 107Z" fill="#6f7881"/><path d="M65 111Q130 94 195 111L199 201Q130 215 61 201Z" fill="url(#rear-glass)" stroke="#59636d" stroke-width="2"/><path d="M78 123 70 192M182 123 190 192" stroke="#939ca6" opacity=".32" stroke-width="3"/><path d="M62 211Q130 224 198 211L209 259Q130 277 51 259Z" fill="#333c46" stroke="#929aa3" stroke-width="2"/><path d="M48 266Q130 286 212 266L210 294Q130 313 50 294Z" fill="#b6bdc4"/><path d="M47 266 89 274 87 282 47 275ZM213 266 171 274 173 282 213 275Z" fill="#d43b39"/><path d="M55 301Q130 322 205 301" fill="none" stroke="#434b54" stroke-width="7"/><rect x="111" y="287" width="38" height="13" rx="2" fill="#d8dbde"/><path d="M55 146 57 235M205 146 203 235" stroke="#f7f8fa" opacity=".65" stroke-width="2"/><path d="M51 144 31 154V168L50 164ZM209 144 229 154V168L210 164Z" fill="#b0b7bf"/></svg></div>`;
function drivingVehicle(id){return drivingCar.replaceAll('ms-',id+'-').replaceAll('rear-body',id+'-rear-body').replaceAll('rear-glass',id+'-rear-glass');}
function vehicle(id){return `<div class="tesla-car" id="${id}-car"><img id="${id}-image" alt="Current BeamNG vehicle model preview" hidden><div class="tesla-fallback" id="${id}-fallback">${carFallback}</div></div>`;}
function gears(id){return `<div class="tesla-gears" id="${id}-gears">${['P','R','N','D'].map(g=>`<span data-gear="${g}">${g}</span>`).join('')}<b id="${id}-gear"></b></div>`;}
export function teslaMarkup(){return `
<section id="model-s-deck" class="model-s-deck tesla-deck" hidden>
 <div class="ms-stage" id="ms-stage"><div class="ms-lanes" aria-hidden="true"><svg viewBox="0 0 800 440" preserveAspectRatio="none"><defs><linearGradient id="ms-road-fade" x2="0" y2="1"><stop stop-color="#63676d" stop-opacity="0"/><stop offset="1" stop-color="#63676d" stop-opacity=".6"/></linearGradient></defs><path d="M348 25 210 440M452 25 590 440" stroke="url(#ms-road-fade)" stroke-width="5" fill="none"/></svg></div>
 <div class="ms-car-area">${vehicle('ms')}${drivingVehicle('ms')}<div class="tesla-car-label"><strong id="ms-name">Waiting for BeamNG</strong><small id="ms-preview-note"></small></div></div>
 <div class="ms-speed"><span id="ms-mode"></span><strong id="ms-speed">—</strong><small id="ms-unit">MPH</small><div class="ms-rpm"><b id="ms-rpm">—</b><span>×1000 RPM</span></div></div>
 <div class="ms-park-label" id="ms-park-label" hidden>Parked</div><div class="ms-indicators" id="ms-indicators"></div></div>
 <div class="ms-status"><div><span class="tesla-energy"><i id="ms-energy-fill"></i></span><b id="ms-fuel">—</b><span id="ms-temp">—</span></div><div><time id="ms-time"></time>${gears('ms')}</div></div>
 <footer class="tesla-footer"><div id="model-s-media-slot"></div></footer>
</section>
<section id="model-three-deck" class="model-three-deck tesla-deck" hidden>
 <div class="mt-top"><b>MODEL THREE</b><span id="mt-name">Waiting for BeamNG</span><span id="mt-temp">—</span><time id="mt-time"></time></div>
 <div class="mt-main"><section class="mt-vehicle" id="mt-vehicle"><div class="mt-instruments"><div><strong id="mt-speed">—</strong><span id="mt-unit">MPH</span></div><div class="mt-revs"><strong id="mt-rpm">—</strong><span>×1000 RPM</span></div></div>
 <div class="mt-car-area">${vehicle('mt')}${drivingVehicle('mt')}<small id="mt-preview-note"></small></div><div class="mt-vehicle-bottom">${gears('mt')}<span id="mt-fuel">Fuel —</span><span id="mt-state">Waiting for vehicle</span></div></section>
 <section class="mt-map"><canvas id="mt-map" aria-label="BeamNG live navigation map"></canvas><div class="mt-route"><span>${icon('route')}</span><div><strong id="mt-map-title">Navigation</strong><small id="mt-map-state">Waiting for BeamNG map</small></div></div><div class="mt-map-buttons"><button id="mt-compass" aria-label="Toggle map orientation">N</button><button id="mt-zoom-in" aria-label="Zoom map in">+</button><button id="mt-zoom-out" aria-label="Zoom map out">−</button></div></section></div>
 <footer class="mt-footer"><span class="mt-dock">${icon('car')}<span>DriveDeck</span></span><div id="model-three-media-slot"></div><span class="mt-footer-status" id="mt-mode">BEAMNG.DRIVE</span></footer>
</section>`;}
export class TeslaDecks{
 constructor(ids,actions){this.ids=ids;this.map=new MapCanvas(ids['mt-map']);ids['mt-zoom-in'].onclick=()=>actions.zoom(1.25);ids['mt-zoom-out'].onclick=()=>actions.zoom(.8);ids['mt-compass'].onclick=()=>actions.compass();this.identity=null;this.request=0;this.preview=null;}
 text(id,value){const e=this.ids[id];if(e.textContent!==String(value))e.textContent=value;}
 async identityChanged(id){this.lastLookup=Date.now();const request=++this.request;this.preview=null;this.showImage(null);if(!id)return;try{const preview=await window.driveDeck?.vehiclePreview?.(id);if(request!==this.request)return;this.preview=preview?.id===id?preview:null;this.showImage(this.preview?.image);}catch{}}
 async showImage(src){
  const request=(this.imageRequest||0)+1;this.imageRequest=request;this.imageReady=false;
  for(const p of ['ms','mt']){this.ids[p+'-image'].hidden=true;this.ids[p+'-image'].removeAttribute('src');this.ids[p+'-fallback'].hidden=false;}
  if(!src)return;
  try{const clean=await clearStudioPreview(src);if(request!==this.imageRequest)return;for(const p of ['ms','mt']){const img=this.ids[p+'-image'];img.src=clean;img.hidden=false;this.ids[p+'-fallback'].hidden=true;img.onerror=()=>{img.hidden=true;this.ids[p+'-fallback'].hidden=false;};}this.imageReady=true;}catch{/* Keep the neutral illustration if the local preview cannot be decoded. */}
 }

 update({deck,settings,data,map,rpm,speed,now}){
  const id=data.connected&&!settings.demo?data.vehicleId:null,visual=vehicleVisual(data),identity=id?`${id}:${visual.key}`:null;if(identity!==this.identity||(id&&!this.preview?.image&&Date.now()-(this.lastLookup||0)>10000)){this.identity=identity;this.identityChanged(id);}
  const rear=!!id&&!!visual.asset;
  for(const prefix of ['ms','mt']){this.ids[prefix+'-rear-asset'].toggleAttribute('hidden',!rear);this.ids[prefix+'-rear-fallback'].toggleAttribute('hidden',rear);if(rear&&this.rearKey!==visual.key){this.ids[prefix+'-rear-asset'].setAttribute('viewBox',visual.viewBox.join(' '));this.ids[prefix+'-rear-image'].setAttribute('href',new URL(`./assets/vehicles/${visual.asset}.png`,import.meta.url).href);this.ids[prefix+'-rear-image'].setAttribute('width',visual.width);this.ids[prefix+'-rear-image'].setAttribute('height',visual.height);}}
  this.rearKey=visual.key;
  const p=deck==='model-s'?'ms':'mt',park=isParked(data),gear=data.connected?(data.selectedGear||gearLabel(data.gear)):'—';
  const name=data.connected?(visual.label||this.preview?.name||(!/^table:/.test(data.vehicleName||'')&&data.vehicleName)||data.vehicleId||'BeamNG vehicle'):'Waiting for BeamNG';
  this.text(p+'-name',name);this.text(p+'-speed',data.connected?Math.round(speed):'—');this.text(p+'-rpm',data.connected?(rpm/1000).toFixed(1):'—');this.text(p+'-unit',settings.units==='kmh'?'KM/H':'MPH');
  this.text(p+'-temp',data.connected&&Number.isFinite(data.ambientTemp)?`${Math.round(settings.units==='mph'?data.ambientTemp*9/5+32:data.ambientTemp)}°${settings.units==='mph'?'F':'C'}`:'—');
  this.text(p+'-time',new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}));
  this.ids[p+'-gears'].querySelectorAll('[data-gear]').forEach(e=>e.classList.toggle('selected',e.dataset.gear===gear));this.text(p+'-gear',['P','R','N','D'].includes(gear)?'':gear);
  for(const prefix of ['ms','mt']){this.ids[prefix+'-driving-car'].hidden=park||!data.connected;this.ids[prefix+'-car'].hidden=!park&&data.connected;}
  this.text(p+'-preview-note',!data.connected?'Connect the BeamNG companion':!id?'Enable Other UDP protocols in BeamNG, then reload the vehicle':'');
  const fuel=data.connected&&Number.isFinite(data.fuel)?`${Math.round(data.fuel*100)}%`:'—';
  this.text(p+'-fuel',p==='ms'?`${fuel} fuel`:`Fuel ${fuel}`);
  const mode=data.connected?(data.driveModeLabel||data.driveModeKey||''):'';this.text(p+'-mode',mode);
  if(p==='ms'){this.ids['ms-stage'].dataset.park=String(park);this.ids['ms-park-label'].hidden=!park;this.ids['ms-energy-fill'].style.width=`${data.connected?Math.max(0,Math.min(100,(data.fuel||0)*100)):0}%`;this.text('ms-indicators',data.connected?[data.lights?.handbrake?'PARK BRAKE':'',data.lights?.highbeam?'HIGH BEAM':'',data.lights?.abs?'ABS':''].filter(Boolean).join('   ·   '):'');}
  else{this.ids['mt-vehicle']?.setAttribute('data-park',String(park));this.text('mt-state',!data.connected?'No vehicle signal':park?'Parked':data.lights?.handbrake?'Parking brake':'Driving');const ready=!!map?.roads?.length&&!!map?.position;this.text('mt-map-title',map?.levelName||map?.mapId||'Navigation');this.text('mt-map-state',!ready?'Waiting for BeamNG map':!map.connected?'Map signal lost':map.route?.length>1?'Following your in-game route':'Live roads · vehicle position');this.text('mt-compass',settings.mapHeadingUp?'↑':'N');this.map.draw(map,{...settings,atlasView:'2d',mapAppearance:'light',mapTerrain:false},now);}
 }
}

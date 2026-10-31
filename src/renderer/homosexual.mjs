import { clamp, gearLabel } from './model.mjs';
const point=(x,y,r,a)=>[x+r*Math.cos(a*Math.PI/180),y+r*Math.sin(a*Math.PI/180)];
const arc=(x,y,r,a,b)=>`M${point(x,y,r,a)} A${r},${r} 0 ${Math.abs(b-a)>180?1:0} ${b>a?1:0} ${point(x,y,r,b)}`;
function scale(x,y,r,max,steps,kind){
 let out='';for(let i=0;i<=steps;i++){const a=145+i/steps*250,major=i%4===0;out+=`<path d="M${point(x,y,r-(major?17:9),a)}L${point(x,y,r,a)}" class="h-tick ${i>steps*.82?'h-hot':''}"/>`;if(major){const p=point(x,y,r-38,a);out+=`<text x="${p[0]}" y="${p[1]+7}" class="h-number" ${kind==='speed'?`data-h-speed="${i/steps}"`:''}>${Math.round(i/steps*max)}</text>`}}return out;
}
function housing(x,y,r){return `<circle cx="${x}" cy="${y}" r="${r+18}" fill="url(#h-bezel)" stroke="#41454a" stroke-width="3"/><circle cx="${x}" cy="${y}" r="${r+5}" fill="#0b0d10" stroke="#6d7174" stroke-width="3"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#h-face)"/><path d="M${x-r*.58} ${y-r*.8}Q${x+r*.95} ${y-r*1.08} ${x+r*.93} ${y+r*.35}L${x-r*.12} ${y-r*.1}Z" fill="url(#h-reflection)"/>`}
const needle=(id,x,y,r)=>`<g id="h-${id}-needle" class="h-needle" style="transform-origin:${x}px ${y}px"><path d="M${x-16} ${y-4}L${x+r} ${y-2}L${x+r+5} ${y}L${x+r} ${y+2}L${x-16} ${y+4}Z"/><circle cx="${x}" cy="${y}" r="10" fill="#181a1e" stroke="#777b7c" stroke-width="2"/></g>`;
export function homosexualMarkup(){return `<section class="homosexual-deck" id="homosexual-deck" hidden><div class="h-status"><span>Luce</span><span id="h-status">WAITING FOR BEAMNG</span></div><div class="h-cluster"><svg viewBox="0 0 1440 525" class="h-svg" role="img" aria-label="Luce three-dial analog instrument cluster"><defs><linearGradient id="h-bezel" x2=".3" y2="1"><stop stop-color="#73777a"/><stop offset=".3" stop-color="#25282c"/><stop offset=".7" stop-color="#121417"/><stop offset="1" stop-color="#565b5d"/></linearGradient><radialGradient id="h-face" cx=".4" cy=".3"><stop stop-color="#292b2c"/><stop offset=".62" stop-color="#101214"/><stop offset="1" stop-color="#030506"/></radialGradient><linearGradient id="h-reflection" x2=".7" y2="1"><stop stop-color="#ffffff42"/><stop offset="1" stop-color="#ffffff05"/></linearGradient></defs>
 <path d="M32 470V231Q80 128 270 127Q450-41 723 3Q981-42 1171 127Q1370 126 1408 231V470Q720 568 32 470Z" fill="#080a0c" stroke="#33383b" stroke-width="3"/>
 ${housing(720,238,207)}${housing(250,326,150)}${housing(1190,326,150)}
 ${scale(720,238,190,320,32,'speed')}${scale(250,326,134,100,40,'rpm')}
 <circle cx="720" cy="238" r="108" fill="#090b0dc0" stroke="#303336" stroke-width="1"/>
 ${needle('speed',720,238,174)}${needle('rpm',250,326,121)}
 <rect x="640" y="224" width="160" height="66" rx="9" fill="#07090bb8"/>
 <text x="720" y="276" class="h-speed" id="h-speed">—</text><text x="720" y="305" class="h-unit" id="h-unit">mph</text>
 <path d="${arc(720,260,161,37,143)}" class="h-fuel-track"/><path d="${arc(720,260,161,143,37)}" class="h-fuel" pathLength="100" id="h-fuel-arc"/>
 <text x="586" y="369" class="h-small">E</text><text x="853" y="369" class="h-small">F</text><text x="720" y="384" class="h-fuel-text" id="h-fuel">FUEL —</text><text x="720" y="412" class="h-small">1/2</text>
 <text x="250" y="337" class="h-monogram">rpm</text><text x="250" y="363" class="h-small">×100</text><text x="250" y="418" id="h-rpm" class="h-rpm">—</text>
 <g class="h-gears"><text x="419" y="92">P</text><text x="419" y="121">R</text><text x="419" y="150">N</text><circle cx="419" cy="180" r="22" fill="#d7dcd6"/><text x="419" y="189" id="h-gear" class="h-selected">—</text></g>
 <g transform="translate(1190 326)" class="h-g-grid"><circle r="102"/><circle r="51"/><path d="M-111 0H111M0-111V111"/>${[-1,-.5,.5,1].map(n=>`<path d="M${n*102}-6V6M-6 ${n*102}H6"/>`).join('')}<text x="0" y="-117">1</text><text x="0" y="130">1</text><text x="-120" y="7">1</text><text x="120" y="7">1</text><circle id="h-g-dot" r="6" fill="#ff9d47" stroke="none"/><text y="-70" class="h-g-title">G FORCE</text><text y="74" id="h-g-value">—</text><text y="95" class="h-estimate">ESTIMATED</text></g>
 <text x="250" y="500" id="h-warning" class="h-warning"></text><text x="720" y="490" id="h-trip" class="h-trip">TRIP 0.0 mi</text><text x="1190" y="500" id="h-temp" class="h-small">COOLANT —</text>
 </svg></div><div class="h-bottom"><div id="homosexual-media-slot"></div></div></section>`}
// Estimate planar acceleration from successive live speed/heading samples.
// This is not suspension/body G telemetry; resets reject respawns and signal gaps.
export class PlanarG {
 constructor(){this.reset()}
 reset(){this.last=null;this.value=null}
 update(data,map,now){
  if(!data.connected||!map?.connected||!Number.isFinite(data.speedMps)||!Number.isFinite(map.heading)){this.reset();return null}
  const sample={speed:Math.abs(data.speedMps),heading:map.heading,at:now,mapId:map.mapId,vehicle:data.vehicleId};
  const last=this.last;if(!last){this.last=sample;return null}const dt=(now-last.at)/1000;
  if(dt<=0){this.last=sample;this.value=null;return null}if(dt<.12)return this.value;
  this.last=sample;
  if(dt>.7||dt<=0||last.mapId!==sample.mapId||last.vehicle!==sample.vehicle){this.value=null;return null}
  const angle=((sample.heading-last.heading+540)%360-180)*Math.PI/180;
  const longitudinal=(sample.speed-last.speed)/dt/9.80665,lateral=(sample.speed+last.speed)/2*angle/dt/9.80665;
  if(Math.abs(longitudinal)>3||Math.abs(lateral)>3){this.value=null;return null}
  const blend=1-Math.exp(-dt/.22);this.value={longitudinal:(this.value?.longitudinal||0)+(longitudinal-(this.value?.longitudinal||0))*blend,lateral:(this.value?.lateral||0)+(lateral-(this.value?.lateral||0))*blend};return this.value;
 }
}
export function updateHomosexual(ids,{settings,data,map,rpm,speed,maxRpm,trip,now},estimator){
 const put=(id,value)=>{if(ids[id].textContent!==String(value))ids[id].textContent=value};const live=data.connected,km=settings.units==='kmh';
 put('h-speed',live?Math.round(speed):'—');put('h-unit',km?'km/h':'mph');put('h-rpm',live?`${Math.round(rpm)} rpm`:'—');
 ids['h-speed-needle'].style.transform=`rotate(${145+clamp(speed/(km?320:200),0,1)*250}deg)`;ids['h-rpm-needle'].style.transform=`rotate(${145+clamp(rpm/10000,0,1)*250}deg)`;
 for(const name of ['speed','rpm'])ids[`h-${name}-needle`].style.opacity=live?'1':'.15';
 ids['h-rpm-needle'].classList.toggle('h-redline',live&&rpm>=Math.min(maxRpm,settings.redline));
 document.querySelectorAll('[data-h-speed]').forEach(e=>{e.textContent=Math.round(Number(e.dataset.hSpeed)*(km?320:200))});
 put('h-gear',live?(data.selectedGear||gearLabel(data.gear)):'—');put('h-fuel',live&&Number.isFinite(data.fuel)?`${Math.round(data.fuel*100)}% FUEL`:'FUEL —');ids['h-fuel-arc'].style.strokeDasharray=`${live?clamp(data.fuel||0,0,1)*100:0} 100`;
 put('h-status',settings.demo?'DEMO · SIMULATED DATA':live?'LIVE VEHICLE DATA':'WAITING FOR BEAMNG');put('h-trip',`TRIP ${(trip.meters/(km?1000:1609.344)).toFixed(1)} ${km?'km':'mi'}`);
 put('h-temp',live&&Number.isFinite(data.engineTemp)?`COOLANT ${Math.round(km?data.engineTemp:data.engineTemp*9/5+32)}°${km?'C':'F'}`:'COOLANT —');
 put('h-warning',live?(data.lights?.handbrake?'Ⓟ PARKING BRAKE':data.fuel<.1?'LOW FUEL':data.lights?.oil?'OIL PRESSURE':data.lights?.battery?'BATTERY':''):'');
 const g=estimator.update(data,map,now);put('h-g-value',g?`${Math.hypot(g.lateral,g.longitudinal).toFixed(2)} g`:'—');ids['h-g-dot'].setAttribute('cx',g?clamp(g.lateral,-1,1)*102:0);ids['h-g-dot'].setAttribute('cy',g?-clamp(g.longitudinal,-1,1)*102:0);ids['h-g-dot'].style.opacity=g?'1':'.15';
}

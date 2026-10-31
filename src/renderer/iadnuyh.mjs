import { clamp, gearLabel } from './model.mjs';
const arc=(x,y,r,a,b)=>{const p=t=>[x+r*Math.cos(t*Math.PI/180),y+r*Math.sin(t*Math.PI/180)];return `M${p(a)} A${r},${r} 0 ${b-a>180?1:0} 1 ${p(b)}`};
export function iadnuyhMarkup(){
 const dial=(x,speed)=>`<g class="i-dial"><circle cx="${x}" cy="225" r="184" fill="none" stroke="${speed?'#1d4262':'#343839'}" stroke-width="2"/><circle cx="${x}" cy="225" r="157" fill="url(#i-${speed?'blue':'orange'})" stroke="${speed?'#2776ab':'#928978'}" stroke-width="2"/><path d="${arc(x,225,172,145,395)}" class="i-track"/><path id="i-${speed?'speed':'rpm'}-arc" d="${arc(x,225,172,145,395)}" pathLength="100" class="i-power ${speed?'i-blue':'i-orange'}"/><text x="${x}" y="245" class="i-value" id="i-${speed?'speed':'rpm'}">—</text><text x="${x}" y="282" class="i-unit" ${speed?'id="i-unit"':''}>${speed?'MPH':'x1000 rpm'}</text></g>`;
 const mini=(x,fuel)=>`<g class="i-mini"><path d="${arc(x,345,115,30,150)}" class="i-track"/><path id="i-${fuel?'fuel':'temp'}-arc" d="${arc(x,345,115,30,150)}" pathLength="100" class="i-mini-fill" transform="translate(${x*2} 0) scale(-1 1)"/>${[30,60,90,120,150].map(a=>{const p=r=>[x+r*Math.cos(a*Math.PI/180),345+r*Math.sin(a*Math.PI/180)];return `<path d="M${p(101)}L${p(105)}"/>`}).join('')}<text x="${x-101}" y="397">${fuel?'E':'C'}</text><text x="${x+101}" y="397">${fuel?'F':'H'}</text><text x="${x}" y="433" id="i-${fuel?'fuel':'temp'}">—</text></g>`;
 return `<section id="iadnuyh-deck" class="iadnuyh-deck" hidden><div class="i-status"><span>iadnuyh</span><span id="i-status">WAITING FOR BEAMNG</span></div><div class="i-cluster"><svg class="i-svg" viewBox="0 0 1440 510" role="img" aria-label="iadnuyh blue and orange instrument cluster"><defs><linearGradient id="i-blue" x1="0" y1="0" x2="0.25" y2="1"><stop stop-color="#198bdd"/><stop offset=".28" stop-color="#10588f"/><stop offset=".72" stop-color="#051728"/><stop offset="1" stop-color="#020915"/></linearGradient><linearGradient id="i-orange" x1="0" y1="0" x2=".2" y2="1"><stop stop-color="#b3a48c"/><stop offset=".3" stop-color="#625b50"/><stop offset=".75" stop-color="#1b1a19"/><stop offset="1" stop-color="#05070b"/></linearGradient><linearGradient id="i-strip"><stop stop-color="#07203c"/><stop offset=".5" stop-color="#0b3459"/><stop offset="1" stop-color="#092d4d"/></linearGradient></defs>
 ${dial(300,true)}${dial(1140,false)}${mini(300,true)}${mini(1140,false)}
 <g id="i-beam" class="i-beam"><path d="M717 24a14 14 0 0 0 0 23Zm-25 1h16m-20 7h20m-20 7h20m-16 7h16"/></g>
 <path d="M535 117H905" stroke="#345269" stroke-width="2"/><text x="720" y="153" id="i-route" class="i-route">No Route Set</text>
 <g transform="translate(720 280)"><g id="i-compass-rose"><circle r="62" fill="none" stroke="#5d7d8e" stroke-width="7"/>${Array.from({length:16},(_,i)=>`<path d="M0-67V-76" transform="rotate(${i*22.5})" stroke="#a9c6d5" stroke-width="3"/>`).join('')}<text y="-86" fill="#ff5447">N</text><text x="94" y="7">E</text><text y="104">S</text><text x="-94" y="7">W</text></g><circle r="33" fill="#97e5fa" stroke="#367c9e" stroke-width="4"/><path d="M0-22 17 16 0 8-17 16Z" fill="#176b9a"/></g>
 <rect x="525" y="429" width="390" height="62" rx="4" fill="url(#i-strip)"/><text x="552" y="469" id="i-ambient" class="i-strip-text">—°F</text><text x="885" y="471" id="i-gear" class="i-strip-text i-gear">—</text>
 <text x="300" y="494" id="i-warning" class="i-warning"></text><text x="1345" y="493" id="i-distance" class="i-distance">ODO —</text>
 </svg></div><div class="i-bottom"><div id="iadnuyh-media-slot"></div></div></section>`;
}
export function updateIadnuyh(ids,{settings,data,map,rpm,speed,maxRpm}){
 const put=(id,value)=>{if(ids[id].textContent!==String(value))ids[id].textContent=value};
 const live=data.connected,km=settings.units==='kmh',unit=km?'km':'mi';
 put('i-speed',live?Math.round(speed):'—');put('i-rpm',live?(rpm/1000).toFixed(1):'—');put('i-unit',km?'KM/H':'MPH');
 const progress=(id,value)=>{ids[id].style.strokeDasharray=`${clamp(value,0,1)*100} 100`;ids[id].style.opacity=live?'1':'0'};
 progress('i-speed-arc',speed/(km?280:180));progress('i-rpm-arc',rpm/maxRpm);
 progress('i-fuel-arc',Number.isFinite(data.fuel)?data.fuel:0);progress('i-temp-arc',Number.isFinite(data.engineTemp)?(data.engineTemp-40)/90:0);
 put('i-fuel',live&&Number.isFinite(data.fuel)?`${Math.round(data.fuel*100)}%`:'—');put('i-temp',live&&Number.isFinite(data.engineTemp)?`${Math.round(km?data.engineTemp:data.engineTemp*9/5+32)}°${km?'C':'F'}`:'—');
 put('i-ambient',live&&Number.isFinite(data.ambientTemp)?`${Math.round(km?data.ambientTemp:data.ambientTemp*9/5+32)}°${km?'C':'F'}`:'—');
 put('i-gear',live?(data.selectedGear||gearLabel(data.gear)):'—');
 put('i-distance',live&&Number.isFinite(data.odometer)?`${(data.odometer/(km?1000:1609.344)).toFixed(1)} ${unit}`:'ODO —');
 put('i-status',settings.demo?'DEMO · SIMULATED DATA':live?'LIVE VEHICLE DATA':'WAITING FOR BEAMNG');
 put('i-route',!map?.connected?'Navigation unavailable':map.route?.length>1?'Route Active':'No Route Set');
 ids['i-compass-rose'].style.transform=`rotate(${map?.connected?-(map.heading||0):0}deg)`;ids['i-compass-rose'].style.opacity=map?.connected?'1':'.3';
 ids['i-beam'].style.opacity=live&&data.lights?.highBeam?'1':'0';
 put('i-warning',!live?'':data.lights?.handbrake?'Ⓟ PARKING BRAKE':data.fuel<.1?'LOW FUEL':data.lights?.oil?'OIL PRESSURE':data.lights?.battery?'BATTERY':'');
}

import { clamp, gearLabel } from './model.mjs';
export const CIVETTA_MODES={street:{label:'STRADA',color:'#36caff',base:'#005cfc',page:'info'},sport:{label:'SPORT',color:'#fff23a',base:'#b9a000',page:'gforce'},track:{label:'CORSE',color:'#ff3739',base:'#b70005',page:'tires'},drift:{label:'DRIFT',color:'#e962ff',base:'#8506a1',page:'info'},off:{label:'OFF',color:'#e0e0e0',base:'#666666',page:'info'},topspeed:{label:'VELOCITÀ',color:'#59f478',base:'#087a21',page:'info'},race:{label:'RACE',color:'#ff974f',base:'#ac4100',page:'gforce'}};
export function civettaMode(data,settings){
 if(!data.connected)return {key:'unknown',label:'—',color:'#a5afb6',base:'#343c46',page:'info',available:false};
 let key=settings.demo?settings.demoDriveMode:data.driveModeKey;
 if(settings.demo)key=({comfort:'street',arsenic:'track'})[key]||key;
 if(!key)return {key:'unknown',label:'—',color:'#a5afb6',base:'#343c46',page:'info',available:false};
 const mode=CIVETTA_MODES[key]||{label:data.driveModeLabel||key.toUpperCase(),color:data.driveModeColor||'#a5afb6',base:data.driveModeColor||'#343c46',page:'info'};
 return {...mode,key,available:true};
}
const pt=(r,a)=>[720+r*Math.cos(a*Math.PI/180),260+r*Math.sin(a*Math.PI/180)];
const segment=(r1,r2,a,b)=>`M${pt(r1,a)} A${r1},${r1} 0 ${Math.abs(b-a)>180?1:0} 1 ${pt(r1,b)}L${pt(r2,b)} A${r2},${r2} 0 ${Math.abs(b-a)>180?1:0} 0 ${pt(r2,a)}Z`;
const left='M45 439 205 251Q320 143 512 157L510 349Q516 386 539 409L420 455H45Z';
const right='M1395 439 1235 251Q1120 143 928 157L930 349Q924 386 901 409L1020 455H1395Z';
export function civettaMarkup(){
 const bars=(side)=>Array.from({length:12},(_,i)=>`<path id="c-${side}-${i}" d="M${side==='fuel'?1033+i*24:83+i*24} 423h20l-9 22h-20Z"/>`).join('');
 return `<section class="civetta-deck" id="civetta-deck" hidden><header class="c-heading"><span>CIVETTA <small>DIGITAL INSTRUMENTS</small></span><span id="c-status">WAITING FOR BEAMNG</span><label>DISPLAY<select id="civetta-page" aria-label="Civetta information display"><option value="auto">Follow drive mode</option><option value="info">Vehicle info</option><option value="gforce">G force</option><option value="tires">Tire pressure</option></select></label></header><div class="c-cluster"><svg class="c-svg" viewBox="0 0 1440 500" role="img" aria-label="Civetta instrument cluster"><defs><pattern id="c-hex" width="42" height="48" patternUnits="userSpaceOnUse"><path d="M21 0 42 12V36L21 48 0 36V12ZM21 5 37 15V33L21 43 5 33V15ZM21 10 32 18V30L21 38 10 30V18Z" fill="none" stroke="var(--c-color)" stroke-width="1" opacity=".22"/></pattern><linearGradient id="c-wing" x2=".5" y2="1"><stop stop-color="var(--c-base)" stop-opacity=".65"/><stop offset=".65" stop-color="var(--c-base)" stop-opacity=".28"/><stop offset="1" stop-color="#020508"/></linearGradient><clipPath id="c-left-clip"><path d="${left}"/></clipPath><clipPath id="c-right-clip"><path d="${right}"/></clipPath></defs>
 <path d="${left}" fill="url(#c-wing)" stroke="#ff3c0a" stroke-width="8"/><path d="${right}" fill="url(#c-wing)" stroke="#ff3c0a" stroke-width="8"/>
 <path d="${left}" fill="url(#c-hex)"/><path d="${right}" fill="url(#c-hex)"/>
 <path d="${segment(245,241,145,395)}" fill="#ff4a05"/><path d="${segment(237,233,145,395)}" fill="#ff4a05"/>
 <path d="${segment(229,190,145,395)}" fill="#101216"/>
 ${Array.from({length:40},(_,i)=>`<path d="${segment(229,199,145+i*6.25+.6,145+(i+1)*6.25-.6)}" fill="${i<26?'#f6f7f4':i<30?'#ffff67':'#ff5c15'}"/>`).join('')}
 ${Array.from({length:11},(_,i)=>{const a=145+i*25,p=pt(169,a),t=pt(196,a),q=pt(180,a);return `<path d="M${t}L${q}" stroke="#fff" stroke-width="3"/><text x="${p[0]}" y="${p[1]+8}" class="c-tach-number">${i}</text>`}).join('')}
 <text x="720" y="186" class="c-script">Civetta</text><text x="720" y="212" class="c-rpm-caption">RPM ×1000</text>
 <text x="667" y="269" class="c-systems">DSE</text><text x="812" y="258" class="c-systems" id="c-esc">ESC</text><text x="812" y="314" class="c-systems" id="c-tcs">TCS</text>
 <g id="c-needle" style="transform-origin:720px 260px"><path d="M686 256 926 258 931 260 926 262 686 264Z" fill="#fff"/><path d="M720 260H928" stroke="#ff3e0b" stroke-width="3"/></g><circle cx="720" cy="260" r="27" fill="#ff3e0a"/><circle cx="720" cy="260" r="18" fill="#fff"/><circle cx="720" cy="260" r="10" fill="#080b0e"/>
 <text x="720" y="352" class="c-mode-caption">MODE</text><text x="720" y="382" id="c-mode" class="c-mode">—</text>
 <g id="c-page-info" class="c-info"><text x="227" y="258">OIL</text><text x="425" y="258" id="c-oil">—°C</text><text x="227" y="294">WATER</text><text x="425" y="294" id="c-water">—°C</text><text x="227" y="330">OUTSIDE</text><text x="425" y="330" id="c-outside">—°C</text><path d="M191 343H462" stroke="#ff3616" stroke-width="3"/><text x="227" y="376">TIME</text><text x="418" y="376" id="c-time">—</text></g>
 <g id="c-page-gforce" transform="translate(338 300)" class="c-gforce"><circle r="70"/><circle r="53"/><circle r="36"/><circle r="18"/><path d="M-79 0H79M0-79V79"/><circle id="c-g-dot" r="6" fill="var(--c-color)" stroke="none"/><text x="0" y="102" id="c-g-value">— g</text><text x="0" y="121" class="c-estimate">ESTIMATED</text></g>
 <g id="c-page-tires" class="c-tires"><path d="M320 226Q338 214 356 226L366 333Q338 351 310 333Z" fill="#e7eeee"/><path d="M322 248Q338 237 354 248L351 274H325ZM322 296H354L357 321Q338 332 319 321Z" fill="#30414a"/><rect x="302" y="245" width="11" height="27" rx="3"/><rect x="363" y="245" width="11" height="27" rx="3"/><rect x="302" y="307" width="11" height="27" rx="3"/><rect x="363" y="307" width="11" height="27" rx="3"/><text x="270" y="264">—</text><text x="405" y="264">—</text><text x="270" y="326">—</text><text x="405" y="326">—</text><text x="338" y="376" class="c-tire-note">PRESSURE UNAVAILABLE</text></g>
 <g class="c-right-data"><text x="1066" y="250" class="c-yellow">GEAR</text><text x="1066" y="292" id="c-gear" class="c-gear">—</text><text x="1066" y="326" id="c-unit" class="c-yellow">MPH</text><text x="1078" y="385" id="c-speed" class="c-speed">—</text><text x="1136" y="411" id="c-odo" class="c-odo">ODO —</text></g>
 <g class="c-oil-bars">${bars('oil')}</g><g class="c-fuel-bars">${bars('fuel')}</g><text x="96" y="417" class="c-bar-label">OIL</text><text x="1324" y="417" class="c-bar-label">FUEL</text><text x="140" y="478" id="c-warning" class="c-warning"></text>
 <path id="c-signal-left" d="M380 189 359 203 380 217V208H405V198H380Z" fill="#fff" opacity=".25"/><path id="c-signal-right" d="M1060 189 1081 203 1060 217V208H1035V198H1060Z" fill="#fff" opacity=".25"/>
 </svg></div><div class="c-bottom"><div id="civetta-media-slot"></div></div></section>`;
}
export function updateCivetta(ids,{settings,data,map,rpm,speed,now},estimator){
 const put=(id,value)=>{if(ids[id].textContent!==String(value))ids[id].textContent=value};const live=data.connected,km=settings.units==='kmh',mode=civettaMode(data,settings);
 const root=ids['civetta-deck'];root.style.setProperty('--c-color',mode.color);root.style.setProperty('--c-base',mode.base);root.dataset.mode=mode.key;
 put('c-status',settings.demo?'DEMO · SIMULATED DATA':!live?'WAITING FOR BEAMNG':mode.available?'LIVE · DRIVE MODE SYNC':'LIVE · WAITING FOR DRIVE MODE');put('c-mode',mode.label);
 const page=settings.civettaPage&&settings.civettaPage!=='auto'?settings.civettaPage:mode.page;
 ids['civetta-page'].value=settings.civettaPage||'auto';for(const name of ['info','gforce','tires'])ids[`c-page-${name}`].style.display=page===name?'':'none';
 ids['c-needle'].style.transform=`rotate(${145+clamp(rpm/10000,0,1)*250}deg)`;ids['c-needle'].style.opacity=live?'1':'.15';
 put('c-gear',live?(data.selectedGear||gearLabel(data.gear)):'—');put('c-speed',live?Math.round(speed):'—');put('c-unit',km?'KM/H':'MPH');
 put('c-odo',live&&Number.isFinite(data.odometer)?`ODO ${(data.odometer/(km?1000:1609.344)).toFixed(1)} ${km?'km':'mi'}`:'ODO —');
 const temp=(value)=>live&&Number.isFinite(value)?`${Math.round(km?value:value*9/5+32)}°${km?'C':'F'}`:'—';put('c-oil',temp(data.oilTemp));put('c-water',temp(data.engineTemp));put('c-outside',temp(data.ambientTemp));
 put('c-time',new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false}));
 for(let i=0;i<12;i++){ids[`c-fuel-${i}`].style.fill=live&&Number.isFinite(data.fuel)&&data.fuel*12>i?'#f5f6ef':'#323c45';ids[`c-oil-${i}`].style.fill=live&&Number.isFinite(data.oilTemp)&&clamp((data.oilTemp-40)/110,0,1)*12>i?(i>9?'#ff652f':'#e7f5fa'):'#323c45';}
 put('c-warning',!live?'':data.lights?.handbrake?'Ⓟ PARKING BRAKE':data.fuel<.1?'LOW FUEL':data.lights?.oil?'OIL PRESSURE':data.lights?.battery?'BATTERY':'');
 ids['c-tcs'].style.opacity=live&&data.lights?.traction?'1':'.45';ids['c-esc'].style.opacity=mode.available?'1':'.35';
 for(const side of ['left','right']){ids[`c-signal-${side}`].setAttribute('opacity',live&&data.lights?.[side]?'1':'.2');ids[`c-signal-${side}`].setAttribute('fill',live&&data.lights?.[side]?'#69ff8e':'#fff');}
 const g=estimator.update(data,map,now);put('c-g-value',g?`${Math.hypot(g.lateral,g.longitudinal).toFixed(2)} g`:'— g');ids['c-g-dot'].setAttribute('cx',g?clamp(g.lateral,-1,1)*65:0);ids['c-g-dot'].setAttribute('cy',g?-clamp(g.longitudinal,-1,1)*65:0);ids['c-g-dot'].style.opacity=g?'1':'.15';
}

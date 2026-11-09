import {phoneSettings} from './shared-settings.mjs';
import {ScreenAwake} from './screen-awake.mjs';
import {phoneJson} from './connection.mjs';
import {MapMotion} from './map-motion.mjs';
import {DECKS,DeckView} from '/renderer/decks.mjs';
const $=id=>document.getElementById(id);
let awakeNoticeTimer,awakeReported=false;
const screenAwake=new ScreenAwake({report:active=>{
 if(active&&awakeReported)return;
 const notice=$('screen-awake-status');clearTimeout(awakeNoticeTimer);
 if(document.hidden){notice.hidden=true;return;}
 if(active){if(awakeReported)return;awakeReported=true;notice.textContent='✓ Screen-awake mode enabled';notice.hidden=false;awakeNoticeTimer=setTimeout(()=>notice.hidden=true,3500);}
 else{awakeReported=false;notice.textContent='Tap anywhere to enable screen-awake mode';notice.hidden=false;}
}});
// Any normal dashboard interaction unlocks media playback when iOS requires it.
for(const event of ['pointerup','click'])document.addEventListener(event,()=>screenAwake.enable());
void screenAwake.enable();
document.addEventListener('visibilitychange',()=>{if(document.hidden)screenAwake.disable();else void screenAwake.enable();});
window.addEventListener('pagehide',()=>screenAwake.disable());
window.addEventListener('pageshow',()=>screenAwake.enable());
function readLocal(key){try{return localStorage.getItem(key);}catch{return null;}}
function writeLocal(key,value){try{localStorage.setItem(key,value);}catch{/* Pairing and preferences still work for this open session. */}}
let token=location.hash.slice(1)||readLocal('drivedeck-pair')||'';if(token)writeLocal('drivedeck-pair',token);try{history.replaceState(null,'',location.pathname);}catch{}
$('pc-address').value=location.host;
$('dashboard-refresh')?.addEventListener('click',()=>location.reload());
$('connect-open').onclick=()=>$('pairing').showModal();$('pair-close').onclick=()=>$('pairing').close();
$('pair-form').onsubmit=async e=>{e.preventDefault();let address=$('pc-address').value.trim(),code=$('pair-code').value.trim().replace(/[- ]/g,'');try{const url=new URL(address.includes('://')?address:'http://'+address);address=url.host;if(url.hash)code=url.hash.slice(1);if(url.protocol!=='http:')throw new Error();}catch{$('pair-error').textContent='Enter the PC address and port shown below the QR code.';return;}if(!/^(?:\d{1,3}\.){3}\d{1,3}:\d{1,5}$/.test(address)||address.split(':')[0].split('.').some(n=>Number(n)>255)||Number(address.split(':')[1])<1||Number(address.split(':')[1])>65535){$('pair-error').textContent='Enter the PC address and port shown below the QR code.';return;}if(!/^(?:[a-f0-9]{8}|[a-f0-9]{48})$/i.test(code)){$('pair-error').textContent='Enter the 8-character pairing code from DriveDeck.';return;}if(address!==location.host){location.assign('http://'+address+'/#'+code);return;}try{if(code.length===8)code=await exchange(code);}catch(error){$('pair-error').textContent=error.message;return;}token=code;writeLocal('drivedeck-pair',token);$('pair-error').textContent='';$('pairing').close();resetConnection();};
async function exchange(code){return (await phoneJson('/api/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})})).token;}
if(token.length===8){$('pair-code').value=token;token='';void $('pair-form').requestSubmit();}
if(!token)$('pairing').showModal();

const mapMotion=new MapMotion();let geometryRevision=0;let current=null,map={roads:[],route:[],position:null,connected:false},lastSeen=0,lastFrame=performance.now(),rpm=0,speed=0,preview={image:null},vehicle='',previewVehicle='';let connection=null,renderFailed=false,lastPaint=0,artworkRevision='',cachedArtwork=null;
let preferences={};try{preferences=JSON.parse(readLocal('drivedeck-phone')||'{}')||{};}catch{}if(!DECKS.some(d=>d.id===preferences.deck))delete preferences.deck;let settings={deck:'m235',units:'mph',mapZoom:1,mapAppearance:'dark',mapHeadingUp:true,atlasView:'2d',miniPlayerView:'visualizer',...preferences,demo:false};
window.driveDeck={vehiclePreview:async()=>preview};
function save(){renderFailed=false;resize();writeLocal('drivedeck-phone',JSON.stringify({deck:settings.deck,trafficView:settings.trafficView,units:settings.units,mapZoom:settings.mapZoom,atlasView:settings.atlasView,martinCenter:settings.martinCenter,plaidView:settings.plaidView}));}
const view=new DeckView($('stage'),{zoom:f=>{settings.mapZoom=Math.max(.4,Math.min(3,settings.mapZoom*f));save();},compass:()=>settings.mapHeadingUp=!settings.mapHeadingUp,atlasView:()=>{settings.atlasView=settings.atlasView==='3d'?'2d':'3d';save();},audioView:v=>settings.audioView=v,songVisualizer:()=>{settings.songVisualizer=!settings.songVisualizer;},trafficView:async v=>{try{await phoneJson('/api/driving-view',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({mode:v})});settings.trafficView=v;save();return true;}catch(error){$('connection').textContent=error.message;return false;}},drivingOptions:async patch=>{try{await phoneJson('/api/driving-view',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({mode:settings.trafficView||'full',...patch})});Object.assign(settings,patch);save();}catch(error){$('connection').textContent=error.message;}},plaidView:v=>{settings.plaidView=v;save();},martinCenter:v=>{settings.martinCenter=v;save();},civettaPage:v=>settings.civettaPage=v});
$('cards').innerHTML=DECKS.map(d=>`<button data-deck="${d.id}"><img loading="lazy" decoding="async" src="/renderer/assets/decks/${d.id}.png" alt="${d.name} preview"><strong>${d.name}</strong></button>`).join('');$('cards').onclick=e=>{const b=e.target.closest('[data-deck]');if(b){settings.deck=b.dataset.deck;save();$('library').close();}};$('library-open').onclick=()=>$('library').showModal();$('library-close').onclick=()=>$('library').close();$('units').onclick=()=>{settings.units=settings.units==='mph'?'kmh':'mph';speed=0;save();};let immersive=false;
function setImmersive(value){immersive=value;document.body.classList.toggle('immersive',value);$('exit-fullscreen').hidden=!value;$('fullscreen').textContent=value?'Exit fullscreen':'Fullscreen';resize();}
async function leaveFullscreen(){setImmersive(false);try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.webkitFullscreenElement)document.webkitExitFullscreen?.();}catch{}}
$('fullscreen').onclick=async()=>{if(immersive)return leaveFullscreen();setImmersive(true);try{const root=document.documentElement;if(root.requestFullscreen)await root.requestFullscreen({navigationUI:'hide'});else if(root.webkitRequestFullscreen)await root.webkitRequestFullscreen();}catch{/* Keep the expanded dashboard when the browser rejects native fullscreen. */}};
$('exit-fullscreen').onclick=leaveFullscreen;
for(const event of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(event,()=>{if(!document.fullscreenElement&&!document.webkitFullscreenElement)setImmersive(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&immersive)void leaveFullscreen();});

function showRecovery(message){$('connection').textContent=message;$('recovery-message').textContent=message;$('connection-recovery').hidden=false;}
function api(endpoint,state){return phoneJson('/api/'+endpoint,{headers:{Authorization:'Bearer '+state.token},signal:state.controller.signal,timeout:endpoint.startsWith('state')?8000:20000});}
function needsMap(){return ['model-s','model-three','ultra','atlas','pure'].includes(settings.deck)||(settings.deck==='martin'&&['map','map3d'].includes(settings.martinCenter));}
async function poll(state){
 if(connection!==state||document.hidden||!state.token)return;
 try{
  const next=await api('state?artwork='+encodeURIComponent(artworkRevision)+'&deck='+encodeURIComponent(settings.deck),state);if(connection!==state)return;
  if(next.media){if(Object.prototype.hasOwnProperty.call(next.media,'artwork'))cachedArtwork=next.media.artwork;else next.media.artwork=cachedArtwork;artworkRevision=next.media.artworkRevision||'';}
  current=next;if(next.version&&$('phone-version'))$('phone-version').textContent=next.version;lastSeen=performance.now();state.failures=0;if(!renderFailed)$('connection-recovery').hidden=true;
  if(needsMap()&&current.mapPose?.revision!==geometryRevision&&!state.mapBusy)void pollMap(state);
  const id=current.data.vehicleId+':'+current.data.vehicleName;
  if(id!==vehicle){vehicle=id;previewVehicle='';preview={image:null};view.tesla.identity=null;}
  const parked=['model-s','model-three'].includes(settings.deck)&&current.data.connected&&current.data.selectedGear==='P';
  if(parked&&id!==previewVehicle&&!state.previewBusy){state.previewBusy=true;api('vehicle',state).then(p=>{if(connection!==state)return;preview=p;previewVehicle=id;view.tesla.identity=null;}).catch(()=>{}).finally(()=>state.previewBusy=false);}
 }catch(error){
  if(connection!==state||error.code==='canceled')return;
  state.failures++;
  if(['pairing','stopped'].includes(error.code)){current=null;lastSeen=0;preview={image:null};previewVehicle='';if(error.code==='pairing'&&!$('pairing').open)$('pairing').showModal();}
  if(!current||performance.now()-lastSeen>2500)showRecovery(error.message);
 }finally{if(connection===state&&!document.hidden)state.timer=setTimeout(()=>poll(state),Math.min(3000,100*2**Math.min(state.failures,5)));}
}
async function pollMap(state){state.mapBusy=true;try{const geometry=await api('map?revision='+geometryRevision,state);if(connection===state&&!geometry.unchanged){map=geometry;geometryRevision=geometry.revision;}}catch{}finally{state.mapBusy=false;}}
function pauseConnection(){if(connection){clearTimeout(connection.timer);connection.controller.abort();connection=null;}}
function resetConnection(){pauseConnection();if(document.hidden)return;connection={token,controller:new AbortController(),failures:0,mapBusy:false,previewBusy:false};if(token)void poll(connection);else showRecovery('Enter the pairing code from DriveDeck on your PC.');}
window.addEventListener('hashchange',()=>{const linkToken=location.hash.slice(1);if(!/^(?:[a-f0-9]{8}|[a-f0-9]{48})$/i.test(linkToken))return;try{history.replaceState(null,'',location.pathname+location.search);}catch{}if(linkToken.length===8){$('pair-code').value=linkToken;$('pair-form').requestSubmit();return;}token=linkToken;writeLocal('drivedeck-pair',token);$('pairing').close();current=null;lastSeen=0;resetConnection();});
$('recovery-connect').onclick=()=>$('pairing').showModal();$('recovery-retry').onclick=()=>{renderFailed=false;resetConnection();};
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseConnection();else{lastFrame=performance.now();resetConnection();}});
window.addEventListener('pagehide',pauseConnection);window.addEventListener('pageshow',()=>{if(!connection)resetConnection();});

function resize(){const r=$('deck-area').getBoundingClientRect();const martin=settings.deck==='martin',direct=martin||settings.deck==='plaid-track';document.body.classList.toggle('martin-mobile',martin);$('stage').dataset.mobileLayout=r.height>r.width?'portrait':'landscape';if(direct){Object.assign($('stage').style,{width:r.width+'px',height:r.height+'px',transform:'none'});return;}const landscape=r.width>=r.height;const h=landscape?Math.max(480,1600*r.height/Math.max(1,r.width)):900,w=landscape?h*r.width/Math.max(1,r.height):1600,s=Math.min(r.width/w,r.height/h);Object.assign($('stage').style,{width:w+'px',height:h+'px',transform:`translate(${(r.width-w*s)/2}px,${(r.height-h*s)/2}px) scale(${s})`});}new ResizeObserver(resize).observe($('deck-area'));window.visualViewport?.addEventListener('resize',resize);
function frame(now){requestAnimationFrame(frame);if(document.hidden||renderFailed||now-lastPaint<32)return;lastPaint=now;try{const dt=Math.min(.1,(now-lastFrame)/1000);lastFrame=now;const online=now-lastSeen<2500&&!!current;const data={...(current?.data||{}),connected:online&&!!current?.data.connected};settings=phoneSettings(settings,current?.settings);rpm+=( (data.connected?data.rpm:0)-rpm)*(1-Math.exp(-dt*12));speed+=((data.connected?(data.speedMps||0)*(settings.units==='kmh'?3.6:2.236936):0)-speed)*(1-Math.exp(-dt*10));view.update({settings,data,map:{...map,...mapMotion.update(current?.mapPose,dt),connected:online&&!!current?.mapPose?.connected&&current?.mapPose?.mapId===map.mapId},media:current?.media||{available:false},audio:online?current?.audio||{}:{},animation:{source:'cover'},rpm,speed,maxRpm:data.maxRpm||settings.maxRpm||8000,trip:{meters:0,seconds:0},now});if(online)$('connection').textContent=data.connected?'Live · '+(data.vehicleName||'BeamNG.drive'):'PC connected · waiting for BeamNG';$('units').textContent=settings.units.toUpperCase();document.querySelectorAll('#cards [data-deck]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.deck===settings.deck)));}catch(error){renderFailed=true;console.error(error);showRecovery('The dashboard could not render. Retry or choose another deck.');}}resize();resetConnection();requestAnimationFrame(frame);





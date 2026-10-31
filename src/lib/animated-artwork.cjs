const {EventEmitter}=require('node:events');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const trackKey=m=>JSON.stringify([m.source||'',m.title||'',m.artist||'',m.album||'']);
const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const albumName=s=>normalize(String(s||'').replace(/\b(deluxe|expanded|edition|explicit|clean)\b/gi,''));
const clipKey=m=>crypto.createHash('sha256').update(JSON.stringify([normalize(m.title),normalize(m.artist),normalize(m.album)])).digest('hex');
const appleVideoURL=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(u.hostname==='mvod.itunes.apple.com'||u.hostname.endsWith('.itunes.apple.com')||u.hostname.endsWith('.mzstatic.com'))&&/\.m3u8$/i.test(u.pathname)?u.href:null;}catch{return null;}};
function parseAppleArtwork(html,albumId,expectedArtist){
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(!/\bid=["']serialized-server-data["']/i.test(match[1]))continue;
  const data=JSON.parse(match[2]);const stack=[data];let visited=0;
  while(stack.length&&visited++<100000){const item=stack.pop();if(!item||typeof item!=='object')continue;
   if(typeof item.id==='string'&&item.id===`album-detail-header - ${albumId}`){
    if(expectedArtist&&!item.subtitleLinks?.some(link=>normalize(link.title)===expectedArtist))return null;
    const dictionary=item.videoArtwork?.dictionary||{};
    const motion=dictionary.motionDetailSquare;
    const url=appleVideoURL(motion?.video);if(url)return {url,albumTitle:item.title||'',pageUrl:`https://music.apple.com/us/album/${albumId}`};
    return null;
   }
   for(const value of Object.values(item))if(value&&typeof value==='object')stack.push(value);
  }
 }return null;
}
async function readPublic(url,signal,max=8*1024*1024){
 for(let redirects=0;redirects<4;redirects++){
  const u=new URL(url);if(u.protocol!=='https:'||!['itunes.apple.com','music.apple.com'].includes(u.hostname))throw new Error('Unexpected artwork service address.');
  const response=await fetch(u,{signal:AbortSignal.any([signal,AbortSignal.timeout(12000)]),redirect:'manual',credentials:'omit',headers:{'Accept':'text/html, application/json'}});
  if([301,302,303,307,308].includes(response.status)){url=new URL(response.headers.get('location'),u).href;continue;}
  if(!response.ok)throw new Error(response.status===429?'Apple catalog is busy. Try again later.':`Apple artwork request failed (${response.status}).`);
  const reader=response.body.getReader(),chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max)throw new Error('Artwork response too large.');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}
  return Buffer.concat(chunks).toString('utf8');
 }throw new Error('Too many artwork redirects.');
}
// Streaming editions can have motion artwork even when the iTunes store edition does not.
function streamingAlbumIds(html,wanted){
 const ids=new Set();
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(!/\bid=["']serialized-server-data["']/i.test(match[1]))continue;
  const stack=[JSON.parse(match[2])];let visited=0;
  while(stack.length&&visited++<100000){const item=stack.pop();if(!item||typeof item!=='object')continue;
   const descriptor=item.contentDescriptor;
   const title=descriptor?.kind==='album'?item.title:descriptor?.kind==='song'?item.subtitleLinks?.[0]?.title?.split('·')[0]:null;
   if(title&&wanted.has(albumName(title))){try{const u=new URL(descriptor.url);const id=u.pathname.match(/^\/us\/album\/(?:[^/]+\/)?(\d+)$/)?.[1];if(u.protocol==='https:'&&u.hostname==='music.apple.com'&&id)ids.add(id);}catch{}}
   for(const value of Object.values(item))if(value&&typeof value==='object')stack.push(value);
  }
 }return [...ids].slice(0,6);
}
async function lookupApple(media,signal,read=readPublic){
 const artist=normalize(String(media.artist||'').split(/\s+(?:feat\.?|ft\.?)\s+|[,;&]/i)[0]);
 if(!artist)return null;
 const hasAlbum=!!media.album?.trim();
 const term=`${media.artist} ${hasAlbum?media.album:media.title}`.slice(0,350);
 const search=new URL('https://itunes.apple.com/search');search.search=new URLSearchParams({term,entity:hasAlbum?'album':'song',media:'music',country:'us',limit:'20'}).toString();
 const result=JSON.parse(await read(search.href,signal,2*1024*1024));
 const wanted=hasAlbum?albumName(media.album):normalize(media.title);
 const candidates=(result.results||[]).filter(row=>normalize(row.artistName)===artist && (hasAlbum?albumName(row.collectionName)===wanted:normalize(row.trackName)===wanted));
 const ids=[...new Set(candidates.map(row=>row.collectionId).filter(id=>Number.isSafeInteger(id)&&id>0))].slice(0,3);
 const checked=new Set();let lastError=null,completed=false;
 const wantedAlbums=new Set(hasAlbum?[wanted]:candidates.map(row=>albumName(row.collectionName)));
 const check=async id=>{if(checked.has(String(id)))return null;checked.add(String(id));
  try{const html=await read(`https://music.apple.com/us/album/${id}`,signal);const art=parseAppleArtwork(html,id,artist);completed=true;return art&&wantedAlbums.has(albumName(art.albumTitle))?art:null;}
  catch(error){if(signal.aborted)throw error;lastError=error;return null;}
 };
 for(const id of ids){const art=await check(id);if(art)return art;}
 const artists=[...new Set(candidates.map(row=>row.artistId).filter(id=>Number.isSafeInteger(id)&&id>0))].slice(0,2);
 for(const id of artists){
  try{const html=await read(`https://music.apple.com/us/artist/${id}`,signal);for(const albumId of streamingAlbumIds(html,wantedAlbums)){const art=await check(albumId);if(art)return art;}}
  catch(error){if(signal.aborted)throw error;lastError=error;}
 }
 if(!completed&&lastError)throw lastError;
 return null;
}
class ClipLibrary {
 constructor(directory){this.directory=directory;this.file=path.join(directory,'clips.json');this.clips={};try{if(fs.statSync(this.file).size<256000){const data=JSON.parse(fs.readFileSync(this.file,'utf8'));for(const [key,value]of Object.entries(data))if(/^[a-f0-9]{64}$/.test(key)&&/^[a-f0-9]{64}\.(mp4|webm)$/.test(value))this.clips[key]=value;}}catch{}}
 get(media){const name=this.clips[clipKey(media)];const file=name&&path.join(this.directory,name);return file&&fs.existsSync(file)?pathToFileURL(file).href:null;}
 save(){fs.mkdirSync(this.directory,{recursive:true});fs.writeFileSync(this.file+'.tmp',JSON.stringify(this.clips,null,2));fs.renameSync(this.file+'.tmp',this.file);}
 add(media,file){
  if(!media.available||!media.title||!media.artist)throw new Error('Play a song with a title and artist first.');
  const ext=path.extname(file).toLowerCase();if(!['.mp4','.webm'].includes(ext))throw new Error('Choose an MP4 or WebM video.');
  const stat=fs.statSync(file);if(!stat.isFile()||stat.size<16||stat.size>50*1024*1024)throw new Error('Choose a video smaller than 50 MB.');
  const bytes=fs.readFileSync(file);if(ext==='.mp4'&&!bytes.subarray(0,64).includes(Buffer.from('ftyp'))||ext==='.webm'&&bytes.readUInt32BE(0)!==0x1a45dfa3)throw new Error('That file is not a supported video container.');
  const name=crypto.createHash('sha256').update(bytes).digest('hex')+ext;
  fs.mkdirSync(this.directory,{recursive:true});fs.writeFileSync(path.join(this.directory,name),bytes);this.clips[clipKey(media)]=name;this.save();
 }
 remove(media){delete this.clips[clipKey(media)];this.save();}
}
class AnimatedArtwork extends EventEmitter {
 constructor({library,lookup=lookupApple}={}){super();this.library=library;this.lookup=lookup;this.cache=new Map();this.state={source:'cover',url:null,providers:{}};this.signature='';this.generation=0;this.failed=new Set();this.lastLookup=0;}
 publish(value){this.state={...value,trackKey:trackKey(this.media||{}),hasCanvasClip:!!this.library?.get(this.media||{})};this.emit('state',this.state);}
 update(media,settings,force=false){
  const key=trackKey(media),signature=JSON.stringify([key,settings.animatedArtwork,settings.animationOrder,settings.canvasEnabled,settings.appleEnabled,settings.demo]);
  if(signature===this.signature&&!force)return;
  if(key!==trackKey(this.media||{}))this.failed.clear();
  this.signature=signature;this.media={...media};this.settings={...settings};this.controller?.abort();this.controller=new AbortController();
  const generation=++this.generation;
  this.resolve(generation,this.controller.signal).catch(error=>{if(generation===this.generation&&!this.controller.signal.aborted)this.publish({source:'cover',url:null,providers:{},message:error.message});});
 }
 async resolve(generation,signal){
  const settings=this.settings,media=this.media;
  const providers={canvas:settings.canvasEnabled?(this.library?.get(media)?'Local clip available':'No clip for this song · automatic Canvas access unavailable'):'Off',apple:settings.appleEnabled?'Not checked':'Off'};
  for(const source of this.failed)providers[source]='Could not play animation';
  if(!settings.animatedArtwork||settings.demo||!media.available||!media.title){this.publish({source:'cover',url:null,providers,message:settings.demo?'Demo · static artwork':!settings.animatedArtwork?'Animated artwork is off.':'Start a song to find animated artwork.'});return;}
  this.publish({source:'cover',url:null,providers,loading:true,message:'Checking animated artwork…'});
  for(const source of settings.animationOrder||['canvas','apple']){
   if(signal.aborted)return;
   if(source==='canvas'&&settings.canvasEnabled&&!this.failed.has('canvas')){
    const url=this.library?.get(media);if(url){providers.canvas='Local Canvas clip';this.publish({source,url,providers,message:'Canvas clip · local video'});return;}
   }
   if(source==='apple'&&settings.appleEnabled&&!this.failed.has('apple')){
    providers.apple='Searching Apple Music…';this.publish({source:'cover',url:null,providers:{...providers},loading:true,message:providers.apple});
    const cacheKey=normalize(media.artist)+'|'+(albumName(media.album)||normalize(media.title));let cached=this.cache.get(cacheKey);
    try{
     if(!cached||cached.expires<Date.now()){
      const wait=Math.max(0,3100-(Date.now()-this.lastLookup));if(wait)await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,wait);signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new Error('Cancelled'));},{once:true});});
      if(signal.aborted)return;this.lastLookup=Date.now();
      const value=await this.lookup(media,signal);cached={value,expires:Date.now()+(value?86400000:1800000)};this.cache.set(cacheKey,cached);if(this.cache.size>100)this.cache.delete(this.cache.keys().next().value);
     }
     if(generation!==this.generation||signal.aborted)return;
     if(cached.value){providers.apple='Animated album artwork available';this.publish({source:'apple',...cached.value,providers,message:'Apple Music · animated album artwork'});return;}
     providers.apple='No matching animated album artwork';
    }catch(error){if(generation!==this.generation||signal.aborted)return;providers.apple=error.message;}
   }
  }
  for(const source of this.failed)providers[source]='Could not play animation';
  this.publish({source:'cover',url:null,providers,message:'Showing the album cover.'});
 }
 reject(source,key){if(key!==trackKey(this.media||{})||!['canvas','apple'].includes(source)||this.failed.has(source))return;this.failed.add(source);this.update(this.media,this.settings,true);}
 retry(){this.failed.clear();this.cache.clear();if(this.media)this.update(this.media,this.settings,true);}
 stop(){this.controller?.abort();this.generation++;}
}
module.exports={AnimatedArtwork,ClipLibrary,lookupApple,parseAppleArtwork,streamingAlbumIds,appleVideoURL,trackKey,clipKey};

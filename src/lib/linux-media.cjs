const {EventEmitter}=require('node:events');
const {execFile}=require('node:child_process');
const fs=require('node:fs/promises');
const {fileURLToPath}=require('node:url');
const EMPTY={available:false,title:'',artist:'',album:'',source:'',playing:false,position:0,duration:0,artwork:null,canToggle:false,canNext:false,canPrevious:false,canSeek:false};
function runPlayer(args){return new Promise((resolve,reject)=>execFile('playerctl',args,{encoding:'utf8',timeout:2000,maxBuffer:262144},(error,stdout)=>error?reject(error):resolve(stdout.trim())));}
const MAX_ARTWORK=1000000;
function artworkData(bytes){const type=bytes[0]===255&&bytes[1]===216?'jpeg':bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'webp':null;return type?`data:image/${type};base64,${bytes.toString('base64')}`:null;}
async function localArtwork(value,{fetchImage=fetch}={}){try{
 let url=new URL(value),bytes;
 if(url.protocol==='file:'&&!url.hostname){const file=fileURLToPath(url),stat=await fs.stat(file);if(!stat.isFile()||stat.size>MAX_ARTWORK)return null;bytes=await fs.readFile(file);}
 else {const signal=AbortSignal.timeout(5000);for(let hop=0;hop<4;hop++){
   if(url.protocol!=='https:'||url.username||url.password)return null;
   const response=await fetchImage(url,{signal,redirect:'manual'});
   if([301,302,303,307,308].includes(response.status)){await response.body?.cancel();url=new URL(response.headers.get('location'),url);continue;}
   if(!response.ok||Number(response.headers.get('content-length'))>MAX_ARTWORK){await response.body?.cancel();return null;}
   const reader=response.body.getReader(),chunks=[];let size=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_ARTWORK){await reader.cancel();return null;}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
   bytes=Buffer.concat(chunks);break;
 }if(!bytes)return null;}
 return artworkData(bytes);
 }catch{return null;}}
class LinuxMedia extends EventEmitter{
  constructor({run=runPlayer,artwork=localArtwork,bus}={}){super();this.bus=bus||new (require('./linux-bus.cjs').LinuxBus)();this.useBus=false;this.run=async args=>{if(this.useBus)return this.bus.playerctl(args);try{return await run(args);}catch(error){if(error.code!=='ENOENT')throw error;this.useBus=true;return this.bus.playerctl(args);}};this.artwork=artwork;this.state={...EMPTY};this.running=false;this.generation=0;this.player=null;this.artKey=null;this.cover=null;}
  publish(state){this.state={...EMPTY,...state,updatedAt:Date.now()};this.emit('state',this.state);}
  start(){if(this.running)return;this.running=true;const generation=++this.generation;const tick=async()=>{await this.refresh(generation);if(this.running&&generation===this.generation)this.timer=setTimeout(tick,1000);};void tick();}
  async refresh(generation=this.generation){try{const names=(await this.run(['--list-all'])).split(/\r?\n/).filter(name=>/^[A-Za-z0-9_.-]+$/.test(name)).slice(0,8);const statuses=await Promise.all(names.map(async name=>({name,status:await this.run(['--player='+name,'status']).catch(()=>'Stopped')})));const selected=statuses.find(p=>p.status==='Playing')||statuses.find(p=>p.status==='Paused');if(!selected){if(generation===this.generation){this.player=null;this.publish({});}return;}
    const query=(...args)=>this.run(['--player='+selected.name,...args]).catch(()=>'');const [title,artist,album,length,position,art]=await Promise.all([query('metadata','xesam:title'),query('metadata','xesam:artist'),query('metadata','xesam:album'),query('metadata','mpris:length'),query('position'),query('metadata','mpris:artUrl')]);if(generation!==this.generation)return;
    const key=JSON.stringify([selected.name,title,artist,art]);let cover=this.cover;if(key!==this.artKey||(!cover&&Date.now()-(this.artAttempt||0)>15000)){this.artAttempt=Date.now();cover=await this.artwork(art);}if(generation!==this.generation)return;this.artKey=key;this.cover=cover;this.player=selected.name;const duration=Math.max(0,Number(length)/1000000)||0,seconds=Math.max(0,Number(position))||0;
    // Playerctl reports unsupported actions as errors; failed commands are returned to the UI.
    this.publish({available:true,title:title.slice(0,1000),artist:artist.slice(0,1000),album:album.slice(0,1000),source:selected.name,playing:selected.status==='Playing',position:seconds,duration,artwork:cover,canToggle:true,canNext:true,canPrevious:true,canSeek:duration>0&&position!==''});
  }catch(error){if(generation===this.generation){this.player=null;this.publish({error:error.code==='ENOENT'?'Linux music support needs playerctl or busctl in the desktop session.':'No MPRIS music player is available. Open a compatible player in your desktop session.'});}}}
  async command(action,position){if(!['toggle','next','previous','seek'].includes(action))return {ok:false,error:'Unknown media action.'};if(!this.player||!this.state.available)return {ok:false,error:'Start an MPRIS-compatible music player first.'};if(action==='seek'&&(!this.state.canSeek||!Number.isFinite(position)||position<0||position>this.state.duration))return {ok:false,error:'Invalid playback position.'};try{await this.run(['--player='+this.player,...(action==='seek'?['position',String(position)]:[action==='toggle'?'play-pause':action])]);return {ok:true};}catch{return {ok:false,error:'This player could not complete that control.'};}}
  stop(){this.running=false;this.generation++;clearTimeout(this.timer);this.player=null;this.publish({});}
}
module.exports={LinuxMedia,runPlayer,localArtwork};

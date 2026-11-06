const {EventEmitter}=require('node:events'),{spawn,execFile}=require('node:child_process'),{pcmSpectrum}=require('./pcm-spectrum.cjs');
const runCommand=(file,args)=>new Promise((resolve,reject)=>execFile(file,args,{timeout:2500,maxBuffer:4*1024*1024},(error,out)=>error?reject(error):resolve(out)));
const gameAudio=p=>/beamng|drivedeck/i.test([p['application.name'],p['application.process.binary'],p['node.name']].join(' '));
function chooseMusic(items,source){
 const key=String(source||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 if(!key)return null;
 return items.filter(x=>!gameAudio(x.props)).find(x=>[x.props['application.name'],x.props['application.process.binary'],x.props['application.id'],x.props['node.name']].some(v=>{const text=String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'');return text&&(text.includes(key)||key.includes(text));}))||null;
}
class LinuxAudio extends EventEmitter{
  constructor({spawnProcess=spawn,run=runCommand}={}){super();this.spawnProcess=spawnProcess;this.run=run;this.excludeBeamng=false;this.source="";this.target=null;this.discovering=false;this.generation=0;this.pollAt=0;this.state={available:false,bands:[]};this.child=null;this.retryAt=0;this.backend='parec';}
  configure({excludeBeamngAudio=true}={},media={}){const source=String(media.source||'');if(this.excludeBeamng!==excludeBeamngAudio||this.source!==source){this.stop();this.excludeBeamng=excludeBeamngAudio;this.source=source;this.target=null;this.pollAt=0;}}
  async discover(){
   if(this.discovering||Date.now()<this.pollAt)return;
   this.discovering=true;const generation=this.generation;this.pollAt=Date.now()+2000;
   try{
    let target=null;
    try{const rows=JSON.parse(await this.run('pactl',['-f','json','list','sink-inputs']));const item=chooseMusic(rows.map(x=>({props:x.properties||{},index:x.index,sink:x.sink})),this.source);if(item&&Number.isInteger(item.index)&&Number.isInteger(item.sink))target={backend:'parec',id:item.index,sink:item.sink};}catch{}
    if(!target){const rows=JSON.parse(await this.run('pw-dump',[]));const item=chooseMusic(rows.filter(x=>x.type==='PipeWire:Interface:Node'&&x.info?.props?.['media.class']==='Stream/Output/Audio').map(x=>({props:x.info.props})),this.source);const serial=item?.props['object.serial'];if(serial!==undefined&&/^\d+$/.test(String(serial)))target={backend:'pw-cat',id:String(serial)};}
    if(generation!==this.generation)return;
    if(JSON.stringify(target)!==JSON.stringify(this.target)){const child=this.child;this.child=null;child?.kill();this.target=target;this.retryAt=0;}
    if(!target)this.publish({available:false,bands:[],error:'Waiting for the music app audio stream. Play music in the app shown in Now Playing, or disable Exclude BeamNG audio for system capture.'});
   }catch{if(generation===this.generation)this.publish({available:false,bands:[],error:'Music-only capture needs PipeWire (pw-dump/pw-cat) or PulseAudio (pactl/parec). Disable Exclude BeamNG audio for system capture.'});}
   finally{this.discovering=false;}
   if(generation===this.generation&&this.target&&!this.child)this.capture();
  }
  start(){if(this.excludeBeamng){void this.discover();return;}this.capture();}
  publish(state){this.state={...state,updatedAt:Date.now()};this.emit('state',this.state);}
  capture(){if(this.child||Date.now()<this.retryAt)return;this.publish({available:false,bands:[],starting:true});const backend=this.target?.backend||this.backend;const child=this.spawnProcess(backend,backend==='parec'?[...(this.target?['--device='+this.target.sink+'.monitor','--monitor-stream='+this.target.id]:['--device=@DEFAULT_MONITOR@']),'--raw','--format=s16le','--rate=22050','--channels=1','--latency-msec=50']:['--record','--raw','--format=s16','--rate=22050','--channels=1','--latency=50ms',...(this.target?['--target='+this.target.id,'--properties={"node.dont-fallback":true,"node.dont-reconnect":true,"node.passive":true}']:['--properties={"stream.capture.sink":true}']),'-'],{stdio:['ignore','pipe','pipe']});this.child=child;let pending=Buffer.alloc(0);child.stdout.on('data',chunk=>{if(this.child!==child)return;pending=Buffer.concat([pending,chunk]);if(pending.length>131072)pending=pending.subarray(pending.length-8192);while(pending.length>=4096){const bands=pcmSpectrum(pending.subarray(0,4096));pending=pending.subarray(2048);this.publish({available:true,bands});}});child.stderr.on('data',()=>{});const ended=()=>{if(this.child!==child)return;this.child=null;this.retryAt=Date.now()+10000;this.publish({available:false,bands:[],error:this.excludeBeamng?'Music-only audio stream unavailable. Keep the music app playing, or disable Exclude BeamNG audio for system capture.':'Linux visualizers need parec or pw-cat and an available desktop audio output monitor.'});};child.on('error',error=>{if(error.code==='ENOENT'&&this.child===child&&backend==='parec'&&!this.target){this.child=null;this.backend='pw-cat';this.start();return;}ended();});child.on('exit',ended);}
  stop(){this.generation++;this.pollAt=0;this.retryAt=0;const child=this.child;this.child=null;if(child)child.kill();this.publish({available:false,bands:[]});}
}
module.exports={LinuxAudio,chooseMusic};

import clips from './vendor/nosleep-media.mjs';

// LAN HTTP cannot use native wake locks; silent inline video is the fallback.
export class ScreenAwake {
 constructor({nav=navigator,doc=document,report=()=>{}}={}){this.nav=nav;this.doc=doc;this.report=report;this.generation=0;this.pending=false;}
 async enable(){
  if(this.doc.hidden||this.pending||this.lock&&!this.lock.released||this.video&&!this.video.paused)return;
  this.pending=true;const generation=this.generation;
  try{
   if(this.nav.wakeLock&&!this.nativeBlocked){
    let lock;
    try{lock=await this.nav.wakeLock.request('screen');}catch{this.nativeBlocked=true;}
    if(lock){
    if(generation!==this.generation){await lock.release();return;}
    this.lock=lock;lock.addEventListener('release',()=>{if(this.lock===lock){this.lock=null;this.report(false);}});
    }
   }
   if(!this.lock){
    if(generation!==this.generation)return;
    // The clip is silent. Leave it unmuted so iOS treats playback as active
    // media; a muted autoplay video alone does not reliably prevent sleep.
    if(!this.video){const v=this.doc.createElement('video');v.muted=false;v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('aria-hidden','true');v.style.cssText='position:fixed;width:1px;height:1px;opacity:.01;pointer-events:none;bottom:0;left:0';
     for(const type of ['webm','mp4']){const s=this.doc.createElement('source');s.src=clips[type];s.type='video/'+type;v.append(s);}
     v.addEventListener('loadedmetadata',()=>{if(v.duration<=1)v.loop=true;});v.addEventListener('timeupdate',()=>{if(v.duration>1&&v.currentTime>.5)v.currentTime=0;});
     v.addEventListener('pause',()=>{if(!this.doc.hidden)this.report(false);});
     this.doc.body.append(v);this.video=v;}
    await this.video.play();if(generation!==this.generation){this.video.pause();return;}
   }
   this.report(true);
  }catch{this.report(false);}finally{this.pending=false;}
 }
 disable(){this.generation++;this.lock?.release().catch(()=>{});this.lock=null;this.video?.pause();this.report(false);}
}

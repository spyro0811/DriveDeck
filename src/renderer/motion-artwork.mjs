const key=media=>JSON.stringify([media.source||'',media.title||'',media.artist||'',media.album||'']);
const appleURL=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(u.hostname.endsWith('.itunes.apple.com')||u.hostname.endsWith('.mzstatic.com'));}catch{return false;}};
export class MotionArtwork {
  constructor(video,failed){this.video=video;this.failed=failed;this.identity='';this.generation=0;this.ready=false;}
  clear(){
    clearTimeout(this.timer);this.generation++;this.ready=false;
    this.video.onloadeddata=null;this.video.onerror=null;this.video.onplaying=null;
    this.hls?.destroy();this.hls=null;this.video.pause();this.video.hidden=true;this.video.removeAttribute('src');this.video.load();
  }
  update(state,media,enabled=true){
    const visible=enabled&&this.video.parentElement.getClientRects().length>0&&!document.hidden;
    const matches=state?.trackKey===key(media);
    const allowed=state?.source==='apple'?appleURL(state.url):state?.source==='canvas'&&typeof state.url==='string'&&/^file:\/\/.+\.(mp4|webm)$/i.test(state.url);
    const identity=visible&&matches&&allowed?`${state.trackKey}|${state.source}|${state.url}`:'';
    if(identity!==this.identity){
      this.clear();this.identity=identity;if(identity){
        const generation=this.generation,video=this.video;video.title=state.source==='apple'?'Animated album artwork · Apple Music':'Local Canvas clip';video.setAttribute('aria-label',video.title);video.muted=true;video.loop=true;video.playsInline=true;
        const fail=()=>{if(generation!==this.generation)return;this.clear();this.failed?.(state.source,state.trackKey);};
        video.onloadeddata=()=>{if(generation!==this.generation)return;clearTimeout(this.timer);this.ready=true;video.hidden=false;};
        video.onerror=fail;
        this.timer=setTimeout(fail,15000);
        if(state.source==='apple'&&window.Hls?.isSupported()){
          this.hls=new window.Hls({enableWorker:false,startLevel:0,capLevelToPlayerSize:true,maxBufferLength:20,maxMaxBufferLength:30,xhrSetup:(_xhr,url)=>{if(!appleURL(url))throw new Error('Unexpected video host.');}});
          this.hls.on(window.Hls.Events.ERROR,(_event,data)=>{if(data.fatal)fail();});
          this.hls.loadSource(state.url);this.hls.attachMedia(video);
        }else if(state.source==='canvas'||video.canPlayType('application/vnd.apple.mpegurl'))video.src=state.url;
        else fail();
      }
    }
    if(!this.identity)return;
    if(visible&&media.playing){if(this.video.paused)this.video.play().catch(()=>{});}
    else if(!this.video.paused)this.video.pause();
  }
}

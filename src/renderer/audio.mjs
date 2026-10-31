import { DEFAULT_PALETTE } from './palette.mjs';
export function sixBands(bands=[]) {
  const edges=[0,5,10,16,21,27,32];
  return edges.slice(0,-1).map((start,i)=>Math.max(0,...bands.slice(start,edges[i+1]).map(v=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):0)));
}
// Expand the useful range of the logarithmic spectrum without inventing beats.
// Each band retains its own recent peak and slower body level, so a small
// spectral dip can fall well below its preceding transient instead of hovering.
export class LevelMotion {
  constructor(){this.values=Array(6).fill(0);this.peaks=Array(6).fill(.6);this.body=Array(6).fill(0);}
  step(samples,dt){
    dt=Math.max(0,Math.min(100,dt));
    return this.values.map((previous,i)=>{
      const value=Number.isFinite(samples?.[i])?Math.max(0,Math.min(1,samples[i])):0;
      this.peaks[i]=Math.max(.55,value,this.peaks[i]*Math.exp(-dt/4000));
      this.body[i]+=(value-this.body[i])*(1-Math.exp(-dt/450));
      const floor=Math.max(.1,this.body[i]*.7);
      const range=Math.max(.18,this.peaks[i]-floor);
      const target=Math.pow(Math.max(0,Math.min(1,(value-floor)/range)),1.7);
      this.values[i]=previous+(target-previous)*(1-Math.exp(-dt/(target>previous?22:85)));
      return this.values[i];
    });
  }
}
export class AudioCanvas {
  constructor(canvas,count=32) { this.canvas=canvas;this.count=count;this.values=Array(count).fill(0);this.motion=new LevelMotion();this.last=0;this.palette=DEFAULT_PALETTE; }
  draw(audio,now,demo=false,playing=false) {
    const c=this.canvas,rect=c.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const ratio=Math.min(devicePixelRatio||1,2),w=Math.round(rect.width*ratio),h=Math.round(rect.height*ratio);
    if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
    const ctx=c.getContext('2d');ctx.clearRect(0,0,w,h);
    const fresh=audio?.available && Date.now()-audio.updatedAt<600;
    const dt=Math.min(100,Math.max(0,now-this.last));this.last=now;
    const gradient=ctx.createLinearGradient(0,h, w,0);this.palette.forEach((color,i)=>gradient.addColorStop(i/(this.palette.length-1),color));ctx.fillStyle=gradient;
    const count=this.count,span=count===6?Math.min(w,h*1.2):w,left=(w-span)/2,gap=span*(count===6?.075:.009),bar=(span-gap*(count-1))/count;
    const samples=count===6?sixBands(audio?.bands):audio?.bands;
    const inputs=Array.from({length:count},(_,i)=>demo
      ? playing?(count===6?.13+.8*Math.pow(Math.max(0,Math.sin(now/(170+i*23)+i*1.7)),4):(.15+.65*Math.pow(Math.sin(now/570+i*.9),2))*Math.sin((i+1)/(count+1)*Math.PI)):0
      : fresh?samples?.[i]:0);
    if(count===6)this.values=this.motion.step(inputs,dt);
    for(let i=0;i<count;i++){
      const sample=inputs[i];
      const target=Number.isFinite(sample)?Math.max(0,Math.min(1,sample)):0;
      if(count!==6)this.values[i]+=(target-this.values[i])*(1-Math.exp(-dt/(target>this.values[i]?45:150)));
      const bh=Math.max(count===6?bar:Math.min(bar,4*ratio),this.values[i]*h*(count===6?.96:.88));ctx.beginPath();ctx.roundRect(left+i*(bar+gap),(h-bh)/2,bar,bh,count===6?bar/2:Math.min(bar/2,4*ratio));ctx.fill();
    }
  }
}

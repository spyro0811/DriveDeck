import {clamp} from './model.mjs';
export class PlaidWarp{
 constructor(canvas){this.canvas=canvas;this.last=0;this.phase=0;this.reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;}
 draw({mode,ready,speed,now,live}){
  const enabled=mode==='plaid'||mode==='sensors'||mode==='plaid-stability';this.canvas.hidden=!enabled;if(!enabled||now-this.last<32)return;
  const dt=this.last?Math.min(100,now-this.last):16;this.last=now;
  const c=this.canvas,r=c.getBoundingClientRect();if(!r.width||!r.height)return;const dpr=Math.min(devicePixelRatio||1,1.5),w=r.width,h=r.height;if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);}const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);if(!live)return;
  const velocity=live&&Math.abs(speed)>=.3?Math.abs(speed):0;const energy=clamp(velocity/60,0,1);if(!this.reduced&&velocity>0)this.phase=(this.phase+dt*velocity*.000018)%1;
  const cx=w*.5,cy=h*.44;ctx.save();ctx.translate(cx,ready?h*.5:cy);ctx.scale(1,.88);const glow=ctx.createRadialGradient(0,0,0,0,0,w*(ready?.16:.43));glow.addColorStop(0,'#fffef6');glow.addColorStop(.065,'#fffce7');glow.addColorStop(.16,'#ffed36');glow.addColorStop(.32,'#ffc21ccf');glow.addColorStop(.52,'#ff650989');glow.addColorStop(.78,'#e2341630');glow.addColorStop(1,'#e2341600');ctx.fillStyle=glow;ctx.fillRect(-w,-h,w*2,h*2);ctx.restore();
  ctx.save();ctx.globalAlpha=ready?.22:.9;const colors=['#ffb426','#ff3f35','#ffef7b','#e9499b'];ctx.lineCap='round';
  // Rays extend from the vanishing point all the way across the cluster.
  for(let i=0;i<28;i++){const angle=i/28*Math.PI*2,x=cx+Math.cos(angle)*w*1.15,y=cy+Math.sin(angle)*h*1.7;ctx.strokeStyle=colors[i%4];ctx.shadowColor=colors[i%4];ctx.shadowBlur=ready?4:12;ctx.lineWidth=i%4===0?3:1.6;ctx.beginPath();ctx.moveTo(cx+(x-cx)*.035,cy+(y-cy)*.035);ctx.lineTo(x,y);ctx.stroke();}
  // Expanding rectangular portals reproduce the reference's forward movement.
  for(let i=0;i<7;i++){const depth=((i/7+this.phase)%1),scale=.018+depth*depth*1.75,rw=w*.65*scale,rh=h*1.8*scale;ctx.strokeStyle=i%2?'#ff8acb':'#fff7a4';ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=8;ctx.globalAlpha=(ready?.15:.85)*Math.min(1,depth*4);ctx.lineWidth=1+depth*2;ctx.strokeRect(cx-rw/2,cy-rh/2,rw,rh);}
  ctx.restore();const shade=ctx.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#000b');shade.addColorStop(.18,'#0000');shade.addColorStop(.78,'#0000');shade.addColorStop(1,'#000b');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
 }
}



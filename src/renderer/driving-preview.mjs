import {SurroundingsView} from './surroundings.mjs';
import {vehicleVisual} from './vehicle-identity.mjs';
const loadImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});
// Render the current telemetry through the same scene renderer as the dashboard.
// No sample roads, invented traffic, or illustration thumbnails are substituted.
export async function captureDrivingViews(prefix,ids,state,modes){
 if(!state)return;
 const source=ids[prefix+'-surroundings'],rect=source.getBoundingClientRect(),carRect=ids[prefix+'-driving-car'].getBoundingClientRect();
 const width=640,height=Math.round(width*(rect.height&&rect.width?rect.height/rect.width:.56));
 const visual=vehicleVisual(state.data);let car=null;
 try{if(visual.asset)car=await loadImage(new URL(`./assets/vehicles/${visual.asset}.png`,import.meta.url).href);
 else {const svg=ids[prefix+'-rear-fallback'].cloneNode(true);svg.removeAttribute('hidden');svg.setAttribute('xmlns','http://www.w3.org/2000/svg');car=await loadImage('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg)));}}catch{}
 for(const [mode]of modes){
  const canvas=document.createElement('canvas');canvas.getBoundingClientRect=()=>({width,height});
  const renderer=new SurroundingsView(canvas,{appearance:prefix==='ms'?'dark':'light'});renderer.draw(state.data,state.now+1000,state.map,mode);
  const ctx=canvas.getContext('2d');ctx.globalCompositeOperation='destination-over';ctx.fillStyle=prefix==='mt'?'#f2f3f4':'#090b0d';ctx.fillRect(0,0,width,height);ctx.globalCompositeOperation='source-over';
  if(car){const box=visual.viewBox||[0,0,car.naturalWidth,car.naturalHeight],cw=carRect.width&&rect.width?carRect.width/rect.width*width:width*.25,ch=carRect.height&&rect.height?carRect.height/rect.height*height:height*.4,x=carRect.width?(carRect.x-rect.x)/rect.width*width:(width-cw)/2,y=carRect.height?(carRect.y-rect.y)/rect.height*height:height*.56,scale=Math.min(cw/box[2],ch/box[3]),w=box[2]*scale,h=box[3]*scale;ctx.drawImage(car,...box,x+(cw-w)/2,y+(ch-h)/2,w,h);}
  const image=ids[prefix+'-performance-library'].querySelector(`[data-driving-mode="${mode}"] img`);image.src=canvas.toDataURL('image/png');image.dataset.captured='true';
 }
}

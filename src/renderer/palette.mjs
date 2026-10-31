export const DEFAULT_PALETTE = ['#81d9ff','#c7b5ff','#ffb9d5'];
export function paletteFromPixels(pixels) {
  const buckets=new Map();
  for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]<128)continue;
    const rgb=[pixels[i],pixels[i+1],pixels[i+2]],key=rgb.map(n=>n>>5).join(',');
    const bucket=buckets.get(key)||{count:0,sum:[0,0,0]};bucket.count++;rgb.forEach((n,j)=>bucket.sum[j]+=n);buckets.set(key,bucket);
  }
  const candidates=[...buckets.values()].map(b=>({rgb:b.sum.map(n=>n/b.count),count:b.count})).sort((a,b)=>b.count-a.count);
  if(!candidates.length)return [...DEFAULT_PALETTE];
  const chosen=[candidates[0].rgb];
  for(const candidate of candidates.slice(1)){if(chosen.every(rgb=>Math.hypot(...rgb.map((n,i)=>n-candidate.rgb[i]))>65))chosen.push(candidate.rgb);if(chosen.length===3)break;}
  while(chosen.length<3)chosen.push(chosen[chosen.length-1].map(n=>n*.82+255*.18));
  return chosen.map(rgb=>{const max=Math.max(...rgb);const lift=max<155?(155-max)/(255-max):0;return '#'+rgb.map(n=>Math.round(n+(255-n)*lift).toString(16).padStart(2,'0')).join('');});
}
export async function artworkPalette(source) {
  if(!source)return [...DEFAULT_PALETTE];
  const image=new Image();image.src=source;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=canvas.height=48;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,48,48);
  return paletteFromPixels(ctx.getImageData(0,0,48,48).data);
}

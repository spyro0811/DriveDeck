export const DEFAULT_PALETTE = ['#81d9ff','#c7b5ff','#ffb9d5'];
export function paletteFromPixels(pixels) {
  // Group shades of one hue together so shadows do not split a prominent color.
  const groups=new Map();let total=0;
  for(let i=0;i<pixels.length;i+=4){
    if(pixels[i+3]<128)continue;
    const rgb=[pixels[i],pixels[i+1],pixels[i+2]],max=Math.max(...rgb),min=Math.min(...rgb),delta=max-min;
    const colorful=max>=35&&delta>=12&&delta/Math.max(1,max)>.28;
    let hue=0;
    if(colorful){hue=(max===rgb[0]?(rgb[1]-rgb[2])/delta:max===rgb[1]?2+(rgb[2]-rgb[0])/delta:4+(rgb[0]-rgb[1])/delta)*60;hue=(hue+360)%360;}
    const key=colorful?'h'+Math.round(hue/15)%24:max<48?'black':max>210?'white':'gray'+Math.floor(max/64);
    const g=groups.get(key)||{count:0,sum:[0,0,0],colorful,hue};
    g.count++;rgb.forEach((v,j)=>g.sum[j]+=v);groups.set(key,g);total++;
  }
  if(!total)return [...DEFAULT_PALETTE];
  const candidates=[...groups.values()].sort((a,b)=>b.count-a.count),merged=[];
  for(const g of candidates){const near=merged.find(m=>m.colorful&&g.colorful&&Math.min(Math.abs(m.hue-g.hue),360-Math.abs(m.hue-g.hue))<=30);if(near){near.count+=g.count;g.sum.forEach((v,j)=>near.sum[j]+=v);}else merged.push({...g,sum:[...g.sum]});}
  merged.sort((a,b)=>b.count-a.count);
  // A substantial accent beats neutral shadows, but tiny logos/highlights do not.
  const accent=merged.filter(g=>g.colorful&&g.count>=total*.025).sort((a,b)=>b.count-a.count)[0];
  const first=accent||merged[0],chosen=[first];
  const rgbOf=g=>g.sum.map(v=>v/g.count);
  for(const g of merged){if(g===first||g.count<total*.025)continue;if(chosen.every(c=>Math.hypot(...rgbOf(c).map((v,j)=>v-rgbOf(g)[j]))>55))chosen.push(g);if(chosen.length===3)break;}
  const colors=chosen.map(g=>{const rgb=rgbOf(g),max=Math.max(...rgb);const scale=g.colorful&&max<155?155/Math.max(1,max):1;const lift=!g.colorful&&max<64?96-max:0;return '#'+rgb.map(v=>Math.round(Math.min(255,v*scale+lift)).toString(16).padStart(2,'0')).join('');});
  while(colors.length<3)colors.push(colors[colors.length-1]);
  return colors;
}
export async function artworkPalette(source) {
  if(!source)return [...DEFAULT_PALETTE];
  const image=new Image();image.src=source;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=canvas.height=48;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,48,48);
  return paletteFromPixels(ctx.getImageData(0,0,48,48).data);
}

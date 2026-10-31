// Remove only border-connected studio pixels; enclosed paint, windows and badges stay intact.
// Runs once per local preview, not per animation frame. No network or generated car assets.
export function studioMatte(rgba,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||width*height>1500000||rgba.length!==width*height*4)return rgba;
 const out=new Uint8ClampedArray(rgba),seen=new Uint8Array(width*height),queue=new Int32Array(width*height);let head=0,tail=0;
 const rows=[];
 for(let y=0;y<height;y++){const l=(y*width)*4,r=(y*width+width-1)*4;rows.push([rgba[l],rgba[l+1],rgba[l+2],rgba[r],rgba[r+1],rgba[r+2]]);}
 function add(x,y){const i=y*width+x;if(seen[i])return;seen[i]=1;const j=i*4;if(rgba[j+3]===0){queue[tail++]=i;return;}
  const row=rows[y],t=x/(width-1),bg=[0,1,2].map(c=>row[c]*(1-t)+row[c+3]*t),d=[0,1,2].map(c=>rgba[j+c]-bg[c]);
  const brightness=(d[0]+d[1]+d[2])/3,chroma=Math.max(...d)-Math.min(...d);
  // Preserve neutral tires/trim against BeamNG's slightly blue-gray studio.
  if(chroma<=7&&brightness>=-42&&brightness<=23)queue[tail++]=i;
 }
 for(let x=0;x<width;x++){add(x,0);add(x,height-1);}for(let y=1;y<height-1;y++){add(0,y);add(width-1,y);}
 while(head<tail){const i=queue[head++],x=i%width,y=Math.floor(i/width);out[i*4+3]=0;if(x)add(x-1,y);if(x+1<width)add(x+1,y);if(y)add(x,y-1);if(y+1<height)add(x,y+1);}
 return out;
}
export async function clearStudioPreview(src){
 const image=new Image();image.src=src;await image.decode();
 const scale=Math.min(1,1000/image.naturalWidth,700/image.naturalHeight),width=Math.max(2,Math.round(image.naturalWidth*scale)),height=Math.max(2,Math.round(image.naturalHeight*scale));
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,width,height);const pixels=ctx.getImageData(0,0,width,height);pixels.data.set(studioMatte(pixels.data,width,height));ctx.putImageData(pixels,0,0);return canvas.toDataURL('image/png');
}

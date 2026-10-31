// Material samples can describe the terrain below a city mesh. Use actual roof
// coverage to suppress those colors in confidently built-up neighborhoods.
// This is a schematic urban base, not an authoritative land-use/park boundary.
const cache=new WeakMap();
function clip(poly,axis,value,keepGreater){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],inside=p=>keepGreater?p[axis]>=value:p[axis]<=value,ai=inside(a),bi=inside(b);if(ai)out.push(a);if(ai!==bi){const t=(value-a[axis])/(b[axis]-a[axis]);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}}return out;}
function area(poly){let sum=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];sum+=a[0]*b[1]-b[0]*a[1];}return Math.abs(sum)*.5;}
export function urbanTerrain(terrain,buildings){
 if(!terrain||!buildings?.length)return terrain;
 const previous=cache.get(terrain);if(previous?.buildings===buildings)return previous.result;
 const {width,height,step,origin}=terrain,coverage=new Float32Array(width*height),cells=terrain.cells.slice();
 for(const b of buildings){
  const poly=[[b[0],b[1]],[b[2],b[3]],[b[4],b[5]],[b[6],b[7]]],xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);
  const x0=Math.max(0,Math.floor((Math.min(...xs)-origin[0])/step)),x1=Math.min(width-1,Math.floor((Math.max(...xs)-origin[0])/step)),y0=Math.max(0,Math.floor((Math.min(...ys)-origin[1])/step)),y1=Math.min(height-1,Math.floor((Math.max(...ys)-origin[1])/step));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const l=origin[0]+x*step,t=origin[1]+y*step;let p=clip(poly,0,l,true);p=clip(p,0,l+step,false);p=clip(p,1,t,true);p=clip(p,1,t+step,false);coverage[y*width+x]=Math.min(1,coverage[y*width+x]+area(p)/(step*step));}
 }
 // Integral area makes neighborhood queries cheap and independent of mesh count.
 const stride=width+1,sums=new Float64Array(stride*(height+1));for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y+1)*stride+x+1;sums[i]=coverage[y*width+x]+sums[i-1]+sums[i-stride]-sums[i-stride-1];}
 const radius=Math.max(1,Math.round(70/step));let urbanCells=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const x0=Math.max(0,x-radius),x1=Math.min(width,x+radius+1),y0=Math.max(0,y-radius),y1=Math.min(height,y+radius+1),roof=sums[y1*stride+x1]-sums[y0*stride+x1]-sums[y1*stride+x0]+sums[y0*stride+x0],density=roof/((x1-x0)*(y1-y0));
  if(density>=.10){cells[y*width+x]=3;urbanCells++;}
 }
 const result=urbanCells?{...terrain,cells,urbanCells}:terrain;cache.set(terrain,{buildings,result});return result;
}

// Conservative bounds: omit combined city-block meshes rather than turn their empty
// courtyards/streets into solid buildings. Apply to old and new companion feeds.
const roadCache=new WeakMap(),buildingCache=new WeakMap();
function roadIndex(roads){if(roadCache.has(roads))return roadCache.get(roads);const grid=new Map();for(const r of roads){if(r[5]<=.25)continue;const x0=Math.floor(Math.min(r[0],r[2])/128),x1=Math.floor(Math.max(r[0],r[2])/128),y0=Math.floor(Math.min(r[1],r[3])/128),y1=Math.floor(Math.max(r[1],r[3])/128);if((x1-x0+1)*(y1-y0+1)>4096)continue;for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const key=x+','+y;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(r);}}roadCache.set(roads,grid);return grid;}
export function crossesFootprint(b,r){
 let area=0;for(let i=0;i<4;i++){const j=(i+1)%4;area+=b[i*2]*b[j*2+1]-b[j*2]*b[i*2+1];}const sign=area>=0?1:-1;let lo=0,hi=1;
 for(let i=0;i<4;i++){const j=(i+1)%4,x=b[i*2],y=b[i*2+1],dx=b[j*2]-x,dy=b[j*2+1]-y;const a=sign*(dx*(r[1]-y)-dy*(r[0]-x))-Math.hypot(dx,dy)*2,d=sign*(dx*(r[3]-r[1])-dy*(r[2]-r[0]));if(Math.abs(d)<1e-9){if(a<0)return false;}else{const t=-a/d;if(d>0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false;}}
 return hi>=0&&lo<=1;
}
export function cleanBuildings(buildings,roads){
 if(!buildings?.length)return buildings||[];let cached=buildingCache.get(buildings);if(cached?.roads===roads)return cached.result;const grid=roadIndex(roads||[]),result=[];
 for(const b of buildings){let area=0,maxSide=0;for(let i=0;i<4;i++){const j=(i+1)%4;area+=b[i*2]*b[j*2+1]-b[j*2]*b[i*2+1];maxSide=Math.max(maxSide,Math.hypot(b[j*2]-b[i*2],b[j*2+1]-b[i*2+1]));}if(Math.abs(area)/2>18000||maxSide>220)continue;
 const xs=[b[0],b[2],b[4],b[6]],ys=[b[1],b[3],b[5],b[7]],seen=new Set();let crossed=false;
 for(let y=Math.floor(Math.min(...ys)/128);y<=Math.floor(Math.max(...ys)/128)&&!crossed;y++)for(let x=Math.floor(Math.min(...xs)/128);x<=Math.floor(Math.max(...xs)/128)&&!crossed;x++)for(const r of grid.get(x+','+y)||[]){if(seen.has(r))continue;seen.add(r);if(crossesFootprint(b,r)){crossed=true;break;}}
 if(!crossed)result.push(b);
 }buildingCache.set(buildings,{roads,result});return result;
}

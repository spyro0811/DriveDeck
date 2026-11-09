export function projectTraffic([x,y,z],w,h){const pitch=.19,forward=y+12,up=z-4,depth=forward*Math.cos(pitch)-up*Math.sin(pitch),f=Math.min(w*1.35,h*1.45);if(depth<1)return null;return {x:w*.5+x*f/depth,y:h*.48-(forward*Math.sin(pitch)+up*Math.cos(pitch))*f/depth,depth};}
const face=(points,color)=>({points,color});
function box(x,y,z,w,l,h,colors){const p=[[x-w/2,y-l/2,z],[x+w/2,y-l/2,z],[x+w/2,y+l/2,z],[x-w/2,y+l/2,z],[x-w/2,y-l/2,z+h],[x+w/2,y-l/2,z+h],[x+w/2,y+l/2,z+h],[x-w/2,y+l/2,z+h]];return [[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]].map((indices,i)=>face(indices.map(n=>p[n]),colors[i%colors.length]));}
function sedanBody(colors){const ring=[[-.65,-2.2],[.65,-2.2],[.9,-1.85],[.93,1.5],[.7,2.2],[-.7,2.2],[-.93,1.5],[-.9,-1.85]],faces=[];for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];faces.push(face([[...a,.3],[...b,.3],[b[0]*.95,b[1]*.98,.85],[a[0]*.95,a[1]*.98,.85]],colors[i%4]));}faces.push(face(ring.map(p=>[p[0]*.95,p[1]*.98,.85]),colors[4]));return faces;}
export function trafficCarMesh(v){
 const special=bodyStyleMesh(v.body);if(special)return placeVehicle(special,v);
 const faces=[],silver=['#737b80','#81898e','#8e969b','#969ea3','#899196','#70787d'];
 const sections=[[-2.25,.65,.66],[-1.85,.87,.83],[-1.1,.93,.9],[.6,.93,.91],[1.65,.86,.78],[2.25,.62,.58]];
 const rawRing=([y,w,z])=>[[-w,y,.28],[-w,y,z*.78],[-w*.85,y,z],[0,y,z+.055],[w*.85,y,z],[w,y,z*.78],[w,y,.28]];
 const ring=row=>smoothCross(rawRing(row));const shell=smoothSections(sections);for(let row=0;row<shell.length-1;row++){const a=ring(shell[row]),b=ring(shell[row+1]);for(let i=0;i<a.length-1;i++)faces.push(face([a[i],b[i],b[i+1],a[i+1]],silver[2]));}
 faces.push(face(ring(sections[0]),'#7d858b'),face(ring(sections.at(-1)),'#8d969d'));
 const roof=v.body==='suv'?[[-1.85,.77,.88],[-1.2,.68,1.8],[.6,.68,1.8],[1.45,.76,.89]]:v.body==='van'?[[-1.9,.8,.88],[-1.6,.72,2.1],[.9,.72,2.1],[1.6,.8,.89]]:[[-1.45,.77,.88],[-.65,.62,1.42],[.4,.63,1.46],[1.25,.76,.89]];
 const rawRoofRing=([y,w,z])=>[[-.79,y,.87],[-w,y,z],[0,y,z+.04],[w,y,z],[.79,y,.87]];
 const roofRing=row=>smoothCross(rawRoofRing(row));const canopy=smoothSections(roof);for(let row=0;row<canopy.length-1;row++){const a=roofRing(canopy[row]),b=roofRing(canopy[row+1]);for(let i=0;i<a.length-1;i++)faces.push(face([a[i],b[i],b[i+1],a[i+1]],row>3&&row<8&&i>0&&i<3?'#858e94':['#596167','#525b61','#636b70','#535c62'][i]));}
 for(const side of [-1,1])for(const y of [-1.4,1.4]){const cx=side*.91,cz=.36,r=.35;for(let i=0;i<16;i++){const a=i/16*Math.PI*2,b=(i+1)/16*Math.PI*2;faces.push(face([[cx-side*.09,y+Math.cos(a)*r,cz+Math.sin(a)*r],[cx+side*.12,y+Math.cos(a)*r,cz+Math.sin(a)*r],[cx+side*.12,y+Math.cos(b)*r,cz+Math.sin(b)*r],[cx-side*.09,y+Math.cos(b)*r,cz+Math.sin(b)*r]],'#1d252d'));}faces.push(face(Array.from({length:16},(_,i)=>{const a=i/16*Math.PI*2;return [cx+side*.125,y+Math.cos(a)*r*.64,cz+Math.sin(a)*r*.64];}),'#8796a3'));}
 for(const x of [-.58,.58]){faces.push(...box(x,-2.255,.52,.43,.02,.1,['#d35b60']));faces.push(...box(x,2.255,.46,.34,.02,.08,['#eef4f4']));}
 for(const side of [-1,1])faces.push(...box(side*.97,.7,1,.19,.28,.1,['#a7b3bd']));
 const angle=v.heading*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);return faces.map(f=>({...grayVehicleFace(f),smooth:true,points:f.points.map(([x,y,z])=>[v.x+(x*c+y*s)*.78,v.y+(y*c-x*s)*.78,z*.78])}));
}
export function trafficSignalMesh(signal){const x=signal.x+(signal.armX||0),y=signal.y+(signal.armY||0),height=signal.height||5;const faces=[...box(signal.x,signal.y,0,.12,.12,height+(signal.armX!==undefined?.9:0),['#717d86','#596771','#8e9aa3']),...box(x,y,height-.85,.7,.36,1.7,['#202b35','#36424b','#1c2630','#46515a'])];
 if(signal.armX!==undefined){const dx=signal.armX,dy=signal.armY,length=Math.hypot(dx,dy),a=Math.atan2(dx,dy),c=Math.cos(a),sn=Math.sin(a);faces.push(...box(0,0,height+.8,.16,length,.16,['#7b8791']).map(f=>({...f,points:f.points.map(([px,py,pz])=>[signal.x+dx/2+px*c+py*sn,signal.y+dy/2+py*c-px*sn,pz])})));}
 for(const [i,color]of ['red','amber','green'].entries()){const z=height+.55-i*.49;faces.push(face(Array.from({length:16},(_,n)=>{const a=n/16*Math.PI*2;return [x+Math.cos(a)*.2,y-.185,z+Math.sin(a)*.2];}),signal.state===color?{red:'#ff625b',amber:'#ffc14e',green:'#4bdb9a'}[color]:'#46505a'));}
 return faces;
}
export function paintTraffic(ctx,faces,w,h){const projected=faces.map(f=>{const points=f.points.map(p=>projectTraffic(p,w,h));if(points.some(p=>!p))return null;return {...f,points,depth:points.reduce((s,p)=>s+p.depth,0)/points.length};}).filter(Boolean).sort((a,b)=>b.depth-a.depth);for(const f of projected){ctx.beginPath();f.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=f.color;ctx.fill();ctx.strokeStyle='#23303b35';ctx.lineWidth=f.smooth?.65:.45;if(f.smooth)ctx.strokeStyle=f.color;ctx.stroke();}}



export function paintSignalGlow(ctx,signals,w,h){for(const signal of signals){const index={red:0,amber:1,green:2}[signal.state];if(index===undefined)continue;const z=(signal.height||5)+.55-index*.49,p=projectTraffic([signal.x+(signal.armX||0),signal.y+(signal.armY||0)-.2,z],w,h);if(!p)continue;const edge=projectTraffic([signal.x+(signal.armX||0)+.23,signal.y+(signal.armY||0)-.2,z],w,h),radius=Math.max(2.5,Math.abs(edge.x-p.x)),color={red:'#ff514b',amber:'#ffbf3e',green:'#26f58a'}[signal.state];ctx.save();ctx.shadowColor=color;ctx.shadowBlur=radius*3;ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#edfff1';ctx.globalAlpha=.8;ctx.beginPath();ctx.arc(p.x,p.y,radius*.38,0,Math.PI*2);ctx.fill();ctx.restore();}}
function placeVehicle(faces,v){const a=v.heading*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return faces.map(f=>({...grayVehicleFace(f),smooth:true,points:f.points.map(([x,y,z])=>[v.x+(x*c+y*s)*.78,v.y+(y*c-x*s)*.78,z*.78])}));}
function bodyStyleMesh(body){if(!body||['sedan','unknown','suv','van'].includes(body))return null;const f=[],part=(x,y,z,w,l,h,r=.18)=>f.push(...roundedVehiclePart(x,y,z,w,l,h,r));
 if(body==='pickup'){part(0,0,.35,1.95,5,.45);part(0,.65,.75,1.85,2.5,1.05,.3);part(0,2.05,.7,1.85,1.1,.35);part(0,-1.55,.78,1.65,1.7,.08);for(const side of [-1,1])part(side*.89,-1.55,.8,.16,1.8,.35,.06);part(0,-2.36,.8,1.85,.12,.35,.04);f.push(...vehicleWheels([-1.65,1.65],1,.39));}
 else if(body==='semi'){part(0,-.6,.45,1.25,6,.25,.1);part(0,1.15,.75,2.25,2.7,2.35,.35);part(0,2.95,.65,2.05,1.5,.8,.25);for(const side of [-1,1])part(side*1.05,-1.65,.95,.5,2.05,.2,.12);f.push(...vehicleWheels([-2.25,-1.05,2.8],1.12,.5));f.push(face(Array.from({length:32},(_,i)=>{const a=i/32*Math.PI*2;return [Math.cos(a)*.6,-1.5+Math.sin(a)*.6,.98];}),'#777777'));}
 else if(body==='box-truck'||body==='truck'){part(0,0,.4,2.25,7,.35);part(0,2.35,.75,2.2,2.2,1.9,.3);if(body==='box-truck')part(0,-1.1,.8,2.35,4.55,2.65,.12);else part(0,-1.3,.8,2.15,4,.2);f.push(...vehicleWheels([-2.2,2.35],1.15,.46));}
 else {const length=body==='bus'?10:5.5;part(0,0,.4,2.25,length,2.35,.3);f.push(...vehicleWheels([-length*.33,length*.33],1.13,.45));}
 return f;}
function roundedVehiclePart(x,y,z,w,l,h,r){r=Math.min(r,w*.4,l*.4,h*.45);const rings=[];for(const [height,inset]of [[0,r*.4],[r,0],[h-r,0],[h,r*.65]]){const points=[];const hw=w/2-inset,hl=l/2-inset;for(const [cx,cy,start]of [[hw-r,hl-r,0],[-hw+r,hl-r,90],[-hw+r,-hl+r,180],[hw-r,-hl+r,270]])for(let i=0;i<8;i++){const a=(start+i/7*90)*Math.PI/180;points.push([x+cx+Math.cos(a)*r,y+cy+Math.sin(a)*r,z+height]);}rings.push(points);}const faces=[];for(let j=0;j<rings.length-1;j++)for(let i=0;i<32;i++){const n=(i+1)%32;faces.push(face([rings[j][i],rings[j][n],rings[j+1][n],rings[j+1][i]],'#909090'));}faces.push(face(rings.at(-1),'#909090'));return faces;}
function vehicleWheels(axles,x,r){const faces=[];for(const side of [-1,1])for(const y of axles){const cx=x*side,cz=r;for(let i=0;i<24;i++){const a=i/24*Math.PI*2,b=(i+1)/24*Math.PI*2;faces.push(face([[cx-.13,y+Math.cos(a)*r,cz+Math.sin(a)*r],[cx+.13,y+Math.cos(a)*r,cz+Math.sin(a)*r],[cx+.13,y+Math.cos(b)*r,cz+Math.sin(b)*r],[cx-.13,y+Math.cos(b)*r,cz+Math.sin(b)*r]],'#555555'));}faces.push(face(Array.from({length:24},(_,i)=>{const a=i/24*Math.PI*2;return [cx+side*.135,y+Math.cos(a)*r,cz+Math.sin(a)*r];}),'#666666'));}return faces;}
function grayVehicleFace(f){const [a,b,c]=f.points,u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n)||1;const lighting=.82+.18*Math.abs((n[0]*-.35+n[1]*-.45+n[2]*.82)/len),dark=['#555555','#666666','#1d252d'].includes(f.color)?.72:['#596167','#525b61','#636b70','#535c62'].includes(f.color)?.88:1,tone=Math.round(150*lighting*dark);return {...f,color:`rgb(${tone},${tone},${tone})`};}
export function roadsideMesh(o){
 const a=o.heading*Math.PI/180,c=Math.cos(a),s=Math.sin(a);let faces;
 if(o.kind==='guardrail'&&o.solid){faces=box(0,0,0,Math.max(.25,o.width),o.length,o.height,['#a9adaf','#c1c4c6','#b4b8ba']);}
 else if(o.kind==='guardrail'){const wide=o.width>o.length,length=Math.max(o.width,o.length),height=Math.max(.65,Math.min(1.4,o.height)),parts=[];
  const part=(x,y,z,w,l,h)=>parts.push(...box(x,y,z,w,l,h,['#92979b','#b1b5b8','#a1a6aa']));
  part(0,0,height*.72,.16,length,.19);part(0,0,height*.94,.14,length,.12);
  const count=Math.max(1,Math.ceil(length/3));for(let i=0;i<=count;i++)part(0,-length/2+length*i/count,0,.12,.12,height);
  faces=wide?parts.map(f=>({...f,points:f.points.map(([x,y,z])=>[y,-x,z])})):parts;
 }else faces=box(0,0,0,o.width,o.length,Math.min(.3,o.height),['#777777','#929292','#aaaaaa']);
 return faces.map(f=>({...f,points:f.points.map(([x,y,z])=>[o.x+x*c+y*s,o.y+y*c-x*s,z])}));
}

function smoothSections(rows){const out=[];for(let i=0;i<rows.length-1;i++)for(let j=0;j<4;j++){const t=j/4,a=rows[Math.max(0,i-1)],b=rows[i],c=rows[i+1],d=rows[Math.min(rows.length-1,i+2)];out.push(b.map((v,k)=>.5*((2*v)+(-a[k]+c[k])*t+(2*a[k]-5*v+4*c[k]-d[k])*t*t+(-a[k]+3*v-3*c[k]+d[k])*t*t*t)));}out.push(rows.at(-1));return out;}




function smoothCross(rows){const out=[];for(let i=0;i<rows.length-1;i++)for(let j=0;j<2;j++){const t=j/2,a=rows[Math.max(0,i-1)],b=rows[i],c=rows[i+1],d=rows[Math.min(rows.length-1,i+2)];out.push(b.map((v,k)=>.5*(2*v+(-a[k]+c[k])*t+(2*a[k]-5*v+4*c[k]-d[k])*t*t+(-a[k]+3*v-3*c[k]+d[k])*t*t*t)));}out.push(rows.at(-1));return out;}


export function stopSignMesh(sign){const height=sign.height||2.2;const plate=(radius,y)=>Array.from({length:8},(_,i)=>{const a=(i*45+22.5)*Math.PI/180;return [sign.x+Math.cos(a)*radius,sign.y+y,height+Math.sin(a)*radius];});return [...box(sign.x,sign.y,0,.07,.07,height,['#89969f']),face(plate(.5,0),'#eceeed'),face(plate(.44,-.02),'#ce4946')];}
export function paintStopLabels(ctx,signs,w,h){for(const sign of signs){const p=projectTraffic([sign.x,sign.y-.04,sign.height||2.2],w,h),edge=projectTraffic([sign.x+.5,sign.y,sign.height||2.2],w,h);if(!p||!edge)continue;const radius=Math.max(4,Math.abs(edge.x-p.x));ctx.save();ctx.fillStyle='#f9faf9';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+Math.max(5,Math.min(15,radius*.58))+'px sans-serif';ctx.fillText('STOP',p.x,p.y);ctx.restore();}}

// Distance to the actual oriented sidewalk rectangle, measured from the vehicle footprint.
export function sidewalkClearance(o){const a=o.heading*Math.PI/180,c=Math.cos(a),s=Math.sin(a),x=-o.x*c+o.y*s,y=-o.x*s-o.y*c;const dx=Math.max(0,Math.abs(x)-o.width/2),dy=Math.max(0,Math.abs(y)-o.length/2);return Math.max(0,Math.hypot(dx,dy)-.95);}
export function paintSidewalkProximity(ctx,objects,w,h){
 for(const o of objects){if(o.kind!=='sidewalk')continue;const clearance=sidewalkClearance(o),strength=Math.max(0,1-clearance/1.6);if(!strength)continue;
  const a=o.heading*Math.PI/180,c=Math.cos(a),s=Math.sin(a),lx=Math.max(-o.width/2,Math.min(o.width/2,-o.x*c+o.y*s)),ly=Math.max(-o.length/2,Math.min(o.length/2,-o.x*s-o.y*c));
  const x=o.x+lx*c+ly*s,y=o.y+ly*c-lx*s,p=projectTraffic([x,y,.18],w,h);if(!p)continue;const q=projectTraffic([x+1.4,y,.18],w,h);if(!q)continue;
  const radius=Math.max(10,Math.min(w*.2,Math.abs(q.x-p.x)*1.5));ctx.save();const gradient=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius);gradient.addColorStop(0,`rgba(255,${Math.round(200-strength*50)},30,${.7*strength})`);gradient.addColorStop(.45,`rgba(255,210,30,${.4*strength})`);gradient.addColorStop(1,'rgba(255,220,30,0)');ctx.fillStyle=gradient;
  // Clip heat to the sidewalk surface instead of painting a broad road-width strip.
  const corners=[[-o.width/2,-o.length/2],[o.width/2,-o.length/2],[o.width/2,o.length/2],[-o.width/2,o.length/2]].map(([u,v])=>projectTraffic([o.x+u*c+v*s,o.y+v*c-u*s,.17],w,h));
  if(corners.every(Boolean)){ctx.beginPath();corners.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();ctx.clip();ctx.fillRect(p.x-radius,p.y-radius,radius*2,radius*2);}ctx.restore();
 }
}

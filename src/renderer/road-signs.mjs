import {projectTraffic} from './traffic-3d.mjs';
export function roadSignMesh(s){const h=s.height||2.2,diamond=['warning','turn-left','turn-right','winding-left','winding-right','merge-left','merge-right'].includes(s.kind),yieldSign=s.kind==='yield',w=s.kind==='speed'?.48:.5,color=s.kind==='no-entry'?'#c94942':yieldSign?'#d8554a':s.kind==='information'?'#4a7799':s.kind==='speed'?'#f1f1ed':'#e1b132';let outline=yieldSign?[[-.58,.38],[.58,.38],[0,-.58]]:diamond?[[0,.64],[.64,0],[0,-.64],[-.64,0]]:[[-w,-.57],[w,-.57],[w,.57],[-w,.57]];return[{color:'#8c969d',points:[[s.x-.035,s.y,0],[s.x+.035,s.y,0],[s.x+.035,s.y,h],[s.x-.035,s.y,h]]},{color,points:outline.map(([x,z])=>[s.x+x,s.y,h+z])}];}
export function paintRoadSigns(ctx,signs,w,h){for(const s of signs){const p=projectTraffic([s.x,s.y-.02,s.height||2.2],w,h),q=projectTraffic([s.x+.5,s.y,s.height||2.2],w,h);if(!p||!q)continue;const r=Math.abs(q.x-p.x);if(r<2)continue;ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle=['information','no-entry','yield'].includes(s.kind)?'#fff':'#181b1c';ctx.textAlign='center';ctx.textBaseline='middle';const left=s.kind.endsWith('-left'),arrow=['chevron-left','chevron-right','turn-left','turn-right','winding-left','winding-right','merge-left','merge-right'].includes(s.kind);
 if(s.kind.startsWith('chevron')){const flip=left?1:-1;ctx.beginPath();for(const [i,[x,y]]of [[-.05,-.9],[-.85,0],[-.05,.9],[.58,.9],[-.2,0],[.58,-.9]].entries())i?ctx.lineTo(x*r*flip,y*r):ctx.moveTo(x*r*flip,y*r);ctx.closePath();ctx.fill();}
 else{const label=s.kind==='speed'?String(s.speed||''):(arrow?(left?'↶':'↷'):s.kind==='yield'?'YIELD':s.kind==='no-entry'?'—':s.label||'!');ctx.font='600 '+Math.max(4,Math.min(22,r*(label.length>6?.37:label.length>2?.55:1.25)))+'px sans-serif';ctx.fillText(label,0,0);if(s.kind==='speed'){ctx.font=Math.max(3,r*.3)+'px sans-serif';ctx.fillText('SPEED LIMIT',0,-r*.72);}}
 ctx.restore();}}
// Weld shared mesh edges, including a long edge meeting two shorter edges.
// Otherwise the junction is mistakenly extruded into an internal wall.
export function barrierBoundary(triangles){
 const key=p=>p.map(v=>Math.round(v*100)).join(','),edges=new Map();
 for(const t of triangles)for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3],ka=key(a),kb=key(b);if(ka===kb)continue;const k=ka<kb?ka+':'+kb:kb+':'+ka,e=edges.get(k);if(e)e.count++;else edges.set(k,{a,b,count:1});}
 const outer=[...edges.values()].filter(e=>e.count===1),grid=new Map(),vertices=new Map();
 for(const e of outer)for(const p of [e.a,e.b])vertices.set(key(p),p);
 for(const p of vertices.values()){const k=Math.floor(p[0]/2)+':'+Math.floor(p[1]/2);if(!grid.has(k))grid.set(k,[]);grid.get(k).push(p);}
 const cover=new Map();for(const t of triangles){const cells=new Set();for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3],n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/2));for(let j=0;j<=n;j++){const x=Math.floor((a[0]+(b[0]-a[0])*j/n)/2),y=Math.floor((a[1]+(b[1]-a[1])*j/n)/2);for(let xx=x-1;xx<=x+1;xx++)for(let yy=y-1;yy<=y+1;yy++)cells.add(xx+':'+yy);}}for(const k of cells){if(!cover.has(k))cover.set(k,[]);cover.get(k).push(t);}}
 const inside=p=>(cover.get(Math.floor(p[0]/2)+':'+Math.floor(p[1]/2))||[]).some(t=>{const cross=t.map((a,i)=>{const b=t[(i+1)%3];return(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);});return cross.every(v=>v>=-1e-7)||cross.every(v=>v<=1e-7);});
 const welded=new Map();for(const {a,b}of outer){const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy),cuts=[0,1],tested=new Set(),steps=Math.max(1,Math.ceil(l/2));
  for(let i=0;i<=steps;i++){const x=Math.floor((a[0]+dx*i/steps)/2),y=Math.floor((a[1]+dy*i/steps)/2);for(let xx=x-1;xx<=x+1;xx++)for(let yy=y-1;yy<=y+1;yy++)for(const p of grid.get(xx+':'+yy)||[]){const k=key(p);if(tested.has(k))continue;tested.add(k);const t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(l*l);if(t>1e-5&&t<1-1e-5&&Math.abs(dx*(p[1]-a[1])-dy*(p[0]-a[0]))/l<.012)cuts.push(t);}}
  cuts.sort((a,b)=>a-b);for(let i=1;i<cuts.length;i++){if((cuts[i]-cuts[i-1])*l<.005)continue;const p=[a[0]+dx*cuts[i-1],a[1]+dy*cuts[i-1]],q=[a[0]+dx*cuts[i],a[1]+dy*cuts[i]],kp=key(p),kq=key(q),k=kp<kq?kp+':'+kq:kq+':'+kp,e=welded.get(k);if(e)e.count++;else welded.set(k,{a:p,b:q,count:1});}
 }return[...welded.values()].filter(e=>{if(e.count!==1)return false;const dx=e.b[0]-e.a[0],dy=e.b[1]-e.a[1],l=Math.hypot(dx,dy),x=(e.a[0]+e.b[0])/2,y=(e.a[1]+e.b[1])/2;return inside([x-dy/l*.015,y+dx/l*.015])!==inside([x+dy/l*.015,y-dx/l*.015]);}).map(e=>[e.a,e.b]);
}
function clipBarrier(poly,axis,bound,greater){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=(a[axis]-bound)*(greater?1:-1),db=(b[axis]-bound)*(greater?1:-1);if(da>=0)out.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);out.push(a.map((v,j)=>v+(b[j]-v)*t));}}return out;}
export function concreteBarrierMesh(triangles,range=120,boundary){
 const raw=triangles.map(t=>({points:t.map(p=>[...p,1]),color:'#bdc0c1',smooth:true}));
 for(const [a,b]of boundary||barrierBoundary(triangles))raw.push({points:[[...a,0],[...b,0],[...b,1],[...a,1]],color:'#a6abad',smooth:true});
 const faces=[];for(const f of raw){let poly=f.points;for(const [axis,bound,greater]of [[1,-10,true],[1,range,false],[0,-60,true],[0,60,false]]){poly=clipBarrier(poly,axis,bound,greater);if(poly.length<3)break;}if(poly.length>=3)faces.push({...f,points:poly});}return faces;
}

const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
const COMPONENTS=['engine','transmission','driveline','cooling','FL','FR','RL','RR','bumperFront','bumperRear','hood','trunk','doorLeft','doorRight','fenderFL','fenderFR','quarterRL','quarterRR','frontBody','rearBody'];
function decodeSensors(packet){
 if(!Buffer.isBuffer(packet)||packet.length>60000)return null;
 const kind=packet.toString('ascii',0,4);if(!['DDV1','DDS1','DDB1'].includes(kind))return null;
 try{const v=JSON.parse(packet.toString('utf8',4));if(typeof v.vehicleId!=='string'||!/^[a-z0-9_-]{1,48}$/i.test(v.vehicleId))return null;
  if(kind==='DDB1'){
   if(v.barrierFaces&&typeof v.barrierFaces==='object'&&!Array.isArray(v.barrierFaces)&&Object.keys(v.barrierFaces).length===0)v.barrierFaces=[];
   const origin=v.origin&&finite(v.origin.x,-1e7,1e7)&&finite(v.origin.y,-1e7,1e7)&&finite(v.origin.heading,-360,360)?{x:v.origin.x,y:v.origin.y,heading:v.origin.heading}:null;
   const multipart=v.batch!==undefined;if(multipart&&(!Number.isSafeInteger(v.batch)||v.batch<0||!Number.isInteger(v.total)||v.total<1||v.total>32||!Number.isInteger(v.part)||v.part<0||v.part>=v.total||!origin))return null;
   if(!Array.isArray(v.barrierFaces)||v.barrierFaces.length>(multipart?256:900)||!v.barrierFaces.every(t=>Array.isArray(t)&&t.length===3&&t.every(p=>Array.isArray(p)&&p.length===2&&finite(p[0],-200,200)&&finite(p[1],-200,200))))return null;
   return{kind,vehicleId:v.vehicleId,barrierFaces:v.barrierFaces,...(origin?{origin}:{}),...(multipart?{batch:v.batch,part:v.part,total:v.total}:{})};
  }
  if(kind==='DDV1'){if(!v.components||typeof v.components!=='object'||Array.isArray(v.components))return null;const components={};for(const k of COMPONENTS)if(v.components[k]!==undefined){if(![0,1,2].includes(v.components[k]))return null;components[k]=v.components[k];}return {kind,vehicleId:v.vehicleId,components};}
  for(const key of ['vehicles','signals'])if(v[key]&&typeof v[key]==='object'&&!Array.isArray(v[key])&&Object.keys(v[key]).length===0)v[key]=[];
  if(!Array.isArray(v.vehicles)||v.vehicles.length>32||!Array.isArray(v.signals)||v.signals.length>24)return null;
  const position=o=>o&&finite(o.x,-150,150)&&finite(o.y,-150,150);
  if(!v.vehicles.every(o=>position(o)&&Number.isInteger(o.id)&&finite(o.heading,-360,360)))return null;
  if(!v.signals.every(o=>position(o)&&['red','amber','green','unknown'].includes(o.state)))return null;
  if(!v.signals.every(o=>o.height===undefined||finite(o.height,1,15)))return null;
  let lanes=null;if(v.lanes!=null){const l=v.lanes;if(!Number.isInteger(l.count)||l.count<1||l.count>12||!Array.isArray(l.points)||l.points.length<2||l.points.length>96||!l.points.every(p=>position(p)&&finite(p.width,2,60))){}else lanes={count:l.count,estimated:l.estimated===true,points:l.points.map(p=>({x:p.x,y:p.y,width:p.width,...(finite(p.roadWidth,2,60)?{roadWidth:p.roadWidth}:{})}))};}
  const roadside=Array.isArray(v.roadside)?v.roadside.slice(0,24).filter(o=>position(o)&&['sidewalk','guardrail','stop'].includes(o.kind)&&finite(o.width,.1,120)&&finite(o.length,.1,120)&&finite(o.height,.1,5)&&finite(o.heading,-360,360)).map(o=>({kind:o.kind,x:o.x,y:o.y,width:o.width,length:o.length,height:o.height,heading:o.heading})):[];
  const highway=Array.isArray(v.highway)?v.highway.slice(0,96).filter(o=>position(o)&&['shoulder','guardrail'].includes(o.kind)&&finite(o.width,.1,60)&&finite(o.length,.1,120)&&finite(o.height,.1,5)&&finite(o.heading,-360,360)).map(o=>({kind:o.kind,x:o.x,y:o.y,width:o.width,length:o.length,height:o.height,heading:o.heading,solid:o.solid===true,edge:o.edge===true})):[];
  const environment=Array.isArray(v.environment)?v.environment.slice(0,80).filter(o=>position(o)&&['building','tree','pole','hydrant'].includes(o.kind)&&finite(o.width,.1,90)&&finite(o.length,.1,90)&&finite(o.height,.2,65)&&finite(o.z,-20,20)&&finite(o.heading,-360,360)).map(o=>({kind:o.kind,x:o.x,y:o.y,z:o.z,width:o.width,length:o.length,height:o.height,heading:o.heading})):[];
  const pavement=Array.isArray(v.pavement)?v.pavement.slice(0,256).filter(o=>position(o)&&finite(o.width,.1,32)&&finite(o.length,.1,32)&&finite(o.heading,-360,360)).map(o=>({kind:'sidewalk',x:o.x,y:o.y,width:o.width,length:o.length,height:.15,heading:o.heading})):[];
  const signKinds=['stop','yield','chevron-left','chevron-right','speed','warning','no-entry','turn-left','turn-right','winding-left','winding-right','merge-left','merge-right','information'];
  const signs=Array.isArray(v.signs)?v.signs.slice(0,40).filter(o=>position(o)&&signKinds.includes(o.kind)).map(o=>({x:o.x,y:o.y,kind:o.kind,height:finite(o.height,1,4)?o.height:2.2,speed:finite(o.speed,1,200)?o.speed:null,label:typeof o.label==='string'?o.label.slice(0,24):''})):[];
  const barrierFaces=Array.isArray(v.barrierFaces)?v.barrierFaces.slice(0,160).filter(t=>Array.isArray(t)&&t.length===3&&t.every(p=>Array.isArray(p)&&p.length===2&&finite(p[0],-200,200)&&finite(p[1],-200,200))):[];
  return {kind,vehicleId:v.vehicleId,...(v.origin&&finite(v.origin.x,-1e7,1e7)&&finite(v.origin.y,-1e7,1e7)&&finite(v.origin.heading,-360,360)?{origin:{x:v.origin.x,y:v.origin.y,heading:v.origin.heading}}:{}),environment,barrierFaces,highway,roadside,pavement,signs,vehicles:v.vehicles.map(o=>({id:o.id,x:o.x,y:o.y,heading:o.heading,body:['sedan','suv','pickup','van','bus','semi','box-truck','truck'].includes(o.body)?o.body:'unknown'})),signals:v.signals.map(o=>({x:o.x,y:o.y,height:o.height||5,state:o.state,...(finite(o.approachY,-150,150)?{approachY:o.approachY}:{}),...(finite(o.armX,-20,20)&&finite(o.armY,-20,20)?{armX:o.armX,armY:o.armY}:{})})),lanes};
 }catch{return null;}
}
module.exports={decodeSensors};





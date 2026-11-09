import {StaticScene,worldPoint,viewPoint,mapPose}from'./static-scene.mjs';
import {roadSignMesh,paintRoadSigns,concreteBarrierMesh} from './road-signs.mjs';
import {drawShoulders} from './highway.mjs';
import {drawTravelPath} from './travel-path.mjs';
import {environmentMesh,paintEnvironmentProximity} from './environment-3d.mjs';
import {buildingExclusions,trimmedBuilding,buildingFromFootprints,subtractConvex,polygonArea} from './building-footprint.mjs';
import {drawSidewalkSurface,updateSidewalkPose} from './sidewalk-surface.mjs';
import {extendLanePreview,drawDestinationRoad} from './road-preview.mjs';
import {drawRoadContext,drawSignalSideView} from './traffic-context.mjs';
import {drawRoadLanes,drawEstimatedCurbs} from './road-lanes.mjs';
import {projectTraffic,trafficCarMesh,trafficSignalMesh,paintTraffic,paintSignalGlow,roadsideMesh,stopSignMesh,paintStopLabels,paintSidewalkProximity} from './traffic-3d.mjs';
export function surroundingPosition(x,y,w,h){const p=projectTraffic([x,y,0],w,h);return {...p,scale:12/(12+Math.max(-10,y))};}
export function upcomingSignals(signals){
 // The near and far sides of one junction share an approach marker. Group by
 // that marker, not by lamp distance: intersections can span over 20 metres.
 const candidates=signals.filter(s=>{const x=s.x+(s.armX||0),y=s.y+(s.armY||0);return y>-10&&y<145&&Math.abs(x)<(s.approachY===undefined?25:45);}).sort((a,b)=>Math.max(0,a.approachY??a.y)-Math.max(0,b.approachY??b.y)),result=[];
 if(!candidates.length)return result;const anchor=candidates[0];
 for(const s of candidates){if(Math.abs((s.approachY??s.y)-(anchor.approachY??anchor.y))>(s.approachY!==undefined&&anchor.approachY!==undefined?24:15))continue;if(s.approachY===undefined&&Math.abs(s.x)>25)continue;if(result.some(p=>Math.hypot(p.x+(p.armX||0)-s.x-(s.armX||0),p.y+(p.armY||0)-s.y-(s.armY||0))<1.2))continue;result.push(s);if(result.length===8)break;}return result;
}
export class SurroundingsView{
 constructor(canvas,{appearance='light'}={}){this.canvas=canvas;this.positions=new Map();this.last=0;this.context={};this.sidewalk={appearance};this.side={};this.buildings={};this.travel={};this.staticScene=new StaticScene();this.anchoredBuildings=new Map();}
 environment(feed,lanes,map){const cache=this.buildings,samples=this.sidewalk.samples;if(cache.feed!==feed.environment||cache.samples!==samples||cache.lanes!==feed.lanes||cache.roads!==map?.roads){cache.feed=feed.environment;cache.samples=samples;cache.lanes=feed.lanes;cache.roads=map?.roads;cache.shapes=new Map();const zones=cache.zones=buildingExclusions(samples,lanes,map,this.context.near,this.sidewalk.boundsLoops);cache.faces=(feed.environment||[]).filter(o=>o.y>-10&&o.y<125).flatMap(o=>{if(o.kind!=='building')return environmentMesh(o);const pose=mapPose(map),key=this.staticScene.identity+':'+(o.id||[o.x,o.y,o.width,o.length].join(':'));let shape;
 if(pose&&o.id){let previous=this.anchoredBuildings.get(key);const revision=this.sidewalk.worldRevision||0;
 if(previous&&previous.revision!==revision){let pieces=previous.footprints.map(poly=>poly.map(p=>viewPoint(p,pose)));for(const zone of zones){pieces=pieces.flatMap(poly=>subtractConvex(poly,zone.points));if(pieces.length>128){pieces=[];break;}}shape=buildingFromFootprints(o,pieces.filter(poly=>polygonArea(poly)>.25));}
 else if(previous)shape={footprints:previous.footprints.map(poly=>poly.map(p=>viewPoint(p,pose))),faces:previous.faces.map(f=>({...f,points:f.points.map(([x,y,z])=>[...viewPoint([x,y],pose),z])}))};
 else shape=trimmedBuilding(o,zones);
 if(!previous||previous.revision!==revision){this.anchoredBuildings.set(key,{revision,footprints:shape.footprints.map(poly=>poly.map(p=>worldPoint(p,pose))),faces:shape.faces.map(f=>({...f,points:f.points.map(([x,y,z])=>[...worldPoint([x,y],pose),z])}))});if(this.anchoredBuildings.size>160)this.anchoredBuildings.delete(this.anchoredBuildings.keys().next().value);}
 }else shape=trimmedBuilding(o,zones);
 cache.shapes.set(o,shape);return shape.faces;});}return cache.faces||[];}
 draw(data,now,map,mode='full'){const c=this.canvas,r=c.getBoundingClientRect();if(!r.width||!r.height||now-this.last<32)return;const dt=this.last?Math.min(.15,(now-this.last)/1000):.033;this.last=now;const w=r.width,h=r.height,dpr=Math.min(globalThis.devicePixelRatio||1,1.5);if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);}const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  if(mode==='off'){this.positions.clear();this.staticScene.reset();return;}
  let feed=this.staticScene.update(data,map,now);if(this.staticGeneration!==this.staticScene.generation||feed?.staticExpired){this.staticGeneration=this.staticScene.generation;this.anchoredBuildings.clear();this.buildings={};this.sidewalk={appearance:this.sidewalk.appearance};}const range=map?.renderDistance??120;if(feed){if(this.rawFeed!==feed||this.range!==range){this.rawFeed=feed;this.range=range;const visible=o=>Math.hypot(o.x,o.y)<range+(Math.max(o.width||0,o.length||0)/2);this.filteredFeed={...feed,vehicles:feed.vehicles.filter(visible),signals:feed.signals.filter(visible),highway:feed.highway?.filter(visible),roadside:feed.roadside?.filter(visible),pavement:feed.pavement?.filter(visible),environment:feed.environment?.filter(visible)};}feed=this.filteredFeed;}drawRoadContext(ctx,map,w,h,this.context,now);if(!feed){this.positions.clear();drawDestinationRoad(ctx,map,this.context.near,w,h,7.4);drawTravelPath(ctx,this.travel,data,map,now,w,h);if(mode==='full'||mode==='absolute')drawSignalSideView(ctx,data,null,w,h,this.side,now);return;}
  const lanes=extendLanePreview(feed.lanes,map,this.context.near);// The destination overlay already follows the actual route. Do not also
  // paint the inferred straight-ahead lane blue at a navigation turn.
  drawShoulders(ctx,feed.highway||[],w,h);drawRoadLanes(ctx,lanes,w,h,false);drawDestinationRoad(ctx,map,this.context.near,w,h,lanes?.points[0]?.roadWidth||7.4);
  if(mode==='road'){drawTravelPath(ctx,this.travel,data,map,now,w,h);this.positions.clear();return;}
  const sidewalk=(feed.pavement?.length?feed.pavement:(feed.roadside||[]).filter(o=>o.kind==='sidewalk')),objects=[...(feed.roadside||[]),...(feed.highway||[])].filter(o=>o.kind==='guardrail');
  updateSidewalkPose(this.sidewalk,data,map,now);Object.assign(this.sidewalk,{observation:feed.pavementRevision,lanes,map,roads:this.context.near});drawSidewalkSurface(ctx,sidewalk,w,h,this.sidewalk);drawTravelPath(ctx,this.travel,data,map,now,w,h);
  const ids=new Set(),faces=[...objects.flatMap(roadsideMesh),...concreteBarrierMesh(feed.barrierFaces||[],range,feed.barrierEdges),...(mode==='absolute'?this.environment(feed,lanes,map):[])];const stops=[];for(const sign of [...(feed.signs||[]),...(feed.roadside||[]).filter(o=>o.kind==='stop')])if(sign.y>-3&&sign.y<range&&!stops.some(s=>Math.hypot(s.x-sign.x,s.y-sign.y)<3))stops.push({...sign,height:sign.height||2.2});for(const sign of stops)faces.push(...(sign.kind==='stop'?stopSignMesh(sign):roadSignMesh(sign)));for(const v of feed.vehicles){ids.add(v.id);const old=this.positions.get(v.id)||v,f=1-Math.exp(-dt*12),turn=((v.heading-old.heading+540)%360)-180;const smoothed={...v,x:old.x+(v.x-old.x)*f,y:old.y+(v.y-old.y)*f,heading:old.heading+turn*f};this.positions.set(v.id,smoothed);if(smoothed.y>-8&&Math.abs(smoothed.x)<35)faces.push(...trafficCarMesh(smoothed));}for(const id of this.positions.keys())if(!ids.has(id))this.positions.delete(id);
  for(const signal of upcomingSignals(feed.signals))faces.push(...trafficSignalMesh(signal));paintTraffic(ctx,faces,w,h);if(mode==='absolute')paintEnvironmentProximity(ctx,feed.environment||[],w,h,this.buildings.shapes);paintSignalGlow(ctx,upcomingSignals(feed.signals),w,h);paintStopLabels(ctx,stops.filter(s=>s.kind==='stop'),w,h);paintRoadSigns(ctx,stops.filter(s=>s.kind!=='stop'),w,h);drawSignalSideView(ctx,data,feed,w,h,this.side,now);
 }
}








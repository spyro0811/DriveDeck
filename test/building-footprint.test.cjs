const {test}=require('node:test'),assert=require('node:assert/strict');
test('Dense junction building bounds leave the full crossing road footprint clear',async()=>{
 const {orientedFootprint,trimmedBuilding,polygonArea,containsPoint}=await import('../src/renderer/building-footprint.mjs');
 const building={kind:'building',x:0,y:0,width:20,length:20,height:12,heading:0},zones=[0,90].map(heading=>{const points=orientedFootprint({x:0,y:0,width:8,length:30,heading});return{points,bounds:{minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minY:Math.min(...points.map(p=>p[1])),maxY:Math.max(...points.map(p=>p[1]))}};}),result=trimmedBuilding(building,zones);
 assert.equal(result.footprints.length,4);assert.ok(Math.abs(result.footprints.reduce((n,p)=>n+polygonArea(p),0)-144)<1e-5);for(let x=-9.5;x<=9.5;x++)for(let y=-9.5;y<=9.5;y++)assert.equal(result.footprints.some(p=>containsPoint(p,[x,y])),Math.abs(x)>4&&Math.abs(y)>4);assert.equal(result.faces.length,20,'Only exterior walls and four roofs should remain');assert.ok(result.faces.every(f=>f.points.every(p=>p[2]===0||p[2]===12)));
});
test('Rotated measured sidewalks cut through approximate building rectangles without shifting buildings',async()=>{
 const {buildingExclusions,trimmedBuildingFootprints,containsPoint,polygonArea}=await import('../src/renderer/building-footprint.mjs');const o={kind:'building',x:6,y:8,width:12,length:20,height:9,heading:27},pavement=[{x:4,y:9,width:3,length:30,heading:27}],zones=buildingExclusions(pavement,null,null),parts=trimmedBuildingFootprints(o,zones);assert.ok(parts.length);assert.ok(parts.reduce((sum,p)=>sum+polygonArea(p),0)<240);for(let x=-5;x<18;x+=.4)for(let y=-10;y<26;y+=.4)if(containsPoint(zones[0].points,[x,y]))assert.equal(parts.some(p=>containsPoint(p,[x,y])),false);assert.equal(o.x,6);assert.equal(o.y,8);
});
test('Buildings entirely in detected pedestrian space are omitted; distant buildings stay intact',async()=>{
 const {buildingExclusions,trimmedBuildingFootprints,orientedFootprint}=await import('../src/renderer/building-footprint.mjs'),o={x:4,y:10,width:2,length:2,height:8,heading:15},zones=buildingExclusions([{x:4,y:10,width:8,length:8,heading:15}],null,null);assert.deepEqual(trimmedBuildingFootprints(o,zones),[]);const far={...o,x:35};assert.deepEqual(trimmedBuildingFootprints(far,zones),[orientedFootprint(far)]);
});
test('Existing road graph links protect side roads as well as the current lane',async()=>{
 const {buildingExclusions,trimmedBuildingFootprints,containsPoint}=await import('../src/renderer/building-footprint.mjs'),map={position:[100,200],heading:0},roads=[[80,210,120,210,7,1]],zones=buildingExclusions([],null,map,roads),parts=trimmedBuildingFootprints({x:0,y:10,width:20,length:20,height:10,heading:0},zones);assert.ok(zones.length);assert.equal(parts.some(p=>containsPoint(p,[0,10])),false);assert.ok(parts.some(p=>containsPoint(p,[0,2])));
});

test('Joined sidewalk contours keep concave corners and preserve buildings inside courtyard holes',async()=>{
 const {buildingExclusions,trimmedBuildingFootprints,triangulateFootprint,polygonArea,orientedFootprint}=await import('../src/renderer/building-footprint.mjs');
 const concave=[[0,0],[6,0],[6,2],[2,2],[2,6],[0,6]],triangles=triangulateFootprint(concave);assert.ok(Math.abs(triangles.reduce((sum,p)=>sum+polygonArea(p),0)-20)<1e-6);
 const outer=[[-6,-6],[6,-6],[6,6],[-6,6]],hole=[[-3,-3],[-3,3],[3,3],[3,-3]],zones=buildingExclusions([],null,null,[],[outer,hole]);assert.ok(zones.length);const courtyard={x:0,y:0,width:2,length:2,height:10,heading:0};assert.deepEqual(trimmedBuildingFootprints(courtyard,zones),[orientedFootprint(courtyard)]);assert.deepEqual(trimmedBuildingFootprints({...courtyard,x:4.5},zones),[]);
});

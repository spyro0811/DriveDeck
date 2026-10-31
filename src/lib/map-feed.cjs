const { EventEmitter } = require('node:events');
const finite = n => Number.isFinite(n) && Math.abs(n) <= 1e8;
const pair = p => Array.isArray(p) && p.length === 2 && p.every(finite);
const label = s => typeof s === 'string' ? s.slice(0, 120) : '';

function decodeMapPacket(packet) {
  if (!Buffer.isBuffer(packet) || packet.length < 6 || packet.length > 60000 || packet.toString('ascii', 0, 4) !== 'DDM1') return null;
  let value;
  try { value = JSON.parse(packet.toString('utf8', 4)); } catch { return null; }
  if (!value || typeof value !== 'object' || typeof value.mapId !== 'string' || value.mapId.length > 120) return null;
  const base = { kind: value.kind, mapId: value.mapId, levelName: label(value.levelName) };
  if (value.kind === 'pose' && pair(value.position) && finite(value.heading)) {
    return { ...base, position: value.position, heading: value.heading };
  }
  if (value.kind === 'route' && Array.isArray(value.points) && value.points.length <= 1000 && value.points.every(pair)) return { ...base, route: value.points };
  if(value.kind==='terrain'){
    if(!Number.isInteger(value.width)||!Number.isInteger(value.height)||value.width<1||value.height<1||value.width>128||value.height>128||!pair(value.origin)||!Number.isFinite(value.step)||value.step<20||value.step>500)return null;
    const count=value.width*value.height,total=Math.ceil(count/768);
    if(!Number.isInteger(value.batch)||!Number.isInteger(value.part)||value.part<0||value.part>=total||value.total!==total||!Array.isArray(value.cells)||value.cells.length!==Math.min(768,count-value.part*768)||!value.cells.every(n=>Number.isInteger(n)&&n>=0&&n<=3))return null;
    return {...base,batch:value.batch,part:value.part,total,origin:value.origin,width:value.width,height:value.height,step:value.step,cells:value.cells};
  }
  if(value.kind==='buildings'){
    if(!Number.isInteger(value.batch)||!Number.isInteger(value.part)||!Number.isInteger(value.total)||value.total<1||value.total>64||value.part<0||value.part>=value.total||!Array.isArray(value.buildings)||value.buildings.length>64)return null;
    if(!value.buildings.every(b=>Array.isArray(b)&&(b.length===8||b.length===9)&&b.every(finite)&&(b.length===8||(b[8]>=2.5&&b[8]<=300))&&Math.max(b[0],b[2],b[4],b[6])-Math.min(b[0],b[2],b[4],b[6])<=1000&&Math.max(b[1],b[3],b[5],b[7])-Math.min(b[1],b[3],b[5],b[7])<=1000))return null;
    return {...base,batch:value.batch,part:value.part,total:value.total,buildings:value.buildings};
  }
  if (value.kind !== 'roads' || !Number.isInteger(value.batch) || !Number.isInteger(value.part) || !Number.isInteger(value.total)
    || value.total < 1 || value.total > 512 || value.part < 0 || value.part >= value.total
    || !Array.isArray(value.roads) || value.roads.length > 100) return null;
  if (!value.roads.every(r => Array.isArray(r) && r.length === 6 && r.every(finite) && r[4] >= 0 && r[4] <= 500 && r[5] >= 0 && r[5] <= 1)) return null;
  return { ...base, batch: value.batch, part: value.part, total: value.total, roads: value.roads };
}

class MapFeed extends EventEmitter {
  constructor() { super(); this.clear(); }
  clear() { this.state = { mapId: '', levelName: '', roads: [], buildings:[], terrain:null, route: [], position: null, heading: 0, connected: false }; this.poseAt = 0; this.assembly = null; this.completedBatch = null;this.buildingAssembly=null;this.completedBuildingBatch=null;this.terrainAssembly=null;this.completedTerrainBatch=null; }
  accept(packet, now = Date.now()) {
    const value = decodeMapPacket(packet); if (!value) return false;
    if (value.mapId !== this.state.mapId) {
      this.clear(); this.state.mapId = value.mapId;
      this.emit('update', { ...this.state });
    }
    if (value.levelName) this.state.levelName = value.levelName;
    if (value.kind === 'pose') {
      this.poseAt = now;
      Object.assign(this.state, { position: value.position, heading: value.heading, connected: true });
      this.emit('update', { mapId: this.state.mapId, levelName: this.state.levelName, position: value.position, heading: value.heading, connected: true });
    } else if (value.kind === 'route') {
      this.state.route = value.route; this.emit('update', { mapId: this.state.mapId, route: value.route });
    } else if(value.kind==='terrain'){
      if(value.batch===this.completedTerrainBatch)return true;
      const key=JSON.stringify([value.origin,value.width,value.height,value.step,value.total]);
      if(!this.terrainAssembly||this.terrainAssembly.batch!==value.batch||now-this.terrainAssembly.started>30000)this.terrainAssembly={batch:value.batch,key,started:now,parts:new Map()};
      const a=this.terrainAssembly;if(a.key!==key)return false;a.parts.set(value.part,value.cells);
      if(a.parts.size===value.total){const cells=[];for(let i=0;i<value.total;i++)cells.push(...a.parts.get(i));const terrain={origin:value.origin,width:value.width,height:value.height,step:value.step,cells};this.state.terrain=terrain;this.completedTerrainBatch=value.batch;this.terrainAssembly=null;this.emit('update',{mapId:this.state.mapId,terrain});}
    } else if(value.kind==='buildings'){
      if(value.batch===this.completedBuildingBatch)return true;
      if(!this.buildingAssembly||this.buildingAssembly.batch!==value.batch||now-this.buildingAssembly.started>30000)this.buildingAssembly={batch:value.batch,total:value.total,started:now,parts:new Map()};
      const assembly=this.buildingAssembly;if(assembly.total!==value.total)return false;
      assembly.parts.set(value.part,value.buildings);
      if(assembly.parts.size===value.total){const buildings=[];for(let i=0;i<value.total;i++)buildings.push(...assembly.parts.get(i));this.state.buildings=buildings;this.completedBuildingBatch=value.batch;this.buildingAssembly=null;this.emit('update',{mapId:this.state.mapId,buildings});}
    } else {
      if (value.batch === this.completedBatch) return true;
      if (!this.assembly || this.assembly.batch !== value.batch || now - this.assembly.started > 30000) {
        this.assembly = { batch: value.batch, total: value.total, started: now, parts: new Map() };
      }
      if (value.total !== this.assembly.total) return false;
      this.assembly.parts.set(value.part, value.roads);
      if (this.assembly.parts.size === value.total) {
        const roads = [];
        for (let i = 0; i < value.total; i++) roads.push(...this.assembly.parts.get(i));
        this.state.roads = roads; this.completedBatch = value.batch; this.assembly = null;
        this.emit('update', { mapId: this.state.mapId, levelName: this.state.levelName, roads });
      }
    }
    return true;
  }
  snapshot(now = Date.now()) { return { ...this.state, connected: this.poseAt > 0 && now - this.poseAt < 2500 }; }
}
module.exports = { MapFeed, decodeMapPacket };

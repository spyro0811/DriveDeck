const { test } = require('node:test');
const assert = require('node:assert/strict');
const dgram = require('node:dgram');
const fs = require('node:fs');
const path = require('node:path');
const { Telemetry, decodePacket } = require('../src/lib/telemetry.cjs');
const { validateSettings, writeSettings, readSettings } = require('../src/lib/settings.cjs');
const { outGauge, companion } = require('./fixtures.cjs');
const { companionV2, mapPacket } = require('./fixtures.cjs');
const { MapFeed, decodeMapPacket } = require('../src/lib/map-feed.cjs');

test('V2 companion decodes the active drive mode, color, ambient temperature, and selected gear', () => {
  const data = decodePacket(companionV2({ vehicleId: 'vivace', mode: 'arsenic', label: 'ARSENIC', color: '#598500' }));
  assert.equal(data.driveModeKey, 'arsenic'); assert.equal(data.driveModeColor, '#598500'); assert.equal(data.selectedGear, 'D'); assert.equal(data.lights.handbrake, true);
  const receiver = new Telemetry(); receiver.accept(companionV2(), 10000); receiver.accept(outGauge(), 11000);
  assert.equal(receiver.snapshot(11001).driveModeKey, 'comfort'); assert.equal(receiver.snapshot(11601).driveModeKey, null);
  assert.equal(typeof receiver.snapshot(11001).ambientTemp, 'number');
  assert.equal(receiver.snapshot(11601).ambientTemp, null); assert.equal(receiver.snapshot(11601).odometer, null);
  const malformed = companionV2(); malformed.writeFloatLE(NaN, 176); assert.equal(decodePacket(malformed), null);
});
test('map assembly accepts reordered chunks atomically and resets on a level change', () => {
  const feed = new MapFeed();
  const chunk = (part, roads) => mapPacket({kind:'roads',mapId:'utah',levelName:'Utah',batch:1,total:2,part,roads});
  feed.accept(chunk(1, [[0,0,10,10,5,1]]), 10000); assert.equal(feed.snapshot(10000).roads.length,0);
  feed.accept(chunk(0, [[10,10,20,20,5,.8]]), 10001); assert.equal(feed.snapshot(10001).roads.length,2);
  feed.accept(mapPacket({kind:'pose',mapId:'utah',position:[12,15],heading:90}),10002);
  assert.equal(feed.snapshot(10003).connected,true); assert.equal(feed.snapshot(13000).connected,false);
  feed.accept(mapPacket({kind:'pose',mapId:'italy',position:[1,2],heading:0}),13001); assert.equal(feed.snapshot(13002).roads.length,0);
});
test('map decoder rejects invalid coordinates, unsupported kinds, and oversized batches', () => {
  assert.equal(decodeMapPacket(mapPacket({kind:'pose',mapId:'a',position:[1,'bad'],heading:0})),null);
  assert.equal(decodeMapPacket(mapPacket({kind:'roads',mapId:'a',total:10000,part:0,batch:1,roads:[]})),null);
  assert.equal(decodeMapPacket(mapPacket({kind:'route',mapId:'a',points:[[1,2],[3,4]]})).route.length,2);
  assert.equal(decodeMapPacket(Buffer.alloc(61000)),null);
});

test('Building batches assemble independently of roads, reject invalid footprints and clear on level change',()=>{
 const feed=new MapFeed(),outline=[0,0,20,0,20,30,0,30];
 const packet=(part,buildings,total=2)=>mapPacket({kind:'buildings',mapId:'test',batch:1,part,total,buildings});
 feed.accept(packet(1,[outline]),10000);assert.equal(feed.snapshot().buildings.length,0);
 feed.accept(mapPacket({kind:'roads',mapId:'test',batch:1,part:0,total:1,roads:[[0,0,30,30,5,1]]}),10001);
 feed.accept(packet(0,[outline.map(n=>n+40)]),10002);assert.equal(feed.snapshot().buildings.length,2);assert.equal(feed.snapshot().roads.length,1);
 feed.accept(packet(1,[outline]),10003);assert.equal(feed.snapshot().buildings.length,2);
 assert.equal(decodeMapPacket(packet(0,[[0,0,2000,0,2000,30,0,30]])),null);assert.equal(decodeMapPacket(packet(0,[[0,0,20,'x',20,30,0,30]])),null);assert.equal(decodeMapPacket(packet(0,[],65)),null);
 feed.accept(mapPacket({kind:'pose',mapId:'other',position:[0,0],heading:0}),10004);assert.equal(feed.snapshot().buildings.length,0);
});
test('map-only traffic cannot keep disconnected vehicle instruments alive', () => {
  const receiver = new Telemetry(); receiver.accept(outGauge(),10000);
  receiver.accept(mapPacket({kind:'pose',mapId:'utah',position:[1,2],heading:0}),12000);
  assert.equal(receiver.snapshot(12001).connected,false); assert.equal(receiver.mapFeed.snapshot(12001).connected,true);
});
test('Vivace deck follows the live vehicle mode and never substitutes a demo mode in live use', async () => {
  const { resolveDriveMode, resolveDeck } = await import('../src/renderer/decks.mjs');
  assert.equal(resolveDriveMode({connected:true,driveModeKey:'sport',driveModeLabel:'SPORT'}).key,'sport');
  assert.equal(resolveDriveMode({connected:true}).available,false);
  assert.equal(resolveDriveMode({connected:false},'arsenic').key,'arsenic');
  assert.equal(resolveDeck({deck:'ultra',autoDeck:true},{connected:true,vehicleId:'vivace'}),'vivace');
  assert.equal(resolveDeck({deck:'ultra',autoDeck:false},{connected:true,vehicleId:'vivace'}),'ultra');
});

test('OutGauge decodes documented offsets, reverse/neutral, warning lights, and optional ID', () => {
  const actual = decodePacket(outGauge({ speed: -15, rpm: 4500, gear: -1, lights: 32 | 4 | 1024 }));
  assert.equal(actual.speedMps, 15); assert.equal(actual.rpm, 4500); assert.equal(actual.gear, -1);
  assert.equal(actual.lights.left, true); assert.equal(actual.lights.right, false); assert.equal(actual.lights.handbrake, true); assert.equal(actual.lights.abs, true);
  assert.equal(decodePacket(outGauge({ gear: 0 }).subarray(0, 92)).gear, 0);
});
test('malformed, unrelated, oversized, and non-finite packets are ignored', () => {
  for (const n of [0, 4, 48, 91, 93, 97, 4096]) assert.equal(decodePacket(Buffer.alloc(n)), null);
  const motion = outGauge(); motion.write('BNG1', 4); assert.equal(decodePacket(motion), null);
  for (const offset of [12, 16, 20, 24, 28, 48, 52, 56]) {
    const p = outGauge(); p.writeFloatLE(NaN, offset); assert.equal(decodePacket(p), null);
  }
});
test('companion identity, RPM limit, and version are validated', () => {
  const decoded = decodePacket(companion({ vehicleId: 'bmw_m3', name: 'M3', maxRpm: 8500 }));
  assert.equal(decoded.vehicleId, 'bmw_m3'); assert.equal(decoded.maxRpm, 8500); assert.equal(decoded.protocol, 'DriveDeck');
  const wrong = companion(); wrong.writeUInt32LE(2, 4); assert.equal(decodePacket(wrong), null);
  const bad = companion(); bad.writeFloatLE(Infinity, 88); assert.equal(decodePacket(bad), null);
});
test('stale telemetry and stale identity expire independently; malformed packets cannot keep data alive', () => {
  const receiver = new Telemetry({ staleMs: 1500 });
  receiver.accept(companion(), 10000); receiver.accept(outGauge(), 11000);
  assert.equal(receiver.snapshot(11001).vehicleId, 'etk800');
  assert.equal(receiver.snapshot(11600).connected, true); assert.equal(receiver.snapshot(11600).vehicleId, null);
  receiver.accept(Buffer.alloc(10), 12000); assert.equal(receiver.snapshot(12500).connected, false);
  receiver.accept(outGauge({ rpm: 0 }), 13000); assert.equal(receiver.snapshot(13001).vehicleId, null); assert.equal(receiver.snapshot(13001).rpm, 0);
});
test('UDP receives a real localhost datagram and a failed rebind preserves the working socket', async () => {
  const occupied = dgram.createSocket('udp4'), sender = dgram.createSocket('udp4');
  await new Promise(resolve => occupied.bind(0, '127.0.0.1', resolve));
  const reservation = dgram.createSocket('udp4'); await new Promise(resolve => reservation.bind(0, '127.0.0.1', resolve));
  const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
  const receiver = new Telemetry();
  try {
    await receiver.listen(port);
    await new Promise((resolve, reject) => sender.send(outGauge({ rpm: 5123 }), port, '127.0.0.1', error => error ? reject(error) : resolve()));
    for (let i = 0; i < 20 && !receiver.received; i++) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(receiver.snapshot().rpm, 5123);
    await assert.rejects(receiver.listen(occupied.address().port), /already in use/);
    assert.equal(receiver.port, port); assert.equal(receiver.snapshot().connected, true);
  } finally { receiver.close(); occupied.close(); sender.close(); }
});
test('settings constrain ports, RPMs, colors, names, and widget order', () => {
  const result = validateSettings({ port: 1, maxRpm: 5000, redline: 9000, accent: 'url(evil)', theme: 'missing', widgets: ['journey', 'media', 'media', 'unknown'], customName: 'x'.repeat(100) });
  assert.equal(result.port, 1024); assert.equal(result.redline, 5000); assert.equal(result.accent, '#d5f38a');
  assert.deepEqual(result.widgets, ['journey', 'media']); assert.equal(result.theme, 'aura'); assert.equal(result.customName.length, 24);
  assert.equal(validateSettings({ widgets: [] }).widgets.length, 0);
});
test('settings ignore prototype keys and preserve valid vehicle mappings', () => {
  const input = JSON.parse('{"brandMappings":{"__proto__":"aura","constructor":"etk","bmw":"bmw","911":"porsche","bad key":"etk"}}');
  assert.deepEqual(validateSettings(input).brandMappings, { 911: 'porsche', bmw: 'bmw' });
  assert.equal({}.polluted, undefined);
});
test('settings survive an atomic disk roundtrip and recover from a corrupt file', () => {
  const folder = path.join(__dirname, '../.runtime/test-settings'); fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, 'settings.json');
  writeSettings(file, { theme: 'porsche', units: 'kmh', port: 55234 });
  assert.equal(readSettings(file).theme, 'porsche'); assert.equal(readSettings(file).port, 55234);
  fs.writeFileSync(file, '{broken'); assert.equal(readSettings(file).theme, 'aura');
});
test('vehicle theme matching uses specific user mappings, internal BeamNG IDs, and custom identity', async () => {
  const { resolveTheme } = await import('../src/renderer/themes.mjs');
  const base = validateSettings();
  assert.equal(resolveTheme(base, 'etk800').id, 'etk'); assert.equal(resolveTheme(base, 'sunburst').id, 'hirochi');
  assert.equal(resolveTheme(base, 'covet').id, 'ibishu'); assert.equal(resolveTheme(base, 'bmw_m4').id, 'bmw');
  assert.equal(resolveTheme({ ...base, brandMappings: { bmw: 'bmw', bmw_m4: 'custom' }, customName: 'ROCO', accent: '#ffeeaa' }, 'bmw_m4').name, 'ROCO');
  assert.equal(resolveTheme({ ...base, autoTheme: false }, 'bmw_m4').id, 'aura');
});
test('speed conversion and trip integration use real elapsed time without stale spikes', async () => {
  const { speedInUnits, Trip, gearLabel } = await import('../src/renderer/model.mjs');
  assert.ok(Math.abs(speedInUnits(10, 'kmh') - 36) < .001); assert.ok(Math.abs(speedInUnits(10, 'mph') - 22.36936) < .001);
  assert.equal(gearLabel(-1), 'R'); assert.equal(gearLabel(0), 'N'); assert.equal(gearLabel(undefined), '—');
  const trip = new Trip(); trip.update({ connected: true, speedMps: 10 }, 1000); trip.update({ connected: true, speedMps: 10 }, 1100);
  assert.equal(trip.meters, 1); trip.update({ connected: false }, 100000); assert.equal(trip.meters, 1);
  trip.reset(); assert.equal(trip.meters, 0);
});

test('large road batches recover a missing UDP part without displaying a fragmented network',()=>{
 const feed=new MapFeed();const parts=110;
 const packet=(part,batch=1)=>mapPacket({kind:'roads',mapId:'city',batch,total:parts,part,roads:[[part,0,part+1,0,5,1]]});
 for(let i=0;i<parts;i++)if(i!==45)assert.equal(feed.accept(packet(i),10000+i*90),true);
 assert.equal(feed.snapshot().roads.length,0);
 feed.accept(packet(45),22000);assert.equal(feed.snapshot().roads.length,parts);
 for(let i=0;i<parts-1;i++)feed.accept(packet(i,2),23000+i);
 assert.equal(feed.snapshot().roads.length,parts,'keep complete previous map while next batch is incomplete');
 feed.accept(packet(parts-1,2),24000);assert.equal(feed.snapshot().roads.length,parts);
});

test('map appearance defaults to dark for existing profiles and preserves explicit light', () => {
  assert.equal(validateSettings().mapAppearance, 'dark');
  assert.equal(validateSettings({mapAppearance:'invalid'}).mapAppearance, 'dark');
  assert.equal(validateSettings({mapAppearance:'light'}).mapAppearance, 'light');
});

test('iadnuyh deck is accepted and survives validation',()=>{assert.equal(validateSettings({deck:'iadnuyh'}).deck,'iadnuyh')});

test('homosexual deck persists as a separate selection',()=>{assert.equal(validateSettings({deck:'homosexual'}).deck,'homosexual')});
test('planar G estimates acceleration and wraps north crossings without a spike',async()=>{
 const {PlanarG}=await import('../src/renderer/homosexual.mjs');const g=new PlanarG(),map={connected:true,heading:359,mapId:'west'},data={connected:true,speedMps:20,vehicleId:'car'};
 assert.equal(g.update(data,map,0),null);
 const value=g.update({...data,speedMps:21},{...map,heading:1},200);
 const blend=1-Math.exp(-.2/.22);assert.ok(Math.abs(value.longitudinal-(5/9.80665*blend))<.0001);assert.ok(value.lateral>0&&value.lateral<1);
 assert.equal(g.update({...data,connected:false},map,300),null);
 assert.equal(g.update(data,map,400),null);
 assert.equal(g.update(data,map,2000),null);
 assert.equal(g.update({...data,speedMps:200},map,2200),null);
 assert.equal(g.update(data,{...map,connected:false},2300),null);
});

test('Civetta uses Scintilla mode keys and does not show cached modes after disconnection',async()=>{
 const {civettaMode}=await import('../src/renderer/civetta.mjs');
 for(const [key,label,color,page] of [['street','STRADA','#36caff','info'],['sport','SPORT','#fff23a','gforce'],['track','CORSE','#ff3739','tires'],['drift','DRIFT','#e962ff','info'],['off','OFF','#e0e0e0','info']]){
  const mode=civettaMode({connected:true,driveModeKey:key},{demo:false});assert.equal(mode.label,label);assert.equal(mode.color,color);assert.equal(mode.page,page);
 }
 assert.equal(civettaMode({connected:false,driveModeKey:'track'},{demo:false}).available,false);
 assert.equal(civettaMode({connected:true},{demo:false}).label,'—');
 assert.equal(civettaMode({connected:true},{demo:true,demoDriveMode:'comfort'}).label,'STRADA');
 assert.equal(validateSettings({deck:'civetta',civettaPage:'tires',demoDriveMode:'drift'}).deck,'civetta');
 assert.equal(validateSettings({civettaPage:'bogus'}).civettaPage,'auto');
});

test('Atlas perspective keeps the vehicle anchored, narrows distant roads and clips behind-camera segments',async()=>{
 const {perspectiveProjection}=await import('../src/renderer/map-perspective.mjs');
 const view=perspectiveProjection([0,0],0,true,1000,520,1),origin=view.project(0,0),near=view.project(100,0),far=view.project(100,1000);
 assert.equal(origin.x,500);assert.ok(Math.abs(origin.y-520*.68)<.001);assert.ok(far.y<origin.y&&far.x-500<near.x-500);
 assert.equal(view.segment(-10,-10000,10,-9000),null);
 const crossing=view.segment(0,-10000,0,1000);assert.ok(crossing.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
 const a=view.segment(-50,100,0,100),b=view.segment(0,100,50,100);assert.deepEqual(a[1],b[0]);
 const turned=perspectiveProjection([10,20],90,true,1000,520,2);assert.equal(turned.project(10,20).x,500);
 assert.equal(validateSettings({atlasView:'3d'}).atlasView,'3d');assert.equal(validateSettings({atlasView:'bad'}).atlasView,'2d');
});

test('Terrain batches validate materials, assemble atomically out of order and reset between maps',()=>{
 const feed=new MapFeed(),base={kind:'terrain',mapId:'west',batch:1,total:2,origin:[-100,200],step:80,width:32,height:32};
 assert.equal(feed.accept(mapPacket({...base,part:1,cells:Array(256).fill(2)})),true);assert.equal(feed.snapshot().terrain,null);
 assert.equal(feed.accept(mapPacket({...base,part:0,cells:Array(768).fill(1)})),true);assert.equal(feed.snapshot().terrain.cells.length,1024);assert.equal(feed.snapshot().terrain.cells[800],2);
 assert.equal(decodeMapPacket(mapPacket({...base,part:0,cells:Array(768).fill(4)})),null);
 assert.equal(decodeMapPacket(mapPacket({...base,part:0,width:999,cells:[]})),null);
 feed.accept(mapPacket({kind:'pose',mapId:'next',position:[0,0],heading:0}));assert.equal(feed.snapshot().terrain,null);
});

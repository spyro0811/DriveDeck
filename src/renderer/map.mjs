import { urbanTerrain } from './urban-terrain.mjs';
import { cleanBuildings } from './map-quality.mjs';
import { terrainTexture } from './terrain.mjs';
import { drawPerspective } from './map-perspective.mjs';
// Original rendering of BeamNG's exported navigation graph. No remote map tiles.
export class MapCanvas {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.lastDraw = 0; this.roads = null; this.paths = []; }
  draw(map, settings, now) {
    if (now - this.lastDraw < 65) return; this.lastDraw = now;
    const { canvas, ctx } = this;
    const rect = canvas.getBoundingClientRect(), w = rect.width, h = rect.height;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const dark = settings.mapAppearance !== 'light';
    const palette = dark ? {land:'#000000',building:'#30343b',buildingEdge:'#454c55',casing:'#101b16',majorEdge:'#756747',roads:['#99845c','#68736b','#56665c','#394b40'],routeEdge:'#152a3c'} : {land:'#edf0f2',building:'#e6e2d9',buildingEdge:'#ccc8bb',casing:'#bbcbb2',majorEdge:'#d3bb82',roads:['#f7d68d','#fffef7','#ffffff','#eff2e7'],routeEdge:'#ffffff'};
    ctx.fillStyle = palette.land; ctx.fillRect(0, 0, w, h);
    if (!map?.position || !map.roads?.length) return;
    const buildings=cleanBuildings(map.buildings,map.roads);
    map={...map,buildings,terrain:urbanTerrain(map.terrain,buildings)};
    const perspective=settings.atlasView==='3d';
    if(perspective){drawPerspective(ctx,map,settings,w,h,palette)}else{
    if (this.roads !== map.roads) {
      this.roads = map.roads; this.paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
      for (const r of map.roads) { const p = this.paths[r[5] <= .25 ? 3 : r[4] >= 24 ? 0 : r[4] >= 12 ? 1 : 2]; p.moveTo(r[0], r[1]); p.lineTo(r[2], r[3]); }
    }
    if(this.buildings!==map.buildings){
      this.buildings=map.buildings;this.buildingPath=new Path2D();
      for(const b of map.buildings||[]){this.buildingPath.moveTo(b[0],b[1]);for(let i=2;i<8;i+=2)this.buildingPath.lineTo(b[i],b[i+1]);this.buildingPath.closePath();}
    }
    const scale = Math.min(w, h) / 1050 * settings.mapZoom;
    ctx.save(); ctx.translate(w / 2, h * .59);
    if (settings.mapHeadingUp) ctx.rotate(-(map.heading || 0) * Math.PI / 180);
    ctx.scale(scale, -scale); ctx.translate(-map.position[0], -map.position[1]);
    ctx.globalAlpha = map.connected ? 1 : .32;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if(settings.mapTerrain!==false&&map.terrain){if(this.terrain!==map.terrain||this.terrainAppearance!==settings.mapAppearance){this.terrain=map.terrain;this.terrainAppearance=settings.mapAppearance;this.terrainImage=terrainTexture(map.terrain,settings)}const t=map.terrain;ctx.save();ctx.translate(t.origin[0],t.origin[1]+t.height*t.step);ctx.scale(1,-1);ctx.imageSmoothingEnabled=true;ctx.drawImage(this.terrainImage,0,0,t.width*t.step,t.height*t.step);ctx.restore();}
    if(this.buildingPath){ctx.fillStyle=palette.building;ctx.strokeStyle=palette.buildingEdge;ctx.lineWidth=.8/scale;ctx.fill(this.buildingPath);ctx.stroke(this.buildingPath);}
    const widths = [11, 8, 5.5, 2.5];
    for (let i = 3; i >= 0; i--) {
      ctx.strokeStyle = i===0?palette.majorEdge:palette.casing; ctx.lineWidth = (widths[i] + 2) / scale; ctx.stroke(this.paths[i]);
    }
    // All casings underneath all road fills: a wider road must not erase the
    // connecting end of a narrower road at a shared intersection.
    for (let i = 3; i >= 0; i--) {
      ctx.strokeStyle = palette.roads[i]; ctx.lineWidth = widths[i] / scale; ctx.stroke(this.paths[i]);
    }
    if (map.connected && map.route?.length > 1) {
      const path = new Path2D(); map.route.forEach((p, i) => i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1]));
      ctx.strokeStyle = palette.routeEdge; ctx.lineWidth = 12 / scale; ctx.stroke(path);
      ctx.strokeStyle = '#0969df'; ctx.lineWidth = 8 / scale; ctx.stroke(path);
      ctx.strokeStyle = '#278bff'; ctx.lineWidth = 5 / scale; ctx.stroke(path);
    }
    ctx.restore();
    }
    ctx.save(); ctx.translate(w / 2, h * (perspective?.68:.59));
    ctx.globalAlpha = map.connected ? 1 : .4;
    ctx.fillStyle='#1683ff20';ctx.beginPath();ctx.arc(0,0,33,0,Math.PI*2);ctx.fill();
    ctx.shadowColor = '#234e6d55'; ctx.shadowBlur = 9;ctx.shadowOffsetY=2;
    ctx.fillStyle = '#1677ef'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath();ctx.arc(0,0,22,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    if (!settings.mapHeadingUp) ctx.rotate((map.heading || 0) * Math.PI / 180);
    ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(10,10);ctx.quadraticCurveTo(10,12,8,11);ctx.lineTo(0,6);ctx.lineTo(-8,11);ctx.quadraticCurveTo(-10,12,-10,10);ctx.closePath();ctx.fill();
    ctx.restore();
  }
}

let demoRoads,demoBuildings;
export function demoMap(seconds) {
  if (!demoRoads) {
    demoRoads = [];
    // An explicitly labeled sample network, never used as a substitute for live roads.
    for (let row = -6; row <= 6; row++) {
      for (let col = -7; col < 7; col++) {
        const x = col * 160, y = row * 145;
        const wave = t => 100 * Math.sin(t / 650);
        demoRoads.push([x, y + wave(x), x + 160, y + wave(x + 160), 8, row % 3 ? .8 : 1]);
        if (row < 6) demoRoads.push([x, y + wave(x), x + 25 * Math.sin(row), y + 145 + wave(x), 5, .8]);
      }
    }
    for (let i = -18; i < 18; i++) demoRoads.push([340 + 100 * Math.sin(i / 5), i * 100, 340 + 100 * Math.sin((i + 1) / 5), (i + 1) * 100, 20, 1]);
    demoBuildings=[];for(let row=-5;row<6;row++)for(let col=-6;col<7;col++){const x=col*160+38,y=row*145+35+100*Math.sin((col*160+40)/650);demoBuildings.push([x,y,x+64,y,x+64,y+55,x,y+55]);}
  }
  return { mapId: 'demo', levelName: 'Sample road network', roads: demoRoads,buildings:demoBuildings,
    position: [20, (seconds * 13) % 600 - 350], heading: 8 + 12 * Math.sin(seconds / 16),
    route: [[20, -600], [20, -290], [20, 0], [20, 290], [20, 600]], connected: true };
}

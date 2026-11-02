class MobileMap {
  constructor(){this.revision=0;this.refs=null;this.json='{}';}
  update(map){const refs=[map.mapId,map.roads,map.buildings,map.terrain];if(!this.refs||refs.some((v,i)=>v!==this.refs[i])){this.refs=refs;this.revision++;this.json=JSON.stringify({revision:this.revision,mapId:map.mapId,levelName:map.levelName,roads:map.roads||[],buildings:map.buildings||[],terrain:map.terrain||null});}return {revision:this.revision,mapId:map.mapId,position:map.position,heading:map.heading,connected:map.connected,route:map.route||[]};}
}
module.exports={MobileMap};

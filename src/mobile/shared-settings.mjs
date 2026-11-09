// Deck choice and units belong to this phone. Driving-view options are shared
// with the PC, which also controls how much scenery the companion supplies.
export function phoneSettings(current,server){
 const next={...server,...current,demo:false,mobileMap:true};
 for(const key of ['trafficView','cameraFps','renderDistance'])if(server?.[key]!==undefined)next[key]=server[key];
 next.trafficView??='full';next.visualizerMotion=server?.visualizerMotion??100;return next;
}

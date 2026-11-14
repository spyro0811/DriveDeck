const fs=require('node:fs'),path=require('node:path');
const CAMERA_DECKS=new Set(['model-s','model-three']);
class CameraControl{
 constructor({root,now=Date.now,write=fs.writeFileSync,rename=fs.renameSync}={}){Object.assign(this,{root,now,write,rename});this.reportedAt=-Infinity;this.nextWrite=0;this.closed=false;}
 report(value){
  const valid=value?.live===true&&value.visible===true
    &&(CAMERA_DECKS.has(value.deck)||(value.deck==='modular'&&value.surroundings===true));
  this.interest=valid?value.deck:null;
  this.reportedAt=valid?this.now():-Infinity;
 }
 update(settings,{visible=false,sceneDeck=null}={}){
  const now=this.now();
  const desktop=!this.closed&&visible&&!settings.demo&&now-this.reportedAt<1500?this.interest:null;
  const active=CAMERA_DECKS.has(settings.deck)&&CAMERA_DECKS.has(desktop);
  const modular=!this.closed&&((desktop==='modular'&&settings.deck==='modular')||sceneDeck==='modular');
  const scenery=!this.closed&&(active||modular||CAMERA_DECKS.has(sceneDeck));
  const drivingMode=settings.trafficView||'full';
  const mode=!scenery?'off':modular&&drivingMode!=='absolute'?'full':drivingMode;
  const enabled=active&&['full','absolute'].includes(drivingMode);
  const fps=enabled?Math.max(0,Math.min(30,settings.cameraFps??5)):0;
  // Existing companions accept the Model S/Three deck identifiers for scene scans.
  // The independent cameraEnabled flag keeps Modular scans from starting the camera.
  const companionDeck=active?desktop:modular?'model-s':scenery?sceneDeck:null;
  const config={cameraEnabled:enabled&&fps>0,deck:companionDeck,fps,sceneMode:mode,renderDistance:settings.renderDistance??120,expiresAt:scenery?Math.floor(now/1000)+3:0};
  const key=JSON.stringify({...config,expiresAt:0});
  if(key!==this.key||now>=this.nextWrite){this.publish(config);this.key=key;this.nextWrite=now+500;}return config;
 }
 publish(config){try{const file=path.join(this.root,'drivedeck-camera-config.json');this.write(file+'.tmp',JSON.stringify(config));this.rename(file+'.tmp',file);}catch{/* Missing user folders stay disabled; an old lease expires on its own. */}}
 stop(){this.closed=true;this.interest=null;this.publish({cameraEnabled:false,deck:null,fps:0,sceneMode:'off',expiresAt:0});}
}
module.exports={CameraControl};

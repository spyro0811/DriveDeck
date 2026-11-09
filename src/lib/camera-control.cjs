const fs=require('node:fs'),path=require('node:path');
const CAMERA_DECKS=new Set(['model-s','model-three']);
class CameraControl{
 constructor({root,now=Date.now,write=fs.writeFileSync,rename=fs.renameSync}={}){Object.assign(this,{root,now,write,rename});this.reportedAt=-Infinity;this.nextWrite=0;this.closed=false;}
 report(value){if(!value||!CAMERA_DECKS.has(value.deck)||value.live!==true||value.visible!==true){this.interest=null;this.reportedAt=-Infinity;return;}this.interest=value.deck;this.reportedAt=this.now();}
 update(settings,{visible=false,sceneDeck=null}={}){
  const now=this.now(),active=!this.closed&&visible&&!settings.demo&&CAMERA_DECKS.has(settings.deck)&&now-this.reportedAt<1500&&CAMERA_DECKS.has(this.interest),scenery=!this.closed&&(active||CAMERA_DECKS.has(sceneDeck)),mode=scenery?(settings.trafficView||'full'):'off',enabled=active&&['full','absolute'].includes(mode),fps=enabled?Math.max(0,Math.min(30,settings.cameraFps??5)):0;
  const config={cameraEnabled:enabled&&fps>0,deck:active?this.interest:scenery?sceneDeck:null,fps,sceneMode:mode,renderDistance:settings.renderDistance??120,expiresAt:scenery?Math.floor(now/1000)+3:0},key=JSON.stringify({...config,expiresAt:0});
  if(key!==this.key||now>=this.nextWrite){this.publish(config);this.key=key;this.nextWrite=now+500;}return config;
 }
 publish(config){try{const file=path.join(this.root,'drivedeck-camera-config.json');this.write(file+'.tmp',JSON.stringify(config));this.rename(file+'.tmp',file);}catch{/* Missing user folders stay disabled; an old lease expires on its own. */}}
 stop(){this.closed=true;this.interest=null;this.publish({cameraEnabled:false,deck:null,fps:0,sceneMode:'off',expiresAt:0});}
}
module.exports={CameraControl};

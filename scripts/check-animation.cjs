// Isolated, muted playback verification; does not control any music player.
const {app,BrowserWindow}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {lookupApple,trackKey}=require('../src/lib/animated-artwork.cjs');
app.setPath('userData',path.resolve(__dirname,'../.runtime/animation-check'));
app.whenReady().then(async()=>{
 const output=path.resolve(process.env.DRIVEDECK_ANIMATION_ARTIFACTS||path.join(__dirname,'../artifacts/animation-live'));fs.mkdirSync(output,{recursive:true});
 const media={available:true,source:'verification',title:"Style (Taylor's Version)",artist:'Taylor Swift',album:"1989 (Taylor's Version)",playing:true,...JSON.parse(process.env.DRIVEDECK_ANIMATION_MEDIA||'{}')};
 const artwork=await lookupApple(media,new AbortController().signal);if(!artwork)throw new Error('Expected a matching Apple animated cover.');
 const win=new BrowserWindow({show:false,width:900,height:650,webPreferences:{backgroundThrottling:false,contextIsolation:true,nodeIntegration:false}});
 const consoleErrors=[];win.webContents.on('console-message',event=>{if(event.level==='error')consoleErrors.push(event.message)});
 await win.loadFile(path.resolve(process.env.DRIVEDECK_RENDERER_PATH||path.join(__dirname,'../src/renderer/index.html')));
 await win.webContents.executeJavaScript(`(async()=>{const {MotionArtwork}=await import('./motion-artwork.mjs');const parent=document.createElement('div');parent.style.cssText='position:fixed;inset:0;background:#10151e;z-index:1000;display:grid;place-items:center';const frame=document.createElement('div');frame.style.cssText='position:relative;width:380px;height:380px';const video=document.createElement('video');video.style.cssText='width:100%;height:100%;object-fit:contain';video.hidden=true;frame.append(video);parent.append(frame);document.body.append(parent);window.motionFailures=[];window.motionTest=new MotionArtwork(video,(source,key)=>window.motionFailures.push({source,key}));window.motionVideo=video;window.motionTimer=setInterval(()=>window.motionTest.update(${JSON.stringify({...artwork,source:'apple',trackKey:trackKey(media)})},${JSON.stringify(media)},true),33);})()`);
 const delay=ms=>new Promise(r=>setTimeout(r,ms));let status;
 for(let i=0;i<100;i++){
  await win.webContents.capturePage();await delay(200);
  status=await win.webContents.executeJavaScript('({ready:motionVideo.readyState,time:motionVideo.currentTime,width:motionVideo.videoWidth,hidden:motionVideo.hidden,muted:motionVideo.muted,failures:motionFailures,visible:document.visibilityState})');
  if(status.failures.length)throw new Error(JSON.stringify(status));if(status.time>.5&&status.ready>=2)break;
 }
 if(!(status.time>.5&&status.ready>=2&&!status.hidden&&status.muted))throw new Error('Apple animation did not play: '+JSON.stringify({status,consoleErrors}));
 const first=status.time;await delay(600);const later=await win.webContents.executeJavaScript('motionVideo.currentTime');if(later<=first+.1)throw new Error('Video clock did not advance.');
 fs.writeFileSync(path.join(output,'apple-animation.png'),(await win.webContents.capturePage()).toPNG());
 await win.webContents.executeJavaScript(`motionTest.update({source:'cover',url:null},${JSON.stringify(media)},true);clearInterval(motionTimer)`);
 const stopped=await win.webContents.executeJavaScript('motionVideo.paused&&motionVideo.hidden&&!motionVideo.hasAttribute("src")');if(!stopped)throw new Error('Cover fallback did not stop the stream.');
 const generated=await win.webContents.executeJavaScript(`(async()=>{const c=document.createElement('canvas');c.width=c.height=120;const ctx=c.getContext('2d'),stream=c.captureStream(15),parts=[];const rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9'});rec.ondataavailable=e=>parts.push(e.data);const done=new Promise(r=>rec.onstop=r);rec.start();const timer=setInterval(()=>{ctx.fillStyle='hsl('+Math.floor(performance.now()/10)%360+',70%,50%)';ctx.fillRect(0,0,120,120)},50);await new Promise(r=>setTimeout(r,1100));rec.stop();await done;clearInterval(timer);stream.getTracks().forEach(t=>t.stop());const blob=new Blob(parts,{type:'video/webm'});return [...new Uint8Array(await blob.arrayBuffer())]})()`);
 const {ClipLibrary}=require('../src/lib/animated-artwork.cjs');const localFile=path.join(output,'test-clip.webm');fs.writeFileSync(localFile,Buffer.from(generated));const library=new ClipLibrary(path.join(output,'test-library'));library.add(media,localFile);
 await win.webContents.executeJavaScript(`motionTest.update(${JSON.stringify({source:'canvas',url:library.get(media),trackKey:trackKey(media)})},${JSON.stringify(media)},true)`);
 await delay(1000);const localPlayed=await win.webContents.executeJavaScript('!motionVideo.hidden&&motionVideo.muted&&motionVideo.currentTime>0');if(!localPlayed)throw new Error('Local Canvas clip did not play.');
 await win.webContents.executeJavaScript(`motionTest.update({source:'cover',url:null},${JSON.stringify(media)},true)`);
 await win.webContents.executeJavaScript("motionVideo.parentElement.parentElement.remove();document.getElementById('connection-button').click();document.getElementById('settings-panel').style.animation='none';document.getElementById('animated-artwork').scrollIntoView({block:'start'})");
 await win.webContents.capturePage();await delay(200);fs.writeFileSync(path.join(output,'animation-preferences.png'),(await win.webContents.capturePage()).toPNG());
 const report={ok:true,source:'Apple Music public album artwork',album:artwork.albumTitle,pageUrl:artwork.pageUrl,videoWidth:status.width,muted:true,clockAdvanced:true,staticFallbackStoppedVideo:stopped,localCanvasClipPlayed:localPlayed,consoleErrors};
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));app.quit();
}).catch(error=>{console.error(error);app.exit(1);});

const {app,BrowserWindow}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
app.whenReady().then(async()=>{
 const out=path.resolve(__dirname,'../artifacts/video-reference');fs.mkdirSync(out,{recursive:true});
 const html=path.join(out,'inspect.html');
 fs.writeFileSync(html,`<video id="v" muted src="${pathToFileURL(process.argv[2]).href}"></video>`);
 const win=new BrowserWindow({show:false,webPreferences:{backgroundThrottling:false}});await win.loadFile(html);
 const result=await win.webContents.executeJavaScript(`(async()=>{const v=document.getElementById('v');if(!v.videoWidth)await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=()=>j(new Error('Video decode failed'))});const w=200,h=200,sheet=document.createElement('canvas');sheet.width=w*8;sheet.height=(h+24)*6;const ctx=sheet.getContext('2d');for(let i=0;i<48;i++){const t=Math.min(v.duration-.1,(i+.5)*.16);v.currentTime=t;await new Promise(r=>v.onseeked=r);const x=i%8*w,y=Math.floor(i/8)*(h+24);ctx.drawImage(v,980,120,140,140,x,y,w,h);ctx.fillStyle='#fff';ctx.fillRect(x,y+h,w,24);ctx.fillStyle='#000';ctx.font='15px sans-serif';ctx.fillText(t.toFixed(2)+'s',x+8,y+h+17);}return {duration:v.duration,width:v.videoWidth,height:v.videoHeight,image:sheet.toDataURL('image/png')}})()`);
 fs.writeFileSync(path.join(out,'motion-detail.png'),Buffer.from(result.image.split(',')[1],'base64'));delete result.image;console.log(JSON.stringify(result));app.quit();
}).catch(e=>{console.error(e);app.exit(1)});

// Localhost-only integration check. Downloads a test installer but never runs it.
const {app}=require('electron'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),yaml=require('js-yaml');
const {NsisUpdater}=require('electron-updater'),{ElectronHttpExecutor}=require('electron-updater/out/electronHttpExecutor');const {Updates}=require('../src/lib/updates.cjs');
app.disableHardwareAcceleration();app.setPath('userData',path.resolve('.runtime/local-updater-host'));let server;
app.whenReady().then(async()=>{
 const dir=path.resolve('.runtime/release-feed-qa'),info=require('./verify-release.cjs').verifyRelease(dir),name=info.files[0].url;let installerRequests=0;
 server=http.createServer((req,res)=>{const file=req.url.split('?')[0].slice(1);if(!['latest.yml',name].includes(file)){res.writeHead(404);res.end();return;}if(file===name)installerRequests++;const target=path.join(dir,file);res.writeHead(200,{'Content-Length':fs.statSync(target).size,'Content-Type':file==='latest.yml'?'text/yaml':'application/octet-stream'});fs.createReadStream(target).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const root=path.resolve('.runtime/local-updater-'+Date.now());fs.mkdirSync(root,{recursive:true});const config=path.join(root,'app-update.yml');fs.writeFileSync(config,yaml.dump({provider:'generic',url:`http://127.0.0.1:${server.address().port}`,updaterCacheDirName:'fixture-cache'}));
 const adapter={version:'0.16.9',name:'DriveDeck-QA',isPackaged:true,appUpdateConfigPath:config,userDataPath:root,baseCachePath:root,whenReady:async()=>{},onQuit:()=>{throw Error('Must not install on quit')},quit:()=>{throw Error('Must not quit')}};
 const updater=new NsisUpdater(null,adapter);updater.httpExecutor=new ElectronHttpExecutor();updater.disableDifferentialDownload=true;updater.logger=null;
 const service=new Updates({updater,version:'0.16.9',repository:'DriveDeck-Local-QA/update-fixture',packaged:true,portable:false});
 await service.check();assert.equal(service.snapshot().status,'available');assert.equal(installerRequests,0);assert.equal(service.snapshot().version,info.version);
 assert.equal((await service.download()).ok,true);assert.equal(service.snapshot().status,'downloaded');assert.equal(installerRequests,1);const bytes=fs.readFileSync(updater.installerPath);assert.equal(crypto.createHash('sha512').update(bytes).digest('base64'),info.files[0].sha512);assert.equal(updater.autoInstallOnAppQuit,false);
 console.log('PASS real electron-updater: local feed check, explicit installer download, SHA512 verification, no restart/install.');server.close();app.quit();
}).catch(e=>{console.error(e);server?.close();app.exit(1)});

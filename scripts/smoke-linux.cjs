const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),dgram=require('node:dgram');
const {companionV2}=require('../test/fixtures.cjs');
exports.run=async({app,window,telemetry})=>{const socket=dgram.createSocket('udp4');let timer;const js=s=>window.webContents.executeJavaScript(s),delay=ms=>new Promise(r=>setTimeout(r,ms));const until=async code=>{for(let i=0;i<120;i++){if(await js(code))return;await delay(50);}throw Error('Timed out: '+code);};try{
 await until("document.getElementById('app').dataset.ready==='true'");
 assert.equal((await js('window.driveDeck.bootstrap()')).platform,'linux');
 assert.equal(await js("document.querySelectorAll('[data-deck-choice]').length"),13);
 await js("window.driveDeck.updateSettings({deck:'arch',autoDeck:false,demo:false,animatedArtwork:false})");
 await until("document.getElementById('deck-stage').dataset.deck==='arch'");
 timer=setInterval(()=>socket.send(companionV2({vehicleId:'vivace',name:'Cherrier Vivace',speed:30,rpm:4200}),telemetry.port,'127.0.0.1'),40);
 await until("document.getElementById('arch-speed-value').textContent==='67'&&document.getElementById('arch-rpm-value').textContent==='4200'");
 assert.equal(await js("document.getElementById('arch-deck').hidden"),false);
 assert.equal(await js("document.getElementById('ultra-deck').hidden"),true);
 assert.match(await js("document.getElementById('arch-rpm-needle').getAttribute('transform')"),/rotate\(/);
 fs.mkdirSync('artifacts/linux',{recursive:true});fs.writeFileSync(path.resolve('artifacts/linux/arch-packaged.png'),(await window.webContents.capturePage()).toPNG());
 console.log('PASS packaged Linux boot, Linux deck library, Arch selection and real UDP gauge updates.');app.quit();
 }catch(error){console.error(error);app.exit(1);}finally{clearInterval(timer);socket.close();}};

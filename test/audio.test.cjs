const test=require('node:test');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const {validateBands}=require('../src/lib/audio.cjs');
const {validateSettings}=require('../src/lib/settings.cjs');
test('Audio IPC rejects malformed spectra and bounds persisted center choices',()=>{
 assert.equal(validateBands(Array(31).fill(0)),null);
 for(const bad of [NaN,Infinity,-1,1.1,'0'])assert.equal(validateBands([...Array(31).fill(0),bad]),null);
 assert.deepEqual(validateBands(Array(32).fill(.5)),Array(32).fill(.5));
 assert.equal(validateSettings({deck:'sound',audioView:'visualizer'}).deck,'sound');
 assert.equal(validateSettings({audioView:'visualizer'}).audioView,'visualizer');
 assert.equal(validateSettings({audioView:'invalid'}).audioView,'artwork');
});
test('Native FFT distinguishes silence and frequency bands from actual PCM samples',{skip:process.platform!=='win32'},()=>{
 const source=path.resolve(__dirname,'../native/audio.cs').replace(/'/g,"''");
 const script=`Add-Type -Path '${source}'; $result=@(); foreach($hz in @(0,100,1000,8000)){[double[]]$samples=New-Object double[] 2048; for($i=0;$i -lt 2048;$i++){$samples[$i]=.25*[Math]::Sin(2*[Math]::PI*$hz*$i/48000)}; $bands=[DriveDeckAudio.Capture]::Spectrum($samples,48000);$result+=,@($bands)}; ConvertTo-Json -InputObject $result -Compress`;
 const spectra=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{encoding:'utf8',windowsHide:true}));
 assert.deepEqual(spectra[0],Array(32).fill(0));
 const peaks=spectra.slice(1).map(bands=>{assert.ok(validateBands(bands));assert.ok(Math.max(...bands)>.6);return bands.indexOf(Math.max(...bands));});
 assert.ok(peaks[0]<peaks[1]&&peaks[1]<peaks[2],JSON.stringify(peaks));
});

test('Six-bar spectrum preserves left bass and right treble ordering',async()=>{
 const {sixBands}=await import('../src/renderer/audio.mjs');
 for(const [bin,index] of [[0,0],[7,1],[13,2],[18,3],[24,4],[31,5]]){const input=Array(32).fill(0);input[bin]=.8;assert.deepEqual(sixBands(input),Array.from({length:6},(_,i)=>i===index?.8:0));}
 assert.deepEqual(sixBands(),Array(6).fill(0));
});
test('Album palette follows cover pixels and keeps monochrome covers neutral',async()=>{
 const {paletteFromPixels,DEFAULT_PALETTE}=await import('../src/renderer/palette.mjs');
 const pixels=[];for(let i=0;i<100;i++)pixels.push(...(i<50?[230,40,55,255]:i<80?[35,75,220,255]:[30,195,90,255]));
 assert.deepEqual(paletteFromPixels(pixels),['#e62837','#234bdc','#1ec35a']);
 for(const color of paletteFromPixels([0,0,0,255,255,255,255,255])){const rgb=color.slice(1).match(/../g).map(n=>parseInt(n,16));assert.equal(rgb[0],rgb[1]);assert.equal(rgb[1],rgb[2]);assert.ok(rgb[0]>=155);}
 assert.deepEqual(paletteFromPixels([255,0,0,0]),DEFAULT_PALETTE);
});

test('Six-bar motion attacks quickly, expands spectral dips, and settles to silence',async()=>{
 const {LevelMotion}=await import('../src/renderer/audio.mjs');const motion=new LevelMotion();
 let values;for(let i=0;i<30;i++)values=motion.step([.85,.7,.6,.75,.5,.65],16);
 const peak=motion.step([.95,.7,.6,.75,.5,.65],40)[0];
 assert.ok(peak>.85,'transient should reach almost full height');
 for(let i=0;i<8;i++)values=motion.step([.55,.7,.6,.75,.5,.65],16);
 assert.ok(values[0]<peak*.5,'a modest spectral dip should make a dramatic visible drop');
 assert.ok(values[1]>.7,'another frequency band must remain independent');
 for(let i=0;i<40;i++)values=motion.step([0,0,0,0,0,0],16);
 assert.ok(values.every(v=>v<.002),'silence must settle without invented movement');
 assert.ok(motion.step([NaN,Infinity,-1,2,undefined,0],16).every(v=>Number.isFinite(v)&&v>=0&&v<=1));
});

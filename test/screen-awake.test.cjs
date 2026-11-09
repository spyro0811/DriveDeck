const test=require('node:test'),assert=require('node:assert/strict');
test('Phone screen lock releases on hide and can be reacquired',async()=>{
 const {ScreenAwake}=await import('../src/mobile/screen-awake.mjs');let requests=0,releases=0;
 const doc={hidden:false},nav={wakeLock:{request:async()=>{requests++;return {released:false,addEventListener(){},release:async()=>{releases++;}};}}};
 const awake=new ScreenAwake({doc,nav});await awake.enable();await awake.enable();assert.equal(requests,1);awake.disable();assert.equal(releases,1);doc.hidden=true;await awake.enable();assert.equal(requests,1);doc.hidden=false;await awake.enable();assert.equal(requests,2);
});
test('A late wake lock is released if the phone page was hidden while requesting',async()=>{
 const {ScreenAwake}=await import('../src/mobile/screen-awake.mjs');let resolve,releases=0;
 const awake=new ScreenAwake({doc:{hidden:false},nav:{wakeLock:{request:()=>new Promise(r=>resolve=r)}}});const pending=awake.enable();awake.disable();resolve({release:async()=>releases++});await pending;assert.equal(releases,1);assert.equal(awake.lock,null);
});
test('LAN HTTP fallback plays silent video and pauses it when dashboard leaves',async()=>{
 const {ScreenAwake}=await import('../src/mobile/screen-awake.mjs');let played=0,paused=0;const sources=[];
 const video={style:{},setAttribute(){},append:s=>sources.push(s),addEventListener(){},play:async()=>played++,pause:()=>paused++};const doc={hidden:false,body:{append(){}},createElement:tag=>tag==='video'?video:{}};
 const awake=new ScreenAwake({doc,nav:{}});await awake.enable();assert.equal(played,1);assert.equal(video.muted,false);assert.equal(sources.length,2);awake.disable();assert.equal(paused,1);
});
test('Blocked native access falls back to video and retries after a user interaction',async()=>{
 const {ScreenAwake}=await import('../src/mobile/screen-awake.mjs');let native=0,plays=0;const reports=[];
 const video={paused:true,style:{},setAttribute(){},append(){},addEventListener(){},play:async()=>{if(++plays===1)throw Error('User gesture required');video.paused=false;},pause(){video.paused=true;}};
 const doc={hidden:false,body:{append(){}},createElement:tag=>tag==='video'?video:{}};
 const awake=new ScreenAwake({doc,nav:{wakeLock:{request:async()=>{native++;throw Error('Blocked');}}},report:v=>reports.push(v)});
 await awake.enable();assert.deepEqual(reports,[false]);await awake.enable();assert.deepEqual(reports,[false,true]);assert.equal(native,1);assert.equal(plays,2);await awake.enable();assert.equal(plays,2);
});


const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {AnimatedArtwork,ClipLibrary,lookupApple,parseAppleArtwork,streamingAlbumIds,trackKey,appleVideoURL}=require('../src/lib/animated-artwork.cjs');
const {validateSettings}=require('../src/lib/settings.cjs');
const media={available:true,source:'Spotify',title:'Test song',artist:'Test artist',album:'Test album'};
const clip='file:///test/clip.mp4',art={url:'https://mvod.itunes.apple.com/example/default.m3u8',pageUrl:'https://music.apple.com/us/album/123',albumTitle:'Test album'};
const settings=()=>validateSettings();
const page=data=>`<script id="serialized-server-data">${JSON.stringify(data)}</script>`;
const albumHeader=(id,title,artist,url)=>page({id:`album-detail-header - ${id}`,title,subtitleLinks:[{title:artist}],videoArtwork:{dictionary:{motionDetailSquare:{video:url}}}});
test('Streaming catalog recovers animated editions omitted by iTunes album search',async()=>{
 for(const kind of ['album','song']){
  const calls=[];
  const read=async url=>{calls.push(url);if(url.includes('/search?'))return JSON.stringify({results:[{artistName:media.artist,artistId:11,collectionName:media.album,collectionId:123}]});
   if(url.endsWith('/album/123'))return albumHeader(123,media.album,media.artist,null);
   if(url.endsWith('/artist/11'))return page([{title:kind==='album'?media.album:'Popular song',subtitleLinks:[{title:media.album+' · 2021'}],contentDescriptor:{kind,url:'https://music.apple.com/us/album/streaming-edition/456?i=789'}}]);
   if(url.endsWith('/album/456'))return albumHeader(456,media.album,media.artist,art.url);
   throw new Error('Unexpected URL '+url);
  };
  assert.equal((await lookupApple(media,new AbortController().signal,read)).pageUrl,'https://music.apple.com/us/album/456');assert.equal(calls.length,4);
 }
});
test('Catalog fallback rejects other albums, hosts and artists; broken editions do not stop discovery',async()=>{
 const catalog=page([{title:'Other album',contentDescriptor:{kind:'album',url:'https://music.apple.com/us/album/444'}},{title:media.album,contentDescriptor:{kind:'album',url:'https://evil.test/us/album/555'}},{title:media.album,contentDescriptor:{kind:'album',url:'https://music.apple.com/us/album/456'}}]);
 assert.deepEqual(streamingAlbumIds(catalog,new Set(['test album'])),['456']);
 const read=async url=>{if(url.includes('/search?'))return JSON.stringify({results:[{artistName:media.artist,artistId:11,collectionName:media.album,collectionId:123}]});if(url.endsWith('/album/123'))throw new Error('Edition unavailable');if(url.endsWith('/artist/11'))return catalog;return albumHeader(456,media.album,'Different artist',art.url);};
 assert.equal(await lookupApple(media,new AbortController().signal,read),null);
 assert.equal(parseAppleArtwork(albumHeader(456,media.album,'Different artist',art.url),456,'test artist'),null);
});
const settled=async resolver=>{for(let i=0;i<100;i++){if(!resolver.state.loading)return resolver.state;await new Promise(r=>setTimeout(r,5));}throw new Error('Resolver timeout');};
test('Animated artwork priority, source switches, all-off and playback-failure fallback are honored',async()=>{
 let calls=0;const resolver=new AnimatedArtwork({library:{get:()=>clip},lookup:async()=>{calls++;return art;}});
 const prefs=settings();resolver.update(media,prefs);assert.equal((await settled(resolver)).source,'canvas');assert.equal(calls,0);
 prefs.animationOrder=['apple','canvas'];resolver.update(media,prefs);assert.equal((await settled(resolver)).source,'apple');assert.equal(calls,1);
 resolver.reject('apple',trackKey(media));assert.equal((await settled(resolver)).source,'canvas');
 resolver.reject('canvas',trackKey(media));assert.equal((await settled(resolver)).source,'cover');
 prefs.animatedArtwork=false;resolver.update(media,prefs);assert.equal((await settled(resolver)).source,'cover');assert.equal(calls,1);
 resolver.stop();
 const disabled=new AnimatedArtwork({library:{get:()=>null},lookup:async()=>{throw new Error('must not query Apple')}});
 disabled.update(media,{...settings(),appleEnabled:false});assert.equal((await settled(disabled)).source,'cover');disabled.stop();
});
test('Missing Canvas falls through to Apple; missing Apple falls back to Canvas or cover',async()=>{
 const first=new AnimatedArtwork({library:{get:()=>null},lookup:async()=>art});first.update(media,settings());assert.equal((await settled(first)).source,'apple');first.stop();
 const second=new AnimatedArtwork({library:{get:()=>clip},lookup:async()=>null});second.update(media,{...settings(),animationOrder:['apple','canvas']});assert.equal((await settled(second)).source,'canvas');second.stop();
 const third=new AnimatedArtwork({library:{get:()=>null},lookup:async()=>{throw new Error('Offline')}});third.update(media,settings());assert.equal((await settled(third)).source,'cover');third.stop();
});
test('Old track lookups cannot replace the current track and album results are cached',async()=>{
 let finish;const resolver=new AnimatedArtwork({library:{get:()=>null},lookup:()=>new Promise(r=>finish=r)});
 resolver.update(media,settings());resolver.update({...media,title:'New song'},{...settings(),animatedArtwork:false});finish(art);await new Promise(r=>setTimeout(r,5));assert.equal(resolver.state.trackKey,trackKey({...media,title:'New song'}));assert.equal(resolver.state.source,'cover');resolver.stop();
 let calls=0;const cached=new AnimatedArtwork({library:{get:()=>null},lookup:async()=>{calls++;return art;}});cached.update(media,settings());await settled(cached);cached.update({...media,title:'Another song'},settings());await settled(cached);assert.equal(calls,1);cached.stop();
});
test('Apple extraction accepts only the matching album header and trusted HTTPS motion streams',()=>{
 const html=(id,url)=>`<script type="application/json" id="serialized-server-data">${JSON.stringify({data:[{id:`album-detail-header - ${id}`,title:'Album',videoArtwork:{dictionary:{motionDetailSquare:{video:url}}}}]})}</script>`;
 assert.equal(parseAppleArtwork(html(123,art.url),123).url,art.url);
 assert.equal(parseAppleArtwork(html(124,art.url),123),null);
 for(const bad of ['https://evil.test/video.m3u8','http://mvod.itunes.apple.com/x.m3u8','https://mvod.itunes.apple.com.evil.test/x.m3u8','https://user:pass@mvod.itunes.apple.com/x.m3u8'])assert.equal(appleVideoURL(bad),null);
 assert.equal(parseAppleArtwork(html(123,'https://evil.test/video.m3u8'),123),null);
});
test('Source preferences validate and local clips remain scoped to their song',()=>{
 assert.deepEqual(validateSettings({animationOrder:['apple','canvas']}).animationOrder,['apple','canvas']);
 assert.deepEqual(validateSettings({animationOrder:['evil']}).animationOrder,['canvas','apple']);
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'drivedeck-art-'));try{
  const library=new ClipLibrary(path.join(directory,'library')),file=path.join(directory,'video.mp4');fs.writeFileSync(file,Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom'),Buffer.alloc(24)]));
  library.add(media,file);assert.match(library.get(media),/^file:/);assert.equal(library.get({...media,title:'Other song'}),null);assert.ok(new ClipLibrary(path.join(directory,'library')).get(media));library.remove(media);assert.equal(library.get(media),null);
  fs.writeFileSync(file,'not a video file at all');assert.throws(()=>library.add(media,file),/video container/);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

const test=require('node:test'),assert=require('node:assert/strict');
const {localArtwork}=require('../src/lib/linux-media.cjs');
const png=Buffer.from([137,80,78,71,13,10,26,10]);
test('Linux artwork loads HTTPS covers, follows secure redirects and validates image bytes',async()=>{
 const calls=[];const fetchImage=async url=>{calls.push(String(url));return calls.length===1?new Response(null,{status:302,headers:{location:'https://covers.example/album.png'}}):new Response(png);};
 assert.equal(await localArtwork('https://music.example/art',{fetchImage}),'data:image/png;base64,'+png.toString('base64'));
 assert.equal(calls.length,2);
 assert.equal(await localArtwork('https://covers.example/html',{fetchImage:async()=>new Response('not an image')}),null);
 assert.equal(await localArtwork('http://covers.example/art',{fetchImage:()=>{throw Error('must not fetch');}}),null);
 assert.equal(await localArtwork('https://covers.example/huge',{fetchImage:async()=>new Response(png,{headers:{'content-length':'1000001'}})}),null);
 assert.equal(await localArtwork('https://covers.example/huge-stream',{fetchImage:async()=>new Response(Buffer.alloc(1000001))}),null);
});

const test=require('node:test'),assert=require('node:assert/strict');
test('Album artwork colors both Ultra gauges and every media visualizer',async t=>{
 const {DeckView}=await import('../src/renderer/decks.mjs');
 const previous={Image:global.Image,document:global.document};t.after(()=>{global.Image=previous.Image;global.document=previous.document;});
 global.Image=class{async decode(){}};
 global.document={createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray([230,40,60,255])})})})};
 const ids=new Proxy({}, {get:(target,key)=>target[key]??=( {style:{},classList:{toggle(){}},removeAttribute(){}} )});
 const variables={},stops=[{setAttribute(key,value){this.color=value;}},{setAttribute(key,value){this.color=value;}}];
 const view=Object.create(DeckView.prototype);Object.assign(view,{ids,actions:{},text(){},root:{dataset:{},style:{setProperty:(key,value)=>variables[key]=value},querySelectorAll:()=>stops},paletteRequest:0,audio:{},levels:{},songLevels:{},barLevels:{}});
 view.renderMedia({available:true,artwork:'data:image/png;base64,iVBORw0KGgo=',title:'Test'},false);
 await new Promise(resolve=>setImmediate(resolve));
 for(const visualizer of [view.audio,view.levels,view.songLevels,view.barLevels])assert.equal(visualizer.palette[0],'#e6283c');
 assert.equal(variables['--album-1'],'#e6283c');
 for(const deck of ['sound','levels']){view.gaugePaletteKey=null;view.applyGaugePalette(deck);assert.equal(stops[0].color,'#e6283c');}
});

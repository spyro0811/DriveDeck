const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..'),out=path.join(root,'dist/embed');
fs.mkdirSync(out,{recursive:true});for(const name of fs.readdirSync(path.join(root,'src/renderer'))){if(['index.html','app.js','preview.mjs'].includes(name))continue;fs.cpSync(path.join(root,'src/renderer',name),path.join(out,name),{recursive:true});}
for(const name of ['demo.css','simulation.mjs'])fs.copyFileSync(path.join(root,'demo',name),path.join(out,name));
fs.cpSync(path.join(root,'demo/assets'),path.join(out,'assets'),{recursive:true});
fs.writeFileSync(path.join(out,'demo.mjs'),fs.readFileSync(path.join(root,'demo/demo.mjs'),'utf8').replace("'../src/renderer/decks.mjs'","'./decks.mjs'"));
fs.writeFileSync(path.join(out,'index.html'),fs.readFileSync(path.join(root,'demo/index.html'),'utf8').replace('<base href="../src/renderer/">','').replace('../../demo/demo.css','demo.css').replace('../../demo/demo.mjs','demo.mjs'));
fs.copyFileSync(path.join(root,'demo/README.md'),path.join(out,'README.md'));
console.log('Built dist/embed/index.html — host the complete dist/embed folder.');

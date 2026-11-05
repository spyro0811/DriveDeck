const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),yaml=require('js-yaml');
function verifyLinuxRelease(dir,version=require('../package.json').version){
 const info=yaml.load(fs.readFileSync(path.join(dir,'latest-linux.yml'),'utf8'));
 assert.equal(info.version,version);assert.ok(Array.isArray(info.files));
 for(const name of [`DriveDeck-${version}-x64.AppImage`,`DriveDeck-${version}-amd64.deb`]){
  const entry=info.files.find(f=>f.url===name),file=path.join(dir,name);assert.ok(entry,`Missing update manifest entry: ${name}`);
  const bytes=fs.readFileSync(file);assert.equal(bytes.length,entry.size);assert.equal(crypto.createHash('sha512').update(bytes).digest('base64'),entry.sha512);
  assert.equal(bytes.subarray(0,4).toString('hex'),name.endsWith('.AppImage')?'7f454c46':'213c6172');
 }
 assert.ok(!info.files.some(f=>/\.exe(?:$|\?)/i.test(f.url)));
 const files=fs.readdirSync(dir).filter(n=>/\.(AppImage|deb|tar\.gz)$/.test(n));
 fs.writeFileSync(path.join(dir,'SHA256SUMS.txt'),files.map(n=>`${crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,n))).digest('hex')}  ${n}`).join('\n')+'\n');return info;
}
module.exports={verifyLinuxRelease};if(require.main===module){verifyLinuxRelease(path.resolve(process.argv[2]||'dist'));console.log('PASS Linux update metadata, versions, package headers and SHA512.');}

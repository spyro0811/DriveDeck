const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),yaml=require('js-yaml');
function verifyRelease(dir,version=require('../package.json').version){
 const info=yaml.load(fs.readFileSync(path.join(dir,'latest.yml'),'utf8'));
 assert.equal(info.version,version);const name=`DriveDeck-Setup-${version}.exe`,file=info.files.find(f=>f.url===name);assert.ok(file,'latest.yml must refer to the versioned Setup executable');
 const bytes=fs.readFileSync(path.join(dir,name));assert.equal(bytes.subarray(0,2).toString(),'MZ');assert.equal(file.size,bytes.length);assert.equal(file.sha512,crypto.createHash('sha512').update(bytes).digest('base64'));assert.ok(fs.statSync(path.join(dir,name+'.blockmap')).size>0);return info;
}
module.exports={verifyRelease};if(require.main===module){verifyRelease(path.resolve(process.argv[2]||'dist'));console.log('PASS release installer, blockmap and latest.yml version/size/SHA512.');}

const fs=require('node:fs/promises'), path=require('node:path'), zlib=require('node:zlib'), os=require('node:os');
const validId=id=>typeof id==='string'&&/^[a-z0-9_-]{1,48}$/i.test(id);
// Read only requested, bounded entries. Never extract archive paths to disk.
async function zipEntries(file,names){
 const h=await fs.open(file,'r');try{
  const {size}=await h.stat();if(size<22)return {};
  const tail=Buffer.alloc(Math.min(size,65557));await h.read(tail,0,tail.length,size-tail.length);
  let e=-1;for(let i=tail.length-22;i>=0;i--)if(tail.readUInt32LE(i)===0x06054b50&&i+22+tail.readUInt16LE(i+20)===tail.length){e=i;break;}
  if(e<0)return {};const length=tail.readUInt32LE(e+12),offset=tail.readUInt32LE(e+16);
  if(length>32*1024*1024||offset+length>size)return {};
  const dir=Buffer.alloc(length);await h.read(dir,0,length,offset);const result={};
  for(let i=0;i+46<=length;){
   if(dir.readUInt32LE(i)!==0x02014b50)break;
   const n=dir.readUInt16LE(i+28),extra=dir.readUInt16LE(i+30),comment=dir.readUInt16LE(i+32);
   const name=dir.toString('utf8',i+46,i+46+n),compressed=dir.readUInt32LE(i+20),raw=dir.readUInt32LE(i+24),local=dir.readUInt32LE(i+42),method=dir.readUInt16LE(i+10);
   if(names.includes(name)&&!(dir.readUInt16LE(i+8)&1)&&compressed<=4*1024*1024&&raw<=8*1024*1024&&local+30<=size){
    const header=Buffer.alloc(30);await h.read(header,0,30,local);
    if(header.readUInt32LE(0)===0x04034b50){const start=local+30+header.readUInt16LE(26)+header.readUInt16LE(28);if(start+compressed<=size){const b=Buffer.alloc(compressed);await h.read(b,0,b.length,start);const decoded=method===0?b:method===8?zlib.inflateRawSync(b,{maxOutputLength:8*1024*1024}):null;if(decoded?.length===raw)result[name]=decoded;}}
   }
   i+=46+n+extra+comment;
  }return result;
 }finally{await h.close();}
}
async function smallFile(file){const s=await fs.stat(file);if(s.size>8*1024*1024)throw Error('Preview too large');return fs.readFile(file);}
async function discoverRoots(){
 const {platformPaths}=require('./platform-paths.cjs'),{steamLibraries,beamngFolders}=require('./beamng-folders.cjs'),locations=platformPaths(),libraries=await steamLibraries(locations);
 const archives=libraries.map(p=>path.join(p,'steamapps/common/BeamNG.drive/content/vehicles'));if(locations.game)archives.unshift(path.join(locations.game,'content/vehicles'));
 const folders=process.platform==='linux'?await beamngFolders({locations}):[];
 return {archives,mods:path.join(folders[0]?.root||locations.user,'mods')};
}
class VehiclePreview{
 constructor(roots){this.explicitRoots=!!roots;this.roots=roots?Promise.resolve(roots):discoverRoots();this.cache=new Map();}
 get(id,vehicleName=''){const variant=id==='vivace'&&/\bardente\b/i.test(vehicleName)?'ardente':'';const key=id+':'+variant;if(!validId(id))return Promise.resolve({id:null,image:null});if(!this.cache.has(key)){if(this.cache.size>=64)this.cache.delete(this.cache.keys().next().value);this.cache.set(key,this.load(id,variant).catch(()=>({id,image:null})).then(result=>{if(!result.image)this.cache.delete(key);return result;}));}return this.cache.get(key);}
 async load(id,variant=''){
  const roots=await (this.explicitRoots?this.roots:discoverRoots()),prefix=`vehicles/${id}/`,names=[variant==='ardente'?'ardente_S_410Q_DCT.jpg':'default.jpg',variant==='ardente'?'ardente_S_410Q_DCT.png':'default.png','info.json'].map(n=>prefix+n);
  const readZip=async file=>{try{return await zipEntries(file,names)}catch{return {}}};let entries={};
  // Unpacked mods take priority; zip mods may also supply a model preview.
  if(roots.mods){try{for(const d of (await fs.readdir(path.join(roots.mods,'unpacked'),{withFileTypes:true})).slice(0,500))if(d.isDirectory())for(const name of names)try{entries[name]=await smallFile(path.join(roots.mods,'unpacked',d.name,name));}catch{}}catch{}}
  if(!entries[names[0]]&&!entries[names[1]])for(const root of roots.archives||[]){entries=await readZip(path.join(root,id+'.zip'));if(entries[names[0]]||entries[names[1]])break;}
  if(!entries[names[0]]&&!entries[names[1]]&&roots.mods)for(const folder of [roots.mods,path.join(roots.mods,'repo')])try{for(const file of (await fs.readdir(folder)).filter(f=>f.endsWith('.zip')).slice(0,500)){entries=await readZip(path.join(folder,file));if(entries[names[0]]||entries[names[1]])break;}if(entries[names[0]]||entries[names[1]])break;}catch{}
  let info={};try{info=JSON.parse(entries[prefix+'info.json']?.toString()||'{}')}catch{}
  const name=typeof info.Name==='string'&&!info.Name.startsWith('vehiclesData.')?info.Name:id.replace(/[_-]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const jpg=entries[names[0]],png=entries[names[1]],b=jpg||png;
  const valid=b&&(jpg?b[0]===255&&b[1]===216:b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
  return {id,name:variant==='ardente'?'Cherrier Ardente':[typeof info.Brand==='string'?info.Brand.slice(0,80):'',name.slice(0,120)].filter(Boolean).join(' '),image:valid?`data:image/${jpg?'jpeg':'png'};base64,${b.toString('base64')}`:null,source:'BeamNG model preview'};
 }
}
module.exports={VehiclePreview,zipEntries,validId};

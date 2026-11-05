const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {beamngFolders}=require('../src/lib/beamng-folders.cjs');
test('Finds active Proton users in an SD Steam library and ranks recent game logs',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'drivedeck-folders-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const steam=path.join(root,'Steam'),sd=path.join(root,'SD library'),native=path.join(root,'native');
 const proton=path.join(sd,'steamapps/compatdata/284160/pfx/drive_c/users/steamuser/AppData/Local/BeamNG/BeamNG.drive/current');
 await fs.mkdir(path.join(steam,'steamapps'),{recursive:true});
 await fs.writeFile(path.join(steam,'steamapps/libraryfolders.vdf'),'"libraryfolders" { "1" { "path" '+JSON.stringify(sd)+' } }');
 for(const folder of [native,proton]){await fs.mkdir(path.join(folder,'settings'),{recursive:true});await fs.writeFile(path.join(folder,'beamng.log'),'game log');}
 await fs.utimes(path.join(native,'beamng.log'),new Date(1000),new Date(1000));
 const locations={steam:[steam],user:native};
 const found=await beamngFolders({locations,platform:'linux',env:{}});
 assert.deepEqual(found.map(item=>item.kind),['Proton','Native Linux']);
 assert.equal(found[0].root,await fs.realpath(proton));
 const custom=await beamngFolders({locations,platform:'linux',env:{DRIVEDECK_BEAMNG_USER:native}});
 assert.equal(custom[0].kind,'Custom');
 await fs.rm(path.join(proton,'settings'),{recursive:true});await fs.rm(path.join(proton,'beamng.log'));
 assert.equal((await beamngFolders({locations,platform:'linux',env:{}})).length,1);
});

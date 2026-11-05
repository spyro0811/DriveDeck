// Linux-only releases need not replace GitHub's default (Windows) latest release.
function selectLinuxRelease(releases,repository,arch='x64'){
 const candidates=[];
 for(const release of Array.isArray(releases)?releases:[]){
  const match=/^(?:linux-)?v(\d+)\.(\d+)\.(\d+)$/.exec(release.tag_name||'');
  if(!match||release.draft||release.prerelease||!Array.isArray(release.assets))continue;
  const base=`https://github.com/${repository}/releases/download/${encodeURIComponent(release.tag_name)}/`;
  const assets=release.assets.filter(asset=>asset.state==='uploaded'&&asset.browser_download_url===base+encodeURIComponent(asset.name));
  if(!assets.some(a=>a.name==='latest-linux.yml')||!assets.some(a=>a.name.endsWith(`-${arch}.AppImage`)))continue;
  candidates.push({version:match.slice(1).map(Number),url:base,page:`https://github.com/${repository}/releases/tag/${encodeURIComponent(release.tag_name)}`});
 }
 candidates.sort((a,b)=>b.version[0]-a.version[0]||b.version[1]-a.version[1]||b.version[2]-a.version[2]);
 return candidates[0]||null;
}
async function latestLinuxRelease(repository,{fetchRelease=fetch,arch=process.arch}={}){
 if(!/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(repository))throw Error('Invalid release repository');
 const response=await fetchRelease(`https://api.github.com/repos/${repository}/releases?per_page=100`,{headers:{Accept:'application/vnd.github+json','User-Agent':'DriveDeck-Linux-Updater'},signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Linux release lookup failed');
 const reader=response.body.getReader(),parts=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4*1024*1024){await reader.cancel();throw Error('Release response too large');}parts.push(Buffer.from(value));}}finally{reader.releaseLock();}
 return selectLinuxRelease(JSON.parse(Buffer.concat(parts).toString('utf8')),repository,arch);
}
module.exports={selectLinuxRelease,latestLinuxRelease};

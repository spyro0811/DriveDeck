const fs=require('node:fs/promises'),{execFile}=require('node:child_process'),{promisify}=require('node:util');
const execute=promisify(execFile);
const windowsGameRunning=output=>output.split(/\r?\n/).some(line=>/^"BeamNG\.drive[^"\r\n]*\.exe"/i.test(line));
async function companionInstallSafety({platform=process.platform,run=execute,readDir=fs.readdir,readFile=fs.readFile}={}){
 try{
  let running=false;
  if(platform==='win32'){const {stdout}=await run('tasklist.exe',['/FO','CSV','/NH'],{windowsHide:true,timeout:5000,maxBuffer:1024*1024});running=windowsGameRunning(stdout);}
  else if(platform==='linux'){const entries=await readDir('/proc');const names=await Promise.all(entries.filter(n=>/^\d+$/.test(n)).map(n=>readFile('/proc/'+n+'/comm','utf8').catch(()=>'')));running=names.some(name=>/^BeamNG(?:\.drive|\.tech)/i.test(name.trim()));}
  if(running)return {ok:false,error:'Fully quit BeamNG before updating the companion. Replacing a loaded mod can prevent vehicles from loading. Reopen the game after installation.'};
  return {ok:true};
 }catch{return {ok:false,error:'Could not check whether BeamNG is closed. Close the game and try installing the companion again.'};}
}
module.exports={companionInstallSafety,windowsGameRunning};

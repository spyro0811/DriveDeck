const { spawn } = require('node:child_process');
const { EventEmitter } = require('node:events');
const path = require('node:path');
function validateBands(value) {
  return Array.isArray(value) && value.length === 32 && value.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1) ? value : null;
}
class Audio extends EventEmitter {
  constructor(options = {}) { super(); if((options.platform||process.platform)==='linux')return new (require('./linux-audio.cjs').LinuxAudio)(options); this.scriptPath=options.scriptPath||path.join(__dirname, '../../native/audio.ps1'); this.child=null; this.retryAt=0; this.state={available:false,bands:[]}; }
  publish(state) { this.state={...state,updatedAt:Date.now()}; this.emit('state',this.state); }
  start() {
    if(this.child || Date.now()<this.retryAt)return;
    this.publish({available:false,bands:[],starting:true});
    const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',this.scriptPath],{windowsHide:true,stdio:['ignore','pipe','pipe']});this.child=child;
    let buffer='',detail='';
    child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{buffer+=chunk;if(buffer.length>65536){buffer='';return;}let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(this.child!==child)return;try{const message=JSON.parse(line);const bands=validateBands(message.bands);if(bands)this.publish({available:true,bands});else if(message.error)detail=String(message.error).slice(0,250);}catch{}}});
    child.stderr.on('data',chunk=>{detail=chunk.toString().slice(0,250);});
    const ended=()=>{if(this.child!==child)return;this.child=null;this.retryAt=Date.now()+10000;this.publish({available:false,bands:[],error:detail||'Audio output unavailable. Switch to album art and back to reconnect.'});};
    child.on('error',ended);child.on('exit',ended);
  }
  stop(){this.retryAt=0;const child=this.child;this.child=null;if(child)child.kill();this.publish({available:false,bands:[]});}
}
module.exports={Audio,validateBands};

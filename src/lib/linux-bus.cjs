const {execFile}=require('node:child_process');
function runBus(args){return new Promise((resolve,reject)=>execFile('busctl',['--user','--no-pager',...args],{encoding:'utf8',timeout:2500,maxBuffer:262144},(error,out)=>error?reject(error):resolve(out.trim())));}
function decodeBus(value){if(value&&typeof value==='object'&&'type' in value&&'data' in value){const data=value.data;if(value.type.startsWith('a{')||value.type==='v')return decodeBus(Array.isArray(data)?data[0]:data);return decodeBus(data);}if(Array.isArray(value))return value.map(decodeBus);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,entry])=>[key,decodeBus(entry)]));return value;}
class LinuxBus {
  constructor(run=runBus){this.run=run;this.players=new Map();}
  async properties(name){const raw=await this.run(['--json=short','call',name,'/org/mpris/MediaPlayer2','org.freedesktop.DBus.Properties','GetAll','s','org.mpris.MediaPlayer2.Player']);return decodeBus(JSON.parse(raw));}
  async playerctl(args){if(args[0]==='--list-all'){const text=await this.run(['--no-legend','list']);return text.split(/\r?\n/).map(line=>line.trim().split(/\s+/)[0]).filter(name=>/^org\.mpris\.MediaPlayer2\.[A-Za-z0-9_.-]+$/.test(name)).slice(0,8).map(name=>name.slice('org.mpris.MediaPlayer2.'.length)).join('\n');}
    const short=args[0]?.slice('--player='.length);if(!/^[A-Za-z0-9_.-]+$/.test(short||''))throw Error('Invalid player');const name='org.mpris.MediaPlayer2.'+short;
    if(args[1]==='status'){const properties=await this.properties(name);this.players.set(short,properties);return String(properties.PlaybackStatus||'Stopped');}
    const properties=this.players.get(short)||{},metadata=properties.Metadata||{};
    if(args[1]==='metadata'){const value=metadata[args[2]];return value==null?'':Array.isArray(value)?value.join(', '):String(value);}
    if(args[1]==='position'&&args.length===2)return properties.Position==null?'':String(Number(properties.Position)/1000000);
    const method={ 'play-pause':'PlayPause',next:'Next',previous:'Previous',position:'SetPosition'}[args[1]];if(!method)throw Error('Unsupported action');const capability={next:'CanGoNext',previous:'CanGoPrevious',position:'CanSeek','play-pause':properties.PlaybackStatus==='Playing'?'CanPause':'CanPlay'}[args[1]];if(properties.CanControl===false||properties[capability]===false)throw Error('Unsupported control');const call=['call',name,'/org/mpris/MediaPlayer2','org.mpris.MediaPlayer2.Player',method];if(method==='SetPosition'){if(!metadata['mpris:trackid']||!Number.isFinite(Number(args[2]))||Number(args[2])<0)throw Error('Invalid position');call.push('ot',String(metadata['mpris:trackid']),String(Math.round(Number(args[2])*1000000)));}return this.run(call);
  }
}
module.exports={LinuxBus,decodeBus,runBus};

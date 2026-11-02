const fs=require('node:fs');
function releaseNotes(value){if(Array.isArray(value))value=value.slice(0,10).map(entry=>`${entry.version||''}\n${typeof entry.note==='string'?entry.note:''}`).join('\n\n');if(typeof value!=='string')return '';return value.slice(0,32000).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<br\s*\/?\s*>|<\/p>|<\/li>|<\/h[1-6]>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim().slice(0,16000);}
function shouldShowNotes(file,version,existingSettings){try{return JSON.parse(fs.readFileSync(file,'utf8')).version!==version;}catch{return existingSettings;}}
module.exports={releaseNotes,shouldShowNotes};

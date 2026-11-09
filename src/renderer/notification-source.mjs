// UserNotificationListener supplies the transport's logo for forwarded alerts.
// Only exact known app labels are substituted; never guess an icon from message content.
const apps=new Map(['Gmail','Outlook','WhatsApp','Instagram','Discord','YouTube','Messages','Messenger','TikTok','Snapchat','Telegram','Facebook','X','Reddit','DoorDash','Signal','Slack','Teams','Microsoft Teams'].map(name=>[name.toLowerCase(),name]));
const logos=new Set(['gmail','whatsapp','instagram','discord','youtube','messenger','tiktok','snapchat','telegram','facebook','x','reddit','doordash','signal']);
export function notificationSource(value){
 if(!/microsoft\.yourphone|phone\s?link|link to windows/i.test((value.appId||'')+' '+value.appName))return value;
 const name=apps.get((value.title||'').trim().toLowerCase());if(!name)return {...value,icon:null};
 const lines=(value.body||'').split('\n'),title=lines.shift()||name;
 return {...value,appName:name+' · via Phone Link',title,body:lines.join('\n'),icon:logos.has(name.toLowerCase())?new URL('./assets/notifications/'+name.toLowerCase()+'.svg',import.meta.url).href:null};
}

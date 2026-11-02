const QRCode=require('qrcode');
async function pairingCodes(state){return {...state,codes:await Promise.all((state.links||[]).map(async url=>({address:new URL(url).host,pairingCode:state.pairingCode?.replace(/(.{4})/,'$1-')||'',image:await QRCode.toDataURL(url,{width:320,margin:4,errorCorrectionLevel:'M',color:{dark:'#000000',light:'#ffffff'}})})))};}
module.exports={pairingCodes};

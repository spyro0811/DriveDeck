export function renderMobilePairing(root,state){
 root.replaceChildren();
 if(state.error){root.textContent=state.error;return;}
 if(!state.running)return;
 const codes=state.codes||[];
 if(!codes.length){root.textContent='Connect this PC to Wi-Fi or Ethernet, then restart sharing.';return;}
 const row=document.createElement('figure');row.className='mobile-pairing';
 const image=document.createElement('img');image.alt='Scan with your phone camera to open DriveDeck';image.width=image.height=320;
 const caption=document.createElement('figcaption'),key=document.createElement('input');key.readOnly=true;key.setAttribute('aria-label','Phone pairing code');key.style.width='100%';key.onclick=()=>key.select();
 const keyLabel=document.createElement('p');keyLabel.textContent='Pairing code · enter this on the phone Connect screen';
 const selectCode=code=>{image.src=code.image;caption.textContent='PC address: '+code.address;key.value=code.pairingCode;};
 if(codes.length>1){const label=document.createElement('label');label.className='field';label.textContent='PC network address';const select=document.createElement('select');select.setAttribute('aria-label','PC network address');codes.forEach((code,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=code.address;select.append(option);});select.onchange=()=>selectCode(codes[Number(select.value)]);label.append(select);root.append(label);}
 selectCode(codes[0]);row.append(image,caption,keyLabel,key);root.append(row);
}

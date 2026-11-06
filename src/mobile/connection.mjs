export class PhoneRequestError extends Error{constructor(code,message){super(message);this.name='PhoneRequestError';this.code=code;}}
export async function phoneJson(url,{signal,timeout=8000,fetchFn=fetch,...options}={}){
 const controller=new AbortController();let expired=false;
 const cancel=()=>controller.abort();if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(()=>{expired=true;controller.abort();},timeout);
 try{const response=await fetchFn(url,{...options,signal:controller.signal});
  if(response.status===503)throw new PhoneRequestError('stopped','Phone dashboard is stopped. Start it in DriveDeck on your PC.');
  if(response.status===401)throw new PhoneRequestError('pairing','Enter the pairing code shown in DriveDeck on your PC.');
  if(response.status===429)throw new PhoneRequestError('rate','Too many attempts. Wait one minute and try again.');
  if(!response.ok)throw new PhoneRequestError('offline','Connection lost. Reconnecting to your PC…');
  return await response.json();
 }catch(error){if(error instanceof PhoneRequestError)throw error;if(signal?.aborted)throw new PhoneRequestError('canceled','Request canceled.');if(expired)throw new PhoneRequestError('timeout','PC connection timed out. Reconnecting…');throw new PhoneRequestError('offline','Cannot reach your PC. Keep DriveDeck open and start the phone dashboard.');}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
}

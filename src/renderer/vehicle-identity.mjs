import { VEHICLE_ASSETS } from './vehicle-assets.mjs';
export function vehicleVisual(data={}){
 const id=String(data.vehicleId||'').toLowerCase(),name=String(data.vehicleName||'').toLowerCase();let asset=null,label=null;
 // A shared platform folder is not a model identity. The companion reports the body.
 if(id==='ardente'||(id==='vivace'&&/\bardente\b/.test(name))){asset='Ardente';label='Cherrier Ardente';}
 else if(id==='vivace'){asset='Vivace';label='Cherrier Vivace';}
 else if(id==='bastion'){asset='Bastion';label='Bruckell Bastion';}
 else if(id==='scintilla'){asset='Civetta';label='Civetta Scintilla';}
 else if(/^etk(?:c|800|i|_.*)?$/.test(id)){asset='ETK';label=({etkc:'ETK K-Series',etk800:'ETK 800-Series',etki:'ETK I-Series'})[id]||'ETK';}
 else if(id==='pigeon'||id==='pidgeon'){asset='Pidgeon';label='Ibishu Pigeon';}
 else if(id==='van'){asset='Van';label='Gavril H-Series';}
 else if(id==='hopper'){asset='Hopper';label='Ibishu Hopper';}
 return {key:asset||id||'unknown',asset,label,...(asset?VEHICLE_ASSETS[asset]:{})};
}

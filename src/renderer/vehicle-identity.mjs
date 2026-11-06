import { VEHICLE_ASSETS } from './vehicle-assets.mjs';
const MODELS={
 ardente:['Ardente','Cherrier Ardente'],tograc:['Tograc','Cherrier Tograc'],vivace:['Vivace','Cherrier Vivace'],
 autobello:['Piccolina','Autobello Piccolina'],midtruck:['Stambecco','Autobello Stambecco'],
 bastion:['Bastion','Bruckell Bastion'],legran:['LeGran','Bruckell LeGran'],moonhawk:['Moonhawk','Bruckell Moonhawk'],nine:['Nine','Bruckell Nine'],burnside:['Burnside','Burnside Special'],
 percheron:['Percheron','Cherrier Percheron'],bolide:['Bolide','Civetta Bolide'],scintilla:['Civetta','Civetta Scintilla'],
 etk800:['ETK800','ETK 800-Series'],etki:['ETKI','ETK I-Series'],etkc:['ETK','ETK K-Series'],
 atv:['Hydra','FPU Hydra'],utv:['Aurata','Hirochi Aurata'],sbr:['SBR4','Hirochi SBR4'],sunburst:['Sunburst','Hirochi Sunburst'],sunburst2:['Sunburst','Hirochi Sunburst'],
 barstow:['Barstow','Gavril Barstow'],bluebuck:['Bluebuck','Gavril Bluebuck'],pickup:['DSeries','Gavril D-Series'],fullsize:['GrandMarshal','Gavril Grand Marshal'],
 md_series:['MDSeries','Gavril MD-Series'],roamer:['Roamer','Gavril Roamer'],us_semi:['TSeries','Gavril T-Series'],
 pigeon:['Pidgeon','Ibishu Pigeon'],pidgeon:['Pidgeon','Ibishu Pigeon'],van:['Van','Gavril H-Series'],hopper:['Hopper','Ibishu Hopper']
};
export function vehicleVisual(data={}){
 const id=String(data.vehicleId||'').toLowerCase(),name=String(data.vehicleName||'').toLowerCase();let match=MODELS[id];
 // Shared platform folders need the companion's selected-body identity.
 if(id==='vivace'&&/\bardente\b/.test(name))match=MODELS.ardente;
 else if(id==='vivace'&&/\btograc\b/.test(name))match=MODELS.tograc;
 else if(id==='md_series'&&/\b(?:school\s*bus|bus)\b/.test(name))match=['MDSeriesBus','Gavril MD-Series Bus'];
 else if(!match&&/^etk(?:_.*)?$/.test(id))match=['ETK','ETK'];
 const [asset,label]=match||[null,null];return {key:asset||id||'unknown',asset,label,...(asset?VEHICLE_ASSETS[asset]:{})};
}

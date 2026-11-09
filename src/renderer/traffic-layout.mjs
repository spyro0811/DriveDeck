export class TrafficLayout{
 constructor(){this.identity=null;this.seen=false;}
 update(data,park,enabled=true){
  if(!enabled){this.identity=null;this.seen=false;return false;}
  const identity=data.connected&&data.vehicleId?data.vehicleId+':'+(data.vehicleName||''):null;
  if(identity&&identity!==this.identity){this.identity=identity;this.seen=false;}
  if(data.connected&&data.surroundings)this.seen=true;
  // Retain the layout, not old actors, during temporary packet loss.
  return !park&&this.seen;
 }
}

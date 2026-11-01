// Private Electron-main backend. No network listener or renderer-supplied player feed.
const robloxAdapter={
 async start({emit}){
  emit({type:'capability',code:'ROBLOX_DATA_CONNECTOR_MISSING',retryable:false,
   message:'Roblox process found. No current-experience lookup or player-data connector is installed in this desktop build. The local IPC backend is running, but is not a Roblox data API. Published Roblox requires an authorized external game-side integration; ESP remains inactive.',
   missing:['Current-experience identification adapter','Authorized player-data transport and desktop consumer','Developer-enabled published game scripts and viewer authorization']});
  return null;
 }
};
class LocalBackend{
 constructor(adapter=robloxAdapter){this.adapter=adapter;this.connection={transport:'private-electron-ipc'};this.generation=0;this.controller=null;this.dispose=null;}
 async restore(){return {transport:'private-electron-ipc'};}
 health(){return {transport:'private-electron-ipc',backendImplemented:true,networkListener:false,gameIdentificationImplemented:false,playerDataConnectorImplemented:false};}
 inventory(){return [
  {id:'roblox-process',available:true,description:'Windows process monitor: process presence only; no Place ID or player data.'},
  {id:'roblox-local-data',available:false,description:'No supported local Roblox identity/player-data connector is implemented. The bundled adapter performs a capability check only.'},
  {id:'external-game-bridge',available:false,description:'Optional game-side/relay source exists outside the desktop package. ExportConfig is disabled by default; the desktop remote consumer was removed. Developer authorization, published scripts, and a secure authorized transport plus desktop adapter are required.'}
 ];}
 start(send,profiles=[]){
  this.stop();const generation=this.generation;this.controller=new AbortController();
  const signal=this.controller.signal;
  const emit=event=>{if(generation===this.generation&&!signal.aborted)send(event);};
  emit({type:'diagnostics',integrations:this.inventory(),backend:this.health()});
  Promise.resolve().then(()=>{
   if(signal.aborted)return null;
   return this.adapter.start({signal,profiles,emit});
  }).then(dispose=>{
   if(generation!==this.generation||signal.aborted){if(typeof dispose==='function')dispose();return;}
   if(typeof dispose==='function')this.dispose=dispose;
  }).catch(()=>emit({type:'status',code:'LOCAL_ADAPTER_START_FAILED',retryable:true,message:'The bundled local adapter threw during initialization. STOP and relaunch; this is an adapter startup failure, not a game-data connection.'}));
 }
 stop(){this.generation++;this.controller?.abort();this.controller=null;const dispose=this.dispose;this.dispose=null;if(dispose)try{dispose();}catch{}}
}
module.exports=LocalBackend;

// Private Electron-main backend. No network listener or renderer-supplied player feed.
const robloxAdapter={
 async start({emit}){
  emit({type:'capability',message:'Roblox is running, but its current Place ID and player data are not available through a supported local API. Published Roblox requires an authorized external game-side integration. No ESP session was started.'});
  return null;
 }
};
class LocalBackend{
 constructor(adapter=robloxAdapter){this.adapter=adapter;this.connection={transport:'private-electron-ipc'};this.generation=0;this.controller=null;this.dispose=null;}
 async restore(){return {transport:'private-electron-ipc'};}
 start(send,profiles=[]){
  this.stop();const generation=this.generation;this.controller=new AbortController();
  const signal=this.controller.signal;
  const emit=event=>{if(generation===this.generation&&!signal.aborted)send(event);};
  Promise.resolve().then(()=>{
   if(signal.aborted)return null;
   return this.adapter.start({signal,profiles,emit});
  }).then(dispose=>{
   if(generation!==this.generation||signal.aborted){if(typeof dispose==='function')dispose();return;}
   if(typeof dispose==='function')this.dispose=dispose;
  }).catch(()=>emit({type:'status',message:'Local integration failed to initialize. Stop and relaunch to retry.'}));
 }
 stop(){this.generation++;this.controller?.abort();this.controller=null;const dispose=this.dispose;this.dispose=null;if(dispose)try{dispose();}catch{}}
}
module.exports=LocalBackend;

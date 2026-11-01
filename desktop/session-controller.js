const {valid}=require('./player-data');
class SessionController{
 constructor({api,send,cleanup=()=>{}}){this.api=api;this.send=send;this.cleanup=cleanup;this.armed=false;this.running=null;this.polling=false;this.generation=0;this.active=null;this.profiles=[];this.detectedGame=null;this.playerDataConnected=false;this.processStatus=null;this.lastEvent=null;this.lastSignature='';}
 state(state,message,details={}){const event={type:'state',state,message,code:details.code||state.toUpperCase().replaceAll('-','_'),retryable:details.retryable??false,missing:details.missing||[],armed:this.armed,profile:this.active,robloxDetected:this.running,detectedGame:this.detectedGame,playerDataConnected:this.playerDataConnected};const signature=JSON.stringify(event);this.lastEvent=event;if(signature!==this.lastSignature){this.lastSignature=signature;this.send(event);}}
 configure(profiles){
  if(!Array.isArray(profiles)||profiles.length<1||profiles.length>50||!profiles.every(p=>typeof p.id==='string'&&p.id.length<100&&Number.isSafeInteger(p.placeId)&&p.placeId>0))throw Error('Invalid game profiles');
  this.profiles=profiles.map(p=>({id:p.id,placeId:p.placeId}));
  if(this.active&&!this.profiles.some(p=>p.placeId===this.active.placeId)){this.active=null;this.playerDataConnected=false;this.cleanup();this.state('waiting-data','Profile changed · identifying game');}
 }
 async launch(profiles){
  this.configure(profiles);
  if(this.armed){if(this.lastEvent)this.send(this.lastEvent);return;}
  this.armed=true;const generation=++this.generation;this.state('initializing','Initializing private local backend…');
  if(!this.api.connection)await this.api.restore();
  if(generation!==this.generation||!this.armed)return;
  this.startIfReady();
 }
 process(status){
  this.running=status.running;this.processStatus=status;
  if(!this.armed)return;
  if(this.running!==true){if(this.polling||this.active||this.detectedGame)this.disconnect();this.state('waiting-game',status.message||(this.running===false?'Roblox is not running · waiting for launch':'Windows process detection is unavailable'),{code:status.code||'ROBLOX_PROCESS_UNVERIFIED',retryable:true});return;}
  this.startIfReady();
 }
 startIfReady(){
  if(!this.armed||this.polling)return;
  if(this.running!==true){this.state('waiting-game',this.processStatus?.message||'Waiting for Roblox to launch',{code:this.processStatus?.code||'WAITING_FOR_PROCESS_CHECK',retryable:true});return;}
  if(!this.api.connection){this.state('backend-unavailable','Local backend unavailable · STOP and relaunch');return;}
  this.polling=true;const generation=this.generation;this.state('initializing','Roblox detected · checking supported local integrations');
  this.api.start(event=>{
   if(!this.armed||generation!==this.generation||!this.polling)return;
   if(event.type==='diagnostics'){this.send(event);return;}
   if(event.type==='capability'){this.active=null;this.detectedGame=null;this.playerDataConnected=false;this.cleanup();this.state('integration-required',event.message,{code:event.code||'GAME_INTEGRATION_UNAVAILABLE',retryable:event.retryable??false,missing:event.missing||[]});return;}
   if(event.type!=='data'){this.active=null;this.detectedGame=null;this.playerDataConnected=false;this.cleanup();this.state(event.retrying?'reconnecting':'error',event.message||'Local integration unavailable · STOP and relaunch',{code:event.code||'LOCAL_ADAPTER_ERROR',retryable:event.retryable??!!event.retrying});return;}
   const packet=event.packet;
   if(packet?.status==='waiting'){this.active=null;this.detectedGame=null;this.playerDataConnected=false;this.cleanup();this.state('waiting-data','Local integration waiting for authorized game data');return;}
   if(!valid(packet)){this.active=null;this.detectedGame=null;this.playerDataConnected=false;this.cleanup();this.state('error','Invalid API response · ESP not started',{code:'PLAYER_DATA_SCHEMA_INVALID'});return;}
   this.detectedGame={placeId:packet.game.placeId,name:packet.game.name||null,jobId:packet.game.jobId};
   const profile=this.profiles.find(p=>p.placeId===packet.game.placeId);
   if(!profile){this.active=null;this.playerDataConnected=false;this.cleanup();this.state('unsupported',`Unsupported game: ${packet.game.name||'Name unavailable'} · Place ${packet.game.placeId}`,{code:'PLACE_PROFILE_MISMATCH'});return;}
   const identity=profile.id+':'+packet.game.jobId;
   if(this.active?.identity!==identity){
    this.cleanup();this.send({type:'unload',message:'Loading matched game profile'});
    this.active={id:profile.id,placeId:profile.placeId,identity};
   }
   this.playerDataConnected=true;
   this.state('connected',`Connected · ${packet.game.name||'Name unavailable'} · Place ${packet.game.placeId}`);
   this.send(event);
  },this.profiles);
 }
 disconnect(){this.generation++;this.polling=false;this.api.stop();this.active=null;this.detectedGame=null;this.playerDataConnected=false;this.cleanup();this.send({type:'unload',message:'Game session stopped'});}
 stop(){this.armed=false;this.disconnect();this.state('idle','Idle · press LAUNCH');}
}
module.exports=SessionController;

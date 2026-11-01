const {valid}=require('./player-data');
class SessionController{
 constructor({api,send,cleanup=()=>{}}){this.api=api;this.send=send;this.cleanup=cleanup;this.armed=false;this.running=null;this.polling=false;this.generation=0;this.active=null;this.profiles=[];this.detectedGame=null;this.playerDataConnected=false;}
 state(state,message){this.send({type:'state',state,message,armed:this.armed,profile:this.active,robloxDetected:this.running,detectedGame:this.detectedGame,playerDataConnected:this.playerDataConnected});}
 configure(profiles){
  if(!Array.isArray(profiles)||profiles.length<1||profiles.length>50||!profiles.every(p=>typeof p.id==='string'&&p.id.length<100&&Number.isSafeInteger(p.placeId)&&p.placeId>0))throw Error('Invalid game profiles');
  this.profiles=profiles.map(p=>({id:p.id,placeId:p.placeId}));
  if(this.active&&!this.profiles.some(p=>p.placeId===this.active.placeId)){this.active=null;this.playerDataConnected=false;this.cleanup();this.state('waiting-data','Profile changed · identifying game');}
 }
 async launch(profiles){
  this.configure(profiles);
  if(this.armed){this.state(this.active?'connected':'waiting-game',this.active?'System already running':'LAUNCH is already armed');return;}
  this.armed=true;const generation=++this.generation;this.state('initializing','Initializing private local backend…');
  if(!this.api.connection)await this.api.restore();
  if(generation!==this.generation||!this.armed)return;
  this.startIfReady();
 }
 process(status){
  this.running=status.running;
  if(!this.armed)return;
  if(this.running!==true){this.disconnect();this.state('waiting-game',this.running===false?'Roblox closed/not running · waiting for launch':'Cannot verify Roblox process · check Windows PowerShell');return;}
  this.startIfReady();
 }
 startIfReady(){
  if(!this.armed||this.polling)return;
  if(this.running!==true){this.state('waiting-game','Waiting for Roblox to launch');return;}
  if(!this.api.connection){this.state('backend-unavailable','Local backend unavailable · STOP and relaunch');return;}
  this.polling=true;const generation=this.generation;this.state('initializing','Roblox detected · checking supported local integrations');
  this.api.start(event=>{
   if(!this.armed||generation!==this.generation||!this.polling)return;
   if(event.type==='diagnostics'){this.send(event);return;}
   if(event.type==='capability'){this.active=null;this.detectedGame=null;this.playerDataConnected=false;this.cleanup();this.state('integration-required',event.message);return;}
   if(event.type!=='data'){this.active=null;this.detectedGame=null;this.playerDataConnected=false;this.cleanup();this.state(event.retrying?'reconnecting':'error',event.message||'Local integration unavailable · STOP and relaunch');return;}
   const packet=event.packet;
   if(packet?.status==='waiting'){this.active=null;this.detectedGame=null;this.playerDataConnected=false;this.cleanup();this.state('waiting-data','Local integration waiting for authorized game data');return;}
   if(!valid(packet)){this.active=null;this.detectedGame=null;this.playerDataConnected=false;this.cleanup();this.state('error','Invalid API response · ESP not started');return;}
   this.detectedGame={placeId:packet.game.placeId,name:packet.game.name||null,jobId:packet.game.jobId};
   const profile=this.profiles.find(p=>p.placeId===packet.game.placeId);
   if(!profile){this.active=null;this.playerDataConnected=false;this.cleanup();this.state('unsupported',`Unsupported game: ${packet.game.name||'Name unavailable'} · Place ${packet.game.placeId}`);return;}
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

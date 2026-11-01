const {valid}=require('./player-data');
class SessionController{
 constructor({api,send,cleanup=()=>{}}){this.api=api;this.send=send;this.cleanup=cleanup;this.armed=false;this.running=null;this.polling=false;this.generation=0;this.active=null;this.profiles=[];}
 state(state,message){this.send({type:'state',state,message,armed:this.armed,profile:this.active});}
 configure(profiles){
  if(!Array.isArray(profiles)||profiles.length<1||profiles.length>50||!profiles.every(p=>typeof p.id==='string'&&p.id.length<100&&Number.isSafeInteger(p.placeId)&&p.placeId>0))throw Error('Invalid game profiles');
  this.profiles=profiles.map(p=>({id:p.id,placeId:p.placeId}));
  if(this.active&&!this.profiles.some(p=>p.placeId===this.active.placeId)){this.active=null;this.cleanup();this.state('waiting-data','Profile changed · identifying game');}
 }
 async launch(profiles){
  this.configure(profiles);
  if(this.armed){this.state(this.active?'connected':'waiting-game',this.active?'System already running':'LAUNCH is already armed');return;}
  this.armed=true;const generation=++this.generation;this.state('initializing','Loading saved authorization…');
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
  if(!this.api.connection){this.state('pair-required','Pair your authorized game once under Profile & secure pairing, then LAUNCH reconnects automatically');return;}
  this.polling=true;const generation=this.generation;this.state('connecting','Roblox detected · connecting to authorized API');
  this.api.start(event=>{
   if(!this.armed||generation!==this.generation||!this.polling)return;
   if(event.type!=='data'){this.active=null;this.cleanup();this.state('reconnecting',event.message||'API unavailable · retrying');return;}
   const packet=event.packet;
   if(packet?.status==='waiting'){this.active=null;this.cleanup();this.state('waiting-data','Connected relay · waiting for fresh game data');return;}
   if(!valid(packet)){this.active=null;this.cleanup();this.state('error','Invalid API response · ESP not started');return;}
   const profile=this.profiles.find(p=>p.placeId===packet.game.placeId);
   if(!profile){this.active=null;this.cleanup();this.state('unsupported',`Unsupported game: ${packet.game.name||'Name unavailable'} · Place ${packet.game.placeId}`);return;}
   const identity=profile.id+':'+packet.game.jobId;
   if(this.active?.identity!==identity){
    this.cleanup();this.send({type:'unload',message:'Loading matched game profile'});
    this.active={id:profile.id,placeId:profile.placeId,identity};
   }
   this.state('connected',`Connected · ${packet.game.name||'Name unavailable'} · Place ${packet.game.placeId}`);
   this.send(event);
  });
 }
 disconnect(){this.generation++;this.polling=false;this.api.stop();this.active=null;this.cleanup();this.send({type:'unload',message:'Game session stopped'});}
 reauthorize(){this.disconnect();if(this.armed)this.startIfReady();}
 stop(){this.armed=false;this.disconnect();this.state('idle','Idle · press LAUNCH');}
}
module.exports=SessionController;

const {spawn}=require('node:child_process');
class GameProcess{
 constructor(){this.timer=null;this.child=null;this.stopped=true;}
 start(send){
  this.stop();this.stopped=false;
  const poll=()=>{
   if(this.stopped)return;
   if(process.platform!=='win32'){send({running:null});return;}
   const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',"@(Get-Process -Name RobloxPlayerBeta -ErrorAction SilentlyContinue).Count"],{windowsHide:true,stdio:['ignore','pipe','ignore']});
   this.child=child;let output='';const timeout=setTimeout(()=>child.kill(),4000);
   child.stdout.on('data',data=>{if(output.length<100)output+=data.toString();});
   const done=()=>{clearTimeout(timeout);if(this.child!==child)return;this.child=null;if(this.stopped)return;const count=Number(output.trim());send({running:output.trim()!==''&&Number.isFinite(count)?count>0:null});this.timer=setTimeout(poll,3000);};
   child.once('error',done);child.once('exit',done);
  };poll();
 }
 stop(){this.stopped=true;clearTimeout(this.timer);if(this.child)this.child.kill();this.child=null;}
}
module.exports=GameProcess;

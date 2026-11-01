const {spawn}=require('node:child_process');
class GameProcess{
 constructor({platform=process.platform,spawnProcess=spawn,schedule=setTimeout,cancel=clearTimeout}={}){this.platform=platform;this.spawnProcess=spawnProcess;this.schedule=schedule;this.cancel=cancel;this.timer=null;this.timeout=null;this.child=null;this.stopped=true;}
 start(send){
  this.stop();this.stopped=false;
  const poll=()=>{
   if(this.stopped)return;
   if(this.platform!=='win32'){send({running:null,code:'PROCESS_PLATFORM_UNSUPPORTED',message:'Native Roblox process detection requires Windows.'});return;}
   let child;
   try{child=this.spawnProcess('powershell.exe',['-NoProfile','-NonInteractive','-Command',"@(Get-Process -Name RobloxPlayerBeta -ErrorAction SilentlyContinue).Count"],{windowsHide:true,stdio:['ignore','pipe','ignore']});}
   catch(error){send({running:null,code:error.code==='ENOENT'?'POWERSHELL_NOT_FOUND':'PROCESS_SPAWN_FAILED',message:'Windows process query could not start.'});this.timer=this.schedule(poll,3000);return;}
   this.child=child;let output='',timedOut=false,finished=false;
   const done=(exitCode,error)=>{
    if(finished||this.child!==child)return;finished=true;
    this.cancel(this.timeout);this.timeout=null;this.child=null;if(this.stopped)return;
    let status;
    if(timedOut)status={running:null,code:'PROCESS_QUERY_TIMEOUT',message:'Windows process query exceeded four seconds.'};
    else if(error)status={running:null,code:error.code==='ENOENT'?'POWERSHELL_NOT_FOUND':'PROCESS_SPAWN_FAILED',message:'Windows PowerShell process query could not start.'};
    else if(exitCode!==0)status={running:null,code:'PROCESS_QUERY_FAILED',message:'Windows PowerShell process query exited unsuccessfully.'};
    else if(!/^\d+$/.test(output.trim())||!Number.isSafeInteger(Number(output.trim())))status={running:null,code:'PROCESS_OUTPUT_INVALID',message:'Windows process query returned an invalid process count.'};
    else{const count=Number(output.trim());status={running:count>0,count,code:count>0?'ROBLOX_PROCESS_FOUND':'ROBLOX_PROCESS_NOT_FOUND',message:count>0?'RobloxPlayerBeta process found; game identity is not provided by this query.':'RobloxPlayerBeta is not running.'};}
    send(status);this.timer=this.schedule(poll,3000);
   };
   this.timeout=this.schedule(()=>{timedOut=true;child.kill();done(null);},4000);
   child.stdout?.on('data',data=>{if(output.length<100)output+=data.toString();});
   child.once('error',error=>done(null,error));child.once('close',exitCode=>done(exitCode));
  };poll();
 }
 stop(){this.stopped=true;this.cancel(this.timer);this.cancel(this.timeout);this.timer=null;this.timeout=null;const child=this.child;this.child=null;if(child)child.kill();}
}
module.exports=GameProcess;

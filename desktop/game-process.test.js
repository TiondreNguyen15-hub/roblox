const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const Monitor=require('./game-process');
function harness(platform='win32',spawnError=null){
 const statuses=[],timers=new Map();let next=0,child=null,kills=0,spawns=0;
 const monitor=new Monitor({platform,schedule:(fn,ms)=>{const id=++next;timers.set(id,{fn,ms});return id;},cancel:id=>timers.delete(id),spawnProcess:(name,args,options)=>{
  spawns++;assert.equal(name,'powershell.exe');assert.ok(args.at(-1).includes('Get-Process -Name RobloxPlayerBeta'));assert.equal(options.stdio[2],'ignore');
  if(spawnError)throw spawnError;
  child=new EventEmitter();child.stdout=new EventEmitter();child.kill=()=>{kills++;child.emit('close',null);};return child;
 }});
 monitor.start(s=>statuses.push(s));
 return {monitor,statuses,timers,get child(){return child},get kills(){return kills},get spawns(){return spawns}};
}
for(const [output,exit,code,running] of [['1\n',0,'ROBLOX_PROCESS_FOUND',true],['0\n',0,'ROBLOX_PROCESS_NOT_FOUND',false],['garbage',0,'PROCESS_OUTPUT_INVALID',null],['1',1,'PROCESS_QUERY_FAILED',null]]){
 const h=harness();h.child.stdout.emit('data',output);h.child.emit('close',exit);assert.equal(h.statuses[0].code,code);assert.equal(h.statuses[0].running,running);h.monitor.stop();assert.equal(h.timers.size,0);
}
const missing=harness('win32',Object.assign(new Error('fixture'),{code:'ENOENT'}));assert.equal(missing.statuses[0].code,'POWERSHELL_NOT_FOUND');missing.monitor.stop();
const failed=harness();failed.child.emit('error',Object.assign(new Error('fixture'),{code:'ENOENT'}));failed.child.emit('close',1);assert.equal(failed.statuses.length,1);assert.equal(failed.statuses[0].code,'POWERSHELL_NOT_FOUND');failed.monitor.stop();
const timeout=harness();[...timeout.timers.values()].find(t=>t.ms===4000).fn();assert.equal(timeout.statuses[0].code,'PROCESS_QUERY_TIMEOUT');assert.equal(timeout.kills,1);timeout.monitor.stop();assert.equal(timeout.timers.size,0);
const stopped=harness();stopped.monitor.stop();assert.equal(stopped.statuses.length,0);assert.equal(stopped.timers.size,0);
const unsupported=harness('linux');assert.equal(unsupported.spawns,0);assert.equal(unsupported.statuses[0].code,'PROCESS_PLATFORM_UNSUPPORTED');unsupported.monitor.stop();
console.log('PASS: process query command, success/absence, invalid output, failed exit, spawn/ENOENT, timeout, duplicate completion, STOP cleanup and unsupported OS. Child processes are test adapters, not native Windows verification.');

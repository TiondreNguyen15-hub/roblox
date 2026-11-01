const assert=require('node:assert/strict');
const Controller=require('./session-controller');
const cf=[0,0,0,1,0,0,0,1,0,0,0,1];
function packet(placeId=79862723087324,jobId='one'){
 return {status:'connected',version:1,sequence:1,viewerUserId:7,connectedCount:1,game:{universeId:10353139110,placeId,jobId},camera:{cframe:cf,viewport:[1000,500],fov:70},players:[]};
}
async function test(){
 const events=[];let starts=0,stops=0,callback,cleanups=0;
 const api={connection:{},restore:async()=>({}),start:send=>{starts++;callback=send;},stop:()=>{stops++;}};
 const c=new Controller({api,send:event=>events.push(event),cleanup:()=>cleanups++});
 const profiles=[{id:'one',placeId:79862723087324},{id:'two',placeId:123}];
 await c.launch(profiles);assert.equal(starts,0);assert.equal(events.at(-1).state,'waiting-game');
 c.process({running:true});assert.equal(starts,1);
 await c.launch(profiles);assert.equal(starts,1,'duplicate launch must not duplicate API polling');
 callback({type:'data',packet:packet()});assert.equal(events.at(-2).state,'connected');assert.equal(events.at(-1).type,'data');assert.equal(c.active.id,'one');
 callback({type:'data',packet:packet(123,'two')});assert.equal(c.active.id,'two');assert.ok(events.some(e=>e.type==='unload'));
 callback({type:'data',packet:packet(999)});assert.equal(events.at(-1).state,'unsupported');assert.equal(c.active,null);
 callback({type:'status',message:'API unavailable',retrying:true});assert.equal(events.at(-1).state,'reconnecting');
 callback({type:'data',packet:packet()});assert.equal(c.active.id,'one');
 const stale=callback;c.process({running:false});assert.equal(c.active,null);assert.equal(c.polling,false);assert.equal(events.at(-1).state,'waiting-game');
 const before=events.length;stale({type:'data',packet:packet()});assert.equal(events.length,before,'late packets after game exit must be ignored');
 c.process({running:true});assert.equal(starts,2,'armed system restarts after game opens');
 callback({type:'data',packet:packet()});c.stop();assert.equal(c.armed,false);assert.equal(c.polling,false);assert.equal(events.at(-1).state,'idle');assert.ok(stops>0&&cleanups>0);
 const stopped=events.length;callback({type:'data',packet:packet()});c.process({running:true});assert.equal(events.length,stopped,'manual STOP must disarm auto-launch');
 await c.launch(profiles);assert.equal(starts,3);c.stop();
 let resolveRestore;api.connection=null;api.restore=()=>new Promise(resolve=>{resolveRestore=resolve;});
 const pending=c.launch(profiles);c.stop();resolveRestore({});await pending;assert.equal(c.armed,false);assert.equal(starts,3,'STOP cancels pending initialization');
 api.connection=null;api.restore=async()=>null;await c.launch(profiles);assert.equal(events.at(-1).state,'backend-unavailable');c.stop();
 console.log('PASS: LAUNCH, process wait/start, profile/data init, duplicate prevention, switching/unload, unsupported game, API failure/recovery, exit/reopen, STOP, late-packet rejection, restart, canceled initialization, backend availability. Test adapters only.');
}
test().catch(error=>{console.error(error);process.exitCode=1;});

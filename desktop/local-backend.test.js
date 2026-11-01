const assert=require('node:assert/strict');
const Backend=require('./local-backend');
const Controller=require('./session-controller');
const turn=()=>new Promise(resolve=>setImmediate(resolve));
async function run(){
 const events=[],backend=new Backend(),controller=new Controller({api:backend,send:e=>events.push(e)});
 const profiles=[{id:'own-game',placeId:79862723087324}];
 await controller.launch(profiles);assert.equal(events.at(-1).state,'waiting-game');
 controller.process({running:true});await turn();
 assert.equal(events.at(-1).state,'integration-required');assert.equal(controller.active,null);
 assert.equal(events.filter(e=>e.type==='data').length,0,'built-in Roblox adapter must never invent data');
 assert.ok(events.at(-1).message.includes('external'));assert.equal(events.at(-1).code,'ROBLOX_DATA_CONNECTOR_MISSING');assert.equal(events.at(-1).retryable,false);assert.equal(events.at(-1).missing.length,3);assert.equal(backend.health().playerDataConnectorImplemented,false);const failure=events.at(-1);await controller.launch(profiles);assert.deepEqual(events.at(-1),failure,'Repeated LAUNCH must retain the precise failure');const count=events.length;controller.process({running:true});await turn();assert.equal(events.length,count,'Stable process updates must not repeat initialization/errors');controller.stop();assert.equal(events.at(-1).state,'idle');
 controller.process({running:true});await turn();assert.equal(events.at(-1).state,'idle','STOP must disarm auto-start');
 let aborted=false,disposed=0,resolveStart,send;
 const testBackend=new Backend({start:({signal,emit})=>{send=emit;signal.addEventListener('abort',()=>{aborted=true});return new Promise(resolve=>{resolveStart=resolve});}});
 const received=[];testBackend.start(e=>{if(e.type!=='diagnostics')received.push(e)},profiles);await turn();
 send({type:'capability',message:'test adapter'});assert.equal(received.length,1);
 testBackend.stop();assert.ok(aborted);send({type:'data',packet:{}});assert.equal(received.length,1);
 resolveStart(()=>{disposed++});await turn();assert.equal(disposed,1,'late initialization must release its resources');
 const lifecycleBackend=new Backend({start:({signal})=>{signal.addEventListener('abort',()=>{aborted=true});return ()=>{disposed++}}});
 lifecycleBackend.start(()=>{});await turn();lifecycleBackend.stop();assert.equal(disposed,2);
 console.log('PASS: local LAUNCH/process detection, truthful external-integration requirement, no fabricated packets, STOP/idle/disarm, abort, late-data rejection, resource disposal. Supported-adapter lifecycle uses test adapters only.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});

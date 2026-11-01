const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
async function run(){
 const signals=[],events=[];const exported={exports:{}};
 vm.runInNewContext(fs.readFileSync(require.resolve('./player-api'),'utf8'),{
  require:id=>id==='electron'?{app:{getPath:()=>'/tmp/unused-player-api-test'},safeStorage:{isEncryptionAvailable:()=>true}}:require(id),
  module:exported,AbortController,AbortSignal,Buffer,URL,setTimeout,clearTimeout,
  fetch:(_url,options)=>new Promise((_resolve,reject)=>{signals.push(options.signal);options.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});})
 });
 const api=new exported.exports();api.connection={url:'https://fixture.invalid',token:'fixture-only'};
 api.start(event=>events.push(event));assert.equal(signals.length,1);api.stop();assert.equal(signals[0].aborted,true);
 await new Promise(resolve=>setTimeout(resolve,10));assert.equal(events.length,0,'aborted work must not emit late errors or data');
 api.start(event=>events.push(event));assert.equal(signals.length,2);api.stop();assert.equal(signals[1].aborted,true);
 await assert.rejects(api.pair('http://fixture.invalid','fixture'),/HTTPS/);
 console.log('PASS: actual PlayerApi polling aborts in-flight work, rejects late callbacks, restarts once, and refuses HTTP pairing. Fetch transport is a test adapter.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});

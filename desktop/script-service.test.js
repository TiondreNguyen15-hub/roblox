const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const Service=require('./script-service');
async function main(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'blue-lua-test-')),file=path.join(root,'export.lua');
 let events=[],finish;
 const service=new Service({root:path.join(root,'library'),runner:path.join(__dirname,'lua-runner.js'),owner:()=>null,dialog:{showSaveDialog:async()=>({canceled:false,filePath:file}),showOpenDialog:async()=>({canceled:false,filePaths:[file]})},send:event=>{events.push(event);if(event.type==='result')finish?.(event);}});
 const record={name:'Test',project:'Authorized test project',authorized:true,source:'print(6*7)'};
 async function run(source){events=[];return new Promise(resolve=>{finish=resolve;service.run({...record,source});});}
 try{
  assert.throws(()=>service.run({...record,authorized:false}),/authorized/);
  assert.throws(()=>service.run({...record,project:''}),/project/);
  let result=await run('print(6*7)');assert.equal(result.ok,true);assert.equal(events.find(e=>e.type==='output').text,'42');
  result=await run('local x = 1\nerror("intentional failure")');assert.equal(result.ok,false);assert.equal(result.line,2);
  result=await run('local x =\n@');assert.equal(result.ok,false);assert.equal(result.line,2);
  result=await run('print(type(os),type(io),type(package),type(require),type(debug),type(load),type(loadfile),type(dofile),type(game),type(js),type(process))');assert.equal(result.ok,true);assert.equal(events.find(e=>e.type==='output').text,Array(11).fill('nil').join('\t'));
  result=await run('error(string.rep(\"x\",10000))');assert.equal(result.ok,false);assert.ok(result.error.length<8250);
  result=await run('while true do end');assert.equal(result.ok,false);assert.match(result.error,/instruction limit/);
  result=await run('print(string.rep("x", 2000000))');assert.equal(result.ok,false);assert.match(result.error,/size limit/);
  result=await run('error=function() end; type=function() return \"number\" end; math.max=function() return 0 end; string.rep(\"x\",2000000)');assert.equal(result.ok,false);assert.match(result.error,/size limit/);
  result=await run('for i=1,100 do print(string.rep("x",1000)) end');assert.equal(result.ok,false);assert.match(result.error,/output limit/);
  events=[];finish=null;service.run({...record,source:'while true do pcall(function() while true do end end) end'});assert.throws(()=>service.run(record),/already running/);service.stop();await new Promise(r=>setTimeout(r,100));assert.equal(service.child,null);assert.equal(events.at(-1).state,'stopped');assert.equal(events.filter(e=>e.type==='result').length,0);
  result=await run('while true do pcall(function() while true do end end) end');assert.equal(result.ok,false);assert.match(result.error,/5-second/);
  const saved=await service.save(record);assert.ok(saved.id);assert.equal(await fs.readFile(file,'utf8'),record.source);assert.equal((await service.list())[0].name,'Test');assert.equal((await service.select(saved.id)).source,record.source);assert.equal((await service.load()).source,record.source);await assert.rejects(service.select('../escape'),/identifier/);
  assert.throws(()=>service.run({...record,source:'x'.repeat(262145)}),/256 KB/);
  console.log('PASS: actual isolated Lua execution, output, syntax/runtime line numbers, denied host/Roblox capabilities, instruction/string/output/time limits, duplicate-run guard, hard STOP/late-result rejection, file save/load/library persistence, path and source validation. No Studio or live-game execution is claimed.');
 }finally{service.stop();await fs.rm(root,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

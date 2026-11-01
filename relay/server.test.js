const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {createRelay}=require('./server');
const {valid,project,box}=require('../desktop/player-data');
async function run(){
 let clock=100000;const secret=crypto.randomBytes(32).toString('hex');
 const server=createRelay({publishToken:secret,universeId:123,now:()=>clock});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const cf=[0,0,0,1,0,0,0,1,0,0,0,1];
 const player={userId:7,username:'fixture',displayName:'Fixture',position:[0,0,-10],rotation:cf.slice(3),box:[0,0,-10,...cf.slice(3)],size:[2,4,2],health:80,maxHealth:100,teamId:'Blue',joints:{Head:[0,2,-10]}};
 const packet={version:1,sequence:1,game:{universeId:123,placeId:456,jobId:'test-job'},connectedCount:1,players:[player],viewers:[{userId:7,camera:{cframe:cf,viewport:[1000,500],fov:90}}]};
 const post=(url,body,token)=>fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
 try{
  assert.equal((await post('/v1/publish',packet)).status,401);
  assert.equal((await post('/v1/publish',{...packet,game:{...packet.game,universeId:999}},secret)).status,400);
  assert.equal((await post('/v1/publish',{...packet,viewers:[{...packet.viewers[0],userId:8}]},secret)).status,400);
  assert.equal((await post('/v1/publish',{...packet,players:[{...player,position:[null,0,0]}]},secret)).status,400);
  const published=await (await post('/v1/publish',packet,secret)).json();assert.equal(published.pairCodes[7].length,16);
  assert.equal((await fetch(base+'/v1/session')).status,401);
  assert.equal((await post('/v1/pair',{code:'wrong'})).status,403);
  const paired=await (await post('/v1/pair',{code:published.pairCodes[7]})).json();assert.ok(paired.token);
  assert.equal((await post('/v1/pair',{code:published.pairCodes[7]})).status,403);
  const get=()=>fetch(base+'/v1/session',{headers:{Authorization:'Bearer '+paired.token}}).then(r=>r.json());
  let result=await get();assert.ok(valid(result));assert.equal(result.viewerUserId,7);assert.equal(result.viewers,undefined);assert.equal(result.players[0].health,80);
  assert.deepEqual(project([0,0,-10],result.camera),[500,250]);assert.equal(project([0,0,10],result.camera),null);assert.ok(box(player,result.camera));
  clock+=6000;assert.equal((await get()).status,'waiting');
  await post('/v1/publish',packet,secret);assert.equal((await get()).status,'waiting','replay cannot refresh an old packet');
  await post('/v1/publish',{...packet,sequence:2,game:{...packet.game,jobId:'new-server'}},secret);result=await get();assert.equal(result.status,'connected');assert.equal(result.game.jobId,'new-server');
  assert.equal((await fetch(base+'/v1/session',{method:'DELETE',headers:{Authorization:'Bearer '+paired.token}})).status,200);
  assert.equal((await fetch(base+'/v1/session',{headers:{Authorization:'Bearer '+paired.token}})).status,401);
  const republish=await (await post('/v1/publish',{...packet,sequence:3,game:{...packet.game,jobId:'new-server'}},secret)).json();
  const repaired=await (await post('/v1/pair',{code:republish.pairCodes[7]})).json();assert.ok(repaired.token);
  clock+=25*3600000;assert.equal((await fetch(base+'/v1/session',{headers:{Authorization:'Bearer '+repaired.token}})).status,401);
  console.log('PASS: publisher authentication, universe/viewer/schema validation, single-use pairing, private camera scope, player data, projection, stale feed, replay rejection, server reconnection, token expiration. Protocol fixtures only; no live Roblox claim.');
 }finally{await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1;});

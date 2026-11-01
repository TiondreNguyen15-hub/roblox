const http=require('node:http');
const crypto=require('node:crypto');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const finiteArray=(value,length)=>Array.isArray(value)&&value.length===length&&value.every(n=>Number.isFinite(n)&&Math.abs(n)<1e9);
function validate(packet,universeId){
 if(!packet||packet.version!==1||packet.game?.universeId!==universeId||!Number.isSafeInteger(packet.game.placeId)||typeof packet.game.jobId!=='string'||packet.game.jobId.length>100||!Number.isSafeInteger(packet.sequence)||!Array.isArray(packet.players)||packet.players.length>500||!Array.isArray(packet.viewers)||packet.viewers.length>20||!Number.isInteger(packet.connectedCount)||packet.connectedCount<0||packet.connectedCount>500)throw Error('Invalid snapshot');
 const ids=new Set();
 for(const p of packet.players){
  if(!Number.isSafeInteger(p.userId)||ids.has(p.userId)||!['username','displayName','teamId'].every(key=>typeof p[key]==='string'&&p[key].length<=100)||!finiteArray(p.position,3)||!finiteArray(p.rotation,9)||!finiteArray(p.size,3)||!finiteArray(p.box,12)||!Number.isFinite(p.health)||!Number.isFinite(p.maxHealth)||p.health<0||p.maxHealth<=0||typeof p.joints!=='object'||!p.joints||Object.keys(p.joints).length>32||!Object.entries(p.joints).every(([key,value])=>key.length<40&&finiteArray(value,3)))throw Error('Invalid player');
  ids.add(p.userId);
 }
 const viewers=new Set();
 for(const v of packet.viewers){
  if(!ids.has(v.userId)||viewers.has(v.userId)||!finiteArray(v.camera?.cframe,12)||!finiteArray(v.camera?.viewport,2)||v.camera.viewport.some(n=>n<=0||n>8192)||!Number.isFinite(v.camera.fov)||v.camera.fov<1||v.camera.fov>120)throw Error('Invalid viewer camera');
  viewers.add(v.userId);
 }
 return packet;
}
function createRelay({publishToken,universeId,now=Date.now}){
 if(typeof publishToken!=='string'||publishToken.length<32||!Number.isSafeInteger(universeId)||universeId<1)throw Error('Configure a 32+ character GAME_PUBLISH_TOKEN and ROBLOX_UNIVERSE_ID');
 const sessions=new Map(),tokens=new Map(),limits=new Map();
 const reply=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
 const authorized=req=>hash((req.headers.authorization||'').replace(/^Bearer /,''))===hash(publishToken);
 const server=http.createServer(async(req,res)=>{
  try{
   const time=now();
   for(const [key,s] of sessions)if(time-s.updated>30*60*1000)sessions.delete(key);
   for(const [key,t] of tokens)if(time-t.expires>0||!sessions.has(t.session))tokens.delete(key);
   for(const [key,l] of limits)if(time-l.start>60000)limits.delete(key);
   if(req.method==='GET'&&req.url==='/health')return reply(res,200,{ok:true});
   if(req.method==='DELETE'&&req.url==='/v1/session'){
    const key=hash((req.headers.authorization||'').replace(/^Bearer /,''));
    const token=tokens.get(key);if(!token)return reply(res,401,{error:'Unauthorized'});
    tokens.delete(key);const session=sessions.get(token.session);if(session)session.code=null;
    return reply(res,200,{ok:true});
   }
   if(req.method==='GET'&&req.url==='/v1/session'){
    const token=tokens.get(hash((req.headers.authorization||'').replace(/^Bearer /,'')));
    if(!token)return reply(res,401,{error:'Pair this device in your game again'});
    const session=sessions.get(token.session);if(!session)return reply(res,401,{error:'Session expired'});
    if(time-session.updated>5000)return reply(res,200,{status:'waiting',game:session.packet.game});
    return reply(res,200,{status:'connected',receivedAt:session.updated,viewerUserId:session.userId,...session.packet,viewers:undefined,camera:session.camera});
   }
   if(req.method!=='POST'||!['/v1/publish','/v1/pair'].includes(req.url))return reply(res,404,{error:'Not found'});
   if(req.url==='/v1/publish'&&!authorized(req))return reply(res,401,{error:'Unauthorized publisher'});
   if(req.url==='/v1/pair'){
    const key=req.socket.remoteAddress;const limit=limits.get(key)||{start:time,count:0};limit.count++;limits.set(key,limit);
    if(limit.count>10)return reply(res,429,{error:'Too many pairing attempts; wait one minute'});
   }
   let size=0;const chunks=[];
   for await(const chunk of req){size+=chunk.length;if(size>2*1024*1024){reply(res,413,{error:'Snapshot too large'});req.resume();return;}chunks.push(chunk);}
   let body;try{body=JSON.parse(Buffer.concat(chunks).toString());}catch{return reply(res,400,{error:'Invalid JSON'});}
   if(req.url==='/v1/pair'){
    if(typeof body.code!=='string'||body.code.length>32)return reply(res,400,{error:'Invalid pairing code'});
    const session=[...sessions.values()].find(s=>s.code===body.code.toUpperCase()&&s.codeExpires>time&&time-s.updated<5000);
    if(!session)return reply(res,403,{error:'Invalid or expired pairing code'});
    const token=crypto.randomBytes(32).toString('base64url');
    tokens.set(hash(token),{session:session.key,expires:time+24*3600000});session.code=null;
    return reply(res,200,{token,viewerUserId:session.userId});
   }
   try{validate(body,universeId);}catch{return reply(res,400,{error:'Invalid snapshot schema or universe'});}
   const pairCodes={};
   for(const viewer of body.viewers){
    const key=universeId+':'+viewer.userId;let session=sessions.get(key);
    if(session?.packet.game.jobId===body.game.jobId&&body.sequence<=session.packet.sequence)continue;
    if(!session){session={key,userId:viewer.userId};sessions.set(key,session);}
    const paired=[...tokens.values()].some(t=>t.session===key);
    if(!paired&&(!session.code||session.codeExpires<time)){session.code=crypto.randomBytes(8).toString('hex').toUpperCase();session.codeExpires=time+10*60000;}
    session.packet=body;session.camera=viewer.camera;session.updated=time;
    if(!paired)pairCodes[viewer.userId]=session.code;
   }
   return reply(res,200,{ok:true,pairCodes});
  }catch{if(!res.headersSent)reply(res,500,{error:'Relay request failed'});}
 });
 server.requestTimeout=10000;server.headersTimeout=10000;
 return server;
}
module.exports={createRelay,validate};
if(require.main===module){
 const server=createRelay({publishToken:process.env.GAME_PUBLISH_TOKEN,universeId:Number(process.env.ROBLOX_UNIVERSE_ID)});
 server.listen(Number(process.env.PORT)||8080,'0.0.0.0',()=>console.log('Player Data relay listening'));
}

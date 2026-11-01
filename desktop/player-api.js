const fs=require('node:fs/promises');
const path=require('node:path');
const {safeStorage,app}=require('electron');
class PlayerApi {
 constructor(){this.connection=null;this.generation=0;this.timer=null;this.abort=null;}
 file(){return path.join(app.getPath('userData'),'player-api.enc');}
 async restore(){
  if(!safeStorage.isEncryptionAvailable())return null;
  try{this.connection=JSON.parse(safeStorage.decryptString(await fs.readFile(this.file())));return {url:this.connection.url};}catch{return null;}
 }
 async pair(url,code){
  const endpoint=new URL(url);
  if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash)throw Error('Use your public HTTPS relay URL');
  if(!safeStorage.isEncryptionAvailable())throw Error('Windows credential encryption is unavailable');
  const base=endpoint.origin;
  const result=await this.request(base+'/v1/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});
  if(typeof result.token!=='string'||result.token.length<32)throw Error('Relay returned an invalid pairing response');
  this.connection={url:base,token:result.token};
  await fs.writeFile(this.file(),safeStorage.encryptString(JSON.stringify(this.connection)),{mode:0o600});
  return {url:base};
 }
 async request(url,options={}){
  const response=await fetch(url,{...options,redirect:'error',signal:options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000)});
  if(Number(response.headers.get('content-length'))>2*1024*1024)throw Error('Relay response too large');
  const reader=response.body.getReader();let size=0;const chunks=[];
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024){await reader.cancel();throw Error('Relay response too large');}chunks.push(Buffer.from(value));}
  const body=JSON.parse(Buffer.concat(chunks).toString());
  if(!response.ok)throw Error(response.status===401?'Pair this device again':body.error||'Relay request failed');
  return body;
 }
 start(send){
  this.stop();const generation=this.generation;let failures=0;
  const tick=async()=>{
   try{
    if(!this.connection)return;
    this.abort=new AbortController();
    const packet=await this.request(this.connection.url+'/v1/session',{headers:{Authorization:'Bearer '+this.connection.token},signal:this.abort.signal});
    if(generation!==this.generation)return;
    failures=0;send({type:'data',packet});
   }catch(error){if(generation!==this.generation)return;failures++;send({type:'status',message:error.message});}
   if(generation===this.generation)this.timer=setTimeout(tick,Math.min(15000,500*2**Math.min(failures,5)));
  };
  tick();
 }
 stop(){this.generation++;clearTimeout(this.timer);this.abort?.abort();this.abort=null;}
 async forget(){this.stop();const old=this.connection;this.connection=null;if(old){try{await this.request(old.url+'/v1/session',{method:'DELETE',headers:{Authorization:'Bearer '+old.token}});}catch{}}await fs.rm(this.file(),{force:true});}
}
module.exports=PlayerApi;

const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {fork}=require('node:child_process');
const validId=id=>typeof id==='string'&&/^[\da-f-]{36}$/.test(id);
const validate=source=>{if(typeof source!=='string'||Buffer.byteLength(source)>262144)throw Error('Lua source must be at most 256 KB');};
class ScriptService{
 constructor({root,runner,dialog,owner,send,forkProcess=fork}){this.root=root;this.runner=runner;this.dialog=dialog;this.owner=owner;this.send=send;this.forkProcess=forkProcess;this.child=null;this.timer=null;this.outputBytes=0;}
 async list(){await fs.mkdir(this.root,{recursive:true});const files=await fs.readdir(this.root);const result=[];for(const file of files.filter(f=>f.endsWith('.json')).slice(0,500)){try{const data=JSON.parse(await fs.readFile(path.join(this.root,file),'utf8'));if(validId(data.id)&&file===data.id+'.json')result.push({id:data.id,name:String(data.name).slice(0,100),project:String(data.project||'').slice(0,150)});}catch{}}return result.sort((a,b)=>a.name.localeCompare(b.name));}
 async select(id){if(!validId(id))throw Error('Invalid script identifier');const metadata=JSON.parse(await fs.readFile(path.join(this.root,id+'.json'),'utf8'));const source=await fs.readFile(path.join(this.root,id+'.lua'),'utf8');validate(source);return {id,name:String(metadata.name),project:String(metadata.project||''),source};}
 async load(){const choice=await this.dialog.showOpenDialog(this.owner(),{title:'Load Lua script',filters:[{name:'Lua scripts',extensions:['lua']}],properties:['openFile']});if(choice.canceled)return null;const file=choice.filePaths[0];if(path.extname(file).toLowerCase()!=='.lua')throw Error('Choose a .lua file');if((await fs.stat(file)).size>262144)throw Error('Script exceeds 256 KB');const source=await fs.readFile(file,'utf8');validate(source);return {id:null,name:path.basename(file,'.lua'),project:'',source};}
 async save(record){
  validate(record?.source);const name=String(record.name||'Untitled').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,100),project=String(record.project||'').slice(0,150);
  const choice=await this.dialog.showSaveDialog(this.owner(),{title:'Save Lua script',defaultPath:name+'.lua',filters:[{name:'Lua scripts',extensions:['lua']}]});if(choice.canceled)return null;
  const file=path.extname(choice.filePath)?choice.filePath:choice.filePath+'.lua';if(path.extname(file).toLowerCase()!=='.lua')throw Error('Save with the .lua extension');
  await fs.writeFile(file,record.source,'utf8');await fs.mkdir(this.root,{recursive:true});
  const id=validId(record.id)?record.id:crypto.randomUUID();
  await fs.writeFile(path.join(this.root,id+'.lua'),record.source,'utf8');await fs.writeFile(path.join(this.root,id+'.json'),JSON.stringify({id,name,project}),'utf8');
  return {id,name,project,source:record.source};
 }
 run(record){
  validate(record?.source);if(record.authorized!==true||typeof record.project!=='string'||!record.project.trim()||record.project.length>150)throw Error('Name your project and confirm you own or are authorized to modify it');
  if(this.child)throw Error('A script is already running. Stop it first.');
  const environment={ELECTRON_RUN_AS_NODE:'1'};if(process.env.SystemRoot)environment.SystemRoot=process.env.SystemRoot;
  const child=this.forkProcess(this.runner,[],{execArgv:['--max-old-space-size=64'],env:environment,silent:true});
  this.child=child;this.outputBytes=0;this.send({type:'state',state:'running'});
  const finish=result=>{if(this.child!==child)return;this.child=null;clearTimeout(this.timer);this.timer=null;child.kill();this.send(result);};
  this.timer=setTimeout(()=>finish({type:'result',ok:false,error:'Execution exceeded the 5-second time limit',line:null}),5000);
  child.on('message',message=>{if(this.child!==child)return;if(message?.type==='output'&&typeof message.text==='string'){this.outputBytes+=Buffer.byteLength(message.text);if(this.outputBytes>65536)finish({type:'result',ok:false,error:'Output limit exceeded',line:null});else this.send(message);}else if(message?.type==='result')finish({type:'result',ok:message.ok===true,error:typeof message.error==='string'?message.error.slice(0,8250):undefined,line:Number.isSafeInteger(message.line)&&message.line>0?message.line:null});});
  child.on('error',()=>finish({type:'result',ok:false,error:'Could not start the isolated Lua process',line:null}));
  child.on('exit',()=>finish({type:'result',ok:false,error:'Lua process exited unexpectedly or exceeded its memory limit',line:null}));
  child.stdout?.resume();child.stderr?.resume();child.send({source:record.source,name:record.name});return true;
 }
 stop(){const child=this.child;this.child=null;clearTimeout(this.timer);this.timer=null;if(child)child.kill();this.send({type:'state',state:'stopped'});}
}
module.exports=ScriptService;

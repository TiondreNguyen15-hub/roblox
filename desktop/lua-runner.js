// Isolated child process: only the Lua VM receives script source. No JS interop.
const {lua,lauxlib,lualib,to_luastring}=require('fengari');
let used=false;
process.on('message',message=>{
 if(used)return;used=true;
 const reply=result=>{if(process.connected)process.send(result,()=>process.exit(0));else process.exit(0);};
 const source=message?.source,name=String(message?.name||'script').replace(/[^\w .-]/g,'_').slice(0,80);
 if(typeof source!=='string'||Buffer.byteLength(source)>262144)return reply({type:'result',ok:false,error:'Script exceeds the 256 KB limit',line:null});
 const L=lauxlib.luaL_newstate();let output=0,instructions=0;
 try{
  for(const [name,open] of [['_G',lualib.luaopen_base],['math',lualib.luaopen_math],['string',lualib.luaopen_string],['table',lualib.luaopen_table],['utf8',lualib.luaopen_utf8]]){lauxlib.luaL_requiref(L,to_luastring(name),open,1);lua.lua_pop(L,1);}
  for(const key of ['dofile','loadfile','load','collectgarbage']){lua.lua_pushnil(L);lua.lua_setglobal(L,to_luastring(key));}
  lua.lua_getglobal(L,to_luastring('string'));lua.lua_pushnil(L);lua.lua_setfield(L,-2,to_luastring('dump'));lua.lua_pop(L,1);
  lua.lua_pushcfunction(L,state=>{
   const values=[];for(let i=1;i<=lua.lua_gettop(state);i++){lauxlib.luaL_tolstring(state,i);const bytes=lua.lua_tolstring(state,-1);if(bytes.length>8192)return lauxlib.luaL_error(state,to_luastring('print value exceeds 8 KB'));values.push(Buffer.from(bytes).toString('utf8'));lua.lua_pop(state,1);}
   const text=values.join('\t');output+=Buffer.byteLength(text);if(output>65536)return lauxlib.luaL_error(state,to_luastring('output limit exceeded (64 KB)'));
   process.send({type:'output',text});return 0;
  });lua.lua_setglobal(L,to_luastring('print'));
  // Bound common bulk string allocations before user code is loaded.
  const bootstrap=to_luastring(`local rep=string.rep
local protected,raise,kind,number=pcall,error,type,tonumber
local floor,max,matches=math.floor,math.max,string.gmatch
string.rep=function(s,n,sep)
 if kind(s)~='string' or kind(n)~='number' or n~=n or n<0 or n>1048576 or floor(n)~=n or (sep~=nil and kind(sep)~='string') or #s*n+(sep and #sep or 0)*max(0,n-1)>1048576 then raise('string.rep size limit exceeded',2) end
 local ok,value=protected(rep,s,n,sep)
 if not ok then raise(value,2) end
 return value
end
local format=string.format
string.format=function(f,...)
 if kind(f)~='string' or #f>1024 then raise('format size limit exceeded',2) end
 for width in matches(f,'%d+') do if number(width)>10000 then raise('format width limit exceeded',2) end end
 local ok,value=protected(format,f,...)
 if not ok then raise(value,2) end
 return value
end`);
  if(lauxlib.luaL_loadbufferx(L,bootstrap,bootstrap.length,to_luastring('@sandbox'),to_luastring('t'))!==lua.LUA_OK||lua.lua_pcall(L,0,0,0)!==lua.LUA_OK)throw Error('Sandbox initialization failed');
  lua.lua_sethook(L,state=>{instructions+=1000;if(instructions>1000000)lauxlib.luaL_error(state,to_luastring('instruction limit exceeded'));},lua.LUA_MASKCOUNT,1000);
  const bytes=to_luastring(source);
  let status=lauxlib.luaL_loadbufferx(L,bytes,bytes.length,to_luastring('@'+name+'.lua'),to_luastring('t'));
  if(status===lua.LUA_OK)status=lua.lua_pcall(L,0,0,0);
  if(status!==lua.LUA_OK){const raw=lua.lua_tolstring(L,-1);const error=raw?Buffer.from(raw.subarray(0,8192)).toString('utf8')+(raw.length>8192?' [error truncated]':''):'Lua execution failed';const match=/:(\d+):/.exec(error);reply({type:'result',ok:false,error,line:match?Number(match[1]):null});}
  else reply({type:'result',ok:true});
 }catch{reply({type:'result',ok:false,error:'Lua sandbox failed or exceeded its resource limits',line:null});}
 finally{lua.lua_close(L);}
});

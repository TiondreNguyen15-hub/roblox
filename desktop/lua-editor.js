(function(){
 const get=id=>document.getElementById(id),editor=get('lua-source'),paint=get('lua-highlight'),output=get('lua-output'),status=get('lua-status');
 let id=null,dirty=false,running=false,lastOutput=0,fileBusy=false;
 function update(){LuaHighlight.highlight(editor.value,paint);get('lua-lines').textContent=Array.from({length:editor.value.split('\n').length},(_,i)=>i+1).join('\n');get('lua-script-state').textContent=(dirty?'Unsaved changes':'Saved / new script')+' · Lua 5.3';paint.scrollTop=editor.scrollTop;paint.scrollLeft=editor.scrollLeft;get('lua-lines').scrollTop=editor.scrollTop;}
 function record(){return {id,name:get('lua-name').value.trim()||'Untitled',project:get('lua-project').value.trim(),source:editor.value,authorized:get('lua-authorized').checked};}
 function display(script){id=script.id;get('lua-list').value=id||'';get('lua-name').value=script.name;get('lua-project').value=script.project||'';editor.value=script.source;dirty=false;get('lua-authorized').checked=false;update();status.textContent='Loaded · local sandbox only';}
 async function confirmSwitch(){if(!dirty)return true;if(typeof window.luaScripts?.confirmDiscard!=='function')throw Error('SCRIPT_BRIDGE_OUTDATED: Fully exit the old app and open the updated download');status.textContent='Waiting for unsaved-edits confirmation…';const discard=await window.luaScripts.confirmDiscard();if(!discard)status.textContent='Cancelled · unsaved edits kept';return discard;}
 async function list(){if(!window.luaScripts)return;const selected=id,entries=await window.luaScripts.list();const select=get('lua-list');select.replaceChildren(new Option('Choose a saved script…',''));for(const entry of entries)select.add(new Option(entry.name,entry.id));select.value=selected||'';}
 function error(error){status.textContent=error.message||String(error);}
 editor.addEventListener('input',()=>{dirty=true;update();});
 for(const key of ['lua-name','lua-project'])get(key).addEventListener('input',()=>{dirty=true;update();});
 editor.addEventListener('scroll',()=>{paint.scrollTop=editor.scrollTop;paint.scrollLeft=editor.scrollLeft;get('lua-lines').scrollTop=editor.scrollTop;});
 editor.addEventListener('keydown',event=>{if(event.key==='Tab'){event.preventDefault();const start=editor.selectionStart,end=editor.selectionEnd;editor.setRangeText('    ',start,end,'end');dirty=true;update();}});
 get('lua-list').addEventListener('change',async event=>{const chosen=event.target.value;if(!chosen)return;try{if(!await confirmSwitch()){event.target.value=id||'';return;}display(await window.luaScripts.select(chosen));}catch(e){error(e);}});
 get('lua-load').addEventListener('click',async()=>{if(fileBusy)return;fileBusy=true;get('lua-load').disabled=true;try{if(typeof window.luaScripts?.load!=='function')throw Error('SCRIPT_BRIDGE_UNAVAILABLE: Open the updated desktop app to load .lua files');if(!await confirmSwitch())return;status.textContent='Opening .lua file picker…';const script=await window.luaScripts.load();if(script){display(script);editor.focus();}else status.textContent='Load cancelled · no file selected';}catch(e){error(e);}finally{fileBusy=false;get('lua-load').disabled=running;}});
 get('lua-save').addEventListener('click',async()=>{try{if(!window.luaScripts)throw Error('Open the desktop app to save files');const saved=await window.luaScripts.save(record());if(saved){const authorized=get('lua-authorized').checked;display(saved);get('lua-authorized').checked=authorized;await list();status.textContent='Saved .lua file and script library copy';}}catch(e){error(e);}});
 get('lua-new').addEventListener('click',async()=>{try{if(await confirmSwitch()){display({id:null,name:'Untitled',project:'',source:''});get('lua-list').value='';}}catch(e){error(e);}});
 get('lua-run').addEventListener('click',async()=>{if(running)return;try{if(!window.luaScripts)throw Error('Open the desktop app to run the local sandbox');output.textContent='';lastOutput=0;await window.luaScripts.run(record());}catch(e){error(e);}});
 get('lua-stop').addEventListener('click',async()=>{try{await window.luaScripts.stop();}catch(e){error(e);}});
 window.luaScripts?.onEvent(event=>{
  if(event.type==='output'){lastOutput+=event.text.length;if(lastOutput<=65536)output.textContent+=event.text+'\n';return;}
  running=event.type==='state'&&event.state==='running';get('lua-run').disabled=running;get('lua-stop').disabled=!running;editor.readOnly=running;for(const key of ['lua-load','lua-save','lua-new','lua-list','lua-name','lua-project'])get(key).disabled=running;
  if(event.type==='state')status.textContent=event.state==='running'?'Running in isolated local sandbox…':'Stopped';
  if(event.type==='result'){
   status.textContent=event.ok?'Completed in local sandbox':(event.line?'Error on line '+event.line+': ':'Error: ')+event.error;
   if(!event.ok){output.textContent+='\n'+status.textContent;if(event.line){const lines=editor.value.split('\n');let position=0;for(let i=0;i<event.line-1&&i<lines.length;i++)position+=lines[i].length+1;editor.focus();editor.setSelectionRange(position,position+(lines[event.line-1]?.length||0));}}
  }
 });
 editor.value='-- Local Lua 5.3 sandbox for authorized project logic.\n-- Roblox APIs and Luau-only syntax are not available here.\nprint("Hello from the local sandbox")\n';update();list().catch(error);
})();

"""Lua editor UI -> real ScriptService -> actual isolated Lua child processes."""
from pathlib import Path
import json,subprocess,threading
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent
bridge=r'''
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const Service=require(process.argv[1]);let events=[],service,root;
const ready=(async()=>{root=await fs.mkdtemp(path.join(os.tmpdir(),'blue-lua-ui-'));const file=path.join(root,'script.lua');service=new Service({root:path.join(root,'library'),runner:process.argv[2],owner:()=>null,dialog:{showSaveDialog:async()=>({canceled:false,filePath:file}),showOpenDialog:async()=>({canceled:false,filePaths:[file]})},send:e=>events.push(e)});})();
let queue=Promise.resolve();require('node:readline').createInterface({input:process.stdin}).on('line',line=>{queue=queue.then(async()=>{await ready;let value=null,error=null;try{const c=JSON.parse(line);if(c.action!=='events')value=await service[c.action](c.arg);}catch(e){error=e.message;}console.log(JSON.stringify({value,error,events:events.splice(0)}));});});
process.on('SIGTERM',async()=>{service?.stop();if(root)await fs.rm(root,{recursive:true,force:true});process.exit(0);});
'''
proc=subprocess.Popen(['node','-e',bridge,str(root/'script-service.js'),str(root/'lua-runner.js')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
lock=threading.Lock()
def command(value):
 with lock:
  proc.stdin.write(json.dumps(value)+'\n');proc.stdin.flush();return json.loads(proc.stdout.readline())
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1280,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.expose_binding('scriptNative',lambda source,arg:command(arg))
  page.add_init_script('''window.luaEvents=[];window.deliverLua=r=>{r.events.forEach(e=>luaEvents.forEach(f=>f(e)));if(r.error)throw new Error(r.error);return r.value};window.luaScripts={onEvent:f=>luaEvents.push(f)};for(const action of ['list','load','save','select','run','stop'])window.luaScripts[action]=arg=>scriptNative({action,arg}).then(deliverLua);setInterval(()=>scriptNative({action:'events'}).then(deliverLua),50);''')
  page.goto('http://127.0.0.1:8765');page.get_by_role('tab',name='Lua Scripts',exact=False).click()
  assert page.get_by_role('tab').count()==3
  page.locator('#lua-source').fill('local answer = 6 * 7\nprint(answer)')
  assert page.locator('#lua-highlight .lua-keyword').count()>0
  page.get_by_role('button',name='Run',exact=True).click()
  page.wait_for_function("()=>document.getElementById('lua-status').textContent.includes('authorized')")
  page.get_by_label('Authorized project name',exact=True).fill('My authorized Studio project')
  page.get_by_label('I own or am authorized to modify this project',exact=True).check()
  page.get_by_role('button',name='Run',exact=True).click()
  page.wait_for_function("()=>document.getElementById('lua-status').textContent==='Completed in local sandbox'")
  assert page.locator('#lua-output').inner_text().strip()=='42'
  page.get_by_label('Script name',exact=True).fill('First script')
  page.get_by_role('button',name='Save Script',exact=True).click()
  page.wait_for_function("()=>[...document.getElementById('lua-list').options].some(o=>o.textContent==='First script')")
  page.get_by_role('button',name='New',exact=True).click()
  page.get_by_label('Script name',exact=True).fill('Second script');page.get_by_label('Authorized project name',exact=True).fill('My project');page.locator('#lua-source').fill('print(2)')
  page.get_by_role('button',name='Save Script',exact=True).click()
  page.wait_for_function("()=>document.getElementById('lua-list').options.length===3")
  page.locator('#lua-list').select_option(label='First script')
  page.wait_for_function("()=>document.getElementById('lua-source').value.includes('local answer')")
  page.get_by_role('button',name='Load Script',exact=True).click()
  page.wait_for_function("()=>document.getElementById('lua-source').value==='print(2)'")
  assert page.locator('#lua-list').input_value()==''
  page.locator('#lua-source').fill('local value = 1\nerror("intentional")');page.get_by_label('Authorized project name',exact=True).fill('My project');page.get_by_label('I own or am authorized to modify this project',exact=True).check()
  page.get_by_role('button',name='Run',exact=True).click()
  page.wait_for_function("()=>document.getElementById('lua-status').textContent.includes('Error on line 2')")
  page.locator('#lua-source').fill('while true do pcall(function() while true do end end) end')
  page.get_by_role('button',name='Run',exact=True).click();page.get_by_role('button',name='Stop',exact=True).click()
  page.wait_for_function("()=>document.getElementById('lua-status').textContent==='Stopped'")
  assert page.get_by_role('button',name='Run',exact=True).is_enabled()
  page.screenshot(path='/workspace/Blue-Menu-Lua-Editor.png',full_page=True)
  for width in [1000,700,420]:
   page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  assert not errors,errors;browser.close()
  print('PASS: editor/highlighting, authorization gate, actual Lua Run/output, save/load dialogs and library switching, line-number error display, hard Stop, responsive layout. Dialog selections are test adapters; Lua execution and file operations are real.')
finally:proc.terminate();proc.wait(timeout=5)

"""Real local backend + SessionController through UI bindings. No player fixtures."""
from pathlib import Path
import json
import subprocess
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent
bridge=r'''
const Controller=require(process.argv[1]),Backend=require(process.argv[2]);
let events=[];const controller=new Controller({api:new Backend(),send:e=>events.push(e)});
require('node:readline').createInterface({input:process.stdin}).on('line',async line=>{
 const c=JSON.parse(line);events=[];
 if(c.action==='launch')await controller.launch(c.profiles);
 if(c.action==='stop')controller.stop();
 if(c.action==='process')controller.process({running:c.running});
 if(c.action==='configure')controller.configure(c.profiles);
 await new Promise(resolve=>setImmediate(resolve));console.log(JSON.stringify(events));
});
'''
process=subprocess.Popen(['node','-e',bridge,str(root/'session-controller.js'),str(root/'local-backend.js')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
def command(value):
 process.stdin.write(json.dumps(value)+'\n');process.stdin.flush();return json.loads(process.stdout.readline())
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.expose_binding('nativeCommand',lambda source,value:command(value))
  page.add_init_script('''window.listeners=[];window.deliver=events=>events.forEach(e=>listeners.forEach(f=>f(e)));window.system={launch:profiles=>nativeCommand({action:'launch',profiles}).then(deliver),stop:()=>nativeCommand({action:'stop'}).then(deliver),configure:profiles=>nativeCommand({action:'configure',profiles}).then(deliver),onEvent:f=>listeners.push(f)};window.gameProcess={onStatus:f=>window.processStatus=f};''')
  page.goto('http://127.0.0.1:8765')
  assert page.get_by_role('tab').count()==2
  assert page.locator('input[type=url]').count()==0
  for id in ['api-url','api-code','api-pair','api-forget']:assert page.locator('#'+id).count()==0
  page.get_by_role('button',name='LAUNCH',exact=True).click()
  page.wait_for_function("()=>document.getElementById('state-badge').textContent==='WAITING-GAME'")
  page.evaluate("async()=>{processStatus({running:true});deliver(await nativeCommand({action:'process',running:true}));}")
  page.wait_for_function("()=>document.getElementById('state-badge').textContent==='INTEGRATION-REQUIRED'")
  assert 'external' in page.locator('#system-status').inner_text()
  assert '[ROBLOX_DATA_CONNECTOR_MISSING]' in page.locator('#system-status').inner_text()
  assert 'Local IPC backend: running; Roblox data API: not implemented' in page.locator('#integration-status').inner_text()
  original=page.locator('#system-status').inner_text()
  page.evaluate('async()=>deliver(await nativeCommand({action:"launch",profiles:GameProfiles.profiles}))')
  assert page.locator('#system-status').inner_text()==original
  assert '79862723087324' in page.locator('#configured-profile-status').inner_text()
  assert 'not detected' in page.locator('#configured-profile-status').inner_text()
  assert 'Not identified' in page.locator('#game-profile-status').inner_text()
  assert '79862723087324' not in page.locator('#game-profile-status').inner_text()
  assert page.locator('#process-status').inner_text()=='Roblox detected: Yes'
  assert page.locator('#api-status').inner_text()=='Player data: Not connected'
  assert page.locator('#esp-status').inner_text()=='ESP: Inactive'
  assert 'roblox-local-data: unavailable' in page.locator('#integration-status').inner_text()
  assert page.locator('#player-visualization').is_hidden()
  assert page.locator('#radar-map').is_hidden()
  assert '0 connected' in page.locator('#player-count').inner_text()
  page.get_by_role('tab',name='Aimbot',exact=False).click()
  page.get_by_label('Enable target selection',exact=True).check()
  assert page.locator('#aim-visualization').is_hidden()
  page.get_by_role('button',name='STOP',exact=True).click()
  page.wait_for_function("()=>document.getElementById('state-badge').textContent==='IDLE'")
  assert page.get_by_role('button',name='LAUNCH',exact=True).is_enabled()
  assert page.evaluate("document.getElementById('player-visualization').width===0")
  page.evaluate("async()=>deliver(await nativeCommand({action:'process',running:true}))")
  assert page.locator('#state-badge').inner_text()=='IDLE'
  page.get_by_role('button',name='LAUNCH',exact=True).click()
  page.wait_for_function("()=>document.getElementById('state-badge').textContent==='INTEGRATION-REQUIRED'")
  page.get_by_role('button',name='STOP',exact=True).click()
  page.wait_for_function("()=>document.getElementById('state-badge').textContent==='IDLE'")
  assert not errors,errors;browser.close()
  print('PASS: real local backend UI LAUNCH/STOP/relaunch, process wait, truthful Roblox capability failure, no pairing/relay controls, no player data or connected status fabricated, ESP/Aimbot retained, buffers released. OS process events are test inputs; no live Roblox access claimed.')
finally:process.terminate();process.wait(timeout=5)

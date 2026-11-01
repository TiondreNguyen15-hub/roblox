"""Browser UI + actual SessionController workflow; API/process adapters are fixtures."""
from pathlib import Path
import json
import subprocess
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent
bridge = r'''
const Controller=require(process.argv[1]);
let events=[],callback;
const api={connection:{},restore:async()=>({}),start:f=>{callback=f},stop:()=>{}};
const controller=new Controller({api,send:event=>events.push(event)});
require('node:readline').createInterface({input:process.stdin}).on('line',async line=>{
 try{events=[];const command=JSON.parse(line);
 if(command.action==='launch')await controller.launch(command.profiles);
 if(command.action==='stop')controller.stop();
 if(command.action==='configure')controller.configure(command.profiles);
 if(command.action==='process')controller.process({running:command.running});
 if(command.action==='data'&&callback)callback({type:'data',packet:command.packet});
 if(command.action==='fail'&&callback)callback({type:'status',message:'Fixture API unavailable'});
 console.log(JSON.stringify(events));
 }catch(error){console.log(JSON.stringify([{type:'state',state:'error',armed:false,message:error.message}]))}
});
'''
process = subprocess.Popen(['node', '-e', bridge, str(root / 'session-controller.js')], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
def command(value):
    process.stdin.write(json.dumps(value)+'\n');process.stdin.flush()
    return json.loads(process.stdout.readline())
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1280,'height':900});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.expose_binding('testNative',lambda source,value:command(value))
  page.add_init_script('''window.listeners=[];window.deliver=events=>events.forEach(e=>listeners.forEach(f=>f(e)));
  window.system={launch:profiles=>testNative({action:'launch',profiles}).then(deliver),stop:()=>testNative({action:'stop'}).then(deliver),configure:profiles=>testNative({action:'configure',profiles}).then(deliver),onEvent:f=>listeners.push(f)};
  window.gameProcess={onStatus:f=>window.processStatus=f};''')
  page.goto('http://127.0.0.1:8765')
  assert page.get_by_role('tab').count()==2
  assert page.locator('video').count()==0
  assert page.locator('#player-visualization').is_hidden()
  page.get_by_role('button',name='LAUNCH',exact=True).click()
  page.wait_for_function("()=>document.getElementById('state-badge').textContent==='WAITING-GAME'")
  page.evaluate("async()=>{deliver(await testNative({action:'process',running:true}));processStatus({running:true})}")
  page.wait_for_function("()=>document.getElementById('state-badge').textContent==='INITIALIZING'")
  page.evaluate('''async()=>{const cf=[0,0,0,1,0,0,0,1,0,0,0,1];window.packet={status:'connected',version:1,sequence:1,viewerUserId:7,connectedCount:2,game:{universeId:10353139110,placeId:79862723087324,jobId:'fixture',name:'Explicit Test Fixture'},camera:{cframe:cf,viewport:[1000,500],fov:90},players:[{userId:7,username:'self',displayName:'Self',teamId:'Blue',position:[0,0,0],rotation:cf.slice(3),box:cf,size:[2,4,2],health:100,maxHealth:100,joints:{}},{userId:8,username:'fixture',displayName:'Fixture Target',teamId:'Red',position:[1,0,-20],rotation:cf.slice(3),box:[1,0,-20,...cf.slice(3)],size:[2,4,2],health:80,maxHealth:100,joints:{Head:[1,2,-20],Torso:[1,0,-20]}}]};deliver(await testNative({action:'data',packet}));}''')
  page.wait_for_function("()=>!document.getElementById('player-visualization').hidden")
  assert page.locator('#radar-map').is_visible()
  assert page.locator('#esp-status').inner_text()=='ESP: Active · authorized player data'
  assert 'Game identified:' in page.locator('#game-profile-status').inner_text()
  assert 'Player data: Connected' in page.locator('#api-status').inner_text()
  page.get_by_label('Enable visualization',exact=True).uncheck()
  assert page.locator('#esp-status').inner_text()=='ESP: Disabled in settings'
  assert 'Player data: Connected' in page.locator('#api-status').inner_text()
  page.get_by_label('Enable visualization',exact=True).check()
  assert '2 connected' in page.locator('#player-count').inner_text()
  page.get_by_role('tab',name='Aimbot',exact=False).click()
  page.get_by_label('Enable target selection',exact=True).check()
  page.wait_for_function("()=>document.getElementById('target-status').textContent.includes('Fixture Target')")
  assert page.locator('#aim-visualization').is_visible()
  page.get_by_label('Enable target selection',exact=True).uncheck()
  page.wait_for_function("()=>document.getElementById('target-status').textContent==='Target selection disabled'")
  page.get_by_role('tab',name='ESP',exact=False).click()
  page.screenshot(path='/workspace/Blue-Menu-Two-Tabs.png',full_page=True)
  page.evaluate("async()=>{deliver(await testNative({action:'fail'}))}")
  assert page.locator('#player-visualization').is_hidden()
  assert 'unavailable' in page.locator('#system-status').inner_text()
  page.evaluate("async()=>{packet.sequence++;deliver(await testNative({action:'data',packet}))}")
  page.wait_for_function("()=>!document.getElementById('player-visualization').hidden")
  page.evaluate("async()=>{packet.game.placeId=999;deliver(await testNative({action:'data',packet}))}")
  assert 'Unsupported' in page.locator('#system-status').inner_text()
  assert page.locator('#player-visualization').is_hidden()
  page.evaluate("async()=>{packet.game.placeId=79862723087324;packet.game.jobId='rejoin';deliver(await testNative({action:'data',packet}))}")
  page.wait_for_function("()=>!document.getElementById('player-visualization').hidden")
  page.evaluate("async()=>deliver(await testNative({action:'process',running:false}))")
  assert page.locator('#player-visualization').is_hidden()
  page.evaluate("async()=>{deliver(await testNative({action:'process',running:true}));deliver(await testNative({action:'data',packet}));}")
  page.wait_for_function("()=>!document.getElementById('player-visualization').hidden")
  page.get_by_role('button',name='STOP',exact=True).click()
  page.wait_for_function("()=>document.getElementById('state-badge').textContent==='IDLE'")
  assert page.locator('#player-visualization').is_hidden()
  assert page.locator('#radar-map').is_hidden()
  assert page.evaluate('document.getElementById("player-visualization").width===0 && document.getElementById("radar-map").width===0')
  assert page.get_by_role('button',name='LAUNCH',exact=True).is_enabled()
  assert page.get_by_role('button',name='STOP',exact=True).is_disabled()
  page.evaluate("async()=>deliver(await testNative({action:'data',packet}))")
  assert page.locator('#player-visualization').is_hidden()
  for width in [1000,700,420]:
   page.set_viewport_size({'width':width,'height':820})
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  assert not errors,errors
  browser.close()
  print('PASS: two-tab UI + actual backend controller: LAUNCH, detect, profile/data init, ESP/radar, target enable/disable, API failure/recovery, unsupported game, switch/rejoin, exit/reopen, STOP, late data rejection, responsive widths. Process/API data are fixtures; native/live verification remains pending.')
finally:
 process.terminate();process.wait(timeout=5)

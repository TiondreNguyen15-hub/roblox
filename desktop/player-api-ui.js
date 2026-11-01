// Additive integration: existing capture/Aim controls remain until a valid game feed exists.
const apiStatus=document.getElementById('api-status');
const apiCanvas=document.getElementById('player-visualization');
const apiContext=apiCanvas.getContext('2d');
let livePacket=null,lastPacketAt=0,lastIdentity='',apiFrame=0;
const getToggle=id=>document.getElementById(id).checked;
function clearPlayerFeed(message){
 window.GameProfiles?.waiting();
 livePacket=null;apiCanvas.hidden=true;apiContext.clearRect(0,0,apiCanvas.width,apiCanvas.height);
 document.querySelector('#esp .preview').hidden=false;
 apiStatus.textContent=message;
}
function receiveApi(event){
 if(event.type!=='data'){clearPlayerFeed(event.message||'Reconnecting to game…');return;}
 if(event.packet?.status==='waiting'){clearPlayerFeed('Paired · waiting for your published game');return;}
 if(!PlayerData.valid(event.packet)){clearPlayerFeed('Invalid Player Data API response; existing ESP preserved');return;}
 if(window.GameProfiles&&!GameProfiles.identify(event.packet)){livePacket=null;apiCanvas.hidden=true;document.querySelector('#esp .preview').hidden=false;apiStatus.textContent='Waiting for matching Game Profile';return;}
 const p=event.packet,identity=p.game.jobId+':'+p.sequence;
 if(identity!==lastIdentity){lastIdentity=identity;lastPacketAt=performance.now();}
 livePacket=p;apiCanvas.hidden=false;document.querySelector('#esp .preview').hidden=true;
 apiStatus.textContent=`Connected · Place ${p.game.placeId} · ${p.connectedCount} players · viewer ${p.viewerUserId}`;
}
const skeletonLinks=[['Head','UpperTorso'],['UpperTorso','LowerTorso'],['UpperTorso','LeftUpperArm'],['LeftUpperArm','LeftLowerArm'],['LeftLowerArm','LeftHand'],['UpperTorso','RightUpperArm'],['RightUpperArm','RightLowerArm'],['RightLowerArm','RightHand'],['LowerTorso','LeftUpperLeg'],['LeftUpperLeg','LeftLowerLeg'],['LeftLowerLeg','LeftFoot'],['LowerTorso','RightUpperLeg'],['RightUpperLeg','RightLowerLeg'],['RightLowerLeg','RightFoot'],['Head','Torso'],['Torso','Left Arm'],['Torso','Right Arm'],['Torso','Left Leg'],['Torso','Right Leg']];
function renderPlayerFeed(time){
 requestAnimationFrame(renderPlayerFeed);
 if(time-apiFrame<1000/30)return;apiFrame=time;
 if(!livePacket)return;
 if(time-lastPacketAt>5000){clearPlayerFeed('Game feed stale · reconnecting');return;}
 if(document.getElementById('esp').hidden)return;
 const packet=livePacket,cam=packet.camera;
 apiCanvas.width=Math.min(1200,cam.viewport[0]);apiCanvas.height=Math.round(apiCanvas.width*cam.viewport[1]/cam.viewport[0]);
 const scale=apiCanvas.width/cam.viewport[0];apiContext.scale(scale,scale);
 apiContext.strokeStyle='#2788ff';apiContext.fillStyle='#a9d3ff';apiContext.lineWidth=2/scale;apiContext.font=`${12/scale}px Segoe UI`;
 const viewer=packet.players.find(p=>p.userId===packet.viewerUserId),origin=viewer?.position||cam.cframe.slice(0,3);
 const enemies=packet.players.filter(p=>p.userId!==packet.viewerUserId);
 for(const p of enemies){
  const bounds=PlayerData.box(p,cam);
  if(bounds){
   const [x,y,x2,y2]=bounds;
   if(getToggle('boxes'))apiContext.strokeRect(x,y,x2-x,y2-y);
   const labels=[];
   if(getToggle('names'))labels.push(p.displayName+' (@'+p.username+')');
   if(getToggle('distance'))labels.push(Math.round(Math.hypot(...p.position.map((n,i)=>n-origin[i])))+' studs');
   if(getToggle('api-team'))labels.push('Team '+p.teamId);
   apiContext.fillText(labels.join(' · '),x,Math.max(16/scale,y-7/scale));
   if(getToggle('api-health')){apiContext.fillStyle='#243347';apiContext.fillRect(x-6/scale,y,3/scale,y2-y);apiContext.fillStyle='#70e8ac';const health=Math.max(0,Math.min(1,p.health/p.maxHealth));apiContext.fillRect(x-6/scale,y2-(y2-y)*health,3/scale,(y2-y)*health);apiContext.fillText(`${Math.round(p.health)}/${Math.round(p.maxHealth)}`,x,y2+14/scale);apiContext.fillStyle='#a9d3ff';}
  }
  if(getToggle('api-skeleton'))for(const [a,b] of skeletonLinks){if(!p.joints[a]||!p.joints[b])continue;const first=PlayerData.project(p.joints[a],cam),last=PlayerData.project(p.joints[b],cam);if(first&&last){apiContext.beginPath();apiContext.moveTo(...first);apiContext.lineTo(...last);apiContext.stroke();}}
 }
 if(getToggle('api-radar')){
  const size=150/scale,x=12/scale,y=cam.viewport[1]-size-12/scale,range=Number(document.getElementById('api-radar-range').value)||300;
  apiContext.fillStyle='#0b1828';apiContext.fillRect(x,y,size,size);apiContext.strokeRect(x,y,size,size);apiContext.fillStyle='#ffffff';apiContext.fillRect(x+size/2-2/scale,y+size/2-2/scale,4/scale,4/scale);
  const c=cam.cframe,right=[c[3],c[9]],forward=[-c[5],-c[11]];
  const rightLength=Math.hypot(...right)||1,forwardLength=Math.hypot(...forward)||1;
  apiContext.fillStyle='#2788ff';for(const p of enemies){const dx=p.position[0]-origin[0],dz=p.position[2]-origin[2];if(Math.hypot(dx,dz)>range)continue;const rx=(dx*right[0]+dz*right[1])/rightLength,ry=-(dx*forward[0]+dz*forward[1])/forwardLength;apiContext.fillRect(x+size/2+rx/range*(size/2-5/scale)-2/scale,y+size/2+ry/range*(size/2-5/scale)-2/scale,4/scale,4/scale);}
 }
}
requestAnimationFrame(renderPlayerFeed);
document.getElementById('api-pair').addEventListener('click',async()=>{
 apiStatus.textContent='Pairing with your game…';
 try{if(!window.playerApi)throw Error('Open the Windows app to pair');await window.playerApi.pair(document.getElementById('api-url').value,document.getElementById('api-code').value.trim());document.getElementById('api-code').value='';}
 catch(error){apiStatus.textContent=error.message;}
});
document.getElementById('api-forget').addEventListener('click',async()=>{try{await window.playerApi?.forget();clearPlayerFeed('Disconnected · pair to reconnect');}catch{apiStatus.textContent='Could not remove saved pairing';}});
for(const id of ['api-health','api-team','api-skeleton','api-radar','api-radar-range']){
 const input=document.getElementById(id);try{const value=localStorage.getItem(id);if(value!==null){if(input.type==='checkbox')input.checked=value==='true';else input.value=value;}}catch{}
 input.addEventListener('input',()=>{try{localStorage.setItem(id,input.type==='checkbox'?String(input.checked):input.value);}catch{}});
}
window.playerApi?.onEvent(receiveApi);
window.playerApi?.restore().then(result=>{if(result)document.getElementById('api-url').value=result.url;}).catch(()=>{apiStatus.textContent='Could not restore pairing; pair again';});

window.addEventListener('roblox-exit',()=>clearPlayerFeed('Roblox closed · disconnected'));

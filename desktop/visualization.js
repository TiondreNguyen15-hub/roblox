(function(root){
 const links=[['Head','UpperTorso'],['UpperTorso','LowerTorso'],['UpperTorso','LeftUpperArm'],['LeftUpperArm','LeftLowerArm'],['LeftLowerArm','LeftHand'],['UpperTorso','RightUpperArm'],['RightUpperArm','RightLowerArm'],['RightLowerArm','RightHand'],['LowerTorso','LeftUpperLeg'],['LeftUpperLeg','LeftLowerLeg'],['LeftLowerLeg','LeftFoot'],['LowerTorso','RightUpperLeg'],['RightUpperLeg','RightLowerLeg'],['RightLowerLeg','RightFoot'],['Head','Torso'],['Torso','Left Arm'],['Torso','Right Arm'],['Torso','Left Leg'],['Torso','Right Leg']];
 class Visualization{
  constructor(settings,tab,onStale){this.settings=settings;this.tab=tab;this.onStale=onStale;this.packet=null;this.animation=null;this.identity='';this.updated=0;this.lastDraw=0;}
  update(packet){const identity=packet.game.jobId+':'+packet.sequence;if(identity!==this.identity){this.updated=performance.now();this.identity=identity;}this.packet=packet;if(this.animation===null)this.animation=requestAnimationFrame(t=>this.frame(t));}
  stop(){if(this.animation!==null)cancelAnimationFrame(this.animation);this.animation=null;this.packet=null;this.identity='';document.querySelector('#esp-empty h3').textContent='Waiting for your game';document.getElementById('radar-empty').textContent='Positions appear after an authorized connection.';for(const id of ['player-visualization','aim-visualization','radar-map']){const canvas=document.getElementById(id);canvas.width=0;canvas.height=0;canvas.hidden=true;}for(const id of ['esp-empty','aim-empty','radar-empty'])document.getElementById(id).hidden=false;document.getElementById('target-status').textContent='No active authorized target';}
  frame(time){
   if(!this.packet){this.animation=null;return;}
   if(time-this.updated>5000){this.stop();this.onStale();return;}
   this.animation=requestAnimationFrame(t=>this.frame(t));if(time-this.lastDraw<1000/30)return;this.lastDraw=time;
   const packet=this.packet,settings=this.settings(),target=TargetSelection.select(packet,settings.aim);
   document.getElementById('target-status').textContent=!settings.aim.enabled?'Target selection disabled':target?`${target.player.displayName} (@${target.player.username}) · ${Math.round(target.distance)} studs · HP ${Math.round(target.player.health)}/${Math.round(target.player.maxHealth)}`:'No eligible target inside the selection circle';
   if(this.tab()==='esp'){this.drawPlayers(packet,settings);this.drawMap(packet,settings);}else if(this.tab()==='aim')this.drawAim(packet,settings,target);
  }
  prepare(id,packet){const canvas=document.getElementById(id);canvas.hidden=false;canvas.width=Math.min(1200,packet.camera.viewport[0]);canvas.height=Math.max(1,Math.round(canvas.width*packet.camera.viewport[1]/packet.camera.viewport[0]));const context=canvas.getContext('2d'),backingScale=canvas.width/packet.camera.viewport[0],scale=(canvas.clientWidth||canvas.width)/packet.camera.viewport[0];context.scale(backingScale,backingScale);context.strokeStyle=this.settings().color;context.fillStyle='#b6d7ff';context.lineWidth=2/scale;context.font=`${12/scale}px Segoe UI`;return {context,scale};}
  drawPlayers(packet,s){
   document.querySelector('#esp-empty h3').textContent=s.enabled?'Waiting for your game':'ESP visualization disabled';document.getElementById('esp-empty').hidden=s.enabled;document.getElementById('player-visualization').hidden=!s.enabled;if(!s.enabled)return;
   const {context:c,scale}=this.prepare('player-visualization',packet),viewer=packet.players.find(p=>p.userId===packet.viewerUserId),origin=viewer?.position||packet.camera.cframe.slice(0,3);
   for(const p of packet.players){if(p.userId===packet.viewerUserId)continue;const bounds=PlayerData.box(p,packet.camera);
    if(bounds){const [x,y,x2,y2]=bounds;if(s.boxes)c.strokeRect(x,y,x2-x,y2-y);const text=[];if(s.names)text.push(p.displayName+' (@'+p.username+')');if(s.distance)text.push(Math.round(Math.hypot(...p.position.map((n,i)=>n-origin[i])))+' studs');if(s.team)text.push('Team '+p.teamId);if(text.length)c.fillText(text.join(' · '),x,Math.max(16/scale,y-7/scale));if(s.health){const ratio=Math.max(0,Math.min(1,p.health/p.maxHealth));c.fillStyle='#233448';c.fillRect(x-7/scale,y,3/scale,y2-y);c.fillStyle='#70e8ac';c.fillRect(x-7/scale,y2-(y2-y)*ratio,3/scale,(y2-y)*ratio);c.fillText(`${Math.round(p.health)}/${Math.round(p.maxHealth)}`,x,y2+14/scale);c.fillStyle='#b6d7ff';}}
    if(s.skeleton)for(const [a,b] of links){if(!p.joints[a]||!p.joints[b])continue;const first=PlayerData.project(p.joints[a],packet.camera),last=PlayerData.project(p.joints[b],packet.camera);if(first&&last){c.beginPath();c.moveTo(...first);c.lineTo(...last);c.stroke();}}
   }
  }
  drawMap(packet,s){
   document.getElementById('radar-empty').textContent=!s.enabled?'ESP visualization disabled':!s.radar?'Radar is disabled':'Positions appear after an authorized connection.';const canvas=document.getElementById('radar-map');canvas.hidden=!s.enabled||!s.radar;document.getElementById('radar-empty').hidden=s.enabled&&s.radar;if(canvas.hidden)return;
   canvas.width=600;canvas.height=260;const c=canvas.getContext('2d'),cx=300,cy=130,range=s.radarRange,unit=110/range;
   c.strokeStyle='#20344c';c.lineWidth=1;for(let x=0;x<600;x+=30){c.beginPath();c.moveTo(x,0);c.lineTo(x,260);c.stroke();}for(let y=10;y<260;y+=30){c.beginPath();c.moveTo(0,y);c.lineTo(600,y);c.stroke();}c.beginPath();c.arc(cx,cy,110,0,Math.PI*2);c.stroke();
   const viewer=packet.players.find(p=>p.userId===packet.viewerUserId),origin=viewer?.position||packet.camera.cframe.slice(0,3),cf=packet.camera.cframe;
   let right=[1,0],forward=[0,-1];if(s.mapMode==='camera'){right=[cf[3],cf[9]];forward=[-cf[5],-cf[11]];const length=Math.hypot(...forward);if(length>.001){forward=forward.map(n=>n/length);right=[-forward[1],forward[0]];}else{right=[1,0];forward=[0,-1];}}
   c.fillStyle='#fff';c.beginPath();c.arc(cx,cy,4,0,Math.PI*2);c.fill();c.font='11px Segoe UI';
   for(const p of packet.players){if(p.userId===packet.viewerUserId)continue;const dx=p.position[0]-origin[0],dz=p.position[2]-origin[2];if(Math.hypot(dx,dz)>range)continue;const x=cx+(dx*right[0]+dz*right[1])*unit,y=cy-(dx*forward[0]+dz*forward[1])*unit;c.fillStyle=s.color;c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill();if(s.names){c.fillStyle='#a9bdd5';c.fillText(p.displayName,x+7,y-5);}}
   c.fillStyle='#7896b9';c.fillText(`${range} studs · ${s.mapMode==='north'?'World −Z up':'Camera forward up'}`,12,20);
  }
  drawAim(packet,s,target){document.getElementById('aim-empty').hidden=true;const {context:c}=this.prepare('aim-visualization',packet),[w,h]=packet.camera.viewport,cx=w/2,cy=h/2;if(s.aim.circle){c.beginPath();c.arc(cx,cy,s.aim.diameter/2,0,Math.PI*2);c.stroke();}if(s.aim.crosshair){c.beginPath();c.moveTo(cx-7,cy);c.lineTo(cx+7,cy);c.moveTo(cx,cy-7);c.lineTo(cx,cy+7);c.stroke();}if(target){c.strokeStyle='#70ffd0';c.beginPath();c.arc(...target.point,9,0,Math.PI*2);c.moveTo(cx,cy);c.lineTo(...target.point);c.stroke();c.fillText(target.player.displayName,target.point[0]+14,target.point[1]-10);}}
 }
 root.Visualization=Visualization;
})(globalThis);

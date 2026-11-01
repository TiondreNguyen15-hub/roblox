(function(root){
 function select(packet,settings){
  if(!settings.enabled)return null;
  const viewer=packet.players.find(p=>p.userId===packet.viewerUserId);
  const origin=viewer?.position||packet.camera.cframe.slice(0,3),center=packet.camera.viewport.map(n=>n/2);
  const candidates=[];
  for(const player of packet.players){
   if(player.userId===packet.viewerUserId||player.health<=0)continue;
   if(settings.excludeTeam&&viewer&&viewer.teamId!=='Neutral'&&viewer.teamId===player.teamId)continue;
   const distance=Math.hypot(...player.position.map((n,i)=>n-origin[i]));if(distance>settings.maxDistance)continue;
   const point=settings.point==='head'?(player.joints.Head||player.position):player.position;
   const projected=root.PlayerData.project(point,packet.camera);if(!projected)continue;
   if(projected[0]<0||projected[1]<0||projected[0]>packet.camera.viewport[0]||projected[1]>packet.camera.viewport[1])continue;
   const screenDistance=Math.hypot(projected[0]-center[0],projected[1]-center[1]);if(screenDistance>settings.diameter/2)continue;
   candidates.push({player,point:projected,distance,score:settings.priority==='health'?player.health/player.maxHealth:settings.priority==='distance'?distance:screenDistance});
  }
  candidates.sort((a,b)=>a.score-b.score||a.player.userId-b.player.userId);
  return candidates[0]||null;
 }
 root.TargetSelection={select};if(typeof module!=='undefined')module.exports={select};
})(globalThis);

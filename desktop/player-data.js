(function(root){
 const array=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite);
 function valid(packet){
  return !!(packet&&packet.status==='connected'&&packet.version===1&&Number.isSafeInteger(packet.sequence)&&Number.isSafeInteger(packet.viewerUserId)&&Number.isInteger(packet.connectedCount)&&packet.connectedCount>=0&&Number.isSafeInteger(packet.game?.universeId)&&Number.isSafeInteger(packet.game?.placeId)&&typeof packet.game?.jobId==='string'&&array(packet.camera?.cframe,12)&&array(packet.camera?.viewport,2)&&packet.camera.viewport.every(n=>n>0&&n<=8192)&&packet.camera.fov>=1&&packet.camera.fov<=120&&Array.isArray(packet.players)&&packet.players.length<=500&&packet.players.every(p=>Number.isSafeInteger(p.userId)&&typeof p.username==='string'&&typeof p.displayName==='string'&&typeof p.teamId==='string'&&array(p.position,3)&&array(p.rotation,9)&&array(p.box,12)&&array(p.size,3)&&p.size.every(n=>n>=0)&&Number.isFinite(p.health)&&p.health>=0&&Number.isFinite(p.maxHealth)&&p.maxHealth>0&&p.joints&&typeof p.joints==='object'&&Object.keys(p.joints).length<=32&&Object.values(p.joints).every(v=>array(v,3))));
 }
 function project(point,camera){
  const c=camera.cframe,d=point.map((n,i)=>n-c[i]);
  const x=c[3]*d[0]+c[6]*d[1]+c[9]*d[2],y=c[4]*d[0]+c[7]*d[1]+c[10]*d[2],z=c[5]*d[0]+c[8]*d[1]+c[11]*d[2];
  if(z>=-0.1)return null;
  const focal=camera.viewport[1]/(2*Math.tan(camera.fov*Math.PI/360));
  return [camera.viewport[0]/2+x*focal/-z,camera.viewport[1]/2-y*focal/-z];
 }
 function box(player,camera){
  const points=[],b=player.box;
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
   const local=[x*player.size[0]/2,y*player.size[1]/2,z*player.size[2]/2];
   const world=[b[0]+b[3]*local[0]+b[4]*local[1]+b[5]*local[2],b[1]+b[6]*local[0]+b[7]*local[1]+b[8]*local[2],b[2]+b[9]*local[0]+b[10]*local[1]+b[11]*local[2]];
   const point=project(world,camera);if(!point)return null;points.push(point);
  }
  const min=[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1]))],max=[Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
  if(max[0]<0||max[1]<0||min[0]>camera.viewport[0]||min[1]>camera.viewport[1])return null;
  return [Math.max(0,min[0]),Math.max(0,min[1]),Math.min(camera.viewport[0],max[0]),Math.min(camera.viewport[1],max[1])];
 }
 const api={valid,project,box};root.PlayerData=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);

(function(root){
 const profiles=[{id:'roblox-main',placeId:79862723087324,label:'My Roblox Game',defaults:{}}];
 try{const saved=JSON.parse(localStorage.getItem('game-profile-config'));if(Number.isSafeInteger(saved?.placeId)&&saved.placeId>0){profiles[0].placeId=saved.placeId;profiles[0].label=String(saved.label||'My Roblox Game').slice(0,80);}}catch{}
 document.getElementById('profile-place').value=profiles[0].placeId;document.getElementById('profile-label').value=profiles[0].label;
 let active=null,processState=null;
 const status=()=>document.getElementById('game-profile-status');
 const controls=['boxes','names','distance','aim-marker','crosshair-toggle','circle-toggle','circle-size','api-health','api-team','api-skeleton','api-radar','api-radar-range'];
 function apply(profile){
  let values=profile.defaults;try{values=JSON.parse(localStorage.getItem('game-profile-'+profile.id))||values;}catch{}
  for(const id of controls){const input=document.getElementById(id);if(!input||!(id in values))continue;if(input.type==='checkbox'&&typeof values[id]==='boolean')input.checked=values[id];else if(input.type!=='checkbox'&&Number.isFinite(Number(values[id])))input.value=String(values[id]);input.dispatchEvent(new Event('input'));}
 }
 function identify(packet){
  if(processState===false){waiting();return false;}
  const profile=profiles.find(p=>p.placeId===packet.game.placeId);
  const name=typeof packet.game.name==='string'?packet.game.name:'Name unavailable';
  if(!profile){active=null;status().textContent=`Unmatched game · ${name} · Place ${packet.game.placeId}`;return false;}
  if(active!==profile.id){apply(profile);active=profile.id;}
  status().textContent=`Connected · ${name} · Place ${packet.game.placeId} · ${profile.label}`;
  return true;
 }
 function waiting(){active=null;status().textContent=processState===true?'Roblox running · waiting for authorized Place ID':processState===false?'Roblox not running · disconnected':'Waiting for Roblox and an authorized game connection';}
 root.GameProfiles={profiles,identify,waiting};
 document.getElementById('configure-game-profile').addEventListener('click',()=>{const placeId=Number(document.getElementById('profile-place').value);if(!Number.isSafeInteger(placeId)||placeId<1){status().textContent='Enter a valid numeric Place ID';return;}profiles[0].placeId=placeId;profiles[0].label=document.getElementById('profile-label').value.trim().slice(0,80)||'My Roblox Game';active=null;try{localStorage.setItem('game-profile-config',JSON.stringify(profiles[0]));status().textContent='Configured Place '+placeId+' · waiting for authorized game';}catch{status().textContent='Could not save profile';}});
 document.getElementById('save-game-profile').addEventListener('click',()=>{
  const profile=profiles.find(p=>p.id===active);
  if(!profile){status().textContent='Connect to the configured game before saving its settings';return;}
  const values={};for(const id of controls){const input=document.getElementById(id);if(input)values[id]=input.type==='checkbox'?input.checked:input.value;}
  try{localStorage.setItem('game-profile-'+profile.id,JSON.stringify(values));status().textContent='Saved settings for Place '+profile.placeId;}catch{status().textContent='Could not save game settings';}
 });
 window.gameProcess?.onStatus(value=>{processState=value.running;if(active&&value.running!==false)return;if(value.running===false){active=null;window.dispatchEvent(new Event('roblox-exit'));}waiting();});
 waiting();
})(globalThis);

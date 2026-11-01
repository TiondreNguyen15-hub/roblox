(function(root){
 const profiles=[{id:'roblox-main',placeId:79862723087324,label:'My Roblox Game'}];
 try{const saved=JSON.parse(localStorage.getItem('game-profile-config'));if(Number.isSafeInteger(saved?.placeId)&&saved.placeId>0){profiles[0].placeId=saved.placeId;profiles[0].label=String(saved.label||profiles[0].label).slice(0,80);}}catch{}
 root.GameProfiles={profiles,
  save(placeId,label){if(!Number.isSafeInteger(placeId)||placeId<1)throw Error('Enter a valid numeric Place ID');profiles[0].placeId=placeId;profiles[0].label=label.slice(0,80)||'My Roblox Game';localStorage.setItem('game-profile-config',JSON.stringify(profiles[0]));},
  settings(id){try{const value=JSON.parse(localStorage.getItem('game-profile-'+id));return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}},
  saveSettings(id,values){localStorage.setItem('game-profile-'+id,JSON.stringify(values));}
 };
})(globalThis);

const views=['home','play','settings','credits','esp','aim'];
const headings={esp:['ESP','Customize your visual preview.'],aim:['AIM','Customize your crosshair preview.'],home:['BLUE MENU','Ready when you are.'],play:['DASHBOARD','Choose a window. Set up your preview.'],settings:['SETTINGS','Make yourself comfortable.'],credits:['CREDITS','Thanks for stopping by.']};
function show(name){
  const workspace=name!=='home'&&name!=='credits';
  document.getElementById('sidebar').hidden=!workspace;
  document.getElementById('app-shell').classList.toggle('workspace',workspace);
  document.querySelectorAll('#sidebar nav [data-view]').forEach(button=>{if(button.dataset.view===name)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
  for(const id of views)document.getElementById(id).hidden=id!==name;
  document.getElementById('title').textContent=headings[name][0];
  document.getElementById('subtitle').textContent=headings[name][1];
  document.getElementById(name).querySelector('button, input').focus();
}
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>show(button.dataset.view)));
const motion=document.getElementById('motion');
try{motion.checked=localStorage.getItem('reduceMotion')==='true';}catch{}
document.body.classList.toggle('reduced',motion.checked);
motion.addEventListener('change',()=>{document.body.classList.toggle('reduced',motion.checked);try{localStorage.setItem('reduceMotion',String(motion.checked));}catch{}});
function updatePreview(){
 document.getElementById('target').style.borderColor=document.getElementById('boxes').checked?'#2788ff':'transparent';
 document.getElementById('target-name').hidden=!document.getElementById('names').checked;
 document.getElementById('target-distance').hidden=!document.getElementById('distance').checked;
 document.getElementById('crosshair').hidden=!document.getElementById('crosshair-toggle').checked;
 const circle=document.getElementById('aim-circle');
 circle.hidden=!document.getElementById('circle-toggle').checked;
 const size=document.getElementById('circle-size').value;
 circle.style.width=circle.style.height=size+'px';
 document.getElementById('size-value').textContent=size+' px';
}
for(const id of ['boxes','names','distance','crosshair-toggle','circle-toggle','circle-size','aim-marker']){
 const input=document.getElementById(id);
 try{const saved=localStorage.getItem('preview-'+id);if(saved!==null){if(input.type==='checkbox')input.checked=saved==='true';else input.value=saved;}}catch{}
 input.addEventListener('input',()=>{updatePreview();try{localStorage.setItem('preview-'+id,input.type==='checkbox'?String(input.checked):input.value);}catch{}});
}
updatePreview();
let captureStream=null;
let capturedSource=null;
let captureBusy=false;
const picker=document.getElementById('picker');
const captureStatus=document.getElementById('capture-status');
const video=document.getElementById('capture-video');
function stopCapture(){
 disconnectDetection();
 window.capture?.stopOverlay?.();capturedSource=null;
 if(captureStream){captureStream.getTracks().forEach(track=>track.stop());captureStream=null;}
 video.srcObject=null;
 document.getElementById('capture-display').hidden=true;
 document.getElementById('capture-empty').hidden=false;
 captureStatus.textContent='Capture stopped.';
}
async function captureWindow(source){
 if(captureBusy)return;
 captureBusy=true;
 document.getElementById('choose-app').disabled=true;
 stopCapture();
 captureStatus.textContent='Opening '+source.name+'…';
 let pendingStream=null;
 try{
  pendingStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{mandatory:{chromeMediaSource:'desktop',chromeMediaSourceId:source.id}}});
  captureStream=pendingStream;video.srcObject=captureStream;
  await video.play();
  captureStream.getVideoTracks()[0].addEventListener('ended',stopCapture,{once:true});
  picker.hidden=true;document.getElementById('capture-display').hidden=false;document.getElementById('capture-empty').hidden=true;
  captureStatus.textContent='Capturing '+source.name+'. Detection starts automatically.';
  capturedSource=source;
  await startScreenOverlay();
  connectDetection();
 }catch(error){
  if(pendingStream)pendingStream.getTracks().forEach(track=>track.stop());
  captureStream=null;video.srcObject=null;
  captureStatus.textContent='Could not capture this window. It may have closed or capture permission was denied. Choose a window again.';
 }finally{captureBusy=false;document.getElementById('choose-app').disabled=false;}
}
async function listWindows(){
 picker.hidden=false;
 const list=document.getElementById('app-list');list.replaceChildren();
 const refresh=document.getElementById('refresh-apps');refresh.disabled=true;
 captureStatus.textContent='Looking for open application windows…';
 try{
  if(!window.capture)throw new Error('Desktop app required');
  const sources=await window.capture.listWindows();
  for(const source of sources){
   const button=document.createElement('button');button.textContent=source.name;
   button.addEventListener('click',()=>captureWindow(source));list.append(button);
  }
  captureStatus.textContent=sources.length?'Select the application you want to capture.':'No application windows found. Open an application and refresh.';
 }catch(error){captureStatus.textContent='Window listing is unavailable. Open the Windows desktop app and try again.';}
 finally{refresh.disabled=false;}
}
 document.getElementById('choose-app').addEventListener('click',listWindows);
 document.querySelectorAll('.start-capture').forEach(button=>button.addEventListener('click',listWindows));
 document.getElementById('refresh-apps').addEventListener('click',listWindows);
 document.getElementById('cancel-picker').addEventListener('click',()=>{picker.hidden=true;});
 document.getElementById('stop-capture').addEventListener('click',stopCapture);
 window.addEventListener('beforeunload',stopCapture);
 document.querySelectorAll('[data-view="home"]').forEach(button=>button.addEventListener('click',()=>{stopCapture();picker.hidden=true;}));
 const detectionStatus=document.getElementById('detection-status');
const connectButton=document.getElementById('connect-detection');
const overlay=document.getElementById('detection-overlay');
const context=overlay.getContext('2d');
let detector=null, modelLoading=null, detectionActive=false, detectionTimer=null, detectionGeneration=0;
function clearDetections(){context.clearRect(0,0,overlay.width,overlay.height);window.capture?.updateOverlay?.(null);}
function disconnectDetection(){
 detectionActive=false;detectionGeneration++;clearTimeout(detectionTimer);clearDetections();
 connectButton.textContent='CONNECT DETECTION';connectButton.disabled=false;
 detectionStatus.textContent='Detection disconnected.';
}
async function loadDetector(){
 if(detector)return detector;
 if(!modelLoading){
  modelLoading=(async()=>{
   if(!window.ort||!window.RobloxDetector)throw new Error('Missing ONNX runtime');
   return RobloxDetector.load();
  })().then(model=>{detector=model;return model;}).finally(()=>{modelLoading=null;});
 }
 return modelLoading;
}
async function detectFrame(generation){
 if(!detectionActive||generation!==detectionGeneration||!captureStream)return;
 try{
  if(video.readyState>=2 && video.videoWidth){
   const predictions=await detector.detect(video);
   if(!detectionActive||generation!==detectionGeneration)return;
   overlay.width=video.videoWidth;overlay.height=video.videoHeight;
   const people=predictions.filter(prediction=>prediction.score>=0.55);
   context.strokeStyle='#2788ff';context.fillStyle='#2788ff';
   context.lineWidth=Math.max(2,overlay.width/500);context.font=`${Math.max(14,overlay.width/65)}px Arial`;
   if(document.getElementById('boxes').checked){
    for(const person of people){
     const [x,y,width,height]=person.bbox;
     context.strokeRect(x,y,width,height);
     if(document.getElementById('names').checked)context.fillText('Enemy '+Math.round(person.score*100)+'%',Math.max(0,x),Math.max(18,y-5));
    }
   }
   const radius=Number(document.getElementById('circle-size').value)/2;
   const center=[video.videoWidth/2,video.videoHeight/2];
   let target=null,nearest=Infinity;
   if(document.getElementById('aim-marker').checked){
    for(const person of people){const [x,y,w,h]=person.bbox;const point=[x+w/2,y+h/2];const distance=Math.hypot(point[0]-center[0],point[1]-center[1]);if(distance<=radius&&distance<nearest){target=point;nearest=distance;}}
   }
   if(document.getElementById('circle-toggle').checked){context.beginPath();context.arc(center[0],center[1],radius,0,Math.PI*2);context.stroke();}
   if(document.getElementById('crosshair-toggle').checked){context.beginPath();context.moveTo(center[0]-7,center[1]);context.lineTo(center[0]+7,center[1]);context.moveTo(center[0],center[1]-7);context.lineTo(center[0],center[1]+7);context.stroke();}
   if(target){context.strokeStyle='#70ffd0';context.beginPath();context.arc(target[0],target[1],8,0,Math.PI*2);context.moveTo(center[0],center[1]);context.lineTo(target[0],target[1]);context.stroke();}
   window.capture?.updateOverlay?.({boxes:document.getElementById('boxes').checked?people.map(person=>({score:person.score,bbox:[person.bbox[0]/video.videoWidth,person.bbox[1]/video.videoHeight,person.bbox[2]/video.videoWidth,person.bbox[3]/video.videoHeight]})):[],labels:document.getElementById('names').checked,crosshair:document.getElementById('crosshair-toggle').checked,circle:document.getElementById('circle-toggle').checked,radius:radius/Math.min(video.videoWidth,video.videoHeight),target:target?[target[0]/video.videoWidth,target[1]/video.videoHeight]:null});
   detectionStatus.textContent=people.length+' detection'+(people.length===1?'':'s')+' · '+(target?'Target marked':'No target in circle');
  }
  if(detectionActive&&generation===detectionGeneration)detectionTimer=setTimeout(()=>detectFrame(generation),160);
 }catch(error){
  if(generation!==detectionGeneration)return;
  disconnectDetection();detectionStatus.textContent='Detection failed. Try reconnecting or selecting a different window.';
 }
}
async function connectDetection(){
 if(detectionActive||connectButton.textContent==='CANCEL CONNECTION'){disconnectDetection();return;}
 if(!captureStream){detectionStatus.textContent='Start a capture before connecting detection.';return;}
 const generation=++detectionGeneration;
 connectButton.textContent='CANCEL CONNECTION';
 detectionStatus.textContent='Loading your bundled ONNX model…';
 try{
  await loadDetector();
  if(generation!==detectionGeneration||!captureStream)return;
  detectionActive=true;connectButton.textContent='DISCONNECT DETECTION';
  detectionStatus.textContent='Detection connected. Looking for model targets…';
  detectFrame(generation);
 }catch(error){
  if(generation!==detectionGeneration)return;
  disconnectDetection();detectionStatus.textContent='Could not load the bundled model. Check the app files or download the app again.';
 }
}
connectButton.addEventListener('click',connectDetection);
const networkState=document.getElementById('network-state');
networkState.textContent='Offline model ready';
async function startScreenOverlay(){
 const status=document.getElementById('overlay-status');
 if(!document.getElementById('screen-overlay').checked||!capturedSource){window.capture?.stopOverlay?.();return;}
 try{const result=await window.capture?.startOverlay?.(capturedSource.id);status.textContent=result?.message||'Screen overlay is available in the Windows desktop app.';}
 catch{status.textContent='Overlay could not start. Capture preview is still available.';}
}
document.getElementById('screen-overlay').addEventListener('change',startScreenOverlay);
window.capture?.onOverlayStatus?.(message=>{document.getElementById('overlay-status').textContent=message;});
 document.addEventListener('keydown'   ,event=>{if(event.key==='Escape'){if(!picker.hidden){picker.hidden=true;return;}const inTools=!document.getElementById('esp').hidden||!document.getElementById('aim').hidden;if(!inTools)stopCapture();show(inTools?'play':'home');}});

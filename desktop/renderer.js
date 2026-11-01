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
for(const id of ['boxes','names','distance','crosshair-toggle','circle-toggle','circle-size']){
 const input=document.getElementById(id);
 try{const saved=localStorage.getItem('preview-'+id);if(saved!==null){if(input.type==='checkbox')input.checked=saved==='true';else input.value=saved;}}catch{}
 input.addEventListener('input',()=>{updatePreview();try{localStorage.setItem('preview-'+id,input.type==='checkbox'?String(input.checked):input.value);}catch{}});
}
updatePreview();
let captureStream=null;
let captureBusy=false;
const picker=document.getElementById('picker');
const captureStatus=document.getElementById('capture-status');
const video=document.getElementById('capture-video');
function stopCapture(){
 disconnectDetection();
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
  captureStatus.textContent='Capturing '+source.name+'. Ready to connect visible-person detection.';
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
function clearDetections(){context.clearRect(0,0,overlay.width,overlay.height);}
function disconnectDetection(){
 detectionActive=false;detectionGeneration++;clearTimeout(detectionTimer);clearDetections();
 connectButton.textContent='CONNECT DETECTION';connectButton.disabled=false;
 detectionStatus.textContent='Detection disconnected.';
}
async function loadDetector(){
 if(detector)return detector;
 if(!modelLoading){
  modelLoading=(async()=>{
   if(!window.tf||!window.cocoSsd)throw new Error('Missing detector libraries');
   await tf.ready();
   return cocoSsd.load({base:'lite_mobilenet_v2'});
  })().then(model=>{detector=model;return model;}).finally(()=>{modelLoading=null;});
 }
 return modelLoading;
}
async function detectFrame(generation){
 if(!detectionActive||generation!==detectionGeneration||!captureStream)return;
 try{
  if(video.readyState>=2 && video.videoWidth){
   const predictions=await detector.detect(video,20,0.55);
   if(!detectionActive||generation!==detectionGeneration)return;
   overlay.width=video.videoWidth;overlay.height=video.videoHeight;
   const people=predictions.filter(prediction=>prediction.class==='person'&&prediction.score>=0.55);
   context.strokeStyle='#2788ff';context.fillStyle='#2788ff';
   context.lineWidth=Math.max(2,overlay.width/500);context.font=`${Math.max(14,overlay.width/65)}px Arial`;
   if(document.getElementById('boxes').checked){
    for(const person of people){
     const [x,y,width,height]=person.bbox;
     context.strokeRect(x,y,width,height);
     if(document.getElementById('names').checked)context.fillText('Person '+Math.round(person.score*100)+'%',Math.max(0,x),Math.max(18,y-5));
    }
   }
   detectionStatus.textContent=people.length+' visible person'+(people.length===1?'':'s')+' detected. Demo distance is not applied to capture.';
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
 if(!navigator.onLine&&!detector){detectionStatus.textContent='You appear offline. Reconnect to the internet, then retry.';return;}
 const generation=++detectionGeneration;
 connectButton.textContent='CANCEL CONNECTION';
 detectionStatus.textContent='Loading detection model. Internet is required for the first connection…';
 try{
  await loadDetector();
  if(generation!==detectionGeneration||!captureStream)return;
  detectionActive=true;connectButton.textContent='DISCONNECT DETECTION';
  detectionStatus.textContent='Detection connected. Looking for visible people…';
  detectFrame(generation);
 }catch(error){
  if(generation!==detectionGeneration)return;
  disconnectDetection();detectionStatus.textContent='Could not load the model. Check internet access to storage.googleapis.com and try again.';
 }
}
connectButton.addEventListener('click',connectDetection);
const networkState=document.getElementById('network-state');
function updateNetwork(){networkState.textContent=navigator.onLine?'Internet available':'Offline';networkState.classList.toggle('offline',!navigator.onLine);}
window.addEventListener('online',updateNetwork);window.addEventListener('offline',updateNetwork);updateNetwork();
 document.addEventListener('keydown'   ,event=>{if(event.key==='Escape'){if(!picker.hidden){picker.hidden=true;return;}const inTools=!document.getElementById('esp').hidden||!document.getElementById('aim').hidden;if(!inTools)stopCapture();show(inTools?'play':'home');}});

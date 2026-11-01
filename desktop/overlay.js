const canvas=document.getElementById('overlay');
const context=canvas.getContext('2d');
let lastFrame=null;
function draw(frame){
 lastFrame=frame;canvas.width=innerWidth;canvas.height=innerHeight;
 context.clearRect(0,0,canvas.width,canvas.height);
 if(!frame)return;
 context.strokeStyle='#2788ff';context.fillStyle='#8bc4ff';context.lineWidth=2;context.font='12px Segoe UI';
 for(const box of frame.boxes){
  const [x,y,w,h]=box.bbox;context.strokeRect(x*innerWidth,y*innerHeight,w*innerWidth,h*innerHeight);
  if(frame.labels)context.fillText('Enemy '+Math.round(box.score*100)+'%',x*innerWidth,Math.max(14,y*innerHeight-5));
 }
 const cx=innerWidth/2,cy=innerHeight/2;
 if(frame.circle){context.beginPath();context.arc(cx,cy,frame.radius*Math.min(innerWidth,innerHeight),0,Math.PI*2);context.stroke();}
 if(frame.crosshair){context.beginPath();context.moveTo(cx-7,cy);context.lineTo(cx+7,cy);context.moveTo(cx,cy-7);context.lineTo(cx,cy+7);context.stroke();}
 if(frame.target){
  const x=frame.target[0]*innerWidth,y=frame.target[1]*innerHeight;
  context.strokeStyle='#70ffd0';context.beginPath();context.arc(x,y,8,0,Math.PI*2);context.moveTo(cx,cy);context.lineTo(x,y);context.stroke();
 }
}
window.capture.onOverlayFrame(draw);
window.addEventListener('resize',()=>draw(lastFrame));

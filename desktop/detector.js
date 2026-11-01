(function(root) {
  function decode(data, count, width, height, transform, threshold = 0.55) {
    const boxes = [];
    for (let i = 0; i < count; i++) {
      const score = data[4 * count + i];
      if (!Number.isFinite(score) || score < threshold) continue;
      const cx = data[i], cy = data[count + i], bw = data[2 * count + i], bh = data[3 * count + i];
      if (![cx, cy, bw, bh].every(Number.isFinite) || bw <= 0 || bh <= 0) continue;
      const x1 = Math.max(0, Math.min(width, (cx - bw / 2 - transform.x) / transform.scaleX));
      const y1 = Math.max(0, Math.min(height, (cy - bh / 2 - transform.y) / transform.scaleY));
      const x2 = Math.max(0, Math.min(width, (cx + bw / 2 - transform.x) / transform.scaleX));
      const y2 = Math.max(0, Math.min(height, (cy + bh / 2 - transform.y) / transform.scaleY));
      if (x2 > x1 && y2 > y1) boxes.push({ class: 'Enemy', score, bbox: [x1, y1, x2 - x1, y2 - y1] });
    }
    boxes.sort((a,b) => b.score - a.score);
    const selected = [];
    for (const box of boxes) {
      if (selected.every(other => {
        const a=box.bbox,b=other.bbox;
        const intersection=Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0])) * Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]));
        return intersection / (a[2]*a[3]+b[2]*b[3]-intersection) <= 0.45;
      })) selected.push(box);
      if (selected.length === 50) break;
    }
    return selected;
  }
  class RobloxDetector {
    static async load() {
      ort.env.wasm.wasmPaths = new URL('vendor/', location.href).href;
      ort.env.wasm.numThreads = 1;
      const session = await ort.InferenceSession.create('models/roblox.onnx', {executionProviders:['wasm']});
      return new RobloxDetector(session);
    }
    constructor(session) {
      this.session=session;
      this.canvas=document.createElement('canvas');
      this.canvas.width=this.canvas.height=640;
      this.context=this.canvas.getContext('2d',{willReadFrequently:true});
    }
    async detect(video) {
      const width=video.videoWidth,height=video.videoHeight;
      const scale=Math.min(640/width,640/height);
      const dw=Math.round(width*scale),dh=Math.round(height*scale);
      const x=Math.floor((640-dw)/2),y=Math.floor((640-dh)/2);
      this.context.fillStyle='rgb(114,114,114)';this.context.fillRect(0,0,640,640);
      this.context.drawImage(video,0,0,width,height,x,y,dw,dh);
      const pixels=this.context.getImageData(0,0,640,640).data;
      const plane=640*640,input=new Float32Array(plane*3);
      for(let i=0;i<plane;i++){input[i]=pixels[i*4]/255;input[plane+i]=pixels[i*4+1]/255;input[plane*2+i]=pixels[i*4+2]/255;}
      const tensor=new ort.Tensor('float32',input,[1,3,640,640]);
      let outputs;
      try {
        outputs=await this.session.run({images:tensor});
        const output=outputs.output0;
        if(output.dims.length!==3||output.dims[1]!==5)throw new Error('Unsupported model output');
        return decode(output.data,output.dims[2],width,height,{x,y,scaleX:dw/width,scaleY:dh/height});
      } finally {
        tensor.dispose();
        if(outputs)for(const output of Object.values(outputs))output.dispose();
      }
    }
  }
  root.RobloxDetector=RobloxDetector;
  if(typeof module!=='undefined')module.exports={decode};
})(globalThis);

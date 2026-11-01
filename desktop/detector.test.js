const test=require('node:test');
const assert=require('node:assert/strict');
const {decode}=require('./detector');
test('unletterboxes a wide capture and suppresses duplicate detections',()=>{
 const data=new Float32Array([320,322,320,322,100,100,100,100,.9,.8]);
 const result=decode(data,2,1280,720,{x:0,y:140,scaleX:.5,scaleY:.5});
 assert.equal(result.length,1);assert.deepEqual(result[0].bbox,[540,260,200,200]);
});
test('filters low confidence, malformed boxes and padding-only detections',()=>{
 const data=new Float32Array([320,320,320,320,320,10,100,-10,100,100,100,100,.1,.9,.9]);
 assert.deepEqual(decode(data,3,1280,720,{x:0,y:140,scaleX:.5,scaleY:.5}),[]);
});
test('clips detections to capture bounds',()=>{
 const result=decode(new Float32Array([5,5,30,30,.9]),1,640,640,{x:0,y:0,scaleX:1,scaleY:1});
 assert.deepEqual(result[0].bbox,[0,0,20,20]);
});

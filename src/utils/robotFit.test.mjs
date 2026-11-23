import {test} from 'node:test';import assert from 'node:assert/strict';
import {alphaBounds,fitRobot,ROBOT_PULSE_SCALE} from './robotFit.mjs';
function picture(w,h,box){const data=new Uint8ClampedArray(w*h*4);for(let y=box.y0;y<=box.y1;y++)for(let x=box.x0;x<=box.x1;x++)data[(y*w+x)*4+3]=255;return data;}
const close=(a,b)=>Math.abs(a-b)<1e-9;
test('visible bounds ignore transparent margins and faint alpha',()=>{
 const data=picture(100,100,{x0:20,x1:79,y0:10,y1:89});data[3]=10;
 assert.deepEqual(alphaBounds(data,100,100),{left:.2,top:.1,width:.6,height:.8});
 assert.deepEqual(alphaBounds(new Uint8ClampedArray(100*100*4),100,100),{left:0,top:0,width:1,height:1});
 assert.deepEqual(alphaBounds(new Uint8ClampedArray(8),100,100),{left:0,top:0,width:1,height:1});
});
test('robot visible height equals the three-button block and stays centred',()=>{
 const bounds={left:.2,top:.1,width:.6,height:.8},fit=fitRobot(bounds,150,300);
 assert.ok(close(fit.size*bounds.height,150));assert.ok(close(fit.dx,0));assert.ok(close(fit.dy,0));assert.ok(close(fit.ox,50));assert.ok(close(fit.oy,50));
 assert.equal(fit.room,Math.ceil((ROBOT_PULSE_SCALE-1)/2*150)+6);
 const off=fitRobot({left:.1,top:.2,width:.5,height:.5},100,1000);
 assert.ok(close(off.size,200));assert.ok(close(off.dx,30));assert.ok(close(off.dy,10));assert.ok(close(off.ox,35));assert.ok(close(off.oy,45));
});
test('narrow slots reduce the robot instead of overlapping the buttons at rest',()=>{
 const bounds={left:.2,top:.1,width:.6,height:.8},fit=fitRobot(bounds,300,90);
 assert.ok(fit.size*bounds.width<=90+1e-9);assert.ok(fit.size*bounds.height<300);
 assert.ok(fitRobot(bounds,10,90).size>=48);assert.ok(fitRobot(bounds,10000,10000).size<=420);
});
test('invalid measurements fall back to a safe fit',()=>{
 const bounds={left:.2,top:.1,width:.6,height:.8};
 assert.deepEqual(fitRobot(bounds,0,100),{size:120,dx:0,dy:0,ox:50,oy:50,room:24});
 assert.deepEqual(fitRobot(bounds,100,NaN),{size:120,dx:0,dy:0,ox:50,oy:50,room:24});
 const fallback=fitRobot({left:0,top:0,width:0,height:0},100,500);
 assert.ok(close(fallback.size,100));assert.ok(close(fallback.dx,0));
});

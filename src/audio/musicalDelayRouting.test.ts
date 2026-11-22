import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyMusicalDelay,DELAY_DIVISIONS,DELAY_REPEAT_DECAY} from './musicalDelay';
const division=DELAY_DIVISIONS.findIndex(s=>s.beats===1);
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function impulse(stereo=true){const left=new Float32Array(5000);left[0]=.2;return stereo?[left,new Float32Array(left)]:[left];}
test('left start alternates even at full left pan',()=>{for(const pan of [-100,-1]){const input=impulse(),out=applyMusicalDelay(input,1000,60,division,'ping-pong',4,100,pan);for(let n=1;n<=4;n++){close(out[(n-1)%2][1000*n],.2*DELAY_REPEAT_DECAY**(n-1));close(out[n%2][1000*n],0);}close(input[0][1000],0);}});
test('right start alternates even at full right pan',()=>{for(const pan of [1,100]){const out=applyMusicalDelay(impulse(),1000,60,division,'ping-pong',4,100,pan);for(let n=1;n<=4;n++){close(out[n%2][1000*n],.2*DELAY_REPEAT_DECAY**(n-1));close(out[(n-1)%2][1000*n],0);}}});
test('center sends identical mono repeats to both channels',()=>{const out=applyMusicalDelay(impulse(),1000,60,division,'ping-pong',4,100,0);for(let n=1;n<=4;n++){close(out[0][1000*n],.2*DELAY_REPEAT_DECAY**(n-1));close(out[1][1000*n],out[0][1000*n]);}});
test('mono source becomes stereo for ping pong',()=>{const out=applyMusicalDelay(impulse(false),1000,60,division,'ping-pong',2,100,-100);assert.equal(out.length,2);close(out[0][1000],.2);close(out[1][2000],.17);});
test('off and zero wet preserve input',()=>{for(const mode of ['off','ping-pong'] as const){const input=impulse(),out=applyMusicalDelay(input,1000,60,division,mode,4,mode==='off'?100:0,-100);assert.deepEqual(out,input);}});

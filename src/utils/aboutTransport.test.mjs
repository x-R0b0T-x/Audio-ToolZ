import {test} from 'node:test';
import assert from 'node:assert/strict';
import {installSpaceTransport} from './spaceTransport.mjs';
import {setLoopActive} from './loopState.mjs';
const key=()=>({code:'Space',key:' ',preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}});
test('About space plays or loops, stops, ignores repeats and leaves dialog open',()=>{
 for(const loop of [false,true]){
  setLoopActive(loop);const listeners={},clicks=[];let playing=false;
  const buttons=['Lecture','Boucle','Stop'].map(name=>({disabled:false,textContent:name,getAttribute:()=>null,querySelector:()=>null,click(){clicks.push(name);playing=name!=='Stop';}}));
  const target={document:{querySelector:selector=>selector==='.atz-about-dialog'?{}:null,querySelectorAll:()=>buttons},addEventListener:(name,fn)=>{listeners[name]=fn;},removeEventListener:name=>{delete listeners[name];}};
  const remove=installSpaceTransport({isPlaying:()=>playing,isRecording:()=>false},target);
  listeners.keydown(key());listeners.keydown({...key(),repeat:true});assert.deepEqual(clicks,[loop?'Boucle':'Lecture']);
  listeners.keyup(key());listeners.keydown(key());assert.deepEqual(clicks,[loop?'Boucle':'Lecture','Stop']);assert.ok(target.document.querySelector('.atz-about-dialog'));
  remove();assert.deepEqual(Object.keys(listeners),[]);
 }
 setLoopActive(false);
});

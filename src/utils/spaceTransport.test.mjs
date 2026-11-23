import {test} from 'node:test';import assert from 'node:assert/strict';
import {createSpaceTransport,findTransportControl,installSpaceTransport,normalizeLabel} from './spaceTransport.mjs';
import {isLoopActive,setLoopActive} from './loopState.mjs';
function key(over={}){return Object.assign({code:'Space',key:' ',repeat:false,ctrlKey:false,altKey:false,metaKey:false,shiftKey:false,prevented:0,stopped:0,preventDefault(){this.prevented++;},stopPropagation(){},stopImmediatePropagation(){this.stopped++;}},over);}
function setup(over={}){
 const state={open:true,playing:false,recording:false,loop:false,clicks:[],...over};
 const controls=['Lecture','Boucle','Stop'].map(name=>({id:name,names:[null,name,name],disabled:false}));
 const gate=createSpaceTransport({effectOpen:()=>state.open,loopActive:()=>state.loop,recording:()=>state.recording,playing:()=>state.playing,controls:()=>controls,activate:control=>{state.clicks.push(control.id);state.playing=control.id!=='Stop';}});
 return {state,gate,controls};
}
test('shared loop state is a simple flag that survives re-rendered elements',()=>{
 assert.equal(isLoopActive(),false);setLoopActive(true);assert.equal(isLoopActive(),true);setLoopActive(0);assert.equal(isLoopActive(),false);
});
test('labels are matched exactly and disabled controls are skipped',()=>{
 assert.equal(normalizeLabel('  Lecture \n'),'lecture');
 const controls=[{names:['Stop'],disabled:true,id:1},{names:[null,'Stop'],disabled:false,id:2},{names:['Stopper la piste'],disabled:false,id:3}];
 assert.equal(findTransportControl(controls,'stop').id,2);
 assert.equal(findTransportControl([{names:['Boucle infinie'],disabled:false}],'loop').names[0],'Boucle infinie');
 assert.equal(findTransportControl([{names:['Enregistrer'],disabled:false}],'loop'),null);
 assert.equal(findTransportControl(controls,'unknown'),null);
});
test('space plays normally without a loop and stops when playing, keeping the effect window',()=>{
 const {state,gate}=setup();
 const first=key();assert.equal(gate.keydown(first),true);assert.deepEqual(state.clicks,['Lecture']);assert.ok(first.prevented>0&&first.stopped>0);
 gate.keyup(key());
 gate.keydown(key());assert.deepEqual(state.clicks,['Lecture','Stop']);assert.equal(state.playing,false);assert.equal(state.open,true);
 gate.keyup(key());
 gate.keydown(key());assert.deepEqual(state.clicks,['Lecture','Stop','Lecture']);
});
test('space plays the loop when a loop is selected and stops it afterwards',()=>{
 const {state,gate}=setup({loop:true});
 gate.keydown(key());assert.deepEqual(state.clicks,['Boucle']);gate.keyup(key());
 gate.keydown(key());assert.deepEqual(state.clicks,['Boucle','Stop']);
});
test('holding space produces a single action even with synthetic repeats',()=>{
 const {state,gate}=setup();
 gate.keydown(key());for(let n=0;n<20;n++)gate.keydown(key({repeat:true}));gate.keydown(key());
 assert.deepEqual(state.clicks,['Lecture']);
 gate.keyup(key());gate.keydown(key());assert.deepEqual(state.clicks,['Lecture','Stop']);
});
test('space never reaches a focused field or button while an effect window is open',()=>{
 const {state,gate}=setup();
 const down=key(),up=key();
 assert.equal(gate.keydown(down),true);assert.ok(down.prevented>0&&down.stopped>0);
 assert.equal(gate.keyup(up),true);assert.ok(up.prevented>0&&up.stopped>0);
 assert.equal(state.clicks.length,1);
});
test('space is left alone outside effect windows, with modifiers or while recording',()=>{
 for(const over of [{open:false},{recording:true}]){
  const {state,gate}=setup(over),e=key();assert.equal(gate.keydown(e),false);assert.equal(e.prevented,0);assert.equal(gate.keyup(key()),false);assert.deepEqual(state.clicks,[]);
 }
 const {state,gate}=setup();
 for(const mod of ['ctrlKey','altKey','metaKey','shiftKey']){const e=key({[mod]:true});assert.equal(gate.keydown(e),false);assert.equal(e.prevented,0);}
 assert.equal(gate.keydown(key({code:'Enter',key:'Enter'})),false);
 assert.deepEqual(state.clicks,[]);
});
test('a missing or disabled transport button is swallowed without side effects and blur releases the latch',()=>{
 const {state,gate,controls}=setup();
 controls[0].disabled=true;
 const e=key();assert.equal(gate.keydown(e),true);assert.ok(e.prevented>0);assert.deepEqual(state.clicks,[]);
 gate.reset();controls[0].disabled=false;gate.keydown(key());assert.deepEqual(state.clicks,['Lecture']);
});
test('the installed listeners run in the capture phase and use the shared loop state',()=>{
 const listeners={},clicks=[];
 const button=label=>({disabled:false,textContent:label,getAttribute:name=>name==='title'?label:null,click(){clicks.push(label);}});
 const target={
  addEventListener(name,fn,capture){listeners[name]={fn,capture};},
  removeEventListener(name){delete listeners[name];},
  document:{querySelector:selector=>selector==='.atz-advanced-backdrop'?{}:null,querySelectorAll:()=>[button('Lecture'),button('Boucle'),button('Stop')]},
 };
 let playing=false;
 setLoopActive(false);
 const remove=installSpaceTransport({isPlaying:()=>playing,isRecording:()=>false},target);
 assert.equal(listeners.keydown.capture,true);assert.equal(listeners.keyup.capture,true);
 const e=key();listeners.keydown.fn(e);assert.deepEqual(clicks,['Lecture']);assert.ok(e.prevented>0);
 listeners.keyup.fn(key());playing=true;listeners.keydown.fn(key());assert.deepEqual(clicks,['Lecture','Stop']);
 listeners.keyup.fn(key());playing=false;setLoopActive(true);listeners.keydown.fn(key());assert.deepEqual(clicks,['Lecture','Stop','Boucle']);
 setLoopActive(false);remove();assert.equal(Object.keys(listeners).length,0);
});

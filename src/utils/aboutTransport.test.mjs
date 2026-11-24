import {test} from 'node:test';
import assert from 'node:assert/strict';
import {installSpaceTransport} from './spaceTransport.mjs';
import {isLoopActive,setLoopActive} from './loopState.mjs';
const key=()=>({code:'Space',key:' ',preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}});
test('About Space plays or loops, pauses and resumes without Stop or closing the dialog',()=>{
 try{
  for(const loop of [false,true]){
   setLoopActive(loop);const listeners={},clicks=[],dialog={};let playing=false;
   const buttons=['Lecture','Boucle','Pause','Stop'].map(name=>({disabled:false,textContent:name,getAttribute:()=>null,querySelector:()=>null,click(){clicks.push(name);playing=name==='Lecture'||name==='Boucle';}}));
   const target={document:{querySelector:selector=>selector==='.zonyx-about-dialog'?dialog:null,querySelectorAll:selector=>{assert.equal(selector,'aside[aria-label="Fenêtre de contrôle flottante"] button');return buttons;}},addEventListener:(name,fn)=>{listeners[name]=fn;},removeEventListener:name=>{delete listeners[name];}};
   const remove=installSpaceTransport({isPlaying:()=>playing,isRecording:()=>false},target),start=loop?'Boucle':'Lecture';
   try{
    listeners.keydown(key());listeners.keydown({...key(),repeat:true});listeners.keydown(key());assert.deepEqual(clicks,[start]);
    listeners.keyup(key());listeners.keydown(key());listeners.keydown({...key(),repeat:true});assert.deepEqual(clicks,[start,'Pause']);assert.equal(playing,false);
    listeners.keyup(key());listeners.keydown(key());assert.deepEqual(clicks,[start,'Pause',start]);assert.equal(playing,true);
    listeners.blur();listeners.keydown(key());assert.deepEqual(clicks,[start,'Pause',start,'Pause']);assert.equal(playing,false);
    assert.equal(isLoopActive(),loop);assert.equal(clicks.includes('Stop'),false);assert.equal(target.document.querySelector('.zonyx-about-dialog'),dialog);
   }finally{remove();assert.deepEqual(Object.keys(listeners),[]);}
  }
 }finally{setLoopActive(false);}
});

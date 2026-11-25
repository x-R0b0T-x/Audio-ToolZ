import test from 'node:test';
import assert from 'node:assert/strict';
import {MASCOT_NAME,MASCOT_ID,renameLegacyIdentifier,rewriteMascotText,migrateMascotPreferences} from './mascotIdentity.mjs';
const words=[[65,84,88],[65,84,90],[90,48,78,89,88],[90,79,78,89,88]].map(c=>String.fromCharCode(...c));
const previous=words[1].toLowerCase();
function storage(entries=[]){const data=new Map(entries);return {data,get length(){return data.size;},key:i=>[...data.keys()][i]??null,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};}
test('canonical display and technical names',()=>{assert.equal(MASCOT_NAME,'ZØNYX');assert.equal(MASCOT_ID,'zonyx');for(const word of words)assert.equal(renameLegacyIdentifier(word),MASCOT_NAME);});
test('references, selectors and resource paths migrate consistently',()=>{assert.equal(renameLegacyIdentifier(previous+'-tutorial-hidden'),MASCOT_ID+'-tutorial-hidden');assert.equal(renameLegacyIdentifier('src/medias/'+words[1]+'Robot..png'),'src/medias/'+MASCOT_NAME+'Robot..png');assert.equal(renameLegacyIdentifier('Audio ToolZ'),'Audio ToolZ');assert.equal(renameLegacyIdentifier('formatZero'),'formatZero');});
test('encoded media payloads are not renamed',()=>{const payload='data:image/svg+xml;base64,'+'A'.repeat(160)+words[1]+'A'.repeat(160);assert.equal(rewriteMascotText(payload),payload);});
test('saved values migrate without modification',()=>{const value=JSON.stringify({title:words[1]+' sample.wav'}),s=storage([[previous+'-preferences',value]]);assert.equal(migrateMascotPreferences(s),1);assert.equal(s.getItem(MASCOT_ID+'-preferences'),value);assert.equal(s.getItem(previous+'-preferences'),null);assert.equal(migrateMascotPreferences(s),0);});
test('newer preferences win on a key collision',()=>{const s=storage([[previous+'-theme','old'],[MASCOT_ID+'-theme','new']]);migrateMascotPreferences(s);assert.equal(s.getItem(MASCOT_ID+'-theme'),'new');assert.equal(s.length,1);});
test('a failed write cannot delete the saved value',()=>{const s=storage([[previous+'-theme','saved']]);s.setItem=()=>{throw new Error('quota')};assert.throws(()=>migrateMascotPreferences(s),/quota/);assert.equal(s.getItem(previous+'-theme'),'saved');});

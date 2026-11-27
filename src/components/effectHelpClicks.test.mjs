import test from 'node:test';
import assert from 'node:assert/strict';
import {getEffectHelp} from './effectHelpClicks.mjs';
const forbiddenAddress=/(?<!\p{L})(?:\u0041\u0054\u0058|tu|toi|ton|tes)(?!\p{L})/iu;
test('Z-Clics has contextual help written in the formal register',()=>{
 const help=getEffectHelp('Z-Clics'),labels=help.topics.map(t=>t[0]);
 assert.ok(help.topics.length>7);
 assert.equal(new Set(labels).size,labels.length);
 for(const label of ['À quoi sert cet effet ?','Tolérance','Taille maximale','Repères rouges','Avant Z-Denoiser','Limites'])assert.ok(labels.includes(label),label);
 assert.doesNotMatch(JSON.stringify(help),forbiddenAddress);
});
test('the effect catalogue lists Z-Clics in alphabetical order, for every effect',()=>{
 for(const title of ['Z-Clics','Z-Reverbe','Z-Delay']){
  const text=getEffectHelp(title).topics.find(t=>t[0]==='Tous les effets')[1];
  assert.ok(text.indexOf('Z-Chorus')<text.indexOf('Z-Clics')&&text.indexOf('Z-Clics')<text.indexOf('Z-Delay'),title);
 }
});
test('other effects keep their own help',()=>{
 const labels=getEffectHelp('Z-Reverbe').topics.map(t=>t[0]);
 assert.ok(!labels.includes('Tolérance'));
});

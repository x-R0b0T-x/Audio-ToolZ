import test from 'node:test';
import assert from 'node:assert/strict';
import {getEffectHelp} from './effectHelpClicks.mjs';
const forbiddenAddress=/(?<!\p{L})(?:\u0041\u0054\u0058|tu|toi|ton|tes)(?!\p{L})/iu;
test('Pop/Clic has contextual help written in the formal register',()=>{
 const help=getEffectHelp('Pop/Clic'),labels=help.topics.map(t=>t[0]);
 assert.ok(help.topics.length>7);
 assert.equal(new Set(labels).size,labels.length);
 for(const label of ['À quoi sert cet outil ?','Sélection requise','Niveaux de nettoyage','Tolérance','Taille maximale','Repères rouges','Avant Z-Denoiser','Limites'])assert.ok(labels.includes(label),label);
 assert.ok(!labels.includes('Zone traitée'));
 assert.doesNotMatch(JSON.stringify(help),forbiddenAddress);
});
test('other effects keep their own help',()=>{
 const labels=getEffectHelp('Z-Reverbe').topics.map(t=>t[0]);
 assert.ok(!labels.includes('Niveaux de nettoyage'));
 assert.ok(labels.includes('Zone traitée'));
});

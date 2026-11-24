import test from 'node:test';
import assert from 'node:assert/strict';
import {getEffectHelp} from './effectHelpContent.mjs';
test('all current effect families have contextual help',()=>{
 for(const title of ['Z-Reverbe','Z-Delay','Égaliseur paramétrique 7 bandes','Limiteur / Compresseur','Z-Fondus','Z-Pitcher','Réduction de bruit spectrale']){
  const help=getEffectHelp(title);assert.ok(help.topics.length>7,title);
  assert.equal(new Set(help.topics.map(t=>t[0])).size,help.topics.length);
  assert.ok(help.topics.every(t=>t.length===2&&t.every(v=>typeof v==='string'&&v.length>0)));
  assert.doesNotMatch(JSON.stringify(help),/(?<!\p{L})(?:ATX|tu|toi|ton|tes)(?!\p{L})/iu);
 }
});
test('every reverb knob and preview button is documented',()=>{
 const names=getEffectHelp('Z-Reverbe').topics.map(t=>t[0]);
 for(const label of ['Taille','Décroissance','Prédélai','Diffusion','Coupe-bas','Amortissement aigu','Modulation','Vitesse de modulation','Direct','Réflexions','Réverbération','Largeur','Préécouter avec la queue','Arrêter','Appliquer','Annuler','Fermer'])assert.ok(names.includes(label),label);
});
test('each call returns an independent topic list',()=>{
 const first=getEffectHelp('Z-Reverbe');first.topics.pop();
 assert.ok(getEffectHelp('Z-Reverbe').topics.some(t=>t[0]==='Redimensionner la fenêtre d’effet'));
});

export function presentEffectHelp(title,topics){
 const base=topics.filter(([label])=>!['Fermer','Redimensionner la fenêtre d’effet','Appliquer','Annuler'].includes(label)).map(t=>[...t]);
 if(!/reverb/i.test(title.normalize('NFD').replace(/[\u0300-\u036f]/g,'')))return {title,topics:base};
 const result=base.filter(([label])=>!['Préécouter avec la queue','Arrêter'].includes(label)).map(([label,text])=>{
  if(label==='Vitesse de modulation')return ['Vitesse',text];if(label==='Amortissement aigu')return ['Amort. aigu',text];if(label==='Réflexions')return ['Réflex.',text];if(label==='Réverbération')return ['Réverb.',text];
  if(label==='Largeur')return ['Stéréo','À midi (0), vous conservez la largeur normale de la réverbération. À gauche, côté Large, vous élargissez son image ; à droite, côté Mono, vous la resserrez jusqu’au mono. Le signal Direct reste inchangé. Double-cliquez pour revenir au centre.'];
  if(['Pièce et halo violet','Cercle et halo vert'].includes(label))return ['Cercle et grille','Sur fond noir, la grille blanche sert de repère d’espace. Taille règle le diamètre du cercle vert vide. Le fond devient violet avec le signal réverbéré entendu. Avec Tempo, les kicks déjà détectés font légèrement pulser le cercle sans modifier la taille acoustique.'];return [label,text];
 });
 result.splice(2,0,['Tempo','Détectez d’abord le BPM et les kicks dans Audio ToolZ (Outils ou Ctrl+B). Tempo utilise ce résultat et ne lance aucune analyse. Masquer ensuite la grille ne désactive pas ce résultat. Activé, il synchronise le prédélai sur la division choisie et permet la pulsation visuelle sur les kicks détectés.']);return {title,topics:result};
}

export function presentEffectHelp(title,topics){
 const clean=label=>label.replace(/_/g,' ').replace(/[.·•]+$/u,'').trim();
 const base=topics.filter(([label])=>!['Fermer','Redimensionner la fenêtre d’effet','Appliquer','Annuler'].includes(label)).map(([label,text])=>[clean(label),text]);
 if(!/reverb/i.test(title.normalize('NFD').replace(/[\u0300-\u036f]/g,'')))return {title,topics:base};
 const result=base.filter(([label])=>!['Préécouter avec la queue','Arrêter'].includes(label)).map(([label,text])=>{
  if(label==='Vitesse de modulation')return ['Vitesse',text];if(label==='Amortissement aigu')return ['Amort. aigu',text];if(label==='Réflexions')return ['Réflex.',text];if(label==='Réverbération')return ['Réverb.',text];
  if(label==='Largeur')return ['Stéréo','À droite, côté Mono : 0 %. Au centre, à midi : 50 %. À fond à gauche : 100 %. Le signal Direct reste inchangé.'];
  if(['Pièce et halo violet','Cercle et halo vert'].includes(label))return ['Cercle et grille','Sur fond noir, la grille blanche sert de repère d’espace. Taille règle le diamètre du cercle vert vide. Le fond devient violet avec le signal réverbéré entendu. Avec Tempo, les kicks déjà détectés font légèrement pulser le cercle sans modifier la taille acoustique.'];return [label,text];
 });
 result.splice(2,0,['Tempo','Détectez d’abord le BPM et les kicks dans Audio ToolZ (Outils ou Ctrl+B). Tempo utilise ce résultat et ne lance aucune analyse. Masquer ensuite la grille ne désactive pas ce résultat. Activé, il synchronise le prédélai sur la division choisie et permet la pulsation visuelle sur les kicks détectés.']);return {title,topics:result.map(([label,text])=>[clean(label),text])};
}

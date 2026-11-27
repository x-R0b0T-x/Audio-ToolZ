import {getEffectHelp as baseHelp} from './effectHelpContent.mjs';
const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const clicks=[
 ['À quoi sert cet effet ?','Réparez les clics et les pops causés par la poussière et les rayures d’un disque vinyle. Z-Clics repère chaque défaut, puis reconstruit le son manquant à partir de ce qui l’entoure.'],
 ['Tolérance','Choisissez la sensibilité de la détection, de 100 % à 5000 %. Plus la valeur est basse, plus Z-Clics repère de défauts, au risque de toucher aussi des sons secs comme une caisse claire. Commencez à 1000 %, puis abaissez-la seulement si des clics restent audibles.'],
 ['Taille maximale','Choisissez la durée maximale d’un défaut réparé, de 1 à 20 ms. Un défaut plus long est considéré comme de la musique et reste intact.'],
 ['Repères rouges','Pendant la lecture, un trait rouge s’affiche à chaque clic détecté. Le tracé vert montre le son réparé et le tracé violet le son d’origine.'],
 ['Avant Z-Denoiser','Réparez d’abord les clics, puis capturez le profil de bruit : des clics dans le profil dégraderaient la réduction de bruit.'],
 ['Limites','Z-Clics repère les défauts brusques. Un souffle continu se traite avec Z-Denoiser. Écoutez toujours le résultat : les valeurs par défaut préfèrent manquer un clic plutôt que d’abîmer la musique.']
];
export function getEffectHelp(title){
 const help=baseHelp(title);
 const catalog=text=>text.replace('Z-Delay :','Z-Clics : répare les clics et pops d’un disque vinyle. Z-Delay :');
 const topics=normalize(title).includes('clic')?[...clicks,...help.topics.slice(1)]:help.topics;
 return {...help,topics:topics.map(([label,text])=>label==='Tous les effets'?[label,catalog(text)]:[label,text])};
}

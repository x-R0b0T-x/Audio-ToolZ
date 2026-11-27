import {getEffectHelp as baseHelp} from './effectHelpContent.mjs';
const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const popClick=[
 ['À quoi sert cet outil ?','Réparez les clics et les pops causés par la poussière et les rayures d’un disque vinyle. Pop/Clic repère chaque défaut, puis reconstruit le son manquant à partir de ce qui l’entoure.'],
 ['Sélection requise','Sélectionnez sur la forme d’onde la portion qui contient des pics, de 0,1 s à 60 s. Le bouton Pop/Clic reste grisé sans sélection.'],
 ['Niveaux de nettoyage','Choisissez un niveau : Prudent (2000 %), Standard (1000 %), Sensible (700 %), Fort (500 %) ou Très fort (300 %). Commencez par Standard, puis passez à un niveau plus sensible seulement si des clics restent audibles. Sous 500 %, gardez des sélections courtes : des sons secs, comme une baguette de batterie, peuvent être touchés.'],
 ['Tolérance','Réglez finement le seuil, de 100 % à 5000 %. Une valeur haute ne retient que les changements très brusques ; une valeur basse repère davantage de défauts.'],
 ['Taille maximale','Choisissez la durée maximale d’un défaut réparé, de 1 à 20 ms. Un défaut plus long est considéré comme de la musique et reste intact.'],
 ['Repères rouges','Le dessin montre votre sélection en violet et chaque clic repéré par un trait rouge. Le trait vert suit la lecture.'],
 ['Avant Z-Denoiser','Réparez d’abord les clics, puis capturez le profil de bruit : des clics dans le profil dégraderaient la réduction de bruit.'],
 ['Limites','Pop/Clic repère les défauts brusques. Un souffle continu se traite avec Z-Denoiser. Écoutez toujours le résultat avant de valider.']
];
export function getEffectHelp(title){
 const help=baseHelp(title);
 if(!normalize(title).includes('clic'))return help;
 return {...help,topics:[...popClick,...help.topics.slice(1).filter(([label])=>label!=='Zone traitée')]};
}

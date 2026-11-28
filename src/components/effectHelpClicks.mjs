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
const stereo=[
 ['À quoi sert Z-Stéréo ?','Réglez la largeur stéréo de votre son, séparément pour les graves, les médiums, les médiums aigus et les aigus. Réduisez la largeur pour resserrer le son au centre ; augmentez-la pour l’ouvrir vers les côtés. Stereoize fabrique de la largeur à partir d’un son mono ou très étroit.'],
 ['Bandes de fréquences','Le grand graphique du haut découpe le spectre en quatre zones colorées, des graves à gauche vers les aigus à droite : rose pour les graves, orange pour les médiums, vert pour les médiums aigus, bleu pour les aigus. Chaque zone a son fader de largeur dans la colonne de même couleur, juste en dessous.'],
 ['Spectre centre et côtés','Au-dessus de la ligne centrale, le spectre du centre du son (ce qui est identique à gauche et à droite). En dessous, le spectre des côtés (ce qui diffère entre gauche et droite). Plus la partie basse est haute, plus le son est large à cette fréquence. Le dessin suit la lecture.'],
 ['Croisements','Les lignes blanches verticales fixent où une bande s’arrête et où la suivante commence. Faites-les glisser à la souris, ou utilisez les flèches gauche et droite quand elles sont sélectionnées (Maj pour un pas fin). Double-clic : retour à la position d’origine. Les faders ne bougent pas.'],
 ['Faders de largeur','Montez un fader pour élargir sa bande, descendez-le pour la resserrer. Au milieu, à 0 %, la bande ne change pas. À −100 %, elle devient mono ; à +100 %, ses côtés sont deux fois plus forts. Double-clic : retour à 0 %. Maj ou molette avec Maj : réglage fin.'],
 ['Lier les bandes','Activé, les quatre faders se déplacent ensemble en gardant leur écart. Désactivé, chaque fader est indépendant.'],
 ['Conseil pour les graves','Un grave large passe mal sur de nombreux systèmes (clubs, enceintes Bluetooth, mono). Gardez les graves à 0 % ou en dessous, et réservez la largeur aux médiums aigus et aux aigus.'],
 ['Stereoize','Bouton d’activation. Éteint, il n’ajoute rien. Allumé, Z-Stéréo fabrique des côtés à partir du centre du son, ce qui élargit un fichier mono ou étroit. Il agit sur les médiums et les aigus, pas sur les graves.'],
 ['Quantité','Réglez la force de Stereoize, de 0 à 100 %. Commencez bas : une valeur élevée donne un effet très ample, mais moins naturel et moins compatible avec une écoute en mono.'],
 ['Mode I','Ajoute une copie retardée du son, placée en opposition à gauche et à droite. Le rendu est plus audible, avec une couleur proche de l’effet Haas. Réglez le retard avec Délai.'],
 ['Mode II','Étale le son avec des filtres qui le décorrèlent, sans retard perceptible. Le rendu est plus discret et plus naturel : commencez par ce mode pour un élargissement subtil.'],
 ['Délai','Disponible en mode I. Choisissez le retard de la copie, de 0,5 à 30 ms. Un retard court (2 à 8 ms) élargit en gardant un son compact ; un retard long donne un effet d’écho et peut colorer le son.'],
 ['Vectorscope','Le dessin à droite montre où se trouve le son dans l’espace stéréo, en direct pendant la lecture. Cliquez sur le nom sous le dessin pour passer d’une vue à l’autre. Double-clic sur le dessin : effacer. Les points rouges signalent un son hors phase ou saturé.'],
 ['Polaire (échantillons)','Un point par échantillon sur un demi-cercle. G est la gauche, D la droite, M le centre. Un trait vertical au centre indique un son mono. Les points entre les deux lignes diagonales indiquent un son stéréo sain ; ceux en dehors, en rouge, sont en opposition de phase et disparaissent à l’écoute en mono. Les points s’effacent lentement.'],
 ['Polaire (niveau)','Des rayons partent du centre : leur longueur indique l’énergie, leur angle la position dans l’image stéréo. Les rayons verts sont entre les lignes de sécurité, les rouges en dehors. Les rayons rétrécissent doucement.'],
 ['Lissajous','Un point par échantillon dans un cercle complet. Une ligne verticale indique un son mono ; un motif plus large que haut indique des canaux très différents, avec un risque en mono.'],
 ['Corrélation','La barre verticale à droite du vectorscope indique la ressemblance entre le canal gauche et le canal droit. +1 : canaux identiques (mono). Autour de 0 : image très large. Sous 0 : opposition de phase, avec un risque de perte de son en mono. Gardez-la au-dessus de 0.'],
 ['Historique de corrélation','Le graphique du bas dessine la corrélation au fil de la lecture : vert au-dessus de 0, rouge en dessous. Une zone rouge prolongée vous invite à réduire la largeur ou la quantité de Stereoize.'],
 ['Fichier mono','Un fichier mono n’a pas de côtés : seul Stereoize peut l’élargir. À l’application, le document devient stéréo.'],
 ['Écouter en réglant','Lancez la lecture : tous les réglages s’entendent et se voient en direct. Vérifiez aussi le résultat en mono avant de valider.']
];
const activeTopic=['Effet actif / inactif','Le bouton en haut à droite, juste avant le point d’interrogation, sert à comparer le son avec et sans l’effet. « Effet actif » (cadre vert lumineux) : vous entendez l’effet. « Effet inactif » (gris, sans lumière) : la préécoute rejoue le son d’origine, sans aucun traitement. Cliquez dessus pour passer de l’un à l’autre, même pendant la lecture. Dès que vous touchez un réglage, l’effet se réactive tout seul. Ce bouton ne modifie pas le document : Appliquer valide toujours l’effet.'];
function build(title){
 const help=baseHelp(title),name=normalize(title);
 if(name.includes('stereo'))return {...help,topics:[...stereo,...help.topics.slice(1)]};
 if(!name.includes('clic'))return help;
 return {...help,topics:[...popClick,...help.topics.slice(1).filter(([label])=>label!=='Zone traitée')]};
}
export function getEffectHelp(title){
 const help=build(title);
 return {...help,topics:[help.topics[0],activeTopic,...help.topics.slice(1)]};
}

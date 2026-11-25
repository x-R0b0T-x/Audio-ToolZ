const shared=[
 ['Appliquer','Validez le traitement pour modifier votre document audio. Vous pouvez ensuite utiliser Annuler dans le menu Édition pour revenir en arrière.'],
 ['Annuler','Fermez la fenêtre sans appliquer les réglages en cours au document.'],
 ['Fermer','Fermez la fenêtre d’effet sans valider les réglages en cours.'],
 ['Redimensionner la fenêtre d’effet','Faites glisser le triangle en bas à droite ; utilisez les flèches lorsqu’il est sélectionné pour ajuster la taille.']
];
const reverb=[
 ['Taille','Modifiez les dimensions acoustiques de la pièce et sa représentation. Une petite taille donne un espace resserré ; une grande taille espace les réflexions. Réglez séparément la Décroissance pour choisir leur durée.'],
 ['Décroissance','Choisissez en secondes la durée de décroissance de la réverbération. Augmentez-la pour une traîne plus longue ; diminuez-la pour préserver la netteté des passages rapides.'],
 ['Prédélai','Choisissez le délai en millisecondes avant l’arrivée du signal réverbéré. Augmentez-le pour séparer davantage l’attaque originale de la réverbération.'],
 ['Diffusion','Réglez la dispersion de la réverbération tardive. Augmentez-la pour modifier sa densité et sa texture ; comparez le résultat en préécoute.'],
 ['Coupe-bas','Atténuez les graves qui entrent dans la réverbération. Augmentez la fréquence pour alléger la traîne, sans filtrer le signal Direct.'],
 ['Amortissement aigu','Réglez la fréquence du filtrage aigu de la réverbération. Abaissez-la pour un rendu plus sombre et des aigus qui persistent moins longtemps.'],
 ['Modulation','Réglez la profondeur des petites variations des retards internes. Augmentez-la pour une texture plus mobile ; gardez une valeur modérée pour un espace discret.'],
 ['Vitesse de modulation','Choisissez en hertz la vitesse de ces variations. Une valeur faible donne un mouvement lent ; une valeur plus élevée accélère ce mouvement.'],
 ['Direct','Réglez le niveau du signal original dans la zone traitée. À 100 %, vous conservez son amplitude originale ; à 0 %, vous n’entendez que les composantes réverbérées activées.'],
 ['Réflexions','Réglez le niveau des premières réflexions, qui donnent une impression de proximité et de dimensions. À 0 %, vous les coupez.'],
 ['Réverbération','Réglez le niveau de la réverbération tardive. Augmentez-le pour rendre la traîne plus présente. Surveillez le dépassement de 0 dBFS lorsque vous mélangez les niveaux.'],
 ['Largeur','Réglez l’écartement stéréo du signal réverbéré. À 0 %, il est centré ; à 100 %, vous conservez sa largeur maximale prévue. Ce réglage ne modifie pas la largeur du signal Direct et n’agit pas sur une piste mono.'],
 ['Préécouter avec la queue','Écoutez la zone traitée et sa queue de réverbération sans les appliquer au document. Si vous modifiez un réglage pendant cette écoute, le rendu est recalculé puis la préécoute repart du début.'],
 ['Arrêter','Arrêtez la préécoute sans fermer la fenêtre ni appliquer l’effet.'],
 ['Queue et export','Après application, la queue se mélange à l’audio suivant sans le décaler ; le document est prolongé si nécessaire. Exportez le document entier pour tout conserver : un export limité à la sélection peut couper la queue.'],
 ['Pièce et halo violet','La géométrie suit uniquement Taille. En préécoute, le halo suit le niveau du signal réverbéré rendu à la position de lecture, puis s’éteint progressivement. Il ne suit ni le BPM ni les kicks.']
];
const delay=[
 ['Détection BPM','Analysez la piste pour obtenir un tempo utilisable par les temps musicaux du delay. Cette analyse ne change pas votre audio.'],
 ['Temps','Choisissez une division musicale par rapport au BPM détecté. Un intervalle court rapproche les répétitions ; un intervalle long les espace.'],
 ['Répétitions','Choisissez le nombre d’échos. À zéro, vous n’ajoutez aucune répétition.'],
 ['Volume de l’effet','Dosez le niveau des échos ajoutés au signal original. À zéro, vous n’ajoutez aucun écho.'],
 ['Mono','Choisissez des répétitions en mode mono. Comparez leur placement avec les modes Stéréo et Ping-pong.'],
 ['Stéréo','Choisissez le mode de répétition stéréo. Écoutez les canaux gauche et droit pour régler l’espace.'],
 ['Ping-pong','Faites alterner les répétitions entre la gauche et la droite. Choisissez leur côté de départ avec Panoramique de départ.'],
 ['Off','Désactivez le delay sans changer les autres valeurs.'],
 ['Panoramique de départ','Choisissez le placement de départ des échos : valeurs négatives à gauche, positives à droite, zéro au centre. Le signal original ne change pas de position.']
];
const eq=[
 ['Fréquence','Déplacez horizontalement un point de bande dans le graphique pour choisir la zone du spectre à traiter, des graves à gauche vers les aigus à droite.'],
 ['Gain','Réglez le fader de la bande, ou déplacez son point verticalement : une valeur positive renforce la zone, une valeur négative l’atténue. Certains types de filtre n’utilisent pas le gain.'],
 ['Largeur Q','Utilisez la molette sur un point du graphique pour modifier sa largeur Q. Un Q élevé cible une zone étroite ; un Q faible couvre une zone plus large. Maintenez Maj pour un réglage fin.'],
 ['Forme du filtre','Choisissez la forme de chaque bande : cloche pour une zone ciblée, plateau pour une extrémité du spectre, coupe-bas ou coupe-haut pour atténuer un côté du spectre.'],
 ['Pente','Choisissez la pente en dB/octave pour les formes compatibles. Une pente plus élevée rend la transition plus abrupte. La commande est désactivée pour les formes non compatibles.'],
 ['Bandes 1 à 7','Chaque bande possède ses propres réglages. Commencez par une correction modérée, puis comparez le résultat. Le spectre montre le contenu du signal et la courbe représente les corrections.']
];
const dynamics=[
 ['LIMIT','Choisissez le limiteur pour contrôler les crêtes par rapport au Plafond. Il travaille sur les crêtes d’échantillons et ne garantit pas un plafond true peak.'],
 ['COMP','Choisissez le compresseur pour réduire l’écart de niveau au-dessus du Seuil selon le Ratio, avec les temps d’Attaque et de Relâch.'],
 ['Gain','Réglez le gain d’entrée en dB. Augmentez-le pour envoyer davantage de signal dans le traitement ; surveillez la réduction de gain et la sortie.'],
 ['Plafond','Réglez le niveau maximal visé en dBFS. Abaissez-le pour garder davantage de marge sous 0 dBFS.'],
 ['Seuil','En mode COMP, choisissez à partir de quel niveau le signal doit être comprimé. Un seuil plus bas fait travailler le compresseur sur une plus grande partie du signal.'],
 ['Ratio','En mode COMP, choisissez la force de compression au-dessus du seuil. À 1:1, vous n’appliquez pas de compression par le ratio ; une valeur plus élevée réduit davantage les écarts.'],
 ['Coude','Adoucissez l’entrée en compression autour du seuil. Une valeur faible donne une transition plus franche ; une valeur élevée la rend plus progressive.'],
 ['Compens.','Compensez en dB le niveau après compression. Comparez à niveau d’écoute similaire et évitez de pousser inutilement la sortie.'],
 ['Attaque','Réglez le temps de réaction en millisecondes. Une attaque courte contrôle plus vite les transitoires ; une attaque longue en laisse davantage passer.'],
 ['Relâch.','Réglez le temps de relâchement après la réduction de gain. Un temps court réagit vite ; un temps long rend le retour au niveau normal plus lent.'],
 ['Défilement','Réglez le défilement de l’affichage du graphique. Cette commande concerne la visualisation, pas le niveau sonore.'],
 ['Graphique et réduction de gain','Comparez l’entrée et la sortie. Le violet montre la réduction de gain et la ligne verte le seuil ou le plafond. Les couleurs de niveau vous aident à repérer les passages forts.']
];
const fade=[
 ['Entrée','Augmentez progressivement le niveau du début vers la fin de la zone pour créer un fondu d’entrée.'],
 ['Sortie','Diminuez progressivement le niveau dans la zone pour créer un fondu de sortie.'],
 ['Linéaire','Choisissez une progression linéaire du gain. Observez la courbe puis écoutez le résultat.'],
 ['Exponentielle','Choisissez une progression exponentielle pour répartir différemment la variation de niveau dans le temps.'],
 ['Courbe en S','Choisissez une transition en S, plus douce aux extrémités. La longueur du fondu dépend de la zone traitée.']
];
const pitch=[
 ['Vitesse','Réglez le rapport de vitesse : 1× correspond à la vitesse originale. Une valeur supérieure accélère le passage ; une valeur inférieure le ralentit. Vérifiez la durée et la sélection après application.'],
 ['Hauteur','Réglez la transposition en demi-tons. Une valeur positive monte la tonalité ; une valeur négative la descend. Zéro conserve la hauteur demandée sans transposition.']
];
const noise=[
 ['Capturer le profil','Mémorisez un profil sur une zone contenant idéalement le bruit seul. Vous pourrez ensuite traiter une zone plus large en vous appuyant sur ce profil.'],
 ['Atténuation','Choisissez la réduction de bruit en dB. Augmentez-la progressivement ; une réduction trop forte peut altérer le signal utile.'],
 ['Profil automatique','Sans profil mémorisé, le traitement estime un profil à partir de la zone traitée. Comparez attentivement le résultat sur une prise contenant de la voix ou de la musique.']
];
const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function getEffectHelp(title){
 const name=normalize(title);
 const entries=name.includes('reverb')?reverb:name.includes('delay')?delay:name.includes('egaliseur')?eq:/limit|compress/.test(name)?dynamics:name.includes('fondu')?fade:/pitch|vitesse|hauteur/.test(name)?pitch:name.includes('bruit')?noise:[];
 return {title:String(title),topics:[['À quoi sert cet effet ?',name.includes('reverb')?'Ajoutez une impression d’espace avec des premières réflexions et une traîne. Réglez le mélange Direct / Réflexions / Réverbération en préécoute.':name.includes('delay')?'Ajoutez des échos rythmiques et choisissez leur placement. Détectez le BPM avant d’activer les répétitions musicales.':name.includes('egaliseur')?'Équilibrez le son avec sept bandes pour renforcer ou atténuer les zones utiles.':/limit|compress/.test(name)?'Contrôlez la dynamique et les crêtes. Choisissez LIMIT pour le plafond ou COMP pour une compression réglable.':name.includes('fondu')?'Adoucissez le début ou la fin de la zone avec un fondu.':/pitch|vitesse|hauteur/.test(name)?'Modifiez la vitesse ou la hauteur du passage, puis vérifiez le résultat avant de valider.':name.includes('bruit')?'Atténuez le bruit à partir d’un profil et écoutez les éventuels artefacts.':'Consultez les commandes de cette fenêtre avant de valider le traitement.'],...entries,['Zone traitée','Avec une sélection non vide, vous traitez cette zone. Sans sélection, ces effets ciblent le document entier. Vérifiez la zone avant de cliquer sur Appliquer.'],...shared]};
}

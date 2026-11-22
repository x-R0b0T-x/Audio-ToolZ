export const RELEASE_ADDITIONS = [
 "Égaliseur trois bandes de la 1.5 remplacé par un égaliseur paramétrique à sept bandes indépendantes.",
 "Réglages de fréquence, gain et largeur Q ; filtres en cloche, plateaux grave et aigu, coupe-bas, coupe-haut, passe-bande, réjecteur et désactivation de bande.",
 "Pentes de filtre sélectionnables selon le type ; courbe de réponse globale et spectre d’entrée stéréo détaillé.",
 "Points de courbe déplaçables, largeur Q à la molette et réglage fin avec Maj ; sélecteurs colorés plus contrastés.",
 "Ancien panneau de filtre remplacé par une fenêtre Limiteur / Compresseur avec modes LIMIT et COMP.",
 "Limiteur : gain d’entrée, plafond, attaque et relâchement ; compresseur : seuil, ratio, coude et compensation supplémentaires.",
 "Plafond réglable de −18 à +12 dBFS ; traitement des crêtes d’échantillons, sans garantie true peak suréchantillonnée.",
 "Graphique de sortie détaillé, réduction de gain et repères de gain et de plafond ; vitesse de défilement indépendante du tempo audio.",
 "Poignée de navigation verte dans l’aperçu inférieur : alignement sur la sélection de boucle, déplacement au clic gauche et réglage de largeur à la molette.",
 "Navigation visuelle distincte de la boucle audio : explorer un autre passage sans déplacer ses bornes ni interrompre sa lecture.",
 "Délai ping-pong corrigé : panoramique à gauche ou à droite pour choisir le premier canal ; position centrale pour des répétitions mono.",
 "Interface des effets harmonisée : fenêtres redimensionnables, boutons aux angles adoucis, potards gradués et valeurs directement modifiables.",
 "Fenêtre À propos réorganisée : robot agrandi, animation musicale, trois liens communautaires et historique défilant.",
 "Distribution Windows portable sous le nom Audio ToolZ.exe, accompagnée d’une empreinte SHA-256."
];
export const RELEASE_FIXES = [
 "Ouverture d’un effet sur un morceau arrêté sans démarrage automatique de la lecture.",
 "Préécoute et application des effets fondées sur un traitement commun ; résultats de calcul obsolètes écartés.",
 "Traitement limité à la sélection lorsqu’elle existe, avec conservation des échantillons extérieurs.",
 "Conservation du cadrage lors des changements de lecture ; redessin explicite de la poignée après une nouvelle sélection.",
 "Déplacement des points de l’égaliseur réservé au glissement volontaire ; dimensions et lisibilité adaptées au redimensionnement.",
 "Dynamique initialisée avec gain et plafond à 0 dB ; seuil du compresseur à −6 dBFS.",
 "Défilement placé à droite des commandes du limiteur, à taille identique ; regroupements visuels simplifiés et suppression de la barre de défilement des commandes.",
 "Décibels positifs affichés avec un signe + dans les réglages et les graphiques.",
 "Balance du panneau Contrôle par atténuation des canaux, sans sommation du canal opposé.",
 "Indicateur d’aimant rétabli en bas : vert fixe à l’arrêt ou en pause et halo rythmé pendant la lecture.",
 "Infobulles explicatives retirées des potards afin de ne plus masquer les valeurs pendant le réglage.",
 "Flèches du panneau Contrôle et croix internes lisibles, avec couleur verte au survol sans encadrement gênant.",
 "Suppression des fenêtres autonomes Volume/Gain et Normalisation ; volume général, gains internes et traitements par lots conservés.",
 "Nettoyage des éléments devenus inutiles et simplification de la chaîne de compilation, sans suppression des formats audio.",
 "Tests de routage ping-pong, de dynamique, de navigation, de préécoute et de commandes exécutés avant la compilation Windows.",
 "La version 1.6 conserve Tauri v2 et le décodage Symphonia de la branche 0.5 ; ces bases existaient déjà en 1.5."
];

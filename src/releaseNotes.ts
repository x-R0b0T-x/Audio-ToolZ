export const RELEASE_ADDITIONS = [
 "Égaliseur trois bandes de la 1.5 remplacé par un égaliseur paramétrique à sept bandes indépendantes.",
 "Réglages de fréquence, gain et largeur Q ; formes et pentes de filtre compatibles, spectre d’entrée et réponse globale.",
 "Fenêtre Limiteur / Compresseur avec modes LIMIT et COMP, enveloppe, plafond et réduction de gain.",
 "Limitation des crêtes d’échantillons, sans garantie true peak suréchantillonnée.",
 "Navigation dans l’aperçu indépendante de la boucle audio, avec déplacement de la poignée et réglage de largeur à la molette.",
 "Delay musical compact : temps, répétitions, volume d’effet, panoramique et sélecteur vertical Mono / Stéréo / Ping-pong / Off.",
 "Détection BPM dans le Delay, en arrière-plan, sans fermer le panneau ni modifier les réglages.",
 "À propos : robot à gauche des liens, halos vert/violet renforcés et historique défilant.",
 "Détection automatique du tempo dans À propos et pulsation du robot jusqu’à 170 %, calée sur le tempo plutôt que sur les basses ou le volume.",
 "Distribution Windows portable : Audio ToolZ.exe accompagné d’une empreinte SHA-256."
];
export const RELEASE_FIXES = [
 "Préécoute et application pendant une lecture normale, sans boucle obligatoire, sur la sélection ou le morceau entier.",
 "Le BPM sert au calcul des temps musicaux du Delay ; les autres effets ne dépendent pas de cette détection.",
 "Reprise du dernier réglage de préécoute au démarrage de la lecture ; ouvrir un effet ne démarre pas la lecture.",
 "Delay initialisé sur Off, zéro répétition, volume d’effet à zéro et panoramique au centre ; aucune durée libre en millisecondes dans l’interface finale.",
 "Ping-pong existant conservé : panoramique décentré pour choisir le premier côté ; répétitions mono identiques au centre.",
 "Crêtes d’entrée et de sortie, réduction de gain et repère de seuil distinct dans la dynamique.",
 "Clic après une boucle : reprise de lecture au point choisi, sans changement de cadrage.",
 "Potards violets, graduations et indicateurs verts, illumination au survol et pendant le réglage.",
 "Robot immobile à l’arrêt ou sans tempo exploitable ; réduction des animations respectée.",
 "Balance du panneau Contrôle par atténuation des canaux, sans sommation du canal opposé.",
 "Fenêtres autonomes Volume/Gain et Normalisation retirées ; volume général, gains internes et traitements par lots conservés.",
 "Tauri v2, Symphonia 0.5, formats audio, CUE, assemblage et enregistrement conservés depuis la 1.5.",
 "Tests audio/UI, contrôle TypeScript et vérification des médias intégrés avant compilation Windows."
];

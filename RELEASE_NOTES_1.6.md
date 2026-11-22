# Audio ToolZ v1.6

Version validée par le mainteneur le 22 novembre 2026, après essais de l’exécutable Windows issu du workflow du commit 414ae3f. Cette validation précède la fusion et la publication officielles.

## Nouveautés et améliorations depuis la 1.5

- Égaliseur paramétrique à sept bandes indépendantes : fréquence, gain, largeur Q, formes et pentes de filtre compatibles, spectre et courbe de réponse.
- Fenêtre Limiteur / Compresseur avec modes LIMIT et COMP, gain d’entrée, plafond, enveloppe et réduction de gain. Le plafond porte sur les crêtes d’échantillons ; ce n’est pas un limiteur true peak suréchantillonné.
- Navigation dans l’aperçu de la forme d’onde indépendante de la boucle, avec poignée de sélection et réglage de largeur à la molette.
- Préécoute et application des effets pendant une lecture normale, sans boucle obligatoire. Traitement de la sélection, ou du morceau entier en l’absence de sélection.
- Reprise du dernier réglage de préécoute quand la lecture démarre après l’ouverture d’un effet. Ouvrir un effet ne lance pas automatiquement la lecture.

## Delay musical

- Temps musicaux directement visibles, répétitions, volume de l’effet et panoramique de départ à 0 au centre.
- Sélecteur vertical Mono / Stéréo / Ping-pong / Off et disposition compacte des potards.
- Bouton Détection BPM dans le panneau : analyse en arrière-plan sans fermer la fenêtre ni modifier les réglages. Le BPM est nécessaire au calcul des temps musicaux du Delay, pas aux autres effets.
- Valeurs initiales : Off, zéro répétition et volume d’effet à zéro ; la détection ne change pas ces valeurs.
- L’interface ne propose pas de durée libre en millisecondes.
- Le ping-pong conserve son routage existant : panoramique décentré pour choisir le premier côté ; au centre, répétitions mono identiques sur les deux canaux. Il ne revendique pas une permutation stéréo identique à Fruity Delay 3.

## Présentation

- Esthétique Audio ToolZ violette et verte : potards gradués, indicateurs verts et illumination au survol et au réglage.
- À propos : robot à gauche, liens à droite, halos vert/violet renforcés et historique défilant.
- Détection automatique du tempo à l’ouverture d’À propos si nécessaire ; pulsation du robot jusqu’à 170 %, calée sur le tempo et non sur les basses ou le volume. Respect de la réduction des animations.
- En l’absence de tempo exploitable ou lorsque la lecture est arrêtée, le robot reste immobile. La détection reste une estimation du tempo régulier du morceau.

## Nettoyage et compatibilité

Les fenêtres autonomes Volume/Gain et Normalisation ont été retirées ; le volume général, les gains internes et les traitements par lots sont conservés. Tauri v2, Symphonia 0.5, les formats audio, l’enregistrement, les fichiers CUE et l’assemblage existaient déjà en 1.5 et restent disponibles.

## Distribution

Windows x64 portable : Audio ToolZ.exe et SHA256SUMS.txt. La chaîne vérifie les tests audio/UI, TypeScript et l’intégrité des médias avant de produire l’exécutable. Un artifact Actions n’est pas une release GitHub officielle : la fusion, le tag v1.6 et la publication sont des étapes distinctes.

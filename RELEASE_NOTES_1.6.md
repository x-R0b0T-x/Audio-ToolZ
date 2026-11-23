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

Windows x64 portable : audio tools v1.6.zip, sans fichier de contrôle séparé à télécharger. La chaîne vérifie les tests audio/UI, TypeScript et l’intégrité des médias avant de produire l’exécutable. Un artifact Actions n’est pas une release GitHub officielle : la fusion, le tag v1.6 et la publication sont des étapes distinctes.


## Finalisation du candidat v1.6

- Nom Audio ToolZ : Audio blanc, Tool vert, Z violet.
- Dernière page du didacticiel : liens Telegram, GitHub et PayPal.
- Aucun texte « Aucun fichier récent » quand la liste est vide.
- Distribution portable : ZIP contenant le dossier Audio ToolZ avec Audio ToolZ.exe, logo.ico et desktop.ini ; empreintes SHA-256 de l’exécutable et du ZIP dans le résumé de compilation.
- Delay en temps musicaux avec détection BPM, sans réglage libre en millisecondes.
- Ce candidat corrigé doit être testé avant fusion, tag et publication officiels. La validation de 414ae3f concerne la base antérieure.


## Distribution finale v1.6

Un seul fichier : `audio tools v1.6.zip`. Une extraction donne directement le dossier `Audio ToolZ` avec `Audio ToolZ.exe`, `logo.ico` et `desktop.ini`. Les empreintes SHA-256 restent dans le résumé de compilation, pas dans le téléchargement.

Accueil : illustration mix.png sans document ; Contrôle sans robot ni vumètres, analyseur conservé ; oscilloscope par défaut sans préférence, puis dernier choix mémorisé. Dernière page du didacticiel : Telegram, Github, Paypal, trois boutons égaux restant violets avec contour lumineux vert au survol. Delay en temps musicaux avec détection BPM, sans réglage libre en millisecondes.

Ce candidat nécessite une validation visuelle Windows avant fusion, tag et publication ; la validation de 414ae3f ne vaut pas validation de ces modifications.


### Dernières finitions v1.6

- Bornes de boucle saisissables au clic gauche, même pendant la lecture ; création au clic droit et suppression au double-clic conservées.
- Robot statique sur l’accueil sans document, retiré de Contrôle.
- Sélecteur de visualisation aligné à gauche sans libellé redondant ; zone de visualisation conservée.
- Particules vertes/violettes discrètes autour du titre pendant la lecture, sans synchronisation BPM/volume ; préférence de réduction des animations respectée.
- Boutons du didacticiel toujours violets ; seul le contour et son halo deviennent verts au survol.
- Tests, compilation, ZIP et rendu Windows à valider sur ce candidat.

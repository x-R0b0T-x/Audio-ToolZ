# Audio ToolZ v1.6 — Cahier des charges validé

Date de validation fonctionnelle : 22 novembre 2026.

Ce document rassemble les règles validées avec l’utilisateur. Il décrit le résultat attendu, pas un état d’implémentation ou une preuve de réussite des tests. Les dernières précisions de ce document remplacent les propositions antérieures contradictoires.

## 1. Périmètre et livraison

- Projet Windows uniquement.
- Travailler exclusivement sur la branche `v1.6-dev`.
- Ne pas modifier `main` ni `android-dev`.
- L’exécutable de test doit s’appeler exactement `Audio ToolZ.exe`.
- Aucun tag ni aucune release officielle sans accord explicite de l’utilisateur.
- Distinguer clairement les modifications préparées, envoyées au dépôt, testées et effectivement compilées. Ne pas annoncer la réussite d’une compilation sans vérification.

## 2. Fenêtre À propos

### Dimensions et disposition

- Conserver la largeur de la capture validée par l’utilisateur le 22 novembre 2026 à 11 h 01 ; ne pas réduire davantage la fenêtre.
- Agrandir légèrement le robot par rapport à cette capture, sans couper sa pulsation.
- Garder le robot à gauche et trois boutons empilés à droite.
- Centrer verticalement le robot face au bloc des trois boutons.
- Supprimer le logo texte « Audio ToolZ » au-dessus des boutons : le nom est déjà présent dans la barre de titre.

### Barre de titre et fermeture

- Afficher exactement « Audio ToolZ v1.6 » dans la barre de titre de cette fenêtre, à la place de « À propos · v1.6 dev ».
- Croix de fermeture blanche au repos et verte au survol.
- Aucun cadre ni carré vert autour de la croix de fermeture.

### Boutons et liens

Ordre, libellés et destinations :

1. « Rejoindre la communauté Telegram » — https://t.me/Audio_ToolZ
2. « Visiter le dépôt GitHub » — https://github.com/x-R0b0T-x/Audio-ToolZ
3. « Faire un don » — https://www.paypal.com/ncp/payment/GAUJE54VM28T8

- Appliquer le même halo défilant vert et violet aux trois boutons, et pas seulement à Telegram.
- Conserver un contour lumineux vert au survol des trois boutons.
- Les trois liens doivent fonctionner dans l’application Windows.

### Robot et pulsation

- Conserver le comportement de pulsation pendant la lecture déjà validé par l’utilisateur.
- Conserver la synchronisation sur le BPM lorsqu’il est disponible.
- L’agrandissement visuel du robot ne doit pas modifier ce comportement de pulsation.
- L’intensification demandée pour l’indicateur d’aimant kick ne concerne pas la pulsation du robot.

### Changelog

- « Changelog depuis la version 1.5 » : blanc et gras.
- Titres des rubriques dans la zone défilante : verts.
- Descriptions et listes : blanches.
- Conserver le défilement du changelog.

## 3. Fenêtre de contrôle

Pour les deux flèches permettant de réduire et d’agrandir le panneau :

- Supprimer les cadres ou carrés verts autour des commandes.
- Icônes blanches au repos.
- Icônes vertes uniquement au survol et pendant le clic.
- Retour au blanc à la fin de l’interaction, hors survol.

## 4. Descriptions de survol de toutes les commandes

- Toutes les commandes doivent avoir une description de survol ; cette exigence n’est pas limitée à Volume.
- Chaque description doit expliquer l’action de la commande, et pas simplement répéter son nom.
- Toutes ces descriptions doivent être encadrées d’un halo vert.

## 5. Effets et lecture

- Ouvrir un effet lorsqu’un morceau est chargé mais arrêté ne doit jamais démarrer la lecture.
- L’ouverture d’une fenêtre d’effet n’est pas une commande de lecture.
- Le démarrage de la lecture doit rester une action explicite de l’utilisateur, notamment avec Play ou la commande de lecture en boucle.

## 6. Limiteur, compresseur et potards

- Harmoniser le vert des crans et graduations du limiteur/compresseur avec celui des autres effets.
- Conserver les comportements d’illumination des potards au survol et pendant leur manipulation.

## 7. Définition des boucles sur la waveform principale

En mode de lecture en boucle uniquement :

- Un clic gauche avant la fin de la boucle déplace son début en conservant sa fin.
- Un clic gauche après la fin actuelle devient un nouveau point de départ pour préparer une nouvelle boucle, au lieu de rester limité par l’ancienne fin.
- Ne pas appliquer indistinctement ce comportement aux autres modes de lecture.
- Ces actions sur la waveform principale sont distinctes des gestes de navigation sur la poignée décrite plus bas.

## 8. Indicateur « Aimant kick actif »

- Lorsque l’aimant est actif et qu’un BPM est disponible avec la détection active, l’indicateur inférieur doit pulser au rythme du BPM.
- La pulsation doit être fortement contrastée, et non un léger scintillement.
- À chaque battement, passer d’un vert très faible à un vert fluo très marqué, puis redescendre.
- Faire varier à la fois la luminosité du vert et l’intensité du halo pour rendre le rythme nettement visible.
- Ne pas modifier pour autant la pulsation du robot, déjà validée.

## 9. Poignée de navigation dans le morceau

### Rôle et emplacement

- Ajouter une poignée de navigation en bas de la waveform.
- Permettre d’afficher un passage plus loin ou plus tôt dans le morceau sans devoir dézoomer entièrement le graphique principal.
- Il s’agit d’un outil de navigation visuelle indépendant de la lecture et de la sélection audio.

### Apparence et curseur

- Poignée en forme de rectangle vert fluo.
- Petite main au survol pour indiquer que la poignée est déplaçable.
- Main fermée pendant le glissement.
- La largeur du rectangle s’adapte au zoom : plus courte en zoom avant, plus large en zoom arrière.

### Déplacement horizontal

- Déplacement par clic droit maintenu et glissement vers la gauche ou la droite.
- Le clic droit remplace le clic gauche envisagé initialement pour cette poignée.
- Le déplacement horizontal conserve le niveau de zoom.

### Zoom à la molette

Quand la souris est sur la poignée :

- Molette vers le haut : zoom avant.
- Molette vers le bas : zoom arrière.
- Le zoom reste centré sur la portion visible.

### Relation avec les boucles et la lecture

- Lorsqu’une boucle est créée, le rectangle se positionne initialement au même endroit et avec la même étendue que cette boucle.
- Cet alignement est un positionnement initial, pas un verrouillage permanent.
- La poignée peut ensuite quitter cette zone pour explorer un autre passage pendant que la boucle initiale continue de jouer.
- Déplacer ou zoomer avec cette poignée ne modifie ni la boucle en lecture, ni ses bornes, ni la sélection audio, ni la position de la tête de lecture.

### Scénario de référence

1. Créer et faire jouer une boucle au début du morceau.
2. Sur la poignée, dézoomer à la molette si nécessaire, sans obligation d’afficher le morceau entier.
3. Maintenir le clic droit et faire glisser la poignée vers un passage plus éloigné, en conservant le zoom lors du déplacement.
4. Zoomer avec la molette sur ce nouveau passage pour y préparer une nouvelle boucle dans la waveform principale.
5. Pendant toute cette navigation visuelle, la boucle initiale reste inchangée et continue de jouer.

## 10. Priorité des dernières décisions

- Largeur d’À propos : conserver celle de la capture validée, et non la réduire.
- Logo texte au-dessus des boutons : le supprimer.
- Halo défilant vert/violet : l’appliquer aux trois boutons.
- Descriptions de survol : toutes les commandes, et non uniquement Volume.
- Aimant kick : pulsation très contrastée, du vert très faible au vert fluo marqué.
- Robot : conserver la pulsation validée, sans lui appliquer l’intensification de l’aimant kick.
- Navigation par la poignée : clic droit maintenu, et non clic gauche.
- Poignée et boucle : alignement initial seulement ; navigation ensuite indépendante de la boucle audio.

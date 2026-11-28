# Cahier des charges — Audio ToolZ 1.9

Statut : proposition, à valider. Les valeurs des réglages sont des propositions à ajuster avant de figer le document.

## 1. Objectif et règles communes

Ajouter à Audio ToolZ 1.9 six évolutions : des raccords sans clic, quatre nouveaux effets (Z-Saturator, Z-Transient, Z-Gate, Z-DeEsser) et des compléments pour Z-Stéréo. Tout reste local, sur Windows 64 bits, avec le thème violet et vert.

Règles valables pour chaque nouvel effet :

- Nom et menu : préfixe « Z- », classé par ordre alphabétique dans le menu Effets.
- Préécoute : réglage en direct pendant la lecture d'un morceau entier, sans boucle ni détection de BPM.
- Neutralité : l'effet s'ouvre sans modifier le son, et « Appliquer » reste grisé avant le premier réglage.
- Fenêtre : elle passe par `EffectPanel`, donc LED verte/rouge « Effet actif / Effet inactif », grisage des réglages quand l'effet est inactif, redimensionnement et bouton « ? ».
- Aide : une rubrique par réglage, en vouvoiement.
- Gestes : double-clic pour revenir à la valeur d'origine, Maj pour le réglage fin, molette pour les pas.
- Cohérence : « Annuler » et « Appliquer » fonctionnent comme dans les autres effets.

## 2. Raccords sans clic

Éviter les clics, les sauts de niveau et les artefacts aux bornes de la zone traitée.

- Fondu de raccord : un fondu croisé très court aux deux bornes (proposition : 5 ms, réglable de 2 à 10 ms dans les paramètres).
- Portée : tous les effets et la préécoute, avec le même résultat à l'écoute et après « Appliquer ».
- Queues : les effets qui prolongent le son (Z-Reverbe, Z-Delay) ne sont pas coupés à la borne de fin.
- Sans sélection : le document entier est traité, sans fondu inutile au début et à la fin.
- Test : la différence d'amplitude entre deux échantillons à la borne ne dépasse pas celle du signal d'origine, sur des signaux de test (sinusoïde, bruit, percussion).

## 3. Nouveaux effets

| Effet | Réglages proposés | Remarques |
|---|---|---|
| Z-Saturator | Mode (Analogique, Soft Clip, Hard Clip), Drive 0 à 24 dB, Mix 0 à 100 %, Compensation automatique du volume (activée par défaut) | Suréchantillonnage ×4 pour éviter le repliement des aigus. À Drive 0 dB, le son est transparent. |
| Z-Transient | Attaque −100 à +100 %, Sustain −100 à +100 %, Sortie −12 à +12 dB | Deux détecteurs d'enveloppe (un rapide, un lent). À 0 %, aucun effet. |
| Z-Gate | Seuil −80 à 0 dBFS, Attaque 0,1 à 50 ms, Maintien 0 à 500 ms, Relâchement 5 à 2000 ms, Plage de réduction, Hystérésis | Affichage du niveau et de l'état ouvert ou fermé. Pas de claquement sur les fins de notes. |
| Z-DeEsser | Fréquence 3 à 10 kHz, Seuil, Réduction maximale 0 à 15 dB, Largeur | Un bouton « Écouter la détection » pour entendre ce qui est atténué. |

Tests communs : un signal neutre sort identique à l'entrée, et un signal extrême ne dépasse pas 0 dBFS sans que ce soit voulu (sauf le mode Hard Clip, qui écrête volontairement).

## 4. Compléments de Z-Stéréo

Z-Stéréo existe déjà (quatre bandes, Stereoize, vectorscope, corrélation). À ajouter :

- Inversion de phase : un interrupteur par canal (gauche, droite).
- Écoute en mono : un bouton de contrôle qui fait entendre la somme mono pendant la préécoute, sans changer le résultat appliqué.
- Alerte : une indication visible quand la corrélation reste sous 0 trop longtemps.

## 5. Livraison, critères et points ouverts

Version 1.9 à mettre partout au moment de la livraison : `Cargo.toml`, `tauri.conf.json`, `main.tsx`, `App.tsx`, README, CHANGELOG, nom du ZIP et test qui vérifie le titre.

Critères d'acceptation : la CI passe au vert, chaque effet respecte les règles communes, et l'écoute des quatre effets est validée sur des morceaux réels.

Ordre de développement proposé : raccords, Z-Saturator, Z-Gate, Z-Transient, Z-DeEsser, puis compléments de Z-Stéréo.

Points ouverts :

- Z-Maximiseur (prévu en 1.7) : l'intégrer ou l'abandonner ?
- Test du Z-Pitcher en échec en CI (`verify_pitcher_runtime.mjs`) : le corriger avant la 1.9 ?
- Compilation et tests complets de la branche `1.9-dev` : à confirmer.
- Présence du ZIP dans la release 1.8 : à vérifier.

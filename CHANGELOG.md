# Journal des modifications

## 1.6 — Une grosse mise à jour

La v1.6 marque une évolution importante d’Audio ToolZ : une chaîne de traitement enrichie, un égaliseur paramétrique à sept bandes, une interface retravaillée et un didacticiel accompagné par ATZ, la mascotte.

## Les nouveautés phares

- Égaliseur paramétrique à sept bandes indépendantes, en remplacement des trois bandes de la v1.5 : fréquence, gain, largeur Q, formes et pentes compatibles, spectre d’entrée et courbe de réponse globale.
- Compresseur et limiteur réunis dans une fenêtre dédiée : modes COMP et LIMIT, gain d’entrée, plafond, attaque, relâchement, enveloppe et visualisation de la réduction de gain. Le limiteur traite les crêtes d’échantillons ; il ne revendique pas de limitation true peak suréchantillonnée.
- Didacticiel intégré avec ATZ pour accompagner la prise en main, avec accès à Telegram, Github et Paypal sur la dernière page.
- Refonte graphique violet et vert néon : potards gradués, indicateurs lumineux, boutons harmonisés, accueil illustré et fenêtre À propos réorganisée.
- Six visualisations : Oscilloscope, Spectre, Waveforme colorée, Vectorscope stéréo, Spectrogramme et Vumètre à aiguille stéréo. Le dernier choix est mémorisé ; sans préférence, l’oscilloscope est utilisé. Le vumètre indique un niveau RMS en dBFS avec inertie visuelle, pas un instrument VU analogique calibré.

## Effets, Delay et lecture

- Préécoute et application des effets pendant la lecture normale, sans boucle obligatoire, sur la sélection ou le morceau entier. Ouvrir un effet ne lance pas la lecture.
- Reprise des derniers réglages de préécoute au démarrage de la lecture.
- Delay musical compact : temps musicaux, répétitions, volume d’effet, panoramique et modes Mono / Stéréo / Ping-pong / Off. Détection BPM en arrière-plan dans le panneau, sans modifier les réglages.
- Delay initialisé sur Off, zéro répétition, volume d’effet nul et panoramique centré ; aucune durée libre en millisecondes dans l’interface finale. Le BPM sert aux temps musicaux du Delay, pas au compresseur, au limiteur ni à l’égaliseur.
- Routage ping-pong conservé : panoramique décentré pour choisir le premier côté ; répétitions mono identiques au centre.
- Navigation de l’aperçu indépendante de la boucle, largeur à la molette et reprise de lecture au point choisi après la boucle.
- Bornes de boucle ajustables pendant la lecture ; aimantation conservée. Raccourci Espace disponible dans les fenêtres d’effets via les commandes de transport existantes.
- Balance par atténuation des canaux, sans sommation du canal opposé.

### Dernières finitions v1.6

- Onde électrique vert néon attachée de chaque côté du titre, en courbes continues. Son amplitude suit uniquement le niveau RMS stéréo de sortie, sans BPM ni kicks. Elle s’atténue vers ses extrémités ; aucun signal en pause, à l’arrêt ou dans le silence.
- Survol du bouton « ? » : seul le point d’interrogation s’illumine, sans cadre ni halo vert autour du bouton.
- Titre vert « Changlog depuis la v1.5 » dans À propos ; robot et trois liens conservés. La pulsation du robot reste distincte de l’onde et suit le tempo lorsque celui-ci est exploitable.
- Boutons du didacticiel violets avec contour lumineux vert au survol.

### Visualisations et finitions graphiques v1.6

Accueil avec illustration ajustée à ses pixels visibles ; panneau Contrôle sans illustration ni anciens vumètres séparés, analyseur conservé. Identité Audio blanc, Tool vert et Z violet. Les préférences de réduction des animations sont respectées.

## Compatibilité et nettoyage

Tauri v2, Symphonia 0.5, les formats audio, les fichiers CUE, l’assemblage, l’enregistrement et les traitements par lots sont conservés depuis la v1.5. Les fenêtres autonomes Volume/Gain et Normalisation sont retirées ; le volume général, les gains internes et les traitements par lots restent disponibles.

## Distribution finale v1.6

Un seul téléchargement : `Audio ToolZ v1.6.zip`. Après extraction, le dossier `Audio ToolZ` contient `Audio ToolZ.exe`, `logo.ico` et `desktop.ini`. Les empreintes SHA-256 de l’exécutable et du ZIP figurent dans le résumé de compilation, pas dans un téléchargement séparé.

## Finalisation du candidat v1.6

Cette dernière révision doit passer les tests audio et UI, le contrôle TypeScript, la compilation Windows et les contrôles du ZIP. Les validations de versions antérieures ne valent pas validation de cette nouvelle onde. Le passage dans main intervient après validation de la chaîne ; aucun tag ni aucune release officielle ne sont créés par cette préparation.

## 1.5

### Nouveautés et allègement
- Distribution Windows portable allégée sous **Tauri v2** (WebView2 natif, sans Electron).
- **Formats audio pris en charge** :
  - **Import / Ouverture** (moteur Web Audio + décodeur **Symphonia**) : **WAV**, **MP3**, **FLAC**, **OGG** (`.ogg`, `.oga`), **Opus** (`.opus`), **AAC**, **ALAC**, **M4A / MP4** (`.m4a`, `.mp4`), **AIFF** (`.aif`, `.aiff`), **CAF** (`.caf`), **Matroska** (`.mka`, `.mkv`), **WebM** (`.webm`) et **PCM**.
  - **Export** : **WAV** (16-bit PCM, 24-bit PCM, 32-bit Float), **MP3** (128, 192, 256, 320 kbps), **FLAC** (compression Rapide 0, Standard 2, Maximale 5) et **OGG Vorbis** (qualité 1 à 10).
  - **Repères & mix** : import, extraction et découpe automatique via fichiers **`.cue`**.
- Nouveaux effets studio en écoute directe : égaliseur 3 bandes, filtre fréquentiel, compresseur + Auto-Gain, réduction de bruit spectrale avec capture de profil, et délai musical synchronisé au BPM (mono, stéréo, ping-pong G/D).
- Traitement par lots, Auto-Cue et découpe WAV automatique par repères.
- Faders verticaux, potards gradués, molette et double-clic de réinitialisation.

### Ergonomie et correctifs
- Menus déroulants fermés sur tout clic extérieur avec navigation au survol.
- Fenêtre de contrôle ancrée au-dessus de la règle temporelle et waveform colorée détaillée ralentie.
- Lecture et boucle préservées après Appliquer ou Annuler.
- Fenêtre À propos v1.5 centrée, déplaçable et redimensionnable.
- Halo vert sur l’onglet au survol, bouton `?` déplacé dans la barre de fenêtre, chronomètre centré, indicateurs « Stéréo » / « Durée » en vert.
- Lecture arrière en boucle infinie sur la sélection, détection BPM affinée sans doublement ×2, et délai synchronisé avec panoramique continu L/C/R et fader vert.

## 1.4

### Navigation et lecture

- Déplacement des bornes de sélection vers l’avant ou l’arrière, même lorsque la borne opposée est hors écran. La vue défile aux bords sans modifier le zoom ni déplacer l’autre borne.
- Zoom et dézoom indépendants de la sélection. Les bornes restent ajustables pendant la lecture en boucle.
- Défilement ralenti de la forme d’onde dans l’analyseur, sans changement de la vitesse de lecture.

### Historique et aide

- Le menu « Fichier » mémorise les dix derniers fichiers ouverts, sans doublons. Effacer l’historique ne supprime aucun fichier audio.
- Le bouton « ? » donne accès à la [communauté Telegram](https://t.me/Audio_ToolZ).

### Distribution Windows

- Version portable pour Windows 64 bits, sans installation. Extrayez le ZIP, copiez le dossier complet `Audio ToolZ` sur une clé USB, puis lancez `Audio ToolZ.exe` depuis ce dossier.
- Les réglages et l’historique restent dans `user-data`, à côté de l’exécutable. Ce dossier est créé à l’usage et n’est pas livré dans le ZIP.
- Exécutable non signé numériquement.

## 1.3

- Paquet portable pour Windows 64 bits, avec icône intégrée et moteur configuré en français.
- Licences Electron et Chromium regroupées dans `resources/licenses`. Somme de contrôle SHA-256 fournie séparément.
- README enrichi avec les fonctions audio, les formats et la prise en main.

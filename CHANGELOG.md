# Journal des modifications

## 1.8

La version 1.8 ajoute trois nouveaux effets (Z-Chorus, Z-Flanger, Z-Denoiser refondu) et l'outil Pop/Clic pour nettoyer les disques vinyles. Tous les effets se règlent désormais en temps réel pendant la lecture, et l'interface gagne en lumière et en précision de réglage.

### Nouveautés

#### Effets et outils

- Z-Chorus : épaissit le son avec de une à quatre copies légèrement décalées et modulées. Vitesse en hertz ou Temps calé sur le BPM détecté, profondeur, retard de 5 à 30 ms, largeur stéréo et mix. Une onde animée montre l'oscillateur.
- Z-Flanger : balayage d'un retard très court (0,1 à 10 ms), avec vitesse ou Temps calé sur le BPM, profondeur, réinjection de −95 % à +95 %, mode Through-zero, largeur stéréo et mix. Même onde animée que le Chorus.
- Pop/Clic : nouveau bouton dans la barre d'outils, après Z-Pitcher, pour réparer les clics et les pops d'un disque vinyle. Sélectionnez une portion de 0,1 à 60 s, puis choisissez un niveau : Prudent (2000 %), Standard (1000 %), Sensible (700 %), Fort (500 %) ou Très fort (300 %). Un réglage fin de la tolérance (100 à 5000 %) et de la taille maximale du défaut (1 à 20 ms) complète la fenêtre. Chaque clic repéré est marqué en rouge sur la forme d'onde de la sélection, la préécoute joue le résultat réparé et Appliquer reprend ce même résultat. Le bouton reste grisé sans sélection.
- Z-Denoiser : refonte complète. Le profil de bruit se capture obligatoirement (plus de profil automatique), reste mémorisé à la fermeture de la fenêtre, et le bouton de capture est toujours visible. Atténuation de 0 à 36 dB, oscilloscope en lecture, entrée dans le menu Effets.
- Z-Fondus : courbe à points modifiables, avec une boule lumineuse qui suit le sommet de l'arrondi et une tête de lecture verte sur une grille blanche.
- Z-Limit/Comp : le compresseur s'ouvre en position neutre (ratio 1:1), sans compression tant que vous n'augmentez pas le ratio.
- Z-Delay : la détection du BPM travaille sur 45 s autour de la lecture (ou du milieu de la sélection), avec une limite de 30 s, pour rester légère sur les longs fichiers.

#### Préécoute et réglages

- Préécoute en temps réel, fenêtre par fenêtre, pour Z-Reverbe, Z-Égaliseur, Z-Limit/Comp, Z-Pitcher, Z-Chorus et Z-Flanger. Z-Reverbe est plus rapide et s'entend dès le premier potard.
- Effets neutres à l'ouverture : Z-Reverbe, Z-Fondus, Z-Denoiser, Z-Chorus et Z-Flanger s'ouvrent sans rien modifier, et Appliquer reste inactif tant qu'un réglage n'a pas bougé.
- Réglage fin avec Maj sur les faders, les potards et les gains de l'égaliseur. Sur les points de l'égaliseur et les lignes de Z-Limit/Comp : Ctrl aimante, Alt verrouille l'axe.
- Menu Effets classé par ordre alphabétique, avec une aide « ? » complète pour chaque effet, y compris Pop/Clic.

#### Interface

- Fenêtre de confirmation à la fermeture : « Vous me quittez déjà ? », avec Quitter sans sauvegarder, Sauvegarder et fermer, ou Annuler. Elle s'affiche dans le même violet que les autres fenêtres.
- Logo du haut qui tourne à 33 tours par minute.
- Ondes et arcs électriques autour du titre, réactifs au niveau de chaque canal (volume, balance) et au spectre. Pulsation sur la grille BPM.
- Barres de défilement lumineuses, halos tournants vert et violet sur les boutons et les titres d'effets, icônes de la barre d'outils lumineuses et menus qui passent au vert au survol.
- Faders et points de l'égaliseur : cercle blanc et halo de la couleur de la bande au survol du bouton et pendant le glissement. Potards : cran sélectionné et crans voisins qui s'allument comme des diodes.
- Onde audio lissée, taille minimale des fenêtres d'effets et fenêtre de contrôle lumineuse.
- Palette de couleurs centralisée dans un seul fichier.

### Corrections

- Z-Reverbe : l'alerte 0 dBFS est retirée.
- Faders : le halo ne s'allume plus qu'au survol du bouton ou pendant le glissement, plus au survol du fader entier ni au clavier. Halos parasites supprimés.
- Z-Pitcher : calcul par fenêtre, sans boucle ni BPM.
- Z-Flanger : ondes fantômes supprimées. Aide des effets : croix de fermeture en blanc.
- Z-Chorus et Z-Flanger : onde centrée.
- Barres de défilement vertes partout et halo corrigé.
- Spectrogramme coloré à deux canaux.
- Vérification de la configuration plus rapide et musique du didacticiel discrète pendant la lecture.
- Lecture : Play fonctionne de nouveau après une lecture arrière.
- Finitions visuelles de la 1.7 : triangle de redimensionnement, boutons, faders et aide.
- Fenêtre de fermeture : points d'interrogation du titre et du bouton, titre sans halo, ZØNYX agrandi.
- Journal des modifications de l'application mis à jour.

### Interne

- Compilation Windows validée aussi sur la branche de développement ; la validation Signalsmith ne bloque plus que main.
- Nouveaux tests automatiques pour Pop/Clic (clics de 1 à 150 échantillons, signal propre, souffle, attaques de batterie, stéréo) et son propre workflow de vérification, qui publie trois fichiers WAV à écouter.
- README refondu avec captures et description de chaque réglage.
- Numéro de version : 1.8.0.

## 1.7

### Mises à jour

- Nouveau moteur audio pour Z-Pitcher : Signalsmith Stretch règle la vitesse (0,5× à 2×) et la hauteur (−12 à +12 demi-tons) indépendamment, avec une préécoute et une application cohérentes, sur deux faders horizontaux gradués.
- Décodeur audio de secours mis à jour vers Symphonia 0.6.1.
- Z-Reverbe : niveaux Direct, Réflexions et Réverbération, réglage Stéréo de 0 à 100 % et prédélai calé sur le tempo.
- Z-Delay : fenêtre rectangulaire et sélecteur cranté Mono / Stéréo / Ping-pong / Off.
- Barre d'espace : Play/Stop.
- Interface : crans des potards lumineux au repos, libellés de position qui s'illuminent progressivement, bandeau des effets en fondu de 1,5 seconde et triangle de redimensionnement vert.
- Didacticiel : nouvelle page de vérification de la configuration (matériel, audio et temps de traitement indicatif) et page « Je suis là pour vous guider ».
- Écran « Ouverture en cours » lors de l'ouverture d'un fichier.
- Version 1.7.0.

### Corrections

- Z-Pitcher : résultats périmés rejetés, annulation qui préserve l'original et plus de repli silencieux vers l'ancien moteur.
- Barre d'espace : fin du comportement Pause/Reprise ; la lecture redémarre au début de la boucle.
- Z-Reverbe : la fermeture restaure le signal original ; niveaux limités à 100 %, bouton Tempo et molette Stéréo corrigés.
- Aides des effets : rubriques inutiles retirées et couleurs harmonisées.
- Libellés Curseur et Sélection de l'écran de chargement en vert.

## 1.6 — Une grosse mise à jour

La v1.6 marque une évolution importante d’Audio ToolZ : une chaîne de traitement enrichie, un égaliseur paramétrique à sept bandes, une interface retravaillée et un didacticiel accompagné par ZØNYX, la mascotte.

## Les nouveautés phares

- Égaliseur paramétrique à sept bandes indépendantes, en remplacement des trois bandes de la v1.5 : fréquence, gain, largeur Q, formes et pentes compatibles, spectre d’entrée et courbe de réponse globale.
- Compresseur et limiteur réunis dans une fenêtre dédiée : modes COMP et LIMIT, gain d’entrée, plafond, attaque, relâchement, enveloppe et visualisation de la réduction de gain. Le limiteur traite les crêtes d’échantillons ; il ne revendique pas de limitation true peak suréchantillonnée.
- Didacticiel intégré avec ZØNYX pour accompagner la prise en main, avec accès à Telegram, Github et Paypal sur la dernière page.
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

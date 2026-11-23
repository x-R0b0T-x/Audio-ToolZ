# Journal des modifications

## 1.6

Version validée par le mainteneur le 22 novembre 2026. Voir [les notes détaillées](RELEASE_NOTES_1.6.md). La fusion dans main et la publication du tag v1.6 sont des étapes distinctes de cette préparation documentaire.

### Effets et lecture

- Égaliseur paramétrique sept bandes en remplacement des trois bandes de la 1.5 : formes de filtre, pentes compatibles, Q, spectre et réponse globale.
- Fenêtre Limiteur / Compresseur avec enveloppe, plafond, graphique de sortie et réduction de gain. Limitation des crêtes d’échantillons, sans garantie true peak.
- Préécoute et application pendant une lecture normale, sans boucle obligatoire ; sélection active ou morceau entier.
- Reprise du dernier réglage de préécoute au démarrage de la lecture ; aucun démarrage automatique à l’ouverture d’un effet.
- Navigation de l’aperçu indépendante de la boucle, conservation du cadrage et reprise de lecture après un clic au-delà d’une boucle.

### Delay

- Temps musicaux, répétitions, volume d’effet et panoramique de départ à 0 ; disposition compacte et sélecteur vertical Mono / Stéréo / Ping-pong / Off.
- Détection BPM directement dans le panneau, en arrière-plan, sans modification des réglages. Le tempo est requis pour le Delay musical, pas pour les autres effets.
- Valeurs initiales : Off, zéro répétition et volume d’effet à zéro. Aucune commande de durée libre en millisecondes dans l’interface finale.
- Routage ping-pong conservé : premier côté choisi par le panoramique décentré ; répétitions mono identiques au centre, sans revendication de permutation stéréo du type Fruity Delay 3.
- Balance du panneau Contrôle par atténuation du canal opposé, sans sommation.

### Présentation et nettoyage

- Potards violets, graduations et indicateurs verts, illumination au survol et pendant le réglage.
- À propos : robot à gauche des liens, halos vert/violet renforcés et changelog défilant.
- Détection automatique du tempo à l’ouverture d’À propos et pulsation du robot jusqu’à 170 %, indépendante du volume et des basses. Robot immobile à l’arrêt ou sans tempo exploitable ; réduction des animations respectée.
- Fenêtres autonomes Volume/Gain et Normalisation retirées ; volume général, gains internes et traitements par lots conservés.
- Tauri v2, Symphonia 0.5, formats audio, CUE, assemblage et enregistrement conservés depuis la 1.5.
- Tests audio/UI, contrôle TypeScript et contrôle de l’intégrité des médias avant compilation Windows portable, avec SHA-256.

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


## Finalisation du candidat v1.6

- Nom Audio ToolZ : Audio blanc, Tool vert, Z violet.
- Dernière page du didacticiel : liens Telegram, GitHub et PayPal.
- Aucun texte « Aucun fichier récent » quand la liste est vide.
- Distribution portable : ZIP contenant le dossier Audio ToolZ avec Audio ToolZ.exe, logo.ico et desktop.ini ; empreintes SHA-256 de l’exécutable et du ZIP fournies séparément.
- Delay en temps musicaux avec détection BPM, sans réglage libre en millisecondes.
- Ce candidat corrigé doit être testé avant fusion, tag et publication officiels. La validation de 414ae3f concerne la base antérieure.

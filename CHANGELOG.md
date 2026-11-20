# Journal des modifications

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

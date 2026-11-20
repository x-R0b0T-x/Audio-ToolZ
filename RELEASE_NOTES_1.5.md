# Audio ToolZ v1.5

Audio ToolZ franchit une nouvelle étape : cette version remplace Electron par **Tauri v2**, enrichit les traitements audio et améliore le travail sur les sélections et les boucles. L’interface évolue également, avec un espace de travail plus compact et une identité visuelle verte et violette renforcée.

## Une version Windows allégée, sans Electron

- Passage de la version bureau à Tauri v2, avec utilisation de WebView2.
- Distribution Windows portable sous la forme d’un exécutable.
- Ajout du décodeur de secours Symphonia pour élargir la compatibilité à l’ouverture des fichiers audio.
- Conservation d’une interface utilisable dans le navigateur, avec des possibilités de décodage qui dépendent de son environnement.

## De nouveaux effets audio en écoute directe

La 1.5 ajoute plusieurs traitements pour travailler le son directement sur la sélection :

- Égaliseur trois bandes pour ajuster les graves, les médiums et les aigus.
- Filtre fréquentiel : passe-haut, passe-bas et coupe-bande.
- Compresseur avec gain automatique pour contrôler la dynamique et ajuster le niveau.
- Réduction de bruit spectrale avec capture d’un profil de bruit.
- Délai musical synchronisé au tempo détecté.

Les réglages disposent d’une écoute directe pour entendre le résultat avant de l’appliquer.

## Un délai synchronisé au BPM

Le nouvel effet de délai propose :

- Des divisions musicales droites, pointées et en triolets.
- Des modes mono, stéréo et ping-pong gauche/droite.
- Un réglage du nombre de répétitions.
- Un niveau d’effet indépendant du son original.
- Un panoramique continu de gauche à droite, avec position centrale.
- Des répétitions limitées à la sélection, sans prolonger automatiquement le fichier.

Le son original est conservé. Le mode désactivé, zéro répétition ou un niveau d’effet à zéro permettent de revenir à une écoute sans écho.

## Traitement par lots et découpe automatique

- Ajout du traitement par lots pour appliquer une chaîne de traitements à plusieurs fichiers.
- Détection des silences avec Auto-Cue pour créer des repères.
- Découpe et export WAV des segments à partir des repères.
- Complément aux fonctions d’import et d’export des feuilles `.cue`.

## Lecture, boucles et détection du tempo

Plusieurs améliorations rendent le travail sur un passage plus fluide :

- Lecture arrière en boucle sur la sélection.
- Détection BPM affinée pour réduire les erreurs de tempo doublé.
- Ajustement de la limite droite au clic droit maintenu.
- Modification du début de boucle sans saut immédiat lorsque la lecture peut se poursuivre.
- Retour au début de la boucle lorsque la nouvelle fin a déjà été dépassée.
- Conservation de la lecture, de sa position et du mode boucle après application ou annulation d’un effet.

## Une interface retravaillée

- Interface plus compacte pour laisser davantage de place à l’édition audio.
- Fenêtre de contrôle ancrée en bas à droite, au-dessus de la règle temporelle.
- Chronomètre centré dans le panneau de contrôle.
- Forme d’onde colorée de l’analyseur ralentie pour faciliter sa lecture.
- Vue d’ensemble avec deux canaux distincts : gauche en violet, droite en vert.
- Potentiomètres gradués, curseurs verticaux et indicateurs stéréo animés.
- Réglage à la molette et double-clic de réinitialisation sur les commandes concernées.
- Navigation entre les menus au survol et fermeture lors d’un clic extérieur.
- Contour lumineux animé autour du titre et halo permanent lorsque l’aimant aux kicks est activé.
- Fenêtre « À propos » plus compacte, déplaçable et redimensionnable.

## Formats et export

La version bureau combine le décodage de WebView2 et le décodeur de secours Symphonia pour élargir les possibilités d’ouverture. La compatibilité effective dépend du codec contenu dans le fichier, et pas uniquement de son extension.

Les formats documentés comprennent notamment WAV, MP3, FLAC, OGG/OGA, Opus, AAC, ALAC, M4A/MP4, AIFF/AIF, CAF, Matroska et WebM.

Les possibilités d’export restent disponibles :

| Format | Réglages proposés |
|---|---|
| WAV | PCM 16 bits, PCM 24 bits et flottant 32 bits |
| MP3 | 128, 192, 256 et 320 kbit/s |
| FLAC | Niveaux de compression 0, 2 et 5 |
| OGG Vorbis | Qualité de 1 à 10 |

## Téléchargement

- `Audio ToolZ.exe` : programme Windows portable.
- `SHA256SUMS.txt` : empreinte de contrôle de l’exécutable.

Téléchargez l’exécutable, placez-le dans un dossier de votre choix, puis lancez-le.

La compilation Windows a été testée par le développeur avant publication.

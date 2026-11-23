<div align="center">
  <img src="https://github.com/user-attachments/assets/e5677deb-fe21-4d32-9495-dfe60b4ffe69" alt="Logo Audio-ToolZ" width="160" height="160" />
  <h1>Audio-ToolZ 1.6</h1>
  <p>Éditeur audio léger à interface française — Windows portable sous Tauri v2 et navigateur.</p>
</div>

## Présentation

Audio-ToolZ permet de préparer des échantillons, découper un passage, travailler en boucle, appliquer des effets et assembler plusieurs fichiers. Les documents s’ouvrent en onglets ; la fenêtre Contrôle regroupe transport, niveaux et visualisations stéréo.

## Version 1.6

- Égaliseur paramétrique sept bandes avec formes de filtre, largeur Q et courbe de réponse.
- Limiteur / Compresseur avec graphique de sortie et réduction de gain.
- Effets en préécoute pendant une lecture normale, sans boucle obligatoire. Ils ciblent la sélection ou tout le morceau lorsqu’aucune sélection n’existe.
- Delay musical : temps, répétitions, volume d’effet, panoramique et modes Mono / Stéréo / Ping-pong / Off. Détection BPM accessible dans son panneau.
- Navigation dans l’aperçu indépendante de la boucle audio.
- À propos : robot à côté des liens, pulsation synchronisée au tempo avec détection automatique, halos vert/violet.

Les détails et limites figurent dans [les notes de la 1.6](RELEASE_NOTES_1.6.md) et le [changelog](CHANGELOG.md). Les anciennes fenêtres autonomes Volume/Gain et Normalisation ne sont plus présentes ; le volume général et les gains intégrés restent disponibles.

## Fonctionnalités conservées

- Édition sur forme d’onde : sélection, couper/copier/coller, mixage au collage, silence, rognage, annuler/rétablir et zoom.
- Lecture normale, pause, arrêt, boucle et lecture inversée ; volume, balance, vitesse et activation des canaux.
- Fondus, vitesse et hauteur, réduction de bruit spectrale, égalisation, dynamique et Delay.
- Détection BPM, repères rythmiques et aimantation des sélections.
- Enregistrement depuis une entrée audio autorisée et sélection des périphériques selon les possibilités du système.
- Assemblage de fichiers, import et export CUE, Auto-Cue, découpe WAV et traitement par lots. L’assemblage juxtapose les pistes : ce n’est pas un séquenceur multipiste.
- Oscilloscope, spectre et forme d’onde colorée.

## Formats et export

La version Windows utilise WebView2 et le décodeur de secours Symphonia, notamment pour AAC, ALAC, FLAC, MP3, PCM et Vorbis dans les conteneurs compatibles. La compatibilité dépend du fichier et du décodeur disponible.

| Export | Options |
| --- | --- |
| WAV | PCM 16 bits, PCM 24 bits, flottant 32 bits |
| MP3 | 128, 192, 256 ou 320 kbit/s |
| FLAC | Niveaux 0, 2 ou 5 |
| OGG Vorbis | Qualité 1 à 10 |

Les traitements et l’encodage sont réalisés localement. L’accès aux entrées audio requiert une autorisation ; le choix des périphériques et les dialogues d’enregistrement varient selon le navigateur et le système.

## Prise en main

1. Ouvrez un fichier et lancez sa lecture.
2. Sélectionnez un passage si nécessaire ; sinon les effets ciblent le morceau entier.
3. Ouvrez un effet et ajustez ses réglages pendant la lecture.
4. Pour le Delay musical, utilisez Détection BPM si le tempo est inconnu, choisissez un mode actif, des répétitions et un volume d’effet supérieur à zéro. Aucune boucle n’est requise.
5. Appliquez le traitement puis exportez le document ou la sélection.

La détection du tempo est une estimation. La mémorisation de l’interface ne sauvegarde pas vos documents : exportez votre travail avant de fermer l’application. Les fichiers longs et l’historique d’édition peuvent consommer beaucoup de mémoire.

## Distribution et licence

Les versions publiées se trouvent dans [GitHub Releases](https://github.com/x-R0b0T-x/Audio-ToolZ/releases). Le paquet Windows x64 portable contient Audio ToolZ.exe et SHA256SUMS.txt. Les artifacts de développement Actions ne constituent pas une publication officielle.

Projet sous licence GPL v3 : voir les fichiers de licence du dépôt. Communauté : [Telegram](https://t.me/Audio_ToolZ).


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


### Visualisations et finitions graphiques v1.6

- Six modes : Oscilloscope, Spectre, Waveforme colorée, Vectorscope stéréo, Spectrogramme, Vumètre à aiguille stéréo. Sélecteur sombre discret ; mode initial Oscilloscope puis choix mémorisé.
- Le vumètre affiche un niveau RMS en dBFS avec une inertie visuelle ; ce n’est pas un instrument VU analogique calibré.
- Robot d’accueil recadré sur ses pixels visibles et ajusté aux bords extérieurs des boutons Charger et Enregistrer.
- Particules vert/violet plus lumineuses et plus longues, dont les trajectoires se terminent doucement même après pause ou arrêt.
- Validation du candidat par tests, compilation et essais Windows requise.

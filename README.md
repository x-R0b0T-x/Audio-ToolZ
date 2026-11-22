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

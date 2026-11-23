<div align="center">
  <img src="src/medias/mix.png" alt="Logo Audio ToolZ" width="220" />
  <h1>Audio ToolZ v1.6</h1>
  <p>Découpez, transformez et assemblez vos sons.</p>
  <p>Éditeur audio à interface française · Windows portable · Traitements locaux</p>
  <p><a href="https://github.com/x-R0b0T-x/Audio-ToolZ/releases">Versions publiées</a> · <a href="RELEASE_NOTES_1.6.md">Nouveautés v1.6</a> · <a href="CHANGELOG.md">Changelog</a> · <a href="https://t.me/Audio_ToolZ">Communauté Telegram</a></p>
</div>

---

## Votre atelier audio, du premier extrait au mix final

Préparer un échantillon, affiner une boucle, corriger un niveau, sculpter un son ou assembler plusieurs morceaux : Audio ToolZ réunit ces outils dans un espace de travail à interface française, avec documents en onglets, édition sur forme d’onde et préécoute des effets.

La v1.6 est une grosse mise à jour : égaliseur paramétrique à sept bandes, fenêtre compresseur/limiteur, didacticiel avec ATZ et refonte graphique violet et vert néon.

## Audio ToolZ en image

<p align="center">
  <img src="https://github.com/user-attachments/assets/e1e65796-d3d2-409c-bdcf-fe649f2b3a93" alt="Grande illustration de présentation d’Audio ToolZ" width="1000" />
</p>

Cette illustration de présentation est conservée ; elle ne remplace pas une capture exhaustive des nouveautés de la v1.6.

## Une grosse mise à jour : la v1.6

| Nouveauté | Pour votre travail audio |
| --- | --- |
| Égaliseur paramétrique à sept bandes | Réglez fréquence, gain et largeur Q, choisissez les formes de filtre et consultez le spectre ainsi que la réponse globale. |
| Compresseur et limiteur | Travaillez la dynamique avec les modes COMP et LIMIT, le plafond, l’enveloppe et l’affichage de la réduction de gain. |
| Didacticiel avec ATZ | Découvrez l’application avec la mascotte et retrouvez les liens vers la communauté et le soutien au projet. |
| Refonte graphique | Retrouvez une interface harmonisée, des potards violets gradués et des accents vert néon. |
| Préécoute pendant la lecture | Ajustez les effets en lecture normale, sans imposer de boucle, sur la sélection ou le morceau entier. |
| Delay musical compact | Réglez temps musicaux, répétitions, volume et panoramique ; détectez le BPM directement dans le panneau. |

Le limiteur agit sur les crêtes d’échantillons ; il ne revendique pas de limitation true peak suréchantillonnée. Le BPM est nécessaire au calcul des temps musicaux du Delay, pas à l’égaliseur, au compresseur ni au limiteur. Ouvrir un effet ne lance pas automatiquement la lecture.

### Visualisations et finitions graphiques v1.6

Six modes accompagnent l’écoute : Oscilloscope, Spectre, Waveforme colorée, Vectorscope stéréo, Spectrogramme et Vumètre à aiguille stéréo. L’oscilloscope est utilisé sans préférence enregistrée, puis le dernier choix est mémorisé.

Le vumètre représente un niveau RMS en dBFS avec inertie visuelle : il ne s’agit pas d’un instrument VU analogique calibré.

### Dernières finitions v1.6

- Onde électrique vert néon attachée au titre, en courbes continues : son amplitude suit uniquement le niveau sonore RMS stéréo, sans BPM ni kicks. Elle s’atténue à ses extrémités et disparaît en pause, à l’arrêt ou pendant le silence.
- Accueil illustré, fenêtre À propos réorganisée et historique des modifications défilant.
- Survol du bouton « ? » limité au point d’interrogation lumineux.
- Navigation de l’aperçu indépendante de la boucle, bornes ajustables pendant la lecture et aimantation conservée.
- Préférences de réduction des animations respectées.

Retrouvez les détails et les limites dans les [notes de version](RELEASE_NOTES_1.6.md) et le [journal des modifications](CHANGELOG.md).

## Les outils du quotidien

### Éditer et écouter

- Ouvrez plusieurs documents en onglets et travaillez sur leur forme d’onde.
- Sélectionnez, coupez, copiez, collez, rognez ou mettez un passage en silence.
- Utilisez le mixage au collage, l’annulation, le rétablissement et les outils de zoom.
- Écoutez en lecture normale, en boucle ou en sens inverse ; réglez volume, balance, vitesse et canaux actifs.
- Détectez le tempo, affichez les repères rythmiques et activez l’aimantation pour affiner vos sélections.

### Transformer et assembler

- Appliquez des fondus, ajustez vitesse et hauteur, utilisez la réduction de bruit et les effets audio disponibles.
- Préécoutez avant d’appliquer, sur une sélection ou sur le morceau entier.
- Assemblez des fichiers, gérez les feuilles CUE, utilisez Auto-Cue, la découpe WAV et le traitement par lots.
- Enregistrez depuis une entrée audio autorisée et sélectionnez vos périphériques selon les possibilités du système.

L’assemblage juxtapose les pistes : ce n’est pas un séquenceur multipiste à superposition. Les anciennes fenêtres autonomes Volume/Gain et Normalisation ont été retirées ; le volume général, les gains internes et les traitements par lots restent disponibles.

## Formats et export

La version Windows repose sur Tauri v2 et WebView2, avec le décodeur de secours Symphonia. La compatibilité à l’ouverture dépend du fichier, de son conteneur et du décodeur disponible.

| Export | Réglages proposés |
| --- | --- |
| WAV | PCM 16 bits, PCM 24 bits ou flottant 32 bits |
| MP3 | 128, 192, 256 ou 320 kbit/s |
| FLAC | Niveaux de compression 0, 2 ou 5 |
| OGG Vorbis | Qualité de 1 à 10 |

Les traitements et l’encodage sont réalisés localement, sans envoyer le contenu audio à un service d’encodage distant.

## Prise en main

1. Téléchargez le paquet Windows et extrayez le dossier complet.
2. Lancez `Audio ToolZ.exe` et consultez le didacticiel avec ATZ.
3. Ouvrez un fichier audio et lancez sa lecture.
4. Sélectionnez un passage si nécessaire ; sinon les effets ciblent le morceau entier.
5. Ajustez vos effets avec la préécoute, appliquez le traitement, puis exportez votre travail.

Pour le Delay musical, détectez le BPM si nécessaire, choisissez un mode actif, ajoutez des répétitions et augmentez le volume d’effet. Ses valeurs initiales sont Off, zéro répétition et volume d’effet nul.

## Distribution finale v1.6

Le nom exact du paquet Windows x64 portable est :

```text
Audio ToolZ v1.6.zip
```

Après extraction :

```text
Audio ToolZ/
├── Audio ToolZ.exe
├── logo.ico
└── desktop.ini
```

Conservez ces trois fichiers ensemble. Les empreintes SHA-256 de l’exécutable et du ZIP figurent dans le résumé de compilation, sans fichier de contrôle séparé à télécharger.

Consultez les [versions publiées sur GitHub Releases](https://github.com/x-R0b0T-x/Audio-ToolZ/releases). Les paquets de développement disponibles dans Actions sont distincts des releases officielles ; l’intégration dans `main` ne publie pas à elle seule une release.

## À savoir

- La détection du tempo reste une estimation dépendant du contenu audio.
- L’enregistrement nécessite une autorisation d’accès à l’entrée audio.
- Le choix des périphériques et les dialogues de fichiers varient selon le navigateur et le système.
- Les longs fichiers et l’historique d’édition peuvent consommer beaucoup de mémoire.
- Les préférences mémorisées ne sauvegardent pas les documents : exportez votre travail avant de fermer l’application.

## Communauté et licence

Retrouvez le projet sur [GitHub](https://github.com/x-R0b0T-x/Audio-ToolZ), rejoignez la [communauté Telegram](https://t.me/Audio_ToolZ) ou [soutenez son développement](https://www.paypal.com/ncp/payment/GAUJE54VM28T8).

Projet sous licence GPL v3 ; consultez les fichiers de licence du dépôt.

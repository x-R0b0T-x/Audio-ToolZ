<div align="center">
  <img src="https://github.com/user-attachments/assets/e5677deb-fe21-4d32-9495-dfe60b4ffe69" alt="Logo Audio-ToolZ" width="160" height="160" />
  <h1>Audio-ToolZ</h1>
  <p>Découpez, transformez et assemblez vos sons, directement dans votre navigateur.</p>
  <p>Édition audio · Détection BPM · Sélections sur les kicks · Enregistrement · Assemblage et CUE · Export multiformat</p>
  <p><a href="#fonctionnalités">Fonctionnalités</a> · <a href="#formats-et-export">Formats</a> · <a href="#prise-en-main">Prise en main</a></p>
</div>

---

## Présentation

Audio-ToolZ est un éditeur audio à interface française conçu pour travailler sur des fichiers sonores dans le navigateur : préparer un échantillon, isoler un passage, créer une boucle, ajuster un niveau ou assembler plusieurs morceaux en un seul fichier.

Son espace de travail associe une édition sur forme d’onde, des documents ouverts en onglets et une fenêtre de contrôle flottante avec visualisations stéréo. Pour les musiques rythmiques, la détection du tempo et l’aimantation sur les kicks facilitent le placement des sélections.

Les traitements et l’encodage audio sont réalisés côté navigateur. L’export ne nécessite pas d’envoyer le contenu audio à un service d’encodage distant.

## Aperçu

<p align="center">
  <img src="https://github.com/user-attachments/assets/e1e65796-d3d2-409c-bdcf-fe649f2b3a93" alt="Interface d’Audio-ToolZ : espace d’édition audio et fenêtre de contrôle" width="1000" />
</p>

## Fonctionnalités

### Édition sur forme d’onde

- Ouvrir plusieurs fichiers audio et passer de l’un à l’autre grâce aux onglets.
- Créer un document audio vierge.
- Sélectionner une zone pour préparer une découpe ou appliquer un traitement.
- Couper, copier et coller des passages, y compris entre documents ouverts.
- Rogner le fichier pour ne conserver que la sélection.
- Mettre une zone en silence sans supprimer sa durée.
- Sélectionner l’ensemble du document.
- Annuler et rétablir les modifications grâce à un historique par document.
- Agrandir ou réduire la vue, zoomer sur la sélection et revenir à la vue d’ensemble.

### Tempo, kicks et boucles

- Détecter automatiquement un tempo en BPM et repérer des kicks.
- Afficher ou masquer la grille rythmique.
- Activer ou désactiver l’aimantation des sélections sur les kicks détectés.
- Écouter la sélection en boucle, ou le fichier entier lorsqu’aucune zone n’est sélectionnée.

Ces outils sont utiles pour isoler une séquence rythmique ou préparer un échantillon destiné à un travail de production ou de DJ. La détection reste une estimation : sa pertinence dépend du contenu et de la régularité du rythme.

### Effets et transformations

Les effets s’appliquent à une sélection active et disposent d’une préécoute avant validation.

| Traitement | Réglages proposés |
| --- | --- |
| Volume | Gain de −36 à +24 dB |
| Normalisation | Niveau de crête cible de −12 à 0 dBFS |
| Fondus d’entrée et de sortie | Courbes linéaire, exponentielle ou en S, avec aperçu graphique |
| Vitesse | Rapport de 0,5× à 2× |
| Hauteur | Transposition de −12 à +12 demi-tons |
| Conservation de la hauteur | Option WSOLA lors d’un changement de vitesse |

La normalisation repose sur les crêtes du signal ; elle ne correspond pas à une normalisation de sonie en LUFS.

### Lecture et contrôle

- Lecture, pause et arrêt.
- Lecture en boucle, lecture inversée et avance accélérée.
- Réglage du volume d’écoute, de la balance et de la vitesse.
- Activation ou désactivation des canaux gauche et droit.
- Fenêtre de contrôle flottante, déplaçable et repliable.
- Affichage temporel et vumètres stéréo avec maintien des crêtes.
- Trois visualisations : oscilloscope, spectre et forme d’onde colorée selon le niveau.

### Enregistrement et périphériques audio

- Enregistrer depuis un microphone ou une entrée audio accessible au navigateur.
- Choisir le périphérique d’entrée et actualiser la liste des appareils.
- Sélectionner une sortie audio lorsque le navigateur le permet.
- Configurer l’annulation d’écho, la réduction de bruit et le contrôle automatique du gain à l’enregistrement.
- Ouvrir automatiquement l’enregistrement terminé dans un nouvel onglet.
- Mémoriser des préférences d’interface, de périphériques et d’enregistrement dans le navigateur.

L’accès aux entrées audio nécessite une autorisation. Les périphériques disponibles et les traitements effectivement pris en charge dépendent du navigateur et du système.

### Assemblage de fichiers et feuilles CUE

- Ajouter plusieurs fichiers audio ou reprendre les documents déjà ouverts.
- Déposer des fichiers dans la fenêtre d’assemblage.
- Réorganiser les pistes et retirer celles qui ne sont plus nécessaires.
- Renseigner le titre du mix, l’artiste ou le DJ, ainsi que les titres et interprètes des pistes.
- Assembler les morceaux à la suite dans un nouveau document audio.
- Prévisualiser et télécharger une feuille `.cue` contenant les positions de début des pistes.
- Choisir une référence audio WAV ou MP3 dans la feuille CUE générée.
- Importer une feuille `.cue` sur un document audio ouvert et réexporter ses repères.

L’assemblage consiste à juxtaposer les pistes : il ne doit pas être confondu avec un mixage multipiste à superposition ou un enchaînement automatique avec fondus croisés. Le fichier audio assemblé s’exporte depuis la fenêtre d’export ; la feuille CUE se télécharge séparément.

## Formats et export

### Ouverture

Le sélecteur de fichiers propose les formats WAV, MP3, FLAC et OGG. Le décodage dépend de la prise en charge du format et du codec par le navigateur utilisé.

### Export

| Format | Options disponibles |
| --- | --- |
| WAV | PCM 16 bits, PCM 24 bits ou flottant 32 bits |
| MP3 | Débits de 128, 192, 256 ou 320 kbit/s |
| FLAC | Compression sans perte, niveaux proposés : 0, 2 et 5 |
| OGG Vorbis | Qualité réglable de 1 à 10 |

La fenêtre d’export permet de renommer le fichier, de choisir entre le document entier et la sélection active, et de consulter la durée ainsi qu’une estimation de la taille de sortie.

Lorsque le navigateur le prend en charge, une boîte de dialogue native permet de choisir l’emplacement d’enregistrement. Sinon, l’application utilise le téléchargement classique du navigateur.

## Prise en main

1. Ouvrez un ou plusieurs fichiers audio.
2. Sélectionnez une zone sur la forme d’onde et zoomez pour affiner votre travail.
3. Pour une piste rythmique, activez la détection BPM puis l’aimantation sur les kicks si nécessaire.
4. Écoutez votre passage en boucle, découpez-le ou appliquez un effet après préécoute.
5. Exportez le document ou uniquement la sélection dans le format souhaité.

Pour créer une compilation continue, utilisez la fenêtre d’assemblage, ajustez l’ordre et les informations des pistes, puis exportez l’audio et sa feuille CUE.

## À savoir

- La compatibilité des codecs, le choix de sortie audio et les dialogues de fichiers varient selon le navigateur.
- L’enregistrement requiert l’autorisation d’accès au microphone ou à l’entrée audio.
- Les fichiers décodés et l’historique d’édition occupent de la mémoire : les longs enregistrements peuvent être exigeants.
- La mémorisation des préférences ne constitue pas une sauvegarde des documents audio. Exportez votre travail avant de fermer ou de recharger la page.
- Cette présentation décrit les fonctions identifiées dans le code ; elle ne constitue pas une validation de fonctionnement sur tous les navigateurs.

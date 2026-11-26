<div align="center">
  <h1>Audio ToolZ</h1>
  <p><strong>Éditeur audio en français pour découper, transformer et assembler vos sons.</strong></p>
  <p>Windows portable · Traitements locaux · Sans installation</p>
  <img src="src/medias/ZØNYXRobot..png" alt="ZØNYX, la mascotte d'Audio ToolZ" width="260" />
  <p>
    <a href="https://github.com/x-R0b0T-x/Audio-ToolZ/releases/latest"><img alt="Télécharger la dernière version" src="https://img.shields.io/badge/Télécharger-dernière%20version-0B0B0B?style=for-the-badge&logo=github&logoColor=white"></a>
    &nbsp;
    <a href="https://t.me/Audio_ToolZ"><img alt="Rejoindre la communauté Telegram" src="https://img.shields.io/badge/Telegram-rejoindre%20la%20communauté-26A5E4?style=for-the-badge&logo=telegram&logoColor=white"></a>
  </p>
  <p>
    <img alt="Version 1.7" src="https://img.shields.io/badge/version-1.7-0B0B0B?style=flat-square&labelColor=1F1F1F">
    <img alt="Licence GPL v3" src="https://img.shields.io/badge/licence-GPL%20v3-0B0B0B?style=flat-square&labelColor=1F1F1F">
    <img alt="Windows 64 bits" src="https://img.shields.io/badge/plateforme-Windows%2064%20bits-0B0B0B?style=flat-square&labelColor=1F1F1F">
    <img alt="Tauri 2" src="https://img.shields.io/badge/Tauri-2-0B0B0B?style=flat-square&labelColor=1F1F1F">
    <img alt="React 19" src="https://img.shields.io/badge/React-19-0B0B0B?style=flat-square&labelColor=1F1F1F">
  </p>
  <p>
    <a href="#points-forts">Points forts</a> ·
    <a href="#installation">Installation</a> ·
    <a href="#les-effets">Les effets</a> ·
    <a href="#visualisations">Visualisations</a> ·
    <a href="#formats-et-export">Formats et export</a> ·
    <a href="CHANGELOG.md">Journal des modifications</a> ·
    <a href="#communauté-et-licence">Communauté</a>
  </p>
</div>

<br>

<p align="center">
  <img src="prez/01%20Interface.png" alt="L'interface d'Audio ToolZ : forme d'onde, menus, fenêtre de contrôle" width="900" />
</p>

---

## Points forts

Audio ToolZ réunit dans une seule fenêtre l'édition sur forme d'onde, six effets studio avec préécoute en direct, le traitement par lots et l'export dans les formats courants. Les traitements et l'encodage sont réalisés sur votre machine : vos fichiers ne quittent jamais votre ordinateur.

<table>
<tr>
<td width="33%" valign="top">

**Six effets studio**<br>
Égaliseur, limiteur et compresseur, delay, pitcher, fondus et réverbe, réglés pendant la lecture.

</td>
<td width="33%" valign="top">

**Édition précise**<br>
Sélection, couper, coller, rognage, mixage au collage et zoom très fort pour caler chaque coupe.

</td>
<td width="33%" valign="top">

**Tempo et repères**<br>
Détection du BPM, repères rythmiques et aimantation des sélections sur les kicks.

</td>
</tr>
<tr>
<td valign="top">

**Traitement par lots**<br>
Appliquez le même traitement à plusieurs fichiers, assemblez-les ou découpez-les avec une feuille `.cue`.

</td>
<td valign="top">

**Six visualisations**<br>
Oscilloscope, spectre, waveforme colorée, vectorscope, spectrogramme et vumètre.

</td>
<td valign="top">

**100 % local**<br>
Aucun envoi de fichiers : tout est traité sur votre machine, sans installation.

</td>
</tr>
</table>

## Installation

1. Ouvrez la [dernière release](https://github.com/x-R0b0T-x/Audio-ToolZ/releases/latest) et téléchargez l'archive ZIP.
2. Extrayez l'archive entièrement.
3. Ouvrez le dossier `Audio ToolZ` et lancez `Audio ToolZ.exe`.

Le dossier extrait contient exactement trois fichiers, à conserver ensemble :

```text
Audio ToolZ/
├── Audio ToolZ.exe
├── Audio ToolZ.ico
└── Desktop.ini
```

<details>
<summary><b>Notes d'installation : prérequis, avertissement Windows et vérification de l'archive</b></summary>

<br>

- L'application est prévue pour Windows 64 bits et s'appuie sur WebView2.
- L'exécutable n'est pas signé numériquement : Windows peut donc afficher un avertissement au premier lancement.
- Le fichier `Audio.ToolZ.v1.7.zip.sha256.txt` de la release contient l'empreinte SHA-256 de l'archive ; il permet de vérifier que le téléchargement est intact.
- Les archives « Source code » proposées par GitHub contiennent le code du projet, pas l'application prête à lancer.

</details>

## Les effets

Chaque effet s'ouvre depuis le menu Effets. Vous réglez le son pendant la lecture, sur la sélection ou sur le morceau entier, puis vous appliquez le traitement une fois satisfait. Le bouton « ? » de chaque fenêtre explique le rôle des commandes.

### Z-Égaliseur

Égaliseur paramétrique à sept bandes. Chaque bande règle la fréquence, le gain, la largeur Q et la forme du filtre. Le spectre d'entrée et la courbe de réponse globale s'affichent pour équilibrer le son.

<p align="center">
  <img src="prez/03%20Z-Égaliseur.png" alt="Z-Égaliseur, égaliseur paramétrique à sept bandes" />
</p>

### Z-Limit/Comp

Compresseur et limiteur dans une même fenêtre, avec les modes COMP et LIMIT. Il contrôle la dynamique grâce à l'enveloppe, au plafond et à l'affichage de la réduction de gain. Le limiteur agit sur les crêtes d'échantillons : ce n'est pas un limiteur true peak suréchantillonné.

<table>
<tr>
<td width="50%"><img src="prez/05%20Z-Llimiteur.png" alt="Z-Limit/Comp en mode limiteur"></td>
<td width="50%"><img src="prez/06%20Z-Compresseur.png" alt="Z-Limit/Comp en mode compresseur"></td>
</tr>
<tr>
<td align="center"><b>Mode LIMIT.</b> Plafond et réduction de gain.</td>
<td align="center"><b>Mode COMP.</b> Seuil, enveloppe et réduction de gain.</td>
</tr>
</table>

### Z-Delay

Échos calés sur le tempo, en Mono, Stéréo ou Ping-pong. Vous réglez les temps musicaux, les répétitions, le volume d'effet et le panoramique. La détection du BPM est accessible directement dans le panneau.

<p align="center">
  <img src="prez/02%20Z-Ddelay.png" alt="Z-Delay, échos calés sur le tempo" />
</p>

### Z-Pitcher

Modifie la vitesse et la hauteur d'un passage, indépendamment l'une de l'autre, avec le moteur Signalsmith Stretch. Deux grands faders horizontaux règlent la vitesse de 0,5× à 2× et la hauteur de −12 à +12 demi-tons. Le résultat se compare en préécoute avant validation.

<p align="center">
  <img src="prez/07%20Z-Pitcher.png" alt="Z-Pitcher, vitesse et hauteur indépendantes" />
</p>

### Z-Fondus

Adoucit le début ou la fin d'un passage avec un fondu linéaire, exponentiel ou en S.

<p align="center">
  <img src="prez/04%20Z-Fondus.png" alt="Z-Fondus, fondus linéaire, exponentiel ou en S" />
</p>

### Z-Reverbe

Donne de l'espace au son. Trois niveaux se règlent séparément : le signal Direct, les premières réflexions et la traîne de réverbération. Le prédélai peut se caler sur le tempo.

<p align="center">
  <img src="prez/08%20Z-Reverbe.png" alt="Z-Reverbe, niveaux Direct, Réflexions et Réverbération" />
</p>

### Réduction de bruit spectrale

Nettoie une prise en s'appuyant sur un profil de bruit capturé dans l'enregistrement.

## Édition et lecture

- Documents en onglets et édition sur forme d'onde : sélection, couper, copier, coller, rognage, silence, mixage au collage, annuler et rétablir.
- Zoom très fort pour caler chaque coupe avec précision.
- Lecture normale, en boucle ou inversée, avec volume, balance, vitesse et canaux actifs ; la barre d'espace démarre et arrête la lecture.
- Détection du tempo, repères rythmiques et aimantation des sélections.
- Traitement par lots, assemblage de fichiers, import et export de feuilles `.cue`, Auto-Cue et découpe WAV.
- Enregistrement depuis une entrée audio autorisée.

L'assemblage juxtapose les pistes : ce n'est pas un séquenceur multipiste à superposition.

## Visualisations

Six modes accompagnent l'écoute : oscilloscope, spectre, waveforme colorée, vectorscope stéréo, spectrogramme et vumètre à aiguille stéréo. Le dernier choix est mémorisé. Le vumètre indique un niveau RMS en dBFS avec inertie visuelle ; ce n'est pas un instrument VU analogique calibré.

## Formats et export

L'ouverture dépend du fichier, de son conteneur et du décodeur disponible. L'application lit notamment WAV, MP3, FLAC, OGG, AAC, ALAC et AIFF.

| Export | Réglages proposés |
| --- | --- |
| WAV | PCM 16 bits, PCM 24 bits ou flottant 32 bits |
| MP3 | 128, 192, 256 ou 320 kbit/s |
| FLAC | Niveaux de compression 0, 2 ou 5 |
| OGG Vorbis | Qualité de 1 à 10 |

## Didacticiel et vérification de configuration

Au premier lancement, ZØNYX, la mascotte, vous guide à travers les outils. Une page vérifie localement votre configuration : carte mère, processeur, mémoire, carte graphique et périphériques audio. Un contrôle audio sans lecture sonore et une mesure indicative du temps de traitement terminent cette vérification. Le résultat est indicatif : il ne garantit pas les performances pour tous les effets et tous les fichiers. Aucun fichier personnel n'est analysé et rien n'est envoyé. Le didacticiel se rouvre depuis Outils, Paramètres, « Afficher le didacticiel ».

## Bon à savoir

- La détection du tempo reste une estimation qui dépend du contenu audio.
- L'enregistrement nécessite l'autorisation d'accéder à une entrée audio.
- Les longs fichiers et l'historique d'édition peuvent consommer beaucoup de mémoire.
- Les préférences mémorisées ne sauvegardent pas vos documents : exportez votre travail avant de fermer l'application.

## Communauté et licence

Retrouvez le projet sur [GitHub](https://github.com/x-R0b0T-x/Audio-ToolZ), rejoignez la [communauté Telegram](https://t.me/Audio_ToolZ) ou [soutenez son développement](https://www.paypal.com/ncp/payment/GAUJE54VM28T8).

Projet sous licence GPL v3 ; consultez les fichiers de licence du dépôt.

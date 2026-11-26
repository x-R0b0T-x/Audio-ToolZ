<div align="center">
  <h1>Audio ToolZ</h1>
  <p><strong>L'éditeur audio qui comprend votre tempo.</strong></p>
  <p>Sampling · Mastering · Boucles · Remix · 100 % local · Windows portable</p>
  <img src="src/medias/ZØNYXRobot..png" alt="ZØNYX, la mascotte d'Audio ToolZ" width="200" />
  <p>
    <a href="https://github.com/x-R0b0T-x/Audio-ToolZ/releases/latest"><img alt="Télécharger la dernière version" src="https://img.shields.io/badge/Télécharger-v1.7-0B0B0B?style=for-the-badge&logo=github&logoColor=white"></a>
    &nbsp;
    <a href="https://t.me/Audio_ToolZ"><img alt="Rejoindre la communauté Telegram" src="https://img.shields.io/badge/Telegram-communauté-26A5E4?style=for-the-badge&logo=telegram&logoColor=white"></a>
    &nbsp;
    <a href="https://www.paypal.com/ncp/payment/GAUJE54VM28T8"><img alt="Soutenir le projet" src="https://img.shields.io/badge/PayPal-soutenir-00457C?style=for-the-badge&logo=paypal&logoColor=white"></a>
  </p>
  <p>
    <img alt="Version 1.7" src="https://img.shields.io/badge/version-1.7-0B0B0B?style=flat-square&labelColor=1F1F1F">
    <img alt="Licence GPL v3" src="https://img.shields.io/badge/licence-GPL%20v3-0B0B0B?style=flat-square&labelColor=1F1F1F">
    <img alt="Windows 64 bits" src="https://img.shields.io/badge/Windows-64%20bits-0B0B0B?style=flat-square&labelColor=1F1F1F">
    <img alt="Tauri 2" src="https://img.shields.io/badge/Tauri-2-0B0B0B?style=flat-square&labelColor=1F1F1F">
    <img alt="React 19" src="https://img.shields.io/badge/React-19-0B0B0B?style=flat-square&labelColor=1F1F1F">
  </p>
  <p>
    <a href="#le-point-fort--le-tempo-et-laimant-à-kicks">Le point fort</a> ·
    <a href="#pourquoi-audio-toolz">Pourquoi Audio ToolZ ?</a> ·
    <a href="#linterface">L'interface</a> ·
    <a href="#les-6-effets-studio">Les effets</a> ·
    <a href="#outils-dédiés-au-rythme-et-à-lassemblage">Outils</a> ·
    <a href="#formats">Formats</a> ·
    <a href="#télécharger">Télécharger</a> ·
    <a href="#communauté-et-licence">Communauté</a>
  </p>
</div>

---

## Le point fort : le tempo et l'aimant à kicks

Très peu d'éditeurs audio vous aident vraiment à faire des boucles. Audio ToolZ s'en charge :

1. **Il détecte le BPM** du morceau dès l'ouverture du fichier.
2. **Il repère les kicks** et les transitoires de percussion.
3. **Il aimante vos barres de sélection** sur ces kicks : début et fin de sélection tombent exactement sur le temps, sans zoom ni tâtonnement.

Résultat : vous découpez une boucle de 1, 2 ou 4 mesures en quelques secondes, elle tourne sans clic ni décalage, et vous l'exportez. Les effets calés sur le tempo, comme le Z-Delay, restent en rythme avec votre boucle. Producteurs, DJ et beatmakers y trouvent un gain de temps immédiat.

> La détection du tempo est une estimation algorithmique : très fiable sur les morceaux au rythme marqué, elle peut hésiter sur les contenus complexes.

### Une interface soignée, et ZØNYX à vos côtés

Thème sombre, formes d'onde colorées, faders fluides, visualisations en temps réel. **ZØNYX**, la mascotte robot du logiciel, vous accompagne du premier lancement jusqu'à l'export.

---

## Pourquoi Audio ToolZ ?

Vous faites du **sampling** ? Vous avez besoin de couper net un kick, de pitcher un sample sans le dénaturer, d'ajouter un delay Ping-pong qui colle au BPM. Tout ça, sur un seul fichier, sans ouvrir une DAW.

Vous faites du **mastering** ? Vous voulez sculpter les fréquences sur une courbe visuelle, compresser intelligemment en voyant la réduction de gain en temps réel, puis limiter proprement avant d'exporter en WAV 32 bits float.

> Audio ToolZ n'est pas un énième lecteur audio. C'est un **atelier de travail** : forme d'onde précise, six effets studio, traitement par lots, six visualisations temps réel.

---

## L'interface

<p align="center">
  <img src="prez/01%20Interface.png" alt="L'interface principale d'Audio ToolZ" width="900" />
</p>

Ce que vous voyez ici :

- **Forme d'onde stéréo** : Les deux canaux (G et D) s'affichent séparément, en violet et vert. La sélection active (en surbrillance) correspond exactement à la zone qui sera traitée par l'effet ou exportée. Zoomez au maximum pour caler chaque coupe au sample près.
- **Repères BPM** : La barre de statut affiche le tempo détecté (**137.0 BPM** ici), et l'aimant à kicks est activé.
- **Fenêtre de contrôle** : Volume (+0.0 dB), Balance (0 %), Vitesse (1.00×), et en bas un mini-aperçu **Waveforme colorée** pour naviguer sur tout le morceau d'un coup d'œil.
- **Lecture précise** : Curseur à **01:40.049**, sélection de 14 secondes. Lecture normale, en boucle, inversée, ou canal par canal.
- **Onglets** : Ouvrez plusieurs fichiers en même temps et passez de l'un à l'autre sans perdre vos sélections.

---

## Les 6 effets studio

Chaque effet s'ouvre depuis le menu **Effets**. Vous réglez **pendant la lecture**, sur la sélection ou sur le fichier entier. Quand le résultat vous convient, vous cliquez **Appliquer**, et seulement à ce moment-là, la modification est écrite dans la forme d'onde.

---

### Z-Égaliseur : Sculpter le son fréquence par fréquence

<p align="center">
  <img src="prez/03%20Z-Égaliseur.png" alt="Z-Égaliseur paramétrique 7 bandes" width="860" />
</p>

Le Z-Égaliseur est un **égaliseur paramétrique 7 bandes** avec visualisation du spectre en direct. C'est l'outil de base du mastering et du sound design.

**Ce que vous voyez ici :**
- La courbe blanche est la **réponse globale** de votre égalisation, vous la sculptez en déplaçant les points directement sur le graphe.
- Le spectre violet en arrière-plan est le **contenu fréquentiel réel** de votre audio, vous savez exactement où booster ou couper.
- À droite, **7 faders verticaux colorés** (un par bande) pour des réglages précis au demi-dB.
- Chaque bande a sa **fréquence centrale**, son **gain** (ici de −18 à +18 dB) et sa **pente** (12 dB/oct.).

**Dans quel cas l'utiliser ?**
- **Sampling** : vous avez un sample qui manque de punch ? Boostez les bas-médiums (200–400 Hz), coupez les médiums parasites (1–3 kHz), montez les aigus pour l'air.
- **Mastering** : corrigez la balance tonale de votre mix avant d'exporter, trop de graves, médiums voilés, aigus trop agressifs.
- **Boucles** : un sample vocal qui empiète sur votre groove ? Un high-pass à 100 Hz et il disparaît du bas du spectre.

---

### Z-Limit/Comp : Contrôler la dynamique

<table align="center">
<tr>
<td width="50%"><img src="prez/05%20Z-Limiteur.png" alt="Z-Limit/Comp en mode LIMIT" width="440"></td>
<td width="50%"><img src="prez/06%20Z-Compresseur.png" alt="Z-Limit/Comp en mode COMP" width="440"></td>
</tr>
<tr>
<td align="center"><b>Mode LIMIT</b> : Gain +6.9 dB · Plafond 0.0 dBFS · Attaque 1.0 ms · Relâchement 120 ms</td>
<td align="center"><b>Mode COMP</b> : Ratio 4.0 · Seuil −6.0 dBFS · Coude +6.0 · Attaque 7.3 ms · Relâchement 269 ms</td>
</tr>
</table>

Deux outils en un : un **limiteur** et un **compresseur** dans la même fenêtre, avec un affichage graphique de la réduction de gain en temps réel.

**Mode LIMIT, pour la finition :**
- **Gain** (+6.9 dB) : vous montez le niveau global.
- **Plafond** (0.0 dBFS) : le limiteur coupe tout ce qui dépasse, pas d'écrêtage numérique, même après un gros gain.
- **Attaque / Relâchement** : contrôlez la transparence du limiteur. Une attaque rapide protège les crêtes, un relâchement plus long garde la dynamique perceptible.
- La courbe violette est l'**audio traité**, la blanche est la **réduction de gain appliquée en temps réel**.

**Mode COMP, pour la cohérence dynamique :**
- **Seuil** (−6.0 dBFS) : le compresseur intervient dès que le signal passe au-dessus.
- **Ratio** (4.0) : pour 4 dB au-dessus du seuil, vous n'entendez qu'1 dB.
- **Coude** (+6.0) : adoucit l'entrée en compression, la transition est progressive, pas brutale.
- **Compensation** : remonte le volume global après compression pour comparer à niveau égal.

**Dans quel cas l'utiliser ?**
- **Sampling** : compressez un break de batterie pour en faire ressortir les transitoires, le kick claque plus fort, la caisse claire tient dans le mix.
- **Mastering** : limitez le master final à 0 dBFS avec +6 dB de gain, vous gagnez en loudness sans distorsion.
- **Boucles** : uniformisez le niveau d'une boucle vocale pour qu'elle reste audible du début à la fin.

---

### Z-Delay : Des échos qui collent au groove

<p align="center">
  <img src="prez/02%20Z-Delay.png" alt="Z-Delay, échos calés sur le tempo" width="720" />
</p>

Le Z-Delay est un **delay rythmique** avec synchronisation BPM automatique. L'idée : des répétitions qui tombent pile sur le tempo, sans calcul.

**Ce que vous voyez ici :**
- **Temps : 1/4 droite**, un écho toutes les noires, ancré dans la pulsation de votre morceau à 137 BPM.
- **Répétitions : 4**, quatre échos qui s'estompent progressivement.
- **Volume de l'effet : 35 %**, l'effet est présent mais reste en retrait du son direct.
- **Mode Ping-pong** (actif), les échos rebondissent de gauche à droite dans le champ stéréo. Le son tourne, il vit.
- **Panoramique de départ : Gauche 100 %**, le premier écho démarre tout à gauche, les suivants voyagent vers la droite.

**Dans quel cas l'utiliser ?**
- **Sampling** : un delay 1/8 en Ping-pong sur un sample vocal, et vous avez un effet de largeur stéréo instantané.
- **Boucles** : calé sur le BPM, le delay ne déphase jamais votre boucle, les répétitions s'intègrent naturellement.
- **Remix** : glissez un delay 1/4 en mono sur une note synth isolée, ça crée de la profondeur sans charger le mix.

---

### Z-Pitcher : Vitesse et hauteur, indépendamment

<p align="center">
  <img src="prez/07%20Z-Pitcher.png" alt="Z-Pitcher, faders vitesse et hauteur" width="720" />
</p>

Le Z-Pitcher est propulsé par le moteur **Signalsmith Stretch**, l'un des meilleurs algorithmes open-source de time-stretching et pitch-shifting disponibles. La vitesse et la hauteur sont **totalement indépendantes** l'une de l'autre.

**Ce que vous voyez ici :**
- **Vitesse : 1.1×**, le passage joue 10 % plus vite, sans changer la tonalité.
- **Hauteur : −2 demi-tons**, le sample descend de deux demi-tons, sans changer la durée.
- Les deux **grands faders horizontaux** donnent un contrôle précis et intuitif. Chaque cran est visible.

**Dans quel cas l'utiliser ?**
- **Sampling** : vous avez un sample à 90 BPM et votre beat tourne à 110 BPM ? Accélérez à 1.22×, le sample s'aligne sans changer de tonalité.
- **Harmonisation** : dupliquez un passage, pitchez une copie à +3 ou +7 demi-tons, mélangez, vous créez des harmonies vocales ou instrumentales.
- **Transposition** : un sample en Sol mineur dans un projet en La mineur ? Montez de +2 demi-tons, c'est réglé.

---

### Z-Fondus : Des transitions propres, à la forme que vous voulez

<p align="center">
  <img src="prez/04%20Z-Fondus.png" alt="Z-Fondus, fondu sortant en Courbe en S" width="640" />
</p>

Le Z-Fondus gère les **fondus d'entrée et de sortie** avec trois formes de courbe. Ici, un **fondu sortant en Courbe en S** : le son reste fort puis descend doucement avant de disparaître d'un coup, l'effet est naturel, l'oreille ne perçoit pas de coupure brutale.

**Les réglages disponibles :**
- **Entrée / Sortie** : le fondu monte au début ou descend à la fin de la sélection.
- **Linéaire** : la descente est constante, simple et efficace sur du parlé ou des effets.
- **Exponentielle** : la descente est d'abord rapide puis ralentit, donne une impression de "respiration".
- **Courbe en S** : la descente est douce au départ, s'accélère au milieu, puis se referme progressivement, idéale pour la musique, l'oreille ne détecte aucune rupture.

**Dans quel cas l'utiliser ?**
- **Boucles** : un fondu d'entrée en Courbe en S sur votre sample, et le début ne claque plus, la boucle démarre en douceur.
- **Sampling** : nettoyez la fin d'un sample avec un fondu sortant exponentiel, plus de souffle résiduel, plus de clic.
- **Mastering** : terminez votre master par un fondu en S, la fin du morceau s'efface naturellement.

---

### Z-Reverbe : De l'espace, de la profondeur, de la présence

<p align="center">
  <img src="prez/08%20Z-Reverbe.png" alt="Z-Reverbe, tous les réglages détaillés" width="720" />
</p>

Le Z-Reverbe est une **réverbération numérique** avec un contrôle chirurgical sur chaque couche du son. La visualisation carrée à gauche représente la **salle virtuelle**, sa taille change en temps réel selon le paramètre Taille.

**Ce que vous voyez ici :**
- **Prédélai : 20 ms**, l'espace entre le son direct et les premières réflexions. Plus il est long, plus la salle semble grande.
- **Taille : 50**, une salle moyenne, ni studio booth ni cathédrale.
- **Modulation : 20**, légère variation de la traîne pour éviter l'effet "métallique" des reverbs numériques.
- **Diffusion : 70**, les réflexions sont bien réparties dans la salle, le son est enveloppant.
- **Vitesse : 0.60**, la traîne se propage lentement, effet de grande pièce.
- **Décroissance : 2.00**, le son met 2 secondes à disparaître.
- **Amort. aigu : 6000 Hz**, les aigus sont absorbés au-delà de 6 kHz, comme dans une vraie pièce avec des murs et des meubles.
- **Coupe-bas : 100 Hz**, les graves de la réverbe sont filtrés pour éviter de boucher le bas du spectre.
- **Mix Direct / Réflexions / Réverbération** (faders droits) : contrôlez séparément les trois couches. Ici Direct à 100 %, Réflexions à 25 %, Réverbération à 25 %, le son reste présent, l'espace est subtil.
- **Stéréo : 24 %**, la traîne est légèrement élargie dans le champ stéréo.

**Dans quel cas l'utiliser ?**
- **Sampling vocal** : un peu de Prédélai (20–30 ms) + Décroissance courte (0.8 s) + Réflexions légères = présence naturelle sans noyer le sample.
- **Pad et nappes** : Taille 80, Décroissance 4 s, Diffusion haute, votre nappe flotte dans l'espace.
- **Percussion** : Prédélai 0, Décroissance 0.3 s, Coupe-bas à 200 Hz, la reverbe colle au kick sans boucher les graves.
- **Ambiance** : Tempo actif sur le Prédélai, les réflexions tombent en rythme avec votre groove.

---

## Outils dédiés au rythme et à l'assemblage

Au-delà des effets, Audio ToolZ embarque une boîte à outils complète :

<table align="center">
<tr>
<td width="50%" valign="top">

**Édition précise**<br>
Sélection, couper, copier, coller, rognage, silence, mixage au collage, annuler/rétablir. Zoomez jusqu'au niveau du sample individuel pour caler chaque coupe.

</td>
<td width="50%" valign="top">

**Tempo et aimant à kicks**<br>
Le point fort du logiciel, détaillé en haut de cette page : BPM détecté et sélections aimantées aux kicks.

</td>
</tr>
<tr>
<td valign="top">

**Traitement par lots**<br>
Appliquez le même effet à des dizaines de fichiers en une fois. Assemblez plusieurs fichiers bout-à-bout, ou découpez un long fichier avec une feuille `.cue`.

</td>
<td valign="top">

**Six visualisations**<br>
Oscilloscope · Spectre · Waveforme colorée · Vectorscope stéréo · Spectrogramme · Vumètre à aiguille stéréo. Changez de vue pendant la lecture.

</td>
</tr>
<tr>
<td valign="top">

**Réduction de bruit spectrale**<br>
Capturez un profil de bruit sur une zone silencieuse, puis nettoyez toute la prise. Idéal pour les samples enregistrés dans un environnement imparfait.

</td>
<td valign="top">

**Enregistrement direct**<br>
Capturez depuis n'importe quelle entrée audio autorisée (micro, line-in) directement dans l'éditeur, sans sortir de l'application.

</td>
</tr>
</table>

> **Note :** l'assemblage juxtapose les pistes les unes après les autres. Audio ToolZ n'est pas un séquenceur multipiste à superposition de pistes.

---

## Formats

### Lecture : 15 extensions supportées

<div align="center">

| Famille | Extensions |
| --- | --- |
| WAV | `.wav` |
| MP3 | `.mp3` |
| FLAC | `.flac` |
| Ogg (Vorbis, Opus) | `.ogg` `.oga` `.opus` |
| AAC et MPEG-4 | `.aac` `.m4a` `.mp4` |
| AIFF | `.aif` `.aiff` |
| CAF (Apple) | `.caf` |
| Matroska et WebM | `.mka` `.mkv` `.webm` |

</div>

Un décodeur de secours intégré (Symphonia 0.6.1) prend le relais si le décodeur du navigateur échoue. L'ouverture dépend du fichier, de son conteneur et du codec : un fichier qui porte une extension reconnue peut être refusé si son codec spécifique n'est pas pris en charge.

### Export

<div align="center">

| Format | Options |
| --- | --- |
| WAV | PCM 16 bits · PCM 24 bits · Flottant 32 bits |
| MP3 | 128 · 192 · 256 · 320 kbit/s |
| FLAC | Compression 0 · 2 · 5 |
| OGG Vorbis | Qualité 1 à 10 |

</div>

---

## Télécharger

Configuration requise : Windows 10 ou 11 en 64 bits (WebView2 inclus). Aucune installation : l'application est portable.

1. Ouvrez la **[dernière release](https://github.com/x-R0b0T-x/Audio-ToolZ/releases/latest)** et téléchargez l'archive ZIP.
2. Extrayez l'archive entièrement (ne lancez pas l'exe depuis l'archive).
3. Ouvrez le dossier extrait et lancez **`Audio ToolZ.exe`**.

<details>
<summary><b>Notes importantes avant le premier lancement</b></summary>

<br>

- L'application est prévue pour **Windows 64 bits** et nécessite **WebView2** (inclus avec Windows 10/11).
- L'exécutable n'est **pas signé numériquement** : Windows Defender SmartScreen peut afficher un avertissement. Cliquez « Informations complémentaires » puis « Exécuter quand même ».
- Le fichier `Audio.ToolZ.v1.7.zip.sha256.txt` joint à la release contient l'empreinte SHA-256 de l'archive, vérifiez-la si vous avez un doute sur l'intégrité du téléchargement.
- Les archives « Source code » proposées automatiquement par GitHub contiennent **le code source du projet**, pas l'application prête à lancer.

</details>

---

## Bon à savoir

- Le **vumètre** indique un niveau RMS en dBFS avec inertie visuelle, ce n'est pas un instrument VU analogique calibré à −18 dBFS.
- Le **limiteur** agit sur les crêtes d'échantillons (sample peak), ce n'est pas un limiteur true peak suréchantillonné.
- **Vos fichiers ne quittent jamais votre machine** : tous les traitements, encodages et analyses sont réalisés en local.

---

## Communauté et licence

Rejoignez la [communauté Telegram](https://t.me/Audio_ToolZ) pour partager vos retours, signaler un bug ou suivre les prochaines versions.

Soutenez le développement via [PayPal](https://www.paypal.com/ncp/payment/GAUJE54VM28T8) si le projet vous est utile.

Projet open-source sous **licence GPL v3**, consultez les fichiers de licence du dépôt.

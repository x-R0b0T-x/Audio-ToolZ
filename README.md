# Audio ToolZ

Éditeur audio de précision en français. Découpez un passage, préparez une boucle ou assemblez plusieurs pistes, puis exportez le résultat dans le format de votre choix.

[Télécharger Audio ToolZ v1.4 pour Windows](https://github.com/x-R0b0T-x/Audio-ToolZ/releases/tag/v1.4) · [Journal des modifications](CHANGELOG.md)

![Interface d’Audio ToolZ : sélection stéréo, lecture en boucle et analyseur en temps réel](https://github.com/user-attachments/assets/7e1ec358-9beb-4acf-b040-438ef6eb8223)

## Fonctionnalités

- Édition : couper, copier, coller, rogner ou mettre un passage en silence. Ouvrir plusieurs fichiers dans des onglets et annuler ou rétablir les modifications.
- Sélections et boucles : ajuster les bornes pendant la lecture en boucle, zoomer sans déplacer la sélection, détecter le tempo et aligner les bornes sur les kicks.
- Effets avec préécoute : régler le volume, normaliser les crêtes, appliquer des fondus ou modifier la vitesse et la hauteur.
- Enregistrement et analyse : enregistrer depuis une entrée audio et surveiller le signal avec les vumètres, l’oscilloscope, le spectre ou la forme d’onde colorée.
- Assemblage et export : réunir plusieurs pistes, créer une feuille CUE et exporter le fichier entier ou la sélection en WAV, MP3, FLAC ou OGG.

## Version portable pour Windows 64 bits

Aucune installation nécessaire. Extrayez le ZIP, puis lancez `Audio ToolZ.exe` dans le dossier `Audio ToolZ`. Pour l’utiliser sur une clé USB, copiez le dossier complet : les réglages et l’historique des fichiers récents restent dans `user-data`, à côté de l’exécutable.

## Développement

Avec Node.js et npm :

```bash
git clone https://github.com/x-R0b0T-x/Audio-ToolZ.git
cd Audio-ToolZ
npm install
npm run dev
```

Ouvrez `http://localhost:3000`. Utilisez `npm run lint` pour vérifier les types et `npm run build` pour compiler le projet.

# Journal des modifications

## 1.3 — Distribution Windows portable

### Distribution
- Ajout de la configuration de lancement Electron pour l’application web existante.
- Ajout d’une procédure GitHub Actions produisant un ZIP unique avec deux distributions séparées : x86 (32 bits) et x64 (64 bits).
- Inclusion de l’exécutable, des bibliothèques Electron, des traductions, des ressources et de l’icône dans chaque distribution.
- Conservation des préférences dans un dossier user-data à côté de l’exécutable.
- Vérification des archives Electron par SHA-256 et de l’architecture PE de chaque exécutable.
- Ajout d’un manifeste des fichiers et d’une somme SHA-256 du ZIP.
- Publication facultative de la release v1.3 depuis une exécution manuelle de GitHub Actions.

### Documentation
- Refonte du README : présentation, logo redimensionné, fonctionnalités, formats d’export et prise en main.

### Précisions
- Cette version prépare l’emballage des fonctions audio existantes ; elle ne revendique pas de nouveaux effets ou de corrections audio non vérifiées.
- Electron est limité à la branche 43 pour conserver les binaires Windows ia32, supprimés dans Electron 44 et suivants. Prévoir une migration après la fin de prise en charge de cette branche.
- Extraire entièrement le ZIP avant utilisation. Aucun programme d’installation n’est nécessaire.
- Les fichiers internes du moteur peuvent différer de ceux d’une ancienne capture ; Desktop.ini n’est pas requis et n’est pas distribué.
- La vérification de compilation et d’architecture ne remplace pas un essai fonctionnel sur de vrais Windows 32 et 64 bits, notamment pour l’enregistrement et les exports.
- Les exécutables ne sont pas signés numériquement.

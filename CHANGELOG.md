# Journal des modifications

## 1.3 — Windows portable x64

### Distribution
- Distribution Windows 64 bits uniquement ; retrait du paquet x86.
- ZIP contenant directement Audio ToolZ.exe, l’icône, les DLL Electron, les traductions et les ressources nécessaires.
- Préférences conservées dans user-data à côté de l’exécutable.
- Contrôle SHA-256 de l’archive Electron et vérification de l’architecture x64 du fichier PE.
- Manifeste des fichiers et somme SHA-256 du ZIP.
- Procédure manuelle GitHub Actions permettant de compiler puis de créer ou d’actualiser la release v1.3.
- Remplacement de l’ancien ZIP x86-x64 après téléversement réussi du ZIP x64.

### Documentation
- README enrichi : présentation, logo redimensionné, fonctions audio, exports et prise en main.

### Précisions
- Les fonctions audio sont celles du logiciel existant ; aucun nouvel effet ou correctif audio non vérifié n’est revendiqué.
- Branche Electron 43 conservée pour limiter les changements par rapport à la compilation réussie ; sa maintenance devra être suivie.
- Extraire entièrement le ZIP avant utilisation. Aucun programme d’installation nécessaire.
- Les fichiers internes peuvent varier selon le moteur ; Desktop.ini n’est pas distribué.
- La vérification de compilation ne remplace pas les essais fonctionnels sous Windows x64.
- Exécutable non signé numériquement.

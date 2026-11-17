# Journal des modifications

## 1.3 — Windows portable x64

### Distribution corrigée
- Windows 64 bits uniquement, sans paquet x86.
- Intégration de icon.ico dans les ressources de Audio ToolZ.exe pendant la préparation du paquet.
- Métadonnées du programme : Audio ToolZ, version 1.3.0.
- Conservation de la seule langue fr.pak dans locales et lancement du moteur en français.
- Déplacement des mentions Electron et Chromium dans resources/licenses, sans suppression des licences.
- Retrait de LIRE-MOI.txt et MANIFEST-SHA256.txt du dossier principal.
- Conservation de CHANGELOG.md et icon.ico à côté du programme.
- Contrôle SHA-256 du téléchargement Electron, vérification de l’architecture x64 et somme SHA256SUMS.txt jointe séparément à la release.
- Publication manuelle permettant de créer ou de mettre à jour la release v1.3.

### Documentation
- Présentation du logiciel enrichie dans le README : fonctions audio, formats et prise en main.

### Précisions
- Les fonctions audio existantes ne sont pas modifiées par cette préparation.
- Branche Electron 43 conservée par rapport à la compilation précédente ; sa maintenance doit être suivie.
- Extraire entièrement le ZIP avant de lancer Audio ToolZ.exe et conserver les DLL et ressources associées.
- Les préférences restent dans user-data à côté du programme. Exporter les documents audio avant fermeture.
- Cette version ne fonctionne pas sur Windows 32 bits.
- La compilation ne remplace pas les essais fonctionnels sous Windows x64, notamment après réduction des langues.
- Exécutable non signé numériquement.

### Correctifs de navigation — v1.4
- Clic gauche : curseur de départ sans sélection implicite ; Lecture démarre au curseur. Un nouveau clic pendant la lecture repositionne celle-ci.
- Clic droit : définition de la fin de sélection. Le bouton Boucle utilise uniquement une sélection existante.
- Bornes déplaçables avec défilement automatique aux bords, même avec un pointeur immobile et pendant la lecture. Le zoom et la borne opposée sont conservés.
- Ajustement de boucle sans redémarrage lorsque la tête de lecture reste dans les nouvelles bornes.
- Annulation du glissement au changement de document et nettoyage des événements ; fin du glissement au relâchement ou à la perte de focus.
- Vérifications automatiques avant préparation du ZIP ; essais interactifs Windows toujours nécessaires.

# Journal des modifications

## 1.4 — Confort et communauté

- Défilement de la forme d’onde colorée réglé à 240 colonnes par seconde, soit deux fois plus lent que le précédent affichage à 60 Hz. La vitesse audio ne change pas.
- Lien vers la communauté Telegram https://t.me/Audio_ToolZ dans la fenêtre « ? », ouvert dans le navigateur par défaut.
- Historique local des dix derniers fichiers ouverts avec succès, sans doublons, réouverture et bouton « Supprimer les fichiers récents » dans « Fichier » (version Windows).
- Message si un fichier récent a été déplacé, supprimé ou rendu inaccessible. Effacer la liste ne supprime aucun fichier audio.
- Dossier extrait nommé exactement « Audio ToolZ » pour les mises à jour. Le dossier personnel user-data reste hors de l’archive.
- Conservation du paquet x64, de l’icône intégrée, de fr.pak seul et des licences dans resources/licenses.
- Numérotation 1.4.0 dans le paquet et les métadonnées de l’exécutable.

### Vérifications et limites
- Vérifications de syntaxe JavaScript, des types TypeScript, compilation Vite et tests de l’historique avant publication.
- Les essais interactifs du son, du lien externe et de l’affichage sous Windows restent nécessaires. Exécutable non signé.

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

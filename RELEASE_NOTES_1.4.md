### Dezoom automatique — correctif v1.4
- Elargissement progressif de la vue lors du glissement vers un bord, a gauche comme a droite.
- Correction de la mise a jour du bord droit et ajout du glissement du curseur simple.
- Pendant le glissement du curseur, la lecture continue ; le repositionnement audio est valide au relachement, sans devoir appuyer sur Stop.
- Tests de calcul automatiques ; validation interactive Windows encore necessaire.

### Correctifs de navigation — v1.4
- Clic gauche : curseur de départ sans sélection implicite ; Lecture démarre au curseur. Un nouveau clic pendant la lecture repositionne celle-ci.
- Clic droit : définition de la fin de sélection. Le bouton Boucle utilise uniquement une sélection existante.
- Bornes déplaçables avec défilement automatique aux bords, même avec un pointeur immobile et pendant la lecture. Le zoom et la borne opposée sont conservés.
- Ajustement de boucle sans redémarrage lorsque la tête de lecture reste dans les nouvelles bornes.
- Annulation du glissement au changement de document et nettoyage des événements ; fin du glissement au relâchement ou à la perte de focus.
- Vérifications automatiques avant préparation du ZIP ; essais interactifs Windows toujours nécessaires.

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

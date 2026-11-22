# Audio ToolZ 1.6 dev — changements depuis la version 1.5

Version de développement Windows ; ces notes ne constituent pas une annonce de publication stable.

Comparaison avec le tag v1.5. Les fonctionnalités déjà présentes en 1.5, notamment les formats d’import/export, le traitement par lots et le délai synchronisé au BPM, ne sont pas présentées comme de nouvelles fonctionnalités.

## Nouveautés et améliorations

- Égaliseur paramétrique à sept bandes indépendantes, avec fréquence, gain et largeur Q réglables.
- Fréquences initiales des bandes : 63, 136, 294, 632, 1 363, 2 936 et 6 324 Hz.
- Formes de filtre par bande : cloche, plateaux grave et aigu, coupe-bas, coupe-haut, passe-bande, notch et désactivation.
- Pentes sélectionnables de 6, 12, 24, 36 ou 48 dB/octave pour les formes compatibles.
- Courbe de réponse globale et spectre d’entrée stéréo, avec points de bande circulaires et couleurs distinctes.
- Réglage fréquence/gain en glissant les points ; largeur Q à la molette et réglage fin avec Maj.
- Sélecteurs graphiques des formes de filtre et mise en évidence dans la couleur de chaque bande.
- Fenêtre Limiteur / Compresseur avec choix du mode LIMIT ou COMP.
- Compresseur : gain d’entrée, plafond, seuil, ratio, coude, compensation de gain, attaque et relâchement.
- Limiteur : canaux liés pour préserver l’équilibre stéréo et anticipation de 5 ms.
- Plafond réglable de −18 à +12 dBFS ; limitation sur les crêtes d’échantillons, sans mesure true peak suréchantillonnée.
- Graphiques d’entrée/sortie et de réduction de gain, avec indication du seuil ou du plafond.
- Traitement de l’égaliseur et de la dynamique dans un worker, séparé du fil de l’interface.
- Fenêtres d’effets déplaçables et redimensionnables, avec poignée dédiée et dimensions minimales adaptées.
- Présentation harmonisée des effets Volume, Normalisation, Fondus, Vitesse/Hauteur et Délai.
- Saisie numérique directe des valeurs et commandes de réglage harmonisées entre les effets.
- Démarrage Windows en fenêtre maximisée, avec barre de titre et barre des tâches conservées.
- Fenêtre À propos recentrée sur la présentation du logiciel et le changelog depuis la version 1.5.

## Corrections et confort

- Préécoute et rendu final des effets fondés sur un modèle de traitement commun pour réduire les écarts entre écoute et application.
- Traitement limité à la sélection lorsqu’elle existe, en préservant les échantillons situés en dehors.
- Actualisations de préécoute et calculs concurrents gérés pour écarter les résultats devenus obsolètes.
- Compresseur initialisé avec gain à 0 dB, plafond à 0 dBFS et seuil à −6 dBFS.
- Limiteur initialisé avec gain à 0 dB et plafond à 0 dBFS, sans supprimer les plafonds positifs.
- Remise aux valeurs par défaut des commandes de dynamique cohérente avec le mode actif.
- Graphiques et textes adaptés à la taille réelle des fenêtres ; points d’égalisation conservés circulaires.
- Spectre violet plus lisible, avec nuances d’intensité et affichage préservé à l’arrêt.
- Déplacement des points de l’égaliseur limité au glissement volontaire avec le bouton gauche maintenu.
- Valeurs numériques, graduations et légendes des effets rendues plus lisibles et mieux disposées.
- Potards : contour violet au repos, graduations vertes et éclairage vert pendant l’interaction.
- Repère mobile des potards lumineux en vert pendant le réglage, y compris dans le délai.
- Faders : éclairage centré sur la poignée pendant le survol ou la manipulation.
- Croix de fermeture internes blanches au repos et vertes au survol, sans encadrement lumineux ; croix des effets agrandies.
- Flèches de réduction et de dépliage de la fenêtre Contrôle blanches au repos et vertes au survol.
- Boutons et menus du haut sans animation d’agrandissement, avec survols lumineux discrets et couleurs harmonisées.
- Robot agrandi dans À propos, accompagné d’un halo vert tournant ; titre centré en dessous.
- Suppression des mentions de licence et de la liste des raccourcis dans À propos, sans désactiver les raccourcis ni modifier les fichiers de licence.
- Respect de la réduction des animations pour les nouveaux effets visuels.
- Validation Windows renforcée par des tests DSP, de commandes et de préécoute ; exécutable portable accompagné d’une empreinte SHA-256.

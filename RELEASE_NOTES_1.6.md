# Audio ToolZ v1.6

## Ce qui change depuis la version 1.5

La version 1.6 améliore principalement l’égalisation, le contrôle de la dynamique, la navigation dans les boucles et l’ergonomie des effets. Tauri v2, la distribution Windows portable, le décodage de secours Symphonia, les formats d’export, les fichiers CUE et le traitement par lots existaient déjà dans la 1.5 : ils restent disponibles et ne constituent pas des nouveautés de cette version.

## Égaliseur paramétrique sept bandes

- Remplacement de l’égaliseur trois bandes par sept bandes indépendantes.
- Fréquence, gain et largeur Q réglables ; formes de filtre : cloche, plateaux grave et aigu, coupe-bas, coupe-haut, passe-bande, réjecteur et désactivation.
- Pentes sélectionnables pour les formes compatibles.
- Courbe de réponse globale, spectre d’entrée stéréo et repères de bande distincts.
- Glissement des points pour régler fréquence et gain ; molette pour la largeur Q ; Maj pour les réglages fins.
- Sélecteurs graphiques plus contrastés, commandes arrondies et affichage explicite des gains positifs.

## Limiteur / compresseur

- Nouvelle fenêtre de dynamique avec choix LIMIT ou COMP à la place de l’ancien panneau de filtre.
- Gain d’entrée, plafond, attaque et relâchement ; seuil, ratio, coude et compensation en mode compresseur.
- Plafond disponible de −18 à +12 dBFS. Il s’agit d’une limitation des crêtes d’échantillons et non d’une garantie true peak suréchantillonnée.
- Graphique de sortie détaillé, indication de réduction de gain et repères distincts de gain et de plafond.
- Défilement graphique réglable sans modifier la vitesse de lecture du son ; commande placée à droite des autres potards et de mêmes dimensions.
- Retrait des intitulés de groupe Niveau, Enveloppe et Affichage pour alléger la présentation.
- Commandes rapprochées du graphique et suppression de leur barre de défilement ; adaptation de disposition si la largeur manque pour conserver l’accès aux réglages.
- Valeurs initiales : gain et plafond à 0 dB ; seuil du compresseur à −6 dBFS.

## Navigation et boucles

- Poignée verte dans l’aperçu inférieur, redessinée sur la sélection de boucle.
- Déplacement au clic gauche maintenu ; main ouverte au survol et main fermée pendant le glissement.
- Molette vers le haut : élargissement de la portion examinée ; vers le bas : rétrécissement.
- Repositionnement de la poignée sans zoom automatique du grand graphique ; exploration indépendante de la boucle audio en lecture.
- Conservation du cadrage lors des changements de mode de lecture, notamment au retour de la lecture arrière vers la lecture en boucle.

## Écho / délai et contrôle stéréo

- Correction du ping-pong : les répétitions alternent entre les deux canaux au lieu d’être supprimées d’un côté par le panoramique.
- Panoramique à gauche : première répétition à gauche ; à droite : première répétition à droite ; au centre : répétitions mono identiques sur les deux canaux.
- Conservation du son original, des divisions musicales, du nombre de répétitions et du niveau d’effet.
- Balance du panneau Contrôle fondée sur l’atténuation du canal opposé, sans sommation stéréo susceptible d’augmenter le niveau.

## Ergonomie et présentation

- Ouverture des effets sans lancement automatique de la lecture lorsque le morceau est arrêté.
- Préécoute et application fondées sur un modèle commun ; calculs dépassés ignorés.
- Potards gradués, valeurs numériques modifiables et affichage du signe + pour les dB positifs.
- Retrait des infobulles des potards pour ne plus masquer le réglage en cours.
- Boutons légèrement arrondis, couleurs de bandes renforcées et fenêtres d’effets redimensionnables.
- Flèches de la fenêtre Contrôle et croix internes vertes au survol sans cadre lumineux gênant.
- Indicateur d’aimant en bas : vert fixe à l’arrêt ou en pause, halo rythmé pendant la lecture.
- Fenêtre À propos plus compacte, robot plus grand et animé, trois liens communautaires et changelog défilant.

## Nettoyage et fonctions conservées

- Retrait des fenêtres autonomes Volume/Gain et Normalisation ainsi que de leurs accès devenus inutiles.
- Conservation du volume général, des gains des autres effets et des traitements encore nécessaires aux chaînes par lots.
- Retrait des éléments graphiques inutilisés et des migrations appliquées qui ne sont plus référencées par les autres flux.
- Conservation des tests et des fichiers de licence ; ils ne sont pas ajoutés à l’exécutable par le processus de livraison.
- Conservation des formats audio et de Symphonia 0.5 ; aucune migration de décodeur n’est introduite dans cette finalisation.

## Distribution et validation

Le paquet Windows contient Audio ToolZ.exe et SHA256SUMS.txt. La compilation doit réussir les tests audio, les tests de commandes et de préécoute, le contrôle TypeScript et les vérifications des médias intégrés. Une réussite de compilation ne remplace pas les essais visuels et audio dans l’application.

Cette préparation ne crée pas automatiquement de tag ni de publication GitHub.


### Dernières améliorations de lecture et de visualisation

- Crêtes d’entrée et de sortie, réduction de gain et marqueur de seuil distinct actualisés pendant la lecture.
- Effets utilisables sans boucle, sur la sélection ou le morceau entier.
- Nouveau départ en lecture normale après un clic au-delà de la boucle, sans changement de cadrage.
- Effet renommé Delay et texte explicatif simplifié.

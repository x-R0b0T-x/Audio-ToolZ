# Audio ToolZ v1.7 — notes préparatoires

Statut : préparation de la version officielle. Ce document ne constitue pas une publication ni une confirmation de validation de la build finale.

## Nouveautés et corrections

- Z-Pitcher utilise Signalsmith Stretch pour régler indépendamment vitesse et hauteur, avec deux grands faders horizontaux violets, curseurs verts et valeurs lisibles.
- Les résultats périmés sont rejetés ; l’application d’un effet reste protégée tant que le résultat courant n’est pas prêt. Aucun repli silencieux sur l’ancien moteur.
- Barre d’espace : Play/Stop, avec conservation de la préférence de boucle.
- Bandeau des effets : texte blanc pendant l’interaction, puis fondu de 1,5 seconde.
- Potards : crans blancs, cran principal vert lumineux et voisins avec halo réduit, sans anneau lumineux autour du corps.
- Libellés de position progressivement illuminés et panoramique de Z-Delay mieux aligné.
- Triangle de redimensionnement vert au repos, fluo au survol et pendant le redimensionnement.
- Nouvelle page 2 du didacticiel, insérée après l’accueil sans supprimer les pages existantes : scan local de carte mère, CPU, RAM, GPU et audio.
- Scan à défilement lent automatique, trois points animés, scrollbar verte et résultat lisible sous le robot.
- Contrôle audio silencieux et mesure indicative de temps de traitement ; message vert de réussite, rouge de risque de lenteur, ou explication distincte si une vérification échoue.

## Limites du scan

La mesure de traitement dépend aussi de la charge actuelle du PC. Elle n’est ni un minimum matériel officiel ni une garantie pour tous les effets, formats et tailles de fichiers. Une information matérielle indisponible ne prouve pas une incompatibilité.

## Avant publication officielle

1. Valider la dernière révision : tests Node, TypeScript, frontend, Signalsmith, Rust et compilation Windows.
2. Vérifier dans l’application le résultat sous le robot, le défilement jusqu’à la dernière ligne, les faders, les halos et Play/Stop dans Z-Delay.
3. Préparer les métadonnées et le ZIP final 1.7 à partir de la révision validée, puis vérifier à nouveau la build officielle.
4. Promouvoir cette révision vers main et publier le tag v1.7 avec l’archive Windows après confirmation des cibles et du contenu exacts.

Ne pas renommer un ZIP de développement pour le présenter comme une build officielle validée.

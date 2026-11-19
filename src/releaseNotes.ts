export const RELEASE_ADDITIONS = [
  'Passage du paquet Electron à Tauri v2 : exécutable allégé, sans embarquer une copie complète de Chromium et de Node.js ; utilisation de WebView2 sous Windows. Taille exacte à vérifier sur la compilation.',
  'Interface compacte, panneau de contrôle repliable et ancré ; davantage de place pour travailler sur la forme d’onde.',
  'Décodage natif de secours avec Symphonia en complément du décodage Web Audio.',
  'Décodeurs natifs AAC, ALAC, FLAC, MP3, PCM et Vorbis ; conteneurs WAV, AIFF, CAF, ISO MP4, Matroska et Ogg activés. La lecture dépend du codec réel et du conteneur.',
  'Effets studio manuels : égaliseur, filtres, compresseur avec gain automatique, réduction de bruit et délai ; traitement par lots conservé.',
  'Délai : divisions droites, pointées et triolets synchronisées au BPM ; 0 à 16 répétitions ; niveau des échos de 0 à 100 % sans atténuer le son original.',
  'Sélecteur vertical mono / stéréo / ping-pong / off et potard de canal de départ gauche / droite ; potards violets gradués avec indicateur vert.',
  'Ping-pong : alternance des échos entre gauche et droite, y compris depuis une source mono convertie en stéréo.',
  'Indicateurs de sortie stéréo animés à côté des faders : segments colorés, échelle dBFS et maintien de crête.',
  'Textes verts hiérarchisés et halo vert au survol des boutons, sans déplacement de la disposition.',
  'Vue d’ensemble à deux canaux séparés : gauche violet au-dessus, droite vert en dessous ; une source mono reste identifiée comme mono.',
];
export const RELEASE_FIXES = [
  'Suppression des boutons de préréglages dans les fenêtres d’effets, au profit des réglages manuels.',
  'Double-clic de remise à la valeur par défaut pour les faders, potards et sélecteurs d’effets, ainsi que le volume, la balance et la vitesse du panneau de contrôle.',
  'Conservation de la position de lecture lors des transitions de préécoute, de l’application et de l’annulation ; restauration du mode normal ou boucle.',
  'Écoute directe du gain, de l’égalisation et des filtres ; transition lors du remplacement des préécoutes calculées.',
  'Fenêtre À propos limitée à 640 pixels de large, centrée, déplaçable et adaptée aux petits écrans.',
  'Réglages d’effets réinitialisés à chaque nouvelle ouverture.',
];

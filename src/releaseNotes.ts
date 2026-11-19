// Changes since 1.4. Build size depends on the artifact; no unmeasured ratio.
export const RELEASE_ADDITIONS = [
  'Passage du paquet Electron à Tauri v2 : exécutable allégé, sans embarquer une copie complète de Chromium et de Node.js ; utilisation de WebView2 sous Windows. Taille exacte à vérifier sur la compilation.',
  'Interface compacte, panneau de contrôle repliable et ancré ; davantage de place disponible pour travailler sur la forme d’onde.',
  'Décodage natif de secours avec Symphonia (orthographe du moteur), en complément du décodage Web Audio.',
  'Prise en charge native élargie : décodeurs AAC, ALAC, FLAC, MP3, PCM et Vorbis ; conteneurs WAV, AIFF, CAF, ISO MP4, Matroska et Ogg activés. La lecture dépend du codec réel et du conteneur ; tous les fichiers portant une extension ne sont pas garantis.',
  'Effets studio : égaliseur, filtres, compresseur avec gain automatique, réduction de bruit et délai ; préréglages et traitement par lots.',
  'Délai à trois potards gradués : divisions droites, pointées et triolets synchronisées au BPM détecté ; modes mono, stéréo et ping-pong ; 0 à 16 répétitions, zéro sans écho.',
  'Indicateurs de sortie stéréo animés à côté des faders d’effets : segments colorés, échelle dBFS et maintien de crête comme dans le panneau de contrôle.',
  'Double-clic sur les faders et les potards d’effets pour rétablir leur valeur par défaut.',
];
export const RELEASE_FIXES = [
  'Préréglages chargés en préécoute sans fermer la fenêtre ni valider immédiatement le traitement ; seuls Appliquer et Annuler terminent la session.',
  'Conservation de la position de lecture lors des transitions de préécoute, de l’application et de l’annulation ; restauration du mode normal ou boucle.',
  'Réglages de gain, égalisation et filtres en écoute directe ; remplacement de la préécoute avec transition pour les traitements calculés.',
  'Fenêtre À propos ramenée à 640 pixels de large au maximum, centrée, déplaçable et adaptée aux petits écrans ; contenu défilant.',
  'Réglages d’effets réinitialisés à chaque nouvelle ouverture, sans réutiliser par erreur ceux du document précédent.',
];

import {installDescriptions} from './utils/finalUi';
import {installPreviewLoopGuard} from './utils/previewLoopGuard';
import {installContextMenuGuard} from './utils/contextMenuGuard';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {Tutorial} from './components/Tutorial';
import {installControlGestures} from './utils/controlGestures';
import {installTextExceptions} from './utils/textExceptions';
import './index.css';
import './windowClose.css';
import './textReadability.css';

const root = document.getElementById('root')!;
createRoot(root).render(<App />);
installPreviewLoopGuard();
installContextMenuGuard();
installControlGestures(root);
installTextExceptions(root);

installDescriptions(root);

const tutorialHost = document.createElement('div');
tutorialHost.id = 'atz-tutorial-root';
document.body.appendChild(tutorialHost);
createRoot(tutorialHost).render(<Tutorial />);

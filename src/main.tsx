import {installDescriptions} from './utils/finalUi';
import {installPreviewLoopGuard} from './utils/previewLoopGuard';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {installControlGestures} from './utils/controlGestures';
import {installTextExceptions} from './utils/textExceptions';
import './index.css';
import './windowClose.css';
import './textReadability.css';

const root = document.getElementById('root')!;
createRoot(root).render(<App />);
installPreviewLoopGuard();
installControlGestures(root);
installTextExceptions(root);

installDescriptions(root);

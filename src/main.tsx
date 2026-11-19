import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {installControlGestures} from './utils/controlGestures';
import './index.css';

const root = document.getElementById('root')!;
createRoot(root).render(<App />);
installControlGestures(root);

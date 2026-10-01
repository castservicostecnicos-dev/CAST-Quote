import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { firebaseService } from './services/firebase';

// Inicialização e verificação de conectividade com o Cloud Firestore
firebaseService.testConnection().then((connected) => {
  if (connected) {
    firebaseService.initDefaults().catch(() => {});
  }
}).catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

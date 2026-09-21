import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { firebaseService } from './services/firebase';

// Inicialização e verificação de conectividade com o Cloud Firestore
firebaseService.testConnection().then(() => {
  firebaseService.initDefaults().catch((err) => {
    console.warn('Erro ao inicializar dados padrão no Firestore:', err);
  });
}).catch((err) => {
  console.warn('Verificação de conexão Firestore:', err);
});

// Padronização global de caixa:
// - Todos os campos de texto e áreas de texto -> MAIÚSCULAS
// - E-mails -> letras minúsculas obrigatórias
// - Senhas -> caixa mista (ambas maiúsculas e minúsculas preservadas)
if (typeof window !== 'undefined') {
  document.addEventListener(
    'input',
    (e) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (!target || !target.tagName) return;

      if (target.type === 'email') {
        const val = target.value;
        if (val && val !== val.toLowerCase()) {
          const start = target.selectionStart;
          const end = target.selectionEnd;
          target.value = val.toLowerCase();
          if (start !== null && end !== null) target.setSelectionRange(start, end);
        }
      } else if (
        target.type === 'password' ||
        target.type === 'color' ||
        target.type === 'file' ||
        target.type === 'checkbox' ||
        target.type === 'radio'
      ) {
        // Preserva senhas como digitadas (maiúsculas e minúsculas)
        return;
      } else if (
        (target.tagName === 'INPUT' && (target.type === 'text' || target.type === 'search' || !target.type)) ||
        target.tagName === 'TEXTAREA'
      ) {
        const val = target.value;
        if (val && val !== val.toUpperCase()) {
          const start = target.selectionStart;
          const end = target.selectionEnd;
          target.value = val.toUpperCase();
          if (start !== null && end !== null) target.setSelectionRange(start, end);
        }
      }
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

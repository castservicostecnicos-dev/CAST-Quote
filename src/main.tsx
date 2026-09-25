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

// Padronização global de regras de caixa:
// 1. Senhas: aceita tanto maiúsculas quanto minúsculas exatamente como digitadas (caixa mista).
// 2. E-mails: estritamente em letras minúsculas.
// 3. Demais campos: estritamente em letras maiúsculas.
function isPasswordField(target: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (target.type === 'password') return true;
  if (target.getAttribute('data-password') === 'true') return true;
  if (target.classList?.contains('password-field') || target.classList?.contains('mixed-case-field')) return true;

  const name = (target.getAttribute('name') || '').toLowerCase();
  const id = (target.getAttribute('id') || '').toLowerCase();
  const autocomplete = (target.getAttribute('autocomplete') || '').toLowerCase();
  const placeholder = (target.getAttribute('placeholder') || '').toLowerCase();
  const dataRole = (target.getAttribute('data-role') || '').toLowerCase();

  if (name.includes('password') || name.includes('senha')) return true;
  if (id.includes('password') || id.includes('senha')) return true;
  if (autocomplete.includes('password')) return true;
  if (placeholder.includes('senha') || placeholder.includes('password')) return true;
  if (dataRole === 'password') return true;

  return false;
}

function isEmailField(target: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (target.type === 'email') return true;
  if (target.classList?.contains('email-field') || target.classList?.contains('lowercase-field') || target.classList?.contains('email-text')) return true;
  if (target.getAttribute('data-email') === 'true') return true;

  const name = (target.getAttribute('name') || '').toLowerCase();
  const id = (target.getAttribute('id') || '').toLowerCase();
  const autocomplete = (target.getAttribute('autocomplete') || '').toLowerCase();
  const placeholder = (target.getAttribute('placeholder') || '').toLowerCase();
  const val = (target.value || '').toLowerCase();

  if (name.includes('email') || name.includes('e-mail') || name.includes('mail')) return true;
  if (id.includes('email') || id.includes('e-mail') || id.includes('mail')) return true;
  if (autocomplete.includes('email')) return true;
  if (placeholder.includes('@') || placeholder.includes('email') || placeholder.includes('e-mail')) return true;
  if (val.includes('@')) return true;

  return false;
}

function isSpecialNonTextField(target: HTMLInputElement | HTMLTextAreaElement): boolean {
  const t = target.type;
  return (
    t === 'color' ||
    t === 'file' ||
    t === 'checkbox' ||
    t === 'radio' ||
    t === 'range' ||
    t === 'number' ||
    t === 'date' ||
    t === 'time' ||
    t === 'datetime-local'
  );
}

if (typeof window !== 'undefined') {
  const handleInputEvent = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (!target || !target.tagName) return;

    // Regra 1: Senhas mantêm maiúsculas e minúsculas intactas (NENHUMA transformação)
    if (isPasswordField(target)) {
      return;
    }

    // Campos de controles não-textuais (checkbox, date, file, etc.)
    if (isSpecialNonTextField(target)) {
      return;
    }

    // Regra 2: E-mails e campos com '@' estritamente em minúsculas
    if (isEmailField(target)) {
      const val = target.value;
      if (val && val !== val.toLowerCase()) {
        const start = target.selectionStart;
        const end = target.selectionEnd;
        target.value = val.toLowerCase();
        if (start !== null && end !== null) target.setSelectionRange(start, end);
      }
      return;
    }

    // Regra 3: Demais campos (text, search, textarea, etc.) em maiúsculas (EXCETO se tiver '@')
    if (
      (target.tagName === 'INPUT' && (target.type === 'text' || target.type === 'search' || target.type === 'tel' || target.type === 'url' || !target.type)) ||
      target.tagName === 'TEXTAREA'
    ) {
      const val = target.value;
      if (val && (val.includes('@') || isEmailField(target))) {
        if (val !== val.toLowerCase()) {
          const start = target.selectionStart;
          const end = target.selectionEnd;
          target.value = val.toLowerCase();
          if (start !== null && end !== null) target.setSelectionRange(start, end);
        }
        return;
      }

      if (val && val !== val.toUpperCase()) {
        const start = target.selectionStart;
        const end = target.selectionEnd;
        target.value = val.toUpperCase();
        if (start !== null && end !== null) target.setSelectionRange(start, end);
      }
    }
  };

  document.addEventListener('input', handleInputEvent, true);
  document.addEventListener('change', handleInputEvent, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

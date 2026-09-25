import React, { useState } from 'react';
import { X, UserPlus, Check, Loader2, Eye, ShieldCheck, Mail, Cloud } from 'lucide-react';
import { Client } from '../types';
import { api } from '../services/api';

interface QuickClientModalProps {
  isOpen: boolean;
  companyId: string;
  onClose: () => void;
  onClientCreated: (client: Client) => void;
}

export const QuickClientModal: React.FC<QuickClientModalProps> = ({
  isOpen,
  companyId,
  onClose,
  onClientCreated
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [document, setDocument] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nome do cliente é obrigatório.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newClient = await api.createClient({
        company_id: companyId || 'comp-master-cast',
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        document: document.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim() || 'SP',
        notes: 'Cadastrado rapidamente pelo formulário de orçamento/OS'
      });

      onClientCreated(newClient);
      onClose();
      // Reset
      setName('');
      setPhone('');
      setEmail('');
      setDocument('');
      setAddress('');
      setCity('');
    } catch (err: any) {
      console.error('Erro ao cadastrar cliente rápido:', err);
      setError(err.message || 'Erro ao cadastrar cliente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex flex-col justify-end sm:justify-center items-center bg-black/75 p-0 sm:p-3 backdrop-blur-xs overscroll-contain overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-y-auto max-h-[92dvh] sm:max-h-[90vh] pb-24 sm:pb-6 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Cadastro Rápido de Cliente</h3>
              <p className="text-[11px] text-slate-400">Salvo no Firebase Firestore e vinculado ao documento</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visualização em Tempo Real (Mobile Live Feedback) */}
        <div className="m-4 mb-0 p-3 rounded-xl bg-slate-900 text-white shadow-xs border border-slate-800 shrink-0">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 pb-1.5 border-b border-slate-800">
            <span className="flex items-center gap-1.5 text-blue-400 font-bold">
              <Eye className="w-3.5 h-3.5" />
              Visualização em Tempo Real:
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-300 text-[10px] font-mono">
              {name ? 'Digitando' : 'Aguardando'}
            </span>
          </div>
          <div className="pt-2 space-y-1 text-xs">
            <div className="flex items-baseline gap-2">
              <span className="text-slate-400 text-[11px] w-16 shrink-0">Nome:</span>
              <span className="font-bold text-white truncate text-sm">
                {name || <span className="text-slate-500 italic font-normal">Digite o nome abaixo...</span>}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px] w-16 shrink-0">Telefone:</span>
              <span className="font-mono text-emerald-400">
                {phone || <span className="text-slate-500 italic font-sans font-normal">--</span>}
              </span>
              <span className="text-slate-500 text-[10px]">|</span>
              <span className="text-slate-400 text-[11px]">E-mail:</span>
              <span className="font-mono text-blue-300 truncate">
                {email || <span className="text-slate-500 italic font-sans font-normal">--</span>}
              </span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 text-xs flex-1">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-800 mb-1 text-xs">
              Nome Completo / Razão Social <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)}
              placeholder="Ex: João da Silva ou Empresa Exemplo Ltda"
              className="w-full rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1 text-xs">Telefone / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)}
                placeholder="(11) 98765-4321"
                className="w-full rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1 text-xs">CPF ou CNPJ</label>
              <input
                type="text"
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)}
                placeholder="000.000.000-00"
                className="w-full rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1 text-xs flex items-center justify-between">
                <span>E-mail (Google Drive)</span>
                <span className="text-[10px] text-blue-600 font-normal">Acesso Drive</span>
              </label>
              <input
                id="quick-client-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)}
                placeholder="cliente@email.com"
                className="email-field lowercase-field w-full rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1 text-xs">Cidade / UF</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)}
                  placeholder="São Paulo"
                  className="flex-1 rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                />
                <input
                  type="text"
                  maxLength={2}
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)}
                  placeholder="SP"
                  className="w-16 rounded-xl border border-slate-300 p-3 sm:p-2.5 text-center uppercase text-base sm:text-sm font-bold text-slate-900 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1 text-xs">Endereço Completo</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)}
              placeholder="Rua, Número, Complemento, Bairro"
              className="w-full rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
            />
          </div>

          {/* Badge de Persistência Cloud Firestore */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-none" />
            <span className="leading-tight">
              <strong>Persistência em Nuvem:</strong> Salvo no Firebase Firestore para não apagar após novos deploys.
            </span>
          </div>

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition text-xs sm:text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold shadow-xs transition text-xs sm:text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Cadastrando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Cadastrar e Vincular</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

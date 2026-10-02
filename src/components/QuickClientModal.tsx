import React, { useState, useRef, useEffect } from 'react';
import { X, UserPlus, Check, Loader2, Plus, Sparkles, Building, Phone, Mail, MapPin } from 'lucide-react';
import { Client } from '../types';
import { api } from '../services/api';

interface QuickClientModalProps {
  isOpen: boolean;
  companyId: string;
  onClose: () => void;
  onClientCreated: (client: Client, shouldLink?: boolean) => void;
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
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setPhone('');
      setEmail('');
      setDocument('');
      setAddress('');
      setCity('');
      setState('SP');
      setError(null);
      setSuccessToast(null);
      setLoading(false);
      setTimeout(() => nameInputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const saveClientData = async (keepOpenForAnother: boolean) => {
    if (!name.trim()) {
      setError('Por favor, informe o Nome Completo ou Razão Social do cliente.');
      nameInputRef.current?.focus();
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
        state: state.trim().toUpperCase() || 'SP',
        notes: 'Cadastrado rapidamente pelo formulário'
      });

      const clientFullName = newClient.name;

      if (keepOpenForAnother) {
        // Salva e notifica componente pai
        onClientCreated(newClient, false);

        // Feedback positivo de sucesso
        setSuccessToast(`Cliente "${clientFullName}" cadastrado com sucesso! Pronto para cadastrar o próximo.`);
        setTimeout(() => setSuccessToast(null), 4000);

        // Limpa campos para o próximo cadastro em sequência
        setName('');
        setPhone('');
        setEmail('');
        setDocument('');
        setAddress('');
        setCity('');
        setState('SP');
        setTimeout(() => nameInputRef.current?.focus(), 100);
      } else {
        // Salva e vincula direto ao documento aberto
        onClientCreated(newClient, true);
        onClose();
      }
    } catch (err: any) {
      console.error('Erro ao cadastrar cliente rápido:', err);
      setError(err.message || 'Erro ao cadastrar cliente. Verifique os dados digitados.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveClientData(false);
  };

  const handleSaveAndAnother = async (e: React.MouseEvent) => {
    e.preventDefault();
    await saveClientData(true);
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
              <p className="text-[11px] text-slate-400">Preencha o nome completo para vincular ao orçamento/OS</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback de sucesso em sequência */}
        {successToast && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 text-xs flex-1">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Nome Completo */}
          <div>
            <label className="block font-bold text-slate-800 mb-1 text-xs">
              Nome Completo do Cliente ou Razão Social <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: João da Silva Santos ou Tech Solutions Ltda"
              className="w-full rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 font-semibold placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              O nome completo informado será exibido no cabeçalho do documento e no PDF.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1 text-xs">Telefone / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
                placeholder="000.000.000-00"
                className="w-full rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1 text-xs">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder="cliente@email.com"
                className="w-full rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-2xs lowercase"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-800 mb-1 text-xs">Cidade / UF</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="São Paulo"
                  className="flex-1 rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                />
                <input
                  type="text"
                  maxLength={2}
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
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
              placeholder="Rua, Número, Complemento, Bairro"
              className="w-full rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
            />
          </div>

          {/* Footer buttons com suporte a múltiplos clientes em sequência */}
          <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition text-xs sm:text-sm cursor-pointer"
            >
              Fechar
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveAndAnother}
                disabled={loading || !name.trim()}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold transition text-xs sm:text-sm disabled:opacity-50 cursor-pointer"
                title="Salva este cliente e mantém o formulário aberto para cadastrar outro na sequência"
              >
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Salvar e Cadastrar Outro</span>
              </button>

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold shadow-xs transition text-xs sm:text-sm cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Cadastrar e Vincular</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

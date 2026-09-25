import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Building,
  UserCheck,
  Boxes,
  CheckCircle2,
  AlertCircle,
  Cloud,
  Database,
  Eye,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Client } from '../types';

interface ClientsListProps {
  onSelectTab?: (tab: string) => void;
}

export const ClientsList: React.FC<ClientsListProps> = ({ onSelectTab }) => {
  const { user, activeCompany, companies, isDev, isSupervisor, isAdmin } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  // Form inputs
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    loadClients();
  }, [activeCompany?.id, user?.role]);

  const [activeFieldInfo, setActiveFieldInfo] = useState<{ label: string; value: string } | null>(null);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await api.getClients(activeCompany?.id, user?.role);
      setClients(data);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const openNewModal = () => {
    setClientToEdit(null);
    setSelectedCompanyId(activeCompany?.id || (companies.length > 0 ? companies[0].id : 'comp-master-cast'));
    setName('');
    setDocument('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('');
    setState('SP');
    setNotes('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setClientToEdit(client);
    setSelectedCompanyId(client.company_id || activeCompany?.id || (companies.length > 0 ? companies[0].id : 'comp-master-cast'));
    setName(client.name);
    setDocument(client.document || '');
    setEmail(client.email || '');
    setPhone(client.phone || '');
    setAddress(client.address || '');
    setCity(client.city || '');
    setState(client.state || 'SP');
    setNotes(client.notes || '');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Por favor, informe o Nome ou Razão Social do cliente.');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const targetCompanyId =
        (isDev && selectedCompanyId ? selectedCompanyId : null) ||
        activeCompany?.id ||
        selectedCompanyId ||
        (companies.length > 0 ? companies[0].id : 'comp-master-cast');

      const payload = {
        company_id: targetCompanyId,
        name: name.trim(),
        document: document.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase() || 'SP',
        notes: notes.trim()
      };

      if (clientToEdit) {
        const updated = await api.updateClient(clientToEdit.id, payload);
        setClients((prev) =>
          prev.map((c) => (c.id === clientToEdit.id ? { ...c, ...payload, ...updated } : c))
        );
        showFeedback('Cliente atualizado com sucesso!');
      } else {
        const created = await api.createClient(payload);
        setClients((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
        showFeedback('Cliente cadastrado com sucesso!');
      }

      setModalOpen(false);
      loadClients();
    } catch (err: any) {
      console.error('Erro ao salvar cliente:', err);
      setFormError(err.message || 'Erro inesperado ao salvar cliente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`Deseja excluir o cliente "${client.name}"?`)) return;
    setClients((prev) => prev.filter((c) => c.id !== client.id));
    try {
      await api.deleteClient(client.id);
      showFeedback('Cliente excluído com sucesso!');
      loadClients();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
      loadClients();
    }
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.document && c.document.includes(searchTerm)) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="fixed top-20 right-5 z-50 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Cadastros Hub Switcher */}
      {onSelectTab && (
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 overflow-x-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Cadastros:</span>
          <button
            onClick={() => onSelectTab('clients')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-2xs cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Clientes ({clients.length})</span>
          </button>
          <button
            onClick={() => onSelectTab('technicians')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>Técnicos</span>
          </button>
          <button
            onClick={() => onSelectTab('services')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <Boxes className="w-3.5 h-3.5 text-slate-500" />
            <span>Serviços & Materiais</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Clientes Cadastrados
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Base de clientes vinculada à empresa {activeCompany?.name || 'CAST Quote'}
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl bg-white p-3.5 border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por nome, CPF/CNPJ, e-mail ou telefone..."
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-600"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2" />
          <p className="text-xs font-semibold">Carregando clientes...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="p-12 text-center text-slate-400 space-y-2 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <Users className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Nenhum cliente encontrado</p>
          <p className="text-xs text-slate-400">
            {searchTerm ? 'Tente ajustar os termos da pesquisa.' : 'Cadastre seu primeiro cliente para agilizar a criação de orçamentos e OS.'}
          </p>
          <div className="pt-2">
            <button
              onClick={openNewModal}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition"
            >
              Cadastrar Cliente
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs flex-none">
                      {client.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{client.name}</h3>
                      {client.document && (
                        <p className="text-[11px] text-slate-400 font-medium">Doc: {client.document}</p>
                      )}
                    </div>
                  </div>
                  {isDev && client.company_name && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100">
                      {client.company_name}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-none" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2 lowercase">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-none" />
                      <span className="truncate lowercase">{client.email}</span>
                    </div>
                  )}
                  {(client.city || client.address) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-none" />
                      <span className="truncate">
                        {[client.address, client.city, client.state].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  {client.notes && (
                    <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-100 mt-2 line-clamp-2">
                      "{client.notes}"
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100">
                <button
                  onClick={() => openEditModal(client)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                  title="Editar cliente"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(client)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                  title="Excluir cliente"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo/Editar Cliente - Otimizado para Mobile e Desktop */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/75 p-0 sm:p-4 backdrop-blur-xs overscroll-contain overflow-y-auto">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-2xl border border-slate-200 overflow-y-auto max-h-[92dvh] sm:max-h-[90vh] pb-28 sm:pb-6 flex flex-col animate-in slide-in-from-bottom-6 sm:fade-in sm:zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    {clientToEdit ? 'Editar Cliente' : 'Novo Cliente'}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Armazenamento permanente no Firebase Firestore
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            {/* Visualização em Tempo Real (Mobile Live Feedback) */}
            <div className="mb-3.5 p-3 rounded-xl bg-slate-900 text-white shadow-xs border border-slate-800">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 pb-1.5 border-b border-slate-800">
                <span className="flex items-center gap-1.5 text-blue-400 font-bold">
                  <Eye className="w-3.5 h-3.5" />
                  Visualização em Tempo Real (Digitando):
                </span>
                <span className="px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-300 text-[10px] font-mono">
                  {name ? 'Preenchendo' : 'Aguardando'}
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
                  <span className="text-slate-400 text-[11px]">Doc:</span>
                  <span className="font-mono text-slate-300">
                    {document || <span className="text-slate-500 italic font-sans font-normal">--</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px] w-16 shrink-0">E-mail:</span>
                  <span className="font-mono text-blue-300 truncate">
                    {email || <span className="text-slate-500 italic font-sans font-normal">cliente@email.com</span>}
                  </span>
                </div>
              </div>
            </div>

            {formError && (
              <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-none" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              {isDev && !activeCompany && (
                <div>
                  <label className="block font-semibold text-purple-900 mb-1">
                    Empresa Vinculada (Modo DEV Independente) *
                  </label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full rounded-xl border border-purple-300 bg-purple-50/70 p-2.5 text-sm font-semibold text-purple-950 focus:ring-2 focus:ring-purple-500"
                  >
                    {companies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name} {comp.cnpj ? `(${comp.cnpj})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Nome do Cliente */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 text-xs">
                  Nome Completo / Razão Social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={(e) => {
                    setActiveFieldInfo({ label: 'Nome', value: e.target.value });
                    setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                  }}
                  placeholder="Nome do cliente ou empresa..."
                  className="w-full rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                />
              </div>

              {/* Documento e Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1 text-xs">CPF ou CNPJ</label>
                  <input
                    type="text"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    onFocus={(e) => {
                      setActiveFieldInfo({ label: 'Documento', value: e.target.value });
                      setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                    }}
                    placeholder="000.000.000-00"
                    className="w-full rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1 text-xs">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onFocus={(e) => {
                      setActiveFieldInfo({ label: 'Telefone', value: e.target.value });
                      setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                    }}
                    placeholder="(11) 99999-9999"
                    className="w-full rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                  />
                </div>
              </div>

              {/* E-mail com integração Google Drive */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-blue-950 text-xs flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    E-mail do Cliente (Google Drive & Contato)
                  </label>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-semibold flex items-center gap-1">
                    <Cloud className="w-3 h-3" />
                    Liberação Drive
                  </span>
                </div>
                <input
                  id="client-email-input"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  onFocus={(e) => {
                    setActiveFieldInfo({ label: 'E-mail', value: e.target.value });
                    setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                  }}
                  placeholder="exemplo@gmail.com"
                  className="email-field lowercase-field w-full rounded-xl border border-blue-300 bg-white p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                />
                <p className="text-[11px] text-blue-900/80 leading-relaxed">
                  💡 <strong>Google Drive:</strong> Todas as fotos e arquivos PDF gerados para este cliente serão organizados no repositório em nuvem e a pasta poderá ser compartilhada com este e-mail.
                </p>
              </div>

              {/* Endereço */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 text-xs">Endereço (Rua, Número, Bairro)</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onFocus={(e) => {
                    setActiveFieldInfo({ label: 'Endereço', value: e.target.value });
                    setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                  }}
                  placeholder="Ex: Av. Paulista, 1000 - Bela Vista"
                  className="w-full rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                />
              </div>

              {/* Cidade e UF */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-800 mb-1 text-xs">Cidade</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onFocus={(e) => {
                      setActiveFieldInfo({ label: 'Cidade', value: e.target.value });
                      setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                    }}
                    placeholder="São Paulo"
                    className="w-full rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1 text-xs">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    onFocus={(e) => {
                      setActiveFieldInfo({ label: 'UF', value: e.target.value });
                      setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                    }}
                    placeholder="SP"
                    className="w-full rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 uppercase font-bold text-center placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 text-xs">Observações do Cliente</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onFocus={(e) => {
                    setActiveFieldInfo({ label: 'Observações', value: e.target.value });
                    setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                  }}
                  placeholder="Informações adicionais, referências ou detalhes de atendimento..."
                  className="w-full rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition shadow-2xs"
                />
              </div>

              {/* Badge de Persistência Cloud Firestore */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-none" />
                <span className="leading-tight">
                  <strong>Banco de Dados em Nuvem (Firebase Cloud Firestore):</strong> Registro gravado de forma persistente, preservado permanentemente mesmo após novos deploys.
                </span>
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer transition text-xs sm:text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition cursor-pointer shadow-md flex items-center gap-2 text-xs sm:text-sm"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Salvando no Firestore...</span>
                    </>
                  ) : clientToEdit ? (
                    'Atualizar Cliente'
                  ) : (
                    'Salvar Cliente'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

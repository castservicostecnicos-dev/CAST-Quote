import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Copy,
  Trash2,
  Download,
  Share2,
  Cloud,
  FileSpreadsheet,
  ArrowRightCircle,
  MoreVertical,
  Building,
  PenTool,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Quote } from '../types';
import { exportQuotesToExcel } from '../utils/excelExporter';
import { SignatureModal } from './SignatureModal';

interface QuotesListProps {
  onNewQuote: () => void;
  onEditQuote: (quote: Quote) => void;
  onViewQuote: (quote: Quote) => void;
  onOpenPdf: (quote: Quote) => void;
  onOpenShare: (quote: Quote) => void;
  onOpenDrive?: (quote: Quote) => void;
}

export const QuotesList: React.FC<QuotesListProps> = ({
  onNewQuote,
  onEditQuote,
  onViewQuote,
  onOpenPdf,
  onOpenShare,
  onOpenDrive
}) => {
  const { user, activeCompany, isDev, isSupervisor, isAdmin } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Quick Signature Modal
  const [signingQuote, setSigningQuote] = useState<Quote | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  const handleOpenSignature = (q: Quote) => {
    setSigningQuote(q);
    setIsSignatureModalOpen(true);
  };

  const handleConfirmSignature = async (sigData: string) => {
    if (!signingQuote) return;
    try {
      await api.saveQuoteSignature(signingQuote.id, {
        client_signature: sigData,
        client_signed_at: new Date().toISOString()
      });
      loadQuotes();
    } catch (err: any) {
      console.error('Erro ao salvar assinatura:', err);
      alert('Erro ao salvar assinatura: ' + (err.message || 'Tente novamente'));
    }
  };

  useEffect(() => {
    loadQuotes();
  }, [activeCompany?.id, user?.role, statusFilter]);

  const loadQuotes = async () => {
    setLoading(true);
    try {
      const data = await api.getQuotes({
        companyId: activeCompany?.id,
        userRole: user?.role,
        status: statusFilter,
        search: searchTerm
      });
      setQuotes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadQuotes();
  };

  const handleDuplicate = async (quote: Quote) => {
    if (!confirm(`Deseja duplicar o orçamento #${quote.quote_number}?`)) return;
    try {
      const res = await api.duplicateQuote(quote.id);
      alert(res.message);
      loadQuotes();
    } catch (err: any) {
      alert('Erro ao duplicar orçamento: ' + err.message);
    }
  };

  const handleDelete = async (quote: Quote) => {
    if (!confirm(`Atenção: tem certeza que deseja excluir o orçamento #${quote.quote_number}?`)) return;
    try {
      await api.deleteQuote(quote.id);
      loadQuotes();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const handleConvertToWorkOrder = async (quote: Quote) => {
    if (!confirm(`Deseja converter o orçamento #${quote.quote_number} em uma nova Ordem de Serviço com todos os itens, valores e fotos?`)) {
      return;
    }
    try {
      const res = await api.createWorkOrderFromQuote(quote.id);
      alert(res.message);
      loadQuotes();
    } catch (err: any) {
      alert('Erro ao converter em OS: ' + err.message);
    }
  };

  const formatBrl = (val: number) =>
    (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aprovado':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Rejeitado':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Enviado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Cancelado':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Orçamentos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Gerenciamento completo de propostas comerciais e orçamentos técnicos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportQuotesToExcel(quotes, activeCompany?.name)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
            title="Exportar listagem para Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden md:inline">Exportar Excel</span>
          </button>

          {isSupervisor && (
            <button
              onClick={onNewQuote}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Orçamento</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl bg-white p-3.5 sm:p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearch} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por número, cliente..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-600"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shrink-0"
          >
            Filtrar
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-blue-600"
          >
            <option value="ALL">Todos os Status</option>
            <option value="Rascunho">Rascunho</option>
            <option value="Enviado">Enviado</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Rejeitado">Rejeitado</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Quotes Table / Mobile Cards */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2" />
            <p className="text-xs font-semibold">Carregando orçamentos...</p>
          </div>
        ) : quotes.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">Nenhum orçamento encontrado</p>
            <p className="text-xs text-slate-500">Crie um novo orçamento para começar</p>
          </div>
        ) : (
          <>
            {/* MOBILE CARDS VIEW: 100% Contained within lateral screen limits (zero horizontal scrolling) */}
            <div className="block md:hidden divide-y divide-slate-200/80 bg-slate-50/50 p-2.5 sm:p-3 space-y-3">
              {quotes.map((q) => (
                <div
                  key={q.id}
                  className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-xs space-y-3 w-full"
                >
                  {/* Top Bar: Number, Status and Total */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-blue-600 text-sm">
                        #{q.quote_number}
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                          q.status
                        )}`}
                      >
                        {q.status}
                      </span>
                      {q.client_signature && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          Assinado
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block text-[10px] font-medium uppercase">Total</span>
                      <span className="text-base font-extrabold text-slate-900">
                        {formatBrl(q.total)}
                      </span>
                    </div>
                  </div>

                  {/* Client & Description */}
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 text-sm leading-snug break-words">
                      {q.client_name || 'Cliente Geral'}
                    </h3>
                    {q.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {q.description}
                      </p>
                    )}
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Emissão / Validade</span>
                      <span className="font-medium text-slate-700">{q.date}</span>
                      {q.validity_date && (
                        <span className="text-[10px] text-slate-400 block">Até: {q.validity_date}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Técnico</span>
                      <span className="font-medium text-slate-700 truncate block">
                        {q.technician_name || 'Não atribuído'}
                      </span>
                    </div>
                  </div>

                  {/* Company Tag (if dev global) */}
                  {isDev && !activeCompany && q.company_name && (
                    <div className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100 flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      <span className="truncate">{q.company_name}</span>
                    </div>
                  )}

                  {/* Mobile Actions: All options accessible within lateral screen bounds */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                    {/* Primary Touch Actions Row */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenSignature(q)}
                        className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-semibold transition border ${
                          q.client_signature
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        }`}
                      >
                        <PenTool className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{q.client_signature ? 'Assinado' : 'Assinar'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenPdf(q)}
                        className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenShare(q)}
                        className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>WhatsApp</span>
                      </button>
                    </div>

                    {/* Secondary Actions Row */}
                    <div className="flex items-center justify-between gap-1.5 pt-1">
                      {isSupervisor && (
                        <button
                          type="button"
                          onClick={() => handleConvertToWorkOrder(q)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[11px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 transition"
                          title="Converter em Ordem de Serviço"
                        >
                          <ArrowRightCircle className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span>Gerar OS</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onEditQuote(q)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[11px] font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition"
                      >
                        <Edit2 className="w-3 h-3 text-slate-500" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicate(q)}
                        className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
                        title="Duplicar Orçamento"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDelete(q)}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition"
                          title="Excluir Orçamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE VIEW: Displayed on medium & larger screens */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Nº</th>
                    {isDev && !activeCompany && <th className="px-5 py-3.5">Empresa</th>}
                    <th className="px-5 py-3.5">Cliente</th>
                    <th className="px-5 py-3.5">Data / Validade</th>
                    <th className="px-5 py-3.5">Técnico</th>
                    <th className="px-5 py-3.5">Total</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotes.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-4 font-bold text-blue-600 whitespace-nowrap">
                        #{q.quote_number}
                      </td>

                      {isDev && !activeCompany && (
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 text-[11px] font-bold">
                            <Building className="w-3 h-3 text-purple-600" />
                            {q.company_name || 'Geral'}
                          </span>
                        </td>
                      )}

                      <td className="px-5 py-4 font-medium text-slate-900 max-w-[200px]">
                        <div className="truncate font-semibold">{q.client_name || 'Cliente Geral'}</div>
                        <div className="text-[10px] text-slate-400 truncate">{q.description}</div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <div>{q.date}</div>
                        {q.validity_date && (
                          <div className="text-[10px] text-slate-400">Até: {q.validity_date}</div>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-slate-700">
                        {q.technician_name || 'Não atribuído'}
                      </td>

                      <td className="px-5 py-4 font-extrabold text-slate-900 whitespace-nowrap">
                        {formatBrl(q.total)}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                            q.status
                          )}`}
                        >
                          {q.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenSignature(q)}
                            className={`p-1.5 rounded-lg transition ${
                              q.client_signature
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            }`}
                            title={
                              q.client_signature
                                ? 'Assinatura Coletada • Clique para visualizar ou alterar'
                                : 'Coletar Assinatura do Cliente no Pop-up'
                            }
                          >
                            <PenTool className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onOpenPdf(q)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                            title="Visualizar e Baixar PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onOpenShare(q)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                            title="Enviar WhatsApp e E-mail"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {isDev && onOpenDrive && (
                            <button
                              onClick={() => onOpenDrive(q)}
                              className="p-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition"
                              title="Sincronizar Google Drive (DEV)"
                            >
                              <Cloud className="w-4 h-4 text-purple-600" />
                            </button>
                          )}

                          {isSupervisor && (
                            <button
                              onClick={() => handleConvertToWorkOrder(q)}
                              className="p-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition"
                              title="Converter em Ordem de Serviço (1 clique)"
                            >
                              <ArrowRightCircle className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => onEditQuote(q)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition"
                            title="Editar Orçamento"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDuplicate(q)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                            title="Duplicar Orçamento"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(q)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                              title="Excluir Orçamento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Signature Modal Pop-up */}
      {signingQuote && (
        <SignatureModal
          isOpen={isSignatureModalOpen}
          onClose={() => {
            setIsSignatureModalOpen(false);
            setSigningQuote(null);
          }}
          onConfirm={handleConfirmSignature}
          documentType="Orçamento"
          documentNumber={signingQuote.quote_number}
          clientName={signingQuote.client_name || 'Cliente'}
          signeeType="client"
          initialSignature={signingQuote.client_signature}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Edit2,
  Trash2,
  Wrench,
  Package,
  DollarSign,
  Tag,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building,
  ShieldCheck,
  Eye,
  FileSpreadsheet,
  RotateCcw,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ServiceItem, ServiceRequiredMaterial } from '../types';
import { SpreadsheetImportModal } from './SpreadsheetImportModal';

interface ServicesListProps {
  onSelectTab?: (tab: string) => void;
}

export const ServicesList: React.FC<ServicesListProps> = ({ onSelectTab }) => {
  const { user, activeCompany, companies, isDev, isSupervisor, isAdmin } = useAuth();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'servico' | 'material'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<ServiceItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Form inputs
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [itemType, setItemType] = useState<'servico' | 'material'>('servico');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Serviço');
  const [unit, setUnit] = useState('UN');
  const [defaultPrice, setDefaultPrice] = useState<string>('0');
  const [active, setActive] = useState(true);
  const [requiredMaterialsList, setRequiredMaterialsList] = useState<
    Array<{ id?: string; material_name: string; quantity: number; unit: string; default_price: number }>
  >([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    loadServices();
  }, [activeCompany?.id, user?.role]);

  const loadServices = async () => {
    setLoading(true);
    try {
      const data = await api.getServices({
        companyId: activeCompany?.id,
        userRole: user?.role
      });
      setServices(data);
    } catch (err) {
      console.error('Erro ao carregar catálogo:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (
      !confirm(
        'Deseja carregar o catálogo completo de serviços, materiais e vínculos de insumos padrão da CAST? Novos itens serão adicionados ao banco de dados.'
      )
    )
      return;

    setIsSeeding(true);
    try {
      const targetCompany = activeCompany?.id || 'comp-master-cast';
      await api.seedDefaultCatalog(targetCompany);
      showFeedback('Catálogo completo com serviços e insumos carregado com sucesso!');
      await loadServices();
    } catch (err: any) {
      alert('Erro ao recarregar catálogo: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearCatalog = async () => {
    if (services.length === 0) return;
    if (
      !confirm(
        'Tem certeza que deseja LIMPAR todo o catálogo de serviços e materiais? Todos os itens cadastrados serão excluídos do sistema.'
      )
    ) {
      return;
    }

    setIsClearing(true);
    try {
      const targetCompany = isDev ? undefined : (activeCompany?.id || undefined);
      await api.clearCatalog(targetCompany);
      setServices([]);
      showFeedback('Catálogo de serviços e materiais limpo com sucesso!');
      await loadServices();
    } catch (err: any) {
      alert('Erro ao limpar catálogo: ' + (err.message || 'Falha ao processar'));
    } finally {
      setIsClearing(false);
    }
  };

  const openNewModal = (initialType: 'servico' | 'material' = 'servico') => {
    setItemToEdit(null);
    setSelectedCompanyId(activeCompany?.id || (companies.length > 0 ? companies[0].id : 'comp-master-cast'));
    setItemType(initialType);
    setName('');
    setDescription('');
    setCategory(initialType === 'servico' ? 'Instalação' : 'Material');
    setUnit(initialType === 'servico' ? 'UN' : 'UN');
    setDefaultPrice('0');
    setActive(true);
    setRequiredMaterialsList([]);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (item: ServiceItem) => {
    setItemToEdit(item);
    setSelectedCompanyId(item.company_id || activeCompany?.id || (companies.length > 0 ? companies[0].id : 'comp-master-cast'));
    setItemType(item.item_type || 'servico');
    setName(item.name);
    setDescription(item.description || '');
    setCategory(item.category || 'Serviço');
    setUnit(item.unit || 'UN');
    setDefaultPrice(item.default_price !== undefined ? String(item.default_price) : '0');
    setActive(item.active === 1 || item.active === undefined);
    setRequiredMaterialsList(
      item.required_materials
        ? item.required_materials.map((m) => ({
            id: m.id,
            material_name: m.material_name,
            quantity: m.quantity || 1,
            unit: m.unit || 'UN',
            default_price: m.default_price || 0
          }))
        : []
    );
    setFormError(null);
    setModalOpen(true);
  };

  const handleAddRequiredMaterial = () => {
    setRequiredMaterialsList((prev) => [
      ...prev,
      {
        material_name: '',
        quantity: 1,
        unit: 'UN',
        default_price: 0
      }
    ]);
  };

  const handleUpdateRequiredMaterial = (
    index: number,
    field: 'material_name' | 'quantity' | 'unit' | 'default_price',
    value: any
  ) => {
    setRequiredMaterialsList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveRequiredMaterial = (index: number) => {
    setRequiredMaterialsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Por favor, informe o nome ou descrição do item.');
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

      const parsedPrice = parseFloat(defaultPrice.replace(',', '.')) || 0;

      const filteredReqMats = requiredMaterialsList
        .filter((rm) => rm.material_name && rm.material_name.trim().length > 0)
        .map((rm) => ({
          material_name: rm.material_name.trim(),
          quantity: Number(rm.quantity) || 1,
          unit: (rm.unit || 'UN').trim().toUpperCase(),
          default_price: Number(rm.default_price) || 0
        }));

      const payload = {
        company_id: targetCompanyId,
        name: name.trim(),
        description: description.trim(),
        category: category.trim() || (itemType === 'servico' ? 'Serviço' : 'Material'),
        item_type: itemType,
        unit: unit.trim().toUpperCase() || 'UN',
        default_price: parsedPrice,
        active: active ? 1 : 0,
        required_materials: itemType === 'servico' ? filteredReqMats : []
      };

      if (itemToEdit) {
        const updated = await api.updateService(itemToEdit.id, payload);
        setServices((prev) =>
          prev.map((s) => (s.id === itemToEdit.id ? { ...s, ...payload, ...updated } : s))
        );
        showFeedback('Item atualizado com sucesso!');
      } else {
        const created = await api.createService(payload);
        setServices((prev) => [created, ...prev.filter((s) => s.id !== created.id)]);
        showFeedback('Item cadastrado com sucesso!');
      }

      setModalOpen(false);
      loadServices();
    } catch (err: any) {
      console.error('Erro ao salvar item no catálogo:', err);
      setFormError(err.message || 'Erro inesperado ao salvar item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: ServiceItem) => {
    if (!confirm(`Deseja excluir o item "${item.name}" do catálogo?`)) return;
    setServices((prev) => prev.filter((s) => s.id !== item.id));
    try {
      await api.deleteService(item.id);
      showFeedback('Item removido com sucesso!');
      loadServices();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
      loadServices();
    }
  };

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const filtered = services.filter((s) => {
    const matchesType = filterType === 'all' || s.item_type === filterType;
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.category && s.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const countServicos = services.filter((s) => s.item_type === 'servico').length;
  const countMateriais = services.filter((s) => s.item_type === 'material').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="fixed top-20 right-5 z-50 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="w-6 h-6 text-indigo-600" />
            Catálogo de Serviços & Materiais
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Itens padronizados com preços e unidades para orçamentos e ordens de serviço
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-emerald-800 border border-emerald-300 transition active:scale-95 cursor-pointer shadow-2xs"
            title="Importar catálogo em massa a partir de um arquivo CSV ou Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Importar CSV / Planilha</span>
          </button>

          <button
            onClick={handleSeedDefaults}
            disabled={isSeeding}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-700 border border-indigo-200 transition active:scale-95 cursor-pointer disabled:opacity-50"
            title="Carregar catálogo padrão de serviços e materiais da CAST"
          >
            <RotateCcw className={`w-4 h-4 ${isSeeding ? 'animate-spin' : ''}`} />
            <span>{isSeeding ? 'Carregando...' : 'Catálogo Padrão'}</span>
          </button>

          <button
            onClick={handleClearCatalog}
            disabled={isClearing || services.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 border border-rose-200 transition active:scale-95 cursor-pointer disabled:opacity-40"
            title="Limpar todos os serviços e materiais do catálogo"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>{isClearing ? 'Limpando...' : 'Limpar Catálogo'}</span>
          </button>

          <button
            onClick={() => openNewModal('servico')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Serviço</span>
          </button>
          <button
            onClick={() => openNewModal('material')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Material</span>
          </button>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="rounded-2xl bg-white p-3.5 border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, categoria ou código..."
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-indigo-600"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              filterType === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({services.length})
          </button>
          <button
            onClick={() => setFilterType('servico')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              filterType === 'servico'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Serviços ({countServicos})</span>
          </button>
          <button
            onClick={() => setFilterType('material')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              filterType === 'material'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Materiais ({countMateriais})</span>
          </button>
        </div>
      </div>

      {/* Grid of Items */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-semibold">
          Carregando catálogo de itens...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center border border-slate-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <Boxes className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Nenhum item encontrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm || filterType !== 'all'
              ? 'Nenhum resultado corresponde aos filtros aplicados.'
              : 'Cadastre serviços e materiais para agilizar o preenchimento de orçamentos e ordens de serviço.'}
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Importar CSV</span>
            </button>
            <button
              onClick={() => openNewModal('servico')}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
            >
              Adicionar Serviço
            </button>
            <button
              onClick={() => openNewModal('material')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
            >
              Adicionar Material
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      item.item_type === 'material'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {item.item_type === 'material' ? (
                      <Package className="w-3 h-3" />
                    ) : (
                      <Wrench className="w-3 h-3" />
                    )}
                    {item.item_type === 'material' ? 'Material' : 'Serviço'}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.active !== 0
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.active !== 0 ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 line-clamp-2" title={item.name}>
                  {item.name}
                </h3>

                {item.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2" title={item.description}>
                    {item.description}
                  </p>
                )}

                <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                    <Tag className="w-3 h-3 text-slate-400" />
                    {item.category || 'Geral'}
                  </span>
                  <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                    Unidade: <strong className="text-slate-700">{item.unit || 'UN'}</strong>
                  </span>
                </div>

                {/* Materiais Necessários Vinculados */}
                {item.item_type === 'servico' && item.required_materials && item.required_materials.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{item.required_materials.length} materiais vinculados:</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {item.required_materials.slice(0, 3).map((rm, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md border border-blue-100 font-medium"
                          title={`${rm.material_name} (${rm.quantity} ${rm.unit})`}
                        >
                          {rm.quantity} {rm.unit} • {rm.material_name}
                        </span>
                      ))}
                      {item.required_materials.length > 3 && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md font-medium">
                          +{item.required_materials.length - 3} mais
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block leading-tight font-medium">Preço Sugerido</span>
                  <span className="text-sm font-extrabold text-slate-900">
                    R${' '}
                    {(item.default_price || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1 font-semibold">/ {item.unit || 'UN'}</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                    title="Editar item"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                    title="Excluir item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo / Editar Item */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center bg-black/75 p-0 sm:p-4 backdrop-blur-xs overscroll-contain overflow-y-auto">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white p-4 sm:p-6 shadow-2xl border border-slate-200 overflow-y-auto max-h-[92dvh] sm:max-h-[90vh] pb-24 sm:pb-6 flex flex-col animate-in slide-in-from-bottom-6 sm:fade-in sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-600" />
                {itemToEdit ? 'Editar Item do Catálogo' : 'Novo Item do Catálogo'}
              </h2>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    itemType === 'material' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {itemType === 'material' ? 'Material' : 'Serviço'}
                </span>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Visualização em Tempo Real (Mobile Live Feedback) */}
            <div className="mb-3.5 p-3 rounded-xl bg-slate-900 text-white shadow-xs border border-slate-800">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 pb-1.5 border-b border-slate-800">
                <span className="flex items-center gap-1.5 text-indigo-400 font-bold">
                  <Eye className="w-3.5 h-3.5" />
                  Visualização em Tempo Real:
                </span>
                <span className="px-1.5 py-0.5 rounded bg-indigo-600/30 text-indigo-300 text-[10px] font-mono">
                  {name ? 'Digitando' : 'Aguardando'}
                </span>
              </div>
              <div className="pt-2 space-y-1 text-xs">
                <div className="flex items-baseline gap-2">
                  <span className="text-slate-400 text-[11px] w-16 shrink-0">Item:</span>
                  <span className="font-bold text-white truncate text-sm">
                    {name || <span className="text-slate-500 italic font-normal">Digite a descrição...</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px] w-16 shrink-0">Categoria:</span>
                  <span className="text-indigo-300">{category || '--'}</span>
                  <span className="text-slate-500 text-[10px]">|</span>
                  <span className="text-slate-400 text-[11px]">Preço:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    R$ {defaultPrice || '0,00'} / {unit}
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

            <form onSubmit={handleSave} className="space-y-3.5 text-xs flex-1">
              {/* Tipo Selector */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">Tipo de Registro *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setItemType('servico');
                      if (!category || category === 'Material') setCategory('Instalação');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      itemType === 'servico'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Serviço / Mão de Obra</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setItemType('material');
                      if (!category || category === 'Instalação') setCategory('Material');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      itemType === 'material'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Material / Equipamento</span>
                  </button>
                </div>
              </div>

              {/* Empresa em DEV */}
              {isDev && !activeCompany && (
                <div>
                  <label className="block font-semibold text-purple-900 mb-1">
                    Empresa Vinculada (Modo DEV) *
                  </label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full rounded-xl border border-purple-300 bg-purple-50/70 p-2.5 text-sm font-semibold text-purple-950"
                  >
                    {companies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name} {comp.cnpj ? `(${comp.cnpj})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Nome / Descrição Principal */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 text-xs">
                  Nome / Descrição do {itemType === 'servico' ? 'Serviço' : 'Material'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)}
                  placeholder={
                    itemType === 'servico'
                      ? 'Ex: Mão de obra de instalação especializada...'
                      : 'Ex: Câmera Dome IP 4K Visão Noturna IR 30m...'
                  }
                  className="w-full rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition shadow-2xs font-medium"
                />
              </div>

              {/* Categoria e Unidade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1 text-xs">Categoria / Especialidade</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)}
                    placeholder="Ex: CFTV, Redes, Engenharia, Elétrica..."
                    className="w-full rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1 text-xs">Unidade de Medida</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 font-semibold focus:outline-hidden focus:border-indigo-600 shadow-2xs"
                  >
                    <option value="UN">UN - Unidade</option>
                    <option value="HR">HR - Hora Técnica</option>
                    <option value="MT">MT - Metros</option>
                    <option value="PT">PT - Pontos de Rede</option>
                    <option value="CX">CX - Caixa / Pacote</option>
                    <option value="KG">KG - Quilogramas</option>
                    <option value="CJ">CJ - Conjunto</option>
                    <option value="SV">SV - Serviço Global</option>
                  </select>
                </div>
              </div>

              {/* Preço Padrão Sugerido */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 text-xs">
                  Preço Padrão Sugerido (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 sm:top-2.5 text-slate-400 font-bold text-sm">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={defaultPrice}
                    onChange={(e) => setDefaultPrice(e.target.value)}
                    onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)}
                    placeholder="0,00"
                    className="w-full rounded-xl border border-slate-300 pl-11 pr-3 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 font-bold focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition shadow-2xs"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Valor sugerido automaticamente ao adicionar este item num orçamento ou ordem de serviço.
                </p>
              </div>

              {/* Descrição Detalhada */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 text-xs">Especificações Técnicas / Observações</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100)}
                  placeholder="Detalhes adicionais, escopo técnico, marcas homologadas..."
                  className="w-full rounded-xl border border-slate-300 p-3 sm:p-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition shadow-2xs"
                />
              </div>

              {/* Seção de Materiais Necessários para Execução (Insumos Automáticos) */}
              {itemType === 'servico' && (
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <label className="block font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        <span>Materiais & Insumos Necessários</span>
                        <span className="text-[10px] font-normal text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100">
                          Reconhecimento Automático
                        </span>
                      </label>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Ao clicar neste serviço num orçamento ou OS, estes materiais serão sugeridos e vinculados automaticamente.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddRequiredMaterial}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Adicionar Insumo</span>
                    </button>
                  </div>

                  {requiredMaterialsList.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-[11px] text-slate-400">
                      Nenhum material vinculado a este serviço. Clique em "Adicionar Insumo" para vincular materiais automaticamente.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {requiredMaterialsList.map((rm, idx) => (
                        <div
                          key={idx}
                          className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-1.5"
                        >
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              placeholder="Nome do material..."
                              value={rm.material_name}
                              onChange={(e) =>
                                handleUpdateRequiredMaterial(idx, 'material_name', e.target.value)
                              }
                              className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-hidden focus:border-blue-500"
                            />
                          </div>
                          <div className="w-16 shrink-0">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              placeholder="Qtd"
                              value={rm.quantity}
                              onChange={(e) =>
                                handleUpdateRequiredMaterial(
                                  idx,
                                  'quantity',
                                  parseFloat(e.target.value) || 1
                                )
                              }
                              className="w-full text-xs text-center font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-1 py-1.5 focus:outline-hidden focus:border-blue-500"
                              title="Quantidade por unidade de serviço"
                            />
                          </div>
                          <div className="w-16 shrink-0">
                            <select
                              value={rm.unit}
                              onChange={(e) =>
                                handleUpdateRequiredMaterial(idx, 'unit', e.target.value)
                              }
                              className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-1 py-1.5 focus:outline-hidden focus:border-blue-500"
                            >
                              <option value="UN">UN</option>
                              <option value="MT">MT</option>
                              <option value="CX">CX</option>
                              <option value="KG">KG</option>
                              <option value="HR">HR</option>
                              <option value="PT">PT</option>
                            </select>
                          </div>
                          <div className="w-20 shrink-0">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="R$ Médio"
                              value={rm.default_price || ''}
                              onChange={(e) =>
                                handleUpdateRequiredMaterial(
                                  idx,
                                  'default_price',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-full text-xs text-right font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-1.5 py-1.5 focus:outline-hidden focus:border-blue-500"
                              title="Preço médio unitário sugerido"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveRequiredMaterial(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0 cursor-pointer"
                            title="Remover material"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Status Ativo */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="srv-active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="srv-active" className="font-semibold text-slate-700 cursor-pointer text-xs">
                  Item Ativo (disponível para seleção em orçamentos e OS)
                </label>
              </div>

              {/* Badge de Persistência Cloud Firestore */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-none" />
                <span className="leading-tight">
                  <strong>Banco de Dados em Nuvem (Firebase Cloud Firestore):</strong> Salvo fora do código e protegido contra perdas em novos deploys.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer text-xs sm:text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`rounded-xl px-5 py-2.5 font-bold text-white shadow-xs transition cursor-pointer flex items-center gap-2 text-xs sm:text-sm ${
                    itemType === 'material'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Salvando no Firestore...</span>
                    </>
                  ) : itemToEdit ? (
                    'Atualizar Item'
                  ) : (
                    'Salvar Item'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Importação de Planilha Excel/CSV */}
      <SpreadsheetImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        companyId={activeCompany?.id || selectedCompanyId || 'comp-master-cast'}
        onImportSuccess={() => {
          showFeedback('Itens e materiais importados com sucesso!');
          loadServices();
        }}
      />
    </div>
  );
};

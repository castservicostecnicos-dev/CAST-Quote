import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Wrench,
  Package,
  Plus,
  Check,
  Tag,
  DollarSign,
  ArrowRight,
  Layers,
  Sparkles
} from 'lucide-react';
import { ServiceItem, ServiceRequiredMaterial } from '../types';
import { COMMON_ITEM_SUGGESTIONS, ItemSuggestion } from '../constants/itemSuggestions';

export interface SelectableItem {
  id?: string;
  title: string;
  item_type: 'servico' | 'material';
  unit: string;
  default_price: number;
  category: string;
  source: 'catalogo' | 'padrao';
  required_materials?: ServiceRequiredMaterial[];
}

interface ItemSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (item: {
    description: string;
    item_type: 'servico' | 'material';
    unit: string;
    unit_price: number;
    required_materials?: ServiceRequiredMaterial[];
  }) => void;
  onAddBlankItem?: (type: 'servico' | 'material') => void;
  initialType?: 'all' | 'servico' | 'material';
  catalogServices?: ServiceItem[];
  themeColor?: 'blue' | 'emerald';
}

export const ItemSelectorModal: React.FC<ItemSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectItem,
  onAddBlankItem,
  initialType = 'all',
  catalogServices = [],
  themeColor = 'blue'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'servico' | 'material'>(initialType);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Sync tab with initialType when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialType);
      setSearchTerm('');
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, initialType]);

  // Combine and deduplicate items from catalog and standard suggestions
  const allUnifiedItems = useMemo<SelectableItem[]>(() => {
    const list: SelectableItem[] = [];
    const seenTitles = new Set<string>();

    // 1. Prioritize Company Catalog Services/Materials
    catalogServices.forEach((s) => {
      const title = s.name.trim();
      if (!title || seenTitles.has(title.toLowerCase())) return;
      seenTitles.add(title.toLowerCase());
      list.push({
        id: s.id,
        title,
        item_type: s.item_type || 'servico',
        unit: s.unit || 'UN',
        default_price: Number(s.default_price) || 0,
        category: s.category || (s.item_type === 'material' ? 'Material' : 'Serviço'),
        source: 'catalogo',
        required_materials: s.required_materials
      });
    });

    // 2. Add Standard Suggestions
    COMMON_ITEM_SUGGESTIONS.forEach((s: ItemSuggestion) => {
      const title = s.description.trim();
      if (!title || seenTitles.has(title.toLowerCase())) return;
      seenTitles.add(title.toLowerCase());
      list.push({
        title,
        item_type: s.item_type,
        unit: s.unit || 'UN',
        default_price: Number(s.default_price) || 0,
        category: s.category || (s.item_type === 'material' ? 'Material' : 'Serviço'),
        source: 'padrao'
      });
    });

    return list;
  }, [catalogServices]);

  // Filter items in real time as the user types
  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return allUnifiedItems.filter((item) => {
      // Type match
      if (activeTab !== 'all' && item.item_type !== activeTab) {
        return false;
      }
      // Search term match in title, category, or unit
      if (!term) return true;
      const titleMatch = item.title.toLowerCase().includes(term);
      const catMatch = item.category.toLowerCase().includes(term);
      const unitMatch = item.unit.toLowerCase().includes(term);
      return titleMatch || catMatch || unitMatch;
    });
  }, [allUnifiedItems, activeTab, searchTerm]);

  // Reset highlight index when filter changes
  useEffect(() => {
    setHighlightedIndex(0);
    if (listContainerRef.current) {
      listContainerRef.current.scrollTop = 0;
    }
  }, [filteredItems.length, activeTab]);

  if (!isOpen) return null;

  const handleSelect = (item: SelectableItem) => {
    onSelectItem({
      description: item.title,
      item_type: item.item_type,
      unit: item.unit,
      unit_price: item.default_price,
      required_materials: item.required_materials
    });
    onClose();
  };

  const handleSelectCustomTyped = () => {
    if (!searchTerm.trim()) return;
    const itemType: 'servico' | 'material' = activeTab === 'material' ? 'material' : 'servico';
    onSelectItem({
      description: searchTerm.trim(),
      item_type: itemType,
      unit: 'UN',
      unit_price: 0
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
      scrollHighlightedIntoView(highlightedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      scrollHighlightedIntoView(highlightedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredItems.length) {
        handleSelect(filteredItems[highlightedIndex]);
      } else if (searchTerm.trim()) {
        handleSelectCustomTyped();
      }
    }
  };

  const scrollHighlightedIntoView = (index: number) => {
    if (!listContainerRef.current) return;
    const elements = listContainerRef.current.querySelectorAll('[data-item-row]');
    if (elements[index]) {
      elements[index].scrollIntoView({ block: 'nearest' });
    }
  };

  const formatBrl = (val: number) =>
    (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Counts for tabs
  const totalCount = allUnifiedItems.length;
  const servicesCount = allUnifiedItems.filter((i) => i.item_type === 'servico').length;
  const materialsCount = allUnifiedItems.filter((i) => i.item_type === 'material').length;

  const isEmerald = themeColor === 'emerald';
  const primaryBg = isEmerald ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700';
  const primaryText = isEmerald ? 'text-emerald-600' : 'text-blue-600';
  const primaryBorder = isEmerald ? 'border-emerald-500 ring-emerald-500' : 'border-blue-500 ring-blue-500';
  const primaryLightBg = isEmerald ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                activeTab === 'servico'
                  ? 'bg-blue-100 text-blue-700'
                  : activeTab === 'material'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-200 text-slate-800'
              }`}
            >
              {activeTab === 'servico' ? (
                <Wrench className="w-5 h-5" />
              ) : activeTab === 'material' ? (
                <Package className="w-5 h-5" />
              ) : (
                <Layers className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {activeTab === 'servico'
                  ? 'Selecionar Serviço'
                  : activeTab === 'material'
                  ? 'Selecionar Material'
                  : 'Carregar Item (Serviço ou Material)'}
              </h2>
              <p className="text-xs text-slate-500">
                Lista vertical com busca rápida e filtro automático
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input & Filter Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-white space-y-3">
          {/* Campo para digitar o nome do item com filtro automático */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o nome do serviço ou material para filtrar..."
              className={`w-full pl-11 pr-10 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 ${primaryBorder} transition shadow-2xs`}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  searchInputRef.current?.focus();
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Tabs & Counter */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Todos</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
                  {totalCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('servico')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'servico'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-blue-700'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Serviços</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === 'servico' ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {servicesCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('material')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'material'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-amber-700'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Materiais</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === 'material' ? 'bg-amber-800 text-amber-100' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {materialsCount}
                </span>
              </button>
            </div>

            <div className="text-xs font-medium text-slate-500">
              {filteredItems.length === 1
                ? '1 item correspondente'
                : `${filteredItems.length} itens encontrados`}
            </div>
          </div>
        </div>

        {/* Vertical Scrolling List (Lista com Rolagem Vertical) */}
        <div
          ref={listContainerRef}
          className="flex-1 overflow-y-auto max-h-[380px] sm:max-h-[440px] p-3 sm:p-4 space-y-2 divide-y divide-slate-100/60"
        >
          {/* Quick Option: Use typed text directly as custom item */}
          {searchTerm.trim().length > 0 && (
            <div
              onClick={handleSelectCustomTyped}
              className="p-3 mb-2 rounded-xl border border-dashed border-blue-300 bg-blue-50/70 hover:bg-blue-100/80 transition cursor-pointer flex items-center justify-between gap-3 text-left group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-blue-900 truncate">
                    Usar &ldquo;{searchTerm.trim()}&rdquo;
                  </div>
                  <div className="text-[11px] text-blue-700">
                    Inserir como novo item {activeTab === 'material' ? 'material' : 'serviço'} avulso
                  </div>
                </div>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-200 group-hover:border-blue-400 shadow-2xs">
                Carregar <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          )}

          {/* List of items */}
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => {
              const isSelected = index === highlightedIndex;
              const isService = item.item_type === 'servico';

              return (
                <div
                  key={`${item.source}-${item.title}-${index}`}
                  data-item-row
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`pt-2 first:pt-0 group cursor-pointer transition`}
                >
                  <div
                    className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? `${isService ? 'border-blue-400 bg-blue-50/50' : 'border-amber-400 bg-amber-50/50'} shadow-xs`
                        : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Left: Icon & Description */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isService
                            ? 'bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white'
                            : 'bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white'
                        } transition`}
                      >
                        {isService ? (
                          <Wrench className="w-4 h-4" />
                        ) : (
                          <Package className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              isService
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isService ? 'Serviço' : 'Material'}
                          </span>

                          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            Un: <strong className="text-slate-700">{item.unit}</strong>
                          </span>

                          {item.source === 'catalogo' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                              <Sparkles className="w-2.5 h-2.5" /> Catálogo
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Sugestão</span>
                          )}

                          {item.required_materials && item.required_materials.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              <Layers className="w-2.5 h-2.5" /> {item.required_materials.length} materiais vinculados
                            </span>
                          )}
                        </div>

                        {/* Title with search highlighting */}
                        <div className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug group-hover:text-slate-900">
                          {highlightMatch(item.title, searchTerm)}
                        </div>
                      </div>
                    </div>

                    {/* Right: Price & Action */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400">
                          Preço Base
                        </div>
                        <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                          {item.default_price > 0 ? formatBrl(item.default_price) : 'Sob Consulta'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(item);
                        }}
                        className={`p-2 rounded-xl font-bold text-xs transition flex items-center justify-center shrink-0 cursor-pointer ${
                          isSelected
                            ? isService
                              ? 'bg-blue-600 text-white'
                              : 'bg-amber-600 text-white'
                            : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                        }`}
                        title="Carregar este item"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Nenhum item encontrado com &ldquo;{searchTerm}&rdquo;
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Você pode usar o texto digitado como um item avulso ou limpar a busca.
                </p>
              </div>
              {searchTerm.trim() && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSelectCustomTyped}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition ${primaryBg}`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Usar &ldquo;{searchTerm.trim()}&rdquo; como item</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Use</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
              ↑
            </kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
              ↓
            </kbd>
            <span className="hidden sm:inline">para navegar e</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
              Enter
            </kbd>
            <span className="hidden sm:inline">para carregar</span>
          </div>

          <div className="flex items-center gap-2">
            {onAddBlankItem && (
              <button
                type="button"
                onClick={() => {
                  onAddBlankItem(activeTab === 'material' ? 'material' : 'servico');
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-semibold transition cursor-pointer"
              >
                + Linha em Branco
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper: highlight matching letters
function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);

  return (
    <>
      {before}
      <span className="bg-amber-200 text-amber-950 px-0.5 rounded-xs font-bold">{match}</span>
      {after}
    </>
  );
}

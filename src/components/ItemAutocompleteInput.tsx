import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Wrench, Package, Sparkles, ChevronDown, Check, Layers } from 'lucide-react';
import { ServiceItem } from '../types';
import { COMMON_ITEM_SUGGESTIONS, ItemSuggestion } from '../constants/itemSuggestions';
import { SelectableItem } from './ItemSelectorModal';

interface ItemAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectItem: (item: {
    description: string;
    item_type: 'servico' | 'material';
    unit: string;
    unit_price: number;
    required_materials?: any[];
  }) => void;
  onOpenFullPicker: () => void;
  catalogServices?: ServiceItem[];
  currentType?: 'servico' | 'material';
  placeholder?: string;
  className?: string;
  themeColor?: 'blue' | 'emerald';
  required?: boolean;
  id?: string;
  onFocus?: () => void;
}

export const ItemAutocompleteInput: React.FC<ItemAutocompleteInputProps> = ({
  value,
  onChange,
  onSelectItem,
  onOpenFullPicker,
  catalogServices = [],
  currentType,
  placeholder = 'Digite ou selecione um item...',
  className = '',
  themeColor = 'blue',
  required = false,
  id,
  onFocus
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Combine and deduplicate
  const allUnifiedItems = useMemo<SelectableItem[]>(() => {
    const list: SelectableItem[] = [];
    const seenTitles = new Set<string>();

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

  // Live filter as user types
  const filteredSuggestions = useMemo(() => {
    const query = (value || '').trim().toLowerCase();

    return allUnifiedItems
      .filter((item) => {
        // If currentType is specified, prioritize matching type unless query is specific
        if (currentType && item.item_type !== currentType && !query) {
          return false;
        }
        if (!query) return true;
        return (
          item.title.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          item.unit.toLowerCase().includes(query)
        );
      })
      .slice(0, 30); // Max 30 for smooth vertical scroll
  }, [allUnifiedItems, value, currentType]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: SelectableItem) => {
    onSelectItem({
      description: item.title,
      item_type: item.item_type,
      unit: item.unit,
      unit_price: item.default_price,
      required_materials: item.required_materials
    });
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, filteredSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      if (filteredSuggestions.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        e.preventDefault();
        handleSelect(filteredSuggestions[highlightedIndex]);
      }
    }
  };

  const formatBrl = (val: number) =>
    (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const isEmerald = themeColor === 'emerald';
  const focusBorder = isEmerald ? 'focus:border-emerald-500 focus:ring-emerald-500' : 'focus:border-blue-500 focus:ring-blue-500';

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          required={required}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            onFocus?.();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full h-10 rounded-xl border border-slate-200 bg-white pl-3 pr-14 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-1 transition ${focusBorder} ${className}`}
        />

        {/* Right buttons: Open Full Picker list & Trigger dropdown */}
        <div className="absolute right-1.5 flex items-center gap-0.5">
          <button
            type="button"
            onClick={onOpenFullPicker}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
            title="Abrir catálogo e lista completa com rolagem vertical"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              if (!isOpen) inputRef.current?.focus();
            }}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 transition cursor-pointer"
            title="Alternar lista de sugestões"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Floating Vertical Scroll Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute z-40 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-98 duration-100">
          {/* Header */}
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>
              {filteredSuggestions.length === 1
                ? '1 item correspondente'
                : `${filteredSuggestions.length} itens correspondentes (rolagem vertical)`}
            </span>
            <button
              type="button"
              onClick={onOpenFullPicker}
              className="text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer font-bold"
            >
              <Search className="w-3 h-3" /> Ver catálogo completo
            </button>
          </div>

          {/* Scrollable list */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((item, idx) => {
                const isHighlighted = idx === highlightedIndex;
                const isService = item.item_type === 'servico';

                return (
                  <div
                    key={`${item.source}-${item.title}-${idx}`}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur before click
                      handleSelect(item);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2 cursor-pointer transition flex items-center justify-between gap-2 text-left ${
                      isHighlighted
                        ? isService
                          ? 'bg-blue-50 text-blue-900'
                          : 'bg-amber-50 text-amber-900'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                          isService ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {isService ? <Wrench className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                      </div>

                      <div className="truncate flex-1">
                        <div className="text-xs font-semibold truncate">{item.title}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          <span className="uppercase">{item.item_type}</span>
                          <span>•</span>
                          <span>Un: {item.unit}</span>
                          {item.source === 'catalogo' && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" /> Catálogo
                              </span>
                            </>
                          )}
                          {item.required_materials && item.required_materials.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-blue-700 font-bold flex items-center gap-0.5 bg-blue-50 px-1 rounded">
                                <Layers className="w-2.5 h-2.5" /> {item.required_materials.length} materiais
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-xs font-bold text-slate-900">
                        {item.default_price > 0 ? formatBrl(item.default_price) : 'Sob Consulta'}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-500 space-y-2">
                <p>Nenhum item do catálogo corresponde a &ldquo;{value}&rdquo;.</p>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onOpenFullPicker();
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  <Search className="w-3.5 h-3.5" /> Abrir lista completa para buscar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

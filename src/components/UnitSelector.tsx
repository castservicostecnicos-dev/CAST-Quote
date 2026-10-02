import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';
import { PRODUCT_UNITS, COMMON_UNITS } from '../constants/units';

interface UnitSelectorProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
}

export const UnitSelector: React.FC<UnitSelectorProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'UN',
  id
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState<'todos' | 'embalagem' | 'comprimento' | 'peso' | 'unidade' | 'volume'>('todos');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-foca a busca interna caso abra o menu
      setTimeout(() => searchInputRef.current?.focus(), 80);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleSelectUnit = (symbol: string) => {
    onChange(symbol);
    setDropdownOpen(false);
    setSearchFilter('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    inputRef.current?.focus();
  };

  // Filtragem das unidades por categoria e texto
  const filteredUnits = PRODUCT_UNITS.filter((u) => {
    const matchesCat = activeCategory === 'todos' || u.category === activeCategory;
    if (!matchesCat) return false;
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase().trim();
    return (
      u.symbol.toLowerCase().includes(term) ||
      u.name.toLowerCase().includes(term) ||
      (u.description && u.description.toLowerCase().includes(term))
    );
  });

  return (
    <div ref={dropdownRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => {
            // Seleciona todo o conteúdo ao focar para facilitar apagar com 1 clique/toque
            e.target.select();
          }}
          placeholder={placeholder}
          className={`${className} pr-12`}
          autoComplete="off"
          spellCheck={false}
        />

        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {/* Botão de limpar rápido caso haja valor preenchido */}
          {value && value.trim().length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-300 hover:text-red-500 rounded transition cursor-pointer"
              title="Apagar unidade (limpar campo)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Botão de abrir menu de apresentação */}
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer transition rounded"
            title="Escolher unidade de apresentação (Metros, Quilos, Pacote, Caixa, etc.)"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Menu dropdown flutuante com unidades categorizadas */}
      {dropdownOpen && (
        <div className="absolute left-0 top-full mt-1 w-72 sm:w-80 max-h-80 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 p-2 text-left animate-in fade-in zoom-in-95 duration-100 flex flex-col">
          {/* Cabeçalho com busca interna */}
          <div className="pb-2 border-b border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Apresentação do Produto
              </span>
              <span className="text-[10px] text-blue-600 font-medium">
                Digite livre ou escolha abaixo
              </span>
            </div>

            {/* Input de filtro interno */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar (ex: metro, quilo, pacote, caixa)..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 rounded-lg border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-blue-500"
              />
            </div>

            {/* Atalhos rápidos mais usados */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[11px]">
              <span className="text-[10px] text-slate-400 font-semibold px-1 shrink-0">Rápido:</span>
              {['UN', 'M', 'KG', 'G', 'PCT', 'CX', 'RL', 'SC', 'DZ', 'CT'].map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => handleSelectUnit(sym)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold shrink-0 transition cursor-pointer ${
                    (value || '').toUpperCase() === sym
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {sym}
                </button>
              ))}
            </div>

            {/* Abas de categoria */}
            <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-semibold text-slate-500 pt-0.5">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'embalagem', label: 'Embalagens' },
                { id: 'comprimento', label: 'Comprimento' },
                { id: 'peso', label: 'Peso' },
                { id: 'unidade', label: 'Contagem' },
                { id: 'volume', label: 'Líquidos' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id as any)}
                  className={`px-2 py-0.5 rounded-md whitespace-nowrap transition cursor-pointer ${
                    activeCategory === tab.id
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista rolável de opções */}
          <div className="overflow-y-auto max-h-52 divide-y divide-slate-50 py-1">
            {filteredUnits.length > 0 ? (
              filteredUnits.map((u) => {
                const isSelected = (value || '').toUpperCase() === u.symbol;
                return (
                  <button
                    key={u.symbol}
                    type="button"
                    onClick={() => handleSelectUnit(u.symbol)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition cursor-pointer text-left ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono font-bold w-11 shrink-0 text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-center border border-slate-200">
                        {u.symbol}
                      </span>
                      <div className="truncate">
                        <div className="text-xs text-slate-800 font-medium truncate">{u.name}</div>
                        {u.description && (
                          <div className="text-[10px] text-slate-400 truncate">{u.description}</div>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />}
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                Nenhuma unidade encontrada para &ldquo;{searchFilter}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

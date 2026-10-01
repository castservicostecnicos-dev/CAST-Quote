import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { PRODUCT_UNITS } from '../constants/units';

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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const datalistId = id ? `units-datalist-${id}` : 'units-datalist-global';

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleSelectUnit = (symbol: string) => {
    onChange(symbol);
    setDropdownOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          list={datalistId}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${className} pr-7`}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer transition rounded"
          title="Ver opções de unidades (Metros, Quilos, Pacote, Caixa, etc.)"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Datalist nativo para autocomplete do navegador */}
      <datalist id={datalistId}>
        {PRODUCT_UNITS.map((u) => (
          <option key={u.symbol} value={u.symbol}>
            {u.name} - {u.description}
          </option>
        ))}
      </datalist>

      {/* Menu dropdown flutuante com unidades categorizadas */}
      {dropdownOpen && (
        <div className="absolute left-0 top-full mt-1 w-64 max-h-60 overflow-y-auto rounded-xl bg-white border border-slate-200 shadow-xl z-50 p-1.5 text-left animate-in fade-in zoom-in-95 duration-100">
          <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider border-b border-slate-100 mb-1 flex items-center justify-between">
            <span>Apresentação do Produto</span>
            <span className="text-[9px] text-blue-600 font-semibold">ou digite livre</span>
          </div>
          <div className="space-y-0.5">
            {PRODUCT_UNITS.map((u) => {
              const isSelected = (value || '').toUpperCase() === u.symbol;
              return (
                <button
                  key={u.symbol}
                  type="button"
                  onClick={() => handleSelectUnit(u.symbol)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                    isSelected ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-mono font-bold w-9 shrink-0 text-slate-900 bg-slate-100 px-1 py-0.5 rounded text-[11px] text-center">
                      {u.symbol}
                    </span>
                    <span className="truncate">{u.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

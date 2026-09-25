import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  Package,
  Check,
  X,
  Plus,
  Layers,
  Sparkles,
  Info,
  DollarSign,
  CheckSquare,
  Square
} from 'lucide-react';
import { ServiceRequiredMaterial } from '../types';

export interface SelectedMaterialItem {
  material_id?: string;
  material_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  selected: boolean;
}

interface AutoMaterialsPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  serviceUnit: string;
  servicePrice: number;
  serviceQuantity?: number;
  requiredMaterials: ServiceRequiredMaterial[];
  onConfirm: (data: {
    service: {
      description: string;
      item_type: 'servico';
      quantity: number;
      unit: string;
      unit_price: number;
    };
    materials: Array<{
      description: string;
      item_type: 'material';
      quantity: number;
      unit: string;
      unit_price: number;
    }>;
  }) => void;
  onServiceOnly: () => void;
  themeColor?: 'blue' | 'emerald';
}

export const AutoMaterialsPromptModal: React.FC<AutoMaterialsPromptModalProps> = ({
  isOpen,
  onClose,
  serviceName,
  serviceUnit = 'UN',
  servicePrice = 0,
  serviceQuantity = 1,
  requiredMaterials = [],
  onConfirm,
  onServiceOnly,
  themeColor = 'blue'
}) => {
  const [items, setItems] = useState<SelectedMaterialItem[]>([]);

  useEffect(() => {
    if (isOpen && requiredMaterials && requiredMaterials.length > 0) {
      const initial = requiredMaterials.map((rm) => ({
        material_id: rm.material_id,
        material_name: rm.material_name,
        quantity: Math.max(1, (rm.quantity || 1) * (serviceQuantity || 1)),
        unit: rm.unit || 'UN',
        unit_price: Number(rm.default_price) || 0,
        selected: rm.is_optional ? false : true
      }));
      setItems(initial);
    }
  }, [isOpen, requiredMaterials, serviceQuantity]);

  const toggleSelect = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const selectAll = (val: boolean) => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: val })));
  };

  const updateQuantity = (index: number, val: number) => {
    const validVal = isNaN(val) ? 0 : Math.max(0, val);
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: validVal } : item))
    );
  };

  const updatePrice = (index: number, val: number) => {
    const validVal = isNaN(val) ? 0 : Math.max(0, val);
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, unit_price: validVal } : item))
    );
  };

  const totals = useMemo(() => {
    const serviceTotal = (serviceQuantity || 1) * (servicePrice || 0);
    const materialsTotal = items
      .filter((i) => i.selected)
      .reduce((acc, curr) => acc + curr.quantity * curr.unit_price, 0);
    const selectedCount = items.filter((i) => i.selected).length;
    return {
      serviceTotal,
      materialsTotal,
      grandTotal: serviceTotal + materialsTotal,
      selectedCount
    };
  }, [items, servicePrice, serviceQuantity]);

  if (!isOpen) return null;

  const isEmerald = themeColor === 'emerald';
  const primaryBg = isEmerald ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700';
  const primaryRing = isEmerald ? 'focus:ring-emerald-500' : 'focus:ring-blue-500';
  const badgeBg = isEmerald ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200';

  const handleConfirmWithMaterials = () => {
    const selectedMats = items
      .filter((i) => i.selected && i.quantity > 0)
      .map((i) => ({
        description: i.material_name,
        item_type: 'material' as const,
        quantity: i.quantity,
        unit: i.unit,
        unit_price: i.unit_price
      }));

    onConfirm({
      service: {
        description: serviceName,
        item_type: 'servico',
        quantity: serviceQuantity || 1,
        unit: serviceUnit,
        unit_price: servicePrice
      },
      materials: selectedMats
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/70 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${isEmerald ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Reconhecimento Automático de Materiais
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-full border border-amber-200">
                  {requiredMaterials.length} Insumos
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mt-0.5 line-clamp-1">
                {serviceName}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Banner */}
        <div className="px-5 py-3 bg-blue-50/80 border-b border-blue-100/70 text-xs sm:text-sm text-blue-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              O sistema identificou os materiais necessários para este serviço. Selecione quais deseja incluir no documento.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => selectAll(true)}
              className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
            >
              Marcar todos
            </button>
            <span className="text-blue-300">|</span>
            <button
              type="button"
              onClick={() => selectAll(false)}
              className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
            >
              Desmarcar
            </button>
          </div>
        </div>

        {/* Service Details Row */}
        <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs sm:text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">Serviço:</span>
            <span>{serviceQuantity} {serviceUnit} × R$ {Number(servicePrice).toFixed(2)}</span>
          </div>
          <div className="font-bold text-gray-900">
            Subtotal Serviço: R$ {totals.serviceTotal.toFixed(2)}
          </div>
        </div>

        {/* Materials List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {items.map((mat, idx) => {
            const isChecked = mat.selected;
            const subtotal = mat.quantity * mat.unit_price;

            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isChecked
                    ? 'border-blue-300 bg-blue-50/30 shadow-xs'
                    : 'border-gray-200 bg-white opacity-70 hover:opacity-100'
                }`}
              >
                {/* Checkbox and Name */}
                <div
                  className="flex items-start gap-3 flex-1 cursor-pointer select-none"
                  onClick={() => toggleSelect(idx)}
                >
                  <div className="mt-0.5">
                    {isChecked ? (
                      <CheckSquare className={`w-5 h-5 ${isEmerald ? 'text-emerald-600' : 'text-blue-600'}`} />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <span className={`text-sm font-medium ${isChecked ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
                      {mat.material_name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-[11px]">
                        {mat.unit}
                      </span>
                      <span>Preço médio: R$ {mat.unit_price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Quantity and Price Inputs */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Qtd:</span>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      disabled={!isChecked}
                      value={mat.quantity}
                      onChange={(e) => updateQuantity(idx, parseFloat(e.target.value))}
                      className="w-16 px-2 py-1 text-xs border border-gray-300 rounded-lg text-center font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">R$:</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={!isChecked}
                      value={mat.unit_price}
                      onChange={(e) => updatePrice(idx, parseFloat(e.target.value))}
                      className="w-20 px-2 py-1 text-xs border border-gray-300 rounded-lg text-right font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>

                  <div className="w-24 text-right">
                    <div className="text-xs text-gray-400">Total</div>
                    <div className={`text-xs sm:text-sm font-bold ${isChecked ? 'text-gray-900' : 'text-gray-400'}`}>
                      R$ {subtotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Summary & Actions */}
        <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-4">
            <div>
              <div className="text-xs text-gray-500">Materiais Selecionados</div>
              <div className="text-sm font-semibold text-gray-800">
                {totals.selectedCount} de {items.length} itens (R$ {totals.materialsTotal.toFixed(2)})
              </div>
            </div>
            <div className="h-8 w-px bg-gray-300 hidden sm:block" />
            <div>
              <div className="text-xs text-gray-500">Total Estimado</div>
              <div className={`text-base sm:text-lg font-bold ${isEmerald ? 'text-emerald-700' : 'text-blue-700'}`}>
                R$ {totals.grandTotal.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="w-full sm:w-auto flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onServiceOnly}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium text-xs sm:text-sm hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Apenas o Serviço
            </button>
            <button
              type="button"
              onClick={handleConfirmWithMaterials}
              className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-white font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${primaryBg} ${primaryRing}`}
            >
              <Check className="w-4 h-4" />
              <span>
                {totals.selectedCount > 0
                  ? `Incluir Serviço + ${totals.selectedCount} Materiais`
                  : 'Confirmar Serviço'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

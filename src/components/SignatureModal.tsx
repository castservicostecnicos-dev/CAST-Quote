import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  PenTool,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { FluidSignaturePad } from './FluidSignaturePad';

export interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (signatureDataUrl: string) => Promise<void> | void;
  documentType: 'OS' | 'Orçamento';
  documentNumber: number | string;
  clientName?: string;
  signeeType?: 'client' | 'technician';
  initialSignature?: string;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  documentType,
  documentNumber,
  clientName = 'Cliente',
  signeeType = 'client',
  initialSignature
}) => {
  const [signatureData, setSignatureData] = useState<string | null>(initialSignature || null);
  const [strokeCount, setStrokeCount] = useState<number>(initialSignature ? 1 : 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSaveSignature = (dataUrl: string) => {
    setSignatureData(dataUrl);
  };

  const handleStrokeChange = (isEmpty: boolean, count: number) => {
    setStrokeCount(count);
    if (isEmpty) {
      setSignatureData(null);
    }
  };

  const handleSubmit = async () => {
    if (!signatureData || strokeCount === 0) {
      alert('Por favor, assine dentro da área delimitada antes de confirmar.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm(signatureData);
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar assinatura:', err);
      alert('Erro ao salvar assinatura. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isClient = signeeType === 'client';
  const title = isClient
    ? `Assinatura do Cliente • ${documentType} #${documentNumber}`
    : `Assinatura do Técnico • ${documentType} #${documentNumber}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[96vh] my-auto">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
              <PenTool className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm sm:text-base text-white truncate">
                {title}
              </h3>
              <p className="text-[11px] text-blue-200/80 truncate">
                {isClient ? `Titular: ${clientName}` : 'Responsável Técnico Autorizado'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto flex-1 space-y-3.5">
          {/* Mobile tip banner */}
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-900">
            <Smartphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-snug text-[11px]">
              <span className="font-semibold text-blue-950">Assinatura no Smartphone ou Tablet: </span>
              <span>
                Assine com o dedo ou caneta touch dentro da área delimitada. Se preferir mais espaço horizontal, você pode expandir a área ou virar o celular.
              </span>
            </div>
          </div>

          {/* The Optimized Fluid Signature Pad */}
          <FluidSignaturePad
            height={250}
            onSave={handleSaveSignature}
            onStrokeChange={handleStrokeChange}
            initialDataUrl={initialSignature}
            clientName={clientName}
          />

          {/* Legal / Validity Disclaimer */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Validade e Autenticidade Digital</span>
            </div>
            <p className="text-slate-500 leading-normal text-[10px] sm:text-[11px]">
              {isClient ? (
                <>
                  Ao assinar, o cliente <strong>{clientName}</strong> atesta a conferência e aprovação dos serviços descritos no documento <strong>{documentType} #{documentNumber}</strong>, incorporando a assinatura diretamente ao comprovante em PDF.
                </>
              ) : (
                <>
                  O responsável técnico atesta a exatidão técnica e conclusão dos serviços discriminados no documento <strong>{documentType} #{documentNumber}</strong>.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200/80 bg-white border border-slate-300 rounded-xl transition min-h-[42px]"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={strokeCount === 0 || isSubmitting}
            className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 min-h-[42px] flex-1 sm:flex-initial"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{isSubmitting ? 'Salvando...' : 'Confirmar Assinatura'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

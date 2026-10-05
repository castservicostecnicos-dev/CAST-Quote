import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, Share2, Cloud, X, Printer, PackageCheck } from 'lucide-react';
import { Quote, WorkOrder, Company } from '../types';
import { generateDocumentPdf, generateDocumentPdfAsync } from '../utils/pdfGenerator';
import { exportSingleDocumentToExcel } from '../utils/excelExporter';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'ORÇAMENTO' | 'ORDEM DE SERVIÇO';
  data: Quote | WorkOrder | null;
  company?: Company | null;
  onOpenShare?: () => void;
  onOpenDrive?: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  type,
  data,
  company,
  onOpenShare,
  onOpenDrive
}) => {
  const { isDev } = useAuth();
  const [fullData, setFullData] = useState<Quote | WorkOrder | null>(data);
  const [pdfDataUri, setPdfDataUri] = useState<string | null>(null);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Proactively fetch full document (items & photos) if not present in the passed object
  useEffect(() => {
    setFullData(data);
    let isCancelled = false;

    if (isOpen && data?.id) {
      const hasItems = Array.isArray(data.items) && data.items.length > 0;
      if (!hasItems) {
        setIsLoadingItems(true);
        const fetchPromise = type === 'ORÇAMENTO'
          ? api.getQuote(data.id)
          : api.getWorkOrder(data.id);

        fetchPromise
          .then((fullDoc) => {
            if (!isCancelled && fullDoc) {
              setFullData(fullDoc);
            }
          })
          .catch((err) => {
            console.warn('Não foi possível obter itens completos do documento:', err);
          })
          .finally(() => {
            if (!isCancelled) setIsLoadingItems(false);
          });
      }
    }

    return () => {
      isCancelled = true;
    };
  }, [isOpen, data, type]);

  const activeDoc = fullData || data;

  useEffect(() => {
    let isCurrent = true;
    if (isOpen && activeDoc) {
      generateDocumentPdfAsync({ type, data: activeDoc, company })
        .then((doc) => {
          if (isCurrent) {
            setPdfDataUri(doc.output('datauristring'));
          }
        })
        .catch((err) => {
          console.error('Failed to generate PDF preview asynchronously:', err);
          if (isCurrent) {
            try {
              const fallbackDoc = generateDocumentPdf({ type, data: activeDoc, company });
              setPdfDataUri(fallbackDoc.output('datauristring'));
            } catch (fallbackErr) {
              console.error('Fallback PDF generation also failed:', fallbackErr);
            }
          }
        });
    } else {
      setPdfDataUri(null);
    }
    return () => {
      isCurrent = false;
    };
  }, [isOpen, activeDoc, type, company]);

  if (!isOpen || !activeDoc) return null;

  const isQuote = type === 'ORÇAMENTO';
  const docNumber = isQuote ? (activeDoc as Quote).quote_number : (activeDoc as WorkOrder).order_number;
  const filename = `CAST_${type.replace(/\s+/g, '_')}_${docNumber}.pdf`;

  const handleDownloadPdf = async () => {
    try {
      const doc = await generateDocumentPdfAsync({ type, data: activeDoc, company });
      doc.save(filename);
    } catch {
      const doc = generateDocumentPdf({ type, data: activeDoc, company });
      doc.save(filename);
    }
  };

  const handlePrint = async () => {
    try {
      const doc = await generateDocumentPdfAsync({ type, data: activeDoc, company });
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } catch {
      const doc = generateDocumentPdf({ type, data: activeDoc, company });
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    }
  };

  const handleExcelExport = () => {
    exportSingleDocumentToExcel(type, activeDoc);
  };

  const brandColor = company?.primary_color || '#2563eb';
  const itemCount = activeDoc.items?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl h-[94vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs"
                style={{ backgroundColor: brandColor }}
              >
                {type}
              </span>
              <h2 className="text-base font-bold">Nº {docNumber}</h2>
              <span className="text-xs text-slate-300">({activeDoc.client_name})</span>
              {itemCount > 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                  <PackageCheck className="w-3 h-3 text-emerald-400" />
                  <span>{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
                </span>
              ) : isLoadingItems ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 animate-pulse">
                  <div className="w-2.5 h-2.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span>Carregando itens...</span>
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-xs transition"
              title="Baixar PDF do documento"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar PDF</span>
            </button>

            <button
              onClick={handleExcelExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-xs transition"
              title="Exportar para Excel .xlsx"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            {onOpenDrive && (
              <button
                onClick={onOpenDrive}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-700 text-white text-xs font-semibold hover:bg-purple-800 transition shadow-xs"
                title="Salvar e sincronizar PDF e fotos no Google Drive"
              >
                <Cloud className="w-3.5 h-3.5 text-purple-200" />
                <span>Salvar no Drive</span>
              </button>
            )}

            {onOpenShare && (
              <button
                onClick={onOpenShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition"
                title="Compartilhar via WhatsApp e Email"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Enviar</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Imprimir"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-2"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Viewer Body */}
        <div className="flex-1 bg-slate-100 relative">
          {pdfDataUri ? (
            <iframe
              src={pdfDataUri}
              className="w-full h-full border-0"
              title={`Visualização de ${type} #${docNumber}`}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-6 text-slate-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2" />
                <p className="text-sm font-medium">Gerando PDF com diagramação profissional...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

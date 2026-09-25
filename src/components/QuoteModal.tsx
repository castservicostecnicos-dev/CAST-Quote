import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Camera,
  Upload,
  DollarSign,
  Calendar,
  User,
  Wrench,
  FileText,
  AlertTriangle,
  CheckCircle2,
  PenTool,
  UserPlus,
  Copy,
  Sparkles,
  Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Quote, Client, Technician, ItemRow, PhotoRecord, ServiceItem } from '../types';
import { VerticalCameraModal } from './VerticalCameraModal';
import { SignatureModal } from './SignatureModal';
import { QuickClientModal } from './QuickClientModal';
import { ItemSelectorModal } from './ItemSelectorModal';
import { ItemAutocompleteInput } from './ItemAutocompleteInput';
import { AutoMaterialsPromptModal } from './AutoMaterialsPromptModal';
import { COMMON_ITEM_SUGGESTIONS } from '../constants/itemSuggestions';
import { useAutosaveDraft } from '../hooks/useAutosaveDraft';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  quoteToEdit?: Quote | null;
}

export const QuoteModal: React.FC<QuoteModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  quoteToEdit
}) => {
  const { user, activeCompany } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [catalogServices, setCatalogServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraModalMode, setCameraModalMode] = useState<'camera' | 'file'>('file');
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);

  // Form State
  const [clientId, setClientId] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [validityDate, setValidityDate] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<'Rascunho' | 'Enviado' | 'Aprovado' | 'Rejeitado' | 'Cancelado'>('Rascunho');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Items State - Inicia limpo aguardando preenchimento do usuário
  const [items, setItems] = useState<ItemRow[]>([
    {
      item_type: 'servico',
      description: '',
      quantity: 1,
      unit: 'UN',
      unit_price: 0,
      total_price: 0
    }
  ]);

  // Financials
  const [discount, setDiscount] = useState<number>(0);
  const [addition, setAddition] = useState<number>(0);

  // Photos
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);

  // Digital Signature State
  const [clientSignature, setClientSignature] = useState<string | undefined>(undefined);
  const [clientSignedAt, setClientSignedAt] = useState<string | undefined>(undefined);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  // Item Selector Modal State (Rolagem vertical e filtro automático em tempo real)
  const [isItemPickerOpen, setIsItemPickerOpen] = useState(false);
  const [itemPickerType, setItemPickerType] = useState<'all' | 'servico' | 'material'>('all');
  const [targetRowIndex, setTargetRowIndex] = useState<number | null>(null);
  const [pickerMode, setPickerMode] = useState<'replace' | 'insert_below'>('replace');
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);

  const openItemPicker = (type: 'all' | 'servico' | 'material' = 'all', rowIndex: number | null = null) => {
    setItemPickerType(type);
    setTargetRowIndex(rowIndex);
    setPickerMode('replace');
    setIsItemPickerOpen(true);
  };

  const openItemPickerBelow = (index: number, type: 'all' | 'servico' | 'material' = 'all') => {
    setItemPickerType(type);
    setTargetRowIndex(index);
    setPickerMode('insert_below');
    setIsItemPickerOpen(true);
  };

  // State for Automatic Materials Recognition Prompt Modal
  const [autoMaterialsPrompt, setAutoMaterialsPrompt] = useState<{
    isOpen: boolean;
    service: {
      description: string;
      item_type: 'servico';
      unit: string;
      unit_price: number;
      quantity: number;
    };
    requiredMaterials: any[];
    targetRowIndex: number | null;
    pickerMode: 'replace' | 'insert_below';
  } | null>(null);

  const applySingleItem = (
    selected: {
      description: string;
      item_type: 'servico' | 'material';
      unit: string;
      unit_price: number;
    },
    targetIdx: number | null,
    mode: 'replace' | 'insert_below'
  ) => {
    const qty = 1;
    const price = selected.unit_price || 0;
    const newItem: ItemRow = {
      item_type: selected.item_type,
      description: selected.description,
      quantity: qty,
      unit: selected.unit || 'UN',
      unit_price: price,
      total_price: Number((qty * price).toFixed(2))
    };

    if (mode === 'insert_below' && targetIdx !== null && targetIdx >= 0) {
      if (items.length === 1 && !items[0].description.trim() && items[0].unit_price === 0) {
        setItems([newItem]);
        setActiveItemIndex(0);
      } else {
        const updated = [...items];
        const insertIndex = targetIdx + 1;
        updated.splice(insertIndex, 0, newItem);
        setItems(updated);
        setActiveItemIndex(insertIndex);
      }
    } else if (targetIdx !== null && items[targetIdx]) {
      const updated = [...items];
      const currentQty = Number(updated[targetIdx].quantity) || 1;
      updated[targetIdx] = {
        ...updated[targetIdx],
        description: selected.description,
        item_type: selected.item_type,
        unit: selected.unit || updated[targetIdx].unit || 'UN',
        unit_price: price,
        total_price: Number((currentQty * price).toFixed(2))
      };
      setItems(updated);
      setActiveItemIndex(targetIdx);
    } else {
      const fallbackIdx = activeItemIndex >= 0 && activeItemIndex < items.length ? activeItemIndex : items.length - 1;
      if (items.length === 1 && !items[0].description.trim() && items[0].unit_price === 0) {
        setItems([newItem]);
        setActiveItemIndex(0);
      } else {
        const updated = [...items];
        const insertIndex = fallbackIdx + 1;
        updated.splice(insertIndex, 0, newItem);
        setItems(updated);
        setActiveItemIndex(insertIndex);
      }
    }
  };

  const handleSelectItemFromPicker = (selected: {
    description: string;
    item_type: 'servico' | 'material';
    unit: string;
    unit_price: number;
    required_materials?: any[];
  }) => {
    // Check if it is a service and has required materials
    let reqMats = selected.required_materials;
    if (!reqMats || reqMats.length === 0) {
      const match = catalogServices.find(
        (s) => s.name.trim().toLowerCase() === selected.description.trim().toLowerCase()
      );
      if (match && match.required_materials && match.required_materials.length > 0) {
        reqMats = match.required_materials;
      }
    }

    if (selected.item_type === 'servico' && reqMats && reqMats.length > 0) {
      const currentQty =
        targetRowIndex !== null && items[targetRowIndex] && Number(items[targetRowIndex].quantity) > 0
          ? Number(items[targetRowIndex].quantity)
          : 1;

      setAutoMaterialsPrompt({
        isOpen: true,
        service: {
          description: selected.description,
          item_type: 'servico',
          unit: selected.unit || 'UN',
          unit_price: selected.unit_price || 0,
          quantity: currentQty
        },
        requiredMaterials: reqMats,
        targetRowIndex,
        pickerMode
      });
      setIsItemPickerOpen(false);
      return;
    }

    applySingleItem(selected, targetRowIndex, pickerMode);
  };

  const handleConfirmServiceAndMaterials = (data: {
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
  }) => {
    if (!autoMaterialsPrompt) return;
    const { targetRowIndex: targetIdx, pickerMode: mode } = autoMaterialsPrompt;

    const srvRow: ItemRow = {
      item_type: 'servico',
      description: data.service.description,
      quantity: data.service.quantity,
      unit: data.service.unit,
      unit_price: data.service.unit_price,
      total_price: Number((data.service.quantity * data.service.unit_price).toFixed(2))
    };

    const matRows: ItemRow[] = data.materials.map((m) => ({
      item_type: 'material',
      description: m.description,
      quantity: m.quantity,
      unit: m.unit,
      unit_price: m.unit_price,
      total_price: Number((m.quantity * m.unit_price).toFixed(2))
    }));

    const rowsToInsert = [srvRow, ...matRows];

    if (mode === 'insert_below' && targetIdx !== null && targetIdx >= 0) {
      if (items.length === 1 && !items[0].description.trim() && items[0].unit_price === 0) {
        setItems(rowsToInsert);
        setActiveItemIndex(0);
      } else {
        const updated = [...items];
        const insertIndex = targetIdx + 1;
        updated.splice(insertIndex, 0, ...rowsToInsert);
        setItems(updated);
        setActiveItemIndex(insertIndex);
      }
    } else if (targetIdx !== null && items[targetIdx]) {
      const updated = [...items];
      updated[targetIdx] = srvRow;
      if (matRows.length > 0) {
        updated.splice(targetIdx + 1, 0, ...matRows);
      }
      setItems(updated);
      setActiveItemIndex(targetIdx);
    } else {
      const fallbackIdx = activeItemIndex >= 0 && activeItemIndex < items.length ? activeItemIndex : items.length - 1;
      if (items.length === 1 && !items[0].description.trim() && items[0].unit_price === 0) {
        setItems(rowsToInsert);
        setActiveItemIndex(0);
      } else {
        const updated = [...items];
        const insertIndex = fallbackIdx + 1;
        updated.splice(insertIndex, 0, ...rowsToInsert);
        setItems(updated);
        setActiveItemIndex(insertIndex);
      }
    }

    setAutoMaterialsPrompt(null);
    setTargetRowIndex(null);
  };

  const handleServiceOnly = () => {
    if (!autoMaterialsPrompt) return;
    const { service, targetRowIndex: targetIdx, pickerMode: mode } = autoMaterialsPrompt;
    applySingleItem(
      {
        description: service.description,
        item_type: service.item_type,
        unit: service.unit,
        unit_price: service.unit_price
      },
      targetIdx,
      mode
    );
    setAutoMaterialsPrompt(null);
    setTargetRowIndex(null);
  };

  const handleSelectItemInRow = (
    index: number,
    selected: {
      description: string;
      item_type: 'servico' | 'material';
      unit: string;
      unit_price: number;
      required_materials?: any[];
    }
  ) => {
    let reqMats = selected.required_materials;
    if (!reqMats || reqMats.length === 0) {
      const match = catalogServices.find(
        (s) => s.name.trim().toLowerCase() === selected.description.trim().toLowerCase()
      );
      if (match && match.required_materials && match.required_materials.length > 0) {
        reqMats = match.required_materials;
      }
    }

    if (selected.item_type === 'servico' && reqMats && reqMats.length > 0) {
      const currentQty = Number(items[index]?.quantity) || 1;
      setAutoMaterialsPrompt({
        isOpen: true,
        service: {
          description: selected.description,
          item_type: 'servico',
          unit: selected.unit || 'UN',
          unit_price: selected.unit_price || 0,
          quantity: currentQty
        },
        requiredMaterials: reqMats,
        targetRowIndex: index,
        pickerMode: 'replace'
      });
      return;
    }

    applySingleItem(selected, index, 'replace');
  };

  // Autosave Draft State & Debounce Mechanism
  const [isFormReady, setIsFormReady] = useState(false);
  const [isDraftDismissed, setIsDraftDismissed] = useState(false);

  const draftStorageKey = quoteToEdit
    ? `cast_draft_quote_${quoteToEdit.id}`
    : 'cast_draft_quote_new';

  const currentFormData = React.useMemo(() => ({
    clientId,
    technicianId,
    date,
    validityDate,
    status,
    description,
    address,
    notes,
    items,
    discount,
    addition,
    photos,
    clientSignature,
    clientSignedAt
  }), [
    clientId,
    technicianId,
    date,
    validityDate,
    status,
    description,
    address,
    notes,
    items,
    discount,
    addition,
    photos,
    clientSignature,
    clientSignedAt
  ]);

  const hasMeaningfulQuoteChanges = React.useCallback((d: typeof currentFormData) => {
    if (!d) return false;
    if (d.description && d.description.trim().length > 0) return true;
    if (d.address && d.address.trim().length > 0) return true;
    if (d.notes && d.notes.trim() !== 'Garantia de 12 meses nos equipamentos e 90 dias nos serviços.') return true;
    if (d.discount > 0 || d.addition > 0) return true;
    if (d.photos && d.photos.length > 0) return true;
    if (d.clientSignature) return true;
    if (d.items && d.items.length > 1) return true;
    if (d.items && d.items.length === 1) {
      const item = d.items[0];
      if (item.description && item.description.trim().length > 0) return true;
      if (item.unit_price > 0) return true;
    }
    return false;
  }, []);

  const {
    status: autosaveStatus,
    lastSavedAt,
    hasSavedDraft,
    savedDraft,
    clearDraft
  } = useAutosaveDraft({
    storageKey: draftStorageKey,
    data: currentFormData,
    enabled: isOpen,
    isReady: isFormReady,
    debounceMs: 1200,
    hasMeaningfulChanges: hasMeaningfulQuoteChanges
  });

  const showDraftBanner = isOpen && hasSavedDraft && !!savedDraft && !isDraftDismissed;

  const handleRestoreDraft = () => {
    if (!savedDraft || !savedDraft.data) return;
    const d = savedDraft.data;
    if (d.clientId !== undefined) setClientId(d.clientId);
    if (d.technicianId !== undefined) setTechnicianId(d.technicianId);
    if (d.date) setDate(d.date);
    if (d.validityDate) setValidityDate(d.validityDate);
    if (d.status) setStatus(d.status);
    if (d.description !== undefined) setDescription(d.description);
    if (d.address !== undefined) setAddress(d.address);
    if (d.notes !== undefined) setNotes(d.notes);
    if (d.items && d.items.length > 0) setItems(d.items);
    if (d.discount !== undefined) setDiscount(d.discount);
    if (d.addition !== undefined) setAddition(d.addition);
    if (d.photos) setPhotos(d.photos);
    if (d.clientSignature !== undefined) setClientSignature(d.clientSignature);
    if (d.clientSignedAt !== undefined) setClientSignedAt(d.clientSignedAt);
    setIsDraftDismissed(true);
  };

  const handleDismissDraft = () => {
    clearDraft();
    setIsDraftDismissed(true);
  };

  // Load auxiliary data & initialize form state
  useEffect(() => {
    if (isOpen) {
      setIsDraftDismissed(false);
      setIsFormReady(false);
      const init = async () => {
        await loadAuxiliaryData();
        if (quoteToEdit) {
          await initEditState(quoteToEdit);
        } else {
          resetForm();
        }
        setIsFormReady(true);
      };
      init();
    } else {
      setIsFormReady(false);
      setIsDraftDismissed(false);
    }
  }, [isOpen, quoteToEdit?.id]);

  const loadAuxiliaryData = async () => {
    try {
      const [cList, tList, sList] = await Promise.all([
        api.getClients(activeCompany?.id, user?.role),
        api.getTechnicians(activeCompany?.id, user?.role),
        api.getServices({ companyId: activeCompany?.id, userRole: user?.role }).catch(() => [])
      ]);
      setClients(cList);
      setTechnicians(tList);
      setCatalogServices(sList || []);
      if (!quoteToEdit && cList.length > 0) {
        setClientId(cList[0].id);
      }
      if (!quoteToEdit && tList.length > 0) {
        setTechnicianId(tList[0].id);
      }
    } catch (err) {
      console.error('Failed to load clients/technicians/services:', err);
    }
  };

  const initEditState = async (q: Quote) => {
    try {
      // Fetch fresh full record with items and photos
      const full = await api.getQuote(q.id);
      setClientId(full.client_id || '');
      setTechnicianId(full.technician_id || '');
      setDate(full.date || '');
      setValidityDate(full.validity_date || '');
      setStatus(full.status as any);
      setDescription(full.description || '');
      setAddress(full.address || '');
      setNotes(full.notes || '');
      setDiscount(full.discount || 0);
      setAddition(full.addition || 0);

      if (full.items && full.items.length > 0) {
        setItems(full.items);
      }
      if (full.photos && full.photos.length > 0) {
        setPhotos(full.photos);
      }
      setClientSignature(full.client_signature || undefined);
      setClientSignedAt(full.client_signed_at || undefined);
    } catch (e) {
      console.error('Error fetching quote details:', e);
    }
  };

  const resetForm = () => {
    setClientId(clients[0]?.id || '');
    setTechnicianId(technicians[0]?.id || '');
    setDate(new Date().toISOString().split('T')[0]);
    setValidityDate(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setStatus('Rascunho');
    setDescription('');
    setAddress('');
    setNotes('Garantia de 12 meses nos equipamentos e 90 dias nos serviços.');
    setDiscount(0);
    setAddition(0);
    setItems([
      {
        item_type: 'servico',
        description: '',
        quantity: 1,
        unit: 'UN',
        unit_price: 0,
        total_price: 0
      }
    ]);
    setPhotos([]);
    setClientSignature(undefined);
    setClientSignedAt(undefined);
  };

  // Dynamic Item Calculations
  const handleItemChange = (index: number, field: keyof ItemRow, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    item.total_price = Number((qty * price).toFixed(2));

    updated[index] = item;
    setItems(updated);
  };

  const handleItemDescriptionChange = (index: number, val: string) => {
    const updated = [...items];
    const catalogMatch = catalogServices.find(
      (c) => c.name.toLowerCase() === val.trim().toLowerCase()
    );
    const match = COMMON_ITEM_SUGGESTIONS.find(
      (s) => s.description.toLowerCase() === val.trim().toLowerCase()
    );

    if (catalogMatch) {
      const currentPrice = Number(updated[index].unit_price) || 0;
      const unitPrice = catalogMatch.default_price && currentPrice === 0 ? catalogMatch.default_price : currentPrice;
      const qty = Number(updated[index].quantity) || 1;
      updated[index] = {
        ...updated[index],
        description: catalogMatch.name,
        item_type: catalogMatch.item_type,
        unit: catalogMatch.unit || updated[index].unit || 'UN',
        unit_price: unitPrice,
        total_price: Number((qty * unitPrice).toFixed(2))
      };
    } else if (match) {
      const currentPrice = Number(updated[index].unit_price) || 0;
      const unitPrice = match.default_price && currentPrice === 0 ? match.default_price : currentPrice;
      const qty = Number(updated[index].quantity) || 1;
      updated[index] = {
        ...updated[index],
        description: match.description,
        item_type: match.item_type,
        unit: match.unit || updated[index].unit || 'UN',
        unit_price: unitPrice,
        total_price: Number((qty * unitPrice).toFixed(2))
      };
    } else {
      updated[index] = {
        ...updated[index],
        description: val
      };
    }
    setItems(updated);
  };

  const insertItemBelow = (index: number, type: 'servico' | 'material' = 'material') => {
    const newItem: ItemRow = {
      item_type: type,
      description: '',
      quantity: 1,
      unit: 'UN',
      unit_price: 0,
      total_price: 0
    };

    if (items.length === 1 && !items[0].description.trim() && items[0].unit_price === 0) {
      setItems([newItem]);
      setActiveItemIndex(0);
      setTimeout(() => {
        const el = document.getElementById('quote-item-desc-0');
        if (el) el.focus();
      }, 50);
      return;
    }

    const updated = [...items];
    const insertIndex = index + 1;
    updated.splice(insertIndex, 0, newItem);
    setItems(updated);
    setActiveItemIndex(insertIndex);

    setTimeout(() => {
      const el = document.getElementById(`quote-item-desc-${insertIndex}`);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 70);
  };

  const addItem = (type: 'servico' | 'material' = 'material') => {
    // Regra: abre um novo item logo abaixo do item atualmente ativo ou do último item
    const targetIdx = activeItemIndex >= 0 && activeItemIndex < items.length ? activeItemIndex : items.length - 1;
    insertItemBelow(targetIdx, type);
  };

  const addServiceItem = () => {
    const targetIdx = activeItemIndex >= 0 && activeItemIndex < items.length ? activeItemIndex : items.length - 1;
    insertItemBelow(targetIdx, 'servico');
  };

  const addMaterialItem = () => {
    const targetIdx = activeItemIndex >= 0 && activeItemIndex < items.length ? activeItemIndex : items.length - 1;
    insertItemBelow(targetIdx, 'material');
  };

  const duplicateItem = (index: number) => {
    const itemToDup = items[index];
    const updated = [...items];
    const insertIndex = index + 1;
    updated.splice(insertIndex, 0, { ...itemToDup });
    setItems(updated);
    setActiveItemIndex(insertIndex);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      alert('O orçamento deve ter pelo menos um item.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // Computed Totals
  const subtotal = items.reduce((acc, it) => acc + (Number(it.total_price) || 0), 0);
  const finalTotal = Math.max(0, subtotal - Number(discount || 0) + Number(addition || 0));

  const formatBrl = (val: number) =>
    (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      alert('Por favor, selecione um cliente.');
      return;
    }

    setLoading(true);
    try {
      const targetCompanyId = activeCompany?.id ||
        (user as any)?.company_id ||
        clients.find(c => c.id === clientId)?.company_id ||
        'comp-master-cast';

      const effectiveDesc = (description && description.trim()) ||
        (items && items[0]?.description && items[0].description.trim()) ||
        'Orçamento de serviços técnicos especializados';

      const payload = {
        company_id: targetCompanyId,
        client_id: clientId,
        technician_id: technicianId || null,
        created_by: user?.id || 'Sistema',
        date,
        validity_date: validityDate,
        status,
        description: effectiveDesc,
        address,
        subtotal,
        discount: Number(discount) || 0,
        addition: Number(addition) || 0,
        total: finalTotal,
        notes,
        items,
        photos,
        client_signature: clientSignature,
        client_signed_at: clientSignedAt
      };

      if (quoteToEdit) {
        await api.updateQuote(quoteToEdit.id, payload);
      } else {
        await api.createQuote(payload);
      }

      clearDraft();
      onSaved();
      onClose();
    } catch (err: any) {
      alert('Erro ao salvar orçamento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
        <div className="relative w-full max-w-4xl max-h-[92vh] rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden my-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold">
                  {quoteToEdit ? `Editar Orçamento #${quoteToEdit.quote_number}` : 'Novo Orçamento'}
                </h2>
                <p className="text-xs text-slate-400">
                  {activeCompany?.name} • Edição completa com fotos verticais e cálculo dinâmico
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Autosave Status Indicator */}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                {autosaveStatus === 'saving' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-amber-300 font-medium">Salvando rascunho...</span>
                  </>
                ) : lastSavedAt ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-slate-300">
                      Rascunho salvo às {lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-400">Salvamento automático ativo</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title="Fechar (seu rascunho fica salvo)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Recovery Banner for Autosaved Draft */}
          {showDraftBanner && savedDraft && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <div>
                  <span className="font-bold text-amber-900">Rascunho não finalizado encontrado:</span>
                  <span className="ml-1 text-amber-800">
                    Você tem alterações não salvas guardadas às {savedDraft.formattedTime}.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestoreDraft}
                  className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer active:scale-98"
                >
                  Restaurar Rascunho
                </button>
                <button
                  type="button"
                  onClick={handleDismissDraft}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold text-xs transition cursor-pointer"
                >
                  Descartar
                </button>
              </div>
            </div>
          )}

          {/* Form Body */}
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Step 1: Base Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Cliente *</label>
                  <button
                    type="button"
                    onClick={() => setIsQuickClientOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                    title="Cadastrar novo cliente rapidamente sem sair do orçamento"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Novo</span>
                  </button>
                </div>
                <select
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-blue-600"
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Técnico Responsável</label>
                <select
                  value={technicianId}
                  onChange={(e) => setTechnicianId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-blue-600"
                >
                  <option value="">Selecione um técnico</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.role_title || 'Técnico'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Data Emissão *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 focus:outline-hidden focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Validade Proposta</label>
                <input
                  type="date"
                  value={validityDate}
                  onChange={(e) => setValidityDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800 focus:outline-hidden focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Escopo / Descrição do Serviço *
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Instalação de CFTV IP com 8 câmeras e configuração de NVR"
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-blue-600"
              />
            </div>

            {/* Step 2: Items Table with Real-Time Auto Calculation */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                    Itens e Serviços (Cálculo Automático)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Regra: novos itens abrem <strong className="text-blue-700">logo abaixo do item que você estiver preenchendo</strong>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    id="btn-quote-add-service"
                    onClick={() => insertItemBelow(activeItemIndex, 'servico')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold border border-blue-200 transition cursor-pointer shadow-2xs"
                    title="Adicionar serviço logo abaixo do item em preenchimento"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Serviço</span>
                  </button>
                  <button
                    type="button"
                    id="btn-quote-add-material"
                    onClick={() => insertItemBelow(activeItemIndex, 'material')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold border border-amber-200 transition cursor-pointer shadow-2xs"
                    title="Adicionar material logo abaixo do item em preenchimento"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Material</span>
                  </button>
                  <button
                    type="button"
                    id="btn-quote-add-blank"
                    onClick={() => addItem('material')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold border border-slate-200 transition cursor-pointer"
                    title="Inserir novo item logo abaixo do item ativo"
                  >
                    <Plus className="w-3 h-3 text-slate-500" />
                    <span>+ Novo Item</span>
                  </button>
                  <button
                    type="button"
                    id="btn-quote-add-item"
                    onClick={() => openItemPickerBelow(activeItemIndex, 'all')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                    title="Abrir catálogo e inserir item logo abaixo"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Carregar Item</span>
                  </button>
                </div>
              </div>

              {/* Desktop / Tablet Horizontal: Linha única por item com campos amplos e boa visualização */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-2 w-36">Tipo</th>
                      <th className="py-2.5 px-2 min-w-[240px]">Descrição dos Itens & Serviços</th>
                      <th className="py-2.5 px-2 w-24">Qtd</th>
                      <th className="py-2.5 px-2 w-20">Un</th>
                      <th className="py-2.5 px-2 w-32">Valor Unit. (R$)</th>
                      <th className="py-2.5 px-2 w-32 text-right">Total</th>
                      <th className="py-2.5 px-1 w-20 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70">
                    {items.map((item, index) => (
                      <React.Fragment key={index}>
                        <tr
                          className={`transition group ${
                            activeItemIndex === index ? 'bg-blue-50/40' : 'hover:bg-white/90'
                          }`}
                          onClick={() => setActiveItemIndex(index)}
                        >
                          <td className="py-2 px-2 align-middle">
                            <select
                              value={item.item_type}
                              onFocus={() => setActiveItemIndex(index)}
                              onChange={(e) => handleItemChange(index, 'item_type', e.target.value)}
                              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                            >
                              <option value="servico">Serviço</option>
                              <option value="material">Material</option>
                            </select>
                          </td>

                          <td className="py-2 px-2 align-middle">
                            <ItemAutocompleteInput
                              id={`quote-item-desc-${index}`}
                              value={item.description}
                              onFocus={() => setActiveItemIndex(index)}
                              onChange={(val) => handleItemDescriptionChange(index, val)}
                              onSelectItem={(selected) => handleSelectItemInRow(index, selected)}
                              onOpenFullPicker={() => openItemPicker(item.item_type, index)}
                              catalogServices={catalogServices}
                              currentType={item.item_type}
                              placeholder="Digite para filtrar ou abra a lista..."
                              themeColor="blue"
                              required
                            />
                          </td>

                          <td className="py-2 px-2 align-middle">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              required
                              value={item.quantity}
                              onFocus={() => setActiveItemIndex(index)}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-800 text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                            />
                          </td>

                          <td className="py-2 px-2 align-middle">
                            <input
                              type="text"
                              value={item.unit || 'UN'}
                              onFocus={() => setActiveItemIndex(index)}
                              onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-800 text-center uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                            />
                          </td>

                          <td className="py-2 px-2 align-middle">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              required
                              value={item.unit_price === 0 ? '' : item.unit_price}
                              onFocus={() => setActiveItemIndex(index)}
                              onChange={(e) => handleItemChange(index, 'unit_price', e.target.value === '' ? 0 : e.target.value)}
                              placeholder="0,00"
                              className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                            />
                          </td>

                          <td className="py-2 px-2 align-middle font-bold text-slate-900 text-right text-sm whitespace-nowrap">
                            {formatBrl(item.total_price)}
                          </td>

                          <td className="py-2 px-1 align-middle text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => insertItemBelow(index, item.item_type)}
                                className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-100 transition cursor-pointer font-bold"
                                title="Inserir novo item logo abaixo deste"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openItemPicker(item.item_type, index)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                                title="Abrir catálogo e lista com rolagem vertical"
                              >
                                <Search className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => duplicateItem(index)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                                title="Duplicar linha logo abaixo"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              {items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                                  title="Remover linha"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Botão de Novo Item LOGO ABAIXO DO ITEM QUE ESTÁ SENDO PREENCHIDO */}
                        <tr className="border-b border-slate-200/80 bg-slate-50/60">
                          <td colSpan={7} className="py-1.5 px-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => insertItemBelow(index, item.item_type)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer active:scale-98"
                                  title={`Inserir novo item logo abaixo do item #${index + 1}`}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Novo Item Abaixo</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => insertItemBelow(index, 'servico')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition cursor-pointer"
                                  title="Adicionar serviço logo abaixo deste"
                                >
                                  <span>+ Serviço</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => insertItemBelow(index, 'material')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 text-xs font-semibold transition cursor-pointer"
                                  title="Adicionar material logo abaixo deste"
                                >
                                  <span>+ Material</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openItemPickerBelow(index, 'all')}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs font-semibold transition cursor-pointer shadow-2xs"
                                  title="Carregar item do catálogo logo abaixo deste"
                                >
                                  <Search className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Carregar do Catálogo</span>
                                </button>
                              </div>

                              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                                Inserir logo abaixo do item #{index + 1}
                              </span>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Celular / Modo Vertical: Quebra de linha responsiva com campos confortáveis e rótulos claros */}
              <div className="block md:hidden space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => setActiveItemIndex(index)}
                    className={`rounded-2xl border bg-white p-3.5 shadow-2xs space-y-3 transition ${
                      activeItemIndex === index ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'
                    }`}
                  >
                    {/* Cabeçalho do Card */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                          {item.item_type === 'servico' ? 'Serviço' : 'Material'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 font-medium">Subtotal:</span>
                        <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          {formatBrl(item.total_price)}
                        </span>
                        <button
                          type="button"
                          onClick={() => openItemPicker(item.item_type, index)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Abrir lista vertical de itens"
                        >
                          <Search className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateItem(index)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Duplicar item logo abaixo"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remover item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Campos com quebra de linha dinâmica (um após o outro) */}
                    <div className="flex flex-wrap gap-2.5">
                      {/* Tipo */}
                      <div className="w-full sm:w-auto min-w-[130px] flex-1">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Tipo de Item
                        </label>
                        <select
                          value={item.item_type}
                          onFocus={() => setActiveItemIndex(index)}
                          onChange={(e) => handleItemChange(index, 'item_type', e.target.value)}
                          className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm font-medium text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                        >
                          <option value="servico">🛠️ Serviço</option>
                          <option value="material">📦 Material</option>
                        </select>
                      </div>

                      {/* Descrição - Com campo de busca e autocompletar em tempo real */}
                      <div className="w-full">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-600">
                            Descrição do Item / Serviço
                          </label>
                          <button
                            type="button"
                            onClick={() => openItemPicker(item.item_type, index)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                          >
                            <Search className="w-3 h-3" /> Catálogo / Lista
                          </button>
                        </div>
                        <ItemAutocompleteInput
                          id={`quote-item-desc-mob-${index}`}
                          value={item.description}
                          onFocus={() => setActiveItemIndex(index)}
                          onChange={(val) => handleItemDescriptionChange(index, val)}
                          onSelectItem={(selected) => handleSelectItemInRow(index, selected)}
                          onOpenFullPicker={() => openItemPicker(item.item_type, index)}
                          catalogServices={catalogServices}
                          currentType={item.item_type}
                          placeholder="Digite para buscar ou abra a lista..."
                          themeColor="blue"
                          required
                        />
                      </div>

                      {/* Quantidade, Unidade e Preço Unitário que se adaptam e quebram linha se não couberem */}
                      <div className="w-full flex flex-wrap items-end gap-2.5">
                        <div className="flex-1 min-w-[80px]">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Qtd
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            required
                            value={item.quantity}
                            onFocus={() => setActiveItemIndex(index)}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 font-semibold text-center focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                          />
                        </div>

                        <div className="w-24 min-w-[75px]">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Unidade
                          </label>
                          <input
                            type="text"
                            value={item.unit || 'UN'}
                            onFocus={() => setActiveItemIndex(index)}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            placeholder="UN"
                            className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/60 px-2.5 py-2 text-sm text-slate-800 font-semibold text-center uppercase focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                          />
                        </div>

                        <div className="flex-1 min-w-[130px]">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Valor Unitário (R$)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            required
                            value={item.unit_price === 0 ? '' : item.unit_price}
                            onFocus={() => setActiveItemIndex(index)}
                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value === '' ? 0 : e.target.value)}
                            placeholder="0,00"
                            className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 font-semibold text-right focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                          />
                        </div>
                      </div>
                    </div>

                    {/* BOTÃO DE NOVO ITEM LOGO ABAIXO DO ITEM QUE ESTÁ SENDO PREENCHIDO */}
                    <div className="pt-2.5 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                          <Plus className="w-3.5 h-3.5 text-blue-600" />
                          Adicionar Item Logo Abaixo deste (#{index + 1}):
                        </span>
                        <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                          Abre abaixo
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => insertItemBelow(index, item.item_type)}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer active:scale-98"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ Novo Item</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openItemPickerBelow(index, 'all')}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer border border-slate-200"
                        >
                          <Search className="w-3.5 h-3.5 text-slate-600" />
                          <span>Do Catálogo</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => insertItemBelow(index, 'servico')}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 py-0.5 px-2 rounded hover:bg-blue-50"
                        >
                          + Serviço Abaixo
                        </button>
                        <span className="text-slate-300">•</span>
                        <button
                          type="button"
                          onClick={() => insertItemBelow(index, 'material')}
                          className="text-xs font-bold text-amber-700 hover:text-amber-900 py-0.5 px-2 rounded hover:bg-amber-50"
                        >
                          + Material Abaixo
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Totals Calculations Bar */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-end justify-between gap-4">
                <div className="w-full sm:w-1/2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Condições Comerciais / Observações
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Garantia, formas de pagamento, prazos de entrega..."
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-800"
                  />
                </div>

                <div className="w-full sm:w-72 bg-white rounded-xl border border-slate-200 p-3 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal dos Itens:</span>
                    <span className="font-semibold">{formatBrl(subtotal)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">Desconto (-):</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                      className="w-24 rounded-lg border border-slate-200 p-1 text-xs text-right font-medium"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">Acréscimo (+):</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={addition}
                      onChange={(e) => setAddition(Number(e.target.value) || 0)}
                      className="w-24 rounded-lg border border-slate-200 p-1 text-xs text-right font-medium"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-sm">Valor Final:</span>
                    <span className="font-extrabold text-blue-600 text-base">{formatBrl(finalTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Vertical Photos Section */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    Fotos do Orçamento ({photos.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Regra mandatória: Apenas fotos VERTICAIS são aceitas e diagramadas no PDF
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCameraModalMode('file');
                      setIsCameraOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Carregar Arquivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCameraModalMode('camera');
                      setIsCameraOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition active:scale-95"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Câmera</span>
                  </button>
                </div>
              </div>

              {photos.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-300 rounded-xl bg-white text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                  <p>Nenhuma foto anexada. Fotos adicionadas aparecerão no PDF diagramadas em formato vertical.</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCameraModalMode('file');
                        setIsCameraOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium flex items-center gap-1 transition"
                    >
                      <Upload className="w-3 h-3" />
                      Escolher foto do dispositivo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCameraModalMode('camera');
                        setIsCameraOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium flex items-center gap-1 transition"
                    >
                      <Camera className="w-3 h-3" />
                      Abrir câmera
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {photos.map((photo, pIdx) => (
                    <div
                      key={pIdx}
                      className="relative rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xs group flex flex-col"
                    >
                      <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-slate-100">
                        <img
                          src={photo.url}
                          alt={photo.caption || `Foto #${pIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(pIdx)}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-md transition"
                          title="Remover foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-1 left-1 bg-emerald-600/90 text-white text-[8px] font-bold px-1.5 py-0.2 rounded-full">
                          VERTICAL
                        </div>
                      </div>
                      <input
                        type="text"
                        value={photo.caption || ''}
                        onChange={(e) => {
                          const updated = [...photos];
                          updated[pIdx].caption = e.target.value;
                          setPhotos(updated);
                        }}
                        placeholder="Legenda da foto..."
                        className="mt-1 w-full text-[10px] text-slate-700 border-0 border-b border-slate-200 px-1 py-0.5 focus:outline-hidden focus:border-blue-600 bg-transparent"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assinatura Digital do Cliente & Aceite no Orçamento */}
            <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-b from-blue-50/40 to-slate-50/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-blue-600" />
                    Assinatura Digital de Aprovação do Orçamento
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    O cliente assina diretamente com o dedo ou caneta touch no pop-up calibrado com suavização Bézier.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSignatureModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition active:scale-95"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>{clientSignature ? 'Reassinar / Alterar' : 'Coletar Assinatura na Tela'}</span>
                  </button>
                </div>
              </div>

              {clientSignature ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 bg-white rounded-xl border border-blue-200 shadow-2xs">
                  <div className="h-20 w-48 sm:w-56 bg-slate-50 border border-slate-200 rounded-lg p-1.5 flex items-center justify-center shrink-0">
                    <img
                      src={clientSignature}
                      alt="Assinatura do Cliente"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div className="flex-1 space-y-1 text-center sm:text-left">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Assinatura Coletada e Aprovada</span>
                    </div>
                    <p className="text-xs font-medium text-slate-800">
                      Cliente: {clients.find((c) => c.id === clientId)?.name || 'Cliente'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {clientSignedAt
                        ? `Registrado em: ${new Date(clientSignedAt).toLocaleString('pt-BR')}`
                        : 'Pronta para gravação'}
                    </p>
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsSignatureModalOpen(true)}
                      className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClientSignature(undefined);
                        setClientSignedAt(undefined);
                      }}
                      className="px-3 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-blue-200 bg-white/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                      <PenTool className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">Nenhuma assinatura coletada ainda</p>
                      <p className="text-[11px] text-slate-500">
                        Clique no botão para abrir a janela pop-up e assinar na tela com toque suave.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSignatureModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs whitespace-nowrap"
                  >
                    Abrir Pop-up de Assinatura
                  </button>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                {loading ? 'Salvando...' : quoteToEdit ? 'Salvar Alterações' : 'Criar Orçamento'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Vertical Camera Modal */}
      <VerticalCameraModal
        companyId={activeCompany?.id || 'comp-1'}
        isOpen={isCameraOpen}
        initialMode={cameraModalMode}
        onClose={() => setIsCameraOpen(false)}
        onPhotoAdded={(newPhoto) => {
          setPhotos((prev) => [...prev, newPhoto]);
        }}
      />

      {/* Signature Popup Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        documentType="Orçamento"
        documentNumber={quoteToEdit?.quote_number || 'Novo'}
        clientName={clients.find((c) => c.id === clientId)?.name || 'Cliente'}
        signeeType="client"
        initialSignature={clientSignature}
        onConfirm={(sigData) => {
          setClientSignature(sigData);
          setClientSignedAt(new Date().toISOString());
        }}
      />
      {/* Datalist for fast item and service suggestions */}
      <datalist id="quote-item-datalist">
        {catalogServices
          .filter((cs) => cs.active)
          .map((cs) => (
            <option key={`cat-${cs.id}`} value={cs.name}>
              {cs.item_type === 'servico' ? '🛠️ [Catálogo]' : '📦 [Catálogo]'} {cs.category || 'Geral'} • {cs.unit} • {cs.default_price ? `R$ ${cs.default_price.toFixed(2)}` : ''}
            </option>
          ))}
        {COMMON_ITEM_SUGGESTIONS.map((sug, i) => (
          <option key={i} value={sug.description}>
            {sug.item_type === 'servico' ? '🛠️' : '📦'} {sug.category} • {sug.unit} • {sug.default_price ? `R$ ${sug.default_price}` : ''}
          </option>
        ))}
      </datalist>

      {/* Item Selector Modal com Rolagem Vertical e Filtro em Tempo Real */}
      <ItemSelectorModal
        isOpen={isItemPickerOpen}
        onClose={() => {
          setIsItemPickerOpen(false);
          setTargetRowIndex(null);
        }}
        onSelectItem={handleSelectItemFromPicker}
        onAddBlankItem={(blankType) => {
          if (blankType === 'material') addMaterialItem();
          else addServiceItem();
        }}
        initialType={itemPickerType}
        catalogServices={catalogServices}
        themeColor="blue"
      />

      {/* Auto Materials Prompt Modal */}
      {autoMaterialsPrompt && (
        <AutoMaterialsPromptModal
          isOpen={autoMaterialsPrompt.isOpen}
          onClose={() => {
            setAutoMaterialsPrompt(null);
            setTargetRowIndex(null);
          }}
          serviceName={autoMaterialsPrompt.service.description}
          serviceUnit={autoMaterialsPrompt.service.unit}
          servicePrice={autoMaterialsPrompt.service.unit_price}
          serviceQuantity={autoMaterialsPrompt.service.quantity}
          requiredMaterials={autoMaterialsPrompt.requiredMaterials}
          onConfirm={handleConfirmServiceAndMaterials}
          onServiceOnly={handleServiceOnly}
          themeColor="blue"
        />
      )}

      {/* Quick Client Modal for instant inline client registration */}
      <QuickClientModal
        isOpen={isQuickClientOpen}
        companyId={activeCompany?.id || quoteToEdit?.company_id || 'comp-cast'}
        onClose={() => setIsQuickClientOpen(false)}
        onClientCreated={(newClient) => {
          setClients((prev) => [newClient, ...prev.filter((c) => c.id !== newClient.id)]);
          setClientId(newClient.id);
        }}
      />
    </>
  );
};

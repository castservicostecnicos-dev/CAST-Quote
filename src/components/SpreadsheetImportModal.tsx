import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  Wrench,
  Package,
  RefreshCw,
  Search,
  Filter,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Trash2,
  Check,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';

export interface SpreadsheetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onImportSuccess?: () => void;
  companyId?: string;
}

export interface ParsedItem {
  id?: string;
  name: string;
  description: string;
  item_type: 'servico' | 'material';
  category: string;
  unit: string;
  default_price: number;
  unit_cost?: number;
  required_materials_text?: string;
  required_materials?: Array<{
    material_name: string;
    quantity: number;
    unit: string;
    default_price: number;
  }>;
  selected?: boolean;
  warning?: string;
}

interface ColumnMapping {
  name: string;
  type: string;
  category: string;
  unit: string;
  price: string;
  cost: string;
  materials: string;
}

// Delimiter detector for CSV text
function detectDelimiter(text: string): string {
  const firstLines = text.split(/\r\n|\n|\r/).slice(0, 5).join('\n');
  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0, '|': 0 };
  let inQuotes = false;

  for (let i = 0; i < firstLines.length; i++) {
    const char = firstLines[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && counts[char] !== undefined) {
      counts[char]++;
    }
  }

  // Semicolon is heavily favored in PT-BR CSVs
  if (counts[';'] > 0 && counts[';'] >= counts[',']) return ';';
  if (counts['\t'] > counts[',']) return '\t';
  if (counts['|'] > counts[',']) return '|';
  return ',';
}

// Parse CSV text respecting quotes and escaped quotes
function parseCsvToRows(csvText: string, delimiter: string): string[][] {
  // Remove UTF-8 BOM if present
  let cleanText = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.some((val) => val.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((val) => val.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export const SpreadsheetImportModal: React.FC<SpreadsheetImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onImportSuccess,
  companyId = 'comp-master-cast'
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    name: '',
    type: '',
    category: '',
    unit: '',
    price: '',
    cost: '',
    materials: ''
  });
  const [defaultFallbackType, setDefaultFallbackType] = useState<'servico' | 'material'>('material');
  const [updateExisting, setUpdateExisting] = useState<boolean>(true);
  const [showMappingPanel, setShowMappingPanel] = useState<boolean>(false);

  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [previewFilter, setPreviewFilter] = useState<'all' | 'servico' | 'material' | 'warning'>('all');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const triggerSuccess = () => {
    if (typeof onSuccess === 'function') onSuccess();
    if (typeof onImportSuccess === 'function') onImportSuccess();
  };

  const handleReset = () => {
    setFileName(null);
    setRawText('');
    setAvailableColumns([]);
    setRawRows([]);
    setParsedItems([]);
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowMappingPanel(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Auto-detect columns based on common Portuguese & English terms
  const detectColumnMapping = (headers: string[]): ColumnMapping => {
    const findHeader = (candidates: string[]): string => {
      for (const candidate of candidates) {
        const found = headers.find((h) => {
          const norm = h.toLowerCase().trim();
          return norm === candidate || norm.includes(candidate);
        });
        if (found) return found;
      }
      return '';
    };

    return {
      name: findHeader(['nome', 'serviço', 'servico', 'produto', 'material', 'item', 'descrição', 'descricao', 'name', 'title']),
      type: findHeader(['tipo', 'type', 'natureza', 'classificacao', 'classificação']),
      category: findHeader(['categoria', 'grupo', 'category', 'subcategoria', 'departamento']),
      unit: findHeader(['unidade', 'un', 'unit', 'medida', 'u.m.']),
      price: findHeader(['preço', 'preco', 'preço venda', 'preco venda', 'valor', 'price', 'unit_price', 'preço médio', 'preco medio']),
      cost: findHeader(['custo', 'preço custo', 'preco custo', 'cost', 'unit_cost', 'custo médio', 'custo medio']),
      materials: findHeader(['materiais', 'materiais vinculados', 'insumos', 'materiais necessários', 'materiais necessarios', 'kit', 'peças'])
    };
  };

  // Convert raw rows + column mapping into ParsedItem[]
  const convertRowsToItems = (
    rows: Record<string, string>[],
    mapping: ColumnMapping,
    fallbackType: 'servico' | 'material'
  ) => {
    const items: ParsedItem[] = [];

    rows.forEach((row, index) => {
      const name = mapping.name && row[mapping.name] ? row[mapping.name].trim() : '';
      if (!name) {
        return; // ignore completely blank rows
      }

      // Determine item_type
      let item_type: 'servico' | 'material' = fallbackType;
      if (mapping.type && row[mapping.type]) {
        const rawType = row[mapping.type].toLowerCase().trim();
        if (
          rawType.includes('mat') ||
          rawType.includes('prod') ||
          rawType.includes('pec') ||
          rawType.includes('peç') ||
          rawType === 'p' ||
          rawType === 'm'
        ) {
          item_type = 'material';
        } else if (
          rawType.includes('serv') ||
          rawType.includes('mo') ||
          rawType.includes('mão') ||
          rawType === 's'
        ) {
          item_type = 'servico';
        }
      }

      const category = (mapping.category && row[mapping.category]?.trim()) || (item_type === 'material' ? 'Material' : 'Serviço');
      const unit = (mapping.unit && row[mapping.unit]?.trim().toUpperCase()) || 'UN';

      // Parse price
      let default_price = 0;
      if (mapping.price && row[mapping.price]) {
        const cleaned = row[mapping.price]
          .replace(/[R$\s]/g, '')
          .replace(/\.(?=\d{3})/g, '') // remove thousands separators like 1.500,00
          .replace(',', '.');
        default_price = parseFloat(cleaned) || 0;
      }

      // Parse cost
      let unit_cost: number | undefined = undefined;
      if (mapping.cost && row[mapping.cost]) {
        const cleaned = row[mapping.cost]
          .replace(/[R$\s]/g, '')
          .replace(/\.(?=\d{3})/g, '')
          .replace(',', '.');
        const num = parseFloat(cleaned);
        if (!isNaN(num)) unit_cost = num;
      }

      // Parse linked materials
      const reqMatRaw = mapping.materials && row[mapping.materials] ? row[mapping.materials].trim() : '';
      const reqMaterialsList: Array<{ material_name: string; quantity: number; unit: string; default_price: number }> = [];

      if (reqMatRaw && item_type === 'servico') {
        const parts = reqMatRaw.split(/[;,]/);
        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed) continue;

          let matName = trimmed;
          let matQty = 1;
          let matUnit = 'UN';

          const matchParen = trimmed.match(/^(.+?)\s*\(([0-9.,]+)\s*([a-zA-Z]+)?\)$/);
          const matchX = trimmed.match(/^([0-9.,]+)\s*[xX]\s*(.+)$/);

          if (matchParen) {
            matName = matchParen[1].trim();
            matQty = parseFloat(matchParen[2].replace(',', '.')) || 1;
            matUnit = (matchParen[3] || 'UN').toUpperCase();
          } else if (matchX) {
            matQty = parseFloat(matchX[1].replace(',', '.')) || 1;
            matName = matchX[2].trim();
          }

          reqMaterialsList.push({
            material_name: matName,
            quantity: matQty,
            unit: matUnit,
            default_price: 0
          });
        }
      }

      let warning: string | undefined = undefined;
      if (default_price <= 0) {
        warning = 'Preço zerado ou não identificado';
      }

      items.push({
        name,
        description: row['Descrição'] || row['descricao'] || row['detalhes'] || '',
        item_type,
        category,
        unit,
        default_price,
        unit_cost,
        required_materials_text: reqMatRaw || undefined,
        required_materials: reqMaterialsList.length > 0 ? reqMaterialsList : undefined,
        selected: true,
        warning
      });
    });

    return items;
  };

  const processCsvText = (text: string, sourceName: string) => {
    try {
      const delimiter = detectDelimiter(text);
      const rows = parseCsvToRows(text, delimiter);

      if (rows.length < 2) {
        throw new Error('O arquivo CSV deve conter uma linha de cabeçalho e ao menos uma linha de dados.');
      }

      const headers = rows[0].map((h) => h.trim());
      const dataRows = rows.slice(1);

      const rowObjects = dataRows
        .map((r) => {
          const obj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            obj[h] = r[idx] || '';
          });
          return obj;
        })
        .filter((obj) => Object.values(obj).some((v) => v.length > 0));

      setAvailableColumns(headers);
      setRawRows(rowObjects);

      const mapping = detectColumnMapping(headers);
      setColumnMapping(mapping);

      const items = convertRowsToItems(rowObjects, mapping, defaultFallbackType);
      if (items.length === 0) {
        throw new Error('Nenhum item com nome pôde ser extraído. Verifique se o cabeçalho possui uma coluna de "Nome" ou "Serviço".');
      }

      setParsedItems(items);
      setFileName(sourceName);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar o texto CSV.');
    } finally {
      setLoading(false);
    }
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const isCsv = file.name.toLowerCase().endsWith('.csv');

    if (isCsv) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        processCsvText(text, file.name);
      };
      reader.onerror = () => {
        setErrorMsg('Falha ao ler arquivo CSV.');
        setLoading(false);
      };
      reader.readAsText(file, 'UTF-8');
    } else {
      // Excel (.xlsx, .xls)
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (!json || json.length === 0) {
            throw new Error('A planilha está vazia ou não possui linhas de dados válidas.');
          }

          const headers = Object.keys(json[0] || {});
          setAvailableColumns(headers);

          const stringifiedRows: Record<string, string>[] = json.map((row) => {
            const res: Record<string, string> = {};
            Object.keys(row).forEach((k) => {
              res[k] = row[k] !== undefined && row[k] !== null ? String(row[k]) : '';
            });
            return res;
          });

          setRawRows(stringifiedRows);
          const mapping = detectColumnMapping(headers);
          setColumnMapping(mapping);

          const items = convertRowsToItems(stringifiedRows, mapping, defaultFallbackType);
          if (items.length === 0) {
            throw new Error('Nenhum item válido identificado no Excel.');
          }

          setParsedItems(items);
        } catch (err: any) {
          setErrorMsg(err.message || 'Erro ao processar arquivo Excel.');
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        setErrorMsg('Falha ao ler o arquivo Excel.');
        setLoading(false);
      };

      reader.readAsArrayBuffer(file);
    }
  };

  const handleApplyColumnMappingChange = (
    newMapping: ColumnMapping,
    newFallbackType: 'servico' | 'material'
  ) => {
    setColumnMapping(newMapping);
    setDefaultFallbackType(newFallbackType);
    if (rawRows.length > 0) {
      const items = convertRowsToItems(rawRows, newMapping, newFallbackType);
      setParsedItems(items);
    }
  };

  const handleImportToDatabase = async () => {
    const selectedItems = parsedItems.filter((i) => i.selected !== false);
    if (selectedItems.length === 0) {
      setErrorMsg('Nenhum item selecionado para importação.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.batchImportServices(selectedItems, companyId, updateExisting);
      setSuccessMsg(`Sucesso! ${res.count} itens importados e sincronizados no catálogo com sucesso.`);
      setTimeout(() => {
        triggerSuccess();
        onClose();
      }, 1400);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar itens no banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  // Download sample CSV format
  const handleDownloadCsvTemplate = () => {
    const csvContent =
      '\uFEFF' + // UTF-8 BOM
      'Tipo;Nome;Categoria;Unidade;Preço;Custo;Descrição;Materiais Necessários\r\n' +
      'servico;Instalação de Câmera CFTV IP;Segurança Eletrônica;UN;150,00;60,00;Fixação física, conectorização e foco;Câmera Bullet IP 1080p (1 UN), Cabo UTP Cat6 (20 MT), Conector RJ45 (2 UN)\r\n' +
      'material;Câmera Bullet IP 1080p;Segurança Eletrônica;UN;215,00;145,00;Câmera Full HD IR 30m IP67;\r\n' +
      'material;Cabo UTP Cat6 100% Cobre;Redes e Dados;MT;5,50;3,10;Cabo homologado Anatel 4 pares;\r\n' +
      'servico;Instalação de Fechadura Biométrica;Controle de Acesso;UN;240,00;90,00;Furação e configuração de digitais;Fechadura Digital Biométrica (1 UN), Pilhas Alcalinas AA (4 UN)\r\n' +
      'material;Fechadura Digital Biométrica;Controle de Acesso;UN;490,00;340,00;Fechadura sobrepor com senha e biometria;\r\n' +
      'servico;Ponto de Rede Adicional;Infraestrutura;PT;120,00;45,00;Passagem de cabo e crimpagem fêmea;Conector Keystone RJ45 (1 UN), Cabo UTP Cat6 (15 MT)\r\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modelo_catalogo_servicos_produtos_cast.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download sample Excel (.xlsx) format
  const handleDownloadXlsxTemplate = () => {
    const templateData = [
      {
        Tipo: 'servico',
        Nome: 'Instalação de Câmera CFTV IP',
        Categoria: 'Segurança Eletrônica',
        Unidade: 'UN',
        'Preço': 150.0,
        Custo: 60.0,
        'Descrição': 'Fixação física, conectorização e vedação',
        'Materiais Necessários': 'Câmera Bullet IP 1080p (1 UN), Cabo UTP Cat6 (20 MT), Conector RJ45 (2 UN)'
      },
      {
        Tipo: 'material',
        Nome: 'Câmera Bullet IP 1080p',
        Categoria: 'Segurança Eletrônica',
        Unidade: 'UN',
        'Preço': 215.0,
        Custo: 145.0,
        'Descrição': 'Câmera Full HD infravermelho 30m IP67',
        'Materiais Necessários': ''
      },
      {
        Tipo: 'material',
        Nome: 'Cabo UTP Cat6 100% Cobre',
        Categoria: 'Redes e Dados',
        Unidade: 'MT',
        'Preço': 5.5,
        Custo: 3.1,
        'Descrição': 'Cabo 4 pares homologado Anatel',
        'Materiais Necessários': ''
      },
      {
        Tipo: 'servico',
        Nome: 'Instalação de Fechadura Digital Biométrica',
        Categoria: 'Controle de Acesso',
        Unidade: 'UN',
        'Preço': 240.0,
        Custo: 90.0,
        'Descrição': 'Furação em batente e configuração',
        'Materiais Necessários': 'Fechadura Digital Biométrica (1 UN), Pilhas AA (4 UN)'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catálogo');
    XLSX.writeFile(wb, 'modelo_catalogo_cast.xlsx');
  };

  // Row toggles
  const toggleSelectAll = (checked: boolean) => {
    setParsedItems((prev) => prev.map((item) => ({ ...item, selected: checked })));
  };

  const toggleItemSelect = (index: number) => {
    setParsedItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleRemoveRow = (index: number) => {
    setParsedItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Filtered preview items
  const filteredPreview = useMemo(() => {
    return parsedItems.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (previewFilter === 'servico') return item.item_type === 'servico';
      if (previewFilter === 'material') return item.item_type === 'material';
      if (previewFilter === 'warning') return !!item.warning;
      return true;
    });
  }, [parsedItems, searchTerm, previewFilter]);

  const countTotal = parsedItems.length;
  const countSelected = parsedItems.filter((i) => i.selected !== false).length;
  const countServicos = parsedItems.filter((i) => i.item_type === 'servico').length;
  const countMateriais = parsedItems.filter((i) => i.item_type === 'material').length;
  const countWarnings = parsedItems.filter((i) => !!i.warning).length;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                Importar Produtos & Serviços
                <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  CSV / Excel
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Carregue rapidamente sua lista de preços, materiais e serviços via arquivo delimitado ou planilha
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Download Model Templates */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Baixe um modelo pronto para preencher seus itens no formato padrão da CAST:</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-xs shadow-2xs"
                title="Arquivo CSV separado por ponto e vírgula com acentuação correta"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Modelo .CSV</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadXlsxTemplate}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-xs shadow-2xs"
                title="Planilha Microsoft Excel nativa"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Modelo .XLSX</span>
              </button>
            </div>
          </div>

          {/* Source Tabs if no items parsed yet */}
          {parsedItems.length === 0 && (
            <div className="space-y-4">
              <div className="flex border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('file')}
                  className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'file'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Carregar Arquivo (.CSV ou Excel)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`flex items-center gap-2 py-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'paste'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Colar Texto CSV</span>
                </button>
              </div>

              {activeTab === 'file' ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) processFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50/40 scale-[0.99]'
                      : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50/60'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,text/csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processFile(file);
                    }}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-3 shadow-2xs">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div className="text-sm font-bold text-gray-800">
                    {fileName ? fileName : 'Clique para selecionar ou arraste o arquivo CSV/Excel aqui'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    Formatos suportados: <strong>.CSV</strong> (delimitado por <code>;</code> ou <code>,</code>), <strong>.XLSX</strong> ou <strong>.XLS</strong>
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-gray-400">
                    <span>Reconhecimento automático de colunas de Nome, Preço, Tipo, Unidade e Insumos</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-gray-600">
                    Copie e cole aqui os dados diretamente de uma planilha (Google Sheets, Excel) ou bloco de notas:
                  </div>
                  <textarea
                    rows={7}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`Tipo;Nome;Categoria;Unidade;Preço;Custo\nservico;Instalação de Ponto de Rede;Redes;UN;120,00;45,00\nmaterial;Cabo de Rede Cat6;Redes;MT;5,50;3,10`}
                    className="w-full font-mono text-xs p-3 rounded-xl border border-gray-300 focus:outline-hidden focus:border-indigo-600 bg-gray-50"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!rawText.trim() || loading}
                      onClick={() => {
                        setLoading(true);
                        processCsvText(rawText, 'csv_copiado.csv');
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-2xs disabled:opacity-50 transition cursor-pointer"
                    >
                      Processar Texto Colado
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Parsed Results Section */}
          {parsedItems.length > 0 && (
            <div className="space-y-4">
              {/* File Info Bar + Reset */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Arquivo: <strong>{fileName}</strong></span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-600">{countTotal} linhas processadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMappingPanel(!showMappingPanel)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer transition text-[11px]"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                    <span>Mapear Colunas</span>
                    {showMappingPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-red-600 hover:bg-red-50 font-semibold cursor-pointer transition text-[11px]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Trocar Arquivo</span>
                  </button>
                </div>
              </div>

              {/* Column Mapping Collapsible Panel */}
              {showMappingPanel && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                      Mapeamento de Colunas do Arquivo
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Vincule as colunas do seu arquivo aos campos do catálogo
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nome / Descrição *
                      </label>
                      <select
                        value={columnMapping.name}
                        onChange={(e) =>
                          handleApplyColumnMappingChange(
                            { ...columnMapping, name: e.target.value },
                            defaultFallbackType
                          )
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs focus:ring-indigo-500"
                      >
                        <option value="">Selecione...</option>
                        {availableColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Tipo (Serviço ou Material)
                      </label>
                      <select
                        value={columnMapping.type}
                        onChange={(e) =>
                          handleApplyColumnMappingChange(
                            { ...columnMapping, type: e.target.value },
                            defaultFallbackType
                          )
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs focus:ring-indigo-500"
                      >
                        <option value="">(Não possui coluna de tipo)</option>
                        {availableColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Preço de Venda (R$)
                      </label>
                      <select
                        value={columnMapping.price}
                        onChange={(e) =>
                          handleApplyColumnMappingChange(
                            { ...columnMapping, price: e.target.value },
                            defaultFallbackType
                          )
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs focus:ring-indigo-500"
                      >
                        <option value="">(Sem preço)</option>
                        {availableColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Unidade de Medida
                      </label>
                      <select
                        value={columnMapping.unit}
                        onChange={(e) =>
                          handleApplyColumnMappingChange(
                            { ...columnMapping, unit: e.target.value },
                            defaultFallbackType
                          )
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs focus:ring-indigo-500"
                      >
                        <option value="">(Padrão: UN)</option>
                        {availableColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Categoria
                      </label>
                      <select
                        value={columnMapping.category}
                        onChange={(e) =>
                          handleApplyColumnMappingChange(
                            { ...columnMapping, category: e.target.value },
                            defaultFallbackType
                          )
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs focus:ring-indigo-500"
                      >
                        <option value="">(Padrão por Tipo)</option>
                        {availableColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Custo Unitário (R$)
                      </label>
                      <select
                        value={columnMapping.cost}
                        onChange={(e) =>
                          handleApplyColumnMappingChange(
                            { ...columnMapping, cost: e.target.value },
                            defaultFallbackType
                          )
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs focus:ring-indigo-500"
                      >
                        <option value="">(Opcional / Não mapear)</option>
                        {availableColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Insumos Vinculados
                      </label>
                      <select
                        value={columnMapping.materials}
                        onChange={(e) =>
                          handleApplyColumnMappingChange(
                            { ...columnMapping, materials: e.target.value },
                            defaultFallbackType
                          )
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs focus:ring-indigo-500"
                      >
                        <option value="">(Opcional / Nenhum)</option>
                        {availableColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Tipo padrão se não definido
                      </label>
                      <select
                        value={defaultFallbackType}
                        onChange={(e) =>
                          handleApplyColumnMappingChange(
                            columnMapping,
                            e.target.value as 'servico' | 'material'
                          )
                        }
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs focus:ring-indigo-500"
                      >
                        <option value="material">Material / Produto</option>
                        <option value="servico">Mão de Obra / Serviço</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Statistics & Filters Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-gray-50/80 p-3 rounded-xl border border-gray-200">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-xs ${
                      previewFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Todos ({countTotal})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('servico')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-xs ${
                      previewFilter === 'servico'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    <Wrench className="w-3 h-3" />
                    <span>Serviços ({countServicos})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('material')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-xs ${
                      previewFilter === 'material'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    <Package className="w-3 h-3" />
                    <span>Materiais ({countMateriais})</span>
                  </button>
                  {countWarnings > 0 && (
                    <button
                      type="button"
                      onClick={() => setPreviewFilter('warning')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer text-xs ${
                        previewFilter === 'warning'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      <span>Com Avisos ({countWarnings})</span>
                    </button>
                  )}
                </div>

                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrar prévia..."
                    className="w-full pl-8 pr-3 py-1 bg-white border border-gray-300 rounded-lg text-xs placeholder-gray-400 focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Parsed Preview Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-4 py-2 bg-gray-100/80 border-b border-gray-200 flex items-center justify-between text-xs font-semibold text-gray-700">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={countSelected === countTotal && countTotal > 0}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Selecionar Todos ({countSelected}/{countTotal})</span>
                    </label>
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Mostrando {filteredPreview.length} de {countTotal}
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-600 sticky top-0 border-b border-gray-200">
                      <tr>
                        <th className="py-2 px-3 w-8"></th>
                        <th className="py-2 px-3">Tipo</th>
                        <th className="py-2 px-3">Nome / Descrição</th>
                        <th className="py-2 px-3">Categoria</th>
                        <th className="py-2 px-3 text-center">Unidade</th>
                        <th className="py-2 px-3 text-right">Preço</th>
                        <th className="py-2 px-3">Insumos</th>
                        <th className="py-2 px-2 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filteredPreview.map((item, idx) => (
                        <tr
                          key={idx}
                          className={`hover:bg-gray-50/80 transition-colors ${
                            item.selected === false ? 'opacity-40 bg-gray-50/50' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={item.selected !== false}
                              onChange={() => toggleItemSelect(idx)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                item.item_type === 'servico'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {item.item_type === 'servico' ? (
                                <Wrench className="w-2.5 h-2.5" />
                              ) : (
                                <Package className="w-2.5 h-2.5" />
                              )}
                              {item.item_type === 'servico' ? 'Serviço' : 'Material'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-semibold text-gray-900 max-w-[220px]">
                            <div className="truncate" title={item.name}>
                              {item.name}
                            </div>
                            {item.warning && (
                              <span className="text-[10px] text-amber-600 flex items-center gap-1 mt-0.5">
                                <AlertTriangle className="w-3 h-3" />
                                {item.warning}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-gray-600 truncate max-w-[120px]">
                            {item.category}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-gray-700">
                            {item.unit}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-gray-900 whitespace-nowrap">
                            R$ {item.default_price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-gray-500 max-w-[160px] truncate">
                            {item.required_materials && item.required_materials.length > 0 ? (
                              <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[10px]">
                                {item.required_materials.length} insumos
                              </span>
                            ) : (
                              item.required_materials_text || '-'
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(idx)}
                              className="text-gray-400 hover:text-red-600 transition p-1 cursor-pointer"
                              title="Descartar item da importação"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Import Options Checkbox */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-800">
                  <input
                    type="checkbox"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <strong>Atualizar itens já existentes</strong> caso tenham o mesmo nome no catálogo
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold text-xs sm:text-sm hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-3">
            {parsedItems.length > 0 && (
              <span className="text-xs text-gray-500 font-medium">
                {countSelected} selecionado(s)
              </span>
            )}

            <button
              type="button"
              disabled={countSelected === 0 || loading}
              onClick={handleImportToDatabase}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Importando itens...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Importar {countSelected} Item(s) para o Catálogo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

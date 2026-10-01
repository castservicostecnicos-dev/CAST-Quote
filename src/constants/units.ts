export interface MeasurementUnit {
  symbol: string;
  name: string;
  category: 'unidade' | 'comprimento' | 'peso' | 'embalagem' | 'volume' | 'tempo';
  description?: string;
}

export const PRODUCT_UNITS: MeasurementUnit[] = [
  // Quantidades / Contagem
  { symbol: 'UN', name: 'Unidade (UN)', category: 'unidade', description: 'Item individual ou avulso' },
  { symbol: 'PC', name: 'Peça (PC)', category: 'unidade', description: 'Peça unitária' },
  { symbol: 'DZ', name: 'Dúzia (DZ - 12 un)', category: 'unidade', description: 'Conjunto de 12 unidades' },
  { symbol: 'CT', name: 'Cento (CT - 100 un)', category: 'unidade', description: 'Lote de 100 unidades' },
  { symbol: 'MIL', name: 'Milheiro (MIL - 1.000 un)', category: 'unidade', description: 'Lote de 1.000 unidades' },
  { symbol: 'PAR', name: 'Par', category: 'unidade', description: 'Par (2 unidades)' },
  { symbol: 'CJ', name: 'Conjunto / Jogo (CJ)', category: 'unidade', description: 'Kit ou conjunto montado' },

  // Embalagens / Apresentação Comercial
  { symbol: 'PCT', name: 'Pacote (PCT)', category: 'embalagem', description: 'Pacote fechado (bucha, parafuso, etc.)' },
  { symbol: 'CX', name: 'Caixa (CX)', category: 'embalagem', description: 'Caixa fechada (ex: caixa de cabo 305m)' },
  { symbol: 'RL', name: 'Rolo (RL)', category: 'embalagem', description: 'Rolo (fio, fita, cabo)' },
  { symbol: 'SC', name: 'Saco (SC)', category: 'embalagem', description: 'Saco (cimento, gesso)' },
  { symbol: 'TB', name: 'Tubo / Bisnaga (TB)', category: 'embalagem', description: 'Silicone, selante, cola' },
  { symbol: 'PT', name: 'Pote / Frasco (PT)', category: 'embalagem', description: 'Pote ou frasco' },
  { symbol: 'GL', name: 'Galão (GL)', category: 'embalagem', description: 'Galão (ex: tinta, resina)' },
  { symbol: 'LATA', name: 'Lata', category: 'embalagem', description: 'Lata (tinta, solvente, spray)' },
  { symbol: 'BD', name: 'Balde (BD)', category: 'embalagem', description: 'Balde de massa ou resina' },
  { symbol: 'FD', name: 'Fardo (FD)', category: 'embalagem', description: 'Fardo' },
  { symbol: 'KIT', name: 'Kit', category: 'embalagem', description: 'Kit de materiais' },

  // Comprimento / Dimensão
  { symbol: 'M', name: 'Metro (M)', category: 'comprimento', description: 'Metro linear (cabos, mangueiras)' },
  { symbol: 'MTS', name: 'Metros (MTS)', category: 'comprimento', description: 'Metragem linear' },
  { symbol: 'CM', name: 'Centímetro (CM)', category: 'comprimento', description: 'Centímetros' },
  { symbol: 'MM', name: 'Milímetro (MM)', category: 'comprimento', description: 'Milímetros' },
  { symbol: 'BR', name: 'Barra (BR)', category: 'comprimento', description: 'Barra de canaleta, eletroduto, perfil' },
  { symbol: 'M2', name: 'Metro Quadrado (M²)', category: 'comprimento', description: 'Área' },
  { symbol: 'M3', name: 'Metro Cúbico (M³)', category: 'comprimento', description: 'Volume cúbico' },

  // Peso / Massa
  { symbol: 'KG', name: 'Quilo (KG)', category: 'peso', description: 'Quilograma (ex: gesso, arame)' },
  { symbol: 'G', name: 'Grama (G)', category: 'peso', description: 'Gramas fracionadas' },
  { symbol: 'TON', name: 'Tonelada (TON)', category: 'peso', description: 'Toneladas' },

  // Volume / Líquidos
  { symbol: 'L', name: 'Litro (L)', category: 'volume', description: 'Litros' },
  { symbol: 'ML', name: 'Mililitro (ML)', category: 'volume', description: 'Mililitros' },

  // Serviços e Tempo
  { symbol: 'SV', name: 'Serviço (SV)', category: 'tempo', description: 'Prestação de serviço' },
  { symbol: 'HR', name: 'Hora (HR)', category: 'tempo', description: 'Hora técnica trabalhada' },
  { symbol: 'DIA', name: 'Diária (DIA)', category: 'tempo', description: 'Diária de serviço' },
  { symbol: 'MES', name: 'Mensalidade (MÊS)', category: 'tempo', description: 'Contrato mensal' },
  { symbol: 'PTOS', name: 'Pontos (PTS)', category: 'tempo', description: 'Por ponto instalado' }
];

export const COMMON_UNITS = [
  'UN',
  'M',
  'KG',
  'G',
  'PCT',
  'CX',
  'RL',
  'DZ',
  'CT',
  'MIL',
  'PAR',
  'L',
  'BR',
  'PC',
  'TB',
  'GL',
  'HR',
  'SV'
];

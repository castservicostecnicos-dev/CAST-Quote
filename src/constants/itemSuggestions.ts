export interface ItemSuggestion {
  description: string;
  item_type: 'servico' | 'material';
  unit: string;
  default_price?: number;
  category: 'Serviço' | 'Material';
}

export const COMMON_ITEM_SUGGESTIONS: ItemSuggestion[] = [
  // Serviços Técnicos Comuns
  {
    description: 'Mão de obra de instalação especializada',
    item_type: 'servico',
    unit: 'UN',
    default_price: 250,
    category: 'Serviço'
  },
  {
    description: 'Manutenção preventiva e inspeção técnica periódica',
    item_type: 'servico',
    unit: 'UN',
    default_price: 350,
    category: 'Serviço'
  },
  {
    description: 'Manutenção corretiva e reparo emergencial em campo',
    item_type: 'servico',
    unit: 'UN',
    default_price: 450,
    category: 'Serviço'
  },
  {
    description: 'Hora técnica de especialista em engenharia e automação',
    item_type: 'servico',
    unit: 'HR',
    default_price: 180,
    category: 'Serviço'
  },
  {
    description: 'Configuração, parametrização e testes de bancada',
    item_type: 'servico',
    unit: 'UN',
    default_price: 300,
    category: 'Serviço'
  },
  {
    description: 'Laudo técnico conclusivo com registro fotográfico',
    item_type: 'servico',
    unit: 'UN',
    default_price: 500,
    category: 'Serviço'
  },
  {
    description: 'Passagem, conectorização e certificação de cabeamento de rede',
    item_type: 'servico',
    unit: 'PT',
    default_price: 85,
    category: 'Serviço'
  },
  {
    description: 'Instalação e fixação de infraestrutura e eletrodutos',
    item_type: 'servico',
    unit: 'MT',
    default_price: 45,
    category: 'Serviço'
  },
  {
    description: 'Higienização técnica e desobstrução de dutos e conexões',
    item_type: 'servico',
    unit: 'UN',
    default_price: 150,
    category: 'Serviço'
  },
  {
    description: 'Treinamento operacional e entrega técnica assistida',
    item_type: 'servico',
    unit: 'HR',
    default_price: 150,
    category: 'Serviço'
  },

  // Materiais Técnicos Comuns
  {
    description: 'Cabo de rede UTP Cat6 100% Cobre homologado Anatel',
    item_type: 'material',
    unit: 'MT',
    default_price: 5.5,
    category: 'Material'
  },
  {
    description: 'Conector RJ45 Macho Cat6 com guia de inserção',
    item_type: 'material',
    unit: 'PC',
    default_price: 4.0,
    category: 'Material'
  },
  {
    description: 'Fonte chaveada estabilizada 12V 5A bivolt automática',
    item_type: 'material',
    unit: 'UN',
    default_price: 75.0,
    category: 'Material'
  },
  {
    description: 'Patch cord Cat6 injetado 1,5 metro azul/cinza',
    item_type: 'material',
    unit: 'PC',
    default_price: 18.0,
    category: 'Material'
  },
  {
    description: 'Eletroduto galvanizado a fogo 3/4" com conexões e luvas',
    item_type: 'material',
    unit: 'BARRA',
    default_price: 38.0,
    category: 'Material'
  },
  {
    description: 'Fita isolante antichama de alta fusão 3M 19mm x 20m',
    item_type: 'material',
    unit: 'RL',
    default_price: 16.5,
    category: 'Material'
  },
  {
    description: 'Bateria selada estacionária VRLA 12V 7Ah livre de manutenção',
    item_type: 'material',
    unit: 'UN',
    default_price: 135.0,
    category: 'Material'
  },
  {
    description: 'Kit de abraçadeiras plásticas nylon UV e fixadores',
    item_type: 'material',
    unit: 'PCT',
    default_price: 24.0,
    category: 'Material'
  }
];

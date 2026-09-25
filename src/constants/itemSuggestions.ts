export interface ItemSuggestion {
  description: string;
  item_type: 'servico' | 'material';
  unit: string;
  default_price?: number;
  category: string;
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
  {
    description: 'Instalação e alinhamento de câmera CFTV / IP',
    item_type: 'servico',
    unit: 'UN',
    default_price: 120,
    category: 'Serviço'
  },
  {
    description: 'Configuração de acesso remoto DVR / NVR no smartphone',
    item_type: 'servico',
    unit: 'UN',
    default_price: 160,
    category: 'Serviço'
  },
  {
    description: 'Instalação de fechadura digital biométrica / eletroímã',
    item_type: 'servico',
    unit: 'UN',
    default_price: 220,
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
  },
  {
    description: 'Câmera Dome Full HD 1080p Lente 2.8mm Visão Noturna 20m',
    item_type: 'material',
    unit: 'UN',
    default_price: 185.0,
    category: 'Material'
  },
  {
    description: 'Câmera Bullet Full HD 1080p IP67 Metálica Infravermelho 30m',
    item_type: 'material',
    unit: 'UN',
    default_price: 215.0,
    category: 'Material'
  },
  {
    description: 'Câmera IP Wi-Fi 4MP com Microfone e Auto-Tracking',
    item_type: 'material',
    unit: 'UN',
    default_price: 290.0,
    category: 'Material'
  },
  {
    description: 'Gravador DVR Stand Alone 8 Canais Full HD 1080p Multi HD',
    item_type: 'material',
    unit: 'UN',
    default_price: 520.0,
    category: 'Material'
  },
  {
    description: 'Gravador NVR 16 Canais 4K com Suporte a PoE',
    item_type: 'material',
    unit: 'UN',
    default_price: 1150.0,
    category: 'Material'
  },
  {
    description: 'HD Interno para CFTV Surveillance 1TB WD Purple / SkyHawk',
    item_type: 'material',
    unit: 'UN',
    default_price: 380.0,
    category: 'Material'
  },
  {
    description: 'HD Interno para CFTV Surveillance 2TB WD Purple / SkyHawk',
    item_type: 'material',
    unit: 'UN',
    default_price: 520.0,
    category: 'Material'
  },
  {
    description: 'Switch 8 Portas Gigabit Ethernet 10/100/1000',
    item_type: 'material',
    unit: 'UN',
    default_price: 190.0,
    category: 'Material'
  },
  {
    description: 'Switch 8 Portas PoE Fast/Gigabit para Câmeras IP',
    item_type: 'material',
    unit: 'UN',
    default_price: 430.0,
    category: 'Material'
  },
  {
    description: 'Balun de vídeo passivo HD / Full HD para par trançado (Par)',
    item_type: 'material',
    unit: 'PAR',
    default_price: 28.0,
    category: 'Material'
  },
  {
    description: 'Caixa de passagem organizadora para CFTV com vedação IP65',
    item_type: 'material',
    unit: 'UN',
    default_price: 14.5,
    category: 'Material'
  },
  {
    description: 'Fechadura Digital Biométrica com Senha, Cartão RFID e Chave',
    item_type: 'material',
    unit: 'UN',
    default_price: 680.0,
    category: 'Material'
  },
  {
    description: 'Fechadura Eletroímã 150kgf com suporte e sensor de porta',
    item_type: 'material',
    unit: 'UN',
    default_price: 260.0,
    category: 'Material'
  },
  {
    description: 'No-break Interativo 1200VA Bivolt com estabilizador interno',
    item_type: 'material',
    unit: 'UN',
    default_price: 690.0,
    category: 'Material'
  }
];

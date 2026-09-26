export interface SeedMaterialLink {
  material_id?: string;
  material_name: string;
  quantity: number;
  unit: string;
  default_price: number;
  is_optional?: number;
  notes?: string;
}

export interface SeedCatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  item_type: 'servico' | 'material';
  unit: string;
  default_price: number;
  unit_cost?: number;
  required_materials?: SeedMaterialLink[];
}

export const DEFAULT_CATALOG: SeedCatalogItem[] = [
  // ==========================================
  // MATERIAIS TÉCNICOS & EQUIPAMENTOS
  // ==========================================
  {
    id: 'mat-cam-bullet-1080p',
    name: 'Câmera Bullet Full HD 1080p IP67 Metálica Infravermelho 30m',
    description: 'Câmera analógica HD/Full HD para uso externo com vedação IP67 e visão noturna IR 30m',
    category: 'Segurança Eletrônica',
    item_type: 'material',
    unit: 'UN',
    default_price: 215.00,
    unit_cost: 145.00
  },
  {
    id: 'mat-cam-dome-1080p',
    name: 'Câmera Dome Full HD 1080p Lente 2.8mm Visão Noturna 20m',
    description: 'Câmera de segurança para ambientes internos e sob marquise com lente grande angular',
    category: 'Segurança Eletrônica',
    item_type: 'material',
    unit: 'UN',
    default_price: 185.00,
    unit_cost: 125.00
  },
  {
    id: 'mat-cam-ip-wifi-4mp',
    name: 'Câmera IP Wi-Fi 4MP com Microfone e Auto-Tracking',
    description: 'Câmera inteligente com rastreamento de movimento humano, áudio bidirecional e conexão Wi-Fi',
    category: 'Segurança Eletrônica',
    item_type: 'material',
    unit: 'UN',
    default_price: 290.00,
    unit_cost: 195.00
  },
  {
    id: 'mat-caixa-passagem-cftv',
    name: 'Caixa de passagem organizadora para CFTV com vedação IP65',
    description: 'Caixa plástica resistente com borracha de vedação para proteger conectores de intempéries',
    category: 'Segurança Eletrônica',
    item_type: 'material',
    unit: 'UN',
    default_price: 14.50,
    unit_cost: 7.20
  },
  {
    id: 'mat-cabo-cat6-cobre',
    name: 'Cabo de rede UTP Cat6 100% Cobre homologado Anatel',
    description: 'Cabo 4 pares trançados 23/24 AWG puro cobre para tráfego gigabit e alimentação PoE',
    category: 'Redes e Dados',
    item_type: 'material',
    unit: 'MT',
    default_price: 5.50,
    unit_cost: 3.10
  },
  {
    id: 'mat-cabo-cat6-blindado-uv',
    name: 'Cabo de rede UTP Cat6 blindado FTP para uso externo UV',
    description: 'Cabo com capa preta anti-UV e blindagem em fita de alumínio com condutor de dreno',
    category: 'Redes e Dados',
    item_type: 'material',
    unit: 'MT',
    default_price: 7.50,
    unit_cost: 4.30
  },
  {
    id: 'mat-conector-rj45-cat6',
    name: 'Conector RJ45 Macho Cat6 com guia de inserção',
    description: 'Conector modular 8P8C com pinos banhados a ouro e separador interno',
    category: 'Redes e Dados',
    item_type: 'material',
    unit: 'PC',
    default_price: 4.00,
    unit_cost: 1.50
  },
  {
    id: 'mat-balun-video-par',
    name: 'Balun de vídeo passivo HD / Full HD para par trançado (Par)',
    description: 'Transceptor passivo de vídeo para transmissão de sinal via cabo UTP com proteção de surto',
    category: 'Segurança Eletrônica',
    item_type: 'material',
    unit: 'PAR',
    default_price: 28.00,
    unit_cost: 14.00
  },
  {
    id: 'mat-conector-p4-macho',
    name: 'Conector P4 Macho com borne de engate rápido',
    description: 'Plug P4 macho 2.1x5.5mm com terminal de parafusar positivo e negativo',
    category: 'Segurança Eletrônica',
    item_type: 'material',
    unit: 'UN',
    default_price: 4.50,
    unit_cost: 1.60
  },
  {
    id: 'mat-conector-p4-femea',
    name: 'Conector P4 Fêmea com borne de engate rápido',
    description: 'Jack P4 fêmea 2.1x5.5mm para alimentação de câmeras e periféricos 12V',
    category: 'Segurança Eletrônica',
    item_type: 'material',
    unit: 'UN',
    default_price: 4.50,
    unit_cost: 1.60
  },
  {
    id: 'mat-fonte-12v-5a',
    name: 'Fonte chaveada estabilizada 12V 5A bivolt automática',
    description: 'Fonte colmeia / desktop bivolt para alimentação de câmeras e fechaduras eletrônicas',
    category: 'Segurança Eletrônica',
    item_type: 'material',
    unit: 'UN',
    default_price: 75.00,
    unit_cost: 42.00
  },
  {
    id: 'mat-dvr-8ch-1080p',
    name: 'Gravador DVR Stand Alone 8 Canais Full HD 1080p Multi HD',
    description: 'Gravador digital com compressão H.265+, saída HDMI/VGA e suporte a inteligência artificial',
    category: 'Segurança Eletrônica',
    item_type: 'material',
    unit: 'UN',
    default_price: 520.00,
    unit_cost: 380.00
  },
  {
    id: 'mat-hd-surveillance-1tb',
    name: 'HD Interno para CFTV Surveillance 1TB WD Purple / SkyHawk',
    description: 'Disco rígido próprio para vigilância contínua 24/7 de alta confiabilidade',
    category: 'Segurança Eletrônica',
    item_type: 'material',
    unit: 'UN',
    default_price: 380.00,
    unit_cost: 290.00
  },
  {
    id: 'mat-cabo-hdmi-2m',
    name: 'Cabo HDMI blindado alta velocidade 2,0 metros 4K',
    description: 'Cabo HDMI 2.0 com conectores banhados a ouro e malha protetora de alta densidade',
    category: 'Áudio e Vídeo',
    item_type: 'material',
    unit: 'UN',
    default_price: 35.00,
    unit_cost: 18.00
  },
  {
    id: 'mat-patchcord-cat6-1-5m',
    name: 'Patch cord Cat6 injetado 1,5 metro azul/cinza',
    description: 'Cabo de manobra confeccionado em fábrica com certificação e conectores injetados',
    category: 'Redes e Dados',
    item_type: 'material',
    unit: 'PC',
    default_price: 18.00,
    unit_cost: 8.50
  },
  {
    id: 'mat-filtro-linha-5t',
    name: 'Filtro de linha bivolt profissional 5 tomadas com fusível',
    description: 'Régua de proteção elétrica contra sobrecarga e picos de tensão com chave disjuntora',
    category: 'Elétrica',
    item_type: 'material',
    unit: 'UN',
    default_price: 45.00,
    unit_cost: 24.00
  },
  {
    id: 'mat-fechadura-digital-bio',
    name: 'Fechadura Digital Biométrica com Senha, Cartão RFID e Chave',
    description: 'Fechadura moderna com leitor biométrico de alta precisão, teclado touchscreen e alarme anti-arrombamento',
    category: 'Controle de Acesso',
    item_type: 'material',
    unit: 'UN',
    default_price: 680.00,
    unit_cost: 490.00
  },
  {
    id: 'mat-pilhas-alcalinas-aa-4un',
    name: 'Pilhas alcalinas AA 1,5V Duracell / Elgin (Cartela com 4)',
    description: 'Cartela com 4 pilhas alcalinas de longa duração próprias para fechaduras digitais',
    category: 'Controle de Acesso',
    item_type: 'material',
    unit: 'CART',
    default_price: 28.00,
    unit_cost: 16.00
  },
  {
    id: 'mat-kit-parafuso-fechadura',
    name: 'Kit parafusos passantes reforçados e calços para fechadura',
    description: 'Conjunto de parafusos de aço de alta resistência com medidas variadas e acabamentos',
    category: 'Controle de Acesso',
    item_type: 'material',
    unit: 'KIT',
    default_price: 16.00,
    unit_cost: 6.50
  },
  {
    id: 'mat-fechadura-eletroima-150kgf',
    name: 'Fechadura Eletroímã 150kgf com suporte e sensor de porta',
    description: 'Trava eletromagnética silenciosa com força de retenção de 150 kgf para portas de vidro ou madeira',
    category: 'Controle de Acesso',
    item_type: 'material',
    unit: 'UN',
    default_price: 260.00,
    unit_cost: 175.00
  },
  {
    id: 'mat-fonte-carregadora-12v2a',
    name: 'Fonte carregadora temporizada 12V 2A para controle de acesso',
    description: 'Módulo carregador para bateria com temporizador ajustável de acionamento de fechadura',
    category: 'Controle de Acesso',
    item_type: 'material',
    unit: 'UN',
    default_price: 125.00,
    unit_cost: 82.00
  },
  {
    id: 'mat-bateria-selada-12v-7ah',
    name: 'Bateria selada estacionária VRLA 12V 7Ah livre de manutenção',
    description: 'Bateria de chumbo-ácido regulada por válvula para sistemas de alarme, no-breaks e portões',
    category: 'Elétrica',
    item_type: 'material',
    unit: 'UN',
    default_price: 135.00,
    unit_cost: 92.00
  },
  {
    id: 'mat-botoeira-inox-saida',
    name: 'Botoeira inox de saída / destravamento rápido',
    description: 'Botão de pressão em aço inoxidável escovado com contato NA/NF para liberação de portas',
    category: 'Controle de Acesso',
    item_type: 'material',
    unit: 'UN',
    default_price: 48.00,
    unit_cost: 26.00
  },
  {
    id: 'mat-cabo-alarme-4vias',
    name: 'Cabo de alarme 4 vias 0,50mm flexível de cobre',
    description: 'Cabo multifilar isolado com 4 vias coloridas para interligação de sensores e controle de acesso',
    category: 'Segurança Eletrônica',
    item_type: 'material',
    unit: 'MT',
    default_price: 2.50,
    unit_cost: 1.30
  },
  {
    id: 'mat-keystone-cat6-femea',
    name: 'Keystone Jack RJ45 Cat6 fêmea 90/180 graus',
    description: 'Módulo conector fêmea padrão 110 IDC com código de cores T568A/B',
    category: 'Redes e Dados',
    item_type: 'material',
    unit: 'UN',
    default_price: 18.50,
    unit_cost: 9.00
  },
  {
    id: 'mat-espelho-4x2-keystone',
    name: 'Espelho de parede 4x2 com 1 saída para keystone',
    description: 'Placa de acabamento em termoplástico branco brilhante com suporte para encaixe',
    category: 'Redes e Dados',
    item_type: 'material',
    unit: 'UN',
    default_price: 9.50,
    unit_cost: 4.20
  },
  {
    id: 'mat-switch-8p-gigabit',
    name: 'Switch 8 Portas Gigabit Ethernet 10/100/1000',
    description: 'Switch desktop não gerenciável de alto desempenho com carcaça metálica',
    category: 'Redes e Dados',
    item_type: 'material',
    unit: 'UN',
    default_price: 190.00,
    unit_cost: 135.00
  },
  {
    id: 'mat-patchpanel-24p-cat6',
    name: 'Patch panel Cat6 24 portas descarregado 1U 19"',
    description: 'Painel metálico para montagem em rack 19 polegadas com organizador traseiro',
    category: 'Redes e Dados',
    item_type: 'material',
    unit: 'UN',
    default_price: 175.00,
    unit_cost: 110.00
  },
  {
    id: 'mat-guia-cabos-1u',
    name: 'Guia de cabos horizontal 1U 19" organizador fechado',
    description: 'Calha organizadora metálica com tampa removível para alinhamento estético de patch cords',
    category: 'Redes e Dados',
    item_type: 'material',
    unit: 'UN',
    default_price: 38.00,
    unit_cost: 21.00
  },
  {
    id: 'mat-pdu-8-tomadas-rack',
    name: 'Régua de energia PDU 8 tomadas 10A/20A para rack 19"',
    description: 'Distribuidor elétrico horizontal para rack com cabo de 1,5m e disjuntor de rearme',
    category: 'Redes e Dados',
    item_type: 'material',
    unit: 'UN',
    default_price: 120.00,
    unit_cost: 75.00
  },
  {
    id: 'mat-central-alarme-8z',
    name: 'Central de Alarme monitorada 8/16 zonas com teclado LCD',
    description: 'Central microprocessada com discador incorporado, supervisão de corte de linha e suporte a PGM',
    category: 'Segurança Eletrônica',
    item_type: 'material',
    unit: 'UN',
    default_price: 480.00,
    unit_cost: 340.00
  },
  {
    id: 'mat-sensor-ivp-pet',
    name: 'Sensor de Presença Infravermelho Passivo IVP Pet 20Kg',
    description: 'Sensor digital com compensação térmica inteligente e imunidade a animais domésticos',
    category: 'Segurança Eletrônica',
    item_type: 'material',
    unit: 'UN',
    default_price: 78.00,
    unit_cost: 48.00
  },
  {
    id: 'mat-sirene-eletronica-120db',
    name: 'Sirene eletrônica 120dB 1 tom de alta potência',
    description: 'Transdutor piezoelétrico com corneta plástica resistente ao tempo e alto poder de dissuasão',
    category: 'Segurança Eletrônica',
    item_type: 'material',
    unit: 'UN',
    default_price: 42.00,
    unit_cost: 22.00
  },
  {
    id: 'mat-kit-videoporteiro-7pol',
    name: 'Kit Vídeo Porteiro Eletrônico display LCD 7" colorido',
    description: 'Conjunto completo com câmera externa antivandálica, visão noturna e monitor interno touch',
    category: 'Interfonia e Portaria',
    item_type: 'material',
    unit: 'UN',
    default_price: 750.00,
    unit_cost: 530.00
  },
  {
    id: 'mat-fechadura-eletrica-12v',
    name: 'Fechadura elétrica sobrepor 12V com botão e cilindro ajustável',
    description: 'Fechadura tradicional reforçada compatível com todos os porteiros eletrônicos e controles de acesso',
    category: 'Interfonia e Portaria',
    item_type: 'material',
    unit: 'UN',
    default_price: 210.00,
    unit_cost: 145.00
  },
  {
    id: 'mat-motor-portao-1-3hp',
    name: 'Motor Automatizador de Portão Deslizante 1/3 HP rápido',
    description: 'Automatizador rápido para portões residenciais e semi-industriais de até 500kg',
    category: 'Automação Predial',
    item_type: 'material',
    unit: 'UN',
    default_price: 580.00,
    unit_cost: 410.00
  },
  {
    id: 'mat-barra-cremalheira-aco',
    name: 'Barra de cremalheira de aço galvanizado reforçada',
    description: 'Cremalheira padrão industrial com gomos de nylon de alta durabilidade e cantoneira de aço',
    category: 'Automação Predial',
    item_type: 'material',
    unit: 'MT',
    default_price: 35.00,
    unit_cost: 19.00
  },
  {
    id: 'mat-controle-remoto-433',
    name: 'Controle Remoto 433,92 MHz Rolling Code anti-clonagem',
    description: 'Transmissor veicular de 3 canais com clipe de fixação para quebra-sol',
    category: 'Automação Predial',
    item_type: 'material',
    unit: 'UN',
    default_price: 28.00,
    unit_cost: 12.00
  },
  {
    id: 'mat-fotocelula-seguranca',
    name: 'Sensor fotocélula de segurança anti-esmagamento (Par)',
    description: 'Barreira infravermelha ativa para impedir o fechamento acidental sobre veículos ou pedestres',
    category: 'Automação Predial',
    item_type: 'material',
    unit: 'PAR',
    default_price: 75.00,
    unit_cost: 42.00
  },
  {
    id: 'mat-radio-antena-5ghz',
    name: 'Rádio / Antena Direcional 5GHz MIMO de alta performance',
    description: 'Equipamento wireless para enlace de dados de longa distância com ganho elevado',
    category: 'Telecomunicações',
    item_type: 'material',
    unit: 'UN',
    default_price: 420.00,
    unit_cost: 310.00
  },
  {
    id: 'mat-fonte-injetor-poe',
    name: 'Fonte Injetor PoE Gigabit 24V / 48V',
    description: 'Adaptador de alimentação PoE passivo com proteção eletrostática e LED indicador',
    category: 'Telecomunicações',
    item_type: 'material',
    unit: 'UN',
    default_price: 85.00,
    unit_cost: 49.00
  },
  {
    id: 'mat-limpa-contato-spray',
    name: 'Limpa contato spray especial eletrônica e contatos 300ml',
    description: 'Desengraxante de rápida evaporação sem resíduos para restauração de condutividade',
    category: 'Manutenção Especializada',
    item_type: 'material',
    unit: 'UN',
    default_price: 32.00,
    unit_cost: 18.00
  },
  {
    id: 'mat-alcool-isopropilico-500ml',
    name: 'Álcool isopropílico 99,8% para eletrônicos 500ml',
    description: 'Solvente puro para higienização óptica, placas de circuito impresso e cabeçotes',
    category: 'Manutenção Especializada',
    item_type: 'material',
    unit: 'FR',
    default_price: 25.00,
    unit_cost: 14.00
  },
  {
    id: 'mat-fita-isolante-3m',
    name: 'Fita isolante antichama de alta fusão 3M 19mm x 20m',
    description: 'Fita adesiva de PVC antichama com alta flexibilidade e conformabilidade',
    category: 'Elétrica',
    item_type: 'material',
    unit: 'RL',
    default_price: 16.50,
    unit_cost: 9.50
  },
  {
    id: 'mat-kit-abracadeiras-nylon',
    name: 'Kit de abraçadeiras plásticas nylon UV e fixadores',
    description: 'Pacote com 100 abraçadeiras pretas resistentes a intempéries solares',
    category: 'Acessórios',
    item_type: 'material',
    unit: 'PCT',
    default_price: 24.00,
    unit_cost: 11.00
  },
  {
    id: 'mat-kit-buchas-parafusos',
    name: 'Kit buchas plásticas S6/S8 com parafusos Philips',
    description: 'Conjunto de buchas expansivas com parafusos zincados para alvenaria',
    category: 'Acessórios',
    item_type: 'material',
    unit: 'UN',
    default_price: 0.80,
    unit_cost: 0.25
  },

  // ==========================================
  // SERVIÇOS TÉCNICOS COM MATERIAIS VINCULADOS
  // ==========================================
  {
    id: 'srv-cftv-camera',
    name: 'Instalação e Fixação de Câmera CFTV / IP',
    description: 'Fixação física, passagem de cabo, conectorização, vedação estanque e direcionamento de ângulo',
    category: 'Segurança Eletrônica',
    item_type: 'servico',
    unit: 'UN',
    default_price: 140.00,
    required_materials: [
      {
        material_id: 'mat-cam-bullet-1080p',
        material_name: 'Câmera Bullet Full HD 1080p IP67 Metálica Infravermelho 30m',
        quantity: 1,
        unit: 'UN',
        default_price: 215.00
      },
      {
        material_id: 'mat-caixa-passagem-cftv',
        material_name: 'Caixa de passagem organizadora para CFTV com vedação IP65',
        quantity: 1,
        unit: 'UN',
        default_price: 14.50
      },
      {
        material_id: 'mat-cabo-cat6-cobre',
        material_name: 'Cabo de rede UTP Cat6 100% Cobre homologado Anatel',
        quantity: 20,
        unit: 'MT',
        default_price: 5.50
      },
      {
        material_id: 'mat-conector-rj45-cat6',
        material_name: 'Conector RJ45 Macho Cat6 com guia de inserção',
        quantity: 2,
        unit: 'PC',
        default_price: 4.00
      },
      {
        material_id: 'mat-balun-video-par',
        material_name: 'Balun de vídeo passivo HD / Full HD para par trançado (Par)',
        quantity: 1,
        unit: 'PAR',
        default_price: 28.00
      },
      {
        material_id: 'mat-conector-p4-macho',
        material_name: 'Conector P4 Macho com borne de engate rápido',
        quantity: 1,
        unit: 'UN',
        default_price: 4.50
      },
      {
        material_id: 'mat-conector-p4-femea',
        material_name: 'Conector P4 Fêmea com borne de engate rápido',
        quantity: 1,
        unit: 'UN',
        default_price: 4.50
      },
      {
        material_id: 'mat-kit-buchas-parafusos',
        material_name: 'Kit buchas plásticas S6/S8 com parafusos Philips',
        quantity: 4,
        unit: 'UN',
        default_price: 0.80
      }
    ]
  },
  {
    id: 'srv-cftv-camera-wifi',
    name: 'Instalação e Configuração de Câmera Wi-Fi com Auto-Tracking',
    description: 'Instalação física, ligação em ponto de energia, pareamento no roteador Wi-Fi e configuração no app',
    category: 'Segurança Eletrônica',
    item_type: 'servico',
    unit: 'UN',
    default_price: 160.00,
    required_materials: [
      {
        material_id: 'mat-cam-ip-wifi-4mp',
        material_name: 'Câmera IP Wi-Fi 4MP com Microfone e Auto-Tracking',
        quantity: 1,
        unit: 'UN',
        default_price: 290.00
      },
      {
        material_id: 'mat-caixa-passagem-cftv',
        material_name: 'Caixa de passagem organizadora para CFTV com vedação IP65',
        quantity: 1,
        unit: 'UN',
        default_price: 14.50
      },
      {
        material_id: 'mat-kit-buchas-parafusos',
        material_name: 'Kit buchas plásticas S6/S8 com parafusos Philips',
        quantity: 4,
        unit: 'UN',
        default_price: 0.80
      }
    ]
  },
  {
    id: 'srv-cftv-dvr-nvr',
    name: 'Instalação e Configuração de Gravador DVR / NVR Stand Alone',
    description: 'Fixação de HD interno de vigilância, parametrização de rede, gravação contínua e acesso em nuvem P2P',
    category: 'Segurança Eletrônica',
    item_type: 'servico',
    unit: 'UN',
    default_price: 220.00,
    required_materials: [
      {
        material_id: 'mat-dvr-8ch-1080p',
        material_name: 'Gravador DVR Stand Alone 8 Canais Full HD 1080p Multi HD',
        quantity: 1,
        unit: 'UN',
        default_price: 520.00
      },
      {
        material_id: 'mat-hd-surveillance-1tb',
        material_name: 'HD Interno para CFTV Surveillance 1TB WD Purple / SkyHawk',
        quantity: 1,
        unit: 'UN',
        default_price: 380.00
      },
      {
        material_id: 'mat-cabo-hdmi-2m',
        material_name: 'Cabo HDMI blindado alta velocidade 2,0 metros 4K',
        quantity: 1,
        unit: 'UN',
        default_price: 35.00
      },
      {
        material_id: 'mat-patchcord-cat6-1-5m',
        material_name: 'Patch cord Cat6 injetado 1,5 metro azul/cinza',
        quantity: 1,
        unit: 'PC',
        default_price: 18.00
      },
      {
        material_id: 'mat-filtro-linha-5t',
        material_name: 'Filtro de linha bivolt profissional 5 tomadas com fusível',
        quantity: 1,
        unit: 'UN',
        default_price: 45.00
      }
    ]
  },
  {
    id: 'srv-controle-fechadura-digital',
    name: 'Instalação de Fechadura Digital Biométrica de Embutir/Sobrepor',
    description: 'Furação de batente e folha da porta, instalação de máquina de travamento, ajuste e cadastro de biometrias',
    category: 'Controle de Acesso',
    item_type: 'servico',
    unit: 'UN',
    default_price: 240.00,
    required_materials: [
      {
        material_id: 'mat-fechadura-digital-bio',
        material_name: 'Fechadura Digital Biométrica com Senha, Cartão RFID e Chave',
        quantity: 1,
        unit: 'UN',
        default_price: 680.00
      },
      {
        material_id: 'mat-pilhas-alcalinas-aa-4un',
        material_name: 'Pilhas alcalinas AA 1,5V Duracell / Elgin (Cartela com 4)',
        quantity: 1,
        unit: 'CART',
        default_price: 28.00
      },
      {
        material_id: 'mat-kit-parafuso-fechadura',
        material_name: 'Kit parafusos passantes reforçados e calços para fechadura',
        quantity: 1,
        unit: 'KIT',
        default_price: 16.00
      }
    ]
  },
  {
    id: 'srv-controle-eletroima',
    name: 'Instalação de Fechadura Eletroímã com Acionador e Fonte Carregadora',
    description: 'Alinhamento mecânico do suporte ZL, passagem de cabeamento 4 vias, botoeira de saída e bateria no-break',
    category: 'Controle de Acesso',
    item_type: 'servico',
    unit: 'UN',
    default_price: 280.00,
    required_materials: [
      {
        material_id: 'mat-fechadura-eletroima-150kgf',
        material_name: 'Fechadura Eletroímã 150kgf com suporte e sensor de porta',
        quantity: 1,
        unit: 'UN',
        default_price: 260.00
      },
      {
        material_id: 'mat-fonte-carregadora-12v2a',
        material_name: 'Fonte carregadora temporizada 12V 2A para controle de acesso',
        quantity: 1,
        unit: 'UN',
        default_price: 125.00
      },
      {
        material_id: 'mat-bateria-selada-12v-7ah',
        material_name: 'Bateria selada estacionária VRLA 12V 7Ah livre de manutenção',
        quantity: 1,
        unit: 'UN',
        default_price: 135.00
      },
      {
        material_id: 'mat-botoeira-inox-saida',
        material_name: 'Botoeira inox de saída / destravamento rápido',
        quantity: 1,
        unit: 'UN',
        default_price: 48.00
      },
      {
        material_id: 'mat-cabo-alarme-4vias',
        material_name: 'Cabo de alarme 4 vias 0,50mm flexível de cobre',
        quantity: 15,
        unit: 'MT',
        default_price: 2.50
      },
      {
        material_id: 'mat-fita-isolante-3m',
        material_name: 'Fita isolante antichama de alta fusão 3M 19mm x 20m',
        quantity: 1,
        unit: 'RL',
        default_price: 16.50
      }
    ]
  },
  {
    id: 'srv-rede-ponto-cat6',
    name: 'Passagem, Conectorização e Certificação de Ponto de Rede Cat6',
    description: 'Lançamento de cabo UTP em infraestrutura, crimpagem de conectores, conectorização em keystone e teste de continuidade',
    category: 'Redes e Dados',
    item_type: 'servico',
    unit: 'PT',
    default_price: 95.00,
    required_materials: [
      {
        material_id: 'mat-cabo-cat6-cobre',
        material_name: 'Cabo de rede UTP Cat6 100% Cobre homologado Anatel',
        quantity: 30,
        unit: 'MT',
        default_price: 5.50
      },
      {
        material_id: 'mat-conector-rj45-cat6',
        material_name: 'Conector RJ45 Macho Cat6 com guia de inserção',
        quantity: 2,
        unit: 'PC',
        default_price: 4.00
      },
      {
        material_id: 'mat-keystone-cat6-femea',
        material_name: 'Keystone Jack RJ45 Cat6 fêmea 90/180 graus',
        quantity: 1,
        unit: 'UN',
        default_price: 18.50
      },
      {
        material_id: 'mat-espelho-4x2-keystone',
        material_name: 'Espelho de parede 4x2 com 1 saída para keystone',
        quantity: 1,
        unit: 'UN',
        default_price: 9.50
      },
      {
        material_id: 'mat-patchcord-cat6-1-5m',
        material_name: 'Patch cord Cat6 injetado 1,5 metro azul/cinza',
        quantity: 1,
        unit: 'PC',
        default_price: 18.00
      },
      {
        material_id: 'mat-kit-abracadeiras-nylon',
        material_name: 'Kit de abraçadeiras plásticas nylon UV e fixadores',
        quantity: 10,
        unit: 'UN',
        default_price: 0.35
      }
    ]
  },
  {
    id: 'srv-rede-montagem-rack',
    name: 'Montagem e Organização de Rack de Telecomunicações / Rede 19"',
    description: 'Fixação de equipamentos, conectorização de patch panel, roteamento de cabos com organizadores e rotulagem',
    category: 'Redes e Dados',
    item_type: 'servico',
    unit: 'UN',
    default_price: 380.00,
    required_materials: [
      {
        material_id: 'mat-switch-8p-gigabit',
        material_name: 'Switch 8 Portas Gigabit Ethernet 10/100/1000',
        quantity: 1,
        unit: 'UN',
        default_price: 190.00
      },
      {
        material_id: 'mat-patchpanel-24p-cat6',
        material_name: 'Patch panel Cat6 24 portas descarregado 1U 19"',
        quantity: 1,
        unit: 'UN',
        default_price: 175.00
      },
      {
        material_id: 'mat-guia-cabos-1u',
        material_name: 'Guia de cabos horizontal 1U 19" organizador fechado',
        quantity: 2,
        unit: 'UN',
        default_price: 38.00
      },
      {
        material_id: 'mat-pdu-8-tomadas-rack',
        material_name: 'Régua de energia PDU 8 tomadas 10A/20A para rack 19"',
        quantity: 1,
        unit: 'UN',
        default_price: 120.00
      },
      {
        material_id: 'mat-kit-abracadeiras-nylon',
        material_name: 'Kit de abraçadeiras plásticas nylon UV e fixadores',
        quantity: 1,
        unit: 'PCT',
        default_price: 24.00
      }
    ]
  },
  {
    id: 'srv-alarme-central-sensores',
    name: 'Instalação de Central de Alarme Monitorada e Sensores',
    description: 'Instalação física de central, sirene externa, posicionamento estratégico de sensores IVP e testes de disparo',
    category: 'Segurança Eletrônica',
    item_type: 'servico',
    unit: 'UN',
    default_price: 380.00,
    required_materials: [
      {
        material_id: 'mat-central-alarme-8z',
        material_name: 'Central de Alarme monitorada 8/16 zonas com teclado LCD',
        quantity: 1,
        unit: 'UN',
        default_price: 480.00
      },
      {
        material_id: 'mat-sensor-ivp-pet',
        material_name: 'Sensor de Presença Infravermelho Passivo IVP Pet 20Kg',
        quantity: 3,
        unit: 'UN',
        default_price: 78.00
      },
      {
        material_id: 'mat-sirene-eletronica-120db',
        material_name: 'Sirene eletrônica 120dB 1 tom de alta potência',
        quantity: 1,
        unit: 'UN',
        default_price: 42.00
      },
      {
        material_id: 'mat-bateria-selada-12v-7ah',
        material_name: 'Bateria selada estacionária VRLA 12V 7Ah livre de manutenção',
        quantity: 1,
        unit: 'UN',
        default_price: 135.00
      },
      {
        material_id: 'mat-cabo-alarme-4vias',
        material_name: 'Cabo de alarme 4 vias 0,50mm flexível de cobre',
        quantity: 60,
        unit: 'MT',
        default_price: 2.50
      },
      {
        material_id: 'mat-kit-buchas-parafusos',
        material_name: 'Kit buchas plásticas S6/S8 com parafusos Philips',
        quantity: 8,
        unit: 'UN',
        default_price: 0.80
      }
    ]
  },
  {
    id: 'srv-interfonia-videoporteiro',
    name: 'Instalação de Kit Vídeo Porteiro Eletrônico Colorido',
    description: 'Fixação de painel de rua, display interno, integração com fechadura elétrica e fonte de alimentação',
    category: 'Interfonia e Portaria',
    item_type: 'servico',
    unit: 'UN',
    default_price: 260.00,
    required_materials: [
      {
        material_id: 'mat-kit-videoporteiro-7pol',
        material_name: 'Kit Vídeo Porteiro Eletrônico display LCD 7" colorido',
        quantity: 1,
        unit: 'UN',
        default_price: 750.00
      },
      {
        material_id: 'mat-fechadura-eletrica-12v',
        material_name: 'Fechadura elétrica sobrepor 12V com botão e cilindro ajustável',
        quantity: 1,
        unit: 'UN',
        default_price: 210.00
      },
      {
        material_id: 'mat-cabo-alarme-4vias',
        material_name: 'Cabo de alarme 4 vias 0,50mm flexível de cobre',
        quantity: 20,
        unit: 'MT',
        default_price: 2.50
      },
      {
        material_id: 'mat-fita-isolante-3m',
        material_name: 'Fita isolante antichama de alta fusão 3M 19mm x 20m',
        quantity: 1,
        unit: 'RL',
        default_price: 16.50
      }
    ]
  },
  {
    id: 'srv-automacao-motor-portao',
    name: 'Instalação de Motor Automatizador de Portão Deslizante',
    description: 'Soldagem e nivelamento de base, fixação de cremalheira, instalação de sensores de fim de curso e fotocélulas',
    category: 'Automação Predial',
    item_type: 'servico',
    unit: 'UN',
    default_price: 320.00,
    required_materials: [
      {
        material_id: 'mat-motor-portao-1-3hp',
        material_name: 'Motor Automatizador de Portão Deslizante 1/3 HP rápido',
        quantity: 1,
        unit: 'UN',
        default_price: 580.00
      },
      {
        material_id: 'mat-barra-cremalheira-aco',
        material_name: 'Barra de cremalheira de aço galvanizado reforçada',
        quantity: 3,
        unit: 'MT',
        default_price: 35.00
      },
      {
        material_id: 'mat-controle-remoto-433',
        material_name: 'Controle Remoto 433,92 MHz Rolling Code anti-clonagem',
        quantity: 2,
        unit: 'UN',
        default_price: 28.00
      },
      {
        material_id: 'mat-fotocelula-seguranca',
        material_name: 'Sensor fotocélula de segurança anti-esmagamento (Par)',
        quantity: 1,
        unit: 'PAR',
        default_price: 75.00
      }
    ]
  },
  {
    id: 'srv-telecom-link-ptp',
    name: 'Instalação e Alinhamento de Antena / Link Rádio Ponto a Ponto 5GHz',
    description: 'Fixação de mastro, direcionamento com bússola/espectro, cabeamento blindado externo e teste de throughput',
    category: 'Telecomunicações',
    item_type: 'servico',
    unit: 'UN',
    default_price: 360.00,
    required_materials: [
      {
        material_id: 'mat-radio-antena-5ghz',
        material_name: 'Rádio / Antena Direcional 5GHz MIMO de alta performance',
        quantity: 2,
        unit: 'UN',
        default_price: 420.00
      },
      {
        material_id: 'mat-fonte-injetor-poe',
        material_name: 'Fonte Injetor PoE Gigabit 24V / 48V',
        quantity: 2,
        unit: 'UN',
        default_price: 85.00
      },
      {
        material_id: 'mat-cabo-cat6-blindado-uv',
        material_name: 'Cabo de rede UTP Cat6 blindado FTP para uso externo UV',
        quantity: 40,
        unit: 'MT',
        default_price: 7.50
      },
      {
        material_id: 'mat-conector-rj45-cat6',
        material_name: 'Conector RJ45 Macho Cat6 com guia de inserção',
        quantity: 4,
        unit: 'PC',
        default_price: 4.00
      }
    ]
  },
  {
    id: 'srv-manutencao-preventiva',
    name: 'Manutenção Preventiva e Higienização Técnica de Equipamentos e Conexões',
    description: 'Desobstrução de ventoinhas, reaperto de conexões, medição de fontes, limpeza química de contatos e emissão de laudo',
    category: 'Manutenção Especializada',
    item_type: 'servico',
    unit: 'UN',
    default_price: 280.00,
    required_materials: [
      {
        material_id: 'mat-limpa-contato-spray',
        material_name: 'Limpa contato spray especial eletrônica e contatos 300ml',
        quantity: 1,
        unit: 'UN',
        default_price: 32.00
      },
      {
        material_id: 'mat-alcool-isopropilico-500ml',
        material_name: 'Álcool isopropílico 99,8% para eletrônicos 500ml',
        quantity: 1,
        unit: 'FR',
        default_price: 25.00
      },
      {
        material_id: 'mat-kit-abracadeiras-nylon',
        material_name: 'Kit de abraçadeiras plásticas nylon UV e fixadores',
        quantity: 1,
        unit: 'PCT',
        default_price: 24.00
      }
    ]
  }
];

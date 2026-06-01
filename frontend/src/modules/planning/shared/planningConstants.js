/**
 * Constantes do módulo de planejamento de içamento.
 * Movido de App.jsx — lógica preservada sem alterações.
 */

export const MATERIAIS = [
  { nome: "Aço",                 pe: 7850  },
  { nome: "Alumínio",            pe: 2800  },
  { nome: "Bronze",              pe: 8500  },
  { nome: "Chumbo",              pe: 11400 },
  { nome: "Cobre",               pe: 8900  },
  { nome: "Ferro fundido",       pe: 7250  },
  { nome: "Concreto simples",    pe: 2400  },
  { nome: "Concreto armado",     pe: 2500  },
  { nome: "Granito",             pe: 2800  },
  { nome: "Mármore",             pe: 2800  },
  { nome: "Madeira pinho/cedro", pe: 500   },
  { nome: "Borracha",            pe: 1700  },
  { nome: "Vidro plano",         pe: 2600  },
];

export const FATORES_SEG = [
  { tipo: "Cabos e cordoalhas estáticos",       fsMin: 3  },
  { tipo: "Cabos para tração horizontal",        fsMin: 4  },
  { tipo: "Guinchos, guindastes e escavadeiras", fsMin: 5  },
  { tipo: "Pontes rolantes",                     fsMin: 6  },
  { tipo: "Talhas elétricas",                    fsMin: 7  },
  { tipo: "Guindaste estacionário",              fsMin: 6  },
  { tipo: "Laços",                               fsMin: 5  },
  { tipo: "Elevador de obra",                    fsMin: 8  },
  { tipo: "Elevador de passageiros",             fsMin: 12 },
];

export const HIGH_VOLTAGE_TABLE = [
  { faixa: "Até 1 kV",        minDist: 3.0,  norma: "NR-10 Anexo II"        },
  { faixa: "1 – 15 kV",       minDist: 3.0,  norma: "NR-10 Anexo II"        },
  { faixa: "15 – 69 kV",      minDist: 4.0,  norma: "NR-10 / ABNT NBR 5422" },
  { faixa: "69 – 138 kV",     minDist: 5.0,  norma: "NR-10 / ABNT NBR 5422" },
  { faixa: "138 – 230 kV",    minDist: 6.0,  norma: "ABNT NBR 5422"         },
  { faixa: "230 – 345 kV",    minDist: 8.0,  norma: "ABNT NBR 5422"         },
  { faixa: "345 – 500 kV",    minDist: 10.0, norma: "ABNT NBR 5422"         },
  { faixa: "Acima de 500 kV", minDist: null, norma: "Consultar especialista" },
];

export const CHECKLIST_CAMPO = [
  { id:"c1",  cat:"Guindastes & Solo",          item:"Estabilidade das esteiras/sapatas verificada" },
  { id:"c2",  cat:"Guindastes & Solo",          item:"Laudo de compactação do solo disponível" },
  { id:"c3",  cat:"Guindastes & Solo",          item:"Pressão das patolas calculada e dentro do limite do solo" },
  { id:"c4",  cat:"Guindastes & Solo",          item:"Pranchas de distribuição dimensionadas e posicionadas" },
  { id:"c5",  cat:"Equipamentos",               item:"Condições gerais do guindaste verificadas" },
  { id:"c6",  cat:"Equipamentos",               item:"Condições do moitão e cabos de içamento verificadas" },
  { id:"c7",  cat:"Equipamentos",               item:"Tabela de carga em poder do operador" },
  { id:"c8",  cat:"Equipamentos",               item:"Raio real medido na trena ≤ raio planejado" },
  { id:"c9",  cat:"Acessórios",                 item:"Eslingas/cintas sem fios rompidos ou cortes" },
  { id:"c10", cat:"Acessórios",                 item:"Todos acessórios com TAG e certificado de teste (12 meses)" },
  { id:"c11", cat:"Acessórios",                 item:"Manilhas e ganchos sem pintura (que oculta trincas)" },
  { id:"c12", cat:"Acessórios",                 item:"Relação D/d verificada (dano por curvatura excessiva)" },
  { id:"c13", cat:"Pessoal & Comunicação",      item:"Nível de experiência do operador compatível com o equipamento" },
  { id:"c14", cat:"Pessoal & Comunicação",      item:"Nível de experiência do sinaleiro" },
  { id:"c15", cat:"Pessoal & Comunicação",      item:"Supervisor experiente presente no local" },
  { id:"c16", cat:"Pessoal & Comunicação",      item:"Sistema de comunicação (rádio) testado" },
  { id:"c17", cat:"Ambiente",                   item:"Velocidade do vento < 45 km/h (boletim climático)" },
  { id:"c18", cat:"Ambiente",                   item:"Verificação do subsolo (galerias, fundações, envelopes)" },
  { id:"c19", cat:"Ambiente",                   item:"Redes elétricas na proximidade verificadas" },
  { id:"c20", cat:"Ambiente",                   item:"Linha de fogo (área de giro e queda) isolada e sinalizada" },
  { id:"c21", cat:"N-2869 — Petrobras",         item:"Plano de içamento elaborado e aprovado pela supervisão" },
  { id:"c22", cat:"N-2869 — Petrobras",         item:"APR preenchida e assinada por todos os envolvidos" },
  { id:"c23", cat:"N-2869 — Petrobras",         item:"Zona de exclusão delimitada conforme plano" },
  { id:"c24", cat:"N-2869 — Petrobras",         item:"Para içamento crítico: Rigger Nível 3 designado e presente" },
  { id:"c25", cat:"N-2869 — Petrobras",         item:"Certificados de calibração dos equipamentos de monitoração vigentes" },
  { id:"c26", cat:"N-2869 — Petrobras",         item:"Plano de contingência discutido com toda a equipe" },
];

export const CL_KEY = "rc_checklist_campo";

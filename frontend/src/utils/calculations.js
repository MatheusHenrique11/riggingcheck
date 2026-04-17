/**
 * Funções de cálculo puras para içamento de cargas.
 * NR-11 / ABNT NBR 13541 / N-2869 (Petrobras)
 */

/** Multiplicador de ângulo: 1/sin(graus). Retorna Infinity se graus = 0. */
export const multAngulo = (graus) => {
  const r = (graus * Math.PI) / 180;
  return graus > 0 ? 1 / Math.sin(r) : Infinity;
};

/**
 * Classifica percentual de uso em três faixas.
 * @param {number} pct - Percentual de utilização (0–100+)
 * @param {number[]} limites - [limiteSeguro, limiteAtencao] (padrão [80, 100])
 * @returns {"SEGURO"|"ATENCAO"|"REPROVADO"}
 */
export const statusCalc = (pct, limites = [80, 100]) =>
  pct <= limites[0] ? "SEGURO" : pct <= limites[1] ? "ATENCAO" : "REPROVADO";

/** Estilos visuais correspondentes ao status. */
export const statusStyle = (s) => ({
  SEGURO:    { color: "#22c55e", bg: "#052e16", border: "#22c55e33" },
  ATENCAO:   { color: "#f59e0b", bg: "#2d1900", border: "#f59e0b33" },
  REPROVADO: { color: "#ef4444", bg: "#1c0a0a", border: "#ef444433" },
}[s] || {});

/**
 * Materiais com peso específico (kg/m³).
 * Fonte: ABNT NBR 6118 e referências técnicas.
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

/**
 * Fatores de segurança mínimos por tipo de equipamento.
 * Fonte: NR-11 Tabela 1 / ABNT NBR 13541.
 */
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

/**
 * Calcula o volume de formas geométricas comuns.
 * @param {"PARALELEPIPEDO"|"CILINDRO"|"PIRAMIDE"|"CUBO"|"CUNHA"} forma
 * @param {{ L?: number, C?: number, H?: number, D?: number }} dims - dimensões em metros
 * @returns {number} Volume em m³, ou NaN se dimensões inválidas
 */
export const calcVolume = (forma, dims) => {
  const { L = 0, C = 0, H = 0, D = 0 } = dims;
  switch (forma) {
    case "PARALELEPIPEDO": return L * C * H;
    case "CILINDRO":       return Math.PI * (D / 2) ** 2 * H;
    case "PIRAMIDE":       return (L * C * H) / 3;
    case "CUBO":           return L ** 3;
    case "CUNHA":          return (L * C * H) / 2;
    default:               return NaN;
  }
};

/**
 * Rotula o nível de risco do backend em português.
 * @param {"SAFE"|"WARNING"|"DANGER"} level
 */
export const riskLabel = (level) =>
  ({ SAFE: "Prosseguir", WARNING: "Analisar", DANGER: "Parar" }[level] || level);

/**
 * Cor correspondente ao nível de risco.
 * @param {"SAFE"|"WARNING"|"DANGER"} level
 */
export const riskColor = (level) =>
  ({ SAFE: "#22c55e", WARNING: "#f59e0b", DANGER: "#ef4444" }[level] || "#94a3b8");

/**
 * Calcula a taxa de utilização do guindaste.
 * Thresholds conforme ABNT NBR 11900 / NR-11 (espelha RiskCalculator.java do backend):
 *   < 70%  → SEGURO / SAFE    (operação aprovada)
 *   70–89% → ATENCAO / WARNING (operação aprovada, monitorar)
 *   ≥ 90%  → REPROVADO / DANGER (operação NÃO aprovada)
 *
 * @param {number} capacidade - Capacidade nominal do guindaste (kg), deve ser > 0
 * @param {number} cargaTotal - Carga total içada (kg)
 * @returns {{ pct: number, risk: string, status: string, approved: boolean, margem: number } | null}
 *          null se capacidade <= 0
 */
export const calcCraneUsage = (capacidade, cargaTotal) => {
  if (capacidade <= 0) return null;
  const pct    = (cargaTotal / capacidade) * 100;
  const risk   = pct < 70 ? "SAFE" : pct < 90 ? "WARNING" : "DANGER";
  const status = pct < 70 ? "SEGURO" : pct < 90 ? "ATENCAO" : "REPROVADO";
  const approved = pct < 90;
  const margem = capacidade - cargaTotal;
  return { pct, risk, status, approved, margem };
};

/**
 * Tabela de distâncias mínimas seguras entre guindastes/cargas e redes elétricas
 * energizadas, por faixa de tensão.
 * Fontes: NR-10 Anexo II (2004) · ABNT NBR 5422 · IEEE C2 (NESC).
 *
 * minDist em metros; null = consultar especialista.
 */
export const HIGH_VOLTAGE_TABLE = [
  { faixa: "Até 1 kV",        minDist: 3.0,  norma: "NR-10 Anexo II"         },
  { faixa: "1 – 15 kV",       minDist: 3.0,  norma: "NR-10 Anexo II"         },
  { faixa: "15 – 69 kV",      minDist: 4.0,  norma: "NR-10 / ABNT NBR 5422"  },
  { faixa: "69 – 138 kV",     minDist: 5.0,  norma: "NR-10 / ABNT NBR 5422"  },
  { faixa: "138 – 230 kV",    minDist: 6.0,  norma: "ABNT NBR 5422"           },
  { faixa: "230 – 345 kV",    minDist: 8.0,  norma: "ABNT NBR 5422"           },
  { faixa: "345 – 500 kV",    minDist: 10.0, norma: "ABNT NBR 5422"           },
  { faixa: "Acima de 500 kV", minDist: null, norma: "Consultar especialista"  },
];

/**
 * Retorna a distância mínima segura (m) para uma dada tensão de linha (kV).
 * Retorna null para tensão inválida (negativa ou nula).
 * Retorna { minDist: null, ... } para tensões acima de 500 kV.
 *
 * @param {number} kV - Tensão da rede em kilovolts
 * @returns {{ faixa: string, minDist: number|null, norma: string } | null}
 */
export const getHighVoltageDistance = (kV) => {
  if (kV == null || kV < 0) return null;
  if (kV <= 1)   return { faixa: "Até 1 kV",        minDist: 3.0,  norma: "NR-10 Anexo II"        };
  if (kV <= 15)  return { faixa: "1 – 15 kV",        minDist: 3.0,  norma: "NR-10 Anexo II"        };
  if (kV <= 69)  return { faixa: "15 – 69 kV",       minDist: 4.0,  norma: "NR-10 / ABNT NBR 5422" };
  if (kV <= 138) return { faixa: "69 – 138 kV",      minDist: 5.0,  norma: "NR-10 / ABNT NBR 5422" };
  if (kV <= 230) return { faixa: "138 – 230 kV",     minDist: 6.0,  norma: "ABNT NBR 5422"         };
  if (kV <= 345) return { faixa: "230 – 345 kV",     minDist: 8.0,  norma: "ABNT NBR 5422"         };
  if (kV <= 500) return { faixa: "345 – 500 kV",     minDist: 10.0, norma: "ABNT NBR 5422"         };
  return           { faixa: "Acima de 500 kV",      minDist: null, norma: "Consultar especialista" };
};

/**
 * Determina se o botão de impressão de PDF deve ser exibido para o usuário.
 *
 * Regra:
 *  - Não logado → sempre pode imprimir (modo público/campo)
 *  - Logado     → somente GERENTE_OPERACOES tem acesso ao relatório
 *
 * @param {boolean} isLoggedIn - true se o usuário tiver token ativo
 * @param {string|null} role   - perfil do usuário (RoleEnum) ou null
 * @returns {boolean}
 */
/** Roles com permissão de imprimir relatório PDF quando logados. */
const ROLES_PODE_IMPRIMIR = new Set(["GERENTE_OPERACOES", "LIDER_EQUIPE", "ADMIN_EMPRESA"]);

export const canPrintPdf = (isLoggedIn, role) =>
  !isLoggedIn || ROLES_PODE_IMPRIMIR.has(role);

/**
 * Nome exibível para cada perfil de usuário.
 * @param {string} role
 */
export const roleLabel = (role) =>
  ({
    SUPER_ADMIN:        "Super Admin",
    ADMIN_EMPRESA:      "Admin",
    GERENTE_OPERACOES:  "Gerente",
    LIDER_EQUIPE:       "Líder",
    RIGGER:             "Rigger",
    OPERADOR:           "Operador",
    OPERADOR_GUINDASTE: "Op. Guindaste",
  }[role] || role);

// ─────────────────────────────────────────────────────────────────────────────
// TRIGONOMETRIA DE IÇAMENTO  (ABNT NBR 13541-1:2014)
// ─────────────────────────────────────────────────────────────────────────────

/** Ce = √(D² + He²)  — comprimento da eslinga */
export const calcSlingLength = (distHorizontal, alturaEfetiva) =>
  Math.sqrt(distHorizontal ** 2 + alturaEfetiva ** 2);

/** D = √(Ce² - He²)  — distância horizontal */
export const calcHorizontalDist = (ce, he) =>
  Math.sqrt(ce ** 2 - he ** 2);

/** ang = arcsin(He / Ce) em graus */
export const calcAngleDeg = (he, ce) =>
  (180 / Math.PI) * Math.asin(he / ce);

/** Ce = He / sin(ang)  — eslinga a partir do ângulo */
export const calcSlingFromAngle = (he, angGraus) =>
  he / Math.sin((Math.PI / 180) * angGraus);

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSÕES DE UNIDADE
// ─────────────────────────────────────────────────────────────────────────────

export const metersToFeet = (m)   => m / 0.3048;
export const feetToMeters = (ft)  => ft * 0.3048;
export const kgToLbs      = (kg)  => kg / 0.4536;
export const lbsToKg      = (lbs) => lbs * 0.4536;

// ─────────────────────────────────────────────────────────────────────────────
// MOMENTO DE CARGA — MUNCK / GUINDASTE ARTICULADO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * M = F × D  (t·m)
 * @param {number} forcaToneladas
 * @param {number} distanciaMetros
 * @param {number} limiteCapacidade  — limite do diagrama do fabricante (t·m)
 * @returns {{ momento: number, usoPct: number, risco: string, aprovado: boolean }}
 */
export const calcMunckMomento = (forcaToneladas, distanciaMetros, limiteCapacidade) => {
  const momento = forcaToneladas * distanciaMetros;
  const usoPct  = (momento / limiteCapacidade) * 100;
  const risco   = usoPct < 70 ? "SAFE" : usoPct < 90 ? "WARNING" : "DANGER";
  return { momento, usoPct, risco, aprovado: usoPct < 90 };
};

// ─────────────────────────────────────────────────────────────────────────────
// TABELA — LAÇOS DE CABO DE AÇO 6×19 AF  (NBR 13541, FS 5:1)
// ─────────────────────────────────────────────────────────────────────────────

export const CABO_ACO_TABLE = [
  { diametro: '3/8"',    mm: 9.5,  simples: 0.98, forca: 0.69, cesto: 1.96 },
  { diametro: '1/2"',    mm: 12.7, simples: 1.76, forca: 1.24, cesto: 3.52 },
  { diametro: '9/16"',   mm: 14.3, simples: 2.22, forca: 1.57, cesto: 4.44 },
  { diametro: '5/8"',    mm: 15.9, simples: 2.74, forca: 1.94, cesto: 5.48 },
  { diametro: '3/4"',    mm: 19.1, simples: 3.96, forca: 2.80, cesto: 7.92 },
  { diametro: '7/8"',    mm: 22.2, simples: 5.40, forca: 3.81, cesto: 10.80 },
  { diametro: '1"',      mm: 25.4, simples: 7.04, forca: 4.97, cesto: 14.08 },
  { diametro: '1.1/8"',  mm: 28.6, simples: 8.88, forca: 6.27, cesto: 17.76 },
  { diametro: '1.1/4"',  mm: 31.8, simples: 11.0, forca: 7.77, cesto: 22.00 },
  { diametro: '1.3/8"',  mm: 34.9, simples: 13.2, forca: 9.33, cesto: 26.40 },
  { diametro: '1.1/2"',  mm: 38.1, simples: 15.6, forca: 11.0, cesto: 31.20 },
];

// ─────────────────────────────────────────────────────────────────────────────
// TABELA — CINTAS SINTÉTICAS  (NBR 13545:2021, FS 7:1)
// ─────────────────────────────────────────────────────────────────────────────

export const CINTA_SINTETICA_TABLE = [
  { cor: "Violeta", vertical: 1.0, choker: 0.80, cesto: 2.0, ang45: 1.41, ang30: 1.0 },
  { cor: "Verde",   vertical: 2.0, choker: 1.60, cesto: 4.0, ang45: 2.83, ang30: 2.0 },
  { cor: "Amarelo", vertical: 3.0, choker: 2.40, cesto: 6.0, ang45: 4.24, ang30: 3.0 },
  { cor: "Cinza",   vertical: 4.0, choker: 3.20, cesto: 8.0, ang45: 5.66, ang30: 4.0 },
  { cor: "Vermelho",vertical: 5.0, choker: 4.00, cesto: 10.0,ang45: 7.07, ang30: 5.0 },
  { cor: "Branco",  vertical: 6.0, choker: 4.80, cesto: 12.0,ang45: 8.49, ang30: 6.0 },
  { cor: "Laranja", vertical: 8.0, choker: 6.40, cesto: 16.0,ang45: 11.31,ang30: 8.0 },
];

// ─────────────────────────────────────────────────────────────────────────────
// TABELA — MANILHAS (NBR 13545 / ASME B30.26)
// ─────────────────────────────────────────────────────────────────────────────

export const MANILHA_TABLE = [
  { mm:  9.5, swlCurva:  0.50, swlReta:  0.50 },
  { mm: 11.0, swlCurva:  0.75, swlReta:  0.75 },
  { mm: 12.7, swlCurva:  1.00, swlReta:  1.00 },
  { mm: 16.0, swlCurva:  2.00, swlReta:  2.00 },
  { mm: 19.0, swlCurva:  3.20, swlReta:  3.20 },
  { mm: 22.0, swlCurva:  4.75, swlReta:  4.75 },
  { mm: 25.0, swlCurva:  6.50, swlReta:  6.50 },
  { mm: 29.0, swlCurva:  8.50, swlReta:  8.50 },
  { mm: 32.0, swlCurva: 12.00, swlReta: 11.00 },
  { mm: 35.0, swlCurva: 13.50, swlReta: 12.50 },
  { mm: 38.0, swlCurva: 17.00, swlReta: 15.00 },
  { mm: 44.0, swlCurva: 22.00, swlReta: 19.50 },
  { mm: 51.0, swlCurva: 32.50, swlReta: 27.50 },
];

// ─────────────────────────────────────────────────────────────────────────────
// N-2869 PETROBRAS — classificação de içamento
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classifica o içamento conforme N-2869 Rev.B item 7.4.
 * Retorna "CRITICO", "NAO_ROTINEIRO" ou "ROTINEIRO".
 *
 * Critérios de içamento CRÍTICO (qualquer um):
 *  - Carga > 75% da capacidade nominal do guindaste no raio de operação
 *  - Dois ou mais guindastes em tandem
 *  - Içamento sobre área habitada / área de processo
 *  - Carga com características especiais (frágil, perigosa, alta planta)
 */
export const classificarIcamento = ({
  usoPct,
  tandem = false,
  sobreAreaHabitada = false,
  cargaEspecial = false,
}) => {
  if (usoPct > 75 || tandem || sobreAreaHabitada || cargaEspecial) return "CRITICO";
  if (usoPct > 50) return "NAO_ROTINEIRO";
  return "ROTINEIRO";
};

/** Documentos obrigatórios por classificação (N-2869 Tabela 2). */
export const N2869_DOCUMENTOS = {
  ROTINEIRO:     ["Permissão de Trabalho (PT)", "AST"],
  NAO_ROTINEIRO: ["Permissão de Trabalho (PT)", "Análise de Risco (ART/AST)", "Plano de Comunicação"],
  CRITICO:       ["Permissão de Trabalho (PT)", "Análise de Risco (ART/AST)", "Plano de Rigging Detalhado", "Plano de Comunicação"],
};

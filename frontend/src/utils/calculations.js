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

export const metersToFeet  = (m)   => m / 0.3048;
export const feetToMeters  = (ft)  => ft * 0.3048;
export const kgToLbs       = (kg)  => kg / 0.4536;
export const lbsToKg       = (lbs) => lbs * 0.4536;
export const inchesToMm    = (pol) => pol * 25.4;
export const mmToInches    = (mm)  => mm / 25.4;

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
// TABELA — LAÇO CABO DE AÇO 6×19 AA/IWRC  (NBR 13541, FS 5:1, alma de aço)
// Capacidade ~7-10 % superior à alma de fibra (AF) pela maior resistência do núcleo.
// ─────────────────────────────────────────────────────────────────────────────

export const CABO_ACO_19AA_TABLE = [
  { diametro: '3/8"',    mm: 9.5,  simples: 1.08, forca: 0.76, cesto: 2.16 },
  { diametro: '1/2"',    mm: 12.7, simples: 1.94, forca: 1.37, cesto: 3.88 },
  { diametro: '9/16"',   mm: 14.3, simples: 2.46, forca: 1.74, cesto: 4.92 },
  { diametro: '5/8"',    mm: 15.9, simples: 3.04, forca: 2.15, cesto: 6.08 },
  { diametro: '3/4"',    mm: 19.1, simples: 4.38, forca: 3.09, cesto: 8.76 },
  { diametro: '7/8"',    mm: 22.2, simples: 5.98, forca: 4.22, cesto: 11.96 },
  { diametro: '1"',      mm: 25.4, simples: 7.80, forca: 5.50, cesto: 15.60 },
  { diametro: '1.1/8"',  mm: 28.6, simples: 9.84, forca: 6.95, cesto: 19.68 },
  { diametro: '1.1/4"',  mm: 31.8, simples: 12.18,forca: 8.60, cesto: 24.36 },
  { diametro: '1.3/8"',  mm: 34.9, simples: 14.64,forca: 10.34,cesto: 29.28 },
  { diametro: '1.1/2"',  mm: 38.1, simples: 17.30,forca: 12.21,cesto: 34.60 },
];

// ─────────────────────────────────────────────────────────────────────────────
// TABELA — LAÇO CABO DE AÇO 6×37 AF  (NBR 13541, FS 5:1, alma de fibra)
// Maior flexibilidade que 6×19; levemente inferior em resistência para o mesmo Ø.
// ─────────────────────────────────────────────────────────────────────────────

export const CABO_ACO_37AF_TABLE = [
  { diametro: '3/8"',    mm: 9.5,  simples: 0.93, forca: 0.66, cesto: 1.86 },
  { diametro: '1/2"',    mm: 12.7, simples: 1.67, forca: 1.18, cesto: 3.34 },
  { diametro: '9/16"',   mm: 14.3, simples: 2.11, forca: 1.49, cesto: 4.22 },
  { diametro: '5/8"',    mm: 15.9, simples: 2.60, forca: 1.84, cesto: 5.20 },
  { diametro: '3/4"',    mm: 19.1, simples: 3.76, forca: 2.66, cesto: 7.52 },
  { diametro: '7/8"',    mm: 22.2, simples: 5.13, forca: 3.62, cesto: 10.26 },
  { diametro: '1"',      mm: 25.4, simples: 6.69, forca: 4.72, cesto: 13.38 },
  { diametro: '1.1/8"',  mm: 28.6, simples: 8.44, forca: 5.96, cesto: 16.88 },
  { diametro: '1.1/4"',  mm: 31.8, simples: 10.45,forca: 7.38, cesto: 20.90 },
  { diametro: '1.3/8"',  mm: 34.9, simples: 12.54,forca: 8.86, cesto: 25.08 },
  { diametro: '1.1/2"',  mm: 38.1, simples: 14.82,forca: 10.47,cesto: 29.64 },
];

// ─────────────────────────────────────────────────────────────────────────────
// TABELA — CORRENTE DE IÇAMENTO GRAU 80 (EN 818-4 / NBR ISO 3076, FS 4:1)
// WLL em toneladas para eslinga de 1 perna (simples), 2 pernas e modo choker.
// Ângulo de referência para 2 pernas: β = 0°–45° / 45°–60° / 60°–90°.
// ─────────────────────────────────────────────────────────────────────────────

export const CORRENTE_G80_TABLE = [
  { mm:  6, simples: 1.12, choker: 0.80, cesto: 2.24, pernas2_ang60: 1.94, pernas2_ang45: 1.58, pernas4_ang60: 3.87, pernas4_ang45: 3.16 },
  { mm:  7, simples: 1.50, choker: 1.05, cesto: 3.00, pernas2_ang60: 2.60, pernas2_ang45: 2.12, pernas4_ang60: 5.19, pernas4_ang45: 4.24 },
  { mm:  8, simples: 2.00, choker: 1.40, cesto: 4.00, pernas2_ang60: 3.46, pernas2_ang45: 2.83, pernas4_ang60: 6.93, pernas4_ang45: 5.66 },
  { mm: 10, simples: 3.15, choker: 2.20, cesto: 6.30, pernas2_ang60: 5.46, pernas2_ang45: 4.45, pernas4_ang60: 10.90,pernas4_ang45: 8.91 },
  { mm: 13, simples: 5.30, choker: 3.70, cesto: 10.6, pernas2_ang60: 9.19, pernas2_ang45: 7.50, pernas4_ang60: 18.38,pernas4_ang45: 15.0 },
  { mm: 16, simples: 8.00, choker: 5.60, cesto: 16.0, pernas2_ang60: 13.86,pernas2_ang45: 11.31,pernas4_ang60: 27.71,pernas4_ang45: 22.63},
  { mm: 20, simples: 12.5, choker: 8.75, cesto: 25.0, pernas2_ang60: 21.65,pernas2_ang45: 17.68,pernas4_ang60: 43.30,pernas4_ang45: 35.36},
  { mm: 22, simples: 15.0, choker: 10.5, cesto: 30.0, pernas2_ang60: 25.98,pernas2_ang45: 21.21,pernas4_ang60: 51.96,pernas4_ang45: 42.43},
  { mm: 26, simples: 21.2, choker: 14.84,cesto: 42.4, pernas2_ang60: 36.72,pernas2_ang45: 29.97,pernas4_ang60: 73.44,pernas4_ang45: 59.95},
  { mm: 32, simples: 31.5, choker: 22.05,cesto: 63.0, pernas2_ang60: 54.56,pernas2_ang45: 44.55,pernas4_ang60:109.12,pernas4_ang45: 89.10},
];

// ─────────────────────────────────────────────────────────────────────────────
// TABELA — CORRENTE DE IÇAMENTO GRAU 100 (EN 818-4 / NBR ISO 3076, FS 4:1)
// ~25 % superior ao Grau 80 — identificada por elos marcados "100" ou "T".
// ─────────────────────────────────────────────────────────────────────────────

export const CORRENTE_G100_TABLE = [
  { mm:  8, simples: 2.50, choker: 1.75, cesto:  5.00, pernas2_ang60:  4.33, pernas2_ang45:  3.54, pernas4_ang60:  8.66, pernas4_ang45:  7.07 },
  { mm: 10, simples: 4.00, choker: 2.80, cesto:  8.00, pernas2_ang60:  6.93, pernas2_ang45:  5.66, pernas4_ang60: 13.86, pernas4_ang45: 11.31 },
  { mm: 13, simples: 6.70, choker: 4.69, cesto: 13.40, pernas2_ang60: 11.60, pernas2_ang45:  9.47, pernas4_ang60: 23.19, pernas4_ang45: 18.95 },
  { mm: 16, simples: 10.0, choker: 7.00, cesto: 20.00, pernas2_ang60: 17.32, pernas2_ang45: 14.14, pernas4_ang60: 34.64, pernas4_ang45: 28.28 },
  { mm: 20, simples: 16.0, choker: 11.2, cesto: 32.00, pernas2_ang60: 27.71, pernas2_ang45: 22.63, pernas4_ang60: 55.42, pernas4_ang45: 45.25 },
  { mm: 22, simples: 19.0, choker: 13.3, cesto: 38.00, pernas2_ang60: 32.91, pernas2_ang45: 26.87, pernas4_ang60: 65.82, pernas4_ang45: 53.74 },
  { mm: 26, simples: 27.0, choker: 18.9, cesto: 54.00, pernas2_ang60: 46.77, pernas2_ang45: 38.18, pernas4_ang60: 93.53, pernas4_ang45: 76.37 },
  { mm: 32, simples: 40.0, choker: 28.0, cesto: 80.00, pernas2_ang60: 69.28, pernas2_ang45: 56.57, pernas4_ang60:138.56, pernas4_ang45:113.14 },
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
  { pol: '3/8"',   mm:  9.5, swlCurva:  0.50, swlReta:  0.50 },
  { pol: '7/16"',  mm: 11.0, swlCurva:  0.75, swlReta:  0.75 },
  { pol: '1/2"',   mm: 12.7, swlCurva:  1.00, swlReta:  1.00 },
  { pol: '5/8"',   mm: 16.0, swlCurva:  2.00, swlReta:  2.00 },
  { pol: '3/4"',   mm: 19.0, swlCurva:  3.20, swlReta:  3.20 },
  { pol: '7/8"',   mm: 22.0, swlCurva:  4.75, swlReta:  4.75 },
  { pol: '1"',     mm: 25.0, swlCurva:  6.50, swlReta:  6.50 },
  { pol: '1-1/8"', mm: 29.0, swlCurva:  8.50, swlReta:  8.50 },
  { pol: '1-1/4"', mm: 32.0, swlCurva: 12.00, swlReta: 11.00 },
  { pol: '1-3/8"', mm: 35.0, swlCurva: 13.50, swlReta: 12.50 },
  { pol: '1-1/2"', mm: 38.0, swlCurva: 17.00, swlReta: 15.00 },
  { pol: '1-3/4"', mm: 44.0, swlCurva: 22.00, swlReta: 19.50 },
  { pol: '2"',     mm: 51.0, swlCurva: 32.50, swlReta: 27.50 },
];

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP WLL POR MATERIAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca o WLL (kg) na tabela de materiais a partir do tipo, identificador e modo.
 *
 * @param {{ tipo: string, id: string|number, modo: string }} cfg
 *   tipo: "CINTA" | "CABO_AF19" | "CABO_AA19" | "CABO_AF37"
 *       | "CORRENTE_G80" | "CORRENTE_G100" | "MANILHA_CURVA" | "MANILHA_RETA"
 *   id  : cor (cintas) ou mm numérico (demais)
 *   modo: "vertical"|"choker"|"cesto"|"ang45"|"ang30"   (cintas)
 *         "simples"|"forca"|"cesto"                      (cabos)
 *         "simples"|"choker"|"cesto"|"pernas2_ang60"
 *         |"pernas2_ang45"|"pernas4_ang60"|"pernas4_ang45" (correntes)
 *         ignorado para manilhas (usa swlCurva ou swlReta pelo tipo)
 * @returns {number|null} WLL em kg, ou null se não encontrado
 */
export const lookupWllFromMaterial = ({ tipo, id, modo }) => {
  const t2kg = (t) => t * 1000;

  if (tipo === "CINTA") {
    const row = CINTA_SINTETICA_TABLE.find(r => r.cor === id);
    if (!row) return null;
    const val = { vertical: row.vertical, choker: row.choker, cesto: row.cesto, ang45: row.ang45, ang30: row.ang30 }[modo];
    return val != null ? t2kg(val) : null;
  }

  if (tipo === "CABO_AF19" || tipo === "CABO_AA19" || tipo === "CABO_AF37") {
    const table = tipo === "CABO_AF19" ? CABO_ACO_TABLE
                : tipo === "CABO_AA19" ? CABO_ACO_19AA_TABLE
                : CABO_ACO_37AF_TABLE;
    const row = table.find(r => r.mm === id || r.diametro === id);
    if (!row) return null;
    const val = { simples: row.simples, forca: row.forca, cesto: row.cesto }[modo];
    return val != null ? t2kg(val) : null;
  }

  if (tipo === "CORRENTE_G80" || tipo === "CORRENTE_G100") {
    const table = tipo === "CORRENTE_G80" ? CORRENTE_G80_TABLE : CORRENTE_G100_TABLE;
    const row = table.find(r => r.mm === id);
    if (!row) return null;
    const val = {
      simples: row.simples, choker: row.choker, cesto: row.cesto,
      pernas2_ang60: row.pernas2_ang60, pernas2_ang45: row.pernas2_ang45,
      pernas4_ang60: row.pernas4_ang60, pernas4_ang45: row.pernas4_ang45,
    }[modo];
    return val != null ? t2kg(val) : null;
  }

  if (tipo === "MANILHA_CURVA" || tipo === "MANILHA_RETA") {
    const row = MANILHA_TABLE.find(r => r.pol === id || r.mm === id);
    if (!row) return null;
    return t2kg(tipo === "MANILHA_CURVA" ? row.swlCurva : row.swlReta);
  }

  return null;
};

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

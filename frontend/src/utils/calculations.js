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
export const canPrintPdf = (isLoggedIn, role) =>
  !isLoggedIn || role === "GERENTE_OPERACOES";

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

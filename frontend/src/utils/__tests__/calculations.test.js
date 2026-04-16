import { describe, it, expect } from "@jest/globals";
import {
  multAngulo,
  statusCalc,
  calcVolume,
  riskLabel,
  riskColor,
  roleLabel,
  calcCraneUsage,
  MATERIAIS,
  FATORES_SEG,
} from "../calculations.js";

// ── multAngulo ──────────────────────────────────────────────────────────────────

describe("multAngulo", () => {
  it("retorna 1 para 90°", () => {
    expect(multAngulo(90)).toBeCloseTo(1.0, 5);
  });

  it("retorna ~1.1547 para 60° (padrão de lingada 2 pernas)", () => {
    // 1/sin(60°) = 1/(√3/2) ≈ 1.1547
    expect(multAngulo(60)).toBeCloseTo(1.1547, 3);
  });

  it("retorna ~1.4142 para 45° (limite NR-11)", () => {
    // 1/sin(45°) = √2 ≈ 1.4142
    expect(multAngulo(45)).toBeCloseTo(1.4142, 3);
  });

  it("retorna ~2.0 para 30° (ângulo crítico)", () => {
    // 1/sin(30°) = 1/0.5 = 2
    expect(multAngulo(30)).toBeCloseTo(2.0, 5);
  });

  it("retorna Infinity para 0° (sem ângulo)", () => {
    expect(multAngulo(0)).toBe(Infinity);
  });

  it("cresce à medida que o ângulo diminui", () => {
    expect(multAngulo(30)).toBeGreaterThan(multAngulo(45));
    expect(multAngulo(45)).toBeGreaterThan(multAngulo(60));
    expect(multAngulo(60)).toBeGreaterThan(multAngulo(90));
  });
});

// ── statusCalc ──────────────────────────────────────────────────────────────────

describe("statusCalc", () => {
  describe("limites padrão [80, 100]", () => {
    it("retorna SEGURO quando pct <= 80", () => {
      expect(statusCalc(0)).toBe("SEGURO");
      expect(statusCalc(50)).toBe("SEGURO");
      expect(statusCalc(80)).toBe("SEGURO");
    });

    it("retorna ATENCAO quando 80 < pct <= 100", () => {
      expect(statusCalc(81)).toBe("ATENCAO");
      expect(statusCalc(90)).toBe("ATENCAO");
      expect(statusCalc(100)).toBe("ATENCAO");
    });

    it("retorna REPROVADO quando pct > 100", () => {
      expect(statusCalc(101)).toBe("REPROVADO");
      expect(statusCalc(150)).toBe("REPROVADO");
    });
  });

  describe("limites customizados", () => {
    it("respeita limites [70, 90] (padrão NR-11)", () => {
      expect(statusCalc(69, [70, 90])).toBe("SEGURO");
      expect(statusCalc(70, [70, 90])).toBe("SEGURO");
      expect(statusCalc(71, [70, 90])).toBe("ATENCAO");
      expect(statusCalc(90, [70, 90])).toBe("ATENCAO");
      expect(statusCalc(91, [70, 90])).toBe("REPROVADO");
    });
  });
});

// ── calcVolume ──────────────────────────────────────────────────────────────────

describe("calcVolume", () => {
  it("PARALELEPIPEDO: V = L×C×H", () => {
    expect(calcVolume("PARALELEPIPEDO", { L: 2, C: 3, H: 4 })).toBeCloseTo(24);
  });

  it("CILINDRO: V = π×(D/2)²×H", () => {
    // D=2 → r=1; V = π×1²×5 ≈ 15.708
    expect(calcVolume("CILINDRO", { D: 2, H: 5 })).toBeCloseTo(Math.PI * 5, 4);
  });

  it("PIRAMIDE: V = (L×C×H)/3", () => {
    expect(calcVolume("PIRAMIDE", { L: 3, C: 3, H: 3 })).toBeCloseTo(9);
  });

  it("CUBO: V = L³", () => {
    expect(calcVolume("CUBO", { L: 3 })).toBeCloseTo(27);
  });

  it("CUNHA: V = (L×C×H)/2", () => {
    expect(calcVolume("CUNHA", { L: 4, C: 2, H: 3 })).toBeCloseTo(12);
  });

  it("forma desconhecida retorna NaN", () => {
    expect(calcVolume("ESFERA", { L: 1 })).toBeNaN();
  });
});

// ── riskLabel ───────────────────────────────────────────────────────────────────

describe("riskLabel", () => {
  it("mapeia SAFE → Prosseguir", () => {
    expect(riskLabel("SAFE")).toBe("Prosseguir");
  });
  it("mapeia WARNING → Analisar", () => {
    expect(riskLabel("WARNING")).toBe("Analisar");
  });
  it("mapeia DANGER → Parar", () => {
    expect(riskLabel("DANGER")).toBe("Parar");
  });
  it("retorna o próprio valor para nível desconhecido", () => {
    expect(riskLabel("UNKNOWN")).toBe("UNKNOWN");
  });
});

// ── riskColor ───────────────────────────────────────────────────────────────────

describe("riskColor", () => {
  it("retorna verde para SAFE", () => {
    expect(riskColor("SAFE")).toBe("#22c55e");
  });
  it("retorna laranja para WARNING", () => {
    expect(riskColor("WARNING")).toBe("#f59e0b");
  });
  it("retorna vermelho para DANGER", () => {
    expect(riskColor("DANGER")).toBe("#ef4444");
  });
  it("retorna cinza para nível desconhecido", () => {
    expect(riskColor("NONE")).toBe("#94a3b8");
  });
});

// ── roleLabel ───────────────────────────────────────────────────────────────────

describe("roleLabel", () => {
  const cases = [
    ["SUPER_ADMIN",        "Super Admin"],
    ["ADMIN_EMPRESA",      "Admin"],
    ["GERENTE_OPERACOES",  "Gerente"],
    ["LIDER_EQUIPE",       "Líder"],
    ["RIGGER",             "Rigger"],
    ["OPERADOR",           "Operador"],
    ["OPERADOR_GUINDASTE", "Op. Guindaste"],
  ];

  it.each(cases)("mapeia %s → %s", (role, expected) => {
    expect(roleLabel(role)).toBe(expected);
  });

  it("retorna o próprio valor para role desconhecido", () => {
    expect(roleLabel("ROLE_NOVA")).toBe("ROLE_NOVA");
  });
});

// ── MATERIAIS ───────────────────────────────────────────────────────────────────

describe("MATERIAIS", () => {
  it("contém 13 materiais", () => {
    expect(MATERIAIS).toHaveLength(13);
  });

  it("Aço tem pe = 7850 kg/m³", () => {
    const aco = MATERIAIS.find((m) => m.nome === "Aço");
    expect(aco?.pe).toBe(7850);
  });

  it("todos os materiais têm nome e pe positivo", () => {
    MATERIAIS.forEach(({ nome, pe }) => {
      expect(typeof nome).toBe("string");
      expect(pe).toBeGreaterThan(0);
    });
  });
});

// ── FATORES_SEG ─────────────────────────────────────────────────────────────────

describe("FATORES_SEG", () => {
  it("contém 9 tipos de equipamento", () => {
    expect(FATORES_SEG).toHaveLength(9);
  });

  it("todos têm fsMin >= 3", () => {
    FATORES_SEG.forEach(({ fsMin }) => {
      expect(fsMin).toBeGreaterThanOrEqual(3);
    });
  });

  it("elevador de passageiros tem o maior fsMin (12)", () => {
    const elevador = FATORES_SEG.find((f) =>
      f.tipo.toLowerCase().includes("passageiros")
    );
    expect(elevador?.fsMin).toBe(12);
  });
});

// ── calcCraneUsage ───────────────────────────────────────────────────────────────
// Espelha RiskCalculator.java: < 70 → SAFE, 70–89 → WARNING, ≥ 90 → DANGER

describe("calcCraneUsage", () => {
  // ── Zona SEGURO (<70%) ──────────────────────────────────────────────────────
  it("retorna SEGURO/SAFE para uso < 70%", () => {
    // 30000 / 50000 = 60%
    const r = calcCraneUsage(50000, 30000);
    expect(r.pct).toBeCloseTo(60, 5);
    expect(r.status).toBe("SEGURO");
    expect(r.risk).toBe("SAFE");
    expect(r.approved).toBe(true);
  });

  it("retorna SEGURO/SAFE para uso 0% (sem carga)", () => {
    const r = calcCraneUsage(10000, 0);
    expect(r.pct).toBeCloseTo(0, 5);
    expect(r.status).toBe("SEGURO");
    expect(r.approved).toBe(true);
  });

  it("limite exato: 69.99% ainda é SEGURO", () => {
    const r = calcCraneUsage(10000, 6999);
    expect(r.pct).toBeCloseTo(69.99, 1);
    expect(r.status).toBe("SEGURO");
  });

  // ── Fronteira 70% (transição SEGURO → ATENCAO) ──────────────────────────────
  it("exatamente 70% é ATENCAO/WARNING (threshold estrito: pct < 70 → SAFE)", () => {
    // 7000 / 10000 = 70% → não é < 70, portanto ATENCAO
    const r = calcCraneUsage(10000, 7000);
    expect(r.pct).toBeCloseTo(70, 5);
    expect(r.status).toBe("ATENCAO");
    expect(r.risk).toBe("WARNING");
    expect(r.approved).toBe(true);
  });

  // ── Zona ATENCAO (70–89%) ───────────────────────────────────────────────────
  it("retorna ATENCAO/WARNING para uso 80%", () => {
    // 8000 / 10000 = 80%
    const r = calcCraneUsage(10000, 8000);
    expect(r.pct).toBeCloseTo(80, 5);
    expect(r.status).toBe("ATENCAO");
    expect(r.risk).toBe("WARNING");
    expect(r.approved).toBe(true);
  });

  it("89.99% ainda é ATENCAO e approved", () => {
    const r = calcCraneUsage(10000, 8999);
    expect(r.pct).toBeCloseTo(89.99, 1);
    expect(r.status).toBe("ATENCAO");
    expect(r.approved).toBe(true);
  });

  // ── Fronteira 90% (transição ATENCAO → REPROVADO) ───────────────────────────
  it("exatamente 90% é REPROVADO/DANGER e não aprovado", () => {
    // 9000 / 10000 = 90% → não é < 90, portanto REPROVADO
    const r = calcCraneUsage(10000, 9000);
    expect(r.pct).toBeCloseTo(90, 5);
    expect(r.status).toBe("REPROVADO");
    expect(r.risk).toBe("DANGER");
    expect(r.approved).toBe(false);
  });

  // ── Zona REPROVADO (≥90%) ───────────────────────────────────────────────────
  it("retorna REPROVADO/DANGER para uso 95%", () => {
    const r = calcCraneUsage(10000, 9500);
    expect(r.pct).toBeCloseTo(95, 5);
    expect(r.status).toBe("REPROVADO");
    expect(r.risk).toBe("DANGER");
    expect(r.approved).toBe(false);
  });

  it("retorna REPROVADO para sobrecarga (>100%)", () => {
    const r = calcCraneUsage(10000, 11000);
    expect(r.pct).toBeCloseTo(110, 5);
    expect(r.status).toBe("REPROVADO");
    expect(r.approved).toBe(false);
  });

  // ── Margem ──────────────────────────────────────────────────────────────────
  it("margem = capacidade - cargaTotal (positiva quando abaixo da capacidade)", () => {
    const r = calcCraneUsage(50000, 30000);
    expect(r.margem).toBeCloseTo(20000, 5);
  });

  it("margem negativa indica sobrecarga", () => {
    const r = calcCraneUsage(10000, 11000);
    expect(r.margem).toBeCloseTo(-1000, 5);
  });

  // ── Capacidade inválida ──────────────────────────────────────────────────────
  it("retorna null para capacidade = 0", () => {
    expect(calcCraneUsage(0, 5000)).toBeNull();
  });

  it("retorna null para capacidade negativa", () => {
    expect(calcCraneUsage(-1000, 5000)).toBeNull();
  });

  // ── Consistência com backend RiskCalculator ──────────────────────────────────
  it("thresholds idênticos ao backend: 70/90 (não 80/100 do SWL)", () => {
    // SWL usa statusCalc com [80, 100]; guindaste usa calcCraneUsage com [70, 90]
    expect(calcCraneUsage(10000, 7500).status).toBe("ATENCAO"); // 75% → SWL seria SEGURO, guindaste é ATENCAO
    expect(calcCraneUsage(10000, 8500).status).toBe("ATENCAO"); // 85% → SWL seria SEGURO, guindaste é ATENCAO
  });
});

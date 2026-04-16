import { describe, it, expect } from "@jest/globals";
import {
  multAngulo,
  statusCalc,
  calcVolume,
  riskLabel,
  riskColor,
  roleLabel,
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

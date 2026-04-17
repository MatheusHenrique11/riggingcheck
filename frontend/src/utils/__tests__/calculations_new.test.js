import { describe, it, expect } from "@jest/globals";
import {
  calcSlingLength,
  calcHorizontalDist,
  calcAngleDeg,
  calcSlingFromAngle,
  metersToFeet,
  feetToMeters,
  kgToLbs,
  lbsToKg,
  calcMunckMomento,
  CABO_ACO_TABLE,
  CINTA_SINTETICA_TABLE,
  MANILHA_TABLE,
  classificarIcamento,
  N2869_DOCUMENTOS,
} from "../calculations.js";

// ── Trigonometria ─────────────────────────────────────────────────────────────

describe("calcSlingLength", () => {
  it("triângulo 3-4-5: Ce = 5", () => {
    expect(calcSlingLength(3, 4)).toBeCloseTo(5, 3);
  });

  it("D = He → ângulo de 45°, Ce = √2 × D", () => {
    expect(calcSlingLength(5, 5)).toBeCloseTo(5 * Math.SQRT2, 3);
  });

  it("D = 0, He = 5 → Ce = 5 (eslinga vertical)", () => {
    expect(calcSlingLength(0, 5)).toBeCloseTo(5, 3);
  });
});

describe("calcHorizontalDist", () => {
  it("triângulo 5-4: D = 3", () => {
    expect(calcHorizontalDist(5, 4)).toBeCloseTo(3, 3);
  });

  it("Ce = He → D = 0 (eslinga vertical)", () => {
    expect(calcHorizontalDist(5, 5)).toBeCloseTo(0, 3);
  });
});

describe("calcAngleDeg", () => {
  it("He = Ce → ângulo = 90°", () => {
    expect(calcAngleDeg(5, 5)).toBeCloseTo(90, 2);
  });

  it("He = Ce/2 → ângulo = 30°", () => {
    expect(calcAngleDeg(5, 10)).toBeCloseTo(30, 2);
  });

  it("He = Ce × sin(45°) → ângulo = 45°", () => {
    const he = 10 * Math.sin(Math.PI / 4);
    expect(calcAngleDeg(he, 10)).toBeCloseTo(45, 2);
  });
});

describe("calcSlingFromAngle", () => {
  it("Ce = He / sin(ang) — angulo 90° → Ce = He", () => {
    expect(calcSlingFromAngle(5, 90)).toBeCloseTo(5, 3);
  });

  it("angulo 30° → Ce = 2 × He", () => {
    expect(calcSlingFromAngle(5, 30)).toBeCloseTo(10, 3);
  });

  it("roundtrip: calcAngleDeg(He, calcSlingFromAngle(He, ang)) ≈ ang", () => {
    const ang = 60;
    const ce = calcSlingFromAngle(8, ang);
    expect(calcAngleDeg(8, ce)).toBeCloseTo(ang, 2);
  });
});

// ── Conversões ────────────────────────────────────────────────────────────────

describe("Conversões de unidade", () => {
  it("1 m = 3.28084 ft", () => {
    expect(metersToFeet(1)).toBeCloseTo(3.28084, 3);
  });

  it("1 ft = 0.3048 m", () => {
    expect(feetToMeters(1)).toBeCloseTo(0.3048, 4);
  });

  it("roundtrip metros→pés→metros", () => {
    expect(feetToMeters(metersToFeet(7.5))).toBeCloseTo(7.5, 4);
  });

  it("1 kg = 2.20459 lbs (aprox.)", () => {
    expect(kgToLbs(1)).toBeCloseTo(2.2046, 2);
  });

  it("1 lb = 0.4536 kg", () => {
    expect(lbsToKg(1)).toBeCloseTo(0.4536, 4);
  });

  it("roundtrip kg→lbs→kg", () => {
    expect(lbsToKg(kgToLbs(1000))).toBeCloseTo(1000, 1);
  });
});

// ── Momento Munck ─────────────────────────────────────────────────────────────

describe("calcMunckMomento", () => {
  it("M = 2t × 5m = 10 t·m", () => {
    const r = calcMunckMomento(2, 5, 20);
    expect(r.momento).toBeCloseTo(10, 3);
  });

  it("uso = 50% quando momento=10, limite=20", () => {
    expect(calcMunckMomento(2, 5, 20).usoPct).toBeCloseTo(50, 3);
  });

  it("risco SAFE abaixo de 70%", () => {
    expect(calcMunckMomento(1, 1, 100).risco).toBe("SAFE");
    expect(calcMunckMomento(1, 1, 100).aprovado).toBe(true);
  });

  it("risco WARNING entre 70% e 89%", () => {
    const r = calcMunckMomento(8, 1, 10); // 80%
    expect(r.risco).toBe("WARNING");
    expect(r.aprovado).toBe(true);
  });

  it("risco DANGER em 90%", () => {
    const r = calcMunckMomento(9, 1, 10); // 90%
    expect(r.risco).toBe("DANGER");
    expect(r.aprovado).toBe(false);
  });

  it("risco DANGER acima de 90%", () => {
    const r = calcMunckMomento(10, 1, 10); // 100%
    expect(r.risco).toBe("DANGER");
    expect(r.aprovado).toBe(false);
  });
});

// ── Tabela Cabo de Aço ────────────────────────────────────────────────────────

describe("CABO_ACO_TABLE", () => {
  it("tem 11 entradas (3/8\" a 1.1/2\")", () => {
    expect(CABO_ACO_TABLE).toHaveLength(11);
  });

  it("primeira entrada: 3/8\", 9.5 mm", () => {
    expect(CABO_ACO_TABLE[0].diametro).toBe('3/8"');
    expect(CABO_ACO_TABLE[0].mm).toBeCloseTo(9.5, 1);
  });

  it("cesto ≈ 2× simples para todas as entradas", () => {
    CABO_ACO_TABLE.forEach(e => {
      expect(e.cesto / e.simples).toBeCloseTo(2.0, 1);
    });
  });

  it("forca < simples para todas as entradas (forca = 0.7 × simples)", () => {
    CABO_ACO_TABLE.forEach(e => {
      expect(e.forca).toBeLessThan(e.simples);
    });
  });

  it("capacidades crescem com o diâmetro", () => {
    for (let i = 1; i < CABO_ACO_TABLE.length; i++) {
      expect(CABO_ACO_TABLE[i].simples).toBeGreaterThan(CABO_ACO_TABLE[i - 1].simples);
    }
  });
});

// ── Tabela Cinta Sintética ────────────────────────────────────────────────────

describe("CINTA_SINTETICA_TABLE", () => {
  it("tem 7 cores (Violeta → Laranja)", () => {
    expect(CINTA_SINTETICA_TABLE).toHaveLength(7);
  });

  it("primeira cor: Violeta 1t vertical", () => {
    expect(CINTA_SINTETICA_TABLE[0].cor).toBe("Violeta");
    expect(CINTA_SINTETICA_TABLE[0].vertical).toBe(1.0);
  });

  it("última cor: Laranja 8t vertical", () => {
    const last = CINTA_SINTETICA_TABLE[CINTA_SINTETICA_TABLE.length - 1];
    expect(last.cor).toBe("Laranja");
    expect(last.vertical).toBe(8.0);
  });

  it("choker = 0.8 × vertical", () => {
    CINTA_SINTETICA_TABLE.forEach(e => {
      expect(e.choker).toBeCloseTo(e.vertical * 0.8, 2);
    });
  });

  it("cesto = 2 × vertical", () => {
    CINTA_SINTETICA_TABLE.forEach(e => {
      expect(e.cesto).toBeCloseTo(e.vertical * 2.0, 2);
    });
  });

  it("ang30 ≈ vertical (2 × vertical × sin30° = vertical)", () => {
    CINTA_SINTETICA_TABLE.forEach(e => {
      expect(e.ang30).toBeCloseTo(e.vertical, 1);
    });
  });
});

// ── Tabela Manilhas ───────────────────────────────────────────────────────────

describe("MANILHA_TABLE", () => {
  it("tem 13 entradas", () => {
    expect(MANILHA_TABLE).toHaveLength(13);
  });

  it("swlCurva ≥ swlReta para todos os diâmetros", () => {
    MANILHA_TABLE.forEach(e => {
      expect(e.swlCurva).toBeGreaterThan(e.swlReta - 0.001);
    });
  });

  it("SWL cresce com o diâmetro", () => {
    for (let i = 1; i < MANILHA_TABLE.length; i++) {
      expect(MANILHA_TABLE[i].swlCurva).toBeGreaterThan(MANILHA_TABLE[i - 1].swlCurva - 0.01);
    }
  });

  it("primeira entrada: ∅9.5mm, SWL 0.5t", () => {
    expect(MANILHA_TABLE[0].mm).toBeCloseTo(9.5, 1);
    expect(MANILHA_TABLE[0].swlCurva).toBeCloseTo(0.5, 2);
  });
});

// ── N-2869 classificarIcamento ────────────────────────────────────────────────

describe("classificarIcamento", () => {
  it("uso ≤ 50% sem fatores → ROTINEIRO", () => {
    expect(classificarIcamento({ usoPct: 50 })).toBe("ROTINEIRO");
  });

  it("uso 51% → NAO_ROTINEIRO", () => {
    expect(classificarIcamento({ usoPct: 51 })).toBe("NAO_ROTINEIRO");
  });

  it("uso > 75% → CRITICO", () => {
    expect(classificarIcamento({ usoPct: 76 })).toBe("CRITICO");
  });

  it("tandem = true → sempre CRITICO", () => {
    expect(classificarIcamento({ usoPct: 10, tandem: true })).toBe("CRITICO");
  });

  it("sobreAreaHabitada = true → sempre CRITICO", () => {
    expect(classificarIcamento({ usoPct: 10, sobreAreaHabitada: true })).toBe("CRITICO");
  });

  it("cargaEspecial = true → sempre CRITICO", () => {
    expect(classificarIcamento({ usoPct: 10, cargaEspecial: true })).toBe("CRITICO");
  });

  it("limites de 75%: exatamente 75% ainda é NAO_ROTINEIRO", () => {
    expect(classificarIcamento({ usoPct: 75 })).toBe("NAO_ROTINEIRO");
  });
});

// ── N2869_DOCUMENTOS ──────────────────────────────────────────────────────────

describe("N2869_DOCUMENTOS", () => {
  it("ROTINEIRO inclui PT e AST", () => {
    expect(N2869_DOCUMENTOS.ROTINEIRO).toContain("Permissão de Trabalho (PT)");
    expect(N2869_DOCUMENTOS.ROTINEIRO).toContain("AST");
  });

  it("CRITICO inclui Plano de Rigging Detalhado", () => {
    expect(N2869_DOCUMENTOS.CRITICO).toContain("Plano de Rigging Detalhado");
  });

  it("CRITICO tem mais documentos que ROTINEIRO", () => {
    expect(N2869_DOCUMENTOS.CRITICO.length).toBeGreaterThan(N2869_DOCUMENTOS.ROTINEIRO.length);
  });

  it("todas as classificações têm Permissão de Trabalho", () => {
    Object.values(N2869_DOCUMENTOS).forEach(docs => {
      expect(docs).toContain("Permissão de Trabalho (PT)");
    });
  });
});

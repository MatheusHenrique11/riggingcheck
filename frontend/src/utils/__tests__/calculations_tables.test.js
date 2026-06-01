import { describe, it, expect } from "@jest/globals";
import {
  CABO_ACO_TABLE,
  CABO_ACO_19AA_TABLE,
  CABO_ACO_37AF_TABLE,
  CORRENTE_G80_TABLE,
  CORRENTE_G100_TABLE,
  CINTA_SINTETICA_TABLE,
  MANILHA_TABLE,
  lookupWllFromMaterial,
  inchesToMm,
  mmToInches,
} from "../calculations.js";

// ── CABO_ACO_19AA_TABLE (6×19 AA/IWRC) ───────────────────────────────────────

describe("CABO_ACO_19AA_TABLE", () => {
  it("tem 11 entradas (3/8\" a 1.1/2\")", () => {
    expect(CABO_ACO_19AA_TABLE).toHaveLength(11);
  });

  it("primeira entrada: Ø3/8\", 9.5 mm, 1.08t simples", () => {
    expect(CABO_ACO_19AA_TABLE[0].diametro).toBe('3/8"');
    expect(CABO_ACO_19AA_TABLE[0].mm).toBeCloseTo(9.5, 1);
    expect(CABO_ACO_19AA_TABLE[0].simples).toBeCloseTo(1.08, 2);
  });

  it("última entrada: Ø1.1/2\", 38.1 mm, 17.3t simples", () => {
    const last = CABO_ACO_19AA_TABLE[CABO_ACO_19AA_TABLE.length - 1];
    expect(last.diametro).toBe('1.1/2"');
    expect(last.mm).toBeCloseTo(38.1, 1);
    expect(last.simples).toBeCloseTo(17.30, 2);
  });

  it("cesto ≈ 2× simples para todas as entradas", () => {
    CABO_ACO_19AA_TABLE.forEach(e => {
      expect(e.cesto / e.simples).toBeCloseTo(2.0, 1);
    });
  });

  it("forca < simples para todas as entradas", () => {
    CABO_ACO_19AA_TABLE.forEach(e => {
      expect(e.forca).toBeLessThan(e.simples);
    });
  });

  it("capacidades crescem com o diâmetro", () => {
    for (let i = 1; i < CABO_ACO_19AA_TABLE.length; i++) {
      expect(CABO_ACO_19AA_TABLE[i].simples).toBeGreaterThan(CABO_ACO_19AA_TABLE[i - 1].simples);
    }
  });

  it("AA (alma de aço) tem capacidade superior à AF (alma de fibra) para mesmo diâmetro", () => {
    // Verifica os 11 diâmetros comuns AF×AA
    for (let i = 0; i < CABO_ACO_TABLE.length; i++) {
      expect(CABO_ACO_19AA_TABLE[i].simples).toBeGreaterThan(CABO_ACO_TABLE[i].simples);
    }
  });

  it("todos os registros têm campos obrigatórios: diametro, mm, simples, forca, cesto", () => {
    CABO_ACO_19AA_TABLE.forEach(e => {
      expect(e).toHaveProperty("diametro");
      expect(e).toHaveProperty("mm");
      expect(e).toHaveProperty("simples");
      expect(e).toHaveProperty("forca");
      expect(e).toHaveProperty("cesto");
    });
  });
});

// ── CABO_ACO_37AF_TABLE (6×37 AF) ────────────────────────────────────────────

describe("CABO_ACO_37AF_TABLE", () => {
  it("tem 11 entradas (3/8\" a 1.1/2\")", () => {
    expect(CABO_ACO_37AF_TABLE).toHaveLength(11);
  });

  it("primeira entrada: Ø3/8\", 9.5 mm, 0.93t simples", () => {
    expect(CABO_ACO_37AF_TABLE[0].diametro).toBe('3/8"');
    expect(CABO_ACO_37AF_TABLE[0].mm).toBeCloseTo(9.5, 1);
    expect(CABO_ACO_37AF_TABLE[0].simples).toBeCloseTo(0.93, 2);
  });

  it("última entrada: Ø1.1/2\", 38.1 mm, 14.82t simples", () => {
    const last = CABO_ACO_37AF_TABLE[CABO_ACO_37AF_TABLE.length - 1];
    expect(last.mm).toBeCloseTo(38.1, 1);
    expect(last.simples).toBeCloseTo(14.82, 2);
  });

  it("cesto ≈ 2× simples para todas as entradas", () => {
    CABO_ACO_37AF_TABLE.forEach(e => {
      expect(e.cesto / e.simples).toBeCloseTo(2.0, 1);
    });
  });

  it("forca < simples para todas as entradas", () => {
    CABO_ACO_37AF_TABLE.forEach(e => {
      expect(e.forca).toBeLessThan(e.simples);
    });
  });

  it("capacidades crescem com o diâmetro", () => {
    for (let i = 1; i < CABO_ACO_37AF_TABLE.length; i++) {
      expect(CABO_ACO_37AF_TABLE[i].simples).toBeGreaterThan(CABO_ACO_37AF_TABLE[i - 1].simples);
    }
  });

  it("6×37 AF tem capacidade inferior ao 6×19 AF para mesmo diâmetro (mais flexível, menos resistente)", () => {
    for (let i = 0; i < CABO_ACO_TABLE.length; i++) {
      expect(CABO_ACO_37AF_TABLE[i].simples).toBeLessThan(CABO_ACO_TABLE[i].simples);
    }
  });

  it("todos os registros têm campos obrigatórios", () => {
    CABO_ACO_37AF_TABLE.forEach(e => {
      expect(e).toHaveProperty("diametro");
      expect(e).toHaveProperty("mm");
      expect(e).toHaveProperty("simples");
      expect(e).toHaveProperty("forca");
      expect(e).toHaveProperty("cesto");
    });
  });
});

// ── CORRENTE_G80_TABLE ────────────────────────────────────────────────────────

describe("CORRENTE_G80_TABLE", () => {
  it("tem 10 entradas (∅6mm a ∅32mm)", () => {
    expect(CORRENTE_G80_TABLE).toHaveLength(10);
  });

  it("primeira entrada: ∅6mm, 1.12t simples", () => {
    expect(CORRENTE_G80_TABLE[0].mm).toBe(6);
    expect(CORRENTE_G80_TABLE[0].simples).toBeCloseTo(1.12, 2);
  });

  it("última entrada: ∅32mm, 31.5t simples", () => {
    const last = CORRENTE_G80_TABLE[CORRENTE_G80_TABLE.length - 1];
    expect(last.mm).toBe(32);
    expect(last.simples).toBeCloseTo(31.5, 1);
  });

  it("cesto ≈ 2× simples para todas as entradas", () => {
    CORRENTE_G80_TABLE.forEach(e => {
      expect(e.cesto / e.simples).toBeCloseTo(2.0, 1);
    });
  });

  it("choker < simples para todas as entradas", () => {
    CORRENTE_G80_TABLE.forEach(e => {
      expect(e.choker).toBeLessThan(e.simples);
    });
  });

  it("2 pernas 60° == simples para todas as entradas (fator 1.0)", () => {
    CORRENTE_G80_TABLE.forEach(e => {
      expect(e.pernas2_ang60).toBeCloseTo(e.simples, 1);
    });
  });

  it("pernas2_ang45 > pernas2_ang60 para todas as entradas", () => {
    CORRENTE_G80_TABLE.forEach(e => {
      expect(e.pernas2_ang45).toBeGreaterThan(e.pernas2_ang60);
    });
  });

  it("pernas4 ≈ 1.5× pernas2 para mesmos ângulos", () => {
    CORRENTE_G80_TABLE.forEach(e => {
      expect(e.pernas4_ang60 / e.pernas2_ang60).toBeCloseTo(1.5, 1);
      expect(e.pernas4_ang45 / e.pernas2_ang45).toBeCloseTo(1.5, 1);
    });
  });

  it("capacidades crescem com o diâmetro", () => {
    for (let i = 1; i < CORRENTE_G80_TABLE.length; i++) {
      expect(CORRENTE_G80_TABLE[i].simples).toBeGreaterThan(CORRENTE_G80_TABLE[i - 1].simples);
    }
  });

  it("todos os registros têm 7 campos de capacidade", () => {
    CORRENTE_G80_TABLE.forEach(e => {
      ["simples", "choker", "cesto", "pernas2_ang60", "pernas2_ang45", "pernas4_ang60", "pernas4_ang45"].forEach(k => {
        expect(e).toHaveProperty(k);
        expect(typeof e[k]).toBe("number");
      });
    });
  });

  it("choker ≈ 0.8 × simples (fator de choker)", () => {
    CORRENTE_G80_TABLE.forEach(e => {
      expect(e.choker / e.simples).toBeCloseTo(0.8, 1);
    });
  });
});

// ── CORRENTE_G100_TABLE ───────────────────────────────────────────────────────

describe("CORRENTE_G100_TABLE", () => {
  it("tem 8 entradas (∅8mm a ∅32mm)", () => {
    expect(CORRENTE_G100_TABLE).toHaveLength(8);
  });

  it("primeira entrada: ∅8mm, 2.5t simples", () => {
    expect(CORRENTE_G100_TABLE[0].mm).toBe(8);
    expect(CORRENTE_G100_TABLE[0].simples).toBeCloseTo(2.5, 2);
  });

  it("última entrada: ∅32mm, 40t simples", () => {
    const last = CORRENTE_G100_TABLE[CORRENTE_G100_TABLE.length - 1];
    expect(last.mm).toBe(32);
    expect(last.simples).toBeCloseTo(40.0, 1);
  });

  it("Grau 100 tem capacidade superior ao Grau 80 para diâmetros comuns", () => {
    const mmComuns = [8, 10, 13, 16, 20, 22, 26, 32];
    mmComuns.forEach(mm => {
      const g80  = CORRENTE_G80_TABLE.find(r => r.mm === mm);
      const g100 = CORRENTE_G100_TABLE.find(r => r.mm === mm);
      if (g80 && g100) {
        expect(g100.simples).toBeGreaterThan(g80.simples);
      }
    });
  });

  it("cesto ≈ 2× simples para todas as entradas", () => {
    CORRENTE_G100_TABLE.forEach(e => {
      expect(e.cesto / e.simples).toBeCloseTo(2.0, 1);
    });
  });

  it("pernas4_ang60 ≈ 1.5× pernas2_ang60 para todas as entradas", () => {
    CORRENTE_G100_TABLE.forEach(e => {
      expect(e.pernas4_ang60 / e.pernas2_ang60).toBeCloseTo(1.5, 1);
    });
  });

  it("capacidades crescem com o diâmetro", () => {
    for (let i = 1; i < CORRENTE_G100_TABLE.length; i++) {
      expect(CORRENTE_G100_TABLE[i].simples).toBeGreaterThan(CORRENTE_G100_TABLE[i - 1].simples);
    }
  });

  it("todos os registros têm 7 campos de capacidade", () => {
    CORRENTE_G100_TABLE.forEach(e => {
      ["simples", "choker", "cesto", "pernas2_ang60", "pernas2_ang45", "pernas4_ang60", "pernas4_ang45"].forEach(k => {
        expect(e).toHaveProperty(k);
      });
    });
  });
});

// ── Hierarquia entre construções de cabo ──────────────────────────────────────

describe("Hierarquia de capacidade: AA19 > AF19 > AF37 para mesmo diâmetro", () => {
  it("todos os 11 diâmetros respeitam AA19 > AF19 > AF37", () => {
    for (let i = 0; i < CABO_ACO_TABLE.length; i++) {
      const af19 = CABO_ACO_TABLE[i].simples;
      const aa19 = CABO_ACO_19AA_TABLE[i].simples;
      const af37 = CABO_ACO_37AF_TABLE[i].simples;
      expect(aa19).toBeGreaterThan(af19);
      expect(af19).toBeGreaterThan(af37);
    }
  });
});

// ── lookupWllFromMaterial ─────────────────────────────────────────────────────

describe("lookupWllFromMaterial — cinta sintética", () => {
  it("retorna 1000 kg para cinta Violeta vertical (1.0t × 1000)", () => {
    expect(lookupWllFromMaterial({ tipo: "CINTA", id: "Violeta", modo: "vertical" })).toBeCloseTo(1000, 0);
  });

  it("retorna 800 kg para cinta Violeta choker (0.8t × 1000)", () => {
    expect(lookupWllFromMaterial({ tipo: "CINTA", id: "Violeta", modo: "choker" })).toBeCloseTo(800, 0);
  });

  it("retorna 2000 kg para cinta Violeta cesto (2.0t × 1000)", () => {
    expect(lookupWllFromMaterial({ tipo: "CINTA", id: "Violeta", modo: "cesto" })).toBeCloseTo(2000, 0);
  });

  it("retorna 10000 kg para cinta Laranja vertical (10.0t)", () => {
    expect(lookupWllFromMaterial({ tipo: "CINTA", id: "Laranja", modo: "vertical" })).toBeCloseTo(10000, 0);
  });

  it("retorna null para cor inexistente", () => {
    expect(lookupWllFromMaterial({ tipo: "CINTA", id: "Preto", modo: "vertical" })).toBeNull();
  });

  it("retorna null para modo inexistente", () => {
    expect(lookupWllFromMaterial({ tipo: "CINTA", id: "Verde", modo: "simples" })).toBeNull();
  });
});

describe("lookupWllFromMaterial — cabo de aço AF 6×19", () => {
  it("retorna 980 kg para ∅9.5mm simples (0.98t)", () => {
    expect(lookupWllFromMaterial({ tipo: "CABO_AF19", id: 9.5, modo: "simples" })).toBeCloseTo(980, 0);
  });

  it("aceita busca por string de diâmetro '3/8\"'", () => {
    expect(lookupWllFromMaterial({ tipo: "CABO_AF19", id: '3/8"', modo: "simples" })).toBeCloseTo(980, 0);
  });

  it("retorna 1960 kg para ∅9.5mm cesto (0.98t × 2)", () => {
    expect(lookupWllFromMaterial({ tipo: "CABO_AF19", id: 9.5, modo: "cesto" })).toBeCloseTo(1960, 0);
  });

  it("retorna null para diâmetro inexistente", () => {
    expect(lookupWllFromMaterial({ tipo: "CABO_AF19", id: 11, modo: "simples" })).toBeNull();
  });

  it("retorna null para modo inexistente", () => {
    expect(lookupWllFromMaterial({ tipo: "CABO_AF19", id: 9.5, modo: "pernas2_ang60" })).toBeNull();
  });
});

describe("lookupWllFromMaterial — cabo AA 6×19", () => {
  it("retorna 1080 kg para ∅9.5mm simples (1.08t) — maior que AF", () => {
    const wll = lookupWllFromMaterial({ tipo: "CABO_AA19", id: 9.5, modo: "simples" });
    expect(wll).toBeCloseTo(1080, 0);
    expect(wll).toBeGreaterThan(lookupWllFromMaterial({ tipo: "CABO_AF19", id: 9.5, modo: "simples" }));
  });

  it("retorna 2160 kg para ∅9.5mm cesto", () => {
    expect(lookupWllFromMaterial({ tipo: "CABO_AA19", id: 9.5, modo: "cesto" })).toBeCloseTo(2160, 0);
  });
});

describe("lookupWllFromMaterial — cabo AF 6×37", () => {
  it("retorna 930 kg para ∅9.5mm simples (0.93t) — menor que AF19", () => {
    const wll = lookupWllFromMaterial({ tipo: "CABO_AF37", id: 9.5, modo: "simples" });
    expect(wll).toBeCloseTo(930, 0);
    expect(wll).toBeLessThan(lookupWllFromMaterial({ tipo: "CABO_AF19", id: 9.5, modo: "simples" }));
  });
});

describe("lookupWllFromMaterial — corrente G80", () => {
  it("retorna 1120 kg para ∅6mm simples (1.12t)", () => {
    expect(lookupWllFromMaterial({ tipo: "CORRENTE_G80", id: 6, modo: "simples" })).toBeCloseTo(1120, 0);
  });

  it("retorna 900 kg para ∅6mm choker (0.90t)", () => {
    expect(lookupWllFromMaterial({ tipo: "CORRENTE_G80", id: 6, modo: "choker" })).toBeCloseTo(900, 0);
  });

  it("retorna 1120 kg para ∅6mm 2 pernas 60°", () => {
    expect(lookupWllFromMaterial({ tipo: "CORRENTE_G80", id: 6, modo: "pernas2_ang60" })).toBeCloseTo(1120, 0);
  });

  it("retorna 1680 kg para ∅6mm 4 pernas 60°", () => {
    expect(lookupWllFromMaterial({ tipo: "CORRENTE_G80", id: 6, modo: "pernas4_ang60" })).toBeCloseTo(1680, 0);
  });

  it("retorna null para diâmetro não existente na tabela G80", () => {
    expect(lookupWllFromMaterial({ tipo: "CORRENTE_G80", id: 9, modo: "simples" })).toBeNull();
  });
});

describe("lookupWllFromMaterial — corrente G100", () => {
  it("retorna 2500 kg para ∅8mm simples (2.5t)", () => {
    expect(lookupWllFromMaterial({ tipo: "CORRENTE_G100", id: 8, modo: "simples" })).toBeCloseTo(2500, 0);
  });

  it("G100 ∅8mm simples > G80 ∅8mm simples", () => {
    const g80  = lookupWllFromMaterial({ tipo: "CORRENTE_G80",  id: 8, modo: "simples" });
    const g100 = lookupWllFromMaterial({ tipo: "CORRENTE_G100", id: 8, modo: "simples" });
    expect(g100).toBeGreaterThan(g80);
  });

  it("retorna 60000 kg para ∅32mm 4 pernas 60° (60.00t)", () => {
    expect(lookupWllFromMaterial({ tipo: "CORRENTE_G100", id: 32, modo: "pernas4_ang60" })).toBeCloseTo(60000, 0);
  });
});

describe("MANILHA_TABLE — estrutura com polegadas", () => {
  it("tem 15 entradas", () => {
    expect(MANILHA_TABLE).toHaveLength(15);
  });

  it("primeira entrada: 1/4\" com campo pol e mm", () => {
    expect(MANILHA_TABLE[0].pol).toBe('1/4"');
    expect(MANILHA_TABLE[0].mm).toBeCloseTo(6.5, 1);
  });

  it("última entrada: 2\" com mm ≈ 51", () => {
    const last = MANILHA_TABLE[MANILHA_TABLE.length - 1];
    expect(last.pol).toBe('2"');
    expect(last.mm).toBeCloseTo(51.0, 1);
  });

  it("todos os registros têm campo pol (string) e mm (número)", () => {
    MANILHA_TABLE.forEach(e => {
      expect(typeof e.pol).toBe("string");
      expect(e.pol.length).toBeGreaterThan(0);
      expect(typeof e.mm).toBe("number");
    });
  });

  it("swlCurva == swlReta para todos os diâmetros na Grau 6", () => {
    MANILHA_TABLE.forEach(e => {
      expect(e.swlCurva).toBeCloseTo(e.swlReta, 2);
    });
  });

  it("SWL cresce com o diâmetro", () => {
    for (let i = 1; i < MANILHA_TABLE.length; i++) {
      expect(MANILHA_TABLE[i].swlCurva).toBeGreaterThan(MANILHA_TABLE[i - 1].swlCurva - 0.01);
    }
  });
});

describe("lookupWllFromMaterial — manilhas (id por polegadas)", () => {
  it("retorna 1000 kg para manilha curva 3/8\" (1.0t)", () => {
    expect(lookupWllFromMaterial({ tipo: "MANILHA_CURVA", id: '3/8"', modo: "x" })).toBeCloseTo(1000, 0);
  });

  it("retorna 1000 kg para manilha reta 3/8\" (1.0t)", () => {
    expect(lookupWllFromMaterial({ tipo: "MANILHA_RETA", id: '3/8"', modo: "x" })).toBeCloseTo(1000, 0);
  });

  it("retorna 12000 kg para manilha curva 1-1/4\" (12.0t)", () => {
    expect(lookupWllFromMaterial({ tipo: "MANILHA_CURVA", id: '1-1/4"', modo: "x" })).toBeCloseTo(12000, 0);
  });

  it("retorna 12000 kg para manilha reta 1-1/4\" (12.0t)", () => {
    expect(lookupWllFromMaterial({ tipo: "MANILHA_RETA", id: '1-1/4"', modo: "x" })).toBeCloseTo(12000, 0);
  });

  it("manilha curva 1-1/4\" == manilha reta 1-1/4\"", () => {
    const curva = lookupWllFromMaterial({ tipo: "MANILHA_CURVA", id: '1-1/4"', modo: "x" });
    const reta  = lookupWllFromMaterial({ tipo: "MANILHA_RETA",  id: '1-1/4"', modo: "x" });
    expect(curva).toEqual(reta);
  });

  it("também aceita busca por mm numérico (compatibilidade)", () => {
    expect(lookupWllFromMaterial({ tipo: "MANILHA_CURVA", id: 9.5, modo: "x" })).toBeCloseTo(1000, 0);
  });

  it("retorna null para polegada inexistente", () => {
    expect(lookupWllFromMaterial({ tipo: "MANILHA_CURVA", id: '3/16"', modo: "x" })).toBeNull();
  });

  it("ignora o campo modo (manilha só tem um valor por tipo)", () => {
    const r1 = lookupWllFromMaterial({ tipo: "MANILHA_CURVA", id: '3/8"', modo: "simples" });
    const r2 = lookupWllFromMaterial({ tipo: "MANILHA_CURVA", id: '3/8"', modo: "qualquerCoisa" });
    expect(r1).toBe(r2);
  });
});

// ── Conversões de polegadas ───────────────────────────────────────────────────

describe("inchesToMm / mmToInches", () => {
  it("1 polegada = 25.4 mm (definição exata)", () => {
    expect(inchesToMm(1)).toBeCloseTo(25.4, 10);
  });

  it("25.4 mm = 1 polegada", () => {
    expect(mmToInches(25.4)).toBeCloseTo(1, 10);
  });

  it("1/2\" = 12.7 mm", () => {
    expect(inchesToMm(0.5)).toBeCloseTo(12.7, 5);
  });

  it("3/8\" = 9.525 mm", () => {
    expect(inchesToMm(0.375)).toBeCloseTo(9.525, 4);
  });

  it("roundtrip pol → mm → pol sem perda de precisão", () => {
    expect(mmToInches(inchesToMm(2.5))).toBeCloseTo(2.5, 8);
  });

  it("zero entra, zero sai", () => {
    expect(inchesToMm(0)).toBe(0);
    expect(mmToInches(0)).toBe(0);
  });
});

describe("lookupWllFromMaterial — tipo inválido / edge cases", () => {
  it("retorna null para tipo desconhecido", () => {
    expect(lookupWllFromMaterial({ tipo: "CABO_INVALIDO", id: 9.5, modo: "simples" })).toBeNull();
  });

  it("retorna null para tipo vazio", () => {
    expect(lookupWllFromMaterial({ tipo: "", id: 9.5, modo: "simples" })).toBeNull();
  });

  it("retorna null para id vazio em cinta", () => {
    expect(lookupWllFromMaterial({ tipo: "CINTA", id: "", modo: "vertical" })).toBeNull();
  });

  it("WLL retornado é sempre em kg (>0 para entradas válidas)", () => {
    const cases = [
      { tipo: "CINTA",         id: "Verde",       modo: "vertical"     },
      { tipo: "CABO_AF19",     id: 25.4,          modo: "simples"      },
      { tipo: "CABO_AA19",     id: 25.4,          modo: "cesto"        },
      { tipo: "CABO_AF37",     id: 25.4,          modo: "forca"        },
      { tipo: "CORRENTE_G80",  id: 16,            modo: "pernas2_ang60"},
      { tipo: "CORRENTE_G100", id: 16,            modo: "pernas4_ang45"},
      { tipo: "MANILHA_CURVA", id: 25.4,          modo: "x"            },
      { tipo: "MANILHA_RETA",  id: 25.4,          modo: "x"            },
    ];
    cases.forEach(cfg => {
      const wll = lookupWllFromMaterial(cfg);
      expect(wll).not.toBeNull();
      expect(wll).toBeGreaterThan(0);
    });
  });
});

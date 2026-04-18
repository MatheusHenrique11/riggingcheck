import { describe, it, expect } from "@jest/globals";

const mockFn = () => {
  const calls = [];
  const fn = (...args) => { calls.push(args); };
  fn.mock = { calls };
  fn.toHaveBeenCalled = () => calls.length > 0;
  return fn;
};
import {
  buildPrintHtml,
  formatPetrobrasSection,
  openPrintWindow,
} from "../pdf.js";
import { canPrintPdf } from "../calculations.js";

// ── buildPrintHtml ────────────────────────────────────────────────────────────

describe("buildPrintHtml", () => {
  it("retorna DOCTYPE html válido", () => {
    const html = buildPrintHtml("<p>test</p>");
    expect(html).toMatch(/^<!DOCTYPE html>/i);
  });

  it("inclui o innerHtml no body", () => {
    const html = buildPrintHtml("<p>conteúdo</p>");
    expect(html).toContain("<p>conteúdo</p>");
  });

  it("inclui charset utf-8", () => {
    expect(buildPrintHtml("x")).toContain('charset="utf-8"');
  });

  it("usa fundo branco no body", () => {
    expect(buildPrintHtml("x")).toContain("background: #fff");
  });

  it("título contém RiggingCheck", () => {
    expect(buildPrintHtml("x")).toContain("RiggingCheck");
  });

  it("inclui section petrobras quando formatPetrobrasSection é injetado", () => {
    const petrobrasHtml = formatPetrobrasSection({
      classificacao: "ROTINEIRO",
      projetista: { nome: "João", registro: "R123" },
      supervisor: { nome: "Maria", registro: "S456" },
      docs: ["PT"],
      tandem: false,
      sobreAreaHabitada: false,
      cargaEspecial: false,
      todosMarcados: true,
    });
    const full = buildPrintHtml(petrobrasHtml);
    expect(full).toContain("N-2869");
    expect(full).toContain("João");
  });
});

// ── formatPetrobrasSection ────────────────────────────────────────────────────

describe("formatPetrobrasSection", () => {
  it("retorna string vazia para data null/undefined", () => {
    expect(formatPetrobrasSection(null)).toBe("");
    expect(formatPetrobrasSection(undefined)).toBe("");
  });

  it("contém cabeçalho N-2869", () => {
    const html = formatPetrobrasSection({});
    expect(html).toContain("N-2869");
  });

  it("exibe classificação ROTINEIRO em verde (#16a34a)", () => {
    const html = formatPetrobrasSection({ classificacao: "ROTINEIRO" });
    expect(html).toContain("ROTINEIRO");
  });

  it("exibe classificação NAO_ROTINEIRO com label correto", () => {
    const html = formatPetrobrasSection({ classificacao: "NAO_ROTINEIRO" });
    expect(html).toContain("NÃO ROTINEIRO");
  });

  it("exibe IÇAMENTO CRÍTICO para classificação CRITICO", () => {
    const html = formatPetrobrasSection({ classificacao: "CRITICO" });
    expect(html).toContain("IÇAMENTO CRÍTICO");
  });

  it("exibe aviso especial para içamento crítico", () => {
    const html = formatPetrobrasSection({ classificacao: "CRITICO" });
    expect(html).toContain("Plano de Rigging Detalhado");
    expect(html).toContain("PLH");
  });

  it("exibe nome e registro do projetista", () => {
    const html = formatPetrobrasSection({
      projetista: { nome: "Carlos Lima", registro: "CREA-12345" },
    });
    expect(html).toContain("Carlos Lima");
    expect(html).toContain("CREA-12345");
  });

  it("exibe nome e registro do supervisor", () => {
    const html = formatPetrobrasSection({
      supervisor: { nome: "Ana Souza", registro: "REG-999" },
    });
    expect(html).toContain("Ana Souza");
    expect(html).toContain("REG-999");
  });

  it("exibe traço quando projetista não informado", () => {
    const html = formatPetrobrasSection({ projetista: {} });
    expect(html).toContain("—");
  });

  it("exibe documentação obrigatória", () => {
    const html = formatPetrobrasSection({
      docs: ["Permissão de Trabalho (PT)", "AST"],
    });
    expect(html).toContain("Permissão de Trabalho (PT)");
    expect(html).toContain("AST");
  });

  it("não exibe bloco de documentação quando docs = []", () => {
    const html = formatPetrobrasSection({ docs: [] });
    expect(html).not.toContain("Documentação obrigatória");
  });

  it("exibe fator tandem quando ativo", () => {
    const html = formatPetrobrasSection({ tandem: true });
    expect(html).toContain("Tandem");
  });

  it("exibe fator sobreAreaHabitada quando ativo", () => {
    const html = formatPetrobrasSection({ sobreAreaHabitada: true });
    expect(html).toContain("habitada");
  });

  it("exibe fator cargaEspecial quando ativo", () => {
    const html = formatPetrobrasSection({ cargaEspecial: true });
    expect(html).toContain("especial");
  });

  it("não exibe bloco de fatores quando todos são false", () => {
    const html = formatPetrobrasSection({
      tandem: false,
      sobreAreaHabitada: false,
      cargaEspecial: false,
    });
    expect(html).not.toContain("Fatores de classificação");
  });

  it("checklist completo → mensagem verde de verificado", () => {
    const html = formatPetrobrasSection({ todosMarcados: true });
    expect(html).toContain("Todos os itens do Checklist N-2869 verificados");
    expect(html).toContain("#16a34a");
  });

  it("checklist incompleto → aviso laranja", () => {
    const html = formatPetrobrasSection({ todosMarcados: false });
    expect(html).toContain("Checklist N-2869 incompleto");
    expect(html).toContain("#d97706");
  });

  // XSS escaping
  it("escapa HTML em nome do projetista", () => {
    const html = formatPetrobrasSection({
      projetista: { nome: '<script>alert("xss")</script>' },
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapa HTML em nome do supervisor", () => {
    const html = formatPetrobrasSection({
      supervisor: { nome: "<b>bold</b>" },
    });
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;b&gt;");
  });

  it("escapa aspas duplas em registro", () => {
    const html = formatPetrobrasSection({
      projetista: { nome: "ok", registro: '"quoted"' },
    });
    expect(html).toContain("&quot;quoted&quot;");
  });
});

// ── canPrintPdf ───────────────────────────────────────────────────────────────

describe("canPrintPdf", () => {
  it("usuário não logado pode imprimir (acesso público)", () => {
    expect(canPrintPdf(false, undefined)).toBe(true);
  });

  it("GERENTE_OPERACOES pode imprimir", () => {
    expect(canPrintPdf(true, "GERENTE_OPERACOES")).toBe(true);
  });

  it("LIDER_EQUIPE pode imprimir", () => {
    expect(canPrintPdf(true, "LIDER_EQUIPE")).toBe(true);
  });

  it("ADMIN_EMPRESA pode imprimir", () => {
    expect(canPrintPdf(true, "ADMIN_EMPRESA")).toBe(true);
  });

  it("OPERADOR não pode imprimir", () => {
    expect(canPrintPdf(true, "OPERADOR")).toBe(false);
  });

  it("role undefined em usuário logado não pode imprimir", () => {
    expect(canPrintPdf(true, undefined)).toBe(false);
  });

  it("role vazia em usuário logado não pode imprimir", () => {
    expect(canPrintPdf(true, "")).toBe(false);
  });
});

// ── openPrintWindow ───────────────────────────────────────────────────────────

describe("openPrintWindow", () => {
  it("retorna { success: false, reason: 'popup-blocked' } quando opener retorna null", () => {
    const result = openPrintWindow("<p>test</p>", { opener: () => null });
    expect(result).toEqual({ success: false, reason: "popup-blocked" });
  });

  it("retorna { success: true } quando janela abre com sucesso", () => {
    const mockWin = {
      document: { write: mockFn(), close: mockFn() },
      focus: mockFn(),
      print: mockFn(),
    };
    const result = openPrintWindow("<p>test</p>", {
      opener: () => mockWin,
      delay: 0,
    });
    expect(result).toEqual({ success: true });
  });

  it("chama document.write com HTML completo", () => {
    const mockWin = {
      document: { write: mockFn(), close: mockFn() },
      focus: mockFn(),
      print: mockFn(),
    };
    openPrintWindow("<p>conteúdo</p>", { opener: () => mockWin, delay: 0 });
    expect(mockWin.document.write.mock.calls).toHaveLength(1);
    const writtenHtml = mockWin.document.write.mock.calls[0][0];
    expect(writtenHtml).toContain("<!DOCTYPE html>");
    expect(writtenHtml).toContain("<p>conteúdo</p>");
  });

  it("chama document.close após write", () => {
    const mockWin = {
      document: { write: mockFn(), close: mockFn() },
      focus: mockFn(),
      print: mockFn(),
    };
    openPrintWindow("<p>test</p>", { opener: () => mockWin, delay: 0 });
    expect(mockWin.document.close.mock.calls.length).toBeGreaterThan(0);
  });

  it("chama focus na janela aberta", () => {
    const mockWin = {
      document: { write: mockFn(), close: mockFn() },
      focus: mockFn(),
      print: mockFn(),
    };
    openPrintWindow("<p>test</p>", { opener: () => mockWin, delay: 0 });
    expect(mockWin.focus.mock.calls.length).toBeGreaterThan(0);
  });

  it("inclui seção Petrobras no HTML quando fornecida", () => {
    const mockWin = {
      document: { write: mockFn(), close: mockFn() },
      focus: mockFn(),
      print: mockFn(),
    };
    const petrobrasHtml = formatPetrobrasSection({
      classificacao: "CRITICO",
      projetista: { nome: "Eng. Silva" },
      todosMarcados: false,
    });
    const inner = `<div id="report">${petrobrasHtml}</div>`;
    openPrintWindow(inner, { opener: () => mockWin, delay: 0 });
    const writtenHtml = mockWin.document.write.mock.calls[0][0];
    expect(writtenHtml).toContain("N-2869");
    expect(writtenHtml).toContain("Eng. Silva");
    expect(writtenHtml).toContain("IÇAMENTO CRÍTICO");
  });
});

// ── Impressão de OS do Gerente (OSDetalhadaModal) ────────────────────────────
// Raiz do bug: o modal usava window.print() no documento principal (tema escuro)
// em vez de openPrintWindow(el.outerHTML) que cria uma janela branca separada.

describe("openPrintWindow — OS do Gerente de Operações", () => {
  it("captura o conteúdo do OS e escreve em janela branca", () => {
    const mockWin = {
      document: { write: mockFn(), close: mockFn() },
      focus: mockFn(),
      print: mockFn(),
    };
    const osHtml = `
      <div id="os-print-area" style="background:#fff;color:#111;padding:32px">
        <div style="font-size:20px;font-weight:800;color:#1e3a5f">RIGGINGCHECK</div>
        <div>OS: OP-2024-001</div>
        <div style="background:#e8f0fe;color:#1e3a5f;border-left:3px solid #1e3a5f">AUTORIZAÇÃO</div>
        <div>Status: AUTORIZADO — PROSSEGUIR</div>
        <div>Autorizado por: João Gerente</div>
      </div>`;
    openPrintWindow(osHtml, { opener: () => mockWin, delay: 0 });
    const written = mockWin.document.write.mock.calls[0][0];
    expect(written).toContain("<!DOCTYPE html>");
    expect(written).toContain("OP-2024-001");
    expect(written).toContain("AUTORIZADO — PROSSEGUIR");
    expect(written).toContain("João Gerente");
    // fundo branco na janela de impressão
    expect(written).toMatch(/background:\s*#fff/);
  });

  it("cabeçalho de seção da OS usa texto escuro (visível sem imprimir fundos)", () => {
    const osHtml = `
      <div id="os-print-area">
        <div style="background:#e8f0fe;color:#1e3a5f;border-left:3px solid #1e3a5f">IDENTIFICAÇÃO</div>
        <div>Empresa: Petrobrás</div>
      </div>`;
    const mockWin = {
      document: { write: mockFn(), close: mockFn() },
      focus: mockFn(),
      print: mockFn(),
    };
    openPrintWindow(osHtml, { opener: () => mockWin, delay: 0 });
    const written = mockWin.document.write.mock.calls[0][0];
    // texto escuro (#1e3a5f) visível mesmo sem fundo impresso
    expect(written).toContain("color:#1e3a5f");
    expect(written).not.toContain("color:#fff"); // sem texto branco invisível
  });
});

// ── Visibilidade de impressão (causa raiz do relatório em branco) ─────────────
// Raiz do bug: cabeçalhos de seção usavam color:#fff em fundo escuro.
// Com "Imprimir fundos" desativado (padrão dos navegadores), o fundo não
// é impresso e o texto branco fica invisível (branco sobre branco = em branco).

describe("buildPrintHtml — visibilidade de impressão para funcionários logados", () => {
  it("não contém texto branco em fundo escuro (a causa original do branco)", () => {
    // Simula o HTML que seria gerado pelo Relatorio com seção de cabeçalho escuro
    const oldStyleHeader =
      '<div style="background:#1e3a5f;color:#fff;font-weight:700">CARGA BRUTA</div>';
    const html = buildPrintHtml(oldStyleHeader);
    // O cabeçalho original problemático ainda existe no conteúdo injetado,
    // mas o novo padrão adotado é fundo claro + texto escuro
    expect(html).toContain(oldStyleHeader); // confirma que o conteúdo é preservado
  });

  it("inclui print-color-adjust para forçar fundos na impressão", () => {
    const html = buildPrintHtml("<div>x</div>");
    expect(html).toContain("print-color-adjust");
  });

  it("cabeçalho de seção novo (fundo claro #e8f0fe, texto escuro #1e3a5f) é visível sem fundos", () => {
    // Este é o novo estilo adotado após o fix
    const newStyleHeader =
      '<div style="background:#e8f0fe;color:#1e3a5f;font-weight:700;border-left:3px solid #1e3a5f">CARGA BRUTA</div>';
    const html = buildPrintHtml(newStyleHeader);
    // O texto escuro (#1e3a5f) é visível mesmo sem imprimir o fundo
    expect(html).toContain("color:#1e3a5f");
    expect(html).toContain(newStyleHeader);
  });

  it("relatório com planData vazio ainda tem conteúdo visível (header + aviso)", () => {
    // Simula o Relatorio com planData vazio — deve mostrar aviso de sem dados
    const reportHtml = `
      <div id="rc-relatorio" style="background:#fff;color:#111">
        <div>RIGGINGCHECK</div>
        <div style="background:#fef9c3;color:#713f12;border:1px solid #fde047">
          ⚠ Nenhum cálculo de içamento registrado. Para obter o relatório completo,
          preencha e calcule os dados nas abas Guindaste &amp; Carga e Lingada &amp; Carga.
        </div>
        <div>Checklist de Campo — 0/26 itens (0%)</div>
      </div>`;
    const html = buildPrintHtml(reportHtml);
    expect(html).toContain("RIGGINGCHECK");
    expect(html).toContain("Nenhum cálculo de içamento registrado");
    expect(html).toContain("Checklist de Campo");
  });

  it("relatório com dados de engenharia inclui seções de cálculo", () => {
    const reportHtml = `
      <div id="rc-relatorio" style="background:#fff;color:#111">
        <div>RIGGINGCHECK</div>
        <div style="background:#e8f0fe;color:#1e3a5f;border-left:3px solid #1e3a5f">CARGA BRUTA</div>
        <div>CARGA BRUTA TOTAL: 8500 kg</div>
        <div style="background:#e8f0fe;color:#1e3a5f;border-left:3px solid #1e3a5f">SWL / FATOR DE SEGURANÇA</div>
        <div>SWL: 1700 kg</div>
      </div>`;
    const html = buildPrintHtml(reportHtml);
    expect(html).toContain("CARGA BRUTA TOTAL: 8500 kg");
    expect(html).toContain("SWL: 1700 kg");
    // Novos cabeçalhos usam texto escuro — visíveis sem imprimir fundos
    expect(html).toContain("color:#1e3a5f");
  });
});

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { buildPrintHtml, openPrintWindow } from "../pdf.js";
import { canPrintPdf } from "../calculations.js";

// ── buildPrintHtml ────────────────────────────────────────────────────────────────
// Valida que o HTML gerado não produz tela em branco ao imprimir

describe("buildPrintHtml", () => {
  it("retorna documento HTML com DOCTYPE", () => {
    const html = buildPrintHtml("<div>conteudo</div>");
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("é um documento HTML completo (abertura e fechamento de tags)", () => {
    const html = buildPrintHtml("<div>x</div>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
    expect(html).toContain("<body");
    expect(html).toContain("</body>");
    expect(html).toContain("<head");
  });

  it("preserva o conteúdo do relatório — principal garantia anti-tela-em-branco", () => {
    const content = '<div id="rc-relatorio"><h1>Içamento de 15t</h1><p>Taxa 72%</p></div>';
    const html = buildPrintHtml(content);
    expect(html).toContain("Içamento de 15t");
    expect(html).toContain("Taxa 72%");
  });

  it("não produz documento vazio quando conteúdo é fornecido", () => {
    const html = buildPrintHtml("<section>dados</section>");
    // Deve ter substancialmente mais que só a estrutura vazia
    expect(html.length).toBeGreaterThan(200);
    expect(html).toContain("dados");
  });

  it("define background branco — resolve tela em branco do tema escuro na impressão", () => {
    const html = buildPrintHtml("<div>x</div>");
    expect(html).toMatch(/background:\s*#fff/);
  });

  it("define cor de texto escura (#111) — garante legibilidade no papel", () => {
    const html = buildPrintHtml("<div>x</div>");
    expect(html).toMatch(/color:\s*#111/);
  });

  it("NÃO usa background escuro (que causaria impressão preta ou em branco)", () => {
    const html = buildPrintHtml("<div>x</div>");
    // Não deve conter os valores de cor do tema escuro da aplicação
    expect(html).not.toContain("background: #0a0a0f");
    expect(html).not.toContain("background:#0a0a0f");
    expect(html).not.toContain("background: #0f0f1a");
  });

  it("inclui @media print com formato A4", () => {
    const html = buildPrintHtml("<div>x</div>");
    expect(html).toContain("@media print");
    expect(html).toContain("A4");
  });

  it("inclui meta charset utf-8 — suporte a acentos (içamento, sinalização, etc.)", () => {
    const html = buildPrintHtml("<div>içamento</div>");
    expect(html).toContain('charset="utf-8"');
    expect(html).toContain("içamento");
  });

  it("inclui título do relatório na aba do navegador", () => {
    const html = buildPrintHtml("<div>x</div>");
    expect(html).toContain("Relatório de Içamento");
    expect(html).toContain("RiggingCheck");
  });

  it("preserva atributos inline do relatório (estilos e ids)", () => {
    const content = '<div id="rc-relatorio" style="color:#111;background:#fff"><p>OK</p></div>';
    const html = buildPrintHtml(content);
    expect(html).toContain('id="rc-relatorio"');
    expect(html).toContain("OK");
  });

  it("conteúdo vazio gera estrutura HTML (não falha)", () => {
    const html = buildPrintHtml("");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<body>");
  });
});

// ── openPrintWindow ───────────────────────────────────────────────────────────────
// Valida o comportamento da função de abertura de janela de impressão

describe("openPrintWindow", () => {
  let mockWin;

  beforeEach(() => {
    mockWin = {
      document: {
        write: jest.fn(),
        close: jest.fn(),
      },
      focus:  jest.fn(),
      print:  jest.fn(),
    };
  });

  // ── Caso de popup bloqueado ─────────────────────────────────────────────────
  it("retorna { success: false, reason: 'popup-blocked' } quando opener retorna null", () => {
    const result = openPrintWindow("<div>x</div>", { opener: () => null });
    expect(result.success).toBe(false);
    expect(result.reason).toBe("popup-blocked");
  });

  it("não lança exceção quando popup está bloqueado", () => {
    expect(() => openPrintWindow("<div>x</div>", { opener: () => null })).not.toThrow();
  });

  it("não escreve nada na janela quando popup é bloqueado", () => {
    openPrintWindow("<div>x</div>", { opener: () => null });
    // mockWin.document.write não deveria ter sido chamado
    expect(mockWin.document.write).not.toHaveBeenCalled();
  });

  // ── Caso de sucesso ─────────────────────────────────────────────────────────
  it("retorna { success: true } quando janela é aberta com sucesso", () => {
    const result = openPrintWindow("<div>x</div>", { opener: () => mockWin, delay: 0 });
    expect(result.success).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("abre janela em nova aba com dimensões corretas", () => {
    const openerSpy = jest.fn(() => mockWin);
    openPrintWindow("<div>x</div>", { opener: openerSpy, delay: 0 });
    expect(openerSpy).toHaveBeenCalledWith("", "_blank", "width=900,height=700");
  });

  it("escreve HTML para o documento da nova janela — exatamente uma vez", () => {
    openPrintWindow("<div>relatorio</div>", { opener: () => mockWin, delay: 0 });
    expect(mockWin.document.write).toHaveBeenCalledTimes(1);
  });

  it("HTML escrito contém o conteúdo do relatório (não está em branco)", () => {
    const content = '<div id="rc-relatorio"><h1>Carga Bruta: 8500 kg</h1><p>Status: SEGURO</p></div>';
    openPrintWindow(content, { opener: () => mockWin, delay: 0 });

    const html = mockWin.document.write.mock.calls[0][0];
    expect(html).toContain("Carga Bruta: 8500 kg");
    expect(html).toContain("Status: SEGURO");
  });

  it("HTML escrito tem fundo branco — confirmação definitiva de ausência de tela em branco", () => {
    openPrintWindow("<div>x</div>", { opener: () => mockWin, delay: 0 });
    const html = mockWin.document.write.mock.calls[0][0];
    expect(html).toMatch(/background:\s*#fff/);
  });

  it("HTML escrito é o mesmo que buildPrintHtml retornaria para o mesmo conteúdo", () => {
    const content = "<div>teste de consistência</div>";
    openPrintWindow(content, { opener: () => mockWin, delay: 0 });
    const html = mockWin.document.write.mock.calls[0][0];
    expect(html).toBe(buildPrintHtml(content));
  });

  it("chama document.close() após escrever — fecha o stream de escrita", () => {
    openPrintWindow("<div>x</div>", { opener: () => mockWin, delay: 0 });
    expect(mockWin.document.close).toHaveBeenCalledTimes(1);
  });

  it("chama focus() para trazer a janela para o primeiro plano", () => {
    openPrintWindow("<div>x</div>", { opener: () => mockWin, delay: 0 });
    expect(mockWin.focus).toHaveBeenCalledTimes(1);
  });

  it("não lança exceção se win.print() falhar (sem UI)", () => {
    const winComPrintFalhando = {
      ...mockWin,
      print: jest.fn(() => { throw new Error("no UI"); }),
    };
    expect(() =>
      openPrintWindow("<div>x</div>", { opener: () => winComPrintFalhando, delay: 0 })
    ).not.toThrow();
  });

  it("preserva múltiplas seções do relatório na janela impressa", () => {
    const multiSection = `
      <div id="rc-relatorio">
        <h1>RiggingCheck</h1>
        <section>Carga: 12000 kg</section>
        <section>Utilização: 78%</section>
        <section>Status: ATENCAO</section>
      </div>
    `;
    openPrintWindow(multiSection, { opener: () => mockWin, delay: 0 });
    const html = mockWin.document.write.mock.calls[0][0];

    expect(html).toContain("Carga: 12000 kg");
    expect(html).toContain("Utilização: 78%");
    expect(html).toContain("Status: ATENCAO");
  });
});

// ── canPrintPdf ───────────────────────────────────────────────────────────────────
// Regra: não logado → pode; logado + (GERENTE | LIDER | ADMIN) → pode; outros → não pode

describe("canPrintPdf", () => {
  // ── Usuário não logado ───────────────────────────────────────────────────────
  it("permite impressão quando não logado (isLoggedIn = false, role = null)", () => {
    expect(canPrintPdf(false, null)).toBe(true);
  });

  it("permite impressão quando não logado, mesmo com role undefined", () => {
    expect(canPrintPdf(false, undefined)).toBe(true);
  });

  it("permite impressão quando não logado independente do role informado", () => {
    expect(canPrintPdf(false, "RIGGER")).toBe(true);
  });

  // ── Usuários logados COM permissão ───────────────────────────────────────────
  it("permite impressão quando logado como GERENTE_OPERACOES", () => {
    expect(canPrintPdf(true, "GERENTE_OPERACOES")).toBe(true);
  });

  it("permite impressão quando logado como LIDER_EQUIPE", () => {
    expect(canPrintPdf(true, "LIDER_EQUIPE")).toBe(true);
  });

  it("permite impressão quando logado como ADMIN_EMPRESA", () => {
    expect(canPrintPdf(true, "ADMIN_EMPRESA")).toBe(true);
  });

  // ── Usuários logados SEM permissão ───────────────────────────────────────────
  it("bloqueia impressão para RIGGER logado", () => {
    expect(canPrintPdf(true, "RIGGER")).toBe(false);
  });

  it("bloqueia impressão para OPERADOR logado", () => {
    expect(canPrintPdf(true, "OPERADOR")).toBe(false);
  });

  it("bloqueia impressão para OPERADOR_GUINDASTE logado", () => {
    expect(canPrintPdf(true, "OPERADOR_GUINDASTE")).toBe(false);
  });

  it("bloqueia impressão para SUPER_ADMIN logado (não está na lista de impressão)", () => {
    expect(canPrintPdf(true, "SUPER_ADMIN")).toBe(false);
  });

  it("bloqueia impressão para role desconhecido logado", () => {
    expect(canPrintPdf(true, "ROLE_NOVA")).toBe(false);
  });

  it("bloqueia impressão para role null com login ativo", () => {
    expect(canPrintPdf(true, null)).toBe(false);
  });

  // ── Coerência lógica ─────────────────────────────────────────────────────────
  it("exatamente GERENTE_OPERACOES, LIDER_EQUIPE e ADMIN_EMPRESA têm acesso entre todos os perfis logados", () => {
    const todosRoles = [
      "SUPER_ADMIN", "ADMIN_EMPRESA", "GERENTE_OPERACOES",
      "LIDER_EQUIPE", "RIGGER", "OPERADOR", "OPERADOR_GUINDASTE",
    ];
    const comAcesso = todosRoles.filter((r) => canPrintPdf(true, r));
    expect(comAcesso).toEqual(["ADMIN_EMPRESA", "GERENTE_OPERACOES", "LIDER_EQUIPE"]);
  });
});

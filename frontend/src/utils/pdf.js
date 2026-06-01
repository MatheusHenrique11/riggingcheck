/**
 * Utilitários de geração e impressão de PDF para relatórios de içamento.
 *
 * A estratégia usada — copiar o HTML do relatório para uma nova janela
 * com estilos de impressão neutros (fundo branco, texto escuro) — resolve
 * o problema clássico de "tela em branco" ao imprimir SPAs com tema escuro:
 * o `window.print()` da janela original captura o fundo #0a0a0f e produz
 * uma página preta ou em branco. A nova janela tem estilos controlados.
 */

/**
 * Gera o documento HTML completo que será escrito na janela de impressão.
 * Usa fundo branco e texto escuro para garantir que o conteúdo seja visível
 * no papel ou no PDF, independentemente do tema da aplicação.
 *
 * @param {string} innerHtml - Conteúdo HTML do relatório (element.outerHTML)
 * @returns {string} Documento HTML completo pronto para window.document.write()
 */
export const buildPrintHtml = (innerHtml) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Relatório de Içamento — RiggingCheck</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #111; margin: 0; padding: 0; }
    /* Garante visibilidade sem "imprimir fundos" — texto sempre escuro */
    [style*="color: rgb(255"] { color: #111 !important; }
    @media print {
      @page { margin: 12mm; size: A4 portrait; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>${innerHtml}</body>
</html>`;

/** Escapa caracteres HTML para evitar XSS em dados do usuário no relatório. */
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Gera o bloco HTML para a seção N-2869 / Petrobras no relatório de impressão.
 * Função pura — recebe os dados salvos do TabPetrobras e retorna uma string HTML.
 *
 * @param {{
 *   classificacao: string,
 *   projetista:    { nome: string, registro: string },
 *   supervisor:    { nome: string, registro: string },
 *   docs:          string[],
 *   tandem:        boolean,
 *   sobreAreaHabitada: boolean,
 *   cargaEspecial: boolean,
 *   todosMarcados: boolean
 * }} data
 * @returns {string} Bloco HTML com a seção Petrobras
 */
export const formatPetrobrasSection = (data) => {
  if (!data) return "";

  const {
    classificacao = "ROTINEIRO",
    projetista    = {},
    supervisor    = {},
    docs          = [],
    tandem        = false,
    sobreAreaHabitada = false,
    cargaEspecial = false,
    todosMarcados = false,
  } = data;

  const labelMap = { ROTINEIRO: "ROTINEIRO", NAO_ROTINEIRO: "NÃO ROTINEIRO", CRITICO: "IÇAMENTO CRÍTICO" };
  const label    = labelMap[classificacao] ?? esc(classificacao);

  const fatores = [
    tandem            && "Içamento em Tandem (2+ guindastes)",
    sobreAreaHabitada && "Sobre área habitada / área de processo",
    cargaEspecial     && "Carga especial (frágil, perigosa ou de grande porte)",
  ].filter(Boolean);

  const Row = (l, v) => `
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f3f4f6">
      <span style="color:#374151;font-size:12px">${esc(l)}</span>
      <span style="font-weight:500;color:#111827;font-size:12px">${esc(v)}</span>
    </div>`;

  const projetistaNome = projetista.nome     ? projetista.nome     : "—";
  const projetistaReg  = projetista.registro ? ` · ${projetista.registro}` : "";
  const supervisorNome = supervisor.nome     ? supervisor.nome     : "—";
  const supervisorReg  = supervisor.registro ? ` · ${supervisor.registro}` : "";

  const docsHtml = docs.length
    ? `<div style="padding:5px 0;border-bottom:1px solid #f3f4f6">
         <div style="color:#374151;font-size:12px;margin-bottom:4px">Documentação obrigatória:</div>
         ${docs.map(d => `<div style="font-size:11px;color:#374151;padding:1px 0">✓ ${esc(d)}</div>`).join("")}
       </div>`
    : "";

  const fatoresHtml = fatores.length
    ? `<div style="padding:5px 0;border-bottom:1px solid #f3f4f6">
         <div style="color:#374151;font-size:12px;margin-bottom:4px">Fatores de classificação:</div>
         ${fatores.map(f => `<div style="font-size:11px;color:#d97706;padding:1px 0">⚠ ${esc(f)}</div>`).join("")}
       </div>`
    : "";

  const criticoAviso = classificacao === "CRITICO"
    ? `<div style="padding:6px 0;color:#dc2626;font-size:11px;font-weight:700">
         ⚠ Içamento Crítico — Plano de Rigging Detalhado aprovado pelo Projetista (PLH) obrigatório antes do início.
       </div>`
    : "";

  const checklistStatus = todosMarcados
    ? `<div style="padding:5px 0;color:#16a34a;font-size:11px;font-weight:600">✓ Todos os itens do Checklist N-2869 verificados</div>`
    : `<div style="padding:5px 0;color:#d97706;font-size:11px">⚠ Checklist N-2869 incompleto — verifique todos os itens antes de iniciar</div>`;

  return `
    <div style="margin-bottom:18px">
      <div style="background:#7c3aed;color:#fff;font-weight:700;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;padding:5px 12px;border-radius:6px 6px 0 0">
        N-2869 — Módulo Petrobras
      </div>
      <div style="border:1px solid #d1d5db;border-top:none;border-radius:0 0 6px 6px;padding:4px 12px">
        ${Row("Classificação", label)}
        ${Row("Projetista (PLH)", projetistaNome + projetistaReg)}
        ${Row("Supervisor de Içamento", supervisorNome + supervisorReg)}
        ${fatoresHtml}
        ${docsHtml}
        ${criticoAviso}
        ${checklistStatus}
      </div>
    </div>`;
};

/**
 * Imprime o relatório HTML.
 * Utiliza um iframe oculto por padrão (mais robusto, evita tela em branco e bloqueadores de pop-up).
 * Fallback para nova janela via `opener` (usado primariamente nos testes).
 *
 * @param {string} innerHtml - Conteúdo HTML do relatório (element.outerHTML)
 * @param {object} [options]
 * @param {number} [options.delay=500] - Ms antes de chamar print()
 * @param {Function} [options.opener]  - Opcional. Se fornecido, usa a estratégia de janela (para testes)
 * @returns {{ success: boolean, reason?: string }}
 */
export const openPrintWindow = (
  innerHtml,
  { delay = 500, opener } = {}
) => {
  const html = buildPrintHtml(innerHtml);

  // Se um opener customizado for passado (ex: nos testes), usa a estratégia antiga de popup
  if (opener) {
    const win = opener("", "_blank", "width=900,height=700");
    if (!win) return { success: false, reason: "popup-blocked" };
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      try { win.print(); } catch { /* ignore */ }
    }, delay);
    return { success: true };
  }

  // Estratégia Iframe Oculto (Produção)
  // Evita problemas de "tela em branco" em Safari/Chrome e contorna bloqueadores de pop-up
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return { success: false, reason: "iframe-creation-failed" };
  }

  doc.open();
  doc.write(html);
  doc.close();

  // Foca no iframe e aguarda o browser renderizar o DOM antes de imprimir
  iframe.contentWindow.focus();
  setTimeout(() => {
    try {
      iframe.contentWindow.print();
    } catch { /* ignore */ }
    // Limpa o iframe do DOM após a janela de impressão ser resolvida
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch { /* ignore */ }
    }, 2000);
  }, delay);

  return { success: true };
};

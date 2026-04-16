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
    @media print { @page { margin: 12mm; size: A4 portrait; } }
  </style>
</head>
<body>${innerHtml}</body>
</html>`;

/**
 * Abre uma nova janela do navegador e imprime o relatório nela.
 *
 * Recebe `opener` como parâmetro injetável para permitir testes unitários
 * sem dependência de `window.open` real.
 *
 * @param {string} innerHtml - Conteúdo HTML do relatório (element.outerHTML)
 * @param {object} [options]
 * @param {number} [options.delay=400] - Ms antes de chamar win.print()
 * @param {Function} [options.opener]  - Substituto para window.open (injeção em testes)
 * @returns {{ success: boolean, reason?: string }}
 */
export const openPrintWindow = (
  innerHtml,
  { delay = 400, opener = (...args) => window.open(...args) } = {}
) => {
  const win = opener("", "_blank", "width=900,height=700");
  if (!win) return { success: false, reason: "popup-blocked" };

  const html = buildPrintHtml(innerHtml);
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    try { win.print(); } catch (_) { /* ignorado em ambiente sem UI */ }
  }, delay);

  return { success: true };
};

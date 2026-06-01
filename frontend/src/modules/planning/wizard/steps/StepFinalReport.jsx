/**
 * Etapa 8 — Relatório Final.
 * Mostra status da aprovação e permite gerar o PDF da operação.
 * Reaproveita openPrintWindow do utils/pdf.js e o mesmo HTML do TabChecklist.
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { openPrintWindow, formatPetrobrasSection } from "../../../../utils/pdf";
import { authFetch } from "../../../../utils/api";
import { CHECKLIST_CAMPO, CL_KEY } from "../../shared/planningConstants";

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL ?? window.location.origin;

const API = import.meta.env.VITE_API_URL ?? "https://riggingcheck-production.up.railway.app";

const S = {
  card: { background: "#1e293b", borderRadius: 12, padding: 24, marginBottom: 16, border: "1px solid #334155" },
};

function buildReportHtml(planData, checked) {
  const {
    cargaBruta, volume, swl, cg, tensao, n2869, petrobrasData,
    operacaoOs, riggerNome, localOperacao, dataOperacao, supervisorNome,
  } = planData;

  const emitido = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const fmt = (v, d = 1) => v != null ? Number(v).toLocaleString("pt-BR", { maximumFractionDigits: d }) : "—";

  const total = CHECKLIST_CAMPO.length;
  const done  = Object.values(checked).filter(Boolean).length;
  const pct   = Math.round((done / total) * 100);

  const Sec = (title, body) =>
    `<div style="margin-bottom:18px">
      <div style="background:#e8f0fe;color:#1e3a5f;font-weight:700;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;padding:5px 12px;border-radius:6px 6px 0 0;border-left:3px solid #1e3a5f">${title}</div>
      <div style="border:1px solid #d1d5db;border-top:none;border-radius:0 0 6px 6px;padding:4px 12px">${body}</div>
    </div>`;

  const Row = (l, v, bold = false) =>
    `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e5e7eb">
      <span style="color:#374151;font-size:12px">${l}</span>
      <span style="font-weight:${bold ? 700 : 500};color:#111827;font-size:12px">${v}</span>
    </div>`;

  let sections = "";

  if (operacaoOs || riggerNome || localOperacao) {
    sections += Sec("Dados da Operação",
      (operacaoOs ? Row("OS", operacaoOs) : "") +
      (riggerNome ? Row("Operador / Rigger", riggerNome) : "") +
      (localOperacao ? Row("Local", localOperacao) : "") +
      (dataOperacao ? Row("Data", dataOperacao) : "")
    );
  }

  if (cargaBruta) {
    sections += Sec("Carga Bruta",
      Row("Carga líquida", `${fmt(cargaBruta.inputs?.liq)} kg`) +
      Row("Peso das eslingas", `${fmt(cargaBruta.inputs?.esl)} kg`) +
      Row("Peso das manilhas", `${fmt(cargaBruta.inputs?.man)} kg`) +
      Row("Peso dos dispositivos", `${fmt(cargaBruta.inputs?.disp)} kg`) +
      Row("CARGA BRUTA TOTAL", `${fmt(cargaBruta.total)} kg`, true) +
      Row("Classificação N-2869", cargaBruta.n2869 ? "IÇAMENTO CRÍTICO (≥ 20 t)" : "Içamento Normal (< 20 t)", true)
    );
  }

  if (volume) {
    sections += Sec("Volume & Peso Estimado",
      Row("Forma geométrica", volume.forma) +
      Row("Material", `${volume.matNome} — ${fmt(volume.matPe, 0)} kg/m³`) +
      Row("Volume calculado", `${fmt(volume.vol, 4)} m³`) +
      Row("Peso estimado", `${fmt(volume.peso, 1)} kg`, true)
    );
  }

  if (swl) {
    sections += Sec("SWL / Fator de Segurança",
      Row("CRM", `${fmt(swl.crm)} kg`) +
      Row("Aplicação", swl.tipoAplicacao) +
      Row("Fator de Segurança", `${swl.fs}:1`) +
      Row("SWL", `${fmt(swl.swlVal, 1)} kg`, true) +
      Row("Taxa de utilização", `${fmt(swl.taxa, 1)}%`, true) +
      Row("Status", swl.status, true)
    );
  }

  if (cg) {
    sections += Sec("Centro de Gravidade",
      Row("Peso total", `${fmt(cg.pt)} kg`, true) +
      Row("d1 (CG → ponto 1)", `${fmt(cg.d1, 3)} m`, true) +
      Row("d2 (CG → ponto 2)", `${fmt(cg.d2, 3)} m`, true) +
      Row("Desequilíbrio", `${fmt(cg.desequil, 1)}%`)
    );
  }

  if (tensao && !tensao.bloqueado) {
    sections += Sec("Tensão nas Eslingas",
      Row("Número de pernas", tensao.inputs?.pernas) +
      Row("Ângulo (vertical)", `${tensao.inputs?.angulo}°`) +
      Row("Tensão por perna", `${fmt(tensao.tensao, 1)} kgf`, true) +
      Row("Taxa de utilização", `${fmt(tensao.taxa, 1)}%`, true) +
      Row("Status", tensao.status, true)
    );
  }

  if (tensao?.bloqueado) {
    sections += Sec("Tensão nas Eslingas",
      `<div style="color:#dc2626;font-weight:700;padding:8px 0;font-size:12px">${tensao.msg}</div>`
    );
  }

  if (n2869) {
    sections += Sec("Validação N-2869",
      Row("Classificação", n2869.critico ? "IÇAMENTO CRÍTICO" : "Içamento Normal", true) +
      Row("Limite util.", `${n2869.limUtil}%`) +
      Row("Status geral", n2869.status, true) +
      (n2869.alertas?.map(a => `<div style="color:#dc2626;font-size:11px;padding:2px 0">⚠ ${a}</div>`).join("") || "")
    );
  }

  if (petrobrasData) {
    sections += formatPetrobrasSection(petrobrasData);
  }

  const clRows = CHECKLIST_CAMPO.map(item =>
    `<div style="display:flex;gap:8px;padding:3px 0;border-bottom:1px solid #e5e7eb;align-items:flex-start">
      <span style="color:${checked[item.id] ? "#16a34a" : "#374151"};font-weight:700;font-size:13px;min-width:16px">${checked[item.id] ? "✓" : "○"}</span>
      <span style="font-size:11px;color:#374151">${item.item}</span>
    </div>`
  ).join("");
  sections += Sec(`Checklist de Campo — ${done}/${total} itens (${pct}%)`, clRows);

  return `<div id="rc-relatorio" style="background:#fff;color:#111;padding:32px;max-width:740px;margin:0 auto;font-family:Arial,sans-serif">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;border-bottom:3px solid #1e3a5f;padding-bottom:16px">
      <div>
        <div style="font-size:22px;font-weight:800;color:#1e3a5f">RIGGINGCHECK</div>
        <div style="font-size:12px;color:#6b7280">Relatório de Planejamento de Içamento</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:#6b7280">Emitido em</div>
        <div style="font-size:13px;font-weight:700;color:#111">${emitido}</div>
        ${supervisorNome ? `<div style="font-size:12px;color:#374151;margin-top:4px">Supervisor: <strong>${supervisorNome}</strong></div>` : ""}
      </div>
    </div>
    ${sections}
    <div style="border-top:1px solid #d1d5db;margin-top:20px;padding-top:12px;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;flex-wrap:wrap;gap:8px">
      <span>RiggingCheck · NR-11 · ABNT NBR 13541 · Petrobras N-2869</span>
      <span>Documento gerado automaticamente · Verificar dados antes de operar</span>
    </div>
  </div>`;
}

export default function StepFinalReport({ planData, onReset }) {
  const navigate = useNavigate();
  const [databookLoading,    setDatabookLoading]    = useState(false);
  const [databookError,      setDatabookError]      = useState(null);
  const [conformLoading,     setConformLoading]     = useState(false);
  const [conformError,       setConformError]       = useState(null);
  const [linkCopiado,        setLinkCopiado]        = useState(false);
  const qrCanvasRef = useRef(null);

  const checked = (() => {
    try { return JSON.parse(localStorage.getItem(CL_KEY) || "{}"); } catch { return {}; }
  })();

  const solicitacao = planData._solicitacao;
  const publicToken = solicitacao?.publicValidationToken;
  const publicUrl   = publicToken ? `${FRONTEND_URL}/public/planos/${publicToken}` : null;

  useEffect(() => {
    if (!qrCanvasRef.current || !publicUrl) return;
    QRCode.toCanvas(qrCanvasRef.current, publicUrl, {
      width: 140,
      color: { dark: "#f1f5f9", light: "#1e293b" },
      margin: 1,
    }).catch(() => {});
  }, [publicUrl]);

  const copiarLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2000);
    });
  };

  const gerarDatabook = async () => {
    if (!solicitacao?.id) {
      setDatabookError("Submeta o plano para aprovação antes de gerar o Databook.");
      return;
    }
    setDatabookLoading(true); setDatabookError(null);
    try {
      const r = await authFetch(`${API}/api/liberacoes/${solicitacao.id}/databook`);
      if (!r.ok) { setDatabookError("Erro ao gerar Databook."); return; }
      const blob = await r.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `databook-${solicitacao.operacaoOs ?? solicitacao.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { setDatabookError("Não foi possível conectar à API."); }
    finally  { setDatabookLoading(false); }
  };

  const gerarRelatorioConformidade = async () => {
    if (!solicitacao?.id) {
      setConformError("Submeta o plano antes de gerar o Relatório de Conformidade.");
      return;
    }
    setConformLoading(true); setConformError(null);
    try {
      const r = await authFetch(`${API}/api/liberacoes/${solicitacao.id}/relatorio-conformidade`);
      if (!r.ok) { setConformError("Erro ao gerar Relatório de Conformidade."); return; }
      const blob = await r.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `conformidade-${solicitacao.operacaoOs ?? solicitacao.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { setConformError("Não foi possível conectar à API."); }
    finally  { setConformLoading(false); }
  };

  const imprimirPdf = () => {
    const html = buildReportHtml(planData, checked);
    const result = openPrintWindow(html);
    if (!result.success) alert("Pop-up bloqueado. Permita pop-ups neste site para imprimir.");
  };

  const statusCfg = !solicitacao
    ? { icon: "📄", title: "Plano Concluído", subtitle: "Aprovação não solicitada nesta sessão.", color: "#3b82f6", bg: "#1e3a5f22" }
    : solicitacao.status === "PROSSEGUIR"
    ? { icon: "✅", title: "IÇAMENTO AUTORIZADO", subtitle: `Autorizado por: ${solicitacao.aprovadoPorNome}`, color: "#22c55e", bg: "#052e16" }
    : solicitacao.status === "PARAR"
    ? { icon: "🚫", title: "IÇAMENTO NÃO AUTORIZADO", subtitle: solicitacao.observacao ? `Motivo: "${solicitacao.observacao}"` : "", color: "#ef4444", bg: "#1c0a0a" }
    : { icon: "⏳", title: "Aprovação Pendente", subtitle: `OS: ${solicitacao.operacaoOs}`, color: "#f59e0b", bg: "#2d1900" };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: "#f1f5f9", margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>📄 Relatório Final</h2>
        <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>
          Gere o PDF do plano de içamento e encerre a operação.
        </p>
      </div>

      {/* Status da aprovação */}
      <div style={{ ...S.card, background: statusCfg.bg, border: `2px solid ${statusCfg.color}44`, textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{statusCfg.icon}</div>
        <div style={{ color: statusCfg.color, fontWeight: 800, fontSize: 18, marginBottom: 8 }}>{statusCfg.title}</div>
        {statusCfg.subtitle && (
          <div style={{ color: "#94a3b8", fontSize: 13 }}>{statusCfg.subtitle}</div>
        )}
      </div>

      {/* QR Code de validação pública — exibido somente se plano aprovado com token */}
      {publicToken && (
        <div style={{ ...S.card, border: "1px solid #22c55e33", background: "#052e1611" }}>
          <div style={{ fontSize: 12, color: "#22c55e", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 }}>
            Validação Pública
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <canvas ref={qrCanvasRef} style={{ borderRadius: 8, display: "block" }} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <p style={{ color: "#86efac", fontSize: 13, margin: "0 0 12px" }}>
                Este plano está aprovado e pode ser validado publicamente sem login.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={copiarLink}
                  style={{
                    background: linkCopiado ? "#052e16" : "transparent",
                    border: `1px solid ${linkCopiado ? "#22c55e" : "#22c55e44"}`,
                    color: linkCopiado ? "#22c55e" : "#86efac",
                    borderRadius: 8, padding: "8px 16px",
                    cursor: "pointer", fontSize: 13, transition: "all 0.2s",
                  }}
                >
                  {linkCopiado ? "✓ Copiado!" : "🔗 Copiar link público"}
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: "transparent", border: "1px solid #22c55e44",
                    color: "#86efac", borderRadius: 8, padding: "8px 16px",
                    cursor: "pointer", fontSize: 13, textDecoration: "none",
                    display: "inline-flex", alignItems: "center",
                  }}
                >
                  🌐 Abrir validação pública
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ações */}
      <div style={S.card}>
        <div style={{ fontSize: 12, color: "#38bdf8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 }}>
          Documentação
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={imprimirPdf}
            style={{
              background: "linear-gradient(135deg,#1e3a5f,#1e40af)",
              border: "none",
              color: "#fff",
              borderRadius: 8,
              padding: "12px 24px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14,
              boxShadow: "0 4px 14px rgba(30,64,175,0.3)",
            }}
          >
            🖨 Gerar Relatório PDF
          </button>

          <button
            onClick={gerarDatabook}
            disabled={databookLoading || !solicitacao?.id}
            style={{
              background: solicitacao?.id ? "linear-gradient(135deg,#1e3a5f,#7c3aed)" : "#1e293b",
              border: "none",
              color: solicitacao?.id ? "#fff" : "#475569",
              borderRadius: 8,
              padding: "12px 24px",
              cursor: solicitacao?.id && !databookLoading ? "pointer" : "not-allowed",
              fontWeight: 700,
              fontSize: 14,
              boxShadow: solicitacao?.id ? "0 4px 14px rgba(124,58,237,0.25)" : "none",
              opacity: databookLoading ? 0.7 : 1,
            }}
            title={!solicitacao?.id ? "Submeta o plano primeiro para habilitar o Databook" : ""}
          >
            {databookLoading ? "Gerando..." : "📊 Gerar Databook Enterprise"}
          </button>

          <button
            onClick={gerarRelatorioConformidade}
            disabled={conformLoading || !solicitacao?.id}
            style={{
              background: solicitacao?.id ? "linear-gradient(135deg,#14532d,#166534)" : "#1e293b",
              border: "none",
              color: solicitacao?.id ? "#fff" : "#475569",
              borderRadius: 8,
              padding: "12px 24px",
              cursor: solicitacao?.id && !conformLoading ? "pointer" : "not-allowed",
              fontWeight: 700,
              fontSize: 14,
              boxShadow: solicitacao?.id ? "0 4px 14px rgba(22,101,52,0.3)" : "none",
              opacity: conformLoading ? 0.7 : 1,
            }}
            title={!solicitacao?.id ? "Submeta o plano primeiro para habilitar o Relatório de Conformidade" : ""}
          >
            {conformLoading ? "Gerando..." : "📋 Relatório de Conformidade"}
          </button>

          <button
            onClick={() => navigate("/app/central-aprovacao")}
            style={{
              background: "transparent",
              border: "1px solid #334155",
              color: "#94a3b8",
              borderRadius: 8,
              padding: "12px 24px",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Central de Aprovação
          </button>
        </div>

        {databookError && (
          <div style={{ marginTop: 12, color: "#ef4444", fontSize: 13 }}>{databookError}</div>
        )}
        {conformError && (
          <div style={{ marginTop: 8, color: "#ef4444", fontSize: 13 }}>{conformError}</div>
        )}

        <div style={{ marginTop: 16, fontSize: 11, color: "#475569" }}>
          <strong style={{ color: "#94a3b8" }}>Relatório PDF simples:</strong> dados da sessão atual (local, checklist, cálculos).
          <br />
          <strong style={{ color: "#a78bfa" }}>Databook Enterprise:</strong> dados persistidos + acessórios vinculados + compliance + histórico de aprovação.
          <br />
          <strong style={{ color: "#86efac" }}>Relatório de Conformidade:</strong> auditoria NR-11 / Petrobras N-2869 — matriz de checklist, não conformidades e conclusão regulatória.
        </div>
      </div>

      {/* Nova operação */}
      <div style={S.card}>
        <div style={{ fontSize: 12, color: "#38bdf8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
          Encerrar Plano
        </div>
        <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 16px" }}>
          Para iniciar um novo planejamento, limpe os dados desta sessão.
        </p>
        <button
          onClick={onReset}
          style={{
            background: "transparent",
            border: "1px solid #ef444444",
            color: "#ef4444",
            borderRadius: 8,
            padding: "10px 20px",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          🗑 Limpar e iniciar novo plano
        </button>
      </div>
    </div>
  );
}

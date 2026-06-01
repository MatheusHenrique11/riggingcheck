import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import QRCode from "qrcode";

const API = import.meta.env.VITE_API_URL ?? "https://riggingcheck-production.up.railway.app";

const MENSAGEM_CFG = {
  "PLANO APROVADO E VÁLIDO":       { icon: "✅", bg: "#052e16", border: "#22c55e", textColor: "#22c55e" },
  "PLANO APROVADO COM RESTRIÇÃO":  { icon: "⚠",  bg: "#2d1900", border: "#f59e0b", textColor: "#f59e0b" },
  "PLANO BLOQUEADO":               { icon: "⛔", bg: "#1c0a0a", border: "#ef4444", textColor: "#ef4444" },
  "PLANO RECUSADO":                { icon: "🚫", bg: "#1c0a0a", border: "#ef4444", textColor: "#ef4444" },
  "PLANO NÃO ENCONTRADO":          { icon: "❓", bg: "#0f172a", border: "#64748b", textColor: "#64748b" },
  "PLANO INVALIDADO / EM REVISÃO": { icon: "🔄", bg: "#1e1b00", border: "#ca8a04", textColor: "#ca8a04" },
};

function InfoLine({ label, value, color }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1e293b" }}>
      <span style={{ color: "#64748b", fontSize: 14 }}>{label}</span>
      <span style={{ color: color || "#f1f5f9", fontWeight: 600, fontSize: 14, textAlign: "right", maxWidth: "60%" }}>{value}</span>
    </div>
  );
}

export default function PublicPlanValidation() {
  const { token } = useParams();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [ts,      setTs]      = useState(null);
  const [copied,  setCopied]  = useState(false);
  const canvasRef = useRef(null);

  const publicUrl = window.location.href;

  const doFetch = (active) => {
    fetch(`${API}/api/public/planos/${token}/validacao`)
      .then(r => {
        if (r.status === 404) throw new Error("Plano não encontrado ou token inválido.");
        if (!r.ok) throw new Error("Erro ao consultar plano.");
        return r.json();
      })
      .then(d => { if (active()) { setData(d); setTs(new Date()); } })
      .catch(e => { if (active()) setError(e.message); })
      .finally(() => { if (active()) setLoading(false); });
  };

  useEffect(() => {
    let alive = true;
    doFetch(() => alive);
    return () => { alive = false; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, publicUrl, {
      width: 140,
      color: { dark: "#f1f5f9", light: "#1e293b" },
      margin: 1,
    }).catch(() => {});
  }, [publicUrl, data]);

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    setData(null);
    let alive = true;
    doFetch(() => alive);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const msgKey = data?.mensagemValidacao ?? (error ? "PLANO NÃO ENCONTRADO" : null);
  const msgCfg = msgKey ? (MENSAGEM_CFG[msgKey] ?? MENSAGEM_CFG["PLANO INVALIDADO / EM REVISÃO"]) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px" }}>

      {/* Header */}
      <div style={{ width: "100%", maxWidth: 480, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, background: "#1e293b", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔗</div>
          <div>
            <div style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 16 }}>RiggingCheck</div>
            <div style={{ color: "#475569", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>Validação de Plano de Içamento</div>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ color: "#64748b", fontSize: 16, padding: 60 }}>Consultando plano...</div>
      )}

      {error && !loading && (
        <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            background: MENSAGEM_CFG["PLANO NÃO ENCONTRADO"].bg,
            border: `2px solid ${MENSAGEM_CFG["PLANO NÃO ENCONTRADO"].border}`,
            borderRadius: 16, padding: "28px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>❓</div>
            <div style={{ color: "#64748b", fontWeight: 900, fontSize: 20, letterSpacing: 1 }}>
              PLANO NÃO ENCONTRADO
            </div>
            <div style={{ color: "#475569", fontSize: 13, marginTop: 8 }}>{error}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <button
              onClick={handleRefresh}
              style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontSize: 14 }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {data && msgCfg && (
        <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Status principal */}
          <div style={{
            background: msgCfg.bg,
            border: `2px solid ${msgCfg.border}`,
            borderRadius: 16, padding: "28px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{msgCfg.icon}</div>
            <div style={{ color: msgCfg.textColor, fontWeight: 900, fontSize: 20, letterSpacing: 1, marginBottom: 6 }}>
              {data.mensagemValidacao}
            </div>
            <div style={{ color: "#64748b", fontSize: 12, fontFamily: "monospace", marginTop: 4 }}>
              {data.codigoPlano ?? "—"}
            </div>
          </div>

          {/* Identificação do plano */}
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, border: "1px solid #334155" }}>
            <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
              Identificação
            </div>
            <InfoLine label="Empresa"       value={data.empresaNome} />
            <InfoLine label="Local"         value={data.localOperacao} />
            <InfoLine label="Data operação" value={data.dataOperacao} />
            <InfoLine label="Versão"        value={data.versaoPlano} />
            <InfoLine label="Aprovado em"   value={data.dataAprovacao} color="#22c55e" />
            <InfoLine label="Aprovado por"  value={data.aprovadorCargo} />
          </div>

          {/* Status técnico e aprovação */}
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, border: "1px solid #334155" }}>
            <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
              Status
            </div>
            <InfoLine label="Status técnico"   value={data.statusTecnico} />
            <InfoLine label="Status aprovação" value={data.statusAprovacao} />
            <InfoLine label="Compliance"       value={data.resultadoCompliance} />
          </div>

          {/* Recursos vinculados */}
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, border: "1px solid #334155" }}>
            <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
              Recursos
            </div>
            <InfoLine label="Acessórios vinculados" value={`${data.quantidadeAcessorios} acessório(s)`} />
            <InfoLine label="Membros da equipe"     value={`${data.quantidadeMembrosEquipe} membro(s)`} />
          </div>

          {/* QR Code desta página */}
          <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, border: "1px solid #334155", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#38bdf8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
              QR Code desta validação
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <canvas ref={canvasRef} style={{ borderRadius: 8 }} />
            </div>
            <button
              onClick={handleCopy}
              style={{
                background: copied ? "#052e16" : "#1e293b",
                border: `1px solid ${copied ? "#22c55e" : "#334155"}`,
                color: copied ? "#22c55e" : "#94a3b8",
                borderRadius: 8, padding: "8px 20px",
                cursor: "pointer", fontSize: 13, transition: "all 0.2s",
              }}
            >
              {copied ? "✓ Link copiado!" : "Copiar link de validação"}
            </button>
          </div>

          {/* Aviso + atualizar */}
          <div style={{ textAlign: "center", paddingBottom: 8 }}>
            <button
              onClick={handleRefresh}
              style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontSize: 14, marginBottom: 12 }}
            >
              Atualizar consulta
            </button>
            {ts && (
              <div style={{ color: "#334155", fontSize: 11, marginBottom: 8 }}>
                Consultado em {ts.toLocaleTimeString("pt-BR")} · {data.dataGeracaoConsulta}
              </div>
            )}
            <div style={{ color: "#334155", fontSize: 11 }}>
              Esta página valida a autenticidade do plano aprovado no RiggingCheck.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

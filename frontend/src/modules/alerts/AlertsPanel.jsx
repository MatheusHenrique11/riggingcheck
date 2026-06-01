/**
 * Painel completo de alertas operacionais.
 * Usado na AlertsCenter page e potencialmente em outros lugares.
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { fetchAlerts, gerarAlertas, visualizarAlerta, resolverAlerta, ignorarAlerta } from "./alertsApi";
import { authFetch } from "../../utils/api";

const API = import.meta.env.VITE_API_URL ?? "https://riggingcheck-production.up.railway.app";

const DIGEST_ROLES = ["SUPER_ADMIN", "ADMIN_EMPRESA", "SAFETY_ADMIN"];

const SEV_CFG = {
  BLOCKED:    { color: "#ef4444", bg: "#ef444411", icon: "⛔", label: "Bloqueado"   },
  RESTRICTED: { color: "#f97316", bg: "#f9731611", icon: "🚫", label: "Restrito"    },
  WARNING:    { color: "#f59e0b", bg: "#f59e0b11", icon: "⚠",  label: "Atenção"     },
  INFO:       { color: "#38bdf8", bg: "#38bdf811", icon: "ℹ",  label: "Informativo" },
};

const STATUS_CFG = {
  NOVO:        { color: "#3b82f6",  label: "Novo"       },
  VISUALIZADO: { color: "#94a3b8",  label: "Visualizado" },
  RESOLVIDO:   { color: "#22c55e",  label: "Resolvido"  },
  IGNORADO:    { color: "#475569",  label: "Ignorado"   },
};

const TIPO_LABEL = {
  CERTIFICADO_VENCIDO:       "Cert. Vencido",
  CERTIFICADO_A_VENCER:      "Cert. a Vencer",
  INSPECAO_VENCIDA:          "Inspeção Vencida",
  ACESSORIO_REPROVADO:       "Acessório Reprovado",
  ASO_VENCIDO:               "ASO Vencido",
  ASO_A_VENCER:              "ASO a Vencer",
  NR11_VENCIDA:              "NR-11 Vencida",
  NR11_A_VENCER:             "NR-11 a Vencer",
  NR35_VENCIDA:              "NR-35 Vencida",
  NR35_A_VENCER:             "NR-35 a Vencer",
  PLANO_BLOQUEADO:           "Plano Bloqueado",
  PLANO_AGUARDANDO_APROVACAO:"Aguard. Aprovação",
};

function AlertRow({ alerta, onAction, actionLoading }) {
  const sev = SEV_CFG[alerta.severidade] ?? SEV_CFG.INFO;
  const st  = STATUS_CFG[alerta.status] ?? STATUS_CFG.NOVO;
  const isAtivo = ["NOVO", "VISUALIZADO"].includes(alerta.status);

  return (
    <div style={{
      border: `1px solid ${sev.color}33`,
      borderLeft: `3px solid ${sev.color}`,
      background: sev.bg,
      borderRadius: 8,
      padding: "12px 16px",
      marginBottom: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 14 }}>{sev.icon}</span>
            <span style={{
              color: sev.color, background: sev.color + "22",
              borderRadius: 4, padding: "1px 7px", fontSize: 11, fontWeight: 700,
            }}>
              {sev.label}
            </span>
            <span style={{ color: "#64748b", fontSize: 11 }}>
              {TIPO_LABEL[alerta.tipo] ?? alerta.tipo}
            </span>
            <span style={{
              color: st.color, fontSize: 11, fontStyle: "italic",
            }}>
              {st.label}
            </span>
          </div>
          <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
            {alerta.titulo}
          </div>
          <div style={{ color: "#94a3b8", fontSize: 12 }}>{alerta.mensagem}</div>
          <div style={{ color: "#475569", fontSize: 10, marginTop: 4 }}>
            {alerta.entidadeTipo} · {new Date(alerta.createdAt).toLocaleString("pt-BR")}
          </div>
        </div>

        {isAtivo && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {alerta.status === "NOVO" && (
              <button
                onClick={() => onAction(alerta.id, "visualizar")}
                disabled={actionLoading === alerta.id}
                style={{
                  background: "transparent", border: "1px solid #334155",
                  color: "#94a3b8", borderRadius: 6, padding: "4px 10px",
                  cursor: "pointer", fontSize: 12,
                }}
              >
                Visualizar
              </button>
            )}
            <button
              onClick={() => onAction(alerta.id, "resolver")}
              disabled={actionLoading === alerta.id}
              style={{
                background: "transparent", border: "1px solid #22c55e44",
                color: "#22c55e", borderRadius: 6, padding: "4px 10px",
                cursor: "pointer", fontSize: 12,
              }}
            >
              Resolver
            </button>
            <button
              onClick={() => onAction(alerta.id, "ignorar")}
              disabled={actionLoading === alerta.id}
              style={{
                background: "transparent", border: "1px solid #47556944",
                color: "#64748b", borderRadius: 6, padding: "4px 10px",
                cursor: "pointer", fontSize: 12,
              }}
            >
              Ignorar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AlertsPanel() {
  const { user } = useAuth();
  const canSendDigest = DIGEST_ROLES.includes(user?.role);

  const [alertas, setAlertas]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [generating, setGenerating]     = useState(false);
  const [sendingDigest, setSendingDigest] = useState(false);
  const [digestFeedback, setDigestFeedback] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [statusFilter, setStatusFilter] = useState("NOVO");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAlerts(statusFilter === "TODOS" ? null : statusFilter);
      setAlertas(data ?? []);
    } catch { setAlertas([]); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleGerar = async () => {
    setGenerating(true);
    try {
      await gerarAlertas();
      await load();
    } finally { setGenerating(false); }
  };

  const handleEnviarDigest = useCallback(async () => {
    setSendingDigest(true);
    setDigestFeedback(null);
    try {
      const r = await authFetch(`${API}/api/alertas/enviar-digest`, { method: "POST" });
      if (!r.ok) throw new Error("Erro ao enviar digest.");
      const data = await r.json();
      setDigestFeedback({ ok: true, msg: `Digest enviado para ${data.enviados} destinatário(s).` });
    } catch (e) {
      setDigestFeedback({ ok: false, msg: e.message });
    } finally {
      setSendingDigest(false);
      setTimeout(() => setDigestFeedback(null), 5000);
    }
  }, []);

  const handleAction = async (id, action) => {
    setActionLoading(id);
    try {
      if (action === "visualizar") await visualizarAlerta(id);
      else if (action === "resolver") await resolverAlerta(id);
      else if (action === "ignorar") await ignorarAlerta(id);
      await load();
    } finally { setActionLoading(null); }
  };

  const filtros = ["NOVO", "VISUALIZADO", "RESOLVIDO", "IGNORADO", "TODOS"];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ color: "#f1f5f9", margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>
            🔔 Central de Alertas
          </h2>
          <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>
            Alertas operacionais de acessórios, equipe e planos.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={handleGerar}
            disabled={generating}
            style={{
              background: generating ? "#1e293b" : "linear-gradient(135deg,#1e3a5f,#3b82f6)",
              border: "none", color: "#fff", borderRadius: 8,
              padding: "9px 18px", cursor: generating ? "not-allowed" : "pointer",
              fontWeight: 700, fontSize: 13, opacity: generating ? 0.7 : 1,
            }}
          >
            {generating ? "Gerando..." : "↺ Atualizar Alertas"}
          </button>
          {canSendDigest && (
            <button
              onClick={handleEnviarDigest}
              disabled={sendingDigest}
              style={{
                background: "transparent",
                border: "1px solid #f59e0b44",
                color: "#f59e0b",
                borderRadius: 8, padding: "9px 18px",
                cursor: sendingDigest ? "not-allowed" : "pointer",
                fontWeight: 700, fontSize: 13, opacity: sendingDigest ? 0.7 : 1,
              }}
              title="Envia digest por e-mail para administradores e gestores"
            >
              {sendingDigest ? "Enviando..." : "📧 Enviar Digest"}
            </button>
          )}
        </div>
      </div>

      {/* Feedback digest */}
      {digestFeedback && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13,
          background: digestFeedback.ok ? "#052e1622" : "#1c0a0a22",
          border: `1px solid ${digestFeedback.ok ? "#22c55e44" : "#ef444444"}`,
          color: digestFeedback.ok ? "#22c55e" : "#ef4444",
        }}>
          {digestFeedback.ok ? "✅" : "⚠"} {digestFeedback.msg}
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {filtros.map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            style={{
              border: `1px solid ${statusFilter === f ? "#3b82f6" : "#334155"}`,
              background: statusFilter === f ? "#1e3a5f" : "transparent",
              color: statusFilter === f ? "#93c5fd" : "#64748b",
              borderRadius: 20, padding: "5px 14px",
              cursor: "pointer", fontSize: 12,
            }}
          >
            {STATUS_CFG[f]?.label ?? f}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <p style={{ color: "#64748b", fontSize: 13 }}>Carregando alertas...</p>
      ) : alertas.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "40px 20px",
          border: "1px dashed #334155", borderRadius: 12, color: "#475569",
        }}>
          {statusFilter === "NOVO"
            ? "✅ Nenhum alerta novo. Clique em 'Atualizar Alertas' para verificar."
            : "Nenhum alerta encontrado com este filtro."}
        </div>
      ) : (
        alertas.map(a => (
          <AlertRow key={a.id} alerta={a} onAction={handleAction} actionLoading={actionLoading} />
        ))
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { authFetch } from "../utils/api";
import CompliancePanel from "../components/CompliancePanel";
import AppShell from "../layouts/AppShell";

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL ?? window.location.origin;

const API = import.meta.env.VITE_API_URL ?? "https://riggingcheck-production.up.railway.app";

const WORKFLOW_LABELS = {
  DRAFT:                    { label: "Rascunho",             color: "#64748b" },
  SUBMITTED:                { label: "Enviado",              color: "#3b82f6" },
  UNDER_REVIEW:             { label: "Em Análise",           color: "#8b5cf6" },
  CHANGES_REQUESTED:        { label: "Ajuste Solicitado",    color: "#f97316" },
  RESUBMITTED:              { label: "Reenviado",            color: "#06b6d4" },
  APPROVED:                 { label: "Aprovado",             color: "#22c55e" },
  APPROVED_WITH_RESTRICTIONS:{ label: "Aprovado c/ Ressalvas",color: "#84cc16" },
  REJECTED:                 { label: "Recusado",             color: "#ef4444" },
  CANCELLED:                { label: "Cancelado",            color: "#475569" },
  EXECUTED:                 { label: "Executado",            color: "#10b981" },
  ARCHIVED:                 { label: "Arquivado",            color: "#334155" },
};

const TECHNICAL_LABELS = {
  COMPLIANT:  { label: "Conforme",   color: "#22c55e" },
  WARNING:    { label: "Atenção",    color: "#f59e0b" },
  RESTRICTED: { label: "Restrito",  color: "#f97316" },
  BLOCKED:    { label: "Bloqueado", color: "#ef4444" },
};

const canDecide = (role) =>
  ["SUPER_ADMIN", "SAFETY_ADMIN", "ADMIN_EMPRESA", "LIDER_EQUIPE"].includes(role);

const canOverrideBlocked = (role) =>
  ["SUPER_ADMIN", "SAFETY_ADMIN"].includes(role);

function StatusBadge({ value, map }) {
  const cfg = map[value];
  if (!cfg) return <span style={{ color: "#64748b" }}>{value ?? "—"}</span>;
  return (
    <span style={{
      color: cfg.color,
      background: cfg.color + "22",
      borderRadius: 4,
      padding: "2px 8px",
      fontSize: 12,
      fontWeight: 600,
    }}>
      {cfg.label}
    </span>
  );
}

function DecisionModal({ plan, userRole, onClose, onRefresh }) {
  const [action, setAction] = useState("aprovar");
  const [justification, setJustification] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const isBlocked = plan.technicalStatus === "BLOCKED";
  const restricted = isBlocked && !canOverrideBlocked(userRole);

  async function submit() {
    setLoading(true);
    setErr(null);
    const endpoint = {
      aprovar:         `/api/planos/${plan.id}/aprovar`,
      solicitarAjuste: `/api/planos/${plan.id}/solicitar-ajuste`,
      recusar:         `/api/planos/${plan.id}/recusar`,
    }[action];
    try {
      const res = await authFetch(`${API}${endpoint}`, {
        method: "POST",
        body: JSON.stringify({ justification, isException: isBlocked }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message ?? "Erro ao processar decisão");
      }
      onRefresh();
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000a",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      padding: "16px",
    }}>
      <div style={{
        background: "#1e293b", borderRadius: 12, padding: "24px 20px",
        width: "min(520px, 100%)", border: "1px solid #334155",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <h3 style={{ color: "#f1f5f9", margin: "0 0 16px" }}>
          Decisão — OS: {plan.operacaoOs}
        </h3>

        {isBlocked && (
          <div style={{
            background: "#1c0a0a", border: "1px solid #ef4444",
            borderRadius: 8, padding: "10px 14px", marginBottom: 14,
            color: "#fca5a5", fontSize: 13,
          }}>
            ⛔ Plano BLOQUEADO tecnicamente.
            {restricted
              ? " Você não pode aprovar. Apenas recusar ou solicitar ajuste."
              : " Como SUPERADMIN/SAFETY_ADMIN, você pode aprovar com justificativa."}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { v: "aprovar",         label: "Aprovar",          color: "#22c55e", disabled: restricted },
            { v: "solicitarAjuste", label: "Solicitar Ajuste", color: "#f97316", disabled: false },
            { v: "recusar",         label: "Recusar",          color: "#ef4444", disabled: false },
          ].map(opt => (
            <button
              key={opt.v}
              onClick={() => !opt.disabled && setAction(opt.v)}
              disabled={opt.disabled}
              style={{
                border: `2px solid ${action === opt.v ? opt.color : "#334155"}`,
                background: action === opt.v ? opt.color + "22" : "transparent",
                color: opt.disabled ? "#475569" : opt.color,
                borderRadius: 8, padding: "8px 16px",
                cursor: opt.disabled ? "not-allowed" : "pointer",
                fontWeight: 600, fontSize: 14,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <textarea
          value={justification}
          onChange={e => setJustification(e.target.value)}
          placeholder={action === "solicitarAjuste"
            ? "Descreva quais ajustes são necessários (obrigatório)..."
            : isBlocked
              ? "Justificativa obrigatória para liberação de plano BLOQUEADO..."
              : "Observações (opcional)..."}
          rows={4}
          style={{
            width: "100%", boxSizing: "border-box",
            background: "#0f172a", border: "1px solid #334155",
            color: "#e2e8f0", borderRadius: 8, padding: 12,
            fontSize: 14, resize: "vertical",
          }}
        />

        {err && <p style={{ color: "#ef4444", marginTop: 8, fontSize: 13 }}>{err}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "1px solid #334155",
              color: "#94a3b8", borderRadius: 8, padding: "8px 20px", cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={loading}
            style={{
              background: "#3b82f6", border: "none",
              color: "#fff", borderRadius: 8, padding: "8px 20px",
              cursor: loading ? "not-allowed" : "pointer", fontWeight: 700,
            }}
          >
            {loading ? "Processando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryPanel({ planId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch(`${API}/api/planos/${planId}/historico`)
      .then(r => r.json())
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [planId]);

  if (loading) return <p style={{ color: "#64748b", fontSize: 13 }}>Carregando histórico...</p>;
  if (!history.length) return <p style={{ color: "#475569", fontSize: 13 }}>Nenhuma decisão registrada.</p>;

  return (
    <div>
      {history.map(d => (
        <div key={d.id} style={{
          borderLeft: `3px solid ${WORKFLOW_LABELS[d.decision]?.color ?? "#334155"}`,
          padding: "8px 12px", marginBottom: 10, background: "#0f172a", borderRadius: "0 8px 8px 0",
        }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <StatusBadge value={d.decision} map={WORKFLOW_LABELS} />
            <span style={{ color: "#94a3b8", fontSize: 12 }}>
              por <strong style={{ color: "#cbd5e1" }}>{d.decidedByName}</strong>
              {" "}({d.decidedByRole}) — v{d.versionNumber}
            </span>
            {d.isException && (
              <span style={{ color: "#f59e0b", fontSize: 11, background: "#2d190022", borderRadius: 4, padding: "1px 6px" }}>
                ⚠ Exceção
              </span>
            )}
          </div>
          {d.justification && (
            <p style={{ color: "#94a3b8", fontSize: 13, margin: "6px 0 0", fontStyle: "italic" }}>
              "{d.justification}"
            </p>
          )}
          <p style={{ color: "#475569", fontSize: 11, margin: "4px 0 0" }}>
            {new Date(d.decidedAt).toLocaleString("pt-BR")}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function ApprovalCenter() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showDecision, setShowDecision] = useState(false);
  const [showHistory, setShowHistory] = useState(null);
  const [showCompliance, setShowCompliance] = useState(null);
  const [showTeam, setShowTeam] = useState(null);
  const [teamData, setTeamData] = useState({});
  const [statusFilter, setStatusFilter] = useState("SUBMITTED");
  const [databookLoadingId, setDatabookLoadingId] = useState(null);
  const [conformLoadingId, setConformLoadingId] = useState(null);
  const [copiedTokenId, setCopiedTokenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API}/api/liberacoes?status=${statusFilter}`);
      if (!res.ok) throw new Error();
      setPlans(await res.json());
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const isDecider = canDecide(user?.role);

  const gerarDatabook = async (planId, os) => {
    setDatabookLoadingId(planId);
    try {
      const r = await authFetch(`${API}/api/liberacoes/${planId}/databook`);
      if (!r.ok) { alert("Erro ao gerar Databook."); return; }
      const blob = await r.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `databook-${os ?? planId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { alert("Não foi possível gerar o Databook."); }
    finally  { setDatabookLoadingId(null); }
  };

  const carregarEquipe = async (planId) => {
    if (showTeam === planId) { setShowTeam(null); return; }
    setShowTeam(planId);
    if (teamData[planId]) return;
    try {
      const r = await authFetch(`${API}/api/planos/${planId}/equipe`);
      if (r.ok) {
        const data = await r.json();
        setTeamData(prev => ({ ...prev, [planId]: data }));
      }
    } catch { /* silencioso */ }
  };

  const gerarRelatorioConformidade = async (planId, os) => {
    setConformLoadingId(planId);
    try {
      const r = await authFetch(`${API}/api/liberacoes/${planId}/relatorio-conformidade`);
      if (!r.ok) { alert("Erro ao gerar Relatório de Conformidade."); return; }
      const blob = await r.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `conformidade-${os ?? planId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { alert("Não foi possível gerar o Relatório de Conformidade."); }
    finally  { setConformLoadingId(null); }
  };

  const copiarLinkPublico = (plan) => {
    const url = `${FRONTEND_URL}/public/planos/${plan.publicValidationToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedTokenId(plan.id);
      setTimeout(() => setCopiedTokenId(null), 2000);
    });
  };

  const pendingCount = plans.filter(p =>
    ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"].includes(p.workflowStatus)
  ).length;

  return (
    <AppShell breadcrumb={[
      { label: "Dashboard", path: "/app/dashboard" },
      { label: "Central de Aprovação" },
    ]}>
    <div style={{ color: "#e2e8f0" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, color: "#f1f5f9", fontSize: 22, fontWeight: 800 }}>
              Central de Aprovação
            </h1>
            {pendingCount > 0 && (
              <p style={{ margin: "4px 0 0", color: "#f59e0b", fontSize: 13 }}>
                {pendingCount} plano(s) aguardando decisão
              </p>
            )}
          </div>
          <button
            onClick={load}
            style={{
              background: "transparent", border: "1px solid #334155",
              color: "#94a3b8", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13,
            }}
          >
            ↻ Atualizar
          </button>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {["SUBMITTED", "RESUBMITTED", "CHANGES_REQUESTED", "APPROVED", "REJECTED", "TODOS"].map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                border: `1px solid ${statusFilter === f ? "#3b82f6" : "#334155"}`,
                background: statusFilter === f ? "#1e3a5f" : "transparent",
                color: statusFilter === f ? "#93c5fd" : "#64748b",
                borderRadius: 20, padding: "5px 14px",
                cursor: "pointer", fontSize: 13,
              }}
            >
              {WORKFLOW_LABELS[f]?.label ?? f}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <p style={{ textAlign: "center", color: "#475569", padding: 40 }}>Carregando planos...</p>
        ) : plans.length === 0 ? (
          <div style={{ textAlign: "center", color: "#475569", padding: 60, border: "1px dashed #334155", borderRadius: 12 }}>
            Nenhum plano encontrado com o filtro selecionado.
          </div>
        ) : (
          plans.map(plan => (
            <div key={plan.id} style={{
              background: "#1e293b", borderRadius: 12, padding: 20,
              marginBottom: 14, border: "1px solid #334155",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                    <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>OS: {plan.operacaoOs}</span>
                    <StatusBadge value={plan.workflowStatus} map={WORKFLOW_LABELS} />
                    {plan.technicalStatus && <StatusBadge value={plan.technicalStatus} map={TECHNICAL_LABELS} />}
                  </div>
                  <p style={{ margin: "0 0 2px", color: "#94a3b8", fontSize: 13 }}>
                    Empresa: {plan.empresaNome} · Rigger: {plan.riggerNome}
                  </p>
                  <p style={{ margin: 0, color: "#475569", fontSize: 12 }}>
                    Criado em {new Date(plan.criadoEm).toLocaleString("pt-BR")}
                    {plan.resolvidoEm && ` · Resolvido em ${new Date(plan.resolvidoEm).toLocaleString("pt-BR")}`}
                  </p>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => gerarDatabook(plan.id, plan.operacaoOs)}
                    disabled={databookLoadingId === plan.id}
                    style={{
                      background: "transparent", border: "1px solid #7c3aed44",
                      color: "#a78bfa", borderRadius: 8, padding: "6px 14px",
                      cursor: databookLoadingId === plan.id ? "not-allowed" : "pointer",
                      fontSize: 13, opacity: databookLoadingId === plan.id ? 0.6 : 1,
                    }}
                  >
                    {databookLoadingId === plan.id ? "..." : "📊 Databook"}
                  </button>
                  <button
                    onClick={() => gerarRelatorioConformidade(plan.id, plan.operacaoOs)}
                    disabled={conformLoadingId === plan.id}
                    style={{
                      background: "transparent", border: "1px solid #16653444",
                      color: "#86efac", borderRadius: 8, padding: "6px 14px",
                      cursor: conformLoadingId === plan.id ? "not-allowed" : "pointer",
                      fontSize: 13, opacity: conformLoadingId === plan.id ? 0.6 : 1,
                    }}
                  >
                    {conformLoadingId === plan.id ? "..." : "📋 Conformidade"}
                  </button>
                  <button
                    onClick={() => carregarEquipe(plan.id)}
                    style={{
                      background: "transparent", border: "1px solid #06b6d444",
                      color: "#67e8f9", borderRadius: 8, padding: "6px 14px",
                      cursor: "pointer", fontSize: 13,
                    }}
                  >
                    👥 Equipe
                  </button>
                  <button
                    onClick={() => setShowCompliance(showCompliance === plan.id ? null : plan.id)}
                    style={{
                      background: "transparent", border: "1px solid #334155",
                      color: "#94a3b8", borderRadius: 8, padding: "6px 14px",
                      cursor: "pointer", fontSize: 13,
                    }}
                  >
                    🔬 Compliance
                  </button>
                  <button
                    onClick={() => setShowHistory(showHistory === plan.id ? null : plan.id)}
                    style={{
                      background: "transparent", border: "1px solid #334155",
                      color: "#94a3b8", borderRadius: 8, padding: "6px 14px",
                      cursor: "pointer", fontSize: 13,
                    }}
                  >
                    📋 Histórico
                  </button>
                  {plan.publicValidationToken && (
                    <>
                      <button
                        onClick={() => copiarLinkPublico(plan)}
                        style={{
                          background: copiedTokenId === plan.id ? "#052e1622" : "transparent",
                          border: `1px solid ${copiedTokenId === plan.id ? "#22c55e44" : "#22c55e33"}`,
                          color: copiedTokenId === plan.id ? "#22c55e" : "#86efac",
                          borderRadius: 8, padding: "6px 14px",
                          cursor: "pointer", fontSize: 13,
                          transition: "all 0.2s",
                        }}
                      >
                        {copiedTokenId === plan.id ? "✓ Copiado!" : "🔗 Copiar link público"}
                      </button>
                      <a
                        href={`/public/planos/${plan.publicValidationToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: "transparent", border: "1px solid #22c55e33",
                          color: "#86efac", borderRadius: 8, padding: "6px 14px",
                          cursor: "pointer", fontSize: 13, textDecoration: "none",
                          display: "inline-flex", alignItems: "center",
                        }}
                      >
                        🌐 Ver validação pública
                      </a>
                    </>
                  )}
                  {isDecider &&
                    ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"].includes(plan.workflowStatus) && (
                    <button
                      onClick={() => { setSelected(plan); setShowDecision(true); }}
                      style={{
                        background: "#1e3a5f", border: "1px solid #3b82f6",
                        color: "#93c5fd", borderRadius: 8, padding: "6px 14px",
                        cursor: "pointer", fontWeight: 600, fontSize: 13,
                      }}
                    >
                      ✏ Decidir
                    </button>
                  )}
                </div>
              </div>

              {showCompliance === plan.id && (
                <CompliancePanel planId={plan.id} />
              )}

              {showTeam === plan.id && (
                <div style={{ marginTop: 14, borderTop: "1px solid #334155", paddingTop: 14 }}>
                  <h4 style={{ color: "#67e8f9", margin: "0 0 10px", fontSize: 13 }}>👥 Equipe Operacional</h4>
                  {!teamData[plan.id] ? (
                    <p style={{ color: "#64748b", fontSize: 12 }}>Carregando...</p>
                  ) : teamData[plan.id].length === 0 ? (
                    <p style={{ color: "#475569", fontSize: 12, fontStyle: "italic" }}>Nenhum membro vinculado formalmente a este plano.</p>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {teamData[plan.id].map(m => {
                        const compColor = m.competencyStatus === "APTO" ? "#22c55e" : m.competencyStatus === "RESTRITO" ? "#f97316" : "#ef4444";
                        return (
                          <div key={m.id} style={{
                            background: "#0f172a", border: `1px solid ${compColor}33`,
                            borderRadius: 8, padding: "8px 12px", minWidth: 180,
                          }}>
                            <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 13 }}>
                              {m.nome ?? "—"}{m.responsavel && <span style={{ color: "#f59e0b", fontSize: 10, marginLeft: 4 }}>RESP.</span>}
                            </div>
                            <div style={{ color: "#64748b", fontSize: 11 }}>{m.funcaoOperacional}</div>
                            <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                              {[
                                { label: "NR-11", s: m.statusNr11 },
                                { label: "NR-35", s: m.statusNr35 },
                                { label: "ASO",   s: m.statusAso  },
                              ].map(({ label, s }) => {
                                const c = s === "VALIDO" ? "#22c55e" : s === "A_VENCER" ? "#f59e0b" : "#ef4444";
                                return (
                                  <span key={label} style={{ color: c, background: c + "22", borderRadius: 3, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>
                                    {label}
                                  </span>
                                );
                              })}
                              <span style={{ color: compColor, fontWeight: 700, fontSize: 10, marginLeft: 4 }}>
                                {m.competencyStatus}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {showHistory === plan.id && (
                <div style={{ marginTop: 16, borderTop: "1px solid #334155", paddingTop: 16 }}>
                  <h4 style={{ color: "#94a3b8", margin: "0 0 12px", fontSize: 14 }}>Histórico de Decisões</h4>
                  <HistoryPanel planId={plan.id} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showDecision && selected && (
        <DecisionModal
          plan={selected}
          userRole={user?.role}
          onClose={() => setShowDecision(false)}
          onRefresh={load}
        />
      )}
    </AppShell>
  );
}

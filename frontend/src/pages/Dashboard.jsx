import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authFetch } from "../utils/api";
import AppShell from "../layouts/AppShell";
import InventoryHealthPanel from "../modules/accessories/InventoryHealthPanel";
import TeamCompetencyDashboard from "../modules/team/TeamCompetencyDashboard";
import AlertsSummaryCard from "../modules/alerts/AlertsSummaryCard";

const API = import.meta.env.VITE_API_URL ?? "https://riggingcheck-production.up.railway.app";

// ── Helpers visuais ──────────────────────────────────────────────────────────────

const TECH_STATUS_CFG = {
  COMPLIANT:  { label: "Conforme",   color: "#22c55e" },
  WARNING:    { label: "Atenção",    color: "#f59e0b" },
  RESTRICTED: { label: "Restrito",  color: "#f97316" },
  BLOCKED:    { label: "Bloqueado", color: "#ef4444" },
};

const WORKFLOW_CFG = {
  SUBMITTED:         { label: "Aguardando",   color: "#3b82f6" },
  RESUBMITTED:       { label: "Reenviado",    color: "#06b6d4" },
  UNDER_REVIEW:      { label: "Em Análise",   color: "#8b5cf6" },
  CHANGES_REQUESTED: { label: "Ajuste",       color: "#f97316" },
  APPROVED:          { label: "Aprovado",     color: "#22c55e" },
  REJECTED:          { label: "Recusado",     color: "#ef4444" },
  DRAFT:             { label: "Rascunho",     color: "#64748b" },
};

function MetricCard({ label, value, sub, color, icon, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#1e293b",
        border: `1px solid ${color}33`,
        borderRadius: 12,
        padding: "20px 22px",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s",
        minWidth: 0,
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = color + "88")}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = color + "33")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: "#64748b", fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 6, textTransform: "uppercase" }}>
            {label}
          </div>
          <div style={{ color, fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{value ?? "—"}</div>
          {sub && <div style={{ color: "#475569", fontSize: 12, marginTop: 6 }}>{sub}</div>}
        </div>
        <div style={{
          width: 44, height: 44,
          borderRadius: 10,
          background: color + "22",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, action, onAction }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <h2 style={{ color: "#f1f5f9", margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h2>
      {action && (
        <button
          onClick={onAction}
          style={{
            background: "transparent", border: "1px solid #334155",
            color: "#94a3b8", borderRadius: 8, padding: "5px 14px",
            cursor: "pointer", fontSize: 13,
          }}
        >
          {action}
        </button>
      )}
    </div>
  );
}

function ApprovalRow({ sol, onView }) {
  const wf = WORKFLOW_CFG[sol.workflowStatus] ?? WORKFLOW_CFG[
    sol.status === "ANALISAR" ? "SUBMITTED" : sol.status === "PROSSEGUIR" ? "APPROVED" : "REJECTED"
  ] ?? { label: sol.status ?? "—", color: "#64748b" };
  const ts = TECH_STATUS_CFG[sol.technicalStatus];

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 16px",
      background: "#0f172a",
      borderRadius: 8,
      marginBottom: 8,
      flexWrap: "wrap",
    }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>OS: {sol.operacaoOs}</div>
        <div style={{ color: "#64748b", fontSize: 12 }}>
          {sol.empresaNome} · {sol.riggerNome}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {ts && (
          <span style={{
            color: ts.color,
            background: ts.color + "22",
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: 11,
            fontWeight: 700,
          }}>
            {ts.label}
          </span>
        )}
        <span style={{
          color: wf.color,
          background: wf.color + "22",
          borderRadius: 4,
          padding: "2px 8px",
          fontSize: 11,
          fontWeight: 700,
        }}>
          {wf.label}
        </span>
        <span style={{ color: "#475569", fontSize: 11 }}>
          {new Date(sol.criadoEm).toLocaleDateString("pt-BR")}
        </span>
      </div>
      <button
        onClick={() => onView?.(sol)}
        style={{
          background: "transparent", border: "1px solid #334155",
          color: "#64748b", borderRadius: 6, padding: "4px 12px",
          cursor: "pointer", fontSize: 12, flexShrink: 0,
        }}
      >
        Ver
      </button>
    </div>
  );
}

function ComplianceBar({ blocked, restricted, warning, compliant, total }) {
  if (!total) return null;
  const pct = (n) => Math.round((n / total) * 100);
  return (
    <div>
      <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 10, marginBottom: 10 }}>
        {blocked   > 0 && <div style={{ flex: blocked,   background: "#ef4444" }} title={`${pct(blocked)}% Bloqueados`} />}
        {restricted > 0 && <div style={{ flex: restricted, background: "#f97316" }} title={`${pct(restricted)}% Restritos`} />}
        {warning   > 0 && <div style={{ flex: warning,   background: "#f59e0b" }} title={`${pct(warning)}% Atenção`} />}
        {compliant > 0 && <div style={{ flex: compliant, background: "#22c55e" }} title={`${pct(compliant)}% Conformes`} />}
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 12, flexWrap: "wrap" }}>
        {[
          { n: blocked,   color: "#ef4444", label: "Bloqueados" },
          { n: restricted,color: "#f97316", label: "Restritos" },
          { n: warning,   color: "#f59e0b", label: "Atenção" },
          { n: compliant, color: "#22c55e", label: "Conformes" },
        ].filter(x => x.n > 0).map(x => (
          <span key={x.label} style={{ color: x.color }}>
            {x.n} {x.label} ({pct(x.n)}%)
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const canApprove    = ["SUPER_ADMIN", "SAFETY_ADMIN", "ADMIN_EMPRESA", "LIDER_EQUIPE"].includes(user?.role);
  const canPlan       = ["RIGGER", "OPERADOR", "OPERADOR_GUINDASTE", "ADMIN_EMPRESA", "LIDER_EQUIPE"].includes(user?.role);
  const canSeeInventory = ["SUPER_ADMIN", "SAFETY_ADMIN", "ADMIN_EMPRESA", "LIDER_EQUIPE", "GERENTE_OPERACOES"].includes(user?.role);
  const canSeeTeamDashboard = ["SUPER_ADMIN", "SAFETY_ADMIN", "ADMIN_EMPRESA", "LIDER_EQUIPE", "GERENTE_OPERACOES"].includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rAll, rPending, rTeam] = await Promise.allSettled([
        authFetch(`${API}/api/liberacoes?status=TODOS`),
        authFetch(`${API}/api/liberacoes?status=ANALISAR`),
        authFetch(`${API}/api/funcionarios`),
      ]);

      const all     = rAll.status     === "fulfilled" && rAll.value.ok     ? await rAll.value.json().catch(() => [])     : [];
      const pending = rPending.status === "fulfilled" && rPending.value.ok ? await rPending.value.json().catch(() => []) : [];
      const team    = rTeam.status    === "fulfilled" && rTeam.value.ok    ? await rTeam.value.json().catch(() => [])    : [];

      const approved  = all.filter(s => s.status === "PROSSEGUIR" || s.workflowStatus === "APPROVED").length;
      const rejected  = all.filter(s => s.status === "PARAR"      || s.workflowStatus === "REJECTED").length;
      const taxaAprov = approved + rejected > 0 ? Math.round((approved / (approved + rejected)) * 100) : null;

      const blocked    = all.filter(s => s.technicalStatus === "BLOCKED").length;
      const restricted = all.filter(s => s.technicalStatus === "RESTRICTED").length;
      const warning    = all.filter(s => s.technicalStatus === "WARNING").length;
      const compliant  = all.filter(s => s.technicalStatus === "COMPLIANT").length;

      // Indicadores de competência da equipe
      const hoje = new Date();
      const isoHoje = hoje.toISOString().split("T")[0];
      const em30dias = new Date(hoje); em30dias.setDate(hoje.getDate() + 30);
      const iso30 = em30dias.toISOString().split("T")[0];

      const teamAptos = team.filter(f => {
        const ok = (d) => d && d >= isoHoje;
        return ok(f.vencimentoNr11) && ok(f.vencimentoAso);
      }).length;
      const teamBloqueados = team.filter(f => {
        const exp = (d) => !d || d < isoHoje;
        return exp(f.vencimentoNr11) || exp(f.vencimentoAso);
      }).length;
      const teamTreinVencido = team.filter(f =>
        (f.vencimentoNr11 && f.vencimentoNr11 < isoHoje) ||
        (f.vencimentoNr35 && f.vencimentoNr35 < isoHoje)
      ).length;
      const teamAsoVencido = team.filter(f =>
        !f.vencimentoAso || f.vencimentoAso < isoHoje
      ).length;
      const teamAVencer = team.filter(f =>
        (f.vencimentoNr11 && f.vencimentoNr11 >= isoHoje && f.vencimentoNr11 <= iso30) ||
        (f.vencimentoNr35 && f.vencimentoNr35 >= isoHoje && f.vencimentoNr35 <= iso30) ||
        (f.vencimentoAso  && f.vencimentoAso  >= isoHoje && f.vencimentoAso  <= iso30)
      ).length;

      setStats({
        total:    all.length,
        pending:  pending.length,
        approved,
        rejected,
        taxaAprov,
        team:     team.length,
        teamAptos,
        teamBloqueados,
        teamTreinVencido,
        teamAsoVencido,
        teamAVencer,
        blocked,
        restricted,
        warning,
        compliant,
      });
      setRecent(all.slice(0, 8));
    } catch {
      setStats({ total: 0, pending: 0, approved: 0, rejected: 0, taxaAprov: null, team: 0, teamAptos: 0, teamBloqueados: 0, teamTreinVencido: 0, teamAsoVencido: 0, teamAVencer: 0, blocked: 0, restricted: 0, warning: 0, compliant: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ROLE_GREETING = {
    SUPER_ADMIN:        "Painel SaaS",
    SAFETY_ADMIN:       "Dashboard Safety",
    ADMIN_EMPRESA:      "Dashboard Operacional",
    GERENTE_OPERACOES:  "Painel de Operações",
    LIDER_EQUIPE:       "Central do Líder",
    RIGGER:             "Área do Rigger",
    OPERADOR:           "Área do Operador",
    OPERADOR_GUINDASTE: "Painel do Operador",
  };

  return (
    <AppShell breadcrumb={[{ label: ROLE_GREETING[user?.role] ?? "Dashboard" }]}>
      {/* Welcome */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: "#f1f5f9", margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>
          Olá, {user?.userName?.split(" ")[0] ?? "Usuário"} 👋
        </h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>Carregando dados...</div>
      ) : (
        <>
          {/* KPIs principais */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 28,
          }}>
            {stats.pending > 0 && (
              <MetricCard
                label="Aguardando Aprovação"
                value={stats.pending}
                color="#f59e0b"
                icon="⏳"
                sub="Requer ação"
                onClick={() => navigate("/app/central-aprovacao")}
              />
            )}
            <MetricCard
              label="Operações Totais"
              value={stats.total}
              color="#3b82f6"
              icon="📋"
              sub="No período"
            />
            <MetricCard
              label="Aprovadas"
              value={stats.approved}
              color="#22c55e"
              icon="✅"
              sub={stats.taxaAprov != null ? `${stats.taxaAprov}% de aprovação` : ""}
            />
            {stats.rejected > 0 && (
              <MetricCard
                label="Recusadas"
                value={stats.rejected}
                color="#ef4444"
                icon="❌"
              />
            )}
            {stats.team > 0 && (
              <MetricCard
                label="Equipe"
                value={stats.team}
                color="#a78bfa"
                icon="👷"
                sub="Membros ativos"
                onClick={canApprove ? () => navigate("/app/equipes") : undefined}
              />
            )}
            {stats.teamAptos > 0 && (
              <MetricCard
                label="Aptos"
                value={stats.teamAptos}
                color="#22c55e"
                icon="✅"
                sub="Trein. e ASO válidos"
              />
            )}
            {stats.teamBloqueados > 0 && (
              <MetricCard
                label="Bloqueados"
                value={stats.teamBloqueados}
                color="#ef4444"
                icon="🚫"
                sub="NR-11 ou ASO venc."
                onClick={canApprove ? () => navigate("/app/equipes") : undefined}
              />
            )}
            {stats.teamAVencer > 0 && (
              <MetricCard
                label="A Vencer (30d)"
                value={stats.teamAVencer}
                color="#f59e0b"
                icon="⏰"
                sub="Treinamentos expirando"
                onClick={canApprove ? () => navigate("/app/equipes") : undefined}
              />
            )}
          </div>

          {/* Compliance overview */}
          {stats.total > 0 && (stats.blocked + stats.restricted + stats.warning + stats.compliant > 0) && (
            <div style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 12,
              padding: "20px 22px",
              marginBottom: 28,
            }}>
              <SectionHeader title="Distribuição de Compliance" />
              <ComplianceBar
                blocked={stats.blocked}
                restricted={stats.restricted}
                warning={stats.warning}
                compliant={stats.compliant}
                total={stats.blocked + stats.restricted + stats.warning + stats.compliant}
              />
            </div>
          )}

          {/* Alertas operacionais */}
          {canSeeTeamDashboard && <AlertsSummaryCard />}

          {/* Integridade do inventário de acessórios */}
          {canSeeInventory && <InventoryHealthPanel />}

          {/* Dashboard de Competências da Equipe */}
          {canSeeTeamDashboard && <TeamCompetencyDashboard />}

          {/* Ações rápidas */}
          <div style={{ marginBottom: 28 }}>
            <SectionHeader title="Acesso Rápido" />
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 12,
            }}>
              {[
                canPlan    && { label: "Novo Plano",       icon: "➕", path: "/app/operacoes",         color: "#3b82f6" },
                canApprove && { label: "Ver Aprovações",   icon: "✅", path: "/app/central-aprovacao", color: "#22c55e" },
                             { label: "Calculadoras",      icon: "🧮", path: "/",                      color: "#38bdf8" },
                             { label: "Tabelas Técnicas",  icon: "📑", path: "/app/tabelas",           color: "#8b5cf6" },
              ].filter(Boolean).map(item => item && (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  style={{
                    background: "#1e293b",
                    border: `1px solid ${item.color}33`,
                    borderRadius: 10,
                    padding: "16px",
                    cursor: "pointer",
                    color: item.color,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    transition: "border-color 0.15s",
                    textAlign: "left",
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = item.color + "88"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = item.color + "33"}
                >
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Atividade recente */}
          {recent.length > 0 && (
            <div>
              <SectionHeader
                title="Atividade Recente"
                action="Ver todas"
                onAction={() => navigate("/app/central-aprovacao")}
              />
              {recent.map((sol, i) => (
                <ApprovalRow
                  key={sol.id ?? i}
                  sol={sol}
                  onView={() => navigate("/app/central-aprovacao")}
                />
              ))}
            </div>
          )}

          {/* Estado vazio */}
          {stats.total === 0 && (
            <div style={{
              textAlign: "center",
              padding: "60px 20px",
              border: "1px dashed #334155",
              borderRadius: 16,
              marginTop: 12,
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
              <h3 style={{ color: "#f1f5f9", margin: "0 0 8px" }}>Bem-vindo ao RiggingCheck</h3>
              <p style={{ color: "#64748b", margin: "0 0 20px", maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
                Nenhuma operação registrada ainda. Crie seu primeiro plano de içamento para começar.
              </p>
              {canPlan && (
                <button
                  onClick={() => navigate("/app/operacoes")}
                  style={{
                    background: "#3b82f6", border: "none",
                    color: "#fff", borderRadius: 10, padding: "12px 28px",
                    cursor: "pointer", fontWeight: 700, fontSize: 15,
                  }}
                >
                  Criar Primeiro Plano →
                </button>
              )}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}

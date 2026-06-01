import { useNavigate } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import App from "../App";

/**
 * Workspace de planejamento — /app/operacoes.
 * Preserva o fluxo legado (App.jsx) e oferece acesso ao novo Wizard.
 */
export default function PlanningWorkspace() {
  const navigate = useNavigate();

  return (
    <AppShell
      breadcrumb={[
        { label: "Operações" },
      ]}
    >
      {/* Banner de convite para o novo wizard */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a5f, #1e293b)",
        border: "1px solid #3b82f644",
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#93c5fd", marginBottom: 4 }}>
            Novo: Wizard Guiado de Içamento
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Planejamento passo a passo com progress, compliance e envio para aprovação integrados.
          </div>
        </div>
        <button
          onClick={() => navigate("/app/operacoes/novo")}
          style={{
            background: "#3b82f6",
            border: "none",
            color: "#fff",
            borderRadius: 8,
            padding: "10px 20px",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 13,
            boxShadow: "0 4px 14px rgba(59,130,246,0.25)",
            flexShrink: 0,
          }}
        >
          Usar Wizard →
        </button>
      </div>

      {/* Workspace legado preservado integralmente */}
      <App />
    </AppShell>
  );
}

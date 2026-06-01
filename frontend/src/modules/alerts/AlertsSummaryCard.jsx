/**
 * Card compacto de resumo de alertas para o Dashboard enterprise.
 * Visível apenas para roles gerenciais.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAlertsSummary } from "./alertsApi";

const SEV_CFG = {
  bloqueados: { color: "#ef4444", icon: "⛔", label: "Bloqueados"  },
  restritos:  { color: "#f97316", icon: "🚫", label: "Restritos"   },
  avisos:     { color: "#f59e0b", icon: "⚠",  label: "Avisos"      },
  infos:      { color: "#38bdf8", icon: "ℹ",  label: "Informativos" },
};

export default function AlertsSummaryCard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAlertsSummary();
      setSummary(data);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return null;
  if (!summary) return null;
  if (summary.totalAtivo === 0) return null;

  const hasUrgent = summary.bloqueados > 0 || summary.restritos > 0;
  const borderColor = summary.bloqueados > 0 ? "#ef4444"
    : summary.restritos > 0 ? "#f97316"
    : summary.avisos > 0 ? "#f59e0b" : "#38bdf8";

  return (
    <div style={{
      background: "#1e293b",
      border: `1px solid ${borderColor}44`,
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: 12,
      padding: "16px 20px",
      marginBottom: 20,
      cursor: "pointer",
    }}
      onClick={() => navigate("/app/alertas")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{hasUrgent ? "🔴" : "🟡"}</span>
          <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>
            Central de Alertas
          </span>
          <span style={{
            background: borderColor + "22", color: borderColor,
            borderRadius: 20, padding: "1px 10px", fontSize: 12, fontWeight: 700,
          }}>
            {summary.totalAtivo} ativo{summary.totalAtivo !== 1 ? "s" : ""}
          </span>
        </div>
        <span style={{ color: "#64748b", fontSize: 12 }}>Ver todos →</span>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {Object.entries(SEV_CFG).map(([key, cfg]) => {
          const val = summary[key];
          if (!val) return null;
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 14 }}>{cfg.icon}</span>
              <span style={{ color: cfg.color, fontWeight: 700, fontSize: 14 }}>{val}</span>
              <span style={{ color: "#64748b", fontSize: 12 }}>{cfg.label}</span>
            </div>
          );
        })}
      </div>

      {summary.totalNovo > 0 && (
        <div style={{ marginTop: 8, color: "#64748b", fontSize: 11 }}>
          {summary.totalNovo} alerta{summary.totalNovo !== 1 ? "s" : ""} novo{summary.totalNovo !== 1 ? "s" : ""} — clique para visualizar
        </div>
      )}
    </div>
  );
}

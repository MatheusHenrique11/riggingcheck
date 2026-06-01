import { useState, useEffect, useCallback } from "react";
import { authFetch } from "../utils/api";

const API = import.meta.env.VITE_API_URL ?? "https://riggingcheck-production.up.railway.app";

const STATUS_CONFIG = {
  COMPLIANT:  { label: "Conforme",    color: "#22c55e", bg: "#052e16", icon: "✓" },
  WARNING:    { label: "Atenção",     color: "#f59e0b", bg: "#2d1900", icon: "⚠" },
  RESTRICTED: { label: "Restrito",   color: "#f97316", bg: "#2c1400", icon: "⛔" },
  BLOCKED:    { label: "Bloqueado",  color: "#ef4444", bg: "#1c0a0a", icon: "🚫" },
};

const SEVERITY_ORDER = { BLOCKED: 3, RESTRICTED: 2, WARNING: 1, COMPLIANT: 0 };

function ViolationCard({ v }) {
  const cfg = STATUS_CONFIG[v.severity] ?? STATUS_CONFIG.WARNING;
  return (
    <div style={{
      border: `1px solid ${cfg.color}44`,
      borderRadius: 8,
      padding: "12px 16px",
      background: cfg.bg,
      marginBottom: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{
          background: cfg.color + "22",
          color: cfg.color,
          borderRadius: 4,
          padding: "2px 8px",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
        }}>
          {cfg.icon} {cfg.label}
        </span>
        <span style={{ color: "#94a3b8", fontSize: 11 }}>{v.ruleId}</span>
      </div>
      <p style={{ color: "#e2e8f0", margin: "0 0 6px", fontSize: 14 }}>{v.message}</p>
      {v.norm && (
        <p style={{ color: "#64748b", margin: "0 0 4px", fontSize: 12 }}>
          📋 Norma: {v.norm}
        </p>
      )}
      {v.recommendedAction && (
        <p style={{ color: "#94a3b8", margin: 0, fontSize: 12, fontStyle: "italic" }}>
          💡 {v.recommendedAction}
        </p>
      )}
    </div>
  );
}

export default function CompliancePanel({ planId, onStatusChange }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!planId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${API}/api/planos/${planId}/compliance`);
      if (!res.ok) throw new Error("Erro ao carregar compliance");
      const data = await res.json();
      setResult(data);
      onStatusChange?.(data.overallStatus);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [planId, onStatusChange]);

  useEffect(() => { load(); }, [load]);

  if (!planId) return null;

  const cfg = result ? (STATUS_CONFIG[result.overallStatus] ?? STATUS_CONFIG.WARNING) : null;

  const sorted = result?.violations
    ? [...result.violations].sort(
        (a, b) => (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0)
      )
    : [];

  return (
    <div style={{
      border: "1px solid #334155",
      borderRadius: 12,
      padding: 20,
      background: "#0f172a",
      marginTop: 16,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ color: "#f1f5f9", margin: 0, fontSize: 16, fontWeight: 700 }}>
          Resultado da Validação Técnica
        </h3>
        <button
          onClick={load}
          disabled={loading}
          style={{
            background: "transparent",
            border: "1px solid #334155",
            color: "#94a3b8",
            borderRadius: 6,
            padding: "4px 12px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 12,
          }}
        >
          {loading ? "Verificando..." : "↻ Atualizar"}
        </button>
      </div>

      {error && (
        <p style={{ color: "#ef4444", fontSize: 13 }}>Erro: {error}</p>
      )}

      {result && (
        <>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderRadius: 8,
            background: cfg.bg,
            border: `2px solid ${cfg.color}`,
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 24 }}>{cfg.icon}</span>
            <div>
              <div style={{ color: cfg.color, fontWeight: 700, fontSize: 16 }}>
                Status Técnico: {cfg.label}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
                {sorted.length === 0
                  ? "Nenhuma violação encontrada. Plano em conformidade."
                  : `${sorted.length} violação(ões) encontrada(s)`}
              </div>
            </div>
          </div>

          {result.blocked && (
            <div style={{
              background: "#1c0a0a",
              border: "1px solid #ef4444",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 14,
              color: "#fca5a5",
              fontSize: 13,
            }}>
              ⛔ <strong>Plano BLOQUEADO:</strong> Líder comum não pode aprovar.
              Apenas SUPERADMIN ou SAFETY_ADMIN pode liberar com justificativa obrigatória.
            </div>
          )}

          {sorted.map((v, i) => <ViolationCard key={i} v={v} />)}
        </>
      )}

      {loading && !result && (
        <p style={{ color: "#64748b", textAlign: "center", padding: 20 }}>
          Verificando conformidade técnica...
        </p>
      )}
    </div>
  );
}

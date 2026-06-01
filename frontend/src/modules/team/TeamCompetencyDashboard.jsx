/**
 * Dashboard de Competências da Equipe — Fase 18A.
 * Exibe KPIs, breakdown por função e itens críticos de NR-11/NR-35/ASO.
 * Visível apenas para roles gerenciais (ADMIN_EMPRESA, LIDER_EQUIPE, GERENTE_OPERACOES, SAFETY_ADMIN, SUPER_ADMIN).
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/api";

const API = import.meta.env.VITE_API_URL ?? "https://riggingcheck-production.up.railway.app";

const SEVERIDADE_CFG = {
  BLOCKED:    { color: "#ef4444", icon: "⛔" },
  RESTRICTED: { color: "#f59e0b", icon: "⚠"  },
};

const MOTIVO_CFG = {
  "ASO vencido":    { color: "#ef4444", icon: "🩺" },
  "ASO ausente":    { color: "#64748b", icon: "🩺" },
  "ASO a vencer":   { color: "#f59e0b", icon: "🩺" },
  "NR-11 vencida":  { color: "#ef4444", icon: "📋" },
  "NR-11 ausente":  { color: "#64748b", icon: "📋" },
  "NR-11 a vencer": { color: "#f59e0b", icon: "📋" },
  "NR-35 vencida":  { color: "#f97316", icon: "🦺" },
  "NR-35 a vencer": { color: "#f59e0b", icon: "🦺" },
};

function KpiChip({ label, value, color, icon }) {
  if (value == null) return null;
  return (
    <div style={{
      background: "#0f172a", border: `1px solid ${color}44`,
      borderRadius: 10, padding: "12px 16px",
      display: "flex", alignItems: "center", gap: 10, minWidth: 0,
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div>
        <div style={{ color, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{value}</div>
        <div style={{ color: "#64748b", fontSize: 11, marginTop: 2, whiteSpace: "nowrap" }}>{label}</div>
      </div>
    </div>
  );
}

function CriticoRow({ item }) {
  const motCfg = MOTIVO_CFG[item.motivo] ?? { color: "#64748b", icon: "⚠" };
  const sevCfg = SEVERIDADE_CFG[item.severidade] ?? { color: "#64748b" };
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 12px", borderRadius: 8, background: "#0f172a",
      marginBottom: 6, flexWrap: "wrap",
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{motCfg.icon}</span>
      <div style={{ flex: 1, minWidth: 120 }}>
        <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 13 }}>{item.nome}</span>
        <span style={{ color: "#64748b", fontSize: 11, marginLeft: 8 }}>{item.funcao}</span>
      </div>
      <span style={{ color: motCfg.color, fontSize: 12, fontWeight: 600 }}>{item.motivo}</span>
      {item.dataVencimento && (
        <span style={{ color: "#475569", fontSize: 11 }}>{item.dataVencimento}</span>
      )}
      <span style={{
        color: sevCfg.color, background: sevCfg.color + "22",
        borderRadius: 4, padding: "1px 7px", fontSize: 11, fontWeight: 700,
      }}>
        {item.severidade}
      </span>
    </div>
  );
}

function PorFuncaoRow({ item }) {
  const pct = item.total > 0 ? Math.round((item.aptos / item.total) * 100) : 0;
  const barColor = item.bloqueados > 0 ? "#ef4444" : item.aVencer > 0 ? "#f59e0b" : "#22c55e";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "8px 12px", borderRadius: 8, background: "#0f172a",
      marginBottom: 6, flexWrap: "wrap",
    }}>
      <div style={{ minWidth: 160, flex: 1 }}>
        <span style={{ color: "#38bdf8", fontWeight: 700, fontSize: 12, fontFamily: "monospace" }}>
          {item.funcao}
        </span>
        <div style={{ height: 4, background: "#1e293b", borderRadius: 99, marginTop: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: barColor, transition: "width 0.3s" }} />
        </div>
      </div>
      <span style={{ color: "#64748b", fontSize: 12 }}>{item.total} total</span>
      <span style={{ color: "#22c55e", fontSize: 12 }}>{item.aptos} aptos</span>
      {item.bloqueados > 0 && (
        <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 700 }}>{item.bloqueados} bloqueados</span>
      )}
      {item.aVencer > 0 && (
        <span style={{ color: "#f59e0b", fontSize: 12 }}>{item.aVencer} a vencer</span>
      )}
    </div>
  );
}

export default function TeamCompetencyDashboard() {
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await authFetch(`${API}/api/funcionarios/dashboard-competencias`);
      if (!r.ok) throw new Error("Sem permissão ou erro na API.");
      setData(await r.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div style={{ padding: "20px 0", color: "#64748b", fontSize: 13 }}>
      Carregando dashboard de competências...
    </div>
  );

  if (error) return null; // falha silenciosa — roles sem permissão ou API offline

  if (!data) return null;

  const criticos = showAll ? data.itensCriticos : data.itensCriticos.slice(0, 10);

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ color: "#f1f5f9", margin: 0, fontSize: 16, fontWeight: 700 }}>
          👥 Competências da Equipe
        </h2>
        <button
          onClick={() => navigate("/app/equipes")}
          style={{
            background: "transparent", border: "1px solid #334155",
            color: "#94a3b8", borderRadius: 8, padding: "5px 14px",
            cursor: "pointer", fontSize: 13,
          }}
        >
          Gerenciar equipe
        </button>
      </div>

      {/* KPIs */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
        gap: 10, marginBottom: 16,
      }}>
        <KpiChip label="Total"       value={data.totalFuncionarios} color="#3b82f6" icon="👤" />
        <KpiChip label="Aptos"       value={data.aptos}             color="#22c55e" icon="✅" />
        <KpiChip label="Bloqueados"  value={data.bloqueados}        color="#ef4444" icon="🚫" />
        <KpiChip label="A Vencer"    value={data.aVencer}           color="#f59e0b" icon="⏰" />
        <KpiChip label="ASO Vencido" value={data.asoVencido}        color="#ef4444" icon="🩺" />
        <KpiChip label="NR-11 Venc." value={data.nr11Vencida}       color="#f97316" icon="📋" />
        <KpiChip label="NR-35 Venc." value={data.nr35Vencida}       color="#f97316" icon="🦺" />
      </div>

      {/* Por Função */}
      {data.porFuncao?.length > 0 && (
        <div style={{
          background: "#1e293b", border: "1px solid #334155",
          borderRadius: 10, padding: "14px 16px", marginBottom: 12,
        }}>
          <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
            Distribuição por Função
          </div>
          {data.porFuncao.map(f => <PorFuncaoRow key={f.funcao} item={f} />)}
        </div>
      )}

      {/* Itens críticos */}
      {data.itensCriticos?.length > 0 && (
        <div style={{
          background: "#1e293b", border: "1px solid #334155",
          borderRadius: 10, padding: "14px 16px",
        }}>
          <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
            Itens Críticos ({data.itensCriticos.length})
          </div>
          {criticos.map((item, i) => <CriticoRow key={i} item={item} />)}
          {data.itensCriticos.length > 10 && (
            <button
              onClick={() => setShowAll(v => !v)}
              style={{
                background: "transparent", border: "1px solid #334155",
                color: "#64748b", borderRadius: 8, padding: "5px 12px",
                cursor: "pointer", fontSize: 12, marginTop: 6,
              }}
            >
              {showAll ? "Mostrar menos" : `Ver todos (${data.itensCriticos.length})`}
            </button>
          )}
        </div>
      )}

      {data.bloqueados === 0 && data.aVencer === 0 && (
        <div style={{
          background: "#0f172a", border: "1px dashed #22c55e44",
          borderRadius: 10, padding: "16px", textAlign: "center",
          color: "#22c55e", fontSize: 13,
        }}>
          ✅ Equipe em conformidade — todos os treinamentos e ASOs válidos.
        </div>
      )}
    </div>
  );
}

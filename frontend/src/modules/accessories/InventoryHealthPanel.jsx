import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../../utils/api";

const API = import.meta.env.VITE_API_URL ?? "https://riggingcheck-production.up.railway.app";

const TIPO_LABEL = {
  CINTA_TEXTIL: "Cinta Têxtil", CABO_ACO: "Cabo de Aço", CORRENTE: "Corrente",
  MANILHA: "Manilha", GANCHO: "Gancho", TALHA: "Talha", BALANCIM: "Balancim", OUTRO: "Outro",
};

const STATUS_CRITICO_CFG = {
  REPROVADO:          { color: "#ef4444", icon: "🚫" },
  DESCARTADO:         { color: "#64748b", icon: "🗑"  },
  VENCIDO:            { color: "#f97316", icon: "⏰"  },
  EM_INSPECAO:        { color: "#f59e0b", icon: "🔍"  },
  SEM_CERTIFICADO:    { color: "#64748b", icon: "📋"  },
  CERTIFICADO_VENCIDO:{ color: "#ef4444", icon: "⛔"  },
  CERTIFICADO_A_VENCER:{ color: "#f59e0b", icon: "⚠"  },
  INSPECAO_VENCIDA:   { color: "#f97316", icon: "📅"  },
};

function KpiChip({ label, value, color, icon }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{
      background: "#0f172a",
      border: `1px solid ${color}44`,
      borderRadius: 10,
      padding: "12px 16px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      minWidth: 0,
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
  const cfg = STATUS_CRITICO_CFG[item.status] ?? { color: "#64748b", icon: "⚠" };
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 12px",
      borderRadius: 8,
      background: "#0f172a",
      marginBottom: 6,
      flexWrap: "wrap",
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{cfg.icon}</span>
      <div style={{ flex: 1, minWidth: 120 }}>
        <span style={{ color: "#38bdf8", fontWeight: 700, fontFamily: "monospace", fontSize: 13 }}>
          {item.codigoInterno}
        </span>
        <span style={{ color: "#64748b", fontSize: 12, marginLeft: 8 }}>
          {TIPO_LABEL[item.tipo] ?? item.tipo}
        </span>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ color: cfg.color, fontSize: 12, fontWeight: 600 }}>{item.motivo}</div>
        {item.dataLimite && (
          <div style={{ color: "#475569", fontSize: 11 }}>{item.dataLimite}</div>
        )}
      </div>
    </div>
  );
}

export default function InventoryHealthPanel() {
  const navigate  = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let alive = true;
    authFetch(`${API}/api/acessorios/dashboard-integridade`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { if (alive) setData(d); })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (loading) return (
    <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, border: "1px solid #334155", marginBottom: 28 }}>
      <div style={{ color: "#475569", fontSize: 13 }}>Carregando integridade do inventário...</div>
    </div>
  );

  if (error || !data) return null;
  if (data.totalAcessorios === 0) return null;

  const temRiscoCritico = data.bloqueados > 0 || data.certificadosVencidos > 0 || data.inspecoesVencidas > 0;
  const temAlerta       = data.certificadosAVencer > 0 || data.semCertificado > 0;

  const borderColor = temRiscoCritico ? "#ef4444" : temAlerta ? "#f59e0b" : "#334155";

  return (
    <div style={{
      background: "#1e293b",
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      padding: "20px 22px",
      marginBottom: 28,
    }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ color: "#f1f5f9", margin: 0, fontSize: 16, fontWeight: 700 }}>
            🔗 Integridade do Inventário
          </h2>
          {temRiscoCritico && (
            <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4, fontWeight: 600 }}>
              ⛔ Existem acessórios com risco crítico
            </div>
          )}
        </div>
        <button
          onClick={() => navigate("/app/acessorios")}
          style={{
            background: "transparent", border: "1px solid #334155",
            color: "#94a3b8", borderRadius: 8, padding: "5px 14px",
            cursor: "pointer", fontSize: 13, flexShrink: 0,
          }}
        >
          Ver inventário →
        </button>
      </div>

      {/* KPIs */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
        gap: 10,
        marginBottom: 16,
      }}>
        <KpiChip label="Total"           value={data.totalAcessorios}    color="#38bdf8" icon="📦" />
        <KpiChip label="Ativos"          value={data.ativos}             color="#22c55e" icon="✅" />
        {data.bloqueados > 0 && (
          <KpiChip label="Bloqueados"    value={data.bloqueados}         color="#ef4444" icon="🚫" />
        )}
        {data.certificadosVencidos > 0 && (
          <KpiChip label="Cert. Vencidos" value={data.certificadosVencidos} color="#ef4444" icon="⛔" />
        )}
        {data.certificadosAVencer > 0 && (
          <KpiChip label="Cert. a Vencer" value={data.certificadosAVencer}  color="#f59e0b" icon="⚠" />
        )}
        {data.inspecoesVencidas > 0 && (
          <KpiChip label="Insp. Vencidas" value={data.inspecoesVencidas}    color="#f97316" icon="📅" />
        )}
        {data.semCertificado > 0 && (
          <KpiChip label="Sem Certificado" value={data.semCertificado}      color="#64748b" icon="📋" />
        )}
      </div>

      {/* Agrupamento por tipo */}
      {data.porTipo && data.porTipo.some(t => t.alertas > 0) && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
            Por Tipo
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {data.porTipo.filter(t => t.alertas > 0 || t.bloqueados > 0).map(t => (
              <div key={t.tipo} style={{
                background: "#0f172a", border: "1px solid #334155", borderRadius: 8,
                padding: "6px 12px", fontSize: 12,
              }}>
                <span style={{ color: "#94a3b8" }}>{TIPO_LABEL[t.tipo] ?? t.tipo}</span>
                {t.bloqueados > 0 && <span style={{ color: "#ef4444", fontWeight: 700, marginLeft: 8 }}>{t.bloqueados} bloq.</span>}
                {t.alertas > 0    && <span style={{ color: "#f59e0b", fontWeight: 600, marginLeft: 6 }}>{t.alertas} alertas</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Itens críticos */}
      {data.itensCriticos && data.itensCriticos.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
            Itens Críticos ({data.itensCriticos.length})
          </div>
          {data.itensCriticos.map(item => (
            <CriticoRow key={`${item.id}-${item.status}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

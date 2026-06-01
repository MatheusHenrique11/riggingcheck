/**
 * Painel de resumo lateral com dados já preenchidos e status técnico atual.
 * Exibido apenas em telas largas (desktop).
 */

const TS_CFG = {
  COMPLIANT:  { label: "Conforme",   color: "#22c55e" },
  WARNING:    { label: "Atenção",    color: "#f59e0b" },
  RESTRICTED: { label: "Restrito",  color: "#f97316" },
  BLOCKED:    { label: "Bloqueado", color: "#ef4444" },
};

function SummaryRow({ label, value, color }) {
  if (value == null || value === "" || value === undefined) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #1e293b", gap: 8 }}>
      <span style={{ color: "#64748b", fontSize: 11, flexShrink: 0 }}>{label}</span>
      <span style={{ color: color || "#e2e8f0", fontSize: 12, fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}

export default function WizardSummaryPanel({ planData, currentStep }) {
  const { cargaBruta, utilizacaoGuindaste, tensao, cg, n2869 } = planData;

  const ts = utilizacaoGuindaste?.risk === "DANGER" ? "BLOCKED"
    : utilizacaoGuindaste?.risk === "WARNING" ? "WARNING"
    : tensao?.bloqueado ? "BLOCKED"
    : tensao?.status === "REPROVADO" ? "BLOCKED"
    : tensao?.status === "ATENCAO" ? "WARNING"
    : cargaBruta ? "COMPLIANT" : null;

  const tsCfg = ts ? (TS_CFG[ts] ?? TS_CFG.COMPLIANT) : null;

  return (
    <aside style={{
      width: 200,
      flexShrink: 0,
      background: "#0f172a",
      border: "1px solid #1e293b",
      borderRadius: 10,
      padding: 14,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      alignSelf: "flex-start",
      position: "sticky",
      top: 80,
    }} className="wizard-summary">
      <div style={{ fontSize: 11, color: "#334155", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
        Resumo do Plano
      </div>

      {/* Status técnico estimado */}
      {tsCfg && (
        <div style={{ background: tsCfg.color + "22", border: `1px solid ${tsCfg.color}44`, borderRadius: 6, padding: "6px 10px", marginBottom: 4 }}>
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>Status Técnico</div>
          <div style={{ color: tsCfg.color, fontWeight: 700, fontSize: 13 }}>{tsCfg.label}</div>
        </div>
      )}

      {/* Dados resumidos */}
      {cargaBruta && (
        <>
          <SummaryRow label="Carga bruta" value={`${cargaBruta.total?.toLocaleString("pt-BR")} kg`} />
          <SummaryRow label="Içamento" value={cargaBruta.n2869 ? "Crítico ⚠" : "Normal"} color={cargaBruta.n2869 ? "#f59e0b" : "#22c55e"} />
        </>
      )}

      {utilizacaoGuindaste && (
        <SummaryRow
          label="Uso guindaste"
          value={`${utilizacaoGuindaste.pct?.toFixed(1)}%`}
          color={utilizacaoGuindaste.risk === "DANGER" ? "#ef4444" : utilizacaoGuindaste.risk === "WARNING" ? "#f59e0b" : "#22c55e"}
        />
      )}

      {tensao && !tensao.bloqueado && (
        <SummaryRow label="Tensão/perna" value={`${tensao.tensao?.toFixed(0)} kgf`} />
      )}
      {tensao?.bloqueado && (
        <div style={{ background: "#1c0a0a", border: "1px solid #ef444433", borderRadius: 6, padding: "5px 8px", fontSize: 11, color: "#ef4444" }}>
          ⛔ Ângulo bloqueado
        </div>
      )}

      {cg && (
        <SummaryRow
          label="Desequilíbrio CG"
          value={`${cg.desequil?.toFixed(1)}%`}
          color={cg.desequil > 30 ? "#f59e0b" : "#22c55e"}
        />
      )}

      {n2869 && (
        <SummaryRow
          label="Classif. N-2869"
          value={n2869.critico ? "Crítico" : "Normal"}
          color={n2869.critico ? "#f59e0b" : "#22c55e"}
        />
      )}

      {!cargaBruta && (
        <div style={{ color: "#334155", fontSize: 11, textAlign: "center", padding: "16px 0" }}>
          Preencha as etapas para ver o resumo aqui.
        </div>
      )}

      {/* Etapa atual */}
      <div style={{ marginTop: 8, borderTop: "1px solid #1e293b", paddingTop: 8 }}>
        <div style={{ fontSize: 10, color: "#334155", marginBottom: 3 }}>ETAPA ATUAL</div>
        <div style={{ fontSize: 12, color: "#38bdf8", fontWeight: 600 }}>{currentStep?.icon} {currentStep?.label}</div>
        <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{currentStep?.description}</div>
      </div>

      <style>{`
        .wizard-summary { display: flex !important; }
        @media (max-width: 1100px) {
          .wizard-summary { display: none !important; }
        }
      `}</style>
    </aside>
  );
}

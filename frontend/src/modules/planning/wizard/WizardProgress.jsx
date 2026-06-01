/**
 * Barra de progresso e navegação por etapas do wizard.
 * Desktop: etapas verticais na lateral. Mobile: barra horizontal compacta.
 */
export default function WizardProgress({ steps, currentIndex, stepStatus, onGoToStep }) {
  const pct = Math.round(((currentIndex) / (steps.length - 1)) * 100);

  const statusStyle = (status) => ({
    done:    { bg: "#052e16", border: "#22c55e",   color: "#22c55e",   icon: "✓" },
    active:  { bg: "#1e3a5f", border: "#3b82f6",   color: "#93c5fd",   icon: null },
    pending: { bg: "#0f172a", border: "#334155",   color: "#475569",   icon: null },
  }[status] || { bg: "#0f172a", border: "#334155", color: "#475569", icon: null });

  return (
    <>
      {/* Desktop — lista vertical */}
      <aside style={{
        width: 200,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }} className="wizard-sidebar">
        {/* Progresso geral */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginBottom: 6 }}>
            <span style={{ textTransform: "uppercase", letterSpacing: 1 }}>Progresso</span>
            <span style={{ color: "#38bdf8", fontWeight: 700 }}>{pct}%</span>
          </div>
          <div style={{ height: 4, background: "#1e293b", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#3b82f6,#22c55e)", borderRadius: 99, transition: "width 0.4s" }} />
          </div>
        </div>

        {steps.map((step, i) => {
          const status = stepStatus(step.id);
          const cfg = statusStyle(status);
          const isCurrent = i === currentIndex;
          return (
            <button
              key={step.id}
              onClick={() => onGoToStep(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                border: `1px solid ${isCurrent ? cfg.border : "transparent"}`,
                background: isCurrent ? cfg.bg : "transparent",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                transition: "all 0.15s",
              }}
            >
              <div style={{
                width: 28, height: 28,
                borderRadius: "50%",
                background: cfg.bg,
                border: `2px solid ${cfg.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: cfg.icon ? 13 : 14,
                flexShrink: 0,
                color: cfg.color,
                fontWeight: 700,
              }}>
                {cfg.icon ?? step.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: isCurrent ? 600 : 400, color: isCurrent ? "#f1f5f9" : cfg.color }}>
                  {step.label}
                </div>
                {isCurrent && (
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>{step.description}</div>
                )}
              </div>
            </button>
          );
        })}
      </aside>

      {/* Mobile — chips horizontais */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "0 0 8px", marginBottom: 12, WebkitOverflowScrolling: "touch" }} className="wizard-mobile-nav">
        {steps.map((step, i) => {
          const status = stepStatus(step.id);
          const cfg = statusStyle(status);
          const isCurrent = i === currentIndex;
          return (
            <button
              key={step.id}
              onClick={() => onGoToStep(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 10px",
                borderRadius: 20,
                border: `1px solid ${isCurrent ? cfg.border : "#334155"}`,
                background: isCurrent ? cfg.bg : "transparent",
                color: isCurrent ? cfg.color : "#475569",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: isCurrent ? 700 : 400,
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              <span>{cfg.icon ?? step.icon}</span>
              <span>{step.label}</span>
            </button>
          );
        })}
      </div>

      <style>{`
        .wizard-sidebar { display: flex !important; }
        .wizard-mobile-nav { display: none !important; }
        @media (max-width: 768px) {
          .wizard-sidebar { display: none !important; }
          .wizard-mobile-nav { display: flex !important; }
        }
      `}</style>
    </>
  );
}

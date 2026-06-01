/**
 * Etapa 4 — Lingada.
 * Reaproveita TabLingadaCarga (CG, tensão, N-2869, conversões).
 */

import TabLingadaCarga from "../../tabs/TabLingadaCarga";

export default function StepSling({ planData, onSave }) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: "#f1f5f9", margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>🪝 Lingada</h2>
        <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>
          Centro de gravidade, tensão por perna, WLL, ângulo e validações N-2869.
        </p>
      </div>
      <TabLingadaCarga planData={planData} onSave={onSave} />
    </div>
  );
}

/**
 * Etapas 2+3 — Carga e Guindaste.
 * Reaproveita TabGuindasteCarga sem alterar nenhuma lógica de cálculo.
 */

import TabGuindasteCarga from "../../tabs/TabGuindasteCarga";

export default function StepLoad({ planData, onSave }) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: "#f1f5f9", margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>⚖ Carga e Guindaste</h2>
        <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>
          Calcule carga bruta, peso por geometria, SWL e taxa de utilização do guindaste.
        </p>
      </div>
      <TabGuindasteCarga planData={planData} onSave={onSave} />
    </div>
  );
}

/**
 * Etapa 7 — Checklist Operacional.
 * Reaproveita TabChecklistCampo com foco apenas na parte de checklist.
 * A seção de OS/liberação fica na etapa StepSubmit.
 */

import { useState, useEffect } from "react";
import { CHECKLIST_CAMPO, CL_KEY } from "../../shared/planningConstants";

const S = {
  card:     { background: "#1e293b", borderRadius: 12, padding: 24, marginBottom: 16, border: "1px solid #334155" },
  title:    { fontSize: 12, color: "#38bdf8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 },
  catTitle: { fontSize: 11, color: "#f59e0b", letterSpacing: 2, textTransform: "uppercase", marginTop: 20, marginBottom: 8 },
  row:      (checked) => ({ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: "1px solid #1e293b", cursor: "pointer", opacity: checked ? 0.55 : 1 }),
  box:      (checked) => ({ width: 20, height: 20, minWidth: 20, borderRadius: 5, border: `2px solid ${checked ? "#22c55e" : "#334155"}`, background: checked ? "#22c55e" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 }),
  prog:     { height: 6, background: "#0f172a", borderRadius: 99, overflow: "hidden", marginTop: 6 },
  fill:     (pct, color) => ({ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 99, transition: "width 0.4s" }),
};

export default function StepChecklist({ planData, onSave }) {
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CL_KEY) || "{}"); } catch { return {}; }
  });
  const [resp, setResp] = useState(planData.supervisorNome || "");

  const total  = CHECKLIST_CAMPO.length;
  const done   = Object.values(checked).filter(Boolean).length;
  const pct    = Math.round((done / total) * 100);
  const allDone = done === total;
  const categorias = [...new Set(CHECKLIST_CAMPO.map(i => i.cat))];

  useEffect(() => {
    localStorage.setItem(CL_KEY, JSON.stringify(checked));
    onSave("checklistCompleto", allDone);
    onSave("checklistProgresso", pct);
  }, [checked, allDone, pct]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onSave("supervisorNome", resp);
  }, [resp]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id) => setChecked(p => ({ ...p, [id]: !p[id] }));

  const pctColor = pct === 100 ? "#22c55e" : pct >= 70 ? "#f59e0b" : "#ef4444";

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: "#f1f5f9", margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>✔ Checklist Operacional</h2>
        <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>
          Verificações de campo obrigatórias — NR-11 + Petrobras N-2869.
        </p>
      </div>

      {/* Progresso */}
      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
          <span>{done} de {total} itens verificados</span>
          <span style={{ color: pctColor, fontWeight: 700 }}>{pct}%</span>
        </div>
        <div style={S.prog}><div style={S.fill(pct, pctColor)} /></div>

        {!allDone && pct < 100 && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
            {pct < 70 ? "⚠ Checklist incompleto → será classificado como RESTRICTED pela Compliance Engine."
             : "Quase lá! Complete os itens restantes antes de avançar para a Compliance."}
          </div>
        )}
        {allDone && (
          <div style={{ marginTop: 10, fontSize: 13, color: "#22c55e", fontWeight: 600 }}>
            ✓ Todos os itens verificados.
          </div>
        )}
      </div>

      {/* Supervisor */}
      <div style={S.card}>
        <div style={S.title}>Supervisor Responsável</div>
        <input
          style={{ width: "100%", boxSizing: "border-box", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 15, padding: "10px 14px" }}
          placeholder="Nome do supervisor"
          value={resp}
          onChange={e => setResp(e.target.value)}
        />
      </div>

      {/* Itens por categoria */}
      <div style={S.card}>
        {categorias.map(cat => (
          <div key={cat}>
            <div style={S.catTitle}>▸ {cat}</div>
            {CHECKLIST_CAMPO.filter(i => i.cat === cat).map(item => (
              <div key={item.id} style={S.row(!!checked[item.id])} onClick={() => toggle(item.id)}>
                <div style={S.box(!!checked[item.id])}>
                  {checked[item.id] && <span style={{ color: "#0f172a", fontSize: 13, fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5 }}>{item.item}</span>
              </div>
            ))}
          </div>
        ))}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            style={{ background: "transparent", border: "1px solid #ef444433", color: "#ef4444", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 12 }}
            onClick={() => { setChecked({}); localStorage.removeItem(CL_KEY); }}
          >
            Limpar checklist
          </button>
        </div>
      </div>
    </div>
  );
}

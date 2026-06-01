/**
 * Componentes visuais compartilhados do módulo de planejamento.
 * Movido de App.jsx — preservado sem alterações.
 */

import { S, statusStyle } from "./planningStyles";

export function ResultBox({ status, label, valor, unidade, msg }) {
  const st = statusStyle(status);
  return (
    <div style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: 12, padding: 20, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "1px", textTransform: "uppercase" }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: st.color, marginTop: 4 }}>
            {valor} <span style={{ fontSize: 14, fontWeight: 400 }}>{unidade}</span>
          </div>
          {msg && <div style={{ fontSize: 12, color: st.color, marginTop: 4 }}>{msg}</div>}
        </div>
        <div style={{ background: st.color, color: "#000", fontWeight: 800, fontSize: 11, letterSpacing: "2px", padding: "6px 14px", borderRadius: 6 }}>
          {status}
        </div>
      </div>
    </div>
  );
}

export function Campo({ label, children }) {
  return (
    <div style={S.field}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}

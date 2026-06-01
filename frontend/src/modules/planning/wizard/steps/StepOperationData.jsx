/**
 * Etapa 1 — Dados da Operação.
 * Coleta OS, rigger, data e observações antes dos cálculos técnicos.
 */

import { useState, useEffect } from "react";
import { getUser } from "../../../../utils/api";

const S = {
  card: { background: "#1e293b", borderRadius: 12, padding: 24, marginBottom: 16, border: "1px solid #334155" },
  label: { display: "block", fontSize: 11, color: "#64748b", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 15, padding: "10px 14px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 16, marginBottom: 16 },
};

export default function StepOperationData({ planData, onSave }) {
  const user = getUser();
  const [os, setOs]             = useState(planData.operacaoOs || "");
  const [rigger, setRigger]     = useState(planData.riggerNome || user?.userName || "");
  const [local, setLocal]       = useState(planData.localOperacao || "");
  const [data, setData]         = useState(planData.dataOperacao || new Date().toISOString().slice(0, 10));
  const [obs, setObs]           = useState(planData.observacoes || "");

  useEffect(() => {
    onSave("operacaoOs",     os);
    onSave("riggerNome",     rigger);
    onSave("localOperacao",  local);
    onSave("dataOperacao",   data);
    onSave("observacoes",    obs);
  }, [os, rigger, local, data, obs]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: "#f1f5f9", margin: "0 0 4px", fontSize: 18, fontWeight: 700 }}>📋 Dados da Operação</h2>
        <p style={{ color: "#64748b", margin: 0, fontSize: 13 }}>
          Identifique a operação antes de começar os cálculos técnicos.
        </p>
      </div>

      <div style={S.card}>
        <div style={S.grid}>
          <div>
            <label style={S.label}>Número da OS *</label>
            <input style={S.input} placeholder="Ex: OS-2025-089" value={os}
              onChange={e => setOs(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Data da Operação</label>
            <input style={S.input} type="date" value={data}
              onChange={e => setData(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Rigger / Operador *</label>
            <input style={S.input} placeholder="Nome do responsável" value={rigger}
              onChange={e => setRigger(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Local da Operação</label>
            <input style={S.input} placeholder="Ex: Pátio B, Módulo 3" value={local}
              onChange={e => setLocal(e.target.value)} />
          </div>
        </div>
        <div>
          <label style={S.label}>Observações / Descrição</label>
          <textarea
            style={{ ...S.input, minHeight: 80, resize: "vertical" }}
            placeholder="Descreva a operação brevemente..."
            value={obs}
            onChange={e => setObs(e.target.value)}
          />
        </div>
      </div>

      {user && (
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#64748b" }}>
          Empresa: <strong style={{ color: "#94a3b8" }}>{user.empresaName || "—"}</strong>
          {" · "}Perfil: <strong style={{ color: "#94a3b8" }}>{user.role}</strong>
        </div>
      )}

      {!os.trim() && (
        <div style={{ background: "#2d1900", border: "1px solid #f59e0b44", borderRadius: 8, padding: "10px 14px", marginTop: 12, fontSize: 12, color: "#f59e0b" }}>
          ⚠ Preencha o número da OS antes de avançar.
        </div>
      )}
    </div>
  );
}

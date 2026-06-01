import { useState } from "react";
import { registrarInspecao } from "./accessoriesApi";

const RESULTADO_CFG = {
  APROVADO:                { label: "Aprovado",              color: "#22c55e", icon: "✓" },
  APROVADO_COM_RESTRICAO:  { label: "Aprovado c/ Restrição", color: "#f59e0b", icon: "⚠" },
  REPROVADO:               { label: "Reprovado",             color: "#ef4444", icon: "✗" },
};

const S = {
  card:  { background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 12, border: "1px solid #334155" },
  label: { display: "block", fontSize: 11, color: "#64748b", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, padding: "9px 12px" },
  grid:  { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 12, marginBottom: 12 },
};

function InspRow({ insp }) {
  const cfg = RESULTADO_CFG[insp.resultado] ?? { label: insp.resultado, color: "#64748b", icon: "?" };
  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 700, color: "#f1f5f9" }}>{insp.dataInspecao}</div>
        <span style={{ background: cfg.color + "22", color: cfg.color, border: `1px solid ${cfg.color}44`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
          {cfg.icon} {cfg.label}
        </span>
      </div>
      <div style={{ fontSize: 12, color: "#94a3b8" }}>Inspetor: <strong>{insp.inspetorNome || "—"}</strong></div>
      {insp.observacoes && <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontStyle: "italic" }}>"{insp.observacoes}"</div>}
      {insp.proximaInspecao && (
        <div style={{ marginTop: 6, fontSize: 12, color: "#38bdf8" }}>Próxima inspeção: {insp.proximaInspecao}</div>
      )}
    </div>
  );
}

export default function InspectionPanel({ acessorioId, inspecoes, onAdded }) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [form, setForm]         = useState({ dataInspecao: "", resultado: "APROVADO", observacoes: "", proximaInspecao: "" });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      await registrarInspecao(acessorioId, {
        ...form,
        proximaInspecao: form.proximaInspecao || null,
      });
      setShowForm(false);
      setForm({ dataInspecao: "", resultado: "APROVADO", observacoes: "", proximaInspecao: "" });
      onAdded?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#38bdf8" }}>Inspeções ({inspecoes.length})</div>
        <button onClick={() => setShowForm(v => !v)} style={{ background: "transparent", border: "1px solid #3b82f644", color: "#38bdf8", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12 }}>
          {showForm ? "Cancelar" : "+ Registrar"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <form onSubmit={handleSave}>
            <div style={S.grid}>
              <div>
                <label style={S.label}>Data da Inspeção *</label>
                <input style={S.input} type="date" value={form.dataInspecao} onChange={e => set("dataInspecao", e.target.value)} required />
              </div>
              <div>
                <label style={S.label}>Resultado *</label>
                <select style={S.input} value={form.resultado} onChange={e => set("resultado", e.target.value)}>
                  <option value="APROVADO">Aprovado</option>
                  <option value="APROVADO_COM_RESTRICAO">Aprovado com Restrição</option>
                  <option value="REPROVADO">Reprovado</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Próxima Inspeção</label>
                <input style={S.input} type="date" value={form.proximaInspecao} onChange={e => set("proximaInspecao", e.target.value)} />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={S.label}>Observações</label>
                <textarea style={{ ...S.input, minHeight: 60, resize: "vertical" }} value={form.observacoes} onChange={e => set("observacoes", e.target.value)} placeholder="Detalhes da inspeção..." />
              </div>
            </div>
            {error && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 10 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ background: "#3b82f6", border: "none", color: "#fff", borderRadius: 8, padding: "9px 22px", cursor: "pointer", fontWeight: 700, fontSize: 13, opacity: loading ? 0.6 : 1 }}>
              {loading ? "Salvando..." : "Registrar Inspeção"}
            </button>
          </form>
        </div>
      )}

      {inspecoes.length === 0 && !showForm && (
        <div style={{ textAlign: "center", padding: 32, color: "#475569", fontSize: 13 }}>Nenhuma inspeção registrada.</div>
      )}

      {inspecoes.map(i => <InspRow key={i.id} insp={i} />)}
    </div>
  );
}

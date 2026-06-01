import { useState } from "react";

const TIPOS = [
  { value: "CINTA_TEXTIL", label: "Cinta Têxtil" },
  { value: "CABO_ACO",     label: "Cabo de Aço" },
  { value: "CORRENTE",     label: "Corrente" },
  { value: "MANILHA",      label: "Manilha" },
  { value: "GANCHO",       label: "Gancho" },
  { value: "TALHA",        label: "Talha" },
  { value: "BALANCIM",     label: "Balancim" },
  { value: "OUTRO",        label: "Outro" },
];

const S = {
  card:   { background: "#1e293b", borderRadius: 12, padding: 24, marginBottom: 16, border: "1px solid #334155" },
  label:  { display: "block", fontSize: 11, color: "#64748b", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  input:  { width: "100%", boxSizing: "border-box", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, padding: "10px 14px" },
  grid:   { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 16, marginBottom: 16 },
  btnRow: { display: "flex", gap: 12, marginTop: 24 },
  btnOk:  { background: "#3b82f6", border: "none", color: "#fff", borderRadius: 8, padding: "11px 28px", cursor: "pointer", fontWeight: 700, fontSize: 14 },
  btnCnl: { background: "transparent", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "11px 20px", cursor: "pointer", fontSize: 14 },
};

export default function AccessoryForm({ initial, onSave, onCancel, loading, error }) {
  const [form, setForm] = useState({
    codigoInterno:    initial?.codigoInterno   ?? "",
    tipo:             initial?.tipo            ?? "CINTA_TEXTIL",
    descricao:        initial?.descricao       ?? "",
    fabricante:       initial?.fabricante      ?? "",
    modelo:           initial?.modelo          ?? "",
    numeroSerie:      initial?.numeroSerie     ?? "",
    capacidadeWllKg:  initial?.capacidadeWllKg ?? "",
    unidade:          initial?.unidade         ?? "kg",
    dataFabricacao:   initial?.dataFabricacao  ?? "",
    localizacao:      initial?.localizacao     ?? "",
    observacoes:      initial?.observacoes     ?? "",
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const isEdit = !!initial?.id;

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      capacidadeWllKg: form.capacidadeWllKg !== "" ? parseFloat(form.capacidadeWllKg) : null,
      dataFabricacao:  form.dataFabricacao  || null,
    };
    onSave(payload);
  };

  return (
    <div>
      <h2 style={{ color: "#f1f5f9", margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>
        {isEdit ? "Editar Acessório" : "Novo Acessório"}
      </h2>

      <form onSubmit={handleSubmit}>
        <div style={S.card}>
          <div style={{ fontSize: 12, color: "#38bdf8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 }}>
            Identificação
          </div>
          <div style={S.grid}>
            <div>
              <label style={S.label}>Código Interno *</label>
              <input style={S.input} value={form.codigoInterno} onChange={e => set("codigoInterno", e.target.value)} placeholder="Ex: CINTA-001" required />
            </div>
            <div>
              <label style={S.label}>Tipo *</label>
              <select style={S.input} value={form.tipo} onChange={e => set("tipo", e.target.value)} required>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={S.label}>Descrição *</label>
              <input style={S.input} value={form.descricao} onChange={e => set("descricao", e.target.value)} placeholder="Ex: Cinta têxtil vermelha 2 toneladas" required />
            </div>
          </div>
        </div>

        <div style={S.card}>
          <div style={{ fontSize: 12, color: "#38bdf8", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 }}>
            Dados Técnicos
          </div>
          <div style={S.grid}>
            <div>
              <label style={S.label}>Fabricante</label>
              <input style={S.input} value={form.fabricante} onChange={e => set("fabricante", e.target.value)} placeholder="Ex: Liftex" />
            </div>
            <div>
              <label style={S.label}>Modelo</label>
              <input style={S.input} value={form.modelo} onChange={e => set("modelo", e.target.value)} placeholder="Ex: CT-2000" />
            </div>
            <div>
              <label style={S.label}>Número de Série</label>
              <input style={S.input} value={form.numeroSerie} onChange={e => set("numeroSerie", e.target.value)} placeholder="Ex: SN-12345" />
            </div>
            <div>
              <label style={S.label}>Capacidade WLL (kg) *</label>
              <input style={S.input} type="number" min="0" step="0.01" value={form.capacidadeWllKg} onChange={e => set("capacidadeWllKg", e.target.value)} placeholder="Ex: 2000" required />
            </div>
            <div>
              <label style={S.label}>Data de Fabricação</label>
              <input style={S.input} type="date" value={form.dataFabricacao} onChange={e => set("dataFabricacao", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Localização</label>
              <input style={S.input} value={form.localizacao} onChange={e => set("localizacao", e.target.value)} placeholder="Ex: Almoxarifado A" />
            </div>
          </div>
          <div>
            <label style={S.label}>Observações</label>
            <textarea style={{ ...S.input, minHeight: 70, resize: "vertical" }} value={form.observacoes} onChange={e => set("observacoes", e.target.value)} placeholder="Informações adicionais..." />
          </div>
        </div>

        {error && (
          <div style={{ background: "#1c0a0a", border: "1px solid #ef444444", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#fca5a5", fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={S.btnRow}>
          <button type="submit" style={{ ...S.btnOk, opacity: loading ? 0.6 : 1 }} disabled={loading}>
            {loading ? "Salvando..." : isEdit ? "Salvar Alterações" : "Cadastrar Acessório"}
          </button>
          <button type="button" style={S.btnCnl} onClick={onCancel}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}

import { useState } from "react";
import { adicionarCertificado } from "./accessoriesApi";

const STATUS_CFG = {
  VALIDO:   { label: "Válido",     color: "#22c55e" },
  A_VENCER: { label: "A Vencer",   color: "#f59e0b" },
  VENCIDO:  { label: "Vencido",    color: "#ef4444" },
  AUSENTE:  { label: "Ausente",    color: "#64748b" },
};

const S = {
  card:   { background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 14, border: "1px solid #334155" },
  label:  { display: "block", fontSize: 11, color: "#64748b", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  input:  { width: "100%", boxSizing: "border-box", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, padding: "9px 12px" },
  grid:   { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 12, marginBottom: 12 },
  badge:  (color) => ({ display: "inline-block", background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }),
};

function CertRow({ cert }) {
  const cfg = STATUS_CFG[cert.status] ?? STATUS_CFG.AUSENTE;
  return (
    <div style={S.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 14 }}>{cert.numeroCertificado}</div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{cert.emissor || "Emissor não informado"}</div>
        </div>
        <span style={S.badge(cfg.color)}>{cfg.label}</span>
      </div>
      <div style={{ display: "flex", gap: 20, fontSize: 12, color: "#94a3b8" }}>
        <span>Emissão: <strong>{cert.dataEmissao || "—"}</strong></span>
        <span>Validade: <strong style={{ color: cfg.color }}>{cert.dataValidade || "—"}</strong></span>
      </div>
      {cert.arquivoUrl && (
        <a href={cert.arquivoUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8, fontSize: 12, color: "#38bdf8" }}>
          📄 Ver documento
        </a>
      )}
    </div>
  );
}

export default function CertificatePanel({ acessorioId, certificados, onAdded }) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [form, setForm]         = useState({ numeroCertificado: "", emissor: "", dataEmissao: "", dataValidade: "", arquivoUrl: "", observacoes: "" });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      await adicionarCertificado(acessorioId, form);
      setShowForm(false);
      setForm({ numeroCertificado: "", emissor: "", dataEmissao: "", dataValidade: "", arquivoUrl: "", observacoes: "" });
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
        <div style={{ fontSize: 14, fontWeight: 700, color: "#38bdf8" }}>Certificados ({certificados.length})</div>
        <button onClick={() => setShowForm(v => !v)} style={{ background: "transparent", border: "1px solid #3b82f644", color: "#38bdf8", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12 }}>
          {showForm ? "Cancelar" : "+ Adicionar"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <form onSubmit={handleSave}>
            <div style={S.grid}>
              <div>
                <label style={S.label}>Número do Certificado *</label>
                <input style={S.input} value={form.numeroCertificado} onChange={e => set("numeroCertificado", e.target.value)} placeholder="CERT-2026-001" required />
              </div>
              <div>
                <label style={S.label}>Emissor</label>
                <input style={S.input} value={form.emissor} onChange={e => set("emissor", e.target.value)} placeholder="Ex: INMETRO" />
              </div>
              <div>
                <label style={S.label}>Data Emissão *</label>
                <input style={S.input} type="date" value={form.dataEmissao} onChange={e => set("dataEmissao", e.target.value)} required />
              </div>
              <div>
                <label style={S.label}>Data Validade *</label>
                <input style={S.input} type="date" value={form.dataValidade} onChange={e => set("dataValidade", e.target.value)} required />
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={S.label}>URL do Arquivo</label>
                <input style={S.input} value={form.arquivoUrl} onChange={e => set("arquivoUrl", e.target.value)} placeholder="https://docs.empresa.com/cert.pdf" />
              </div>
            </div>
            {error && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 10 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ background: "#3b82f6", border: "none", color: "#fff", borderRadius: 8, padding: "9px 22px", cursor: "pointer", fontWeight: 700, fontSize: 13, opacity: loading ? 0.6 : 1 }}>
              {loading ? "Salvando..." : "Salvar Certificado"}
            </button>
          </form>
        </div>
      )}

      {certificados.length === 0 && !showForm && (
        <div style={{ textAlign: "center", padding: 32, color: "#475569", fontSize: 13 }}>
          Nenhum certificado vinculado.
        </div>
      )}

      {certificados.map(c => <CertRow key={c.id} cert={c} />)}
    </div>
  );
}

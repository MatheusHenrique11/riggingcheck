const STATUS_CFG = {
  ATIVO:        { label: "Ativo",        color: "#22c55e" },
  EM_INSPECAO:  { label: "Em Inspeção",  color: "#f59e0b" },
  REPROVADO:    { label: "Reprovado",    color: "#ef4444" },
  DESCARTADO:   { label: "Descartado",   color: "#64748b" },
  VENCIDO:      { label: "Vencido",      color: "#f97316" },
};

const TIPO_LABEL = {
  CINTA_TEXTIL: "Cinta Têxtil",
  CABO_ACO:     "Cabo de Aço",
  CORRENTE:     "Corrente",
  MANILHA:      "Manilha",
  GANCHO:       "Gancho",
  TALHA:        "Talha",
  BALANCIM:     "Balancim",
  OUTRO:        "Outro",
};

export default function AccessoriesList({ acessorios, onSelect, onNovo }) {
  const S = {
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    table:  { width: "100%", borderCollapse: "collapse", fontSize: 13 },
    th:     { padding: "10px 14px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", borderBottom: "1px solid #1e293b" },
    td:     { padding: "12px 14px", borderBottom: "1px solid #1e293b", color: "#e2e8f0" },
    row:    { cursor: "pointer", transition: "background 0.1s" },
    badge:  (color) => ({ display: "inline-block", background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }),
    btn:    { background: "#3b82f6", border: "none", color: "#fff", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontWeight: 700, fontSize: 13 },
    empty:  { textAlign: "center", padding: "48px 16px", color: "#475569" },
  };

  return (
    <div>
      <div style={S.header}>
        <div>
          <h2 style={{ color: "#f1f5f9", margin: 0, fontSize: 18, fontWeight: 700 }}>Inventário de Acessórios</h2>
          <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: 13 }}>
            {acessorios.length} acessório{acessorios.length !== 1 ? "s" : ""} cadastrado{acessorios.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button style={S.btn} onClick={onNovo}>+ Novo Acessório</button>
      </div>

      {acessorios.length === 0 ? (
        <div style={{ ...S.empty, background: "#1e293b", borderRadius: 12, border: "1px solid #334155" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>Nenhum acessório cadastrado</div>
          <div style={{ fontSize: 13 }}>Clique em "Novo Acessório" para começar o inventário.</div>
        </div>
      ) : (
        <div style={{ background: "#1e293b", borderRadius: 12, border: "1px solid #334155", overflow: "hidden" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Código</th>
                <th style={S.th}>Tipo</th>
                <th style={S.th}>Descrição</th>
                <th style={S.th}>WLL (kg)</th>
                <th style={S.th}>Localização</th>
                <th style={S.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {acessorios.map(a => {
                const cfg = STATUS_CFG[a.status] ?? { label: a.status, color: "#64748b" };
                return (
                  <tr
                    key={a.id}
                    style={S.row}
                    onClick={() => onSelect(a)}
                    onMouseEnter={e => (e.currentTarget.style.background = "#0f172a")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ ...S.td, fontFamily: "monospace", color: "#38bdf8", fontWeight: 700 }}>{a.codigoInterno}</td>
                    <td style={S.td}>{TIPO_LABEL[a.tipo] ?? a.tipo}</td>
                    <td style={{ ...S.td, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.descricao}</td>
                    <td style={{ ...S.td, fontWeight: 600 }}>{a.capacidadeWllKg != null ? a.capacidadeWllKg.toLocaleString("pt-BR") : "—"}</td>
                    <td style={{ ...S.td, color: "#94a3b8" }}>{a.localizacao || "—"}</td>
                    <td style={S.td}><span style={S.badge(cfg.color)}>{cfg.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

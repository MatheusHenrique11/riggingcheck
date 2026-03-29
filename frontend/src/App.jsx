import { useState } from "react";

const API = "https://riggingcheck-production.up.railway.app";

// ── CHECKLIST DATA (NR-11 / ABNT NBR 11900) ────────────────────────────────────
const CHECKLIST = [
  {
    category: "Guindaste & Equipamento",
    items: [
      "Verificar capacidade de carga para o raio de operação atual",
      "Confirmar horizontalidade do guindaste (prumo)",
      "Inspecionar apoios (outriggers) — solo firme e nivelado",
      "Verificar funcionamento dos limitadores de carga e fim-de-curso",
      "Inspecionar cabos de aço quanto a corrosão, kinks e arames partidos",
    ],
  },
  {
    category: "Acessórios de Içamento",
    items: [
      "Inspecionar eslingas — cortes, desgaste, costuras comprometidas",
      "Verificar ganchos e linguetas de segurança (sem deformação)",
      "Checar grilhões: pino travado com arame de segurança",
      "Confirmar que WLL dos acessórios supera a carga",
      "Verificar ângulo das eslingas (máx. recomendado: 60° da horizontal)",
    ],
  },
  {
    category: "Carga & Amarração",
    items: [
      "Identificar o CG (centro de gravidade) da carga",
      "Confirmar ponto de amarração adequado e resistente",
      "Verificar estabilidade e fixação de partes soltas na carga",
      "Realizar teste de folga (levantar 30 cm antes da manobra final)",
    ],
  },
  {
    category: "Área & Pessoal",
    items: [
      "Sinalizar e isolar área de risco com cone/fita/barreira",
      "Confirmar ausência de pessoal sob a carga suspensa",
      "Verificar condições climáticas (vento < 30 km/h, boa visibilidade)",
      "Confirmar comunicação operador ↔ Rigger (rádio ou sinal de mão)",
      "Confirmar presença do Rigger responsável certificado (NR-11)",
    ],
  },
];

const S = {
  app: {
    minHeight: "100vh",
    background: "#0a0a0f",
    color: "#e2e8f0",
    fontFamily: "'JetBrains Mono', 'Fira Mono', monospace",
    paddingBottom: 60,
  },
  header: {
    background: "linear-gradient(135deg, #0f0f1a 0%, #1a1020 100%)",
    borderBottom: "1px solid #2d2d4a",
    padding: "32px 40px 24px",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  logo: { display: "flex", alignItems: "center", gap: 14, marginBottom: 20 },
  logoIcon: {
    width: 42, height: 42,
    background: "linear-gradient(135deg, #f59e0b, #ef4444)",
    borderRadius: 8, display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: 22,
    boxShadow: "0 0 20px rgba(245,158,11,0.3)",
  },
  logoText: {
    fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px",
    background: "linear-gradient(90deg, #f59e0b, #fb923c)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  logoSub: { fontSize: 11, color: "#64748b", letterSpacing: "2px", textTransform: "uppercase" },
  apiBadge: {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "rgba(34,197,94,0.1)", border: "1px solid #22c55e44",
    borderRadius: 6, padding: "4px 10px", fontSize: 11,
    color: "#22c55e", letterSpacing: "1px", marginTop: 8,
  },
  tabs: { display: "flex", gap: 4 },
  tab: (active) => ({
    padding: "8px 20px", borderRadius: 6, border: "1px solid",
    borderColor: active ? "#f59e0b" : "#2d2d4a",
    background: active ? "rgba(245,158,11,0.12)" : "transparent",
    color: active ? "#f59e0b" : "#64748b",
    fontSize: 12, letterSpacing: "1px", textTransform: "uppercase",
    cursor: "pointer", fontFamily: "inherit", fontWeight: active ? 700 : 400,
    transition: "all 0.2s",
  }),
  container: { maxWidth: 860, margin: "0 auto", padding: "40px 24px" },
  card: {
    background: "#0f0f1a", border: "1px solid #1e1e35",
    borderRadius: 12, padding: 28, marginBottom: 20,
  },
  cardTitle: {
    fontSize: 12, letterSpacing: "2px", textTransform: "uppercase",
    color: "#f59e0b", marginBottom: 20, display: "flex", alignItems: "center", gap: 8,
  },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }),
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 11, color: "#64748b", letterSpacing: "1px", textTransform: "uppercase" },
  input: {
    background: "#070710", border: "1px solid #2d2d4a", borderRadius: 8,
    color: "#e2e8f0", fontSize: 16, padding: "10px 14px",
    fontFamily: "inherit", outline: "none",
  },
  select: {
    background: "#070710", border: "1px solid #2d2d4a", borderRadius: 8,
    color: "#e2e8f0", fontSize: 15, padding: "10px 14px", fontFamily: "inherit", outline: "none",
  },
  btn: (loading) => ({
    background: loading ? "#1e1e35" : "linear-gradient(135deg, #f59e0b, #ef4444)",
    border: "none", borderRadius: 8,
    color: loading ? "#64748b" : "#000",
    fontFamily: "inherit", fontWeight: 700, fontSize: 13,
    letterSpacing: "1px", padding: "12px 28px",
    cursor: loading ? "not-allowed" : "pointer", textTransform: "uppercase",
    transition: "all 0.2s",
  }),
  result: (color, bg) => ({
    background: bg, border: `1px solid ${color}33`,
    borderRadius: 12, padding: 24,
    display: "flex", alignItems: "center", gap: 24, marginTop: 20,
  }),
  bigNum: (color) => ({ fontSize: 40, fontWeight: 700, color, lineHeight: 1 }),
  smallLabel: { fontSize: 11, color: "#94a3b8", marginTop: 4 },
  riskBadge: (color) => ({
    background: color, color: "#000", fontWeight: 800,
    fontSize: 12, letterSpacing: "2px", padding: "6px 14px",
    borderRadius: 6, whiteSpace: "nowrap",
  }),
  progressBar: {
    height: 6, background: "#1e1e35", borderRadius: 99, overflow: "hidden", marginTop: 6,
  },
  progressFill: (pct, color) => ({
    height: "100%", width: `${Math.min(pct, 100)}%`,
    background: color, borderRadius: 99, transition: "width 0.6s",
  }),
  divider: { border: "none", borderTop: "1px solid #1e1e35", margin: "20px 0" },
  errorBox: {
    background: "#2d0000", border: "1px solid #ef444444",
    borderRadius: 8, padding: "12px 16px", fontSize: 12,
    color: "#ef4444", marginTop: 12,
  },
  normaBox: {
    background: "#070710", border: "1px solid #1e1e35",
    borderRadius: 8, padding: "12px 16px", fontSize: 12,
    color: "#64748b", marginTop: 16, lineHeight: 1.7,
  },
  warnBox: {
    background: "#2d1900", border: "1px solid #f59e0b44",
    borderRadius: 8, padding: "12px 16px", fontSize: 12,
    color: "#f59e0b", marginTop: 12, lineHeight: 1.7,
  },
  checkRow: (checked) => ({
    display: "flex", alignItems: "flex-start", gap: 12,
    padding: "12px 0", borderBottom: "1px solid #1e1e35",
    cursor: "pointer", opacity: checked ? 0.55 : 1, transition: "opacity 0.2s",
  }),
  checkbox: (checked) => ({
    width: 20, height: 20, minWidth: 20, borderRadius: 5,
    border: `2px solid ${checked ? "#22c55e" : "#2d2d4a"}`,
    background: checked ? "#22c55e" : "transparent",
    display: "flex", alignItems: "center", justifyContent: "center",
    marginTop: 1, transition: "all 0.2s",
  }),
  catTitle: {
    fontSize: 11, color: "#f59e0b", letterSpacing: "2px",
    textTransform: "uppercase", marginTop: 28, marginBottom: 8,
    display: "flex", alignItems: "center", gap: 8,
  },
};

const riskColor = (level) => {
  if (level === "SAFE") return { color: "#22c55e", bg: "#052e16" };
  if (level === "WARNING") return { color: "#f59e0b", bg: "#2d1900" };
  return { color: "#ef4444", bg: "#2d0000" };
};

// ── MODULE 1: CAPACITY ──────────────────────────────────────────────────────────
function CapacityModule() {
  const [form, setForm] = useState({ craneCapacity: "", loadWeight: "", riggingWeight: "50" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const calculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/capacity/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          craneCapacity: parseFloat(form.craneCapacity),
          loadWeight: parseFloat(form.loadWeight),
          riggingWeight: parseFloat(form.riggingWeight) || 0,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setError("❌ Não foi possível conectar à API. Verifique se o backend está rodando na porta 8080.");
    }
    setLoading(false);
  };

  const risk = result ? riskColor(result.riskLevel) : null;

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>⚖️ &nbsp;Verificação de Capacidade</div>
      <div style={S.grid(2)}>
        {[
          { key: "craneCapacity", label: "Capacidade do Guindaste (kg)", placeholder: "ex: 10000" },
          { key: "loadWeight", label: "Peso da Carga (kg)", placeholder: "ex: 6500" },
          { key: "riggingWeight", label: "Peso do Aparelho (kg)", placeholder: "ex: 50" },
        ].map(f => (
          <div key={f.key} style={S.field}>
            <label style={S.label}>{f.label}</label>
            <input style={S.input} type="number" placeholder={f.placeholder}
              value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
          </div>
        ))}
      </div>
      <div style={S.normaBox}>
        📋 <strong style={{ color: "#94a3b8" }}>ABNT NBR 11900 / NR-11:</strong> A carga total
        não deve ultrapassar a curva de carga do guindaste para o raio de operação.
        Margem mínima recomendada: 10%.
      </div>
      <div style={{ marginTop: 20 }}>
        <button style={S.btn(loading)} onClick={calculate} disabled={loading}>
          {loading ? "Consultando API..." : "Verificar via API"}
        </button>
      </div>
      {error && <div style={S.errorBox}>{error}</div>}
      {result && risk && (
        <div style={S.result(risk.color, risk.bg)}>
          <div>
            <div style={S.bigNum(risk.color)}>{result.usagePercent?.toFixed(1)}%</div>
            <div style={S.smallLabel}>da capacidade utilizada</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={S.progressBar}>
              <div style={S.progressFill(result.usagePercent, risk.color)} />
            </div>
            <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.8 }}>
              <div>Carga total: <strong style={{ color: "#e2e8f0" }}>{result.totalLoad?.toFixed(0)} kg</strong></div>
              <div>Margem disponível: <strong style={{ color: "#e2e8f0" }}>{result.availableMargin?.toFixed(0)} kg</strong></div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>✅ Resposta da API Java Spring Boot</div>
            </div>
          </div>
          <div style={S.riskBadge(risk.color)}>{result.riskLevel}</div>
        </div>
      )}
      {result && !result.approved && (
        <div style={S.warnBox}>⚠️ <strong>OPERAÇÃO NÃO PERMITIDA.</strong> Reduza a carga ou reposicione o guindaste.</div>
      )}
    </div>
  );
}

// ── MODULE 2: SLING ─────────────────────────────────────────────────────────────
function SlingModule() {
  const [form, setForm] = useState({ loadWeight: "", numberOfLegs: "2", angleFromHorizontal: "45", wll: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const calculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/sling/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loadWeight: parseFloat(form.loadWeight),
          numberOfLegs: parseInt(form.numberOfLegs),
          angleFromHorizontal: parseFloat(form.angleFromHorizontal),
          wll: form.wll ? parseFloat(form.wll) : null,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setError("❌ Não foi possível conectar à API. Verifique se o backend está rodando na porta 8080.");
    }
    setLoading(false);
  };

  const risk = result?.riskLevel ? riskColor(result.riskLevel) : { color: "#38bdf8", bg: "#001a2d" };

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>📐 &nbsp;Cálculo de Eslingas & Cabos</div>
      <div style={S.grid(2)}>
        {[
          { key: "loadWeight", label: "Peso total da carga (kg)", placeholder: "ex: 5000", type: "number" },
          { key: "angleFromHorizontal", label: "Ângulo da eslinga (° da horizontal)", placeholder: "ex: 60", type: "number" },
          { key: "wll", label: "WLL da eslinga (kg) — opcional", placeholder: "ex: 3200", type: "number" },
        ].map(f => (
          <div key={f.key} style={S.field}>
            <label style={S.label}>{f.label}</label>
            <input style={S.input} type={f.type} placeholder={f.placeholder}
              value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
          </div>
        ))}
        <div style={S.field}>
          <label style={S.label}>Número de pernas</label>
          <select style={S.select} value={form.numberOfLegs}
            onChange={e => setForm(p => ({ ...p, numberOfLegs: e.target.value }))}>
            {["1","2","3","4"].map(n => <option key={n} value={n}>{n} perna{n > 1 ? "s" : ""}</option>)}
          </select>
        </div>
      </div>
      {parseFloat(form.angleFromHorizontal) < 45 && (
        <div style={S.warnBox}>⚠️ Ângulo abaixo de 45° aumenta drasticamente a tensão nas eslingas.</div>
      )}
      <div style={S.normaBox}>
        📋 <strong style={{ color: "#94a3b8" }}>ABNT NBR 13541:</strong> Tensão = (Carga / n° pernas) × (1 / sen θ).
        Recomenda-se θ ≥ 45°. Fator de segurança mínimo: 5:1.
      </div>
      <div style={{ marginTop: 20 }}>
        <button style={S.btn(loading)} onClick={calculate} disabled={loading}>
          {loading ? "Calculando via API..." : "Calcular via API"}
        </button>
      </div>
      {error && <div style={S.errorBox}>{error}</div>}
      {result && (
        <div style={S.result(risk.color, risk.bg)}>
          <div>
            <div style={S.bigNum(risk.color)}>{result.tensionPerLeg?.toFixed(0)}<span style={{ fontSize: 18 }}> kg</span></div>
            <div style={S.smallLabel}>tensão por perna</div>
          </div>
          <div style={{ flex: 1, fontSize: 13, lineHeight: 2 }}>
            <div>Fator de carga: <strong style={{ color: "#e2e8f0" }}>{result.loadFactor?.toFixed(3)}×</strong></div>
            {result.wllUsagePercent && (
              <div>Uso do WLL: <strong style={{ color: risk.color }}>{result.wllUsagePercent?.toFixed(1)}%</strong></div>
            )}
            {result.angleWarning && (
              <div style={{ color: "#f59e0b" }}>⚠️ Ângulo crítico!</div>
            )}
            <div style={{ fontSize: 11, color: "#64748b" }}>✅ Resposta da API Java Spring Boot</div>
          </div>
          <div style={S.riskBadge(risk.color)}>{result.riskLevel}</div>
        </div>
      )}
    </div>
  );
}

// ── MODULE 3: CHECKLIST ─────────────────────────────────────────────────────────
function ChecklistModule() {
  const total = CHECKLIST.reduce((s, c) => s + c.items.length, 0);
  const [checked, setChecked] = useState({});
  const [operator, setOperator] = useState("");
  const [jobId, setJobId] = useState("");
  const done = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((done / total) * 100);
  const allDone = done === total;

  return (
    <div style={S.card}>
      <div style={S.cardTitle}>📋 &nbsp;Checklist de Içamento — NR-11 / ABNT</div>
      <div style={S.grid(2)}>
        <div style={S.field}>
          <label style={S.label}>Operação / OS nº</label>
          <input style={S.input} placeholder="ex: OS-2024-089" value={jobId} onChange={e => setJobId(e.target.value)} />
        </div>
        <div style={S.field}>
          <label style={S.label}>Rigger Responsável</label>
          <input style={S.input} placeholder="Nome completo" value={operator} onChange={e => setOperator(e.target.value)} />
        </div>
      </div>
      <hr style={S.divider} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 13 }}>
          <span style={{ color: allDone ? "#22c55e" : "#f59e0b", fontWeight: 700 }}>{done}</span>
          <span style={{ color: "#64748b" }}> / {total} itens verificados</span>
        </div>
        <div style={S.riskBadge(allDone ? "#22c55e" : "#f59e0b")}>{pct}%</div>
      </div>
      <div style={S.progressBar}>
        <div style={S.progressFill(pct, allDone ? "#22c55e" : "#f59e0b")} />
      </div>
      {CHECKLIST.map((cat, ci) => (
        <div key={ci}>
          <div style={S.catTitle}>▸ {cat.category}
            <span style={{ color: "#475569", fontWeight: 400 }}>
              ({cat.items.filter((_, ii) => checked[`${ci}-${ii}`]).length}/{cat.items.length})
            </span>
          </div>
          {cat.items.map((item, ii) => {
            const key = `${ci}-${ii}`;
            const isChecked = !!checked[key];
            return (
              <div key={ii} style={S.checkRow(isChecked)} onClick={() => setChecked(p => ({ ...p, [key]: !p[key] }))}>
                <div style={S.checkbox(isChecked)}>
                  {isChecked && <span style={{ color: "#000", fontSize: 13, fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: 13, lineHeight: 1.5, userSelect: "none" }}>{item}</span>
              </div>
            );
          })}
        </div>
      ))}
      <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button style={S.btn(!allDone)} disabled={!allDone}
          onClick={() => alert(`✅ Içamento liberado!\nOS: ${jobId || "—"}\nRigger: ${operator || "—"}\nData: ${new Date().toLocaleString("pt-BR")}`)}>
          {allDone ? "✅ Emitir Liberação" : `Aguardando ${total - done} item(s)`}
        </button>
        <button style={{ ...S.btn(false), background: "#1e1e35", color: "#64748b" }}
          onClick={() => setChecked({})}>Reiniciar</button>
      </div>
    </div>
  );
}

// ── ROOT ────────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState(0);
  const tabs = [
    { label: "⚖ Capacidade", component: <CapacityModule /> },
    { label: "📐 Eslingas", component: <SlingModule /> },
    { label: "📋 Checklist NR-11", component: <ChecklistModule /> },
  ];

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div style={S.logo}>
          <div style={S.logoIcon}>🏗</div>
          <div>
            <div style={S.logoText}>RiggingCheck</div>
            <div style={S.logoSub}>Verificador de Segurança em Içamento</div>
            <div style={S.apiBadge}>● API Java Spring Boot conectada</div>
          </div>
        </div>
        <div style={S.tabs}>
          {tabs.map((t, i) => (
            <button key={i} style={S.tab(tab === i)} onClick={() => setTab(i)}>{t.label}</button>
          ))}
        </div>
      </div>
      <div style={S.container}>
        {tabs[tab].component}
        <div style={{ ...S.normaBox, textAlign: "center", marginTop: 32 }}>
          v1.1.0 — RiggingCheck Fullstack &nbsp;·&nbsp; React + Java Spring Boot
          <br />
          <span style={{ color: "#475569" }}>NR-11 · ABNT NBR 11900 · ABNT NBR 13541 · ISO 4308-1</span>
        </div>
      </div>
    </div>
  );
}
